import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Button from "devextreme-react/button"
import DataGrid, { Column, Editing, RequiredRule, Summary, TotalItem } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import AccountLookupCellEditor from "@/components/lookup/AccountLookupCellEditor"
import { getAcclistLookupStore } from "@/components/lookup/AcclistLookupStore"
import { getCurrentDataLanguageSuffix } from "@/utils/language"
import DropDownButton from "devextreme-react/drop-down-button"
import Form, { Item } from "devextreme-react/form"
import LoadPanel from "devextreme-react/load-panel"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import notify from "devextreme/ui/notify"
import { useLocation, useNavigate } from "react-router-dom"

import { getApiErrorMessage } from "@/api/apiTypes"
import { getInventorySourceVoucher } from "@/api/inventoryLinkApi"
import { getChits } from "@/api/voucherApi"
import GridColumnSettingsPopup, {
  type GridColumnSettingsPopupTab,
  type GridColumnSettingsPopupTabSaveItem,
} from "@/components/datagrid/GridColumnSettingsPopup"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"
import { type GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { ReferenceLookup } from "@/components/lookup"
import { LookupPopupProvider } from "@/components/lookup/LookupPopupHost"
import { LanguageContext } from "@/lib/i18nLoader"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import { isForeignCurrencyCode } from "@/lib/currency"
import { getSequenceSubmitCode, getVoucherSequencePreviewCode } from "@/lib/codeSequence"
import { createShortcutBindings, type ShortcutHandler } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS, type ShortcutActionCode } from "@/lib/shortcuts/shortcutDefinitions"
import { createPopupShortcutWrapperAttr, isPopupShortcutScopeTopMost, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useStateRef from "@/hooks/useStateRef"
import type { ChitInfo, InventoryInputLine, InventoryOutputLine, InventoryVoucher } from "@/types/voucher"
import { getVoucherRouteByChitType, normalizeChitRows } from "@/pages/VoucherManagement/chitUtils"
import {
  buildInventoryAccountingReferenceOptions,
  INVENTORY_LINK_SOURCE_CODE_TYPE,
  POPUP_FADE_ANIMATION,
  type InventoryAccountingReferenceOption,
} from "@/pages/VoucherManagement/components/chitEditorConstants"
import { useSysCodes } from "@/lib/sysCodeContext"
import {
  applyAccountingDetailToInventoryLines,
  getLinkedChitDetailIdFromInventoryDraft,
  resolveFreeAccountingDetail,
} from "../inventoryAccountingLinkUtils"
import {
  calculateInventoryAmount,
  ensureInventoryDefaultLine,
  hasInventoryLineContent,
  type InventoryLine,
  type InventoryVoucherType,
} from "../inventoryVoucherModel"
import {
  createRequiredRule,
  createTrimmedRequiredRule,
  createVoucherDateBoxEditorOptions,
  createVoucherEditorOptions,
} from "@/pages/VoucherManagement/forms/documentFieldConfig"
import { openVoucherReportViewer } from "@/pages/VoucherManagement/voucherReportViewer"
import ChitInventoryInputGridPopup, { type ChitInventoryInputGridPopupHandle } from "./ChitInventoryInputGridPopup"
import ChitInventoryOutputGridPopup, { type ChitInventoryOutputGridPopupHandle } from "./ChitInventoryOutputGridPopup"

interface InventoryEditorPopupProps {
  visible: boolean
  value: InventoryVoucher
  chitType: InventoryVoucherType
  voucherLabel: string
  isUpdate: boolean
  loading: boolean
  onClose: () => void
  onSave: (record: InventoryVoucher) => Promise<void>
  onSaveAndNew?: (record: InventoryVoucher) => Promise<void>
  printReportCode?: string | null
}

function hasForeignCurrencyRows(rows: readonly InventoryLine[]): boolean {
  return rows.some(
    (row) =>
      isForeignCurrencyCode(row.FC_TYPE) ||
      Number(row.UNIT_PRICE_FC ?? 0) !== 0 ||
      Number(row.EXCHANGE_RATES ?? 0) !== 0 ||
      Number(row.AMOUNT_FC ?? 0) !== 0,
  )
}

export default function InventoryEditorPopup({
  visible,
  value,
  chitType,
  voucherLabel,
  isUpdate,
  loading,
  onClose,
  onSave,
  onSaveAndNew,
  printReportCode,
}: InventoryEditorPopupProps) {
  const [draft, setDraft, draftRef] = useStateRef<InventoryVoucher>(() => ensureInventoryDefaultLine(value))
  const inputGridRef = useRef<ChitInventoryInputGridPopupHandle | null>(null)
  const outputGridRef = useRef<ChitInventoryOutputGridPopupHandle | null>(null)
  const cogsGridRef = useRef<dxDataGrid | null>(null)
  const cogsAccountEditsRef = useRef(new Map<string, Partial<Pick<InventoryOutputLine, "COGS_DEBIT" | "COGS_CREDIT">>>())
  const inputColumnSettingStateRef = useRef<GridColumnSettingState | null>(null)
  const outputColumnSettingStateRef = useRef<GridColumnSettingState | null>(null)
  const autoChitNoRef = useRef<string | null>(null)
  const prevSyncValueRef = useRef(value)
  const location = useLocation()
  const navigate = useNavigate()
  const { translate } = useContext(LanguageContext)
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])
  const { getFormat } = useDecimalColumnFormats()
  const screenCd = location.pathname
  const activeLines = chitType === "IR" ? draft.INPUTS : draft.OUTPUTS
  const foreignCurrencyColumnsVisible = useMemo(() => hasForeignCurrencyRows(activeLines), [activeLines])
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [detailTab, setDetailTab] = useState<"inventory" | "cogs">("inventory")
  useEffect(() => { setDetailTab("inventory"); cogsAccountEditsRef.current.clear() }, [visible, value])
  const cogsRows = useMemo(() => draft.OUTPUTS.filter(hasInventoryLineContent).map(row => ({
    ...row,
    COGS_AMOUNT: row.AMOUNT_CC === null ? null : Math.round((row.AMOUNT_CC + Number.EPSILON * Math.max(1, Math.abs(row.AMOUNT_CC))) * 100) / 100,
  })), [draft.OUTPUTS])
  const [columnSettingsTabs, setColumnSettingsTabs] = useState<GridColumnSettingsPopupTab[]>([])
  const isInputVoucher = chitType === "IR"
  const isAdjustmentVoucher = chitType === "IA"
  const activeGridId = isInputVoucher
    ? "inventory-input-editor-grid"
    : isAdjustmentVoucher
      ? "inventory-adjustment-editor-grid"
      : "inventory-output-editor-grid"
  const activeGridRef = isInputVoucher ? inputGridRef : outputGridRef
  const activeColumnSettingStateRef = isInputVoucher ? inputColumnSettingStateRef : outputColumnSettingStateRef

  const { sysCodeMap } = useSysCodes()
  const inventoryLinkSourceOptions = useMemo(
    () => buildInventoryAccountingReferenceOptions(sysCodeMap[INVENTORY_LINK_SOURCE_CODE_TYPE] ?? []),
    [sysCodeMap],
  )
  const accountingReferenceOptions = useMemo(
    () => (chitType === "IR" || chitType === "IO" ? inventoryLinkSourceOptions[chitType] ?? [] : []),
    [chitType, inventoryLinkSourceOptions],
  )
  const [accountingReferenceOptionKey, setAccountingReferenceOptionKey] = useState<string>("")
  const [selectedAccountingSourceId, setSelectedAccountingSourceId] = useState<number | null>(null)
  const [linkedAccountingChitNo, setLinkedAccountingChitNo] = useState("")
  const [linkedAccountingChitType, setLinkedAccountingChitType] = useState("")
  const [linkingAccountingReference, setLinkingAccountingReference] = useState(false)

  const selectedAccountingReferenceOption = useMemo(() => {
    if (accountingReferenceOptions.length === 0) {
      return null
    }
    return (
      accountingReferenceOptions.find((option) => option.optionKey === accountingReferenceOptionKey) ??
      accountingReferenceOptions[0] ??
      null
    )
  }, [accountingReferenceOptionKey, accountingReferenceOptions])

  useEffect(() => {
    if (accountingReferenceOptions.length === 0) {
      setAccountingReferenceOptionKey("")
      return
    }
    if (!accountingReferenceOptions.some((option) => option.optionKey === accountingReferenceOptionKey)) {
      setAccountingReferenceOptionKey(accountingReferenceOptions[0].optionKey)
    }
  }, [accountingReferenceOptionKey, accountingReferenceOptions])

  const createColumnSettingTabs = useCallback(
    (items: GridColumnSettingEditorItem[] = [], loading = false): GridColumnSettingsPopupTab[] => [
      {
        key: activeGridId,
        title: isInputVoucher
          ? t("INVENTORY_INPUT", "Inventory Input")
          : isAdjustmentVoucher
            ? t("INVENTORY_ADJUSTMENT", "Inventory adjustment")
            : t("INVENTORY_OUTPUT", "Inventory Output"),
        items,
        loading,
      },
    ],
    [activeGridId, isAdjustmentVoucher, isInputVoucher, t],
  )

  const openColumnSettings = useCallback(() => {
    setColumnSettingsVisible(true)
    setColumnSettingsTabs(createColumnSettingTabs([], true))

    const component = activeGridRef.current?.getGridInstance() ?? null
    void Promise.resolve(
      activeColumnSettingStateRef.current
        ? activeColumnSettingStateRef.current.loadEditorItems(component)
        : [] as GridColumnSettingEditorItem[],
    ).then((items) => {
      setColumnSettingsTabs(createColumnSettingTabs(items, false))
    })
  }, [activeColumnSettingStateRef, activeGridRef, createColumnSettingTabs])

  // TEMP disabled: link via accounting voucher list instead of create-from-source (restore later).
  // Do not delete this block — uncomment + set ENABLE_CREATE_FROM_INVENTORY = true to restore.
  // const ENABLE_CREATE_FROM_INVENTORY = false
  // const getCreateVoucherTargetChitType = useCallback((action: VoucherSourceInventoryAction): ChitType | null => {
  //   switch (action) {
  //     case "create_purchase_voucher":
  //       return "PO"
  //     case "create_purchase_discount_voucher":
  //       return "PD"
  //     case "create_purchase_return_voucher":
  //       return "PR"
  //     case "create_sales_voucher":
  //       return "SO"
  //     case "create_sales_discount_voucher":
  //       return "SD"
  //     case "create_sales_return_voucher":
  //       return "SR"
  //     default:
  //       return null
  //   }
  // }, [])
  //
  // const createVoucherActions = useMemo(() => {
  //   if (chitType === "IR") {
  //     return [
  //       { action: "create_purchase_voucher" as const, label: t("CREATE_PURCHASE_VOUCHER", "Create purchase voucher") },
  //       { action: "create_purchase_discount_voucher" as const, label: t("CREATE_PURCHASE_DISCOUNT_VOUCHER", "Create purchase discount voucher") },
  //       { action: "create_purchase_return_voucher" as const, label: t("CREATE_PURCHASE_RETURN_VOUCHER", "Create purchase return voucher") },
  //     ]
  //   }
  //
  //   if (chitType === "IO") {
  //     return [
  //       { action: "create_sales_voucher" as const, label: t("CREATE_SALES_VOUCHER", "Create sales voucher") },
  //       { action: "create_sales_discount_voucher" as const, label: t("CREATE_SALES_DISCOUNT_VOUCHER", "Create sales discount voucher") },
  //       { action: "create_sales_return_voucher" as const, label: t("CREATE_SALES_RETURN_VOUCHER", "Create sales return voucher") },
  //     ]
  //   }
  //
  //   return [] as Array<{ action: VoucherSourceInventoryAction; label: string }>
  // }, [chitType, t])
  //
  // const getCreateFromSourceStorageKey = useCallback((): string => {
  //   return `create_from_source_state:${Date.now().toString(36)}:${Math.random().toString(36).slice(2)}`
  // }, [])
  //
  // const persistCreateFromSourceState = useCallback(
  //   (state: VoucherCreateFromSourceState): string => {
  //     const storageKey = getCreateFromSourceStorageKey()
  //     try {
  //       window.localStorage.setItem(storageKey, JSON.stringify(state))
  //     } catch {
  //     }
  //     return storageKey
  //   },
  //   [getCreateFromSourceStorageKey],
  // )
  //
  // const handleCreateVoucherAction = useCallback(
  //   (action: VoucherSourceInventoryAction) => {
  //     const targetChitType = getCreateVoucherTargetChitType(action)
  //     if (!targetChitType) {
  //       return
  //     }
  //
  //     const route = getVoucherRouteByChitType(targetChitType)
  //     if (!route) {
  //       return
  //     }
  //
  //     const stateKey = persistCreateFromSourceState({
  //       sourceVoucher: mapInventoryVoucherToSourceChitInfo(draft),
  //       sourceLedger: chitType === "IR" ? "AP" : "AR",
  //       sourceChitType: chitType,
  //       sourceAction: action,
  //     })
  //
  //     const targetUrl = `${window.location.origin}${route}?createFromSourceStateKey=${encodeURIComponent(stateKey)}`
  //     const newWindow = window.open(targetUrl, "_blank")
  //     if (!newWindow) {
  //       notify(t("UNABLE_OPEN_NEW_TAB", "Unable to open new browser tab"), "error", 3000)
  //     }
  //   },
  //   [chitType, draft, getCreateVoucherTargetChitType, persistCreateFromSourceState, t],
  // )

  const handleAccountingReferenceSelected = useCallback(
    async (source: ChitInfo) => {
      const option = selectedAccountingReferenceOption
      if (!option) {
        return
      }

      setLinkingAccountingReference(true)
      try {
        let syncedInputs = draftRef.current.INPUTS
        let syncedOutputs = draftRef.current.OUTPUTS

        if (chitType === "IR") {
          const rows = await inputGridRef.current?.savePendingChanges()
          if (rows) {
            syncedInputs = rows
          }
        } else if (chitType === "IO") {
          const rows = await outputGridRef.current?.savePendingChanges()
          if (rows) {
            syncedOutputs = rows
          }
        }

        const currentLinkedDetailId = getLinkedChitDetailIdFromInventoryDraft(
          {
            ...draftRef.current,
            INPUTS: syncedInputs,
            OUTPUTS: syncedOutputs,
          },
          chitType,
        )
        const freeDetail = await resolveFreeAccountingDetail(option, source, currentLinkedDetailId)
        if (!freeDetail) {
          notify(
            t("REFERENCE_NO_FREE_DETAIL", "Chứng từ kế toán không còn chi tiết trống để liên kết"),
            "warning",
            3500,
          )
          return
        }

        setSelectedAccountingSourceId(Number(source.CHIT_ID ?? 0) || null)
        setLinkedAccountingChitNo(String(source.CHIT_NO ?? source.CHIT_CD ?? "").trim())
        setLinkedAccountingChitType(String(source.CHIT_TYPE ?? option.chitType ?? "").trim().toUpperCase())
        setDraft((current) => {
          if (chitType === "IR") {
            const nextInputs = applyAccountingDetailToInventoryLines(
              syncedInputs,
              freeDetail.CHITDETAIL_ID,
              freeDetail.CHITDETAIL_CD,
            )
            return {
              ...current,
              INPUTS: nextInputs,
              OUTPUTS: [],
              AMOUNT: calculateInventoryAmount(nextInputs),
            }
          }

          const nextOutputs = applyAccountingDetailToInventoryLines(
            syncedOutputs,
            freeDetail.CHITDETAIL_ID,
            freeDetail.CHITDETAIL_CD,
          )
          return {
            ...current,
            INPUTS: [],
            OUTPUTS: nextOutputs,
            AMOUNT: calculateInventoryAmount(nextOutputs),
          }
        })
      } catch (error) {
        notify(getApiErrorMessage(error, t("REFERENCE_LINK_FAILED", "Liên kết chứng từ thất bại")), "error", 3000)
      } finally {
        setLinkingAccountingReference(false)
      }
    },
    [chitType, draftRef, resolveFreeAccountingDetail, selectedAccountingReferenceOption, setDraft, t],
  )

  const handleClearAccountingReference = useCallback(() => {
    setSelectedAccountingSourceId(null)
    setLinkedAccountingChitNo("")
    setLinkedAccountingChitType("")
    setDraft((current) => {
      if (chitType === "IR") {
        const nextInputs = applyAccountingDetailToInventoryLines(current.INPUTS, null, "")
        return {
          ...current,
          INPUTS: nextInputs,
          OUTPUTS: [],
          AMOUNT: calculateInventoryAmount(nextInputs),
        }
      }

      if (chitType === "IO") {
        const nextOutputs = applyAccountingDetailToInventoryLines(current.OUTPUTS, null, "")
        return {
          ...current,
          INPUTS: [],
          OUTPUTS: nextOutputs,
          AMOUNT: calculateInventoryAmount(nextOutputs),
        }
      }

      return current
    })
  }, [chitType, setDraft])

  const handleAccountingReferenceOptionClick = useCallback(
    (option: InventoryAccountingReferenceOption) => {
      if (option.optionKey === accountingReferenceOptionKey) {
        return
      }
      setAccountingReferenceOptionKey(option.optionKey)
      handleClearAccountingReference()
    },
    [accountingReferenceOptionKey, handleClearAccountingReference],
  )

  const handleColumnSettingsSave = useCallback(
    async (tabs: GridColumnSettingsPopupTabSaveItem[]) => {
      if (!activeColumnSettingStateRef.current) {
        setColumnSettingsVisible(false)
        return
      }

      const tabMap = new Map(tabs.map((item) => [item.key, item.items] as const))
      const component = activeGridRef.current?.getGridInstance() ?? null
      const savedItems = component
        ? await activeColumnSettingStateRef.current.applyEditorItemsToComponent(component, tabMap.get(activeGridId) ?? [])
        : await activeColumnSettingStateRef.current.saveEditorItems(tabMap.get(activeGridId) ?? [])

      setColumnSettingsTabs(createColumnSettingTabs(savedItems, false))
      setColumnSettingsVisible(false)
    },
    [activeColumnSettingStateRef, activeGridRef, activeGridId, createColumnSettingTabs],
  )

  const handleColumnSettingsReset = useCallback(
    async () => {
      if (!activeColumnSettingStateRef.current) {
        return
      }

      const resetItems = await activeColumnSettingStateRef.current.resetEditorItems(activeGridRef.current?.getGridInstance() ?? null)
      setColumnSettingsTabs(createColumnSettingTabs(resetItems, false))
    },
    [activeColumnSettingStateRef, activeGridRef, createColumnSettingTabs],
  )

  const resetPreviewChitNo = useCallback(() => {
    autoChitNoRef.current = null
  }, [])

  useEffect(() => {
    if (!visible) {
      resetPreviewChitNo()
    }
  }, [resetPreviewChitNo, visible])

  useEffect(() => {
    if (prevSyncValueRef.current === value) {
      return
    }

    prevSyncValueRef.current = value
    setDraft(ensureInventoryDefaultLine(value))
    setSelectedAccountingSourceId(null)
    setLinkedAccountingChitNo("")
    setLinkedAccountingChitType("")
    resetPreviewChitNo()
  }, [resetPreviewChitNo, setDraft, value])

  const linkedAccountingDetailId = useMemo(
    () => getLinkedChitDetailIdFromInventoryDraft(draft, chitType),
    [chitType, draft.INPUTS, draft.OUTPUTS],
  )

  const isAccountingLinked = linkedAccountingDetailId > 0 && (selectedAccountingSourceId ?? 0) > 0

  useEffect(() => {
    if (!visible || (chitType !== "IR" && chitType !== "IO")) {
      return
    }

    if (!(linkedAccountingDetailId > 0)) {
      setSelectedAccountingSourceId(null)
      setLinkedAccountingChitNo("")
      setLinkedAccountingChitType("")
      return
    }

    let cancelled = false
    void getInventorySourceVoucher(linkedAccountingDetailId)
      .then(async (sourceVoucher) => {
        if (cancelled || !sourceVoucher) {
          return
        }

        const sourceType = String(sourceVoucher.CHIT_TYPE ?? "").trim().toUpperCase()
        const matchedOption = accountingReferenceOptions.find(
          (option) => option.chitType === sourceType,
        )
        if (matchedOption) {
          setAccountingReferenceOptionKey(matchedOption.optionKey)
        }
        setSelectedAccountingSourceId(Number(sourceVoucher.CHIT_ID ?? 0) || null)
        setLinkedAccountingChitType(sourceType)
        setLinkedAccountingChitNo(String(sourceVoucher.CHIT_CD ?? "").trim())

        if (matchedOption && Number(sourceVoucher.CHIT_ID ?? 0) > 0) {
          try {
            const response = await getChits(matchedOption.ledger, matchedOption.chitType, {
              chitId: Number(sourceVoucher.CHIT_ID),
              pageSize: 1,
            })
            if (cancelled) {
              return
            }
            const row = normalizeChitRows(response.data ?? [], matchedOption.chitType)[0]
            const chitNo = String(row?.CHIT_NO ?? "").trim()
            if (chitNo) {
              setLinkedAccountingChitNo(chitNo)
            }
          } catch {
            // Keep CHIT_CD fallback already set above.
          }
        }
      })
      .catch((error: unknown) => {
        console.error("Load linked accounting voucher failed", error)
      })

    return () => {
      cancelled = true
    }
  }, [accountingReferenceOptions, chitType, linkedAccountingDetailId, visible])

  useEffect(() => {
    if (!visible || isUpdate) {
      return
    }

    const currentNo = String(draftRef.current.CHIT_NO ?? "").trim()
    const previousPreviewNo = autoChitNoRef.current
    if (currentNo && currentNo !== previousPreviewNo) {
      return
    }

    let cancelled = false

    void getVoucherSequencePreviewCode(chitType, draftRef.current.CHIT_YMD).then((nextNo) => {
      if (cancelled || !nextNo) {
        return
      }

      autoChitNoRef.current = nextNo
      setDraft((current) => {
        const activeNo = String(current.CHIT_NO ?? "").trim()
        if (activeNo && activeNo !== previousPreviewNo) {
          return current
        }

        return {
          ...current,
          CHIT_NO: nextNo,
        }
      })
    }).catch((error: unknown) => {
      console.error("Preview inventory voucher no failed", error)
    })

    return () => {
      cancelled = true
    }
  }, [chitType, draft.CHIT_YMD, draftRef, isUpdate, setDraft, visible])

  const handleFieldDataChanged = useCallback((event: { dataField?: string; value?: unknown }) => {
    if (!event.dataField) {
      return
    }

    setDraft((current) => ({
      ...current,
      [event.dataField as keyof InventoryVoucher]: event.value,
    }))
  }, [])

  const handleInputsChange = useCallback((rows: InventoryInputLine[]) => {
    setDraft((current) => ({
      ...current,
      INPUTS: rows,
      OUTPUTS: [],
      AMOUNT: calculateInventoryAmount(rows),
    }))
  }, [])

  const handleOutputsChange = useCallback((rows: InventoryOutputLine[]) => {
    setDraft((current) => {
      for (const row of rows) {
        const previous = current.OUTPUTS.find(item => item.ROW_KEY === row.ROW_KEY)
        if (previous && previous.PRODUCT_ID !== row.PRODUCT_ID) {
          cogsAccountEditsRef.current.delete(row.ROW_KEY)
        }
      }
      return {
      ...current,
      INPUTS: chitType === "IA" ? current.INPUTS : [],
      OUTPUTS: rows.map(row => ({ ...row, ...cogsAccountEditsRef.current.get(row.ROW_KEY) })),
      AMOUNT: calculateInventoryAmount(rows),
      }
    })
  }, [chitType])

  const syncGridRows = useCallback(async () => {
    if (chitType === "IO" && cogsGridRef.current) {
      await cogsGridRef.current.saveEditData()
      if (cogsGridRef.current.hasEditData()) throw new Error("Tài khoản Nợ/Có giá vốn chưa hợp lệ.")
    }
    if (chitType === "IR") {
      const rows = await inputGridRef.current?.savePendingChanges()
      if (rows) {
        const nextDraft = {
          ...draft,
          INPUTS: rows,
          OUTPUTS: [],
          AMOUNT: calculateInventoryAmount(rows),
        }
        setDraft(nextDraft)
        return nextDraft
      }
    }

    if (chitType === "IO") {
      const rows = await outputGridRef.current?.savePendingChanges()
      if (rows) {
        const syncedRows = rows.map(row => ({ ...row, ...cogsAccountEditsRef.current.get(row.ROW_KEY) }))
        const nextDraft = {
          ...draftRef.current,
          INPUTS: [],
          OUTPUTS: syncedRows,
          AMOUNT: calculateInventoryAmount(syncedRows),
        }
        setDraft(nextDraft)
        return nextDraft
      }
    }

    if (chitType === "IA") {
      const rows = await outputGridRef.current?.savePendingChanges()
      if (rows) {
        const nextDraft = {
          ...draft,
          OUTPUTS: rows,
          AMOUNT: calculateInventoryAmount(rows),
        }
        setDraft(nextDraft)
        return nextDraft
      }
    }

    return draft
  }, [chitType, draft])

  const prepareRecordForSave = useCallback((record: InventoryVoucher): InventoryVoucher => ({
    ...record,
    CHIT_CD: String(record.CHIT_CD ?? "").trim(),
    CHIT_NO: getSequenceSubmitCode(record.CHIT_NO),
  }), [])

  const handleSave = useCallback(async () => {
    try {
      const record = await syncGridRows()
      await onSave(prepareRecordForSave(record))
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
    }
  }, [onSave, prepareRecordForSave, syncGridRows, t])

  const handleSaveAndNew = useCallback(async () => {
    if (!onSaveAndNew) {
      return
    }

    try {
      const record = await syncGridRows()
      await onSaveAndNew(prepareRecordForSave(record))
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
    }
  }, [onSaveAndNew, prepareRecordForSave, syncGridRows, t])

  const handlePrint = useCallback(() => {
    const reportCode = String(printReportCode ?? "").trim()
    if (!reportCode) {
      notify(t("REPORT_NOT_CONFIGURED", "Report is not configured"), "warning", 2500)
      return
    }

    const chitId = Number(draft.CHIT_ID ?? 0)
    if (!Number.isFinite(chitId) || chitId <= 0) {
      notify(t("SAVE_BEFORE_PRINT", "Save the voucher before printing"), "warning", 2500)
      return
    }

    openVoucherReportViewer({
      reportCode,
      chitIds: [chitId],
      companyCd: draft.COMPANY_CD,
      notifyUnableToOpen: (message) => notify(t("UNABLE_OPEN_REPORT_VIEWER", message), "error", 3000),
    })
  }, [draft.CHIT_ID, draft.COMPANY_CD, printReportCode, t])

  const popupShortcutScopeId = usePopupShortcutScopeId("inventory-editor")

  const shortcutBindings = useMemo(() => {
    const builtInHandlers: Partial<Record<ShortcutActionCode, ShortcutHandler>> = {
      [SHORTCUT_ACTIONS.SAVE]: () => {
        void handleSave()
      },
      [SHORTCUT_ACTIONS.SAVE_AND_NEW]: () => {
        void handleSaveAndNew()
      },
      [SHORTCUT_ACTIONS.CLOSE]: () => {
        onClose()
      },
    }

    builtInHandlers[SHORTCUT_ACTIONS.PRINT] = () => {
      handlePrint()
    }

    return createShortcutBindings(
      [SHORTCUT_ACTIONS.SAVE, SHORTCUT_ACTIONS.SAVE_AND_NEW, SHORTCUT_ACTIONS.PRINT, SHORTCUT_ACTIONS.CLOSE],
      builtInHandlers,
      {
        [SHORTCUT_ACTIONS.SAVE]: { allowInInput: true },
        [SHORTCUT_ACTIONS.SAVE_AND_NEW]: { allowInInput: true },
        [SHORTCUT_ACTIONS.PRINT]: { allowInInput: true },
        [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
      },
    )
  }, [handlePrint, handleSave, handleSaveAndNew, onClose])

  const shouldHandleShortcutEvent = useCallback(
    () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
    [popupShortcutScopeId],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: visible,
    shouldHandleEvent: shouldHandleShortcutEvent,
  })

  const handleOpenLinkedAccountingVoucher = useCallback(() => {
    if (!selectedAccountingSourceId || !linkedAccountingChitType) {
      return
    }

    const route = getVoucherRouteByChitType(linkedAccountingChitType)
    if (!route) {
      return
    }

    navigate(route, {
      state: {
        openChitId: selectedAccountingSourceId,
        openMode: "edit",
      },
    })
  }, [linkedAccountingChitType, navigate, selectedAccountingSourceId])

  const accountingLinkSlot = useMemo(() => {
    if (!selectedAccountingReferenceOption || isAdjustmentVoucher) {
      return null
    }

    if (isAccountingLinked) {
      const displayNo = linkedAccountingChitNo || String(selectedAccountingSourceId ?? "")
      return (
        <>
          <span className="inline-flex max-w-full items-center gap-1.5 rounded-md border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-sm text-emerald-900">
            <span className="whitespace-nowrap font-medium">{t("LINKED", "Đã liên kết")}</span>
            <span className="truncate font-semibold">
              {linkedAccountingChitType ? `${linkedAccountingChitType} · ${displayNo}` : displayNo}
            </span>
          </span>
          <Button
            icon="link"
            stylingMode="outlined"
            disabled={loading || linkingAccountingReference}
            hint={t("OPEN_SOURCE_VOUCHER", "Mở chứng từ nguồn")}
            onClick={handleOpenLinkedAccountingVoucher}
          />
          <Button
            icon="clear"
            stylingMode="outlined"
            disabled={loading || linkingAccountingReference}
            hint={t("CLEAR_REFERENCE", "Bỏ liên kết")}
            onClick={handleClearAccountingReference}
          />
        </>
      )
    }

    return (
      <>
        {accountingReferenceOptions.length > 1 ? (
          <DropDownButton
            stylingMode="outlined"
            text={t(
              selectedAccountingReferenceOption.hintKey,
              selectedAccountingReferenceOption.hintFallback,
            )}
            items={accountingReferenceOptions.map((option) => ({
              ...option,
              label: t(option.hintKey, option.hintFallback),
            }))}
            displayExpr="label"
            keyExpr="optionKey"
            onItemClick={(event) => {
              const option = event.itemData as InventoryAccountingReferenceOption | undefined
              if (option) {
                handleAccountingReferenceOptionClick(option)
              }
            }}
            disabled={loading || linkingAccountingReference}
          />
        ) : null}
        <div className="min-w-[220px] w-full max-w-[300px] flex-shrink-0">
          <ReferenceLookup
            key={`${selectedAccountingReferenceOption.ledger}:${selectedAccountingReferenceOption.chitType}`}
            ledger={selectedAccountingReferenceOption.ledger}
            chitType={selectedAccountingReferenceOption.chitType}
            value={null}
            selectedSourceIds={[]}
            onSelect={handleAccountingReferenceSelected}
            excludeLinkedSources={false}
            useGlobalLinkedStatus={true}
            placeholder={t(
              selectedAccountingReferenceOption.hintKey,
              selectedAccountingReferenceOption.hintFallback,
            )}
            hintKey={selectedAccountingReferenceOption.hintKey}
            hintFallback={selectedAccountingReferenceOption.hintFallback}
            disabled={loading || linkingAccountingReference}
          />
        </div>
      </>
    )
  }, [
    accountingReferenceOptions,
    handleAccountingReferenceOptionClick,
    handleAccountingReferenceSelected,
    handleClearAccountingReference,
    handleOpenLinkedAccountingVoucher,
    isAccountingLinked,
    isAdjustmentVoucher,
    linkedAccountingChitNo,
    linkedAccountingChitType,
    linkingAccountingReference,
    loading,
    selectedAccountingReferenceOption,
    selectedAccountingSourceId,
    t,
  ])

  const popupTitle = isUpdate
    ? t("EDIT_VOUCHER", `Edit ${voucherLabel}`)
    : t("ADD_VOUCHER", `Add ${voucherLabel}`)

  const inventoryTabs = chitType === "IO" && (
                <div role="tablist" className="flex shrink-0 gap-2 border-b border-slate-200 px-3 py-2">
                  <Button text={t("INVENTORY_OUTPUT", "Xuất kho")} type={detailTab === "inventory" ? "default" : "normal"}
                    onClick={async () => {
                      try {
                        if (cogsGridRef.current) {
                          await cogsGridRef.current.saveEditData()
                          if (cogsGridRef.current.hasEditData()) throw new Error("Tài khoản Nợ/Có giá vốn chưa hợp lệ.")
                        }
                        setDetailTab("inventory")
                      } catch (error) {
                        notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
                      }
                    }} />
                  <Button text={t("INVENTORY_COGS", "Giá vốn")} type={detailTab === "cogs" ? "default" : "normal"}
                    onClick={async () => {
                      try {
                        await syncGridRows()
                        setDetailTab("cogs")
                      } catch (error) {
                        notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
                      }
                    }} />
                </div>
              )
  const cogsContent = chitType === "IO" && detailTab === "cogs" && (
                <div className="flex min-h-0 flex-1 flex-col">
                  {draft.COGS && <div className="mb-2 text-sm text-slate-600">{draft.COGS.CHIT_NO}</div>}
                  <DataGrid dataSource={cogsRows} keyExpr="ROW_KEY" height="100%" showBorders columnAutoWidth
                    onInitialized={event => { cogsGridRef.current = event.component ?? null }}
                    onDisposing={() => { cogsGridRef.current = null }}
                    onRowUpdating={event => {
                      const updates: Partial<Pick<InventoryOutputLine, "COGS_DEBIT" | "COGS_CREDIT">> = {}
                      if ("COGS_DEBIT" in event.newData) updates.COGS_DEBIT = event.newData.COGS_DEBIT
                      if ("COGS_CREDIT" in event.newData) updates.COGS_CREDIT = event.newData.COGS_CREDIT
                      cogsAccountEditsRef.current.set(event.key, { ...cogsAccountEditsRef.current.get(event.key), ...updates })
                      setDraft(current => ({ ...current, OUTPUTS: current.OUTPUTS.map(row => row.ROW_KEY === event.key
                        ? { ...row, ...updates }
                        : row) }))
                    }}>
                    <Editing mode="cell" allowUpdating />
                    <Column dataField="PRODUCT_CD" allowEditing={false} caption={t("PRODUCT_CODE", "Mã hàng")} />
                    <Column dataField="STORE_CD" allowEditing={false} caption={t("WAREHOUSE_CODE", "Mã kho")} />
                    <Column dataField="UNIT_CD" allowEditing={false} caption={t("UNIT", "Đơn vị")} />
                    <Column dataField="QUANTITY" allowEditing={false} caption={t("QUANTITY", "Số lượng")} dataType="number" format={getFormat("QUANTITY", "#,##0.###")} />
                    <Column dataField="UNIT_PRICE_CC" allowEditing={false} caption={t("INVENTORY_COGS_UNIT_PRICE", "Đơn giá vốn")} dataType="number" format={getFormat("UNIT_PRICE_CC", "#,##0.00")} />
                    <Column dataField="COGS_AMOUNT" allowEditing={false} caption={t("INVENTORY_COGS_AMOUNT", "Giá vốn")} dataType="number" format={getFormat("AMOUNT_CC", "#,##0.00")} />
                    {(["COGS_DEBIT", "COGS_CREDIT"] as const).map(field => (
                      <Column key={field} dataField={field} caption={field === "COGS_DEBIT" ? t("DEBIT", "TK Nợ") : t("CREDIT", "TK Có")}
                        editCellRender={cellInfo => (
                          <AccountLookupCellEditor
                            dataSource={getAcclistLookupStore()}
                            value={cellInfo.data[field]}
                            rowIndex={cellInfo.row.rowIndex}
                            grid={cellInfo.component}
                            setValue={cellInfo.setValue}
                            ValueField={field}
                            NameField={`${field}_NM`}
                            IdField=""
                            LookupCodeField="CD"
                            LookupNameField={`NM_${getCurrentDataLanguageSuffix()}`}
                            placeholder={t("ACC_SELECT", "Chọn tài khoản")}
                            popupTitle={t("ACC_SELECT", "Chọn tài khoản")}
                            buttonHint={t("lblACC", "Danh sách tài khoản")}
                          />
                        )}>
                        <RequiredRule />
                      </Column>
                    ))}
                    <Column dataField="COGS_DEBIT_NM" visible={false} allowEditing={false} />
                    <Column dataField="COGS_CREDIT_NM" visible={false} allowEditing={false} />
                    <Column dataField="SUMMARY" allowEditing={false} caption={t("DESCRIPTION", "Diễn giải")} />
                    <Summary><TotalItem column="COGS_AMOUNT" summaryType="sum" displayFormat={`${t("TOTAL_AMOUNT", "Total amount")}: {0}`} valueFormat={getFormat("AMOUNT_CC", "#,##0.00")} /></Summary>
                  </DataGrid>
                </div>
              )

  return (
    <Popup
      visible={visible}
      title={popupTitle}
      showTitle
      showCloseButton={false}
      dragEnabled={false}
      resizeEnabled={false}
      deferRendering={false}
      hideOnOutsideClick={!loading}
      width="100vw"
      height="100vh"
      maxWidth="100vw"
      maxHeight="100vh"
      container="body"
      position={{ my: "center", at: "center", of: window }}
      wrapperAttr={createPopupShortcutWrapperAttr(popupShortcutScopeId)}
      animation={POPUP_FADE_ANIMATION}
      onHiding={onClose}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        render={() => (
          <div className="flex items-center gap-1 rounded-xl bg-white p-1 shadow-sm">
            {/* TEMP disabled create-from-source — restore with handlers above + DropDownButton below.
            {createVoucherActions.length > 0 ? (
              <DropDownButton
                stylingMode="text"
                icon="add"
                text={t("CREATE_FROM_INVENTORY", "Create from inventory")}
                items={createVoucherActions}
                displayExpr="label"
                keyExpr="action"
                onItemClick={(event) => handleCreateVoucherAction(event.itemData.action)}
                disabled={loading}
              />
            ) : null}
            */}
            <Button
              icon="columnchooser"
              stylingMode="text"
              disabled={loading}
              hint={t("SYS_GRID_COLUMN_SETTING", "Sys Grid Column Setting")}
              onClick={openColumnSettings}
            />
            <Button
              icon="close"
              stylingMode="text"
              disabled={loading}
              hint={t("CANCEL", "Cancel")}
              onClick={onClose}
            />
          </div>
        )}
      />
      <LookupPopupProvider>
        <div className="relative flex h-full flex-col overflow-hidden bg-slate-50">
          <div className="flex-shrink-0 p-3">
            <div className="rounded-md border border-slate-200 bg-white p-3">
              <div className="grid gap-4 lg:grid-cols-[minmax(0,3fr)_minmax(280px,1fr)]">
                <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                  <Form formData={draft} labelLocation="top" colCount={2} onFieldDataChanged={handleFieldDataChanged}>
                    <Item
                      dataField="AMOUNT"
                      editorType="dxNumberBox"
                      label={{ text: t("AMOUNT", "Amount") }}
                      editorOptions={createVoucherEditorOptions({ readOnly: true, format: "#,##0.00" })}
                    />
                    <Item
                      dataField="PAYER_INFO"
                      colSpan={2}
                      editorType="dxTextBox"
                      label={{ text: t("PAYER_INFO", "Payer") }}
                      editorOptions={createVoucherEditorOptions()}
                    />
                    <Item
                      dataField="NOTE"
                      colSpan={2}
                      editorType="dxTextBox"
                      label={{ text: t("NOTE", "Note") }}
                      editorOptions={createVoucherEditorOptions()}
                    />
                  </Form>
                </div>

                <div className="rounded-xl border border-blue-200 bg-blue-50 p-4">
                  <Form formData={draft} labelLocation="top" colCount={1} onFieldDataChanged={handleFieldDataChanged}>
                    <Item
                      dataField="CHIT_NO"
                      editorType="dxTextBox"
                      label={{ text: t("CHIT_NO", "Voucher No") }}
                      editorOptions={createVoucherEditorOptions({ validationMessageMode: "always" })}
                      validationRules={[
                        createRequiredRule(t("MSG_MUST_ITEM", "Voucher no is required")),
                        createTrimmedRequiredRule(t("MSG_MUST_ITEM", "Voucher no is required")),
                      ]}
                    />
                    <Item
                      dataField="CHIT_YMD"
                      editorType="dxDateBox"
                      label={{ text: t("CHIT_YMD", "Voucher Date") }}
                      editorOptions={createVoucherDateBoxEditorOptions({ validationMessageMode: "always" })}
                    />
                  </Form>
                </div>
              </div>
            </div>
          </div>

          <div className="min-h-0 flex-1 px-3 pb-3">
            <div className="flex h-full min-h-0 flex-col rounded-md border border-slate-200 bg-white p-3">
              <div className="flex h-full min-h-0 flex-col">
                {chitType === "IR" ? (
                  <ChitInventoryInputGridPopup
                    ref={inputGridRef}
                    companyCd={draft.COMPANY_CD}
                    chitDetailId={null}
                    chitDetailCd={null}
                    detailRowKey="inventory_input"
                    detailAmount={draft.AMOUNT}
                    detailLabel={voucherLabel}
                    inventoryYmd={draft.CHIT_YMD}
                    rows={draft.INPUTS}
                    onChange={handleInputsChange}
                    height="100%"
                    screenCd={screenCd}
                    gridId="inventory-input-editor-grid"
                    persistColumnSettings
                    isVisible={visible}
                    showDetailContext={false}
                    foreignCurrencyColumnsVisible={foreignCurrencyColumnsVisible}
                    columnSettingStateRef={inputColumnSettingStateRef}
                    linkSlot={accountingLinkSlot}
                  />
                ) : (
                  <ChitInventoryOutputGridPopup
                    ref={outputGridRef}
                    companyCd={draft.COMPANY_CD}
                    chitDetailId={null}
                    chitDetailCd={null}
                    detailRowKey={isAdjustmentVoucher ? "inventory_adjustment" : "inventory_output"}
                    detailAmount={draft.AMOUNT}
                    detailLabel={voucherLabel}
                    inventoryYmd={draft.CHIT_YMD}
                    rows={draft.OUTPUTS}
                    onChange={handleOutputsChange}
                    height="100%"
                    screenCd={screenCd}
                    gridId={activeGridId}
                    persistColumnSettings
                    isVisible={visible}
                    showDetailContext={false}
                    foreignCurrencyColumnsVisible={foreignCurrencyColumnsVisible}
                    columnSettingStateRef={outputColumnSettingStateRef}
                    linkSlot={isAdjustmentVoucher ? undefined : accountingLinkSlot}
                    beforeGridSlot={inventoryTabs}
                    alternateContent={cogsContent}
                    adjustmentMode={isAdjustmentVoucher}
                  />
                )}
              </div>
            </div>
          </div>

          <div className="flex flex-shrink-0 items-center justify-end gap-3 border-t border-gray-200 bg-white px-4 py-3">
            <Button text={t("SAVE", "Save")} icon="save" type="default" stylingMode="contained" onClick={handleSave} disabled={loading} />
            {onSaveAndNew ? (
              <Button
                text={t("SAVE_AND_NEW", "Save and create new")}
                icon="plus"
                type="default"
                stylingMode="outlined"
                onClick={handleSaveAndNew}
                disabled={loading}
              />
            ) : null}
            {printReportCode ? (
              <Button text={t("PRINT", "Print")} icon="print" stylingMode="outlined" onClick={handlePrint} disabled={loading} />
            ) : null}
            <Button text={t("CANCEL", "Cancel")} icon="close" stylingMode="outlined" onClick={onClose} disabled={loading} />
          </div>

          <LoadPanel visible={loading} shading={false} showIndicator />
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
