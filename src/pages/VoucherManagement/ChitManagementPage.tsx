import { downloadFile } from "@/lib/fileUtils"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate, type NavigateFunction } from "react-router-dom"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent, SelectionChangedEvent, RowDblClickEvent, OptionChangedEvent } from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import {
  createChit,
  deleteChit,
  exportChitExcel,
  getChits,
  updateChit,
} from "@/api/voucherApi"
import { clearSysCodeSequencePreviewCache } from "@/api/sysCodeSequenceApi"
import { getInventoryVouchers } from "@/api/inventoryVoucherApi"
import { getInventoryLinkStatus, getInventorySourceVoucher } from "@/api/inventoryLinkApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import DetailGrid from "@/components/datagrid/DetailGrid"
import GridColumnSettingsPopup, {
  type GridColumnSettingsPopupTab,
  type GridColumnSettingsPopupTabSaveItem,
} from "@/components/datagrid/GridColumnSettingsPopup"
import PageGrid from "@/components/datagrid/PageGrid"
import type { GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { isForeignCurrencyCode } from "@/lib/currency"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import LinkVouchersPreviewPopup from "@/pages/Inventory/components/LinkVouchersPreviewPopup"
import {
  buildInventoryAccountingReferenceOptions,
  INVENTORY_LINK_SOURCE_CODE_TYPE,
} from "@/pages/VoucherManagement/components/chitEditorConstants"
import { useSysCodes } from "@/lib/sysCodeContext"
import {
  applyInventoryAccountingLinkPair,
  getAccountingReferenceOptionForChitType,
  getInventoryLedgerForInventoryType,
  getInventoryTypeForAccountingChitType,
  isLinkableAccountingChitType,
  loadFreeAccountingDetailsInDateRange,
  loadUnlinkedInventoryCandidates,
  type LinkAmountCandidate,
  type LinkAmountPair,
  type LinkDetailCandidate,
} from "@/pages/Inventory/inventoryAccountingLinkUtils"
import {
  DEFAULT_PAGE_SIZE,
  SERVER_PAGING_REMOTE_OPERATIONS,
  createMirrorPagedStore,
  resolvePageNumber,
  resolvePageSize,
  syncMirroredGridPage,
} from "@/lib/paging"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"
import type {
  ChitInfo,
  ChitDetail,
  ChitLedger,
  ChitType,
  InventoryLinkStatus,
  VoucherCreateFromSourceState,
  VoucherOpenLocationState,
  VoucherSourceInventoryAction,
} from "@/types/voucher"
import {
  calculateChitAmount,
  buildAccountingVoucherFromInventorySource,
  cloneChit,
  cloneChitDetail,
  createDefaultChit,
  createDefaultChitDetail,
  isPeriodLockVoucher,
  createRowKey,
  getChitTypeLabel,
  getVoucherDetailGridId,
  getVoucherMasterGridId,
  getVoucherRouteByChitType,
  isInventoryInputLinkedAccountingVoucherType,
  isInventoryOutputLinkedAccountingVoucherType,
  mapChitToApiPayload,
  mapInventoryVoucherToSourceChitInfo,
  normalizeChitRows,
} from "./chitUtils"
import { normalizeInventoryVoucherApi } from "@/pages/Inventory/inventoryVoucherModel"
import ChitColumns from "./components/ChitColumns"
import { useChitNoteDetailColumns } from "./components/ChitDetailColumns"
import ChitEditorPopup from "./components/ChitEditorPopup"
import { createVoucherImportConfig } from "./voucherImportConfig"
import { getVoucherPdfReportCode } from "./voucherPdfReportCodes"
import { useVoucherOpenChitIdRoute } from "./hooks/useVoucherOpenChitIdRoute"
import { loadVoucherForDirectOpen } from "./voucherDirectOpen"
import { LoadPanel } from "devextreme-react/cjs/load-panel"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import { useChitListInvalidate, useChitListQuery } from "@/hooks/queries/useChitListQuery"

interface ChitManagementPageProps {
  ledger: ChitLedger
  chitType: ChitType
  titleFallback?: string
  titleKey?: string
}

type DetailGridRow = ChitDetail

const voucherColumnSettingExcludedColumnNames = ["AMOUNT", "FC_AMOUNT", "FC_RATE"] as const

const formatDateToYmd = (value: Date | null): string | undefined => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return undefined
  }

  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")

  return `${year}${month}${day}`
}

function hasVoucherForeignCurrencyRows(rows: readonly DetailGridRow[]): boolean {
  return rows.some((row) => isForeignCurrencyCode((row as Partial<ChitDetail>).FC_TYPE))
}

function getCreateFromSourceTargetAction(chitType: ChitType): VoucherSourceInventoryAction | null {
  if (chitType === "IR") return "inventory_input"
  if (chitType === "IO") return "inventory_output"
  if (chitType === "PO") return "create_purchase_voucher"
  if (chitType === "PD") return "create_purchase_discount_voucher"
  if (chitType === "PR") return "create_purchase_return_voucher"
  if (chitType === "SO") return "create_sales_voucher"
  if (chitType === "SD") return "create_sales_discount_voucher"
  if (chitType === "SR") return "create_sales_return_voucher"
  return null
}

function getSourceLedgerByChitType(chitType: ChitType): ChitLedger | null {
  if (chitType === "PO" || chitType === "PD" || chitType === "PR" || chitType === "IR") {
    return "AP"
  }

  if (chitType === "SO" || chitType === "SD" || chitType === "SR" || chitType === "IO") {
    return "AR"
  }

  return null
}

function loadCreateFromSourceState(stateKey: string): VoucherCreateFromSourceState | null {
  try {
    const raw = window.localStorage.getItem(stateKey)
    if (!raw) {
      return null
    }

    return JSON.parse(raw) as VoucherCreateFromSourceState
  } catch {
    return null
  }
}

function removeCreateFromSourceState(stateKey: string): void {
  try {
    window.localStorage.removeItem(stateKey)
  } catch {
  }
}

function getLinkedTargetVoucherDetailId(source: ChitInfo): number {
  for (const detail of source.DETAILS ?? []) {
    for (const line of detail.INVENTORY_INPUTS ?? []) {
      const detailId = Number(line.CHITDETAIL_ID ?? 0)
      if (detailId > 0 && String(line.CHITDETAIL_CD ?? "").trim().length > 0) {
        return detailId
      }
    }

    for (const line of detail.INVENTORY_OUTPUTS ?? []) {
      const detailId = Number(line.CHITDETAIL_ID ?? 0)
      if (detailId > 0 && String(line.CHITDETAIL_CD ?? "").trim().length > 0) {
        return detailId
      }
    }
  }

  return 0
}

function buildDraftFromSourceVoucher(
  sourceVoucher: ChitInfo,
  targetChitType: ChitType,
  companyCd: string,
  linkedChitDetailIds?: number[] | null,
): ChitInfo {
  return buildAccountingVoucherFromInventorySource(sourceVoucher, targetChitType, companyCd, linkedChitDetailIds)
}

function hasDraftSourceLines(draft: ChitInfo, targetChitType: ChitType): boolean {
  if (targetChitType === "IR" || isInventoryInputLinkedAccountingVoucherType(targetChitType)) {
    return draft.DETAILS.some((detail) => detail.INVENTORY_INPUTS.some((line) => !line.ISDEL))
  }

  if (targetChitType === "IO" || isInventoryOutputLinkedAccountingVoucherType(targetChitType)) {
    return draft.DETAILS.some((detail) => detail.INVENTORY_OUTPUTS.some((line) => !line.ISDEL))
  }

  return draft.DETAILS.length > 0
}

type LinkedVoucherOpenTarget = {
  chitId: number
  chitType: ChitType
  route: string
}

function isInventoryOnlySourceChitType(chitType: ChitType): boolean {
  return chitType === "IR" || chitType === "IO" || chitType === "IA"
}

async function loadSourceVoucherById(
  ledger: ChitLedger,
  chitType: ChitType,
  chitId: number,
): Promise<ChitInfo | null> {
  if (chitId <= 0) {
    return null
  }

  if (isInventoryOnlySourceChitType(chitType)) {
    const result = await getInventoryVouchers(ledger, chitType, {
      chitId,
      pageNumber: 1,
      pageSize: 1,
    })
    const freshVoucher = result.data
      .map((item) => normalizeInventoryVoucherApi(item, chitType, getCurrentCompanyCd()))[0]
    return freshVoucher ? mapInventoryVoucherToSourceChitInfo(freshVoucher) : null
  }

  const response = await getChits(ledger, chitType, {
    chitId,
    INCLUDE_DETAILS: true,
    pageNumber: 1,
    pageSize: 1,
  })
  return normalizeChitRows(response.data || [], chitType)[0] ?? null
}

async function loadCreateFromSourceVoucher(createFromSource: VoucherCreateFromSourceState): Promise<ChitInfo> {
  const sourceChitId = Number(createFromSource.sourceVoucher.CHIT_ID ?? 0)
  const freshVoucher = await loadSourceVoucherById(
    createFromSource.sourceLedger,
    createFromSource.sourceChitType,
    sourceChitId,
  )
  return freshVoucher ?? createFromSource.sourceVoucher
}

async function resolveLinkedVoucherOpenTarget(
  linkStatus: InventoryLinkStatus | null,
  sourceVoucher: ChitInfo,
  targetChitType: ChitType,
): Promise<LinkedVoucherOpenTarget | null> {
  const normalizedTarget = targetChitType.trim().toUpperCase()
  const linkedVouchers = linkStatus?.INVENTORY_VOUCHERS ?? []
  const matchedVoucher = linkedVouchers.find(
    (item) =>
      String(item.INVENTORY_CHIT_TYPE ?? "").trim().toUpperCase() === normalizedTarget
      && Number(item.INVENTORY_CHIT_ID ?? 0) > 0,
  ) ?? linkedVouchers.find((item) => Number(item.INVENTORY_CHIT_ID ?? 0) > 0)

  if (matchedVoucher) {
    const chitType = String(matchedVoucher.INVENTORY_CHIT_TYPE ?? "").trim().toUpperCase() as ChitType
    const chitId = Number(matchedVoucher.INVENTORY_CHIT_ID ?? 0)
    const route = getVoucherRouteByChitType(chitType)
    if (route && chitId > 0) {
      return { chitId, chitType, route }
    }
  }

  const fallbackDetailId = getLinkedTargetVoucherDetailId(sourceVoucher)
  if (fallbackDetailId <= 0) {
    return null
  }

  const linkedSourceVoucher = await getInventorySourceVoucher(fallbackDetailId)
  const chitId = Number(linkedSourceVoucher?.CHIT_ID ?? 0)
  const chitType = String(linkedSourceVoucher?.CHIT_TYPE ?? "").trim().toUpperCase() as ChitType
  const route = getVoucherRouteByChitType(chitType)
  if (chitId <= 0 || !route) {
    return null
  }

  return { chitId, chitType, route }
}

function openLinkedVoucherTarget(navigate: NavigateFunction, target: LinkedVoucherOpenTarget): void {

  navigate(
    {
      pathname: target.route,
      search: "",
    },
    {
      replace: true,
      state: {
        openChitId: target.chitId,
        openMode: "edit",
      } satisfies VoucherOpenLocationState,
    },
  )
}

export function ChitManagementPage({
  ledger,
  chitType,
  titleFallback,
  titleKey,
}: ChitManagementPageProps) {
  const gridRef = useRef<dxDataGrid<ChitInfo, string | number> | null>(null)
  const detailGridRef = useRef<dxDataGrid<DetailGridRow, string | number> | null>(null)
  const detailLoadSeqRef = useRef(0)
  const initialLoadTriggeredRef = useRef(false)
  const initialPagingEventsSuppressedRef = useRef(false)
  const handledRouteIntentRef = useRef("")
  const routeIntentRunSeqRef = useRef(0)
  const sourceCreateFromIntentRef = useRef<VoucherCreateFromSourceState | null>(null)
  const pendingRouteCleanupRef = useRef<{ clearNavigationState: boolean } | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const navigationState = location.state as VoucherOpenLocationState | null
  const [loading, setLoading] = useState(true)
  const [popupLoading, setPopupLoading] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)
  const [editorReadOnly, setEditorReadOnly] = useState(false)
  const [isUpdate, setIsUpdate] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsTabs, setColumnSettingsTabs] = useState<GridColumnSettingsPopupTab[]>([])
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [fromDate, setFromDate] = useState<Date | null>(today)
  const [toDate, setToDate] = useState<Date | null>(today)
  const rowsRef = useRef<ChitInfo[]>([])
  const totalRecordsRef = useRef(0)
  const selectedChitIdRef = useRef<number | null>(null)
  const [selectedRow, setSelectedRow] = useState<ChitInfo | null>(null)
  const [selectedRowDetails, setSelectedRowDetails] = useState<DetailGridRow[]>([])
  const [isMasterSearchActive, setIsMasterSearchActive] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [listQueryFromYmd, setListQueryFromYmd] = useState("")
  const [linkPopupVisible, setLinkPopupVisible] = useState(false)
  const [linkPopupLoading, setLinkPopupLoading] = useState(false)
  const [linkApplying, setLinkApplying] = useState(false)
  const [linkPairs, setLinkPairs] = useState<LinkAmountPair[]>([])
  const [linkInventoryCandidates, setLinkInventoryCandidates] = useState<LinkAmountCandidate[]>([])
  const [linkDetailCandidates, setLinkDetailCandidates] = useState<LinkDetailCandidate[]>([])
  const [linkOptionKey, setLinkOptionKey] = useState(chitType)
  const [linkFromDate, setLinkFromDate] = useState<Date | null>(today)
  const [linkToDate, setLinkToDate] = useState<Date | null>(today)
  const [listQueryToYmd, setListQueryToYmd] = useState("")
  const [listFetchEnabled, setListFetchEnabled] = useState(false)
  const [editingRow, setEditingRow] = useState<ChitInfo>(() => {
    const companyCd = getCurrentCompanyCd()
    const userId = getCurrentUserId()

    return createDefaultChit(chitType, companyCd, userId)
  })

  const { translate } = useContext(LanguageContext)
  const { sysCodeMap } = useSysCodes()

  const t = useCallback(
    (key: string, fallback: string) => translate(key, fallback),
    [translate],
  )

  const title = useMemo(() => {
    const defaultTitle = getChitTypeLabel(chitType, t)

    if (!titleKey && !titleFallback) {
      return defaultTitle
    }

    if (!titleKey) {
      return titleFallback ?? defaultTitle
    }

    return t(titleKey, titleFallback ?? defaultTitle)
  }, [chitType, t, titleFallback, titleKey])
  const screenCd = useMemo(() => location.pathname, [location.pathname])
  const masterGridId = useMemo(() => getVoucherMasterGridId(chitType), [chitType])
  const detailGridId = useMemo(() => getVoucherDetailGridId(chitType), [chitType])
  const pdfReportCode = useMemo(() => getVoucherPdfReportCode(chitType), [chitType])
  const importConfig = useMemo(() => {
    const baseConfig = createVoucherImportConfig(ledger, chitType, t)
    if (!baseConfig) {
      return null
    }

    const fileLabel = title.trim().replace(/\s+/g, "_").toLowerCase()
    if (!fileLabel) {
      return baseConfig
    }

    return {
      ...baseConfig,
      templateName: `${fileLabel}_template.xlsx`,
    }
  }, [chitType, ledger, t, title])
  const masterColumnSettingStateRef = useRef<GridColumnSettingState | null>(null)
  const detailColumnSettingStateRef = useRef<GridColumnSettingState | null>(null)
  const excelEnabled = importConfig !== null
  const detailGridKeyExpr = "CHITDETAIL_ID"
  const hasPendingRouteIntent = useMemo(() => {
    if (navigationState?.createFromSource != null) {
      return true
    }

    if (!location.search) {
      return false
    }

    const params = new URLSearchParams(location.search)
    const pendingQueryIntent = [
      "sourceChitId",
      "sourceAction",
      "sourceChitType",
      "sourceLedger",
      "createFromSourceStateKey",
    ].some((key) => params.has(key))

    if (pendingQueryIntent) {
    }

    return pendingQueryIntent
  }, [location.search, navigationState])
  const detailColumnsNode = useChitNoteDetailColumns()
  const detailGridRuntimeForeignCurrencyColumnsVisible = useMemo(
    () => hasVoucherForeignCurrencyRows(selectedRowDetails),
    [selectedRowDetails],
  )
  const detailGridRuntimeColumnVisibility = useMemo(
    () => ({
      forceVisibleColumnNames: ["AMOUNT"],
      controlledColumnVisibility: {
        FC_AMOUNT: detailGridRuntimeForeignCurrencyColumnsVisible,
        FC_RATE: detailGridRuntimeForeignCurrencyColumnsVisible,
      },
    }),
    [detailGridRuntimeForeignCurrencyColumnsVisible],
  )
  const detailGridExcludedColumnNames = useMemo(
    () => voucherColumnSettingExcludedColumnNames,
    [],
  )

  const loadSelectedRowDetails = useCallback(
    async (row: ChitInfo | null) => {
      const seq = detailLoadSeqRef.current + 1
      detailLoadSeqRef.current = seq

      if (!row) {
        setSelectedRowDetails([])
        return
      }

      if (seq === detailLoadSeqRef.current) {
        setSelectedRowDetails(row.DETAILS.map((item) => cloneChitDetail(item)))
      }
    },
    [],
  )

  const executeRouteCleanup = useCallback((clearNavigationState = false) => {
    if (clearNavigationState) {
      navigate(location.pathname, { replace: true, state: null })
      return
    }

    navigate(location.pathname, { replace: true })
  }, [location.pathname, navigate])

  const scheduleRouteCleanup = useCallback((clearNavigationState = false, waitForPopupVisible = false) => {
    if (waitForPopupVisible) {
      pendingRouteCleanupRef.current = { clearNavigationState }
      return
    }

    pendingRouteCleanupRef.current = null
    executeRouteCleanup(clearNavigationState)
  }, [executeRouteCleanup])

  const invalidateChits = useChitListInvalidate()
  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    isError: isListError,
    error: listError,
    refetch: refetchChits,
  } = useChitListQuery(
    {
      ledger,
      chitType,
      fromYmd: listQueryFromYmd,
      toYmd: listQueryToYmd,
      pageNumber,
      pageSize,
      includeDetails: true,
    },
    listFetchEnabled,
  )

  const dataSource = useMemo(
    () => createMirrorPagedStore<ChitInfo>(
      "CHIT_ID",
      () => rowsRef.current,
      () => totalRecordsRef.current,
    ),
    [],
  )

  const applyListQuery = useCallback(
    (
      fromParam: Date | null,
      toParam: Date | null,
      targetPage = pageNumber,
      targetPageSize = pageSize,
    ) => {
      const fromYmd = formatDateToYmd(fromParam) ?? ""
      const toYmd = formatDateToYmd(toParam) ?? ""
      const resolvedPageNumber = resolvePageNumber(targetPage)
      const resolvedPageSize = resolvePageSize(targetPageSize)

      if (fromYmd && toYmd && fromYmd > toYmd) {
        notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
        rowsRef.current = []
        totalRecordsRef.current = 0
        gridRef.current?.clearSelection()
        selectedChitIdRef.current = null
        setSelectedRow(null)
        setSelectedRowDetails([])
        setPageNumber(1)
        setListFetchEnabled(false)
        syncMirroredGridPage(gridRef.current, 1, initialPagingEventsSuppressedRef)
        return false
      }

      setListQueryFromYmd(fromYmd)
      setListQueryToYmd(toYmd)
      setPageNumber(resolvedPageNumber)
      setPageSize(resolvedPageSize)
      setListFetchEnabled(true)
      return true
    },
    [pageNumber, pageSize, t],
  )

  const loadData = useCallback(
    (fromParam: Date | null, toParam: Date | null, targetPage = pageNumber, targetPageSize = pageSize) => {
      applyListQuery(fromParam, toParam, targetPage, targetPageSize)
    },
    [applyListQuery, pageNumber, pageSize],
  )

  useEffect(() => {
    if (!listFetchEnabled) {
      return
    }

    setLoading(isListLoading || isListFetching)
  }, [isListFetching, isListLoading, listFetchEnabled])

  useEffect(() => {
    if (!isListError || !listError) {
      return
    }

    console.error("Failed to load chit notes", listError)
    notify(getApiErrorMessage(listError, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
  }, [isListError, listError, t])

  useEffect(() => {
    if (!listResponse || !listFetchEnabled) {
      return
    }

    const {
      totalRecords,
      totalPages,
      pageNumber: responsePageNumber,
      pageSize: responsePageSize,
    } = listResponse

    if (totalRecords > 0 && pageNumber > totalPages) {
      setPageNumber(totalPages)
      return
    }

    const data = normalizeChitRows(listResponse.data || [], chitType)
    rowsRef.current = data
    totalRecordsRef.current = totalRecords
    if (responsePageNumber > 0 && responsePageNumber !== pageNumber) {
      setPageNumber(responsePageNumber)
    }
    if (responsePageSize > 0 && responsePageSize !== pageSize) {
      setPageSize(responsePageSize)
    }
    const selectedRow = data.find((row) => Number(row.CHIT_ID) === selectedChitIdRef.current)
      ?? data[0]
      ?? null
    if (!selectedRow || Number(selectedRow.CHIT_ID) !== selectedChitIdRef.current) {
      gridRef.current?.clearSelection()
    }
    selectedChitIdRef.current = selectedRow?.CHIT_ID ?? null
    setSelectedRow(selectedRow)
    void loadSelectedRowDetails(selectedRow)

    if (gridRef.current) {
      syncMirroredGridPage(
        gridRef.current,
        responsePageNumber > 0 ? responsePageNumber : pageNumber,
        initialPagingEventsSuppressedRef,
      )
    }
  }, [chitType, listFetchEnabled, listResponse, loadSelectedRowDetails, pageNumber, pageSize])

  const openAccountingVoucherFromRoute = useCallback(
    async (openChitId: number): Promise<boolean> => {
      setPopupLoading(true)
      try {
        const targetRow = await loadVoucherForDirectOpen(ledger, chitType, openChitId)
        if (!targetRow) {
          notify(t("SOURCE_VOUCHER_NOT_FOUND", "Không tìm thấy chứng từ nguồn"), "warning", 3000)
          return false
        }

        setIsUpdate(true)
        setEditorReadOnly(isPeriodLockVoucher(targetRow))
        setEditingRow(cloneChit(targetRow))
        // Show popup only after row is ready and loading is off — avoids LoadPanel flash inside editor.
        setPopupLoading(false)
        setPopupVisible(true)
        return true
      } catch (error) {
        console.error("[VoucherOpenRoute] Open accounting voucher failed", error)
        notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
        return false
      } finally {
        setPopupLoading(false)
      }
    },
    [chitType, ledger, t],
  )

  const openChitRoute = useVoucherOpenChitIdRoute({
    location,
    navigate,
    routeScopeKey: `${ledger}:${chitType}`,
    loadList: useCallback(async () => {
      initialPagingEventsSuppressedRef.current = true
      applyListQuery(fromDate, toDate, 1, DEFAULT_PAGE_SIZE)
      await invalidateChits()
    }, [applyListQuery, fromDate, invalidateChits, toDate]),
    openVoucher: openAccountingVoucherFromRoute,
    onPageLoadingChange: setLoading,
  })

  useEffect(() => {
    if (hasPendingRouteIntent || openChitRoute.hasPendingOpenRoute) {
      setLoading(false)
    }
  }, [hasPendingRouteIntent, openChitRoute.hasPendingOpenRoute])

  useEffect(() => {
    if (!popupVisible) {
      return
    }

    const pendingCleanup = pendingRouteCleanupRef.current
    if (!pendingCleanup) {
      return
    }

    pendingRouteCleanupRef.current = null
    executeRouteCleanup(pendingCleanup.clearNavigationState)
  }, [executeRouteCleanup, popupVisible])

  useEffect(() => {
    if (initialLoadTriggeredRef.current || hasPendingRouteIntent || openChitRoute.shouldDeferInitialListLoad()) {
      return
    }

    initialLoadTriggeredRef.current = true
    initialPagingEventsSuppressedRef.current = true
    applyListQuery(fromDate, toDate, 1, DEFAULT_PAGE_SIZE)
    openChitRoute.markListLoaded()
  }, [applyListQuery, fromDate, hasPendingRouteIntent, location.search, openChitRoute, toDate])

  const routeIntentDepsRef = useRef({
    search: location.search,
    state: location.state as VoucherOpenLocationState | null,
    chitType,
    ledger,
    navigate,
    scheduleRouteCleanup,
    beginDirectOpen: openChitRoute.beginDirectOpen,
    t,
  })
  routeIntentDepsRef.current = {
    search: location.search,
    state: location.state as VoucherOpenLocationState | null,
    chitType,
    ledger,
    navigate,
    scheduleRouteCleanup,
    beginDirectOpen: openChitRoute.beginDirectOpen,
    t,
  }

  const processRouteIntent = useCallback(async (onCancel: { current: boolean }, runId: number) => {
    sourceCreateFromIntentRef.current = null
    const {
      search,
      state,
      chitType: ct,
      ledger: ld,
      navigate: nav,
      scheduleRouteCleanup: sched,
      beginDirectOpen,
      t: translate,
    } = routeIntentDepsRef.current

    const isStale = () => onCancel.current || runId !== routeIntentRunSeqRef.current
    const targetAction = getCreateFromSourceTargetAction(ct)


    const queryStateKey = new URLSearchParams(search).get("createFromSourceStateKey")
    const createFromSourceFromQuery = queryStateKey ? loadCreateFromSourceState(queryStateKey) : null
    const createFromSource = state?.createFromSource ?? createFromSourceFromQuery
    const isQuerySource = Boolean(createFromSourceFromQuery && queryStateKey)
    if (queryStateKey && !state?.createFromSource && !createFromSourceFromQuery) {
      const invalidIntentKey = `invalid-source-state:${queryStateKey}`
      if (handledRouteIntentRef.current !== invalidIntentKey) {
        handledRouteIntentRef.current = invalidIntentKey
        removeCreateFromSourceState(queryStateKey)
        sched(true)
      }
      return
    }

    if (createFromSource && targetAction) {
      if (createFromSource.sourceAction !== targetAction) {
        sched(true)
        return
      }

      sourceCreateFromIntentRef.current = createFromSource
      const sourceChitId = Number(createFromSource.sourceVoucher.CHIT_ID ?? 0)
      const intentKey = `nav-source:${createFromSource.sourceLedger}:${createFromSource.sourceChitType}:${createFromSource.sourceAction}:${sourceChitId}`
      if (handledRouteIntentRef.current === intentKey) {
        if (queryStateKey) {
          sched(true)
        }
        return
      }


      let openedPopup = false
      let redirectedToLinkedVoucher = false
      beginDirectOpen()
      setLoading(false)
      setPopupLoading(true)
      try {
        const sourceVoucher = await loadCreateFromSourceVoucher(createFromSource)
        if (isStale()) {
          return
        }

        const linkStatus = sourceChitId > 0
          ? await getInventoryLinkStatus(createFromSource.sourceLedger, createFromSource.sourceChitType, sourceChitId)
          : null
        if (isStale()) {
          return
        }


        const nextDraft = buildDraftFromSourceVoucher(
          sourceVoucher,
          ct,
          getCurrentCompanyCd(),
          linkStatus?.LINKED_CHITDETAIL_IDS ?? [],
        )
        const hasLines = hasDraftSourceLines(nextDraft, ct)

        if (!hasLines) {
          const linkedTarget = await resolveLinkedVoucherOpenTarget(linkStatus, sourceVoucher, ct)

          if (linkedTarget) {
            if (isQuerySource && queryStateKey) {
              removeCreateFromSourceState(queryStateKey)
            }

            handledRouteIntentRef.current = intentKey
            setPopupLoading(false)
            redirectedToLinkedVoucher = true
            openLinkedVoucherTarget(nav, linkedTarget)
            return
          }

          notify(translate("SOURCE_DETAILS_ALREADY_LINKED", "Tất cả chi tiết nguồn đã được lập phiếu kho"), "warning", 3000)
          return
        }

        setIsUpdate(false)
        setEditingRow(nextDraft)
        openedPopup = true
        setPopupVisible(true)
      } catch (error) {
        if (!isStale()) {
          console.error("[VoucherRouteIntent] Create voucher from navigation state failed", error)
          notify(getApiErrorMessage(error, translate("LOAD_FAILED", "Tải thất bại")), "error", 4000)
        }
      } finally {
        if (!redirectedToLinkedVoucher) {
          setPopupLoading(false)
        }

        if (!isStale()) {
          if (!redirectedToLinkedVoucher && isQuerySource && queryStateKey) {
            removeCreateFromSourceState(queryStateKey)
          }

          if (!redirectedToLinkedVoucher) {
            handledRouteIntentRef.current = intentKey
          }

          if (redirectedToLinkedVoucher) {
            return
          }

          sched(true, openedPopup)
        }
      }
      return
    }

    if (!search) return
    const params = new URLSearchParams(search)

    const hasSourceQuery = ["sourceChitId", "sourceAction", "sourceChitType", "sourceLedger"].some((key) => params.has(key))
    if (!hasSourceQuery || !targetAction) return
    const sourceChitId = Number(params.get("sourceChitId") ?? 0)
    const sourceAction = String(params.get("sourceAction") ?? "").trim()
    const sourceChitType = String(params.get("sourceChitType") ?? "").trim().toUpperCase() as ChitType
    const sourceLedgerParam = String(params.get("sourceLedger") ?? "").trim().toUpperCase()
    const sourceLedger = (sourceLedgerParam === "AP" || sourceLedgerParam === "AR"
      ? sourceLedgerParam
      : getSourceLedgerByChitType(sourceChitType) ?? "") as ChitLedger
    const intentKey = `url-source:${search}`
    if (handledRouteIntentRef.current === intentKey) return
    if (sourceChitId <= 0 || sourceAction !== targetAction || !sourceLedger || !sourceChitType) {
      handledRouteIntentRef.current = intentKey
      sched()
      return
    }
    let openedPopup = false
    let redirectedToLinkedVoucher = false
    beginDirectOpen()
    setLoading(false)
    setPopupLoading(true)
    try {
      const sourceVoucher = await loadSourceVoucherById(sourceLedger, sourceChitType, sourceChitId)
      if (isStale()) {
        return
      }

      if (!sourceVoucher) {
        notify(translate("SOURCE_VOUCHER_NOT_FOUND", "Không tìm thấy chứng từ nguồn"), "warning", 3000)
        return
      }

      const linkStatus = await getInventoryLinkStatus(sourceLedger, sourceChitType, sourceChitId)
      if (isStale()) {
        return
      }
      const nextDraft = buildDraftFromSourceVoucher(
        sourceVoucher,
        ct,
        getCurrentCompanyCd(),
        linkStatus?.LINKED_CHITDETAIL_IDS ?? [],
      )
      const hasLines = hasDraftSourceLines(nextDraft, ct)
      if (!hasLines) {
        const linkedTarget = await resolveLinkedVoucherOpenTarget(linkStatus, sourceVoucher, ct)
        if (linkedTarget) {
          handledRouteIntentRef.current = intentKey
          setPopupLoading(false)
          redirectedToLinkedVoucher = true
          openLinkedVoucherTarget(nav, linkedTarget)
          return
        }
        notify(translate("SOURCE_DETAILS_ALREADY_LINKED", "Tất cả chi tiết nguồn đã được lập phiếu kho"), "warning", 3000)
        return
      }
      setIsUpdate(false)
      setEditingRow(nextDraft)
      openedPopup = true
      setPopupVisible(true)
    } catch (error) {
      if (!isStale()) {
        console.error("Create voucher from URL failed", error)
        notify(getApiErrorMessage(error, translate("LOAD_FAILED", "Tải thất bại")), "error", 4000)
      }
    } finally {
      if (!redirectedToLinkedVoucher) {
        setPopupLoading(false)
      }

      if (!isStale()) {
        if (!redirectedToLinkedVoucher) {
          handledRouteIntentRef.current = intentKey
        }

        if (redirectedToLinkedVoucher) {
          return
        }

        sched(false, openedPopup)
      }
    }
  }, [])

  useEffect(() => {
    if (!hasPendingRouteIntent) {
      return
    }

    const runId = routeIntentRunSeqRef.current + 1
    routeIntentRunSeqRef.current = runId


    const onCancel = { current: false }
    void processRouteIntent(onCancel, runId)
    return () => {
      onCancel.current = true
      routeIntentRunSeqRef.current += 1
    }
  }, [hasPendingRouteIntent, location.search, location.state, processRouteIntent])

  const openCreatePopup = useCallback(() => {
    setIsUpdate(false)
    setEditorReadOnly(false)
    const companyCd = getCurrentCompanyCd()
    const userId = getCurrentUserId()
    const newChit = createDefaultChit(chitType, companyCd, userId)
    setEditingRow({
      ...newChit,
      DETAILS: [createDefaultChitDetail(1, companyCd)],
    })
    setPopupVisible(true)
  }, [chitType])

const openEditPopup = useCallback(
  async (target?: ChitInfo | null) => {
    const row = target ?? selectedRow
    if (!row?.CHIT_ID) {
      notify(t("MSG_SELECT_ROW_FIRST", "Hãy chọn một dòng trước"), "warning", 2500)
      return
    }

    setPopupLoading(true)

    try {
      let targetRow = row
      if (row.DETAILS.length === 0) {
        const response = await getChits(ledger, chitType, {
          chitId: row.CHIT_ID,
          INCLUDE_DETAILS: true,
          pageNumber: 1,
          pageSize: 1,
        })
        targetRow = normalizeChitRows(response.data || [], chitType)[0] ?? row
      }

      setSelectedRow(targetRow)
      selectedChitIdRef.current = targetRow.CHIT_ID ?? null
      void loadSelectedRowDetails(targetRow)
      setIsUpdate(true)
      setEditorReadOnly(isPeriodLockVoucher(targetRow))
      setEditingRow(cloneChit(targetRow))
      setPopupVisible(true)
    } catch (error) {
      console.error("Open edit popup failed", error)
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 4000)
    } finally {
      setPopupLoading(false)
    }
  },
  [chitType, ledger, loadSelectedRowDetails, selectedRow, t],
)

  const openDuplicatePopup = useCallback((target?: ChitInfo | null) => {
    const row = target ?? selectedRow
    if (!row) {
      notify(t("MSG_SELECT_ROW_FIRST", "Hãy chọn một dòng trước"), "warning", 2500)
      return
    }

    const companyCd = getCurrentCompanyCd()
    const userId = getCurrentUserId()
    const duplicatedDetails = row.DETAILS.length
      ? row.DETAILS.map((detail, index) => {
          const clonedDetail = cloneChitDetail(detail)

          return {
            ...createDefaultChitDetail(index + 1, companyCd),
            ...clonedDetail,
            ROW_KEY: createRowKey(),
            CHITDETAIL_ID: null,
            CHIT_ID: null,
            CHITDETAIL_CD: "",
            SORT: index + 1,
          }
        })
      : [createDefaultChitDetail(1, companyCd)]

    setIsUpdate(false)
    setEditingRow({
      ...createDefaultChit(chitType, companyCd, userId),
      ...cloneChit(row),
      CHIT_ID: null,
      CHIT_CD: "",
      CHIT_NO: "",
      DETAILS: duplicatedDetails,
      DETAIL_COUNT: duplicatedDetails.length,
      AMOUNT: calculateChitAmount(duplicatedDetails),
    })
    setPopupVisible(true)
  }, [chitType, selectedRow, t])

  const notifySourceVoucherLinked = useCallback((savedChit: ChitInfo) => {
    const createFromSource = sourceCreateFromIntentRef.current
    if (!createFromSource || typeof window === "undefined" || !window.opener) {
      return
    }

    const targetDetail = normalizeChitRows([savedChit], savedChit.CHIT_TYPE)[0]?.DETAILS[0]
    const targetChitDetailId = Number(targetDetail?.CHITDETAIL_ID ?? 0)
    const targetChitDetailCd = String(targetDetail?.CHITDETAIL_CD ?? "").trim()
    const sourceChitId = Number(createFromSource.sourceVoucher.CHIT_ID ?? 0)

    if (targetChitDetailId <= 0 || !targetChitDetailCd || sourceChitId <= 0) {
      return
    }

    try {
      window.opener.postMessage(
        {
          type: "SOURCE_VOUCHER_LINKED",
          sourceChitId,
          targetChitDetailId,
          targetChitDetailCd,
          targetChitType: savedChit.CHIT_TYPE,
          targetChitId: Number(savedChit.CHIT_ID ?? 0),
          sourceAction: createFromSource.sourceAction,
        },
        window.location.origin,
      )
    } catch {
    } finally {
      sourceCreateFromIntentRef.current = null
    }
  }, [])

  const persistChit = useCallback(
    async (record: ChitInfo, reopenNew = false) => {
      if (isPeriodLockVoucher(record)) {
        notify(
          t("PERIOD_LOCK_VOUCHER_READONLY", "Chứng từ khóa sổ tự động chỉ được xem, không thể sửa."),
          "warning",
          3000,
        )
        return
      }

      setPopupLoading(true)

      try {
        const payload = mapChitToApiPayload(record)
        let result
        if (isUpdate) {
          result = await updateChit(ledger, payload, chitType)
          notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
        } else {
          result = await createChit(ledger, payload, chitType)
          clearSysCodeSequencePreviewCache()
          notify(t("CREATE_SUCCESS", "Created successfully"), "success", 3000)
        }

        const savedChit = normalizeChitRows(result.data ? [result.data] : [], chitType)[0] ?? null
        if (savedChit) {
          selectedChitIdRef.current = savedChit.CHIT_ID ?? null
          notifySourceVoucherLinked(savedChit)
        }

        setPopupVisible(false)
        openChitRoute.markListLoaded()
        initialLoadTriggeredRef.current = true
        await invalidateChits()

        if (reopenNew) {
          openCreatePopup()
        }
      } catch (error) {
        console.error("Save chit note error", error)
        notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 4000)
      } finally {
        setPopupLoading(false)
      }
    },
    [chitType, invalidateChits, isUpdate, ledger, openChitRoute, openCreatePopup, t],
  )

  const handleSave = useCallback(
    async (record: ChitInfo) => {
      await persistChit(record, false)
    },
    [persistChit],
  )

  const handleSaveAndNew = useCallback(
    async (record: ChitInfo) => {
      await persistChit(record, true)
    },
    [persistChit],
  )

  const handleDelete = useCallback(async () => {
    const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
    const ids = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!ids.length) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    const lockedIds = rowsRef.current
      .filter((row) => row.CHIT_ID && ids.includes(row.CHIT_ID) && isPeriodLockVoucher(row))
      .map((row) => row.CHIT_ID as number)
    const deletableIds = ids.filter((id) => !lockedIds.includes(id))

    if (lockedIds.length > 0) {
      notify(
        t(
          "PERIOD_LOCK_VOUCHER_DELETE_BLOCKED",
          "Chứng từ khóa sổ tự động không thể xóa tại đây. Vui lòng mở sổ ở module Khóa sổ kỳ.",
        ),
        "warning",
        3500,
      )
    }

    if (!deletableIds.length) {
      return
    }

    const confirmText = t(
      "MSG_CONFIRM_DELETE_RECORD",
      "Are you sure you want to delete {0} record?",
    ).replace("{0}", String(deletableIds.length))
    const confirmed = await confirm(confirmText, t("MSG_CONFIRM_DELETE", "Confirm delete"))
    if (!confirmed) {
      return
    }

    try {
      await Promise.all(deletableIds.map((id) => deleteChit(ledger, id, chitType)))
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
      await invalidateChits()
    } catch (error) {
      console.error("Delete chit note error", error)
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 4000)
    }
  }, [chitType, invalidateChits, ledger, t])


  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ChitInfo, string | number>) => {
      const selected = event.selectedRowsData
      if (selected.length === 0) return
      const lastKey = event.currentSelectedRowKeys[event.currentSelectedRowKeys.length - 1]
      const row = lastKey != null
        ? (selected.find((r) => r.CHIT_ID == lastKey) ?? selected[0])
        : selected[0]
      selectedChitIdRef.current = row.CHIT_ID ?? null
      setSelectedRow(row)
      void loadSelectedRowDetails(row)
    },
    [loadSelectedRowDetails],
  )

  const handleRowDblClick = useCallback(
    (event: RowDblClickEvent<ChitInfo, string | number>) => {
      void openEditPopup(event.data ?? null)
    },
    [openEditPopup],
  )

  const masterCopyExcludeFields = useMemo(
    () => ["CHIT_ID", "COMPANY_CD", "CHIT_TYPE", "USERID", "DETAIL_COUNT", "DETAILS"],
    [],
  )

  const chitColumnsNode = useMemo(() => <ChitColumns />, [])

  const handleContextMenuUpdate = useCallback(
    (rowData: ChitInfo) => {
      setSelectedRow(rowData)
      selectedChitIdRef.current = rowData.CHIT_ID ?? null
      void loadSelectedRowDetails(rowData)
      void openEditPopup(rowData)
    },
    [loadSelectedRowDetails, openEditPopup],
  )

  const handleContextMenuCopy = useCallback(
    (rowData: ChitInfo) => {
      openDuplicatePopup(rowData)
    },
    [openDuplicatePopup],
  )

  const handleGridInitialized = useCallback((event: InitializedEvent<ChitInfo,string | number>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleDetailGridInitialized = useCallback((event: InitializedEvent<DetailGridRow, string | number>) => {
    detailGridRef.current = event.component ?? null
  }, [])

  const handleRangeSearch = useCallback(() => {
    applyListQuery(fromDate, toDate, 1, pageSize)
    void invalidateChits()
  }, [applyListQuery, fromDate, invalidateChits, pageSize, toDate])

  const inventoryLinkSourceOptions = useMemo(
    () => buildInventoryAccountingReferenceOptions(sysCodeMap[INVENTORY_LINK_SOURCE_CODE_TYPE] ?? []),
    [sysCodeMap],
  )

  const linkCounterpartOptions = useMemo(() => {
    const option = getAccountingReferenceOptionForChitType(chitType, inventoryLinkSourceOptions)
    return option ? [option] : []
  }, [chitType, inventoryLinkSourceOptions])

  const rebuildAccountingLinkPreview = useCallback(
    async (range?: { fromDate: Date | null; toDate: Date | null }) => {
      const inventoryType = getInventoryTypeForAccountingChitType(chitType)
      const option = getAccountingReferenceOptionForChitType(chitType, inventoryLinkSourceOptions)
      if (!inventoryType || !option) {
        setLinkPairs([])
        setLinkInventoryCandidates([])
        setLinkDetailCandidates([])
        return
      }

      const inventoryFromDate = range?.fromDate ?? linkFromDate
      const inventoryToDate = range?.toDate ?? linkToDate
      const fromYmd = formatDateToYmd(inventoryFromDate)
      const toYmd = formatDateToYmd(inventoryToDate)

      setLinkPopupLoading(true)
      try {
        const [inventoryCandidates, detailCandidates] = await Promise.all([
          loadUnlinkedInventoryCandidates({
            inventoryType,
            fromYmd,
            toYmd,
          }),
          loadFreeAccountingDetailsInDateRange({
            ledger,
            chitType,
            fromYmd,
            toYmd,
          }),
        ])

        setLinkInventoryCandidates(inventoryCandidates)
        setLinkDetailCandidates(detailCandidates)
        setLinkPairs([])
        setLinkOptionKey(option.optionKey)
      } catch (error) {
        notify(getApiErrorMessage(error, t("LINK_VOUCHERS_FAILED", "Không thể liên kết phiếu kho")), "error", 3000)
        setLinkPairs([])
        setLinkInventoryCandidates([])
        setLinkDetailCandidates([])
      } finally {
        setLinkPopupLoading(false)
      }
    },
    [chitType, ledger, linkFromDate, linkToDate, t],
  )

  const handleOpenLinkVouchers = useCallback(() => {
    if (!isLinkableAccountingChitType(chitType)) {
      return
    }

    const nextFrom = new Date(today)
    const nextTo = new Date(today)
    setLinkFromDate(nextFrom)
    setLinkToDate(nextTo)
    setLinkPopupVisible(true)
    void rebuildAccountingLinkPreview({ fromDate: nextFrom, toDate: nextTo })
  }, [chitType, rebuildAccountingLinkPreview, today])

  const handleLinkRangeSearch = useCallback(() => {
    if (linkFromDate && linkToDate && linkFromDate > linkToDate) {
      notify(t("INVALID_DATE_RANGE", "Từ ngày phải nhỏ hơn hoặc bằng đến ngày"), "warning", 3000)
      return
    }

    void rebuildAccountingLinkPreview({ fromDate: linkFromDate, toDate: linkToDate })
  }, [linkFromDate, linkToDate, rebuildAccountingLinkPreview, t])

  const handleConfirmLinkVouchers = useCallback(async () => {
    const inventoryType = getInventoryTypeForAccountingChitType(chitType)
    if (!inventoryType || linkPairs.length === 0) {
      return
    }

    const inventoryLedger = getInventoryLedgerForInventoryType(inventoryType)
    setLinkApplying(true)
    let successCount = 0
    let failCount = 0
    try {
      for (const pair of linkPairs) {
        try {
          await applyInventoryAccountingLinkPair({
            inventoryLedger,
            inventoryChitType: inventoryType,
            inventoryChitId: pair.inventory.chitId,
            chitDetailId: pair.detail.chitDetailId,
            chitDetailCd: pair.detail.chitDetailCd,
          })
          successCount += 1
        } catch (error) {
          failCount += 1
          console.error("Apply accounting inventory link failed", error)
        }
      }

      await invalidateChits()
      gridRef.current?.clearSelection()
      setLinkPopupVisible(false)

      if (successCount > 0 && failCount === 0) {
        notify(
          t("LINK_VOUCHERS_SUCCESS", "Đã liên kết {0} phiếu kho").replace("{0}", String(successCount)),
          "success",
          3000,
        )
      } else if (successCount > 0) {
        notify(
          t("LINK_VOUCHERS_PARTIAL", "Đã liên kết {0} phiếu kho, lỗi {1}")
            .replace("{0}", String(successCount))
            .replace("{1}", String(failCount)),
          "warning",
          4000,
        )
      } else {
        notify(t("LINK_VOUCHERS_FAILED", "Không thể liên kết phiếu kho"), "error", 3000)
      }
    } finally {
      setLinkApplying(false)
    }
  }, [chitType, invalidateChits, linkPairs, t])

  const linkToolbarItems = useMemo(() => {
    if (!isLinkableAccountingChitType(chitType)) {
      return []
    }
    return [
      {
        key: "link-vouchers",
        icon: "link",
        text: t("LINK_VOUCHERS", "Liên kết phiếu kho"),
        hint: t("LINK_VOUCHERS", "Liên kết phiếu kho"),
        stylingMode: "text" as const,
        showText: "always" as const,
        onClick: () => handleOpenLinkVouchers(),
      },
    ]
  }, [chitType, handleOpenLinkVouchers, t])

  const handleRefresh = useCallback(() => {
    void refetchChits()
  }, [refetchChits])

  const handleOptionChanged = useCallback((e: OptionChangedEvent<ChitInfo, string | number>) => {
    if (!String(e.fullName).startsWith("paging.")) {
      return
    }

    if (initialPagingEventsSuppressedRef.current) {
      return
    }

    if (loading) {
      return
    }

    if (e.fullName === "paging.pageIndex") {
      const pageIndex = Number(e.value ?? 0)
      const nextPageSize = Number(e.component?.pageSize?.() ?? pageSize)
      loadData(fromDate, toDate, pageIndex + 1, nextPageSize)
      return
    }

    if (e.fullName === "paging.pageSize") {
      const nextPageSize = Number(e.value ?? pageSize)
      e.component.pageIndex(0)
      loadData(fromDate, toDate, 1, nextPageSize)
    }
  }, [fromDate, loadData, loading, pageSize, toDate])

  const handleExportExcel = useCallback(async () => {
    try {
      const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
      const selectedChitId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : null
      const loadDownloadBlob = (signal: AbortSignal) => exportChitExcel(ledger, chitType, {
        chitId: Number.isFinite(selectedChitId) && (selectedChitId ?? 0) > 0 ? selectedChitId : null,
        fromYmd: formatDateToYmd(fromDate),
        toYmd: formatDateToYmd(toDate),
      }, signal)
      const fileLabel = title.trim().replace(/\s+/g, "_").toLowerCase()
      await downloadFile({ fileName: `${fileLabel}_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
    } catch (error) {
      console.error("Export chit note error", error)
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Xuất thất bại")), "error", 4000)
    }
  }, [fromDate, ledger, chitType, t, title, toDate])

  const handleExportPdf = useCallback(() => {
    if (!pdfReportCode) {
      notify(t("EXPORT_PDF_FILE", "Export PDF"), "warning", 2500)
      return
    }

    const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
    const selectedIds = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!selectedIds.length) {
      notify(t("MSG_SELECT_ROW_FIRST", "Hãy chọn một dòng trước"), "warning", 2500)
      return
    }

    const selectedIdSet = new Set(selectedIds)
    const orderedChitIds = rowsRef.current
      .filter((row) => selectedIdSet.has(Number(row.CHIT_ID)))
      .map((row) => Number(row.CHIT_ID))

    for (const selectedId of selectedIds) {
      if (!orderedChitIds.includes(selectedId)) {
        orderedChitIds.push(selectedId)
      }
    }

    const targetUrl = buildReportViewerPageUrl({
      reportCode: pdfReportCode,
      chitId: String(orderedChitIds[0]),
      chitIds: orderedChitIds.join(","),
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }, [pdfReportCode, t])

  const createColumnSettingTabs = useCallback((
    masterItems: GridColumnSettingEditorItem[],
    detailItems: GridColumnSettingEditorItem[],
    masterLoading = false,
    detailLoading = false,
  ): GridColumnSettingsPopupTab[] => [
    {
      key: masterGridId,
      title: t("VOUCHER_LIST", "Voucher list"),
      items: masterItems,
      loading: masterLoading,
    },
    {
      key: detailGridId,
      title: t("VOUCHER_DETAIL", "Voucher detail"),
      items: detailItems,
      loading: detailLoading,
    },
  ], [detailGridId, masterGridId, t])

  const openColumnSettings = useCallback(() => {
    const masterState = masterColumnSettingStateRef.current
    const detailState = detailColumnSettingStateRef.current
    if (!masterState || !detailState) {
      return
    }
    setColumnSettingsVisible(true)
    setColumnSettingsTabs(createColumnSettingTabs([], [], true, true))

    void Promise.all([
      masterState.loadEditorItems(gridRef.current),
      detailState.loadEditorItems(detailGridRef.current),
    ]).then(([masterItems, detailItems]) => {
      setColumnSettingsTabs(createColumnSettingTabs(masterItems, detailItems, false, false))
    })
  }, [createColumnSettingTabs])

  const handleColumnSettingsSave = useCallback(async (tabs: GridColumnSettingsPopupTabSaveItem[]) => {
    const masterState = masterColumnSettingStateRef.current
    const detailState = detailColumnSettingStateRef.current
    if (!masterState || !detailState) {
      return
    }
    const tabMap = new Map(tabs.map((item) => [item.key, item.items] as const))
    const [savedMasterItems, savedDetailItems] = await Promise.all([
      gridRef.current
        ? masterState.applyEditorItemsToComponent(
            gridRef.current,
            tabMap.get(masterGridId) ?? [],
          )
        : masterState.saveEditorItems(tabMap.get(masterGridId) ?? []),
      detailGridRef.current
        ? detailState.applyEditorItemsToComponent(
            detailGridRef.current,
            tabMap.get(detailGridId) ?? [],
          )
        : detailState.saveEditorItems(tabMap.get(detailGridId) ?? []),
    ])

    setColumnSettingsTabs(createColumnSettingTabs(savedMasterItems, savedDetailItems, false, false))
    setColumnSettingsVisible(false)
  }, [
    createColumnSettingTabs,
    detailGridId,
    masterGridId,
  ])

  const handleColumnSettingsReset = useCallback(async (activeTabKey?: string) => {
    if (!activeTabKey) {
      return
    }

    if (activeTabKey === masterGridId) {
      const resetMasterItems = await masterColumnSettingStateRef.current?.resetEditorItems(gridRef.current) ?? []
      const currentDetailItems = columnSettingsTabs.find((tab) => tab.key === detailGridId)?.items ?? []
      setColumnSettingsTabs(createColumnSettingTabs(resetMasterItems, currentDetailItems, false, false))
      return
    }

    if (activeTabKey === detailGridId) {
      const resetDetailItems = await detailColumnSettingStateRef.current?.resetEditorItems(detailGridRef.current) ?? []
      const currentMasterItems = columnSettingsTabs.find((tab) => tab.key === masterGridId)?.items ?? []
      setColumnSettingsTabs(createColumnSettingTabs(currentMasterItems, resetDetailItems, false, false))
    }
  }, [
    columnSettingsTabs,
    createColumnSettingTabs,
    detailGridId,
    masterGridId,
  ])

  const handleNewReceiptShortcut = useCallback(() => {
    if (chitType === "RC") {
      openCreatePopup()
      return
    }

    navigate("/gl/voucher/receipt")
  }, [chitType, navigate, openCreatePopup])

  const handleAddPaymentShortcut = useCallback(() => {
    if (chitType === "PM") {
      openCreatePopup()
      return
    }

    navigate("/gl/voucher/payment")
  }, [chitType, navigate, openCreatePopup])

  const additionalShortcutActions = useMemo(
    () => [SHORTCUT_ACTIONS.NEW_OR_ADD_RECEIPT, SHORTCUT_ACTIONS.ADD_PAYMENT],
    [],
  )

  const additionalShortcutHandlers = useMemo(
    () => ({
      [SHORTCUT_ACTIONS.NEW_OR_ADD_RECEIPT]: () => handleNewReceiptShortcut(),
      [SHORTCUT_ACTIONS.ADD_PAYMENT]: () => handleAddPaymentShortcut(),
    }),
    [handleAddPaymentShortcut, handleNewReceiptShortcut],
  )

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-1 overflow-hidden">
        <GridToolbar
          gridRef={gridRef}
          onAdd={openCreatePopup}
          onOpenColumnSettings={openColumnSettings}
          onRefresh={handleRefresh}
          onRangeSearch={handleRangeSearch}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          showDateRange={true}
          onDelete={handleDelete}
          onImport={excelEnabled ? () => setIsExcelModalOpen(true) : undefined}
          onExportPdf={pdfReportCode ? handleExportPdf : undefined}
          showExportPdf={Boolean(pdfReportCode)}
          onExportXlsx={excelEnabled ? handleExportExcel : undefined}
          showImport={excelEnabled}
          showExportXlsx={false}
          afterAddItems={linkToolbarItems}
          onSearchStateChange={(_value, active) => setIsMasterSearchActive(active)}
          shortcutsEnabled={!popupVisible && !isExcelModalOpen && !linkPopupVisible}
          additionalShortcutActions={additionalShortcutActions}
          additionalShortcutHandlers={additionalShortcutHandlers}
        />

        {linkPopupVisible ? (
        <LinkVouchersPreviewPopup
          visible
          loading={linkPopupLoading}
          applying={linkApplying}
          inventoryCandidates={linkInventoryCandidates}
          detailCandidates={linkDetailCandidates}
          pairs={linkPairs}
          onPairsChange={setLinkPairs}
          counterpartOptions={linkCounterpartOptions}
          selectedOptionKey={linkOptionKey}
          onOptionKeyChange={setLinkOptionKey}
          inventoryType={getInventoryTypeForAccountingChitType(chitType)}
          fromDate={linkFromDate}
          toDate={linkToDate}
          onFromDateChange={setLinkFromDate}
          onToDateChange={setLinkToDate}
          onRangeSearch={() => void handleLinkRangeSearch()}
          onConfirm={() => void handleConfirmLinkVouchers()}
          onClose={() => setLinkPopupVisible(false)}
        />
        ) : null}

        {excelEnabled && importConfig ? (
          <BaseExcelImportPopup
            visible={isExcelModalOpen}
            onClose={() => setIsExcelModalOpen(false)}
            title={title}
            moduleCd={importConfig.moduleCd}
            templateUrl="/System/DownloadTemplate"
            templateFileName={importConfig.templateName}
            params={{ lang: localStorage.getItem('lang') ?? undefined }}
            onImported={() => void invalidateChits()}
          />
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <div className="relative min-h-0 flex-[0_0_58%]">
            <PageGrid<ChitInfo>
              dataSource={dataSource}
              keyExpr="CHIT_ID"
              screenCd={screenCd}
              gridId={masterGridId}
              pagingEnabled={true}
              showPager={true}
              pageSize={pageSize}
              defaultPageSize={DEFAULT_PAGE_SIZE}
              remoteOperations={SERVER_PAGING_REMOTE_OPERATIONS}
              loadPanelEnabled={false}
              copyExcludeFields={masterCopyExcludeFields}
              onInitialized={handleGridInitialized}
              onSelectionChanged={handleSelectionChanged}
              onRowDblClick={handleRowDblClick}
              onContextMenuUpdate={handleContextMenuUpdate}
              onContextMenuCopy={handleContextMenuCopy}
              selectMode="multiple"
              onOptionChanged={handleOptionChanged}
              columnSettingStateRef={masterColumnSettingStateRef}
            >
              {chitColumnsNode}
            </PageGrid>

            <LoadPanel
              visible={loading}
              showIndicator={true}
              showPane={true}
              shading={true}
              shadingColor="rgba(0, 0, 0, 0.15)"
            />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="relative h-full">
              <DetailGrid<DetailGridRow>
                dataSource={selectedRowDetails}
                keyExpr={detailGridKeyExpr}
                height="100%"
                screenCd={screenCd}
                gridId={detailGridId}
                persistColumnSettings={true}
                columnSettingExcludedColumnNames={detailGridExcludedColumnNames}
                runtimeColumnVisibility={detailGridRuntimeColumnVisibility}
                onInitialized={handleDetailGridInitialized}
                searchVisible={isMasterSearchActive}
                showSearchButton={false}
                columnSettingStateRef={detailColumnSettingStateRef}
                noDataText={
                  selectedRow?.CHIT_ID
                    ? t("NO_DETAIL_DATA", "No detail data")
                    : t("NO_DETAIL_DATA", "Select a row to view detail")
                }
              >
                {detailColumnsNode}
              </DetailGrid>
            </div>
          </div>
        </div>
      </div>

      {popupVisible ? (
        <ChitEditorPopup
          visible={popupVisible}
          value={editingRow}
          ledger={ledger}
          chitType={chitType}
          voucherLabel={title}
          isUpdate={isUpdate}
          readOnly={editorReadOnly}
          loading={popupLoading}
          onClose={() => {
            if (popupLoading) {
              return
            }

            setPopupVisible(false)
            void openChitRoute.completeDirectOpenOnPopupClose().then(() => {
              initialLoadTriggeredRef.current = true
            })
          }}
          onSave={handleSave}
          onSaveAndNew={handleSaveAndNew}
          printReportCode={pdfReportCode}
        />
      ) : null}
      {columnSettingsVisible ? (
      <GridColumnSettingsPopup
        visible
        title={t("AUDIT_SETTING_SHOW_HIDE", "Column Settings")}
        tabs={columnSettingsTabs}
        onClose={() => setColumnSettingsVisible(false)}
        onReset={handleColumnSettingsReset}
        onSaveTabs={handleColumnSettingsSave}
      />
      ) : null}
    </DxPage>
  )
}

export default ChitManagementPage
