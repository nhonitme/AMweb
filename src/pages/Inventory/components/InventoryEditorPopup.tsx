import EditorActionToolbar from "@/components/toolbar/EditorActionToolbar"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { deleteInventoryVoucher } from "@/api/inventoryVoucherApi"
import { getInventoryLedger } from "@/pages/Inventory/inventoryVoucherModel"
import DeleteVoucherButton from "@/pages/VoucherManagement/components/DeleteVoucherButton"


import "./InventoryEditorPopup.css"
import Button from "devextreme-react/button"
import Tabs from "devextreme-react/tabs"
import MasterLookupFormField from "@/components/lookup/MasterLookupFormField"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import { renderSharedCustomerLookupPage } from "@/components/lookup/sharedMasterLookupPages"
import { buildCustomerLookupSearchExpr, getCustomerLookupName } from "@/components/lookup/customerLookupUtils"
import { getCurrentDataLanguageSuffix } from "@/utils/language"
import DropDownButton from "devextreme-react/drop-down-button"
import Form, { Item } from "devextreme-react/form"
import LoadPanel from "devextreme-react/load-panel"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import { useLocation, useNavigate } from "react-router-dom"


import { getApiErrorMessage } from "@/api/apiTypes"
import { getInventorySourceVoucher } from "@/api/inventoryLinkApi"
import { getInventoryBomSnapshot } from "@/api/inventoryVoucherApi"
import { getChits } from "@/api/voucherApi"
import GridColumnSettingsPopup, {
  type GridColumnSettingsPopupTab,
  type GridColumnSettingsPopupTabSaveItem,
} from "@/components/datagrid/GridColumnSettingsPopup"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"
import { type GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { ReferenceLookup } from "@/components/lookup"
import { LookupPopupProvider } from "@/components/lookup/LookupPopupHost"
import { disableBuiltInPopupEscape, usePopupEscapeLayer } from "@/components/popup/popupEscapeStack"
import { LanguageContext } from "@/lib/i18nLoader"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import { isForeignCurrencyCode } from "@/lib/currency"
import { getSequenceSubmitCode, getVoucherSequencePreviewCode } from "@/lib/codeSequence"
import { createShortcutBindings, type ShortcutHandler } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS, type ShortcutActionCode } from "@/lib/shortcuts/shortcutDefinitions"
import { createPopupShortcutWrapperAttr, isPopupShortcutScopeTopMost, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useStateRef from "@/hooks/useStateRef"
import type { ChitInfo, ChitType, InventoryBomSnapshot, InventoryInputLine, InventoryOutputLine, InventoryVoucher } from "@/types/voucher"
import type { CustomerExt } from "@/types/customerExt"
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
  calculateInventoryIssueAmount,
  createDefaultInventoryOutputLine,
  calculateInventoryRevenueAmount,
  ensureInventoryDefaultLine,
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
import InventoryBomAllocationPopup from "./InventoryBomAllocationPopup"

interface InventoryEditorPopupProps {
  visible: boolean
  value: InventoryVoucher
  chitType: InventoryVoucherType
  voucherLabel: string
  isUpdate: boolean
  loading: boolean
  readOnly?: boolean
  lockAccountingReference?: boolean
  onClose: () => void
  onDeleted?: () => void
  onOpenLinkedAccountingVoucher?: (chitType: ChitType, chitId: number) => boolean
  onOpenLinkedCogsVoucher: (chitId: number) => boolean
  onSave: (record: InventoryVoucher) => Promise<void>
  onSaveAndNew?: (record: InventoryVoucher) => Promise<void>
  onCopy?: (record: InventoryVoucher) => void
  printReportCode?: string | null
  initialIssueTab?: "output" | "cogs"
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
  loading: externalLoading,
  readOnly = false,
  lockAccountingReference = false,
  onClose,
  onDeleted,
  onOpenLinkedAccountingVoucher,
  onOpenLinkedCogsVoucher,
  onSave,
  onSaveAndNew,
  onCopy,
  printReportCode,
  initialIssueTab = "output",
}: InventoryEditorPopupProps) {
  const [deleting, setDeleting] = useState(false)
  const loading = externalLoading || deleting
  const [draft, setDraft, draftRef] = useStateRef<InventoryVoucher>(() => ensureInventoryDefaultLine({
    ...value,
    IS_COGS: Boolean(value.IS_COGS || value.COGS),
  }))
  const inputGridRef = useRef<ChitInventoryInputGridPopupHandle | null>(null)
  const outputGridRef = useRef<ChitInventoryOutputGridPopupHandle | null>(null)
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
  // Xuất NVL theo định mức belongs to the OT material-issue workflow only.
  // This popup is reused by ordinary inventory/issue and other accounting screens.
  const showBomAllocation = chitType === "IO" && location.pathname.endsWith("/cost/issue-material")
  const activeLines = chitType === "IR" ? draft.INPUTS : draft.OUTPUTS
  // Revenue is always sourced from the Xuất kho detail, independent of the
  // Giá vốn tab and IS_COGS checkbox. Keep the read-only Info field live.
  const infoFormData = useMemo(() => chitType === "IO"
    ? { ...draft, REVENUE_AMOUNT: calculateInventoryRevenueAmount(draft.OUTPUTS) }
    : draft, [chitType, draft])
  const foreignCurrencyColumnsVisible = useMemo(() => hasForeignCurrencyRows(activeLines), [activeLines])
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsTabs, setColumnSettingsTabs] = useState<GridColumnSettingsPopupTab[]>([])
  const [activeInventoryIssueTab, setActiveInventoryIssueTab] = useState<"output" | "cogs">("output")
  const [bomVisible, setBomVisible] = useState(false)
  const [bomSnapshot, setBomSnapshot] = useState<InventoryBomSnapshot | null>(null)
  const [bomLoading, setBomLoading] = useState(false)
  const isInputVoucher = chitType === "IR"
  const isAdjustmentVoucher = chitType === "IA"
  const isCogsTab = chitType === "IO" && Boolean(draft.IS_COGS) && activeInventoryIssueTab === "cogs"
  const activeGridId = isInputVoucher
    ? "inventory-input-editor-grid"
    : isAdjustmentVoucher
      ? "inventory-adjustment-editor-grid"
      : isCogsTab
        ? "inventory-cogs-editor-grid"
        : "inventory-output-editor-grid"
  const activeGridRef = isInputVoucher ? inputGridRef : outputGridRef
  const activeColumnSettingStateRef = isInputVoucher ? inputColumnSettingStateRef : outputColumnSettingStateRef

  const { sysCodeMap, getCodeName } = useSysCodes()
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
  const [linkedCogsSourceId, setLinkedCogsSourceId] = useState<number | null>(null)
  const [linkedCogsVoucherNo, setLinkedCogsVoucherNo] = useState("")
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
            : isCogsTab
              ? t("INVENTORY_COGS", "Giá vốn")
              : t("INVENTORY_OUTPUT", "Inventory Output"),
        items,
        loading,
      },
    ],
    [activeGridId, isAdjustmentVoucher, isInputVoucher, isCogsTab, t],
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
        const hasSourceCustomer = Number(freeDetail.CUSTOMER_ID ?? 0) > 0 || Boolean(freeDetail.CUSTOMER_CD)
        setDraft((current) => {
          if (chitType === "IR") {
            const nextInputs = applyAccountingDetailToInventoryLines(
              syncedInputs,
              freeDetail.CHITDETAIL_ID,
              freeDetail.CHITDETAIL_CD,
            )
            return {
              ...current,
              ...(hasSourceCustomer
                ? { CUSTOMER_ID: freeDetail.CUSTOMER_ID, CUSTOMER_CD: freeDetail.CUSTOMER_CD }
                : {}),
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
            ...(hasSourceCustomer
              ? { CUSTOMER_ID: freeDetail.CUSTOMER_ID, CUSTOMER_CD: freeDetail.CUSTOMER_CD }
              : {}),
            INPUTS: [],
            OUTPUTS: nextOutputs,
            AMOUNT: calculateInventoryIssueAmount(nextOutputs),
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
          AMOUNT: calculateInventoryIssueAmount(nextOutputs),
        }
      }

      return current
    })
  }, [chitType, setDraft])

  const handleClearCogsLink = useCallback(async () => {
    if (!linkedCogsSourceId || loading || readOnly) {
      return
    }

    const confirmed = await confirm(
      t("CONFIRM_REMOVE_INVENTORY_COGS_DETAIL_LINK", "Bỏ liên kết với detail giá vốn khi lưu phiếu xuất kho. Detail do phiếu kho tự tạo sẽ được xóa; detail OT có sẵn được giữ lại. Bạn có muốn tiếp tục?"),
      t("CONFIRM", "Xác nhận"),
    )
    if (!confirmed) {
      return
    }

    setDraft((current) => ({
      ...current,
      IS_COGS: false,
      COGS: null,
      CHITDETAIL_ID_COGS: null,
      COGS_AMOUNT: null,
      CLEAR_COGS_LINK: true,
      AMOUNT: calculateInventoryIssueAmount(current.OUTPUTS),
    }))
    setLinkedCogsSourceId(null)
    setLinkedCogsVoucherNo("")
    notify(t("INVENTORY_COGS_UNLINK_PENDING", "Đã chọn bỏ liên kết giá vốn. Lưu phiếu xuất kho để hoàn tất."), "info", 3000)
  }, [linkedCogsSourceId, loading, readOnly, setDraft, t])

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
      setBomVisible(false)
    }
  }, [resetPreviewChitNo, visible])

  useEffect(() => {
    if (prevSyncValueRef.current === value) {
      return
    }

    prevSyncValueRef.current = value
    setDraft(ensureInventoryDefaultLine({
      ...value,
      IS_COGS: Boolean(value.IS_COGS || value.COGS),
    }))
    setSelectedAccountingSourceId(null)
    setLinkedAccountingChitNo("")
    setLinkedAccountingChitType("")
    setLinkedCogsSourceId(null)
    setLinkedCogsVoucherNo("")
    setBomSnapshot(null)
    setBomVisible(false)
    resetPreviewChitNo()
  }, [resetPreviewChitNo, setDraft, value])

  useEffect(() => {
    if (visible) {
      setActiveInventoryIssueTab(initialIssueTab === "cogs" && draft.IS_COGS ? "cogs" : "output")
    }
  }, [draft.IS_COGS, initialIssueTab, value.CHIT_ID, visible])

  const linkedAccountingDetailId = useMemo(
    () => getLinkedChitDetailIdFromInventoryDraft(draft, chitType),
    [chitType, draft.INPUTS, draft.OUTPUTS],
  )
  const hasBomAllocationData = useMemo(() => {
    const snapshot = draft.BOM ?? bomSnapshot
    if ((snapshot?.FINISHED?.length ?? 0) > 0 || (snapshot?.MATERIALS?.length ?? 0) > 0) {
      return true
    }
    return draft.OUTPUTS.some(
      (row) => !row.ISDEL && String(row.SUMMARY ?? "").trim().toUpperCase() === "BOM",
    )
  }, [bomSnapshot, draft.BOM, draft.OUTPUTS])
  const linkedCogsDetailId = useMemo(() => {
    if (chitType !== "IO") {
      return 0
    }

    return draft.CHITDETAIL_ID_COGS ?? draft.COGS?.DETAILS[0]?.CHITDETAIL_ID ?? 0
  }, [chitType, draft.CHITDETAIL_ID_COGS, draft.COGS])

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
    if (!visible || chitType !== "IO") {
      setLinkedCogsSourceId(null)
      setLinkedCogsVoucherNo("")
      return
    }

    const cogsHeaderId = Number(draft.COGS?.CHIT_ID ?? 0)
    if (cogsHeaderId > 0) {
      setLinkedCogsSourceId(cogsHeaderId)
      setLinkedCogsVoucherNo(String(draft.COGS?.CHIT_NO ?? draft.COGS?.CHIT_CD ?? "").trim())
      return
    }

    if (!(Number(linkedCogsDetailId) > 0)) {
      setLinkedCogsSourceId(null)
      setLinkedCogsVoucherNo("")
      return
    }

    let cancelled = false
    void getInventorySourceVoucher(Number(linkedCogsDetailId))
      .then(async (sourceVoucher) => {
        if (cancelled || !sourceVoucher || String(sourceVoucher.CHIT_TYPE ?? "").trim().toUpperCase() !== "OT") {
          if (!cancelled) {
            setLinkedCogsSourceId(null)
            setLinkedCogsVoucherNo("")
          }
          return
        }

        const sourceId = Number(sourceVoucher.CHIT_ID ?? 0) || null
        setLinkedCogsSourceId(sourceId)
        setLinkedCogsVoucherNo(String(sourceVoucher.CHIT_CD ?? "").trim())
        if (!sourceId) {
          return
        }

        try {
          const response = await getChits("AR", "OT", { chitId: sourceId, pageSize: 1 })
          if (cancelled) {
            return
          }
          const row = normalizeChitRows(response.data ?? [], "OT")[0]
          const chitNo = String(row?.CHIT_NO ?? "").trim()
          if (chitNo) {
            setLinkedCogsVoucherNo(chitNo)
          }
        } catch {
          // Keep CHIT_CD as the display fallback.
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setLinkedCogsSourceId(null)
          setLinkedCogsVoucherNo("")
          console.error("Load linked cost voucher failed", error)
        }
      })

    return () => {
      cancelled = true
    }
  }, [chitType, draft.COGS?.CHIT_CD, draft.COGS?.CHIT_ID, draft.COGS?.CHIT_NO, linkedCogsDetailId, visible])

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

    if (event.dataField === "IS_COGS" && chitType === "IO") {
      const enabled = event.value === true || event.value === "1"

      if (!enabled && (draftRef.current.COGS || draftRef.current.CHITDETAIL_ID_COGS)) {
        setDraft((current) => ({ ...current, IS_COGS: true }))
        return
      }
      setDraft((current) => ({
        ...current,
        IS_COGS: enabled,
        AMOUNT: calculateInventoryIssueAmount(current.OUTPUTS),
      }))
      return
    }

    setDraft((current) => ({
      ...current,
      [event.dataField as keyof InventoryVoucher]: event.value,
    }))
  }, [chitType, draftRef, setDraft])

  const handleInputsChange = useCallback((rows: InventoryInputLine[]) => {
    setDraft((current) => ({
      ...current,
      INPUTS: rows,
      OUTPUTS: [],
      AMOUNT: calculateInventoryAmount(rows),
    }))
  }, [])

  const handleOutputsChange = useCallback((rows: InventoryOutputLine[]) => {
    setDraft((current) => ({
      ...current,
      INPUTS: chitType === "IA" ? current.INPUTS : [],
      OUTPUTS: rows,
      AMOUNT: chitType === "IO"
        ? calculateInventoryIssueAmount(rows)
        : calculateInventoryAmount(rows),
    }))
  }, [chitType])

  // The BOM grids are an immutable calculation snapshot; IO remains the posting
  // source. Correlate with ROW_KEY until OUTPUT_ID is assigned inside the DB transaction.
  // Get inventory returns BOM: null (not hydrated); only GetBomSnapshot has saved rows.
  const handleOpenBom = useCallback(async () => {
    if (!showBomAllocation || loading || bomLoading) return
    setBomLoading(true)
    try {
      const rows = await outputGridRef.current?.savePendingChanges()
      if (rows) handleOutputsChange(rows)
      const draftBom = draftRef.current.BOM
      const chitId = Number(draftRef.current.CHIT_ID)
      const snapshot = draftBom != null
        ? draftBom
        : chitId > 0
          ? await getInventoryBomSnapshot(chitId)
          : null
      // Keep draft in sync so reopen / save reuse the loaded snapshot.
      if (snapshot != null && draftRef.current.BOM == null) {
        setDraft(current => ({ ...current, BOM: snapshot }))
      }
      setBomSnapshot(snapshot)
      setBomVisible(true)
    } catch (error) {
      notify(getApiErrorMessage(error, t("BOM_OPEN_FAILED", "Không mở được bảng phân bổ NVL")), "error", 4000)
    } finally { setBomLoading(false) }
  }, [bomLoading, showBomAllocation, draftRef, handleOutputsChange, loading, setDraft, t])

  const handleConfirmBom = useCallback((snapshot: InventoryBomSnapshot) => {
    const previous = draftRef.current
    const oldOutputIds = new Set(((previous.BOM ?? bomSnapshot)?.MATERIALS ?? [])
      .map(row => Number(row.OUTPUT_ID)).filter(id => id > 0))
    const oldOutputKeys = new Set(((previous.BOM ?? bomSnapshot)?.MATERIALS ?? [])
      .map(row => row.OUTPUT_CLIENT_KEY).filter(Boolean))
    // Keep the current accounting link: BOM regenerates IO lines from defaults
    // (CHITDETAIL_ID null), so without re-stamping the "Đã liên kết" badge vanishes.
    const linkedDetailId = getLinkedChitDetailIdFromInventoryDraft(previous, "IO")
    const linkedDetailCd = linkedDetailId > 0
      ? String(
        previous.OUTPUTS.find((row) => !row.ISDEL && Number(row.CHITDETAIL_ID ?? 0) === linkedDetailId)
          ?.CHITDETAIL_CD ?? "",
      ).trim()
      : ""
    // A saved BOM's output is replaced, never silently added twice. Manual IO
    // lines are preserved; accounting link is re-applied to the final set below.
    const retained = previous.OUTPUTS.filter(row =>
      !oldOutputIds.has(Number(row.OUTPUT_ID)) && !oldOutputKeys.has(row.ROW_KEY)
      && (row.ISDEL || Number(row.PRODUCT_ID) > 0),
    )
    const generated: InventoryOutputLine[] = []
    const nextMaterials = snapshot.MATERIALS.map(item => {
      if (!(Number(item.CONFIRMED_QUANTITY) > 0)) {
        return { ...item, OUTPUT_ID: null, OUTPUT_CLIENT_KEY: "" }
      }
      const line: InventoryOutputLine = {
        ...createDefaultInventoryOutputLine(previous.COMPANY_CD, previous.CHIT_YMD, retained.length + generated.length + 1),
        PRODUCT_ID: item.MATERIAL_PRODUCT_ID,
        PRODUCT_CD: String(item.MATERIAL_PRODUCT_CD ?? ""),
        PRODUCT_NM_VIET: String(item.MATERIAL_PRODUCT_NM ?? ""),
        STORE_ID: item.STORE_ID ?? null,
        STORE_CD: String(item.STORE_CD ?? ""),
        STORE_NM_VIET: String(item.STORE_NM_VIET ?? ""),
        UNIT_ID: item.UNIT_ID ?? null,
        UNIT_CD: String(item.UNIT_CD ?? ""),
        QUANTITY: Number(item.CONFIRMED_QUANTITY),
        SUMMARY: "BOM",
      }
      generated.push(line)
      return { ...item, OUTPUT_ID: null, OUTPUT_CLIENT_KEY: line.ROW_KEY }
    })
    const nextBom: InventoryBomSnapshot = { FINISHED: snapshot.FINISHED, MATERIALS: nextMaterials }
    const mergedOutputs = [...retained, ...generated].map((row, index) => ({ ...row, SORT: index + 1 }))
    const outputs = linkedDetailId > 0
      ? applyAccountingDetailToInventoryLines(mergedOutputs, linkedDetailId, linkedDetailCd)
      : mergedOutputs
    setDraft(current => ({
      ...current,
      OUTPUTS: outputs,
      BOM: nextBom,
      AMOUNT: calculateInventoryIssueAmount(outputs),
    }))
    setBomSnapshot(nextBom)
    setBomVisible(false)
    notify(t("BOM_APPLIED", "Đã chuyển nguyên vật liệu vào lưới IO. Lưu phiếu để ghi database."), "success", 3500)
  }, [bomSnapshot, draftRef, setDraft, t])

  const syncGridRows = useCallback(async () => {
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
        const nextDraft = {
          ...draftRef.current,
          INPUTS: [],
          OUTPUTS: rows,
          AMOUNT: calculateInventoryIssueAmount(rows),
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
    if (readOnly || loading) return
    try {
      const record = await syncGridRows()
      await onSave(prepareRecordForSave(record))
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
    }
  }, [draftRef, onSave, prepareRecordForSave, syncGridRows, t, readOnly, loading])

  const handleSaveAndNew = useCallback(async () => {
    if (!onSaveAndNew || readOnly || loading) {
      return
    }

    try {
      const record = await syncGridRows()
      await onSaveAndNew(prepareRecordForSave(record))
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
    }
  }, [onSaveAndNew, prepareRecordForSave, syncGridRows, t, readOnly, loading])

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

  usePopupEscapeLayer(
    visible,
    () => { if (!loading) onClose() },
    () => document.querySelector<HTMLElement>(`[data-popup-shortcut-scope="${popupShortcutScopeId}"]`),
  )

  const shortcutBindings = useMemo(() => {
    const builtInHandlers: Partial<Record<ShortcutActionCode, ShortcutHandler>> = {
      [SHORTCUT_ACTIONS.SAVE]: () => {
        void handleSave()
      },
      [SHORTCUT_ACTIONS.SAVE_AND_NEW]: () => {
        void handleSaveAndNew()
      },
      [SHORTCUT_ACTIONS.CLOSE]: () => {
        if (!loading) onClose()
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
  }, [handlePrint, handleSave, handleSaveAndNew, onClose, loading])

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

    if (onOpenLinkedAccountingVoucher?.(linkedAccountingChitType, selectedAccountingSourceId)) {
      return
    }

    const route = getVoucherRouteByChitType(linkedAccountingChitType)
    if (!route) {
      return
    }

    const search = new URLSearchParams({ openChitId: String(selectedAccountingSourceId) })
    if (chitType === "IR" && Number(draft.CHIT_ID ?? 0) > 0) {
      search.set("returnPath", location.pathname)
      search.set("returnChitType", "IR")
      search.set("returnChitId", String(draft.CHIT_ID))
    }
    navigate({ pathname: route, search: `?${search.toString()}` }, {
      state: {
        openChitId: selectedAccountingSourceId,
        openMode: "edit",
      },
    })
  }, [chitType, draft.CHIT_ID, linkedAccountingChitType, location.pathname, navigate, onOpenLinkedAccountingVoucher, selectedAccountingSourceId])

  const handleOpenLinkedCogsVoucher = useCallback(() => {
    if (!linkedCogsSourceId) {
      return
    }

    onOpenLinkedCogsVoucher(linkedCogsSourceId)
  }, [linkedCogsSourceId, onOpenLinkedCogsVoucher])

  const accountingLinkSlot = useMemo(() => {
    const cogsCodeName = getCodeName("CHIT_TYPE", "OT")
    const cogsTypeName = cogsCodeName ? t(cogsCodeName, cogsCodeName) : ""
    const cogsDisplayNo = linkedCogsVoucherNo || String(linkedCogsSourceId ?? "")
    const cogsLinkButton = linkedCogsSourceId ? (
      <div className="inline-flex max-w-full items-stretch overflow-hidden rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900">
        <button
          type="button"
          disabled={loading || linkingAccountingReference}
          aria-label={`${t("OPEN_COGS_VOUCHER", "Mở phiếu giá vốn")}${cogsDisplayNo ? ` · ${cogsDisplayNo}` : ""}`}
          title={`${t("OPEN_COGS_VOUCHER", "Mở phiếu giá vốn")}${cogsDisplayNo ? ` · ${cogsDisplayNo}` : ""}`}
          className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 text-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
          onClick={handleOpenLinkedCogsVoucher}
        >
          <span className="whitespace-nowrap font-medium">{t("LINKED", "Đã liên kết")}</span>
          <span className="truncate font-semibold">
            {cogsTypeName}{cogsTypeName && cogsDisplayNo ? " · " : ""}{cogsDisplayNo}
          </span>
        </button>
        {!readOnly ? (
          <button
            type="button"
            aria-label={`${t("CLEAR_REFERENCE", "Bỏ liên kết")}${cogsTypeName ? ` · ${cogsTypeName}` : ""}`}
            title={`${t("CLEAR_REFERENCE", "Bỏ liên kết")}${cogsTypeName ? ` · ${cogsTypeName}` : ""}`}
            disabled={loading || linkingAccountingReference || draft.COGS?.IS_LOCK === "1"}
            className="inline-flex min-w-10 items-center justify-center border-l border-emerald-200 px-3 text-2xl font-semibold leading-none text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
            onClick={handleClearCogsLink}
          >
            <span aria-hidden="true">×</span>
          </button>
        ) : null}
      </div>
    ) : null

    if (isAccountingLinked) {
      const displayNo = linkedAccountingChitNo || String(selectedAccountingSourceId ?? "")
      const accountingCodeName = linkedAccountingChitType
        ? getCodeName("CHIT_TYPE", linkedAccountingChitType)
        : ""
      const accountingTypeName = accountingCodeName ? t(accountingCodeName, accountingCodeName) : ""
      return (
        <>
          <div className="inline-flex max-w-full items-stretch overflow-hidden rounded-md border border-emerald-200 bg-emerald-50 text-emerald-900">
            <button
              type="button"
              disabled={loading || linkingAccountingReference}
              aria-label={`${t("OPEN_SOURCE_VOUCHER", "Mở chứng từ nguồn")}${displayNo ? ` · ${displayNo}` : ""}`}
              title={`${t("OPEN_SOURCE_VOUCHER", "Mở chứng từ nguồn")}${displayNo ? ` · ${displayNo}` : ""}`}
              className="inline-flex max-w-full items-center gap-1.5 px-2.5 py-1 text-sm hover:bg-emerald-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
              onClick={handleOpenLinkedAccountingVoucher}
            >
              <span className="whitespace-nowrap font-medium">{t("LINKED", "Đã liên kết")}</span>
              <span className="truncate font-semibold">
                {accountingTypeName}{accountingTypeName && displayNo ? " · " : ""}{displayNo}
              </span>
            </button>
            {!lockAccountingReference && !readOnly ? (
              <button
                type="button"
                aria-label={`${t("CLEAR_REFERENCE", "Bỏ liên kết")} · ${displayNo}`}
                title={`${t("CLEAR_REFERENCE", "Bỏ liên kết")} · ${displayNo}`}
                className="inline-flex min-w-10 items-center justify-center border-l border-emerald-200 px-3 text-2xl font-semibold leading-none text-red-600 hover:bg-red-50 hover:text-red-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-red-500 disabled:cursor-not-allowed disabled:opacity-50"
                disabled={loading || linkingAccountingReference}
                onClick={handleClearAccountingReference}
              >
                <span aria-hidden="true">×</span>
              </button>
            ) : null}
          </div>
          {cogsLinkButton}
        </>
      )
    }

    if (!selectedAccountingReferenceOption || isAdjustmentVoucher) {
      return cogsLinkButton
    }

    if (lockAccountingReference || readOnly) {
      return cogsLinkButton
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
        {cogsLinkButton}
      </>
    )
  }, [
    accountingReferenceOptions,
    draft.COGS?.IS_LOCK,
    handleAccountingReferenceOptionClick,
    handleAccountingReferenceSelected,
    handleClearAccountingReference,
    handleOpenLinkedCogsVoucher,
    handleClearCogsLink,
    handleOpenLinkedAccountingVoucher,
    isAccountingLinked,
    isAdjustmentVoucher,
    linkedCogsSourceId,
    linkedCogsVoucherNo,
    linkedAccountingChitNo,
    linkedAccountingChitType,
    linkingAccountingReference,
    loading,
    lockAccountingReference,
    readOnly,
    selectedAccountingReferenceOption,
    selectedAccountingSourceId,
    getCodeName,
    t,
  ])

  useEffect(() => {
    if (!visible || chitType !== "IO") {
      return
    }


  }, [chitType, draft.CHIT_ID, draft.COGS?.CHIT_ID, draft.IS_COGS, linkedCogsDetailId, linkedCogsSourceId, visible])

  const popupTitle = useMemo(() => {
    const actionLabel = isUpdate ? t("lblEdit", "Sửa") : t("lblAddNew", "Thêm mới")
    return `${actionLabel} ${voucherLabel}`
  }, [isUpdate, t, voucherLabel])

  const handleSelectIssueTab = useCallback(async (nextTab: "output" | "cogs") => {
    if (nextTab === activeInventoryIssueTab || loading) return
    try {
      // Batch-mode changes must be committed to the shared OUTPUTS draft before switching money families.
      const rows = await outputGridRef.current?.savePendingChanges()
      if (rows) handleOutputsChange(rows)
      setActiveInventoryIssueTab(nextTab)
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Không thể cập nhật chi tiết xuất kho")), "error", 3000)
    }
  }, [activeInventoryIssueTab, handleOutputsChange, loading, t])

  const inventoryTabItems = [
    { id: "output" as const, text: t("INVENTORY_OUTPUT", "Xuất kho") },
    ...(draft.IS_COGS
      ? [{ id: "cogs" as const, text: t("INVENTORY_COGS", "Giá vốn") }]
      : []),
  ]

  const inventoryTabs = chitType === "IO" && (
    <div className="flex shrink-0 justify-start">
      <Tabs
        className="inventory-issue-tabs"
        width="auto"
        scrollingEnabled={false}
        items={inventoryTabItems}
        keyExpr="id"
        selectedIndex={inventoryTabItems.findIndex((item) => item.id === activeInventoryIssueTab)}
        onItemClick={(event) => {
          if (event.itemData?.id === "output" || event.itemData?.id === "cogs") {
            void handleSelectIssueTab(event.itemData.id)
          }
        }}
      />
    </div>
  )

  const useRightVoucherFields = chitType === "IR" || chitType === "IO"

  const customerHeaderField = (
    <Item
      dataField="CUSTOMER_ID"
      label={{ text: t("CUSTOMER_CD", "Customer") }}
      render={({ component }) => (
        <MasterLookupFormField<CustomerExt>
          form={component}
          dataField="CUSTOMER_ID"
          dataSource={customerLookupStore}
          valueExpr="CUSTOMER_ID"
          getValue={(item) => item.CUSTOMER_ID}
          onApplyItem={(item) => component.updateData("CUSTOMER_CD", item.CUSTOMER_CD ?? "")}
          onClear={() => component.updateData("CUSTOMER_CD", "")}
          displayExpr={(item) => {
            if (!item) return ""
            const code = String(item.CUSTOMER_CD ?? "").trim()
            const name = getCustomerLookupName(item, `CUSTOMER_NM_${getCurrentDataLanguageSuffix()}`)
            return code && name ? `${code} - ${name}` : code || name
          }}
          placeholder={t("SELECT", "Select")}
          popupTitle={t("CUSTOMER_LIST", "Customers")}
          buttonHint={t("SEARCH", "Open customer list")}
          searchExpr={buildCustomerLookupSearchExpr(`CUSTOMER_NM_${getCurrentDataLanguageSuffix()}`)}
          renderPopupContent={({ closePopup, onPick }) =>
            renderSharedCustomerLookupPage({ closePopup, onPick })
          }
        />
      )}
    />
  )

  return (
    <Popup
      visible={visible}
      onShown={(event) => {
        disableBuiltInPopupEscape(event.component)

      }}
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
      wrapperAttr={{ class: `inventory-editor-popup am-dx-popup-title editor-mode--${isUpdate ? "edit" : "add"}`, ...createPopupShortcutWrapperAttr(popupShortcutScopeId) }}
      animation={POPUP_FADE_ANIMATION}
      onHiding={(event) => {
        if (loading) { event.cancel = true; return }
        onClose()
      }}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        render={() => (
          <div className="am-dx-title-actions inventory-editor-title-actions">
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
        <div className="relative flex h-full flex-col overflow-hidden bg-[#f3f4f6]">
          <div className="inventory-voucher-fields-panel flex-shrink-0 px-4 pt-3 pb-3">
            <Form formData={infoFormData} readOnly={readOnly} labelLocation="top" colCount={3} onFieldDataChanged={handleFieldDataChanged}>
              <Item
                dataField="AMOUNT"
                editorType="dxNumberBox"
                label={{ text: t("AMOUNT", "Amount") }}
                editorOptions={createVoucherEditorOptions({ readOnly: true, format: "#,##0.00" })}
              />
              {chitType === "IO" ? (
                <Item
                  dataField="REVENUE_AMOUNT"
                  editorType="dxNumberBox"
                  label={{ text: t("REVENUE_AMOUNT", "Tổng doanh thu") }}
                  editorOptions={createVoucherEditorOptions({ readOnly: true, format: "#,##0.00" })}
                />
              ) : null}
              <Item
                dataField="PAYER_INFO"
                editorType="dxTextBox"
                label={{ text: t("PAYER_INFO", "Payer") }}
                editorOptions={createVoucherEditorOptions()}
              />
              {!useRightVoucherFields ? customerHeaderField : null}
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
                dataField="NOTE"
                colSpan={2}
                editorType="dxTextBox"
                label={{ text: t("NOTE", "Note") }}
                editorOptions={createVoucherEditorOptions()}
              />
              <Item
                dataField="CHIT_YMD"
                editorType="dxDateBox"
                label={{ text: t("CHIT_YMD", "Voucher Date") }}
                editorOptions={createVoucherDateBoxEditorOptions({ validationMessageMode: "always" })}
              />
              {useRightVoucherFields ? customerHeaderField : null}
              {chitType === "IO" ? (
                <Item
                  dataField="IS_COGS"
                  editorType="dxCheckBox"
                  label={{ text: t("INVENTORY_IS_COGS", "Tính giá vốn") }}
                  editorOptions={createVoucherEditorOptions({ readOnly: Boolean(draft.COGS) })}
                />
              ) : null}
            </Form>
          </div>

          <div className="min-h-0 flex-1 px-4 pb-3">
            <div className="flex h-full min-h-0 flex-col bg-white p-3">
              <div className="flex h-full min-h-0 flex-col">
                {chitType === "IR" ? (
                  <ChitInventoryInputGridPopup
                    disabled={readOnly || loading}
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
                    disabled={readOnly || loading}
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
                    linkSlot={isAdjustmentVoucher ? undefined : (
                      <div className="flex flex-wrap items-center gap-2">
                        {accountingLinkSlot}
                        {showBomAllocation && !isCogsTab ? (
                          <Button
                            icon="formula"
                            stylingMode="outlined"
                            text={t("BOM_ALLOCATION", "Xuất NVL theo định mức")}
                            disabled={loading || bomLoading}
                            onClick={() => void handleOpenBom()}
                            elementAttr={{
                              class: hasBomAllocationData
                                ? "inventory-bom-allocation-btn inventory-bom-allocation-btn--filled"
                                : "inventory-bom-allocation-btn",
                            }}
                          />
                        ) : null}
                      </div>
                    )}
                    beforeGridSlot={inventoryTabs}
                    costMode={isCogsTab}
                    isCogsVoucher={Boolean(draft.IS_COGS)}
                    adjustmentMode={isAdjustmentVoucher}
                  />
                )}
              </div>
            </div>
          </div>

          <EditorActionToolbar mode={isUpdate ? "edit" : "add"}
            className="inventory-editor-footer border-t border-gray-200 bg-white px-2 py-1"
            accentSave
            busy={loading}
            leadingContent={!readOnly && isUpdate && Number(value.CHIT_ID) > 0 ? (
              <DeleteVoucherButton
                disabled={loading}
                voucherNo={value.CHIT_NO || String(value.CHIT_ID)}
                onDelete={() => deleteInventoryVoucher(getInventoryLedger(chitType), chitType, Number(value.CHIT_ID))}
                onDeleted={() => { onDeleted?.(); onClose() }}
                onBusyChange={setDeleting}
              />
            ) : null}
            actions={[
              { key: "copy", text: t("COPY", "Sao chép"), visible: !readOnly && Boolean(onCopy), onClick: async () => {
                try {
                  onCopy?.(await syncGridRows())
                } catch (error) {
                  notify(getApiErrorMessage(error, t("COPY_FAILED", "Không thể sao chép chứng từ")), "error", 4000)
                }
              } },
              { key: "save", text: t("SAVE", "Save"), visible: !readOnly, onClick: handleSave },
              { key: "saveAndNew", text: t("SAVE_AND_NEW", "Save and create new"), visible: !readOnly && Boolean(onSaveAndNew), onClick: handleSaveAndNew },
              { key: "print", text: t("PRINT", "Print"), visible: Boolean(printReportCode), onClick: handlePrint },
              { key: "close", text: t("CANCEL", "Cancel"), onClick: onClose },
            ]}
          />

          <LoadPanel visible={loading} shading={false} showIndicator />
        </div>
        {showBomAllocation ? (
          <InventoryBomAllocationPopup
            companyCd={draft.COMPANY_CD}
            visible={bomVisible}
            disabled={readOnly || loading}
            initial={bomSnapshot}
            onClose={() => setBomVisible(false)}
            onConfirm={handleConfirmBom}
          />
        ) : null}
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

