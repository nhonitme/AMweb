import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Column } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { SelectionChangedEvent } from "devextreme/ui/data_grid"

import { getConfiguredReportPreview } from "@/api/configuredReportPreviewApi"
import type { ConfiguredReportPreview, ReportPreviewColumn, ReportPreviewCellValue } from "@/api/configuredReportPreviewApi"
import { getChits } from "@/api/voucherApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { getUserSettingsBatch, saveUserSettingsBulk } from "@/api/userSettingApi"
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid"
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout"
import ReportPdfExportPopup, { type ReportPrintTemplateCode } from "@/components/reports/ReportPdfExportPopup"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import { exportToExcel } from "@/lib/excelUtils"
import { useMenuExportName } from "@/hooks/useMenuExportName"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { getStoredGridTemplateId } from "@/lib/sysGridColumnTemplateStorage"
import { formatDateToYmd, formatYmdForDisplay, normalizeYmd } from "@/pages/Accounting/accountingDateUtils"
import FetchGdtVatPopup from "@/pages/Reports/components/FetchGdtVatPopup"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import { normalizeReportLanguage, type ReportLanguageCode } from "@/pages/Reports/reportLanguage"
import ChitEditorPopup from "@/pages/VoucherManagement/components/ChitEditorPopup"
import { normalizeChitRows } from "@/pages/VoucherManagement/chitUtils"
import type { ColumnConfig } from "@/types/table"
import type { ChitInfo, ChitLedger, ChitType } from "@/types/voucher"
import { getCurrentLang } from "@/utils/language"

import VatInOutBatchVoucherPopup from "./VatInOutBatchVoucherPopup"
import VatInOutCreateModePopup, { type VatVoucherCreationMode } from "./VatInOutCreateModePopup"
import VatInOutMergedVoucherPopup from "./VatInOutMergedVoucherPopup"
import VatInOutQuickBatchCreatePopup from "./VatInOutQuickBatchCreatePopup"

type InvoiceType = "BUY" | "SELL"
type VatInvoiceRow = Record<string, ReportPreviewCellValue> & { ROW_KEY: string }

const TOOLBAR_FIELD = "page-toolbar__field"
const LOAD_INVENTORY_DETAIL_SETTING = "VAT_INOUT_LOAD_INVENTORY_DETAIL"
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

function readField(row: VatInvoiceRow, fieldName: string): ReportPreviewCellValue {
  const actual = Object.keys(row).find((key) => key.trim().toUpperCase() === fieldName.trim().toUpperCase())
  return actual ? row[actual] : null
}

function getInvoiceId(values: Record<string, ReportPreviewCellValue>, fallback: string): string {
  const key = Object.keys(values).find((field) => field.trim().toUpperCase() === "MHDON")
  return String((key ? values[key] : "") ?? "").trim() || fallback
}

function isAlreadyLinked(row: VatInvoiceRow): boolean {
  const chitId = Number(readField(row, "__CHIT_ID"))
  return Boolean(
    String(readField(row, "AUTO_CHIT_CD") ?? "").trim()
    || (Number.isSafeInteger(chitId) && chitId > 0),
  )
}

function resolveColumnType(column: ReportPreviewColumn): "string" | "number" | "date" | "boolean" {
  const normalized = String(column.DATA_TYPE ?? "string").toLowerCase()
  if (normalized === "number" || normalized === "date" || normalized === "boolean") return normalized
  return "string"
}

function resolveDateDisplay(value: unknown): string {
  const raw = String(value ?? "").trim()
  return formatYmdForDisplay(raw) || raw
}

export default function VatInOutListPage() {
  const exportName = useMenuExportName("VAT_INOUT_LIST")
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
  const requestRef = useRef<{ controller: AbortController; sequence: number } | null>(null)
  const requestSequenceRef = useRef(0)
  const [preview, setPreview] = useState<ConfiguredReportPreview | null>(null)
  const [rows, setRows] = useState<VatInvoiceRow[]>([])
  const [loading, setLoading] = useState(false)
  const [pdfExportPopupVisible, setPdfExportPopupVisible] = useState(false)
  const [exportLanguage, setExportLanguage] = useState<ReportLanguageCode>(
    () => normalizeReportLanguage(lang ?? getCurrentLang()),
  )
  const [exportPrintTemplate, setExportPrintTemplate] = useState<ReportPrintTemplateCode>("BOOK")
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
  const printTemplateOptions = useMemo(
    () => [
      { code: "BOOK", label: t("REPORT_PRINT_TEMPLATE_BOOK", "Mẫu in sổ") },
      { code: "DEFAULT_GRID", label: t("REPORT_PRINT_TEMPLATE_DEFAULT_GRID", "In mặc định") },
    ] satisfies { code: ReportPrintTemplateCode; label: string }[],
    [t],
  )

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

    requestRef.current?.controller.abort()
    const controller = new AbortController()
    const sequence = requestSequenceRef.current + 1
    requestSequenceRef.current = sequence
    requestRef.current = { controller, sequence }
    setLoading(true)
    if (!preserveSelection) {
      setSelectedInvoices([])
      gridRef.current?.clearSelection()
      setPreview(null)
      setRows([])
    }

    try {
      const result = await getConfiguredReportPreview({
        companyCd: getCurrentCompanyCd() || undefined,
        reportCode: "TAX_VAT_INOUT_LIST",
        menuCode: "VAT_INOUT_LIST",
        fromYmd,
        toYmd,
        type: invoiceType,
        status: invoiceStatus,
        keyword: searchTextRef.current,
        searchText: searchTextRef.current,
        language: normalizeReportLanguage(lang || getCurrentLang()),
        gridId: "VAT_INOUT_LIST",
      }, { signal: controller.signal })
      if (requestRef.current?.sequence !== sequence) return
      setPreview(result)
      setRows(result.ROWS.map((row) => ({
        ...row.VALUES,
        ROW_KEY: getInvoiceId(row.VALUES, row.ROW_KEY),
      })))
    } catch (error) {
      if (controller.signal.aborted) return
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Không tải được danh sách hóa đơn VAT.")), "error", 4000)
    } finally {
      if (requestRef.current?.sequence === sequence) {
        requestRef.current = null
        setLoading(false)
      }
    }
  }, [fromDate, invoiceStatus, invoiceType, lang, t, toDate])

  useEffect(() => {
    return () => requestRef.current?.controller.abort()
  }, [])

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
      .finally(() => { if (!cancelled) setInventorySettingLoading(false) })
    return () => { cancelled = true }
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
    const allEligibleRows = selectedRows.filter((row) => !isAlreadyLinked(row) && Boolean(String(readField(row, "mhdon") ?? "").trim()))
    const eligibleRows = allEligibleRows.slice(0, 100)
    if (eligibleRows.length !== selectedRows.length) {
      const eligibleKeys = new Set(eligibleRows.map((row) => row.ROW_KEY))
      const blockedKeys = selectedRows.filter((row) => !eligibleKeys.has(row.ROW_KEY)).map((row) => row.ROW_KEY)
      if (blockedKeys.length) event.component?.deselectRows(blockedKeys)
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
    const chitId = Number(readField(row, "__CHIT_ID"))
    const rawChitType = String(readField(row, "__CHIT_TYPE") ?? "").trim().toUpperCase()
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
    if (!preview?.ROWS.length || rows.length === 0) {
      notify(t("NO_DATA_TO_EXPORT", "Không có dữ liệu để xuất."), "warning", 2500)
      return
    }

    const hiddenFields = new Set(["MHDON", "AUTO_CHIT_CD", "ROW_KEY"])
    const previewColumnsByField = new Map(
      preview.COLUMNS.map((column) => [column.FIELD_NAME.trim().toUpperCase(), column] as const),
    )
    const visibleGridColumns = gridRef.current?.getVisibleColumns?.() ?? []
    const exportColumns: ColumnConfig[] = visibleGridColumns.flatMap((gridColumn, index) => {
      const fieldName = String(gridColumn.dataField ?? "").trim()
      const normalizedFieldName = fieldName.toUpperCase()
      const previewColumn = previewColumnsByField.get(normalizedFieldName)
      if (!fieldName || hiddenFields.has(normalizedFieldName) || !previewColumn) return []

      return [{
        id: previewColumn.COLUMN_KEY || previewColumn.FIELD_NAME,
        dataField: previewColumn.FIELD_NAME,
        displayName: String(gridColumn.caption || previewColumn.CAPTION || previewColumn.LABEL_TEXT || fieldName),
        width: Number(gridColumn.width ?? previewColumn.WIDTH) || previewColumn.WIDTH || 8,
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
      await exportToExcel(rows, exportColumns, exportName.fileName("xlsx"), exportName.sheetName())
    } catch (error) {
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Không xuất được Excel.")), "error", 4000)
    }
  }, [exportName, preview, rows, t])

  const handleExportPdf = useCallback((language: ReportLanguageCode, printTemplate: ReportPrintTemplateCode) => {
    const fromYmd = formatDateToYmd(fromDate)
    const toYmd = formatDateToYmd(toDate)
    if (!fromYmd || !toYmd) {
      notify(t("MSG_FROMDATE", "Vui lòng chọn khoảng ngày hợp lệ."), "warning", 2500)
      return
    }
    if (fromYmd > toYmd) {
      notify(t("INVALID_DATE_RANGE", "Ngày bắt đầu phải trước hoặc bằng ngày kết thúc."), "warning", 3000)
      return
    }

    const reportParams = {
      companyCd: getCurrentCompanyCd() || undefined,
      reportCode: "TAX_VAT_INOUT_LIST",
      menuCode: "VAT_INOUT_LIST",
      fromYmd,
      toYmd,
      type: invoiceType,
      status: invoiceStatus,
      keyword: searchTextRef.current,
      searchText: searchTextRef.current,
      language: normalizeReportLanguage(language),
      ...(printTemplate === "DEFAULT_GRID"
        ? {
            printLayout: "DEFAULT_GRID",
            printGridId: "TAX_VAT_INOUT_LIST",
            printTemplateId: getStoredGridTemplateId("TAX_VAT_INOUT_LIST") || undefined,
          }
        : { printLayout: printTemplate }),
    }
    const targetUrl = buildReportViewerPageUrl(reportParams)
    setPdfExportPopupVisible(false)
    setExportLanguage(normalizeReportLanguage(language))
    setExportPrintTemplate(printTemplate)
    if (!openReportViewerPage(targetUrl, t("VAT_INOUT_LIST", "Danh sách hóa đơn mua vào/bán ra"))) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }, [fromDate, invoiceStatus, invoiceType, t, toDate])

  const chooseVoucherCreationMode = useCallback((mode: VatVoucherCreationMode) => {
    if (mode === "MERGED") {
      const currencies = new Set(selectedInvoices.map((invoice) => String(readField(invoice, "DVTTE") ?? "VND").trim().toUpperCase() || "VND"))
      if (currencies.size > 1) {
        notify(t("VAT_BATCH_MIXED_CURRENCY", "Không thể gộp hóa đơn khác loại tiền vào cùng một chứng từ."), "error", 4000)
        return
      }
    }
    setCreateModePopupVisible(false)
    if (mode === "MERGED") setMergedVoucherPopupVisible(true)
    else setBatchPopupVisible(true)
  }, [selectedInvoices, t])

  const columns = useMemo(() => {
    const dynamicColumns = (preview?.COLUMNS ?? []).map((column) => {
      const field = column.FIELD_NAME
      const normalized = field.trim().toUpperCase()
      const hidden = normalized === "MHDON" || normalized === "AUTO_CHIT_CD" || normalized === "ROW_KEY"
      const dateColumn = /(^|_)(YMD|DATE|TDLAP|CHIT_YMD)$/.test(normalized) || normalized === "TDLAP"
      return (
        <Column
          key={field}
          dataField={field}
          caption={column.CAPTION || column.LABEL_TEXT || field}
          dataType={dateColumn ? "string" : resolveColumnType(column)}
          width={column.WIDTH > 0 ? column.WIDTH : undefined}
          visible={!hidden}
          allowSorting
          allowFiltering
          customizeText={dateColumn ? (cell) => resolveDateDisplay(cell.value) : undefined}
          cellRender={normalized === "CHIT_NO" ? (cell: { data: VatInvoiceRow }) => {
            const value = String(readField(cell.data, field) ?? "").trim()
            if (!value) return null
            const chitId = Number(readField(cell.data, "__CHIT_ID"))
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
    return dynamicColumns
  }, [handleOpenLinkedVoucher, preview, t])

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
          onExportPdf={() => setPdfExportPopupVisible(true)}
          showExportXlsx={true}
          exportXlsxDisabled={loading || rows.length === 0}
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
          <ReportPdfExportPopup
            visible={pdfExportPopupVisible}
            defaultLanguage={exportLanguage}
            defaultPrintTemplate={exportPrintTemplate}
            onHide={() => setPdfExportPopupVisible(false)}
            onConfirm={handleExportPdf}
            description={t("VAT_INOUT_LIST", "Danh sách hóa đơn mua vào/bán ra")}
            printTemplateOptions={printTemplateOptions}
            printTemplateLookupVisible={true}
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
          />
        </>
      }
    >
      <BaseDataGrid<VatInvoiceRow>
        enableModifierSelection
        enableDragSelection
        dataSource={rows}
        keyExpr="ROW_KEY"
        menuCode="VAT_INOUT_LIST"
        screenCd="/tax/vat/inout-list"
        gridId="vat-inout-invoice-grid"
        selectMode="multiple"
        selectAllMode="page"
        selectByClick={false}
        actionButtons={false}
        pagingEnabled={false}
        showPager={false}
        onInitialized={(event) => { gridRef.current = event.component ?? null }}
        onSelectionChanged={handleSelectionChanged}
      >
        {columns}
      </BaseDataGrid>
      <LoadPanel visible={loading || linkedVoucherLoading} showIndicator={true} showPane={true} shading={true} shadingColor="rgba(0, 0, 0, 0.15)" />
    </MasterDataPageLayout>
  )

  return <DxPage>{content}</DxPage>
}
