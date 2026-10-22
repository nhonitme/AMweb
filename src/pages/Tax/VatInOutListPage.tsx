import { memo, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Column } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { OptionChangedEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"

import { getVatInOutExportData, type VatInOutQuery } from "@/api/vatInOutApi"
import { getChits } from "@/api/voucherApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { getUserSettingsBatch, saveUserSettingsBulk } from "@/api/userSettingApi"
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid"
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import { exportToExcel } from "@/lib/excelUtils"
import { useCurrentMenuExportName } from "@/hooks/useCurrentMenuExportName"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { useVatInOutListQuery, useVatInOutListInvalidate } from "@/hooks/queries/useVatInOutListQuery"
import { DEFAULT_PAGE_SIZE, createMirrorPagedStore, syncMirroredGridPage, SERVER_PAGING_REMOTE_OPERATIONS, resolvePageNumber, resolvePageSize } from "@/lib/paging"
import { formatDateToYmd, formatYmdForDisplay, normalizeYmd } from "@/pages/Accounting/accountingDateUtils"
import FetchGdtVatPopupContent from "@/pages/Reports/components/FetchGdtVatPopup"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { normalizeReportLanguage } from "@/pages/Reports/reportLanguage"
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import ChitEditorPopup from "@/pages/VoucherManagement/components/ChitEditorPopup"
import { normalizeChitRows } from "@/pages/VoucherManagement/chitUtils"
import type { ColumnConfig } from "@/types/table"
import type { ChitInfo, ChitLedger, ChitType } from "@/types/voucher"
import { getCurrentLang } from "@/utils/language"

import { VAT_INVOICE_COLUMNS } from "./vatInOutColumns"
import type { VatInvoiceRow } from "./vatInvoiceVoucherDraft"
import VatInOutBatchVoucherPopupContent from "./VatInOutBatchVoucherPopup"
import VatInOutCreateModePopupContent, { type VatVoucherCreationMode } from "./VatInOutCreateModePopup"
import VatInOutMergedVoucherPopupContent from "./VatInOutMergedVoucherPopup"
import VatInOutQuickBatchCreatePopup from "./VatInOutQuickBatchCreatePopup"

type InvoiceType = "BUY" | "SELL"

// Keep popup state mounted, but apply changing page props only when visible
// or on a visibility transition (including the close cleanup).
function skipHiddenPopupUpdate(previous: { visible: boolean }, next: { visible: boolean }): boolean {
  return !previous.visible && !next.visible
}

const FetchGdtVatPopup = memo(FetchGdtVatPopupContent, skipHiddenPopupUpdate)
const VatInOutBatchVoucherPopup = memo(VatInOutBatchVoucherPopupContent, skipHiddenPopupUpdate)
const VatInOutCreateModePopup = memo(VatInOutCreateModePopupContent, skipHiddenPopupUpdate)
const VatInOutMergedVoucherPopup = memo(VatInOutMergedVoucherPopupContent, skipHiddenPopupUpdate)

const TOOLBAR_FIELD = "page-toolbar__field"
const LOAD_INVENTORY_DETAIL_SETTING = "VAT_INOUT_LOAD_INVENTORY_DETAIL"
const VAT_INOUT_MENU_CODE = "VAT_INOUT_LIST"
const VAT_INOUT_REPORT_CODE = "TAX_VAT_INOUT_LIST"
const VAT_INOUT_SCREEN_CD = "/tax/vat/inout-list"
const VAT_INOUT_GRID_ID = "vat-inout-invoice-grid"
const VAT_INOUT_PRINT_PAGE_SIZE = 2147483647
const VAT_INVOICE_STATUS_OPTIONS = [
  { value: "", langKey: "VAT_INOUT_STATUS_ALL", fallback: "Tất cả" },
  { value: "1", langKey: "eInvoice_AdjustType_NM_1", fallback: "Hóa đơn mới" },
  { value: "2", langKey: "eInvoice_AdjustType_NM_3", fallback: "Hóa đơn thay thế" },
  { value: "3", langKey: "eInvoice_AdjustType_NM_5", fallback: "Hóa đơn điều chỉnh" },
  { value: "4", langKey: "eInvoice_AdjustType_NM_2", fallback: "Hóa đơn bị thay thế" },
  { value: "5", langKey: "eInvoice_AdjustType_NM_4", fallback: "Hóa đơn bị điều chỉnh" },
  { value: "6", langKey: "eInvoice_AdjustType_NM_6", fallback: "Hóa đơn hủy" },
  { value: "998", langKey: "eInvoice_AdjustType_NM_998", fallback: "Chưa có JSON" },
]

function isAlreadyLinked(row: VatInvoiceRow): boolean {
  const chitId = row.__CHIT_ID
  return Boolean(
    (row.AUTO_CHIT_CD ?? "").trim()
    || (Number.isSafeInteger(chitId) && chitId > 0),
  )
}

function resolveDateDisplay(value: unknown): string {
  const raw = String(value ?? "").trim()
  return formatYmdForDisplay(raw) || raw
}

export default function VatInOutListPage() {
  const exportName = useCurrentMenuExportName()
  const { lang, translate } = useContext(LanguageContext) as {
    lang?: string
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback((key: string, fallback: string) => translate ? translate(key, fallback) : fallback, [translate])
  const today = useMemo(() => new Date(), [])
  const monthStart = useMemo(() => new Date(today.getFullYear(), today.getMonth(), 1), [today])
  const initialParams = useMemo(() => new URLSearchParams(window.location.search), [])
  const [fromDate, setFromDate] = useState<Date | null>(() => normalizeYmd(initialParams.get("fromYmd")) ?? monthStart)
  const [toDate, setToDate] = useState<Date | null>(() => normalizeYmd(initialParams.get("toYmd")) ?? today)
  const [invoiceType, setInvoiceType] = useState<InvoiceType>(() => {
    const type = String(initialParams.get("type") ?? "").trim().toUpperCase()
    return type === "SELL" || type === "OUT" || type === "2" || type === "0" ? "SELL" : "BUY"
  })
  const [invoiceStatus, setInvoiceStatus] = useState(() => initialParams.get("status") ?? "")
  const searchTextRef = useRef("")
  const gridRef = useRef<dxDataGrid | null>(null)
  const rowsRef = useRef<VatInvoiceRow[]>([])
  const totalRecordsRef = useRef(0)
  const initialPagingEventsSuppressedRef = useRef(true)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE)
  const [listQuery, setListQuery] = useState<VatInOutQuery | null>(null)
  const [rows, setRows] = useState<VatInvoiceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [exporting, setExporting] = useState(false)
  const [selectedInvoices, setSelectedInvoices] = useState<VatInvoiceRow[]>([])
  const [gdtPopupVisible, setGdtPopupVisible] = useState(false)
  const [createModePopupVisible, setCreateModePopupVisible] = useState(false)
  const [loadInventoryDetail, setLoadInventoryDetail] = useState(false)
  const [inventorySettingLoading, setInventorySettingLoading] = useState(false)
  const [mergedVoucherPopupVisible, setMergedVoucherPopupVisible] = useState(false)
  const [batchPopupVisible, setBatchPopupVisible] = useState(false)
  const [quickBatchKind, setQuickBatchKind] = useState<"customer" | "product" | null>(null)
  const [linkedVoucher, setLinkedVoucher] = useState<{ record: ChitInfo; ledger: ChitLedger; chitType: ChitType } | null>(null)
  const [linkedVoucherLoading, setLinkedVoucherLoading] = useState(false)
  const linkedVoucherRequestRef = useRef(0)
  const statusOptions = useMemo(
    () => VAT_INVOICE_STATUS_OPTIONS.map((option) => ({
      value: option.value,
      label: t(option.langKey, option.fallback),
    })),
    [t],
  )
  const invoiceTypeOptions = useMemo(() => [
    { value: "BUY", label: t("VAT_INOUT_TYPE_BUY", "Hóa đơn đầu vào") },
    { value: "SELL", label: t("VAT_INOUT_TYPE_SELL", "Hóa đơn đầu ra") },
  ], [t])

  const invalidateInvoices = useVatInOutListInvalidate()
  const { data: listResponse, isLoading: isListLoading, isFetching: isListFetching,
    isError: isListError, error: listError } = useVatInOutListQuery(listQuery, pageNumber, pageSize)
  const dataSource = useMemo(() => createMirrorPagedStore<VatInvoiceRow>(
    "ROW_KEY", () => rowsRef.current, () => totalRecordsRef.current,
  ), [])

  const loadInvoices = useCallback(async (preserveSelection = false) => {
    const fromYmd = formatDateToYmd(fromDate)
    const toYmd = formatDateToYmd(toDate)
    if (!fromYmd || !toYmd) {
      notify(t("MSG_FROMDATE", "Vui lòng chọn khoảng ngày hợp lệ."), "warning", 2500)
      return
    }
    if (fromYmd > toYmd) {
      notify(t("INVALID_DATE_RANGE", "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."), "warning", 2500)
      return
    }
    setSelectedInvoices([])
    gridRef.current?.clearSelection()
    if (preserveSelection && listQuery) {
      await invalidateInvoices()
      return
    }
    setPageNumber(1)
    setListQuery({
      TYPE: invoiceType, FROM_YMD: fromYmd, TO_YMD: toYmd, STATUS: invoiceStatus,
      SEARCH_TEXT: searchTextRef.current, LANGUAGE: normalizeReportLanguage(lang || getCurrentLang()),
    })
    await invalidateInvoices()
  }, [fromDate, toDate, invoiceType, invoiceStatus, lang, t, listQuery, invalidateInvoices])

  useEffect(() => {
    setLoading(Boolean(listQuery) && (isListLoading || isListFetching))
  }, [listQuery, isListLoading, isListFetching])

  useEffect(() => {
    if (isListError && listError) {
      notify(getApiErrorMessage(listError, t("LOAD_FAILED", "Không tải được danh sách hóa đơn VAT.")), "error", 4000)
    }
  }, [isListError, listError, t])

  useEffect(() => {
    if (!listResponse || !listQuery) return
    const { totalRecords, totalPages, pageNumber: responsePageNumber, pageSize: responsePageSize } = listResponse
    if (totalRecords > 0 && pageNumber > totalPages) {
      setPageNumber(totalPages)
      return
    }
    if (totalRecords === 0 && pageNumber !== 1) {
      setPageNumber(1)
      return
    }
    const data = listResponse.data.map((row) => ({ ...row, ROW_KEY: row.mhdon }))
    rowsRef.current = data
    totalRecordsRef.current = totalRecords
    setRows(data)
    if (responsePageNumber > 0 && responsePageNumber !== pageNumber) setPageNumber(responsePageNumber)
    if (responsePageSize > 0 && responsePageSize !== pageSize) setPageSize(responsePageSize)
    setSelectedInvoices([])
    gridRef.current?.clearSelection()
    syncMirroredGridPage(gridRef.current, responsePageNumber, initialPagingEventsSuppressedRef)
  }, [listResponse, listQuery, pageNumber, pageSize])

  const handleOptionChanged = useCallback((event: OptionChangedEvent) => {
    if (!String(event.fullName).startsWith("paging.") || initialPagingEventsSuppressedRef.current || loading) return
    if (event.fullName === "paging.pageIndex") {
      setPageNumber(resolvePageNumber(Number(event.value ?? 0) + 1))
      setPageSize(resolvePageSize(event.component.pageSize()))
    }
    if (event.fullName === "paging.pageSize") {
      event.component.pageIndex(0)
      setPageNumber(1)
      setPageSize(resolvePageSize(event.value))
    }
  }, [loading])
  useEffect(() => {
    if (!createModePopupVisible) return
    let cancelled = false
    setInventorySettingLoading(true)
    void getUserSettingsBatch([LOAD_INVENTORY_DETAIL_SETTING])
      .then((settings) => {
        if (cancelled) return
        const value = settings.find((item) => item.KEY_NAME.toUpperCase() === LOAD_INVENTORY_DETAIL_SETTING)?.VALUE
        const enabled = ["1", "Y", "YES", "TRUE", "T"].includes(String(value ?? "0").trim().toUpperCase())
        setLoadInventoryDetail(enabled)
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          notify(getApiErrorMessage(error, t("LOAD_FAILED", "Không tải được tùy chọn lập chứng từ.")), "error", 4000)
        }
      })
      .finally(() => {
        if (!cancelled) setInventorySettingLoading(false)
      })
    return () => {
      cancelled = true
    }
  }, [createModePopupVisible, invoiceType, t])

  const handleLoadInventoryDetailChange = useCallback(async (value: boolean) => {
    const previousValue = loadInventoryDetail
    setLoadInventoryDetail(value)
    setInventorySettingLoading(true)
    try {
      await saveUserSettingsBulk([{
        KEY_NAME: LOAD_INVENTORY_DETAIL_SETTING,
        VALUE: value ? "1" : "0",
        NOTE: "Tải chi tiết hóa đơn VAT để rà mã hàng và hạch toán xuất kho",
      }])
    } catch (error) {
      setLoadInventoryDetail(previousValue)
      notify(getApiErrorMessage(error, t("SAVE_FAILED", "Không lưu được tùy chọn.")), "error", 4000)
    } finally {
      setInventorySettingLoading(false)
    }
  }, [invoiceType, loadInventoryDetail, t])

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent) => {
    const selectedRows = (event.selectedRowsData ?? []) as VatInvoiceRow[]
    const allEligibleRows = selectedRows.filter((row) => !isAlreadyLinked(row) && Boolean(row.mhdon.trim()))
    const eligibleRows = allEligibleRows.slice(0, 100)
    if (eligibleRows.length !== selectedRows.length) {
      const eligibleKeys = new Set(eligibleRows.map((row) => row.ROW_KEY))
      const blockedKeys = selectedRows.filter((row) => !eligibleKeys.has(row.ROW_KEY)).map((row) => row.ROW_KEY)
      if (blockedKeys.length) {
        event.component?.deselectRows(blockedKeys)
      }
      notify(allEligibleRows.length > 100
        ? t("VAT_BATCH_LIMIT_100", "Mỗi lần lập tối đa 100 hóa đơn.")
        : t("VAT_ALREADY_HAS_VOUCHER", "Hóa đơn đã liên kết chứng từ hoặc thiếu mã hóa đơn nên không thể chọn."), "warning", 2500)
    }
    setSelectedInvoices(eligibleRows)
  }, [t])

  const handleSearchStateChange = useCallback((value: string) => {
    searchTextRef.current = value
  }, [])

  const closeBatchPopup = useCallback(() => {
    setBatchPopupVisible(false)
    setSelectedInvoices([])
    gridRef.current?.clearSelection()
  }, [])

  const closeMergedVoucherPopup = useCallback(() => {
    setMergedVoucherPopupVisible(false)
    setSelectedInvoices([])
    gridRef.current?.clearSelection()
  }, [])

  const handleOpenLinkedVoucher = useCallback(async (row: VatInvoiceRow) => {
    const chitId = row.__CHIT_ID
    const rawChitType = (row.__CHIT_TYPE ?? "").trim().toUpperCase()
    const allowedTypes = invoiceType === "BUY" ? ["PO", "PS"] : ["SO"]
    if (!Number.isSafeInteger(chitId) || chitId <= 0 || !allowedTypes.includes(rawChitType)) {
      notify(t("SOURCE_VOUCHER_NOT_FOUND", "Không tìm thấy chứng từ liên kết để mở."), "warning", 3000)
      return
    }

    const sequence = linkedVoucherRequestRef.current + 1
    linkedVoucherRequestRef.current = sequence
    setLinkedVoucher(null)
    setLinkedVoucherLoading(true)

    try {
      const chitType = rawChitType as ChitType
      const ledger: ChitLedger = invoiceType === "BUY" ? "AP" : "AR"
      const result = await getChits(ledger, chitType, {
        chitId,
        INCLUDE_DETAILS: true,
        pageNumber: 1,
        pageSize: 1,
      })
      if (linkedVoucherRequestRef.current !== sequence) return
      const record = normalizeChitRows(result.data, chitType)[0]
      if (!record) throw new Error("Không tìm thấy chứng từ liên kết.")
      setLinkedVoucher({ record, ledger, chitType })
    } catch (error) {
      if (linkedVoucherRequestRef.current === sequence) {
        notify(getApiErrorMessage(error, t("LOAD_FAILED", "Không tải được chứng từ.")), "error", 4000)
      }
    } finally {
      if (linkedVoucherRequestRef.current === sequence) setLinkedVoucherLoading(false)
    }
  }, [invoiceType, t])

  const closeLinkedVoucher = useCallback(() => {
    linkedVoucherRequestRef.current += 1
    setLinkedVoucher(null)
    setLinkedVoucherLoading(false)
  }, [])

  const handleLinkedVoucherSave = useCallback(async (_record: ChitInfo) => {}, [])

  const handleExportExcel = useCallback(async () => {
    if (rows.length === 0) {
      notify(t("NO_DATA_TO_EXPORT", "Không có dữ liệu để xuất."), "warning", 2500)
      return
    }

    const hiddenFields = new Set(["MHDON", "AUTO_CHIT_CD", "ROW_KEY"])
    const columnsByField = new Map(
      VAT_INVOICE_COLUMNS.map((column) => [column.field.toUpperCase(), column] as const),
    )
    const visibleGridColumns = gridRef.current?.getVisibleColumns?.() ?? []
    const exportColumns: ColumnConfig[] = visibleGridColumns.flatMap((gridColumn, index) => {
      const fieldName = String(gridColumn.dataField ?? "").trim()
      const normalizedFieldName = fieldName.toUpperCase()
      const definition = columnsByField.get(normalizedFieldName)
      if (!fieldName || hiddenFields.has(normalizedFieldName) || !definition) return []

      return [{
        id: definition.field,
        dataField: definition.field,
        displayName: String(gridColumn.caption || t(definition.field.toUpperCase(), definition.caption) || fieldName),
        width: Number(gridColumn.width ?? definition.width) || definition.width || 8,
        visible: true,
        pinned: false,
        originalOrder: index,
      }]
    })

    if (exportColumns.length === 0) {
      notify(t("NO_COLUMNS_TO_EXPORT", "Không có cột hiển thị để xuất."), "warning", 2500)
      return
    }

    try {
      if (!listQuery) {
        return
      }
      setExporting(true)
      const data = await getVatInOutExportData(listQuery)
      const exportRows = data.map((row) => ({ ...row, ROW_KEY: row.mhdon }))
      const fileName = exportName.fileName("xlsx")
      const sheetName = exportName.sheetName()
      await exportToExcel(exportRows, exportColumns, fileName, sheetName)
    } catch (error) {
      const message = getApiErrorMessage(error, t("EXPORT_FAILED", "Không xuất được Excel."))
      notify(message, "error", 4000)
    } finally {
      setExporting(false)
    }
  }, [exportName, rows, t, listQuery])

  const handleExportPdf = useCallback(() => {
    const fromYmd = formatDateToYmd(fromDate)
    const toYmd = formatDateToYmd(toDate)
    if (!fromYmd || !toYmd || fromYmd > toYmd) {
      notify(t("INVALID_DATE_RANGE", "Vui lòng chọn khoảng ngày hợp lệ."), "warning", 3000)
      return
    }

    const searchText = searchTextRef.current.trim()
    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      reportCode: VAT_INOUT_REPORT_CODE,
      menuCode: VAT_INOUT_MENU_CODE,
      screenCd: VAT_INOUT_SCREEN_CD,
      gridId: VAT_INOUT_GRID_ID,
      fromYmd,
      toYmd,
      type: invoiceType,
      status: invoiceStatus || undefined,
      searchText: searchText || undefined,
      pageNumber: 1,
      pageSize: VAT_INOUT_PRINT_PAGE_SIZE,
      language: normalizeReportLanguage(lang || getCurrentLang()),
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }, [fromDate, toDate, invoiceType, invoiceStatus, lang, t])
  const chooseVoucherCreationMode = useCallback((mode: VatVoucherCreationMode) => {
    if (mode === "MERGED") {
      const currencies = new Set(selectedInvoices.map((invoice) => (invoice.dvtte ?? "VND").trim().toUpperCase() || "VND"))
      if (currencies.size > 1) {
        notify(t("VAT_BATCH_MIXED_CURRENCY", "Không thể gộp hóa đơn khác loại tiền vào cùng một chứng từ."), "error", 4000)
        return
      }
    }
    setCreateModePopupVisible(false)
    if (mode === "MERGED") setMergedVoucherPopupVisible(true)
    else setBatchPopupVisible(true)
  }, [selectedInvoices, loadInventoryDetail, t])

  const columns = useMemo(() => {
    const invoiceColumns = VAT_INVOICE_COLUMNS.map((column) => {
      const field = column.field
      const normalized = field.trim().toUpperCase()
      const hidden = Boolean(column.hidden)
      const dateColumn = column.type === "date"
      return (
        <Column
          key={field}
          dataField={field}
          caption={t(field.toUpperCase(), column.caption)}
          dataType={column.type === "number" ? "number" : "string"}
          format={column.type === "number" ? "#,##0.##" : undefined}
          width={column.width}
          visible={!hidden}
          allowSorting
          allowFiltering
          customizeText={dateColumn ? (cell) => resolveDateDisplay(cell.value) : undefined}
          cellRender={normalized === "CHIT_NO" ? (cell: { data: VatInvoiceRow }) => {
            const value = (cell.data.CHIT_NO ?? "").trim()
            if (!value) return null
            const chitId = cell.data.__CHIT_ID
            if (!Number.isSafeInteger(chitId) || chitId <= 0) return value
            return (
              <button
                type="button"
                className="cursor-pointer text-blue-700 underline decoration-blue-400 underline-offset-2 hover:text-blue-900 focus-visible:rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500"
                aria-label={`${t("OPEN_VOUCHER", "Mở chứng từ")} ${value}`}
                onClick={(event) => {
                  event.stopPropagation()
                  void handleOpenLinkedVoucher(cell.data)
                }}
              >
                {value}
              </button>
            )
          } : undefined}
        />
      )
    })
    return invoiceColumns
  }, [handleOpenLinkedVoucher, t])

  const toolbarFilters = (
    <div className="flex flex-wrap items-end gap-2">
      <SelectBox
        className={TOOLBAR_FIELD}
        dataSource={invoiceTypeOptions}
        displayExpr="label"
        valueExpr="value"
        value={invoiceType}
        stylingMode="outlined"
        label={t("VAT_INOUT_TYPE", "Loại hóa đơn")}
        labelMode="floating"
        width={190}
        onValueChanged={(event) => setInvoiceType(String(event.value ?? "BUY") as InvoiceType)}
      />
      <SelectBox
        className={TOOLBAR_FIELD}
        dataSource={statusOptions}
        displayExpr="label"
        valueExpr="value"
        value={invoiceStatus}
        stylingMode="outlined"
        label={t("TTHAI", "Trạng thái")}
        labelMode="floating"
        width={210}
        onValueChanged={(event) => setInvoiceStatus(String(event.value ?? ""))}
      />
    </div>
  )

  const content = (
    <MasterDataPageLayout
      toolbar={
        <GridToolbar
          gridRef={gridRef}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          showDateRange={true}
          onRangeSearch={() => void loadInvoices()}
          showAdd={false}
          showRefresh={true}
          onRefresh={() => void loadInvoices()}
          showColumnChooser={true}
          showExportPdf={true}
          onExportPdf={handleExportPdf}
          showExportXlsx={true}
          exportXlsxDisabled={loading || exporting || rows.length === 0}
          onExportXlsx={() => void handleExportExcel()}
          showImport={false}
          showDelete={false}
          showSearch={true}
          searchLeadingContent={toolbarFilters}
          onSearchStateChange={handleSearchStateChange}
          onSearchSubmit={() => void loadInvoices()}
          customItems={[
            {
              key: "fetch-gdt-vat",
              icon: "download",
              text: t("FETCH_FROM_GDT", "Lấy dữ liệu GDT"),
              stylingMode: "outlined",
              disabled: loading,
              onClick: () => setGdtPopupVisible(true),
            },
            {
              key: "create-vouchers",
              icon: "plus",
              text: t("VAT_PROCESS_VOUCHERS", "Xử lý chứng từ"),
              stylingMode: "outlined",
              disabled: selectedInvoices.length === 0 || loading,
              onClick: () => {
                setCreateModePopupVisible(true)
                          },
            },
          ]}
        />
      }
      overlays={
        <>

          <VatInOutCreateModePopup
            visible={createModePopupVisible}
            invoiceType={invoiceType}
            invoiceCount={selectedInvoices.length}
            loadInventoryDetail={loadInventoryDetail}
            inventorySettingLoading={inventorySettingLoading}
            onLoadInventoryDetailChange={(value) => void handleLoadInventoryDetailChange(value)}
            quickCreateEnabled={selectedInvoices.length > 0 && !loading}
            onQuickCreateCustomer={() => {
              setCreateModePopupVisible(false)
              setQuickBatchKind("customer")
            }}
            onQuickCreateProduct={() => {
              setCreateModePopupVisible(false)
              setQuickBatchKind("product")
            }}
            onChoose={chooseVoucherCreationMode}
            onClose={() => setCreateModePopupVisible(false)}
          />

          <VatInOutMergedVoucherPopup
            visible={mergedVoucherPopupVisible}
            invoiceType={invoiceType}
            invoices={selectedInvoices}
            loadInventoryDetail={loadInventoryDetail}
            onClose={closeMergedVoucherPopup}
            onSaved={() => loadInvoices(true)}
          />

          <FetchGdtVatPopup
            visible={gdtPopupVisible}
            invoiceType={invoiceType}
            fromDate={fromDate}
            toDate={toDate}
            onClose={() => setGdtPopupVisible(false)}
            onFetched={() => loadInvoices()}
          />

          <VatInOutBatchVoucherPopup
            visible={batchPopupVisible}
            invoiceType={invoiceType}
            invoices={selectedInvoices}
            loadInventoryDetail={loadInventoryDetail}
            onClose={closeBatchPopup}
            onSaved={() => loadInvoices(true)}
          />

          <VatInOutQuickBatchCreatePopup
            visible={Boolean(quickBatchKind)}
            kind={quickBatchKind}
            invoiceType={invoiceType}
            invoices={selectedInvoices}
            onClose={() => setQuickBatchKind(null)}
          />

          {linkedVoucher ? (
            <ChitEditorPopup
              visible
              value={linkedVoucher.record}
              ledger={linkedVoucher.ledger}
              chitType={linkedVoucher.chitType}
              isUpdate
              readOnly
              loading={false}
              onClose={closeLinkedVoucher}
              onSave={handleLinkedVoucherSave}
            />
          ) : null}

        </>
      }
    >

      <BaseDataGrid<VatInvoiceRow>
        enableModifierSelection
        enableDragSelection
        dataSource={dataSource}
        keyExpr="ROW_KEY"
        menuCode={VAT_INOUT_MENU_CODE}
        screenCd={VAT_INOUT_SCREEN_CD}
        gridId={VAT_INOUT_GRID_ID}
        selectMode="multiple"
        selectAllMode="page"
        selectByClick={false}
        actionButtons={false}
        pagingEnabled={true}
        showPager={true}
        pageSize={pageSize}
        defaultPageSize={DEFAULT_PAGE_SIZE}
        remoteOperations={SERVER_PAGING_REMOTE_OPERATIONS}
        loadPanelEnabled={false}
        onOptionChanged={handleOptionChanged}
        onInitialized={(event) => {
          gridRef.current = event.component ?? null
          if (gridRef.current) syncMirroredGridPage(gridRef.current, pageNumber, initialPagingEventsSuppressedRef)
        }}
        onSelectionChanged={handleSelectionChanged}
      >
        {columns}
      </BaseDataGrid>

      <LoadPanel visible={loading || exporting || linkedVoucherLoading} showIndicator={true} showPane={true} shading={true} shadingColor="rgba(0, 0, 0, 0.15)" />
    </MasterDataPageLayout>
  )

  return <DxPage>{content}</DxPage>
}

