import { downloadFile } from "@/lib/fileUtils"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
  InitializedEvent,
  OptionChangedEvent,
  RowDblClickEvent,
  SelectionChangedEvent,
} from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"
import { LoadPanel } from "devextreme-react/load-panel"

import {
  createInventoryVoucher,
  deleteInventoryVoucher,
  exportInventoryVoucherExcel,
  updateInventoryVoucher,
} from "@/api/inventoryVoucherApi"
import { clearSysCodeSequencePreviewCache } from "@/api/sysCodeSequenceApi"
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
import { createCurrentMonthDateRange } from "@/lib/dateRangeDefaults"
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"
import type { InventoryInputType, InventoryVoucher } from "@/types/voucher"
import ChitColumns from "@/pages/VoucherManagement/components/ChitColumns"
import {
  buildInventoryAccountingReferenceOptions,
  INVENTORY_LINK_SOURCE_CODE_TYPE,
} from "@/pages/VoucherManagement/components/chitEditorConstants"
import { useSysCodes } from "@/lib/sysCodeContext"
import {
  ChitInventoryInputDetailColumns,
  ChitInventoryAdjustmentDetailColumns,
  ChitInventoryOutputDetailColumns,
} from "./components/ChitInventoryDetailColumns"
import InventoryEditorPopup from "./components/InventoryEditorPopup"
import LinkVouchersPreviewPopup from "./components/LinkVouchersPreviewPopup"
import {
  applyInventoryAccountingLinkPair,
  getAccountingReferenceOptionsForInventory,
  loadFreeAccountingDetailsInDateRange,
  loadUnlinkedInventoryCandidates,
  type LinkAmountCandidate,
  type LinkAmountPair,
  type LinkDetailCandidate,
} from "./inventoryAccountingLinkUtils"
import {
  createDefaultInventoryVoucher,
  createInventoryVoucherCopy,
  ensureInventoryDefaultLine,
  formatInventoryDate,
  mapInventoryVoucherToApiPayload,
  normalizeInventoryVoucherApi,
  type InventoryLine,
  type InventoryVoucherType,
} from "./inventoryVoucherModel"
import { createVoucherImportConfig } from "@/pages/VoucherManagement/voucherImportConfig"
import { useVoucherOpenChitIdRoute } from "@/pages/VoucherManagement/hooks/useVoucherOpenChitIdRoute"
import { loadInventoryVoucherForDirectOpen } from "@/pages/VoucherManagement/voucherDirectOpen"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import {
  useInventoryVoucherListInvalidate,
  useInventoryVoucherListQuery,
} from "@/hooks/queries/useInventoryVoucherListQuery"

interface InventoryManagementPageProps {
  ledger: InventoryInputType
  chitType: InventoryVoucherType
  titleFallback?: string
  titleKey?: string
}

const formatDateToYmd = (value: Date | null): string | undefined => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return undefined
  }

  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")

  return `${year}${month}${day}`
}

const inventoryPdfReportCodeMap: Record<InventoryVoucherType, string> = {
  IR: "INVENTORY_RECEIPT_VOUCHER",
  IO: "INVENTORY_ISSUE_VOUCHER",
  IA: "INVENTORY_ADJUSTMENT_VOUCHER",
}

function getInventoryDetailLines(record: InventoryVoucher | null, chitType: InventoryVoucherType): InventoryLine[] {
  if (!record) {
    return []
  }

  if (chitType === "IR") {
    return record.INPUTS
  }

  return record.OUTPUTS
}

function getInventoryMasterGridId(chitType: InventoryVoucherType): string {
  if (chitType === "IR") {
    return "inventory-receipt-master-grid"
  }

  return chitType === "IO" ? "inventory-issue-master-grid" : "inventory-adjustment-master-grid"
}

function getInventoryDetailGridId(chitType: InventoryVoucherType): string {
  if (chitType === "IR") {
    return "inventory-receipt-detail-grid"
  }

  return chitType === "IO" ? "inventory-issue-detail-grid" : "inventory-adjustment-detail-grid"
}

function getInventoryDetailGridTitleKey(chitType: InventoryVoucherType): string {
  if (chitType === "IR") {
    return "INVENTORY_RECEIPT_DETAIL"
  }

  return chitType === "IO" ? "INVENTORY_ISSUE_DETAIL" : "INVENTORY_ADJUSTMENT_DETAIL"
}

function getInventoryDetailGridTitleFallback(chitType: InventoryVoucherType): string {
  if (chitType === "IR") {
    return "Inventory receipt detail"
  }

  return chitType === "IO" ? "Inventory issue detail" : "Inventory adjustment detail"
}

function renderInventoryDetailColumns(chitType: InventoryVoucherType) {
  if (chitType === "IR") {
    return <ChitInventoryInputDetailColumns />
  }

  return chitType === "IO" ? <ChitInventoryOutputDetailColumns /> : <ChitInventoryAdjustmentDetailColumns />
}

export default function InventoryManagementPage({
  ledger,
  chitType,
  titleFallback,
  titleKey,
}: InventoryManagementPageProps) {
  const location = useLocation()
  const navigate = useNavigate()
  const gridRef = useRef<dxDataGrid<InventoryVoucher, string | number> | null>(null)
  const detailGridRef = useRef<dxDataGrid<InventoryLine, string | number> | null>(null)
  const masterColumnSettingStateRef = useRef<GridColumnSettingState | null>(null)
  const detailColumnSettingStateRef = useRef<GridColumnSettingState | null>(null)
  const initialLoadTriggeredRef = useRef(false)
  const initialPagingEventsSuppressedRef = useRef(false)
  const { fromDate: monthStart, toDate: today } = useMemo(() => createCurrentMonthDateRange(), [])
  const [fromDate, setFromDate] = useState<Date | null>(monthStart)
  const [toDate, setToDate] = useState<Date | null>(today)
  const [rows, setRows] = useState<InventoryVoucher[]>([])
  const [selectedRow, setSelectedRow] = useState<InventoryVoucher | null>(null)
  const selectedChitIdRef = useRef<number | null>(null)
  const [selectedLines, setSelectedLines] = useState<InventoryLine[]>([])
  const [isMasterSearchActive, setIsMasterSearchActive] = useState(false)
  const [loading, setLoading] = useState(true)
  const [popupLoading, setPopupLoading] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [linkPopupVisible, setLinkPopupVisible] = useState(false)
  const [linkPopupLoading, setLinkPopupLoading] = useState(false)
  const [linkApplying, setLinkApplying] = useState(false)
  const [linkPairs, setLinkPairs] = useState<LinkAmountPair[]>([])
  const [linkInventoryCandidates, setLinkInventoryCandidates] = useState<LinkAmountCandidate[]>([])
  const [linkDetailCandidates, setLinkDetailCandidates] = useState<LinkDetailCandidate[]>([])
  const [linkOptionKey, setLinkOptionKey] = useState("")
  const [linkFromDate, setLinkFromDate] = useState<Date | null>(monthStart)
  const [linkToDate, setLinkToDate] = useState<Date | null>(today)
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsTabs, setColumnSettingsTabs] = useState<GridColumnSettingsPopupTab[]>([])
  const [isUpdate, setIsUpdate] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [, setTotalRecords] = useState(0)
  const [listQueryFromYmd, setListQueryFromYmd] = useState("")
  const [listQueryToYmd, setListQueryToYmd] = useState("")
  const [listFetchEnabled, setListFetchEnabled] = useState(false)
  const [editingRow, setEditingRow] = useState<InventoryVoucher>(() =>
    createDefaultInventoryVoucher(chitType, getCurrentCompanyCd(), getCurrentUserId()),
  )
  const { translate } = useContext(LanguageContext)
  const { sysCodeMap } = useSysCodes()
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])
  const title = titleKey ? t(titleKey, titleFallback ?? "") : titleFallback ?? (chitType === "IR" ? "Phiếu nhập kho" : "Phiếu xuất kho")
  const screenCd = useMemo(() => location.pathname, [location.pathname])
  const masterGridId = useMemo(() => getInventoryMasterGridId(chitType), [chitType])
  const detailGridId = useMemo(() => getInventoryDetailGridId(chitType), [chitType])
  const pdfReportCode = useMemo(() => inventoryPdfReportCodeMap[chitType], [chitType])
  const pdfEnabled = Boolean(pdfReportCode)
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
  const excelEnabled = importConfig !== null
  const masterColumnsNode = useMemo(() => <ChitColumns />, [])
  const detailColumnsNode = useMemo(() => renderInventoryDetailColumns(chitType), [chitType])

  const invalidateInventoryVouchers = useInventoryVoucherListInvalidate()
  const {
    data: listResponse,
    isLoading: isListLoading,
    isFetching: isListFetching,
    isError: isListError,
    error: listError,
    refetch: refetchInventoryVouchers,
  } = useInventoryVoucherListQuery(
    {
      ledger,
      chitType,
      fromYmd: listQueryFromYmd,
      toYmd: listQueryToYmd,
      pageNumber,
      pageSize,
    },
    listFetchEnabled,
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
      const resolvedPageNumber = Number.isFinite(Number(targetPage)) && Number(targetPage) > 0 ? Number(targetPage) : 1
      const resolvedPageSize = Number.isFinite(Number(targetPageSize)) && Number(targetPageSize) > 0 ? Number(targetPageSize) : 20

      if (fromYmd && toYmd && fromYmd > toYmd) {
        notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
        setRows([])
        gridRef.current?.clearSelection()
        setSelectedRow(null)
        selectedChitIdRef.current = null
        setSelectedLines([])
        setTotalRecords(0)
        setPageNumber(1)
        setListFetchEnabled(false)
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

    notify(getApiErrorMessage(listError, t("LOAD_FAILED", "Tải thất bại")), "error", 3000)
  }, [isListError, listError, t])

  useEffect(() => {
    if (!listResponse || !listFetchEnabled) {
      return
    }

    const { totalRecords, totalPages, pageNumber: responsePageNumber, pageSize: responsePageSize } = listResponse

    if (totalRecords > 0 && pageNumber > totalPages) {
      setPageNumber(totalPages)
      return
    }

    const companyCd = getCurrentCompanyCd()
    const normalizedRows = listResponse.data.map((item) => normalizeInventoryVoucherApi(item, chitType, companyCd))

    setRows(normalizedRows)
    setTotalRecords(totalRecords)
    if (responsePageNumber !== pageNumber) {
      setPageNumber(responsePageNumber)
    }
    if (responsePageSize !== pageSize) {
      setPageSize(responsePageSize)
    }
    const selected = normalizedRows.find((row) => Number(row.CHIT_ID) === selectedChitIdRef.current)
      ?? normalizedRows[0]
      ?? null
    if (!selected || Number(selected.CHIT_ID) !== selectedChitIdRef.current) {
      gridRef.current?.clearSelection()
    }
    selectedChitIdRef.current = selected?.CHIT_ID ?? null
    setSelectedRow(selected)
    setSelectedLines(getInventoryDetailLines(selected, chitType))

    if (initialPagingEventsSuppressedRef.current) {
      initialPagingEventsSuppressedRef.current = false
    }
  }, [chitType, listFetchEnabled, listResponse, pageNumber, pageSize])

  const openInventoryVoucherFromRoute = useCallback(
    async (openChitId: number): Promise<boolean> => {
      setPopupLoading(true)
      try {
        const targetRow = await loadInventoryVoucherForDirectOpen(ledger, chitType, openChitId)
        if (!targetRow) {
          notify(t("SOURCE_VOUCHER_NOT_FOUND", "Source voucher not found"), "warning", 3000)
          return false
        }

        setIsUpdate(true)
        setEditingRow(ensureInventoryDefaultLine(targetRow))
        setPopupVisible(true)
        return true
      } catch (error) {
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
      applyListQuery(fromDate, toDate, 1, 20)
      await invalidateInventoryVouchers()
    }, [applyListQuery, fromDate, invalidateInventoryVouchers, toDate]),
    openVoucher: openInventoryVoucherFromRoute,
    onPageLoadingChange: setLoading,
  })

  useEffect(() => {
    if (initialLoadTriggeredRef.current || openChitRoute.shouldDeferInitialListLoad()) {
      return
    }

    initialLoadTriggeredRef.current = true
    initialPagingEventsSuppressedRef.current = true
    applyListQuery(fromDate, toDate, 1, 20)
    openChitRoute.markListLoaded()
  }, [applyListQuery, fromDate, openChitRoute, toDate])

  const handleRangeSearch = useCallback(() => {
    applyListQuery(fromDate, toDate, 1, pageSize)
    void invalidateInventoryVouchers()
  }, [applyListQuery, fromDate, invalidateInventoryVouchers, pageSize, toDate])

  const handleGridInitialized = useCallback((event: InitializedEvent<InventoryVoucher, string | number>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleDetailGridInitialized = useCallback((event: InitializedEvent<InventoryLine, string | number>) => {
    detailGridRef.current = event.component ?? null
  }, [])

  const handleOptionChanged = useCallback((event: OptionChangedEvent<InventoryVoucher, string | number>) => {
    if (initialPagingEventsSuppressedRef.current && String(event.fullName).startsWith("paging.")) {
      return
    }

    if (loading) {
      return
    }

    if (event.fullName === "paging.pageIndex") {
      const pageIndex = Number(event.value ?? 0)
      const nextPageSize = Number(event.component?.pageSize?.() ?? pageSize)
      loadData(fromDate, toDate, pageIndex + 1, nextPageSize)
      return
    }

    if (event.fullName === "paging.pageSize") {
      const nextPageSize = Number(event.value ?? pageSize)
      event.component.pageIndex(0)
      loadData(fromDate, toDate, 1, nextPageSize)
    }
  }, [fromDate, loadData, loading, pageSize, toDate])

  const openEditor = useCallback((record: InventoryVoucher, update: boolean) => {
    selectedChitIdRef.current = record.CHIT_ID ?? null
    setEditingRow(ensureInventoryDefaultLine(record))
    setIsUpdate(update)
    setPopupVisible(true)
  }, [])

  const handleAdd = useCallback(() => {
    openEditor(createDefaultInventoryVoucher(chitType, getCurrentCompanyCd(), getCurrentUserId()), false)
  }, [chitType, openEditor])

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent<InventoryVoucher, string | number>) => {
    const selected = event.selectedRowsData
    if (selected.length === 0) {
      setSelectedRow(null)
      selectedChitIdRef.current = null
      setSelectedLines([])
      return
    }

    const lastKey = event.currentSelectedRowKeys[event.currentSelectedRowKeys.length - 1]
    const row = lastKey != null
      ? selected.find((item) => item.CHIT_ID == lastKey) ?? selected[0]
      : selected[0]

    selectedChitIdRef.current = row.CHIT_ID ?? null
    setSelectedRow(row)
    setSelectedLines(getInventoryDetailLines(row, chitType))
  }, [chitType])

  const handleRowDblClick = useCallback((event: RowDblClickEvent<InventoryVoucher, string | number>) => {
    if (event.data) {
      openEditor(event.data, true)
    }
  }, [openEditor])

  const handleContextMenuUpdate = useCallback((rowData: InventoryVoucher) => {
    selectedChitIdRef.current = rowData.CHIT_ID ?? null
    setSelectedRow(rowData)
    setSelectedLines(getInventoryDetailLines(rowData, chitType))
    openEditor(rowData, true)
  }, [chitType, openEditor])

  const handleContextMenuCopy = useCallback((rowData: InventoryVoucher) => {
    const duplicated = createInventoryVoucherCopy(rowData, chitType, getCurrentCompanyCd(), getCurrentUserId())

    selectedChitIdRef.current = duplicated.CHIT_ID ?? null
    setSelectedRow(duplicated)
    setSelectedLines(getInventoryDetailLines(duplicated, chitType))
    openEditor(duplicated, false)
  }, [chitType, openEditor])

  const applySourceLinkToVoucher = useCallback(
    (voucher: InventoryVoucher, targetChitDetailId: number, targetChitDetailCd: string): InventoryVoucher => {
      const shouldMap = (line: InventoryLine) =>
        Number(line.CHITDETAIL_ID ?? 0) <= 0 && String(line.CHITDETAIL_CD ?? "").trim().length === 0

      const mapInputLine = (line: typeof voucher.INPUTS[number]): typeof voucher.INPUTS[number] =>
        shouldMap(line)
          ? {
              ...line,
              CHITDETAIL_ID: targetChitDetailId,
              CHITDETAIL_CD: targetChitDetailCd,
            }
          : line

      const mapOutputLine = (line: typeof voucher.OUTPUTS[number]): typeof voucher.OUTPUTS[number] =>
        shouldMap(line)
          ? {
              ...line,
              CHITDETAIL_ID: targetChitDetailId,
              CHITDETAIL_CD: targetChitDetailCd,
            }
          : line

      if (chitType === "IR") {
        return {
          ...voucher,
          INPUTS: voucher.INPUTS.map(mapInputLine),
        }
      }

      if (chitType === "IA") {
        return voucher
      }

      return {
        ...voucher,
        OUTPUTS: voucher.OUTPUTS.map(mapOutputLine),
      }
    },
    [chitType],
  )

  const persistInventoryVoucherLink = useCallback(
    async (voucher: InventoryVoucher) => {
      if (!Number.isFinite(voucher.CHIT_ID ?? 0) || (voucher.CHIT_ID ?? 0) <= 0) {
        return
      }

      try {
        const payload = mapInventoryVoucherToApiPayload({
          ...voucher,
          CHIT_YMD: formatInventoryDate(voucher.CHIT_YMD),
        })
        const response = await updateInventoryVoucher(ledger, chitType, payload)
        const saved = normalizeInventoryVoucherApi(response.data, chitType, getCurrentCompanyCd())

        setRows((current) => current.map((item) => (item.CHIT_ID === saved.CHIT_ID ? saved : item)))
        if (selectedRow?.CHIT_ID === saved.CHIT_ID) {
          selectedChitIdRef.current = saved.CHIT_ID ?? null
          setSelectedRow(saved)
          setSelectedLines(getInventoryDetailLines(saved, chitType))
        }
        setEditingRow(saved)
        notify(t("SOURCE_LINK_UPDATED", "Source voucher linked successfully"), "success", 3000)
      } catch (error) {
        notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
      }
    },
    [chitType, getCurrentCompanyCd, ledger, mapInventoryVoucherToApiPayload, selectedRow, t],
  )

  const handleSourceVoucherLinkedMessage = useCallback(
    async (event: MessageEvent) => {
      if (event.origin !== window.location.origin) {
        return
      }

      const payload = event.data as Record<string, unknown>
      if (payload?.type !== "SOURCE_VOUCHER_LINKED") {
        return
      }

      const sourceChitId = Number(payload.sourceChitId ?? 0)
      const targetChitDetailId = Number(payload.targetChitDetailId ?? 0)
      const targetChitDetailCd = String(payload.targetChitDetailCd ?? "").trim()
      if (targetChitDetailId <= 0 || !targetChitDetailCd) {
        return
      }

      if (!popupVisible) {
        return
      }

      if (sourceChitId > 0 && Number(editingRow.CHIT_ID ?? 0) !== sourceChitId) {
        return
      }

      if (sourceChitId <= 0 && Number(editingRow.CHIT_ID ?? 0) > 0) {
        return
      }

      const nextEditingRow = applySourceLinkToVoucher(editingRow, targetChitDetailId, targetChitDetailCd)
      if (nextEditingRow === editingRow) {
        return
      }

      setEditingRow(nextEditingRow)
      setRows((current) => current.map((item) => (item.CHIT_ID === nextEditingRow.CHIT_ID ? nextEditingRow : item)))
      if (selectedRow?.CHIT_ID === nextEditingRow.CHIT_ID) {
        setSelectedRow(nextEditingRow)
        setSelectedLines(getInventoryDetailLines(nextEditingRow, chitType))
      }

      if (Number(nextEditingRow.CHIT_ID ?? 0) > 0) {
        await persistInventoryVoucherLink(nextEditingRow)
      }
    },
    [applySourceLinkToVoucher, chitType, editingRow, persistInventoryVoucherLink, popupVisible, selectedRow, t],
  )

  useEffect(() => {
    window.addEventListener("message", handleSourceVoucherLinkedMessage)
    return () => window.removeEventListener("message", handleSourceVoucherLinkedMessage)
  }, [handleSourceVoucherLinkedMessage])

  const handleSave = useCallback(async (record: InventoryVoucher, reopenNew = false) => {
    setPopupLoading(true)
    try {
      const payload = mapInventoryVoucherToApiPayload({
        ...record,
        CHIT_YMD: formatInventoryDate(record.CHIT_YMD),
      })
      const result = isUpdate
        ? await updateInventoryVoucher(ledger, chitType, payload)
        : await createInventoryVoucher(ledger, chitType, payload)
      if (!isUpdate) {
        clearSysCodeSequencePreviewCache()
      }
      const saved = normalizeInventoryVoucherApi(result.data, chitType, getCurrentCompanyCd())

      setRows((current) => {
        const existingIndex = current.findIndex((item) => item.CHIT_ID === saved.CHIT_ID)
        if (existingIndex < 0) {
          return [saved, ...current]
        }

        return current.map((item, index) => (index === existingIndex ? saved : item))
      })
      setSelectedRow(saved)
      selectedChitIdRef.current = saved.CHIT_ID ?? null
      setSelectedLines(getInventoryDetailLines(saved, chitType))
      notify(result.message || t("SAVE_SUCCESS", "Saved successfully"), "success", 2000)

      if (reopenNew) {
        setEditingRow(createDefaultInventoryVoucher(chitType, getCurrentCompanyCd(), getCurrentUserId()))
        setIsUpdate(false)
        setPopupVisible(true)
        return
      }

      setPopupVisible(false)
      openChitRoute.markListLoaded()
      initialLoadTriggeredRef.current = true
      await invalidateInventoryVouchers()
    } catch (error) {
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 3000)
      throw error
    } finally {
      setPopupLoading(false)
    }
  }, [chitType, invalidateInventoryVouchers, isUpdate, ledger, openChitRoute, t])

  const handleSaveAndNew = useCallback(async (record: InventoryVoucher) => {
    await handleSave(record, true)
  }, [handleSave])

  const handleDelete = useCallback(async () => {
    const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
    const ids = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!ids.length) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2000)
      return
    }

    const confirmText = t(
      "MSG_CONFIRM_DELETE_RECORD",
      "Are you sure you want to delete {0} record?",
    ).replace("{0}", String(ids.length))
    const confirmed = await confirm(confirmText, t("CONFIRM", "Confirm"))
    if (!confirmed) {
      return
    }

    try {
      await Promise.all(ids.map((id) => deleteInventoryVoucher(ledger, chitType, id)))
      setSelectedRow(null)
      selectedChitIdRef.current = null
      setSelectedLines([])
      gridRef.current?.clearSelection()
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 2000)
      await invalidateInventoryVouchers()
    } catch (error) {
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
    }
  }, [chitType, invalidateInventoryVouchers, ledger, t])

  const handleExportExcel = useCallback(async () => {
    try {
      const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
      const selectedChitId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : null
      const loadDownloadBlob = (signal: AbortSignal) => exportInventoryVoucherExcel(ledger, chitType, {
        chitId: selectedChitId != null && Number.isFinite(selectedChitId) && selectedChitId > 0 ? selectedChitId : null,
        fromYmd: formatDateToYmd(fromDate),
        toYmd: formatDateToYmd(toDate),
      }, signal)
      const fileLabel = title.trim().replace(/\s+/g, "_").toLowerCase() || "inventory_voucher"
      await downloadFile({ fileName: `${fileLabel}_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
    } catch (error) {
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Xuất thất bại")), "error", 4000)
    }
  }, [chitType, fromDate, ledger, t, title, toDate])

  const handleExportPdf = useCallback(() => {
    const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
    const selectedIds = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!selectedIds.length) {
      notify(t("MSG_SELECT_ROW_FIRST", "Hãy chọn một dòng trước"), "warning", 2500)
      return
    }

    const selectedIdSet = new Set(selectedIds)
    const orderedChitIds = rows
      .filter((row) => selectedIdSet.has(Number(row.CHIT_ID)))
      .map((row) => Number(row.CHIT_ID))

    for (const selectedId of selectedIds) {
      if (!orderedChitIds.includes(selectedId)) {
        orderedChitIds.push(selectedId)
      }
    }

    if (!pdfReportCode) {
      notify(t("REPORT_NOT_CONFIGURED", "Report is not configured"), "warning", 2500)
      return
    }

    const targetUrl = buildReportViewerPageUrl({
      reportCode: pdfReportCode,
      chitId: String(orderedChitIds[0]),
      chitIds: orderedChitIds.join(","),
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }, [pdfReportCode, rows, t])

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
      title: t(getInventoryDetailGridTitleKey(chitType), getInventoryDetailGridTitleFallback(chitType)),
      items: detailItems,
      loading: detailLoading,
    },
  ], [chitType, detailGridId, masterGridId, t])

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

  const linkableInventoryType = chitType === "IR" || chitType === "IO" ? chitType : null

  const inventoryLinkSourceOptions = useMemo(
    () => buildInventoryAccountingReferenceOptions(sysCodeMap[INVENTORY_LINK_SOURCE_CODE_TYPE] ?? []),
    [sysCodeMap],
  )

  const linkCounterpartOptions = useMemo(
    () =>
      linkableInventoryType
        ? getAccountingReferenceOptionsForInventory(linkableInventoryType, inventoryLinkSourceOptions)
        : [],
    [inventoryLinkSourceOptions, linkableInventoryType],
  )

  const rebuildInventoryLinkPreview = useCallback(
    async (range?: { fromDate: Date | null; toDate: Date | null; optionKey?: string }) => {
      if (!linkableInventoryType) {
        setLinkPairs([])
        setLinkInventoryCandidates([])
        setLinkDetailCandidates([])
        return
      }

      const optionKey = range?.optionKey || linkOptionKey
      const option =
        linkCounterpartOptions.find((item) => item.optionKey === optionKey) ?? linkCounterpartOptions[0] ?? null
      if (!option) {
        setLinkPairs([])
        setLinkInventoryCandidates([])
        setLinkDetailCandidates([])
        return
      }

      const inventoryFromDate = range?.fromDate ?? linkFromDate
      const inventoryToDate = range?.toDate ?? linkToDate
      const fromYmd = formatDateToYmd(inventoryFromDate)
      const toYmd = formatDateToYmd(inventoryToDate)

      setLinkOptionKey(option.optionKey)
      setLinkPopupLoading(true)
      try {
        const [inventoryCandidates, detailCandidates] = await Promise.all([
          loadUnlinkedInventoryCandidates({
            inventoryType: linkableInventoryType,
            fromYmd,
            toYmd,
          }),
          loadFreeAccountingDetailsInDateRange({
            ledger: option.ledger,
            chitType: option.chitType,
            fromYmd,
            toYmd,
          }),
        ])

        setLinkInventoryCandidates(inventoryCandidates)
        setLinkDetailCandidates(detailCandidates)
        setLinkPairs([])
      } catch (error) {
        notify(getApiErrorMessage(error, t("LINK_VOUCHERS_FAILED", "Không thể liên kết phiếu kho")), "error", 3000)
        setLinkPairs([])
        setLinkInventoryCandidates([])
        setLinkDetailCandidates([])
      } finally {
        setLinkPopupLoading(false)
      }
    },
    [linkCounterpartOptions, linkFromDate, linkOptionKey, linkToDate, linkableInventoryType, t],
  )

  const handleOpenLinkVouchers = useCallback(() => {
    if (!linkableInventoryType || linkCounterpartOptions.length === 0) {
      return
    }

    const nextFrom = new Date(today)
    const nextTo = new Date(today)
    const optionKey = linkCounterpartOptions[0]?.optionKey ?? ""
    setLinkFromDate(nextFrom)
    setLinkToDate(nextTo)
    setLinkOptionKey(optionKey)
    setLinkPopupVisible(true)
    void rebuildInventoryLinkPreview({ fromDate: nextFrom, toDate: nextTo, optionKey })
  }, [linkCounterpartOptions, linkableInventoryType, rebuildInventoryLinkPreview, today])

  const handleLinkRangeSearch = useCallback(() => {
    if (linkFromDate && linkToDate && linkFromDate > linkToDate) {
      notify(t("INVALID_DATE_RANGE", "Từ ngày phải nhỏ hơn hoặc bằng đến ngày"), "warning", 3000)
      return
    }

    void rebuildInventoryLinkPreview({ fromDate: linkFromDate, toDate: linkToDate, optionKey: linkOptionKey })
  }, [linkFromDate, linkOptionKey, linkToDate, rebuildInventoryLinkPreview, t])

  const handleLinkOptionKeyChange = useCallback(
    (optionKey: string) => {
      setLinkOptionKey(optionKey)
      void rebuildInventoryLinkPreview({ fromDate: linkFromDate, toDate: linkToDate, optionKey })
    },
    [linkFromDate, linkToDate, rebuildInventoryLinkPreview],
  )

  const handleConfirmLinkVouchers = useCallback(async () => {
    if (!linkableInventoryType || linkPairs.length === 0) {
      return
    }

    setLinkApplying(true)
    let successCount = 0
    let failCount = 0
    try {
      for (const pair of linkPairs) {
        try {
          await applyInventoryAccountingLinkPair({
            inventoryLedger: ledger,
            inventoryChitType: linkableInventoryType,
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

      await invalidateInventoryVouchers()
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
  }, [invalidateInventoryVouchers, ledger, linkPairs, linkableInventoryType, t])

  const linkToolbarItems = useMemo(() => {
    if (!linkableInventoryType) {
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
  }, [handleOpenLinkVouchers, linkableInventoryType, t])

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

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-hidden">
        <GridToolbar
          gridRef={gridRef}
          onAdd={handleAdd}
          onOpenColumnSettings={openColumnSettings}
          onRefresh={() => void refetchInventoryVouchers()}
          onDelete={handleDelete}
          onRangeSearch={handleRangeSearch}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          showDateRange
          onImport={excelEnabled ? () => setIsExcelModalOpen(true) : undefined}
          onExportPdf={handleExportPdf}
          onExportXlsx={excelEnabled ? handleExportExcel : undefined}
          showExportPdf={pdfEnabled}
          showExportXlsx={false}
          showImport={excelEnabled}
          afterAddItems={linkToolbarItems}
          shortcutsEnabled={!popupVisible && !isExcelModalOpen && !linkPopupVisible}
          onSearchStateChange={(_value, active) => setIsMasterSearchActive(active)}
        />

        <LinkVouchersPreviewPopup
          visible={linkPopupVisible}
          loading={linkPopupLoading}
          applying={linkApplying}
          inventoryCandidates={linkInventoryCandidates}
          detailCandidates={linkDetailCandidates}
          pairs={linkPairs}
          onPairsChange={setLinkPairs}
          counterpartOptions={linkCounterpartOptions}
          selectedOptionKey={linkOptionKey}
          onOptionKeyChange={handleLinkOptionKeyChange}
          fromDate={linkFromDate}
          toDate={linkToDate}
          onFromDateChange={setLinkFromDate}
          onToDateChange={setLinkToDate}
          onRangeSearch={() => void handleLinkRangeSearch()}
          onConfirm={() => void handleConfirmLinkVouchers()}
          onClose={() => setLinkPopupVisible(false)}
        />

        {excelEnabled && importConfig ? (
          <BaseExcelImportPopup
            visible={isExcelModalOpen}
            onClose={() => setIsExcelModalOpen(false)}
            title={title}
            moduleCd={importConfig.moduleCd}
            templateUrl="/System/DownloadTemplate"
            templateFileName={importConfig.templateName}
            params={{ lang: localStorage.getItem('lang') ?? undefined }}
            onImported={() => void invalidateInventoryVouchers()}
          />
        ) : null}

        <div className="flex min-h-0 flex-1 flex-col gap-1">
          <div className="relative min-h-0 flex-[0_0_58%]">
            <PageGrid<InventoryVoucher>
              dataSource={rows}
              keyExpr="CHIT_ID"
              screenCd={screenCd}
              gridId={masterGridId}
              persistColumnSettings
              onInitialized={handleGridInitialized}
              onSelectionChanged={handleSelectionChanged}
              onRowDblClick={handleRowDblClick}
              onContextMenuUpdate={handleContextMenuUpdate}
              onContextMenuCopy={handleContextMenuCopy}
              selectMode="multiple"
              focusRowEnabled
              autoNavigateToFocusedRow
              pagingEnabled
              showPager
              pageSize={pageSize}
              onOptionChanged={handleOptionChanged}
              columnSettingStateRef={masterColumnSettingStateRef}
            >
              {masterColumnsNode}
            </PageGrid>
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
            <div className="relative h-full">
              <DetailGrid<InventoryLine>
                dataSource={selectedLines}
                keyExpr="ROW_KEY"
                height="100%"
                onInitialized={handleDetailGridInitialized}
                persistColumnSettings
                screenCd={screenCd}
                gridId={detailGridId}
                columnSettingStateRef={detailColumnSettingStateRef}
                searchVisible={isMasterSearchActive}
                showSearchButton={false}
                noDataText={t("NO_DETAIL_DATA", "No detail data")}
              >
                {detailColumnsNode}
              </DetailGrid>
            </div>
          </div>
        </div>
      </div>

      <InventoryEditorPopup
        visible={popupVisible}
        value={editingRow}
        chitType={chitType}
        voucherLabel={title}
        isUpdate={isUpdate}
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
        onSave={(record) => handleSave(record, false)}
        onSaveAndNew={handleSaveAndNew}
        printReportCode={pdfReportCode}
      />

      <LoadPanel visible={loading} showIndicator shading={false} />
      <GridColumnSettingsPopup
        visible={columnSettingsVisible}
        title={t("AUDIT_SETTING_SHOW_HIDE", "Column Settings")}
        tabs={columnSettingsTabs}
        onClose={() => setColumnSettingsVisible(false)}
        onReset={handleColumnSettingsReset}
        onSaveTabs={handleColumnSettingsSave}
      />
    </DxPage>
  )
}
