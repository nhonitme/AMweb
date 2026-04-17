import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Button from "devextreme-react/button"
import Form, { Item } from "devextreme-react/form"
import LoadPanel from "devextreme-react/load-panel"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import TabPanel from "devextreme-react/tab-panel"
import { useLocation } from "react-router-dom"

import GridColumnSettingsPopup, {
  type GridColumnSettingsPopupTab,
  type GridColumnSettingsPopupTabSaveItem,
} from "@/components/datagrid/GridColumnSettingsPopup"
import { useGridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { LookupPopupProvider } from "@/components/lookup/LookupPopupHost"
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import { LanguageContext } from "@/lib/i18nLoader"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"
import type {
  ChitInfo,
  ChitLedger,
  ChitType,
  InventoryInputApi,
  InventoryInputLine,
  InventoryOutputApi,
  InventoryOutputLine,
} from "@/types/voucher"
import { getInventoryInputs, getInventoryOutputs } from "@/api/voucherApi"
import { calculateChitAmount, cloneChit, getActiveChitDetails, getChitTypeLabel, normalizeInventoryInputApi, normalizeInventoryOutputApi } from "../chitUtils"
import { ChitDetailGridPopup, type ChitDetailGridHandle } from "./ChitDetailGridPopup"
import { getVoucherDetailColumnsComponent } from "./ChitDetailColumnsPopup"
import ChitInventoryInputGridPopup, { type ChitInventoryInputGridPopupHandle } from "./ChitInventoryInputGridPopup"
import ChitInventoryOutputGridPopup, { type ChitInventoryOutputGridPopupHandle } from "./ChitInventoryOutputGridPopup"

interface ChitEditorPopupProps {
  visible: boolean
  value: ChitInfo
  ledger: ChitLedger
  chitType: ChitType
  isUpdate: boolean
  loading: boolean
  onClose: () => void
  onSave: (record: ChitInfo) => Promise<void>
  onSaveAndNew?: (record: ChitInfo) => Promise<void>
}

type DetailRow = ChitInfo["DETAILS"][number]
type EditorTabKey = "detail" | "inventory_input" | "inventory_output"
type InventoryTabKey = Exclude<EditorTabKey, "detail">

const inventoryTabConfig: Partial<Record<ChitType, InventoryTabKey[]>> = {
  PO: ["inventory_input"],
  SO: ["inventory_output"],
}

function boolToFlag(value: boolean | null | undefined): "0" | "1" {
  return value ? "1" : "0"
}

function getInventoryTabsByChitType(chitType: ChitType): InventoryTabKey[] {
  return inventoryTabConfig[chitType] ?? []
}

function supportsInventory(chitType: ChitType) {
  return getInventoryTabsByChitType(chitType).length > 0
}

function getDetailRowKey(row: DetailRow, index: number) {
  const detail = row as any
  const candidate =
    detail?.CHITDETAIL_ID ??
    detail?.ROW_KEY ??
    detail?.DETAIL_ID ??
    detail?.ID ??
    detail?.TEMP_ID ??
    detail?.DETAIL_TEMP_ID ??
    index
  return String(candidate)
}

function getDetailRowAmount(row: DetailRow) {
  const detail = row as any
  const amountCandidate = detail?.AMOUNT ?? detail?.amount ?? detail?.SUPPLY_AMOUNT ?? detail?.TOTAL_AMOUNT ?? 0
  const parsed = Number(amountCandidate)
  return Number.isFinite(parsed) ? parsed : 0
}

function getDetailInventoryInputs(row: DetailRow | null | undefined) {
  return Array.isArray(row?.INVENTORY_INPUTS) ? row.INVENTORY_INPUTS : []
}

function getDetailInventoryOutputs(row: DetailRow | null | undefined) {
  return Array.isArray(row?.INVENTORY_OUTPUTS) ? row.INVENTORY_OUTPUTS : []
}

function mergeInventoryIntoDetails(details: DetailRow[], sourceDetails: DetailRow[]) {
  const inputMap = new Map<string, InventoryInputLine[]>()
  const outputMap = new Map<string, InventoryOutputLine[]>()

  sourceDetails.forEach((row, index) => {
    const key = getDetailRowKey(row, index)
    inputMap.set(key, getDetailInventoryInputs(row))
    outputMap.set(key, getDetailInventoryOutputs(row))
  })

  return details.map((row, index) => {
    const key = getDetailRowKey(row, index)
    const inputs = inputMap.get(key) ?? getDetailInventoryInputs(row)
    const outputs = outputMap.get(key) ?? getDetailInventoryOutputs(row)

    return {
      ...row,
      INVENTORY_INPUTS: inputs,
      INVENTORY_OUTPUTS: outputs,
      HASINVENTORY: inputs.length > 0 || outputs.length > 0,
    }
  })
}

function mergeApiInventoryByChitDetailId(details: DetailRow[], inputs: InventoryInputApi[], outputs: InventoryOutputApi[]) {
  const inputMap = new Map<number, InventoryInputLine[]>()
  const outputMap = new Map<number, InventoryOutputLine[]>()
  const inputItems = Array.isArray(inputs) ? inputs : []
  const outputItems = Array.isArray(outputs) ? outputs : []

  inputItems.forEach((item) => {
    const key = Number(item.CHITDETAIL_ID ?? 0)
    if (key <= 0) return
    const list = inputMap.get(key) ?? []
    list.push(normalizeInventoryInputApi(item, String(key)))
    inputMap.set(key, list)
  })

  outputItems.forEach((item) => {
    const key = Number(item.CHITDETAIL_ID ?? 0)
    if (key <= 0) return
    const list = outputMap.get(key) ?? []
    list.push(normalizeInventoryOutputApi(item, String(key)))
    outputMap.set(key, list)
  })

  return details.map((row) => {
    const chitDetailId = Number(row.CHITDETAIL_ID ?? 0)
    const inventoryInputs = chitDetailId > 0 ? inputMap.get(chitDetailId) ?? getDetailInventoryInputs(row) : getDetailInventoryInputs(row)
    const inventoryOutputs = chitDetailId > 0 ? outputMap.get(chitDetailId) ?? getDetailInventoryOutputs(row) : getDetailInventoryOutputs(row)

    return {
      ...row,
      INVENTORY_INPUTS: inventoryInputs,
      INVENTORY_OUTPUTS: inventoryOutputs,
      HASINVENTORY: inventoryInputs.length > 0 || inventoryOutputs.length > 0,
    }
  })
}

function getDetailRowLabel(row: DetailRow, index: number) {
  const detail = row as any
  const description =
    detail?.DETAIL_DESCRIPTION_VIET ??
    detail?.DETAIL_DESCRIPTION_ENG ??
    detail?.DETAIL_DESCRIPTION_KOR ??
    detail?.DESCRIPTION_VIET ??
    detail?.REMARK ??
    ""

  const debit = String(detail?.DEBIT ?? "").trim()
  const credit = String(detail?.CREDIT ?? "").trim()
  const amount = getDetailRowAmount(row)
  const fallback = [debit || "?", credit || "?", amount > 0 ? amount.toLocaleString() : ""].filter(Boolean).join(" / ")

  return description ? `${index + 1}. ${description}` : `${index + 1}. ${fallback || "Detail row"}`
}

function mapDraftForSave(draft: ChitInfo): ChitInfo {
  return {
    ...draft,
    DETAILS: draft.DETAILS.map((detail) => ({
      ...detail,
      HASINVENTORY: getDetailInventoryInputs(detail).length > 0 || getDetailInventoryOutputs(detail).length > 0,
      INVENTORY_INPUTS: getDetailInventoryInputs(detail),
      INVENTORY_OUTPUTS: getDetailInventoryOutputs(detail),
    })) as any,
  }
}

function getActiveDetailRows(details: DetailRow[]) {
  return getActiveChitDetails(details as ChitInfo["DETAILS"]) as DetailRow[]
}

export function ChitEditorPopup({
  visible,
  value,
  ledger,
  chitType,
  isUpdate,
  loading,
  onClose,
  onSave,
  onSaveAndNew,
}: ChitEditorPopupProps) {
  const location = useLocation()
  const [draft, setDraft] = useState<ChitInfo>(() => cloneChit(value))
  const [selectedTabIndex, setSelectedTabIndex] = useState(0)
  const [selectedInventoryDetailKey, setSelectedInventoryDetailKey] = useState<string | null>(null)
  const [detailLayoutVersion, setDetailLayoutVersion] = useState(0)
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsTabs, setColumnSettingsTabs] = useState<GridColumnSettingsPopupTab[]>([])
  const [inventoryLoading, setInventoryLoading] = useState(false)

  const detailGridRef = useRef<ChitDetailGridHandle | null>(null)
  const inventoryInputGridRef = useRef<ChitInventoryInputGridPopupHandle | null>(null)
  const inventoryOutputGridRef = useRef<ChitInventoryOutputGridPopupHandle | null>(null)
  const formRef = useRef<any>(null)
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const screenCd = useMemo(() => location.pathname, [location.pathname])
  const detailGridId = "voucher-editor-detail-grid"
  const inventoryInputGridId = "voucher-editor-inventory-input-grid"
  const inventoryOutputGridId = "voucher-editor-inventory-output-grid"
  const visibleInventoryTabs = useMemo(() => getInventoryTabsByChitType(chitType), [chitType])
  const inventoryEnabled = useMemo(() => supportsInventory(chitType), [chitType])
  const detailColumnSettingState = useGridColumnSettingState({
    screenCd,
    gridId: detailGridId,
  })
  const inventoryInputColumnSettingState = useGridColumnSettingState({
    enabled: inventoryEnabled,
    screenCd,
    gridId: inventoryInputGridId,
  })
  const inventoryOutputColumnSettingState = useGridColumnSettingState({
    enabled: inventoryEnabled,
    screenCd,
    gridId: inventoryOutputGridId,
  })
  const activeDetails = useMemo(() => getActiveDetailRows(draft.DETAILS as DetailRow[]), [draft.DETAILS])
  const shortcutActions = useMemo(
    () => [
      SHORTCUT_ACTIONS.SAVE,
      SHORTCUT_ACTIONS.SAVE_AND_NEW,
      SHORTCUT_ACTIONS.SAVE_AND_CLOSE,
      SHORTCUT_ACTIONS.CLOSE,
      SHORTCUT_ACTIONS.ADD_ROW,
      SHORTCUT_ACTIONS.DELETE_ROW,
      SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH,
      SHORTCUT_ACTIONS.DUPLICATE,
      SHORTCUT_ACTIONS.HELP,
    ],
    [],
  )
  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions)

  useEffect(() => {
    setDraft(cloneChit(value))
    setSelectedTabIndex(0)
    setSelectedInventoryDetailKey(null)
    setDetailLayoutVersion((current) => current + 1)
  }, [value])

  useEffect(() => {
    if (visible) {
      return
    }

    setColumnSettingsVisible(false)
    setColumnSettingsTabs([])
  }, [visible])

  useEffect(() => {
    if (!inventoryEnabled && selectedTabIndex !== 0) {
      setSelectedTabIndex(0)
    }
  }, [inventoryEnabled, selectedTabIndex])

  const chitLabel = useMemo(() => getChitTypeLabel(chitType, t), [chitType, t])
  const DetailColumns = useMemo(() => getVoucherDetailColumnsComponent(chitType), [chitType])

  const title = useMemo(
    () => (isUpdate ? `${t("lblEdit", "Edit")} ${chitLabel}` : `${t("lblAddNew", "Add")} ${chitLabel}`),
    [isUpdate, chitLabel, t],
  )

  const handleFieldDataChanged = useCallback((event: { dataField?: string; value?: unknown }) => {
    if (typeof event.dataField !== "string") return
    setDraft((current) => ({
      ...current,
      [event.dataField as keyof ChitInfo]: event.value as never,
    }))
  }, [])

  const handleDetailsChange = useCallback((rows: ChitInfo["DETAILS"], amount: number) => {
    const activeRows = getActiveDetailRows(rows as DetailRow[])
    setDraft((current) => ({
      ...current,
      DETAILS: mergeInventoryIntoDetails(rows as DetailRow[], current.DETAILS as DetailRow[]),
      DETAIL_COUNT: activeRows.length,
      AMOUNT: amount,
    }))
  }, [])

  const handleInventoryInputsChange = useCallback((detailKey: string, inventoryInputs: InventoryInputLine[]) => {
    setDraft((current) => ({
      ...current,
      DETAILS: current.DETAILS.map((row, index) => {
        if (getDetailRowKey(row, index) !== detailKey) return row
        const outputs = getDetailInventoryOutputs(row)
        return {
          ...row,
          INVENTORY_INPUTS: inventoryInputs,
          INVENTORY_OUTPUTS: outputs,
          HASINVENTORY: inventoryInputs.length > 0 || outputs.length > 0,
        }
      }),
    }))
  }, [])

  const handleInventoryOutputsChange = useCallback((detailKey: string, inventoryOutputs: InventoryOutputLine[]) => {
    setDraft((current) => ({
      ...current,
      DETAILS: current.DETAILS.map((row, index) => {
        if (getDetailRowKey(row, index) !== detailKey) return row
        const inputs = getDetailInventoryInputs(row)
        return {
          ...row,
          INVENTORY_INPUTS: inputs,
          INVENTORY_OUTPUTS: inventoryOutputs,
          HASINVENTORY: inputs.length > 0 || inventoryOutputs.length > 0,
        }
      }),
    }))
  }, [])

  const detailOptions = useMemo(
    () =>
      activeDetails.map((row, index) => ({
        key: getDetailRowKey(row, index),
        label: getDetailRowLabel(row, index),
        row,
        index,
      })),
    [activeDetails],
  )

  useEffect(() => {
    if (detailOptions.length === 0) {
      setSelectedInventoryDetailKey(null)
      return
    }

    setSelectedInventoryDetailKey((current) => {
      if (current && detailOptions.some((item) => item.key === current)) return current
      return detailOptions[0]?.key ?? null
    })
  }, [detailOptions])

  const selectedInventoryDetail = useMemo(
    () => detailOptions.find((item) => item.key === selectedInventoryDetailKey) ?? null,
    [detailOptions, selectedInventoryDetailKey],
  )

  const tabItems = useMemo(() => {
    const items: Array<{ key: EditorTabKey; title: string }> = [
      { key: "detail", title: t("lblDetail", "Detail List") },
    ]

    if (visibleInventoryTabs.includes("inventory_input")) {
      items.push({ key: "inventory_input", title: t("INVENTORY_INPUT", "Nhập kho") })
    }

    if (visibleInventoryTabs.includes("inventory_output")) {
      items.push({ key: "inventory_output", title: t("INVENTORY_OUTPUT", "Xuất kho") })
    }

    return items
  }, [t, visibleInventoryTabs])

  const selectedTabKey = useMemo<EditorTabKey>(
    () => tabItems[selectedTabIndex]?.key ?? "detail",
    [selectedTabIndex, tabItems],
  )

  const handleOpenInventoryFromDetail = useCallback(
    async (rowKey: string | null) => {
      if (!rowKey || !inventoryEnabled || visibleInventoryTabs.length === 0) {
        return
      }

      const syncedBaseDetails = detailGridRef.current ? await detailGridRef.current.savePendingChanges() : draft.DETAILS
      const syncedDetails = mergeInventoryIntoDetails(syncedBaseDetails as DetailRow[], draft.DETAILS as DetailRow[])
      const activeSyncedDetails = getActiveDetailRows(syncedDetails as DetailRow[])
      const totalAmount = calculateChitAmount(activeSyncedDetails)
      const targetDetail = syncedDetails.find((row, index) => getDetailRowKey(row, index) === rowKey) ?? null
      const chitDetailId = Number(targetDetail?.CHITDETAIL_ID ?? 0)

      setSelectedInventoryDetailKey(rowKey)

      const nextInventoryTabKey = visibleInventoryTabs[0]
      const nextTabIndex = tabItems.findIndex((item) => item.key === nextInventoryTabKey)

      setInventoryLoading(true)

      try {
        let nextDetails = syncedDetails

        if (chitDetailId > 0) {
          const [inputs, outputs] = await Promise.all([
            getInventoryInputs(ledger, chitType, [chitDetailId]),
            getInventoryOutputs(ledger, chitType, [chitDetailId]),
          ])

          nextDetails = mergeApiInventoryByChitDetailId(
            syncedDetails as DetailRow[],
            Array.isArray(inputs) ? inputs : [],
            Array.isArray(outputs) ? outputs : [],
          )
        }

        const nextActiveDetails = getActiveDetailRows(nextDetails as DetailRow[])

        setDraft((current) => ({
          ...current,
          DETAILS: nextDetails,
          DETAIL_COUNT: nextActiveDetails.length,
          AMOUNT: calculateChitAmount(nextActiveDetails),
        }))

        if (nextTabIndex >= 0) {
          setSelectedTabIndex(nextTabIndex)
        }
      } catch (error) {
        console.error("Load inventory by detail failed", error)
        setDraft((current) => ({
          ...current,
          DETAILS: syncedDetails,
          DETAIL_COUNT: activeSyncedDetails.length,
          AMOUNT: totalAmount,
        }))
      } finally {
        setInventoryLoading(false)
      }
    },
    [draft.DETAILS, inventoryEnabled, ledger, chitType, tabItems, visibleInventoryTabs],
  )

  const createColumnSettingTabs = useCallback(
    (
      detailItems: GridColumnSettingEditorItem[],
      inventoryInputItems: GridColumnSettingEditorItem[],
      inventoryOutputItems: GridColumnSettingEditorItem[],
      detailLoading = false,
      inventoryInputLoading = false,
      inventoryOutputLoading = false,
    ): GridColumnSettingsPopupTab[] => {
      const nextTabs: GridColumnSettingsPopupTab[] = [
        {
          key: detailGridId,
          title: t("lblDetail", "Detail List"),
          items: detailItems,
          loading: detailLoading,
        },
      ]

      if (visibleInventoryTabs.includes("inventory_input")) {
        nextTabs.push({
          key: inventoryInputGridId,
          title: t("INVENTORY_INPUT", "Inventory Input"),
          items: inventoryInputItems,
          loading: inventoryInputLoading,
        })
      }

      if (visibleInventoryTabs.includes("inventory_output")) {
        nextTabs.push({
          key: inventoryOutputGridId,
          title: t("INVENTORY_OUTPUT", "Inventory Output"),
          items: inventoryOutputItems,
          loading: inventoryOutputLoading,
        })
      }

      return nextTabs
    },
    [detailGridId, inventoryInputGridId, inventoryOutputGridId, t, visibleInventoryTabs],
  )

  const openColumnSettings = useCallback(() => {
    setColumnSettingsVisible(true)
    setColumnSettingsTabs(
      createColumnSettingTabs(
        [],
        [],
        [],
        true,
        visibleInventoryTabs.includes("inventory_input"),
        visibleInventoryTabs.includes("inventory_output"),
      ),
    )

    const detailComponent = detailGridRef.current?.getGridInstance() ?? null
    const inventoryInputComponent = inventoryInputGridRef.current?.getGridInstance() ?? null
    const inventoryOutputComponent = inventoryOutputGridRef.current?.getGridInstance() ?? null

    void Promise.all([
      detailColumnSettingState.loadEditorItems(detailComponent),
      inventoryEnabled
        ? inventoryInputColumnSettingState.loadEditorItems(inventoryInputComponent)
        : Promise.resolve([] as GridColumnSettingEditorItem[]),
      inventoryEnabled
        ? inventoryOutputColumnSettingState.loadEditorItems(inventoryOutputComponent)
        : Promise.resolve([] as GridColumnSettingEditorItem[]),
    ]).then(([detailItems, inventoryInputItems, inventoryOutputItems]) => {
      setColumnSettingsTabs(
        createColumnSettingTabs(detailItems, inventoryInputItems, inventoryOutputItems, false, false, false),
      )
    })
  }, [
    createColumnSettingTabs,
    detailColumnSettingState,
    inventoryInputColumnSettingState,
    inventoryOutputColumnSettingState,
    visibleInventoryTabs,
  ])

  const handleColumnSettingsSave = useCallback(async (tabs: GridColumnSettingsPopupTabSaveItem[]) => {
    const tabMap = new Map(tabs.map((item) => [item.key, item.items] as const))
    const detailComponent = detailGridRef.current?.getGridInstance() ?? null
    const inventoryInputComponent = inventoryInputGridRef.current?.getGridInstance() ?? null
    const inventoryOutputComponent = inventoryOutputGridRef.current?.getGridInstance() ?? null

    const [savedDetailItems, savedInventoryInputItems, savedInventoryOutputItems] = await Promise.all([
      detailComponent
        ? detailColumnSettingState.applyEditorItemsToComponent(detailComponent, tabMap.get(detailGridId) ?? [])
        : detailColumnSettingState.saveEditorItems(tabMap.get(detailGridId) ?? []),
      inventoryEnabled
        ? inventoryInputComponent
          ? inventoryInputColumnSettingState.applyEditorItemsToComponent(
            inventoryInputComponent,
            tabMap.get(inventoryInputGridId) ?? [],
          )
          : inventoryInputColumnSettingState.saveEditorItems(tabMap.get(inventoryInputGridId) ?? [])
        : Promise.resolve([] as GridColumnSettingEditorItem[]),
      inventoryEnabled
        ? inventoryOutputComponent
          ? inventoryOutputColumnSettingState.applyEditorItemsToComponent(
            inventoryOutputComponent,
            tabMap.get(inventoryOutputGridId) ?? [],
          )
          : inventoryOutputColumnSettingState.saveEditorItems(tabMap.get(inventoryOutputGridId) ?? [])
        : Promise.resolve([] as GridColumnSettingEditorItem[]),
    ])

    setColumnSettingsTabs(
      createColumnSettingTabs(
        savedDetailItems,
        savedInventoryInputItems,
        savedInventoryOutputItems,
        false,
        false,
        false,
      ),
    )
    setColumnSettingsVisible(false)
  }, [
    createColumnSettingTabs,
    detailColumnSettingState,
    detailGridId,
    inventoryInputColumnSettingState,
    inventoryInputGridId,
    inventoryOutputColumnSettingState,
    inventoryOutputGridId,
    visibleInventoryTabs,
  ])

  const handleColumnSettingsReset = useCallback(async (activeTabKey?: string) => {
    if (!activeTabKey) {
      return
    }

    if (activeTabKey === detailGridId) {
      const resetDetailItems = await detailColumnSettingState.resetEditorItems(
        detailGridRef.current?.getGridInstance() ?? null,
      )
      const currentInventoryInputItems = columnSettingsTabs.find((tab) => tab.key === inventoryInputGridId)?.items ?? []
      const currentInventoryOutputItems = columnSettingsTabs.find((tab) => tab.key === inventoryOutputGridId)?.items ?? []
      setColumnSettingsTabs(
        createColumnSettingTabs(
          resetDetailItems,
          currentInventoryInputItems,
          currentInventoryOutputItems,
          false,
          false,
          false,
        ),
      )
      return
    }

    if (activeTabKey === inventoryInputGridId) {
      const resetInventoryInputItems = await inventoryInputColumnSettingState.resetEditorItems(
        inventoryInputGridRef.current?.getGridInstance() ?? null,
      )
      const currentDetailItems = columnSettingsTabs.find((tab) => tab.key === detailGridId)?.items ?? []
      const currentInventoryOutputItems = columnSettingsTabs.find((tab) => tab.key === inventoryOutputGridId)?.items ?? []
      setColumnSettingsTabs(
        createColumnSettingTabs(
          currentDetailItems,
          resetInventoryInputItems,
          currentInventoryOutputItems,
          false,
          false,
          false,
        ),
      )
      return
    }

    if (activeTabKey === inventoryOutputGridId) {
      const resetInventoryOutputItems = await inventoryOutputColumnSettingState.resetEditorItems(
        inventoryOutputGridRef.current?.getGridInstance() ?? null,
      )
      const currentDetailItems = columnSettingsTabs.find((tab) => tab.key === detailGridId)?.items ?? []
      const currentInventoryInputItems = columnSettingsTabs.find((tab) => tab.key === inventoryInputGridId)?.items ?? []
      setColumnSettingsTabs(
        createColumnSettingTabs(
          currentDetailItems,
          currentInventoryInputItems,
          resetInventoryOutputItems,
          false,
          false,
          false,
        ),
      )
    }
  }, [
    columnSettingsTabs,
    createColumnSettingTabs,
    detailColumnSettingState,
    detailGridId,
    inventoryInputColumnSettingState,
    inventoryInputGridId,
    inventoryOutputColumnSettingState,
    inventoryOutputGridId,
  ])

  const buildRecordForSave = useCallback(async () => {
    const validationResult = formRef.current?.instance().validate()
    if (validationResult && !validationResult.isValid) {
      return null
    }

    const syncedBaseDetails = detailGridRef.current ? await detailGridRef.current.savePendingChanges() : draft.DETAILS

    // Save pending inventory input changes
    let syncedDetailsWithInventory = syncedBaseDetails as DetailRow[]
    if (inventoryInputGridRef.current && selectedInventoryDetailKey) {
      const inventoryInputs = await inventoryInputGridRef.current.savePendingChanges()
      if (inventoryInputs) {
        syncedDetailsWithInventory = (syncedBaseDetails as DetailRow[]).map((row, index) => {
          const key = getDetailRowKey(row, index)
          if (key === selectedInventoryDetailKey) {
            return {
              ...row,
              INVENTORY_INPUTS: inventoryInputs,
            } as DetailRow
          }
          return row
        })
      }
    }

    const syncedDetails = mergeInventoryIntoDetails(syncedDetailsWithInventory, draft.DETAILS as DetailRow[])
    const activeSyncedDetails = getActiveDetailRows(syncedDetails as DetailRow[])
    const totalAmount = calculateChitAmount(activeSyncedDetails)
    const normalizedChitNo = String(draft.CHIT_NO ?? "").trim()

    if (activeSyncedDetails.length === 0) {
      return null
    }

    return mapDraftForSave({
      ...draft,
      CHIT_NO: normalizedChitNo,
      DETAILS: activeSyncedDetails,
      DETAIL_COUNT: activeSyncedDetails.length,
      AMOUNT: totalAmount,
    })
  }, [draft, selectedInventoryDetailKey])

  const handleSave = useCallback(async () => {
    const record = await buildRecordForSave()
    if (!record) {
      return
    }

    await onSave(record)
  }, [buildRecordForSave, onSave])

  const handleSaveAndNewShortcut = useCallback(async () => {
    const record = await buildRecordForSave()
    if (!record) {
      return
    }

    if (onSaveAndNew) {
      await onSaveAndNew(record)
      return
    }

    await onSave(record)
  }, [buildRecordForSave, onSave, onSaveAndNew])

  const handleClosePopup = useCallback(() => {
    if (!loading) {
      onClose()
    }
  }, [loading, onClose])

  const handleAddDetailRow = useCallback(() => {
    if (selectedTabIndex === 0) {
      detailGridRef.current?.addRow()
    }
  }, [selectedTabIndex])

  const handleDeleteDetailRow = useCallback(() => {
    if (selectedTabIndex === 0) {
      detailGridRef.current?.deleteFocusedRow()
    }
  }, [selectedTabIndex])

  const handleQuickItemSearch = useCallback(() => {
    if (selectedTabIndex === 0) {
      detailGridRef.current?.focusSearch()
    }
  }, [selectedTabIndex])

  const handleDuplicateDraft = useCallback(async () => {
    const syncedBaseDetails = detailGridRef.current ? await detailGridRef.current.savePendingChanges() : draft.DETAILS
    const duplicatedDetails = getActiveDetailRows(
      mergeInventoryIntoDetails(
        syncedBaseDetails as DetailRow[],
        draft.DETAILS as DetailRow[],
      ) as DetailRow[],
    ).map((detail, index) => ({
      ...detail,
      ISDEL: false,
      CHITDETAIL_ID: null,
      CHIT_ID: null,
      CHITDETAIL_CD: "",
      SORT: index + 1,
      CREATE_BY: "",
      CREATE_DT: null,
      UPDATE_BY: "",
      UPDATE_DT: null,
    }))

    setDraft((current) => ({
      ...cloneChit(current),
      CHIT_ID: null,
      CHIT_CD: "",
      CHIT_NO: "",
      DETAILS: duplicatedDetails,
      DETAIL_COUNT: duplicatedDetails.length,
      AMOUNT: calculateChitAmount(duplicatedDetails),
      CREATE_BY: "",
      CREATE_DT: null,
      UPDATE_BY: "",
      UPDATE_DT: null,
    }))
    setSelectedTabIndex(0)
  }, [draft.DETAILS])

  const shortcutBindings = useMemo(
    () =>
      createShortcutBindings(
        shortcutActions,
        {
          [SHORTCUT_ACTIONS.SAVE]: () => {
            void handleSave()
          },
          [SHORTCUT_ACTIONS.SAVE_AND_NEW]: () => {
            void handleSaveAndNewShortcut()
          },
          [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: () => {
            void handleSave()
          },
          [SHORTCUT_ACTIONS.CLOSE]: () => handleClosePopup(),
          [SHORTCUT_ACTIONS.ADD_ROW]: () => handleAddDetailRow(),
          [SHORTCUT_ACTIONS.DELETE_ROW]: () => handleDeleteDetailRow(),
          [SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH]: () => handleQuickItemSearch(),
          [SHORTCUT_ACTIONS.DUPLICATE]: () => {
            void handleDuplicateDraft()
          },
          [SHORTCUT_ACTIONS.HELP]: () => openShortcutHelp(),
        },
        {
          [SHORTCUT_ACTIONS.SAVE]: { enabled: !loading && activeDetails.length > 0, allowInInput: true },
          [SHORTCUT_ACTIONS.SAVE_AND_NEW]: { enabled: !loading && activeDetails.length > 0, allowInInput: true },
          [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: { enabled: !loading && activeDetails.length > 0, allowInInput: true },
          [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
          [SHORTCUT_ACTIONS.ADD_ROW]: { enabled: selectedTabIndex === 0 && !loading },
          [SHORTCUT_ACTIONS.DELETE_ROW]: { enabled: selectedTabIndex === 0 && !loading },
          [SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH]: { enabled: selectedTabIndex === 0, allowInInput: true },
          [SHORTCUT_ACTIONS.DUPLICATE]: { enabled: !loading, allowInInput: true },
        },
      ),
    [
      handleAddDetailRow,
      handleClosePopup,
      handleDeleteDetailRow,
      handleDuplicateDraft,
      handleQuickItemSearch,
      handleSave,
      handleSaveAndNewShortcut,
      loading,
      loading,
      openShortcutHelp,
      activeDetails.length,
      selectedTabIndex,
      shortcutActions,
    ],
  )

  useShortcutBindings(shortcutBindings, { enabled: visible })

  const handleTabSelectionChanged = useCallback(
    async (event: any) => {
      const nextTabIndex = Number(event.component.option("selectedIndex") ?? 0)

      if (selectedTabIndex === 0 && nextTabIndex !== 0 && detailGridRef.current) {
        const syncedBaseDetails = await detailGridRef.current.savePendingChanges()
        const syncedDetails = mergeInventoryIntoDetails(syncedBaseDetails as DetailRow[], draft.DETAILS as DetailRow[])
        const activeSyncedDetails = getActiveDetailRows(syncedDetails as DetailRow[])
        const totalAmount = calculateChitAmount(activeSyncedDetails)

        setDraft((current) => ({
          ...current,
          DETAILS: syncedDetails,
          DETAIL_COUNT: activeSyncedDetails.length,
          AMOUNT: totalAmount,
        }))
      }

      setSelectedTabIndex(nextTabIndex)
    },
    [draft.DETAILS, selectedTabIndex],
  )

  const formData = useMemo(() => ({ ...draft, CHIT_TYPE_LABEL: chitLabel }), [draft, chitLabel])
  const isDetailTabActive = selectedTabKey === "detail"
  const detailPanelClassName = useMemo(
    () =>
      isDetailTabActive
        ? "overflow-hidden rounded-lg border border-gray-200 bg-white p-3"
        : "min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white p-3",
    [isDetailTabActive],
  )

  const renderDetailSelector = () => (
    <div className="grid gap-3">
      {/* <div className="rounded-lg border border-gray-200 bg-slate-50 p-3">
        <div className="mb-2 text-sm font-semibold text-gray-800">{t("DETAIL_ROW_SELECTOR", "Dòng detail đang gắn với kho")}</div>
        <Form labelLocation="top" colCount={1}>
          <Item
            dataField="selectedInventoryDetailKey"
            editorType="dxSelectBox"
            label={{ text: t("DETAIL_ROW", "Detail Row") }}
            editorOptions={{
              stylingMode: "outlined",
              dataSource: detailOptions,
              valueExpr: "key",
              displayExpr: "label",
              value: selectedInventoryDetailKey,
              searchEnabled: true,
              disabled: detailOptions.length === 0,
              onValueChanged: (e: { value?: string | null }) => {
                setSelectedInventoryDetailKey(e.value ?? null)
              },
              placeholder: t("SELECT_DETAIL_ROW", "Select detail row"),
            }}
          />
        </Form>

        <div className="mt-3 space-y-2 text-sm text-gray-600">
          <div>
            <span className="font-medium text-gray-800">{t("DETAIL_COUNT", "Số dòng detail")}: </span>
            {detailOptions.length}
          </div>
          <div>
            <span className="font-medium text-gray-800">{t("CURRENT_ROW", "Dòng hiện tại")}: </span>
            {selectedInventoryDetail ? selectedInventoryDetail.index + 1 : "-"}
          </div>
          <div>
            <span className="font-medium text-gray-800">{t("DETAIL_AMOUNT", "Số tiền detail")}: </span>
            {selectedInventoryDetail ? getDetailRowAmount(selectedInventoryDetail.row).toLocaleString() : "0"}
          </div>
        </div>
      </div> */}

      <div className="flex min-h-0 flex-col rounded-lg border border-dashed border-gray-300 bg-gray-50 p-4">
        <div className="mt-3 min-h-[420px] flex-1 overflow-hidden">
          {selectedInventoryDetail ? (
            selectedTabKey === "inventory_input" ? (
              <ChitInventoryInputGridPopup
                ref={inventoryInputGridRef}
                companyCd={draft.COMPANY_CD}
                chitDetailId={selectedInventoryDetail.row.CHITDETAIL_ID ?? null}
                chitDetailCd={selectedInventoryDetail.row.CHITDETAIL_CD ?? null}
                detailRowKey={selectedInventoryDetail.key}
                detailAmount={getDetailRowAmount(selectedInventoryDetail.row)}
                detailLabel={selectedInventoryDetail.label}
                inventoryYmd={selectedInventoryDetail.row.INVENTORY_YMD ?? draft.CHIT_YMD}
                rows={getDetailInventoryInputs(selectedInventoryDetail.row)}
                onChange={(rows) => handleInventoryInputsChange(selectedInventoryDetail.key, rows)}
                screenCd={screenCd}
                gridId={inventoryInputGridId}
                persistColumnSettings={true}
              />
            ) : (
              <ChitInventoryOutputGridPopup
                ref={inventoryOutputGridRef}
                companyCd={draft.COMPANY_CD}
                chitDetailId={selectedInventoryDetail.row.CHITDETAIL_ID ?? null}
                chitDetailCd={selectedInventoryDetail.row.CHITDETAIL_CD ?? null}
                detailRowKey={selectedInventoryDetail.key}
                detailAmount={getDetailRowAmount(selectedInventoryDetail.row)}
                detailLabel={selectedInventoryDetail.label}
                inventoryYmd={selectedInventoryDetail.row.INVENTORY_YMD ?? draft.CHIT_YMD}
                rows={getDetailInventoryOutputs(selectedInventoryDetail.row)}
                onChange={(rows) => handleInventoryOutputsChange(selectedInventoryDetail.key, rows)}
                screenCd={screenCd}
                gridId={inventoryOutputGridId}
                persistColumnSettings={true}
              />
            )
          ) : (
            <div className="flex h-full items-center justify-center rounded-lg border border-white bg-white p-4 text-sm text-gray-500">
              {t("WAREHOUSE_EMPTY_HINT", "Chưa có detail nào. Hãy thêm detail trước khi khai báo kho.")}
            </div>
          )}
        </div>
      </div>
    </div>
  )

  return (
    <Popup
      visible={visible}
      title={title}
      showTitle={true}
      dragEnabled={false}
      hideOnOutsideClick={!loading}
      width="100vw"
      height="100vh"
      maxWidth="100vw"
      maxHeight="100vh"
      container=".dx-viewport"
      position={{ my: "center", at: "center", of: window }}
      onHiding={handleClosePopup}
      onShown={() => {
        setDetailLayoutVersion((current) => current + 1)
      }}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        widget="dxButton"
        options={{
          icon: "columnchooser",
          text: t("SYS_GRID_COLUMN_SETTING", "Sys Grid Column Setting"),
          hint: t("SYS_GRID_COLUMN_SETTING", "Sys Grid Column Setting"),
          stylingMode: "text",
          disabled: loading,
          onClick: () => {
            openColumnSettings()
          },
        }}
      />
      <LookupPopupProvider>
        <div className="relative h-full w-full overflow-hidden p-2">
          <LoadPanel visible={loading || inventoryLoading} showPane={true} showIndicator={true} shading={true} />
          <ShortcutHelpPopup
            visible={shortcutHelpVisible}
            shortcuts={shortcutHelpItems}
            onClose={closeShortcutHelp}
          />

          <div className="flex h-full flex-col gap-3 overflow-hidden">
            <div className="h-[33vh] min-h-[240px] max-h-[38vh] overflow-auto rounded-lg border border-gray-200 bg-white p-4">
              <div className="mb-2 flex items-center justify-between gap-2">
                <div className="text-sm font-semibold text-gray-800">{chitLabel}</div>
              </div>

              <div className="grid gap-4 lg:grid-cols-4">
                <div className="rounded-xl border border-gray-200 bg-slate-50 p-4 lg:col-span-3">
                  <Form formData={formData} labelLocation="top" colCount={2} onFieldDataChanged={handleFieldDataChanged}>
                    <Item
                      dataField="AMOUNT"
                      editorType="dxNumberBox"
                      label={{ text: t("AMOUNT", "Amount") }}
                      editorOptions={{ stylingMode: "outlined", format: "#,##0.00", readOnly: true }}
                    />
                    <Item
                      dataField="PAYER_INFO"
                      colSpan={2}
                      editorType="dxTextBox"
                      label={{ text: t("lblPayer", "Payer Info") }}
                      editorOptions={{ stylingMode: "outlined" }}
                    />
                    <Item
                      dataField="DESCRIPTION_VIET"
                      colSpan={2}
                      editorType="dxTextBox"
                      label={{ text: t("DESCRIPTION_VIET", "Description (VI)") }}
                      editorOptions={{ stylingMode: "outlined", minHeight: 88, autoResizeEnabled: true }}
                    />
                    <Item
                      dataField="DESCRIPTION_ENG"
                      editorType="dxTextBox"
                      label={{ text: t("DESCRIPTION_ENG", "Description (EN)") }}
                      editorOptions={{ stylingMode: "outlined", minHeight: 88, autoResizeEnabled: true }}
                    />
                    <Item
                      dataField="DESCRIPTION_KOR"
                      editorType="dxTextBox"
                      label={{ text: t("DESCRIPTION_KOR", "Description (KO)") }}
                      editorOptions={{ stylingMode: "outlined", minHeight: 88, autoResizeEnabled: true }}
                    />
                  </Form>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4 lg:col-span-1">
                  <Form ref={formRef} formData={formData} labelLocation="top" colCount={1} onFieldDataChanged={handleFieldDataChanged}>
                    <Item
                      dataField="CHIT_NO"
                      editorType="dxTextBox"
                      label={{ text: t("CHIT_NO", "Document No") }}
                      editorOptions={{ stylingMode: "outlined", validationMessageMode: "always" }}
                      validationRules={[
                        { type: "required", message: t("MSG_MUST_ITEM", "Document No is required") },
                        {
                          type: "custom",
                          reevaluate: true,
                          message: t("MSG_MUST_ITEM", "Document No is required"),
                          validationCallback: (e: { value?: unknown }) => String(e.value ?? "").trim().length > 0,
                        },
                      ]}
                    />
                    <Item
                      dataField="CHIT_YMD"
                      editorType="dxDateBox"
                      label={{ text: t("CHIT_YMD", "Note Date") }}
                      editorOptions={{
                        stylingMode: "outlined",
                        displayFormat: "dd/MM/yyyy",
                        type: "date",
                        validationMessageMode: "always",
                      }}
                      validationRules={[
                        { type: "required", message: t("MSG_MUST_ITEM", "Chit date is required") },
                        {
                          type: "custom",
                          reevaluate: true,
                          message: t("MSG_MUST_ITEM", "Chit date is required"),
                          validationCallback: (e: { value?: unknown }) => String(e.value ?? "").trim().length > 0,
                        },
                      ]}
                    />
                  </Form>
                </div>
              </div>
            </div>

            <div className={detailPanelClassName}>
              <TabPanel
                selectedIndex={selectedTabIndex}
                onSelectionChanged={(event: any) => {
                  void handleTabSelectionChanged(event)
                }}
                deferRendering={false}
                animationEnabled={false}
                swipeEnabled={false}
                stylingMode="secondary"
                height={isDetailTabActive ? undefined : "100%"}
                items={tabItems}
                itemTitleRender={(item: { title: string }) => <span className="text-sm font-medium">{item.title}</span>}
                itemRender={(item: { key: EditorTabKey }) => {
                  if (item.key === "detail") {
                    return (
                      <div className="overflow-hidden pt-2">
                        <ChitDetailGridPopup
                          ref={detailGridRef}
                          companyCd={draft.COMPANY_CD}
                          details={draft.DETAILS}
                          onChange={handleDetailsChange}
                          isVisible={visible && isDetailTabActive}
                          layoutVersion={detailLayoutVersion}
                          ChitDetailColumns={DetailColumns}
                          screenCd={screenCd}
                          gridId={detailGridId}
                          persistColumnSettings={true}
                          onOpenInventoryRow={(rowKey) => {
                            void handleOpenInventoryFromDetail(rowKey)
                          }}
                        />
                      </div>
                    )
                  }

                  return (
                    <div className="flex h-full min-h-0 flex-col gap-3 pt-2">
                      {renderDetailSelector()}
                    </div>
                  )
                }}
              />
            </div>

            <div className="flex items-center justify-end gap-3 border-t border-gray-200 pt-4">
              <Button
                text={t("TIT_SAVE", "Save")}
                type="default"
                stylingMode="contained"
                onClick={handleSave}
                disabled={loading || activeDetails.length === 0}
              />
              <Button
                text={t("CANCEL", "Cancel")}
                stylingMode="outlined"
                onClick={handleClosePopup}
                disabled={loading}
              />
            </div>
          </div>
        </div>
        <GridColumnSettingsPopup
          visible={columnSettingsVisible}
          title={t("AUDIT_SETTING_SHOW_HIDE", "Column Settings")}
          tabs={columnSettingsTabs}
          onClose={() => setColumnSettingsVisible(false)}
          onReset={handleColumnSettingsReset}
          onSaveTabs={handleColumnSettingsSave}
        />
      </LookupPopupProvider>
    </Popup>
  )
}

export default ChitEditorPopup
