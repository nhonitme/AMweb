import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import DataGrid, {
  Column,
  ColumnFixing,
  FilterRow,
  HeaderFilter,
  MasterDetail,
  Scrolling,
  StateStoring,
  Summary,
  TotalItem,
} from "devextreme-react/data-grid"
import SelectBox from "devextreme-react/select-box"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"

import GridColumnSettingsPopup from "@/components/datagrid/GridColumnSettingsPopup"
import { useGridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"

import {
  getServiceAllocationCheck,
  type ServiceAllocationVoucher,
  type ServiceAllocationDetail,
  type ServiceAllocationFilters,
} from "@/api/serviceAllocationCheckApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { exportToExcel } from "@/lib/excelUtils"
import type { ColumnConfig } from "@/types/table"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import { ReportToolbar } from "@/components/toolbar/ReportToolbar"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { useSysGridColumnSettings } from "@/lib/sysGridColumnSettingContext"
import { formatDateToYmd, formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import type { CustomerExt } from "@/types/customerExt"
import type { SysGridColumn } from "@/types/sysGridColumnSetting"
import "./ServiceAllocationCheckPage.scss"

const GRID_ID = "AP_UTILITY_CHECK_ALLOC"
const DETAIL_GRID_ID = "AP_UTILITY_CHECK_ALLOC_DETAIL"
const FORMAT_NUMBER = "#,##0"
const TOOLBAR_FIELD = "page-toolbar__field"

type ColumnDef = {
  field: string
  caption: string
  width: number
  type?: "date" | "number" | "string"
  alignment?: "center" | "left" | "right"
  format?: string
}

const masterColumnDefs: ColumnDef[] = [
  { field: "SERVICES_CHIT_NO", caption: "Số chứng từ", width: 150 },
  { field: "CHIT_YMD", caption: "Ngày giao dịch", width: 120, type: "date", format: "dd/MM/yyyy" },
  { field: "VAT_CHIT_NO", caption: "Số hóa đơn", width: 135 },
  { field: "VAT_YMD", caption: "Ngày hóa đơn", width: 125, type: "date", format: "dd/MM/yyyy" },
  { field: "CUSTOMER_CD", caption: "Mã khách hàng", width: 140 },
  { field: "CONTENTS", caption: "Diễn giải", width: 350 },
  { field: "TOTAL_COST", caption: "Tổng chi phí", width: 160, type: "number", alignment: "right", format: FORMAT_NUMBER },
  { field: "COST_NOT_YET_ALLOCATED", caption: "Chi phí chưa phân bổ", width: 185, type: "number", alignment: "right", format: FORMAT_NUMBER },
  { field: "COST_REMAIN", caption: "Chi phí còn lại", width: 175, type: "number", alignment: "right", format: FORMAT_NUMBER },
  { field: "COST_NOW_ALLOCATES", caption: "Chi phí phân bổ kỳ này", width: 185, type: "number", alignment: "right", format: FORMAT_NUMBER },
]

// Schema fields returned by the second result set of sp_chit_inventory_service_get.
// sys_grid_column decides which of these columns are displayed and in what order.
const detailColumnDefs: ColumnDef[] = [
  { field: "SERVICES_CHIT_ID", caption: "Mã ID chứng từ dịch vụ", width: 100, type: "number" },
  { field: "SERVICES_CHIT_CD", caption: "Mã chứng từ dịch vụ", width: 130 },
  { field: "INVENTORY_CHIT_ID", caption: "Mã ID chứng từ phân bổ", width: 110, type: "number" },
  { field: "INVENTORY_CHIT_CD", caption: "Mã chứng từ phân bổ", width: 150 },
  { field: "CHIT_TYPE", caption: "Loại chứng từ", width: 115, type: "string" },
  { field: "CHIT_NO", caption: "Số chứng từ", width: 165 },
  { field: "CHIT_YMD", caption: "Ngày giao dịch", width: 140, type: "date", format: "dd/MM/yyyy" },
  { field: "AMOUNT_SHARE", caption: "Tiền phân bổ", width: 185, type: "number", alignment: "right", format: FORMAT_NUMBER },
]

const defaultDetailFields = new Set(["CHIT_NO", "CHIT_YMD", "AMOUNT_SHARE"])

function getColumns(
  columns: ColumnDef[],
  settings: SysGridColumn[],
  translate: (key: string, fallback: string) => string,
): Array<ColumnDef & { visible: boolean; allowHiding: boolean }> {
  const available = new Map(columns.map((column) => [column.field.toUpperCase(), column]))
  if (settings.length === 0) {
    return columns.map((column) => ({ ...column, visible: column.field !== "COST_NOW_ALLOCATES", allowHiding: true }))
  }

  return settings
    .filter((column) => available.has(column.FIELD_NAME.toUpperCase()))
    .sort((a, b) => (a.VISIBLE_INDEX ?? 9999) - (b.VISIBLE_INDEX ?? 9999))
    .map((setting) => {
      const original = available.get(setting.FIELD_NAME.toUpperCase())!
      return {
        ...original,
        caption: translate(setting.LABEL_TEXT || original.field, setting.CAPTION || original.caption),
        width: setting.COLUMN_WIDTH ?? original.width,
        visible: setting.IS_VISIBLE !== "0",
        allowHiding: setting.ALLOW_HIDING !== "0",
        alignment: (setting.ALIGN === "center" || setting.ALIGN === "right" || setting.ALIGN === "left"
          ? setting.ALIGN : original.alignment),
        format: original.type === "date"
          ? "dd/MM/yyyy"
          : (setting.FORMAT_TYPE === "number0" ? FORMAT_NUMBER : original.format),
      }
    })
}

function formatCustomer(item: CustomerExt | null | undefined): string {
  if (!item) return ""
  const name = item.CUSTOMER_NM_VIET || item.CUSTOMER_NM_ENG
    || item.CUSTOMER_NM_KOR || item.CUSTOMER_NM_CHINA || ""
  return [item.CUSTOMER_CD, name].filter(Boolean).join(" - ")
}

function ServiceAllocationDetailGrid({ data }: {
  data: { data: ServiceAllocationVoucher }
}) {
  const { getGridColumnSettings } = useSysGridColumnSettings()
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate])
  const columns = useMemo(() => {
    const settings = getGridColumnSettings(DETAIL_GRID_ID)
    // While sys_grid_column is not configured/loaded, retain the original
    // three-column detail view rather than revealing technical ID fields.
    const schema = settings.length > 0
      ? detailColumnDefs
      : detailColumnDefs.filter((column) => defaultDetailFields.has(column.field))
    return getColumns(schema, settings, t)
  }, [getGridColumnSettings, t])
  const rows = useMemo(
    () => (data.data.ALLOCATIONS ?? []).map((row: ServiceAllocationDetail, index) => ({
      ...row,
      DETAIL_ROW_KEY: `${data.data.SERVICES_CHIT_ID}:${index}`,
    })),
    [data.data.ALLOCATIONS, data.data.SERVICES_CHIT_ID],
  )

  return (
    <div className="mx-2 mb-2 rounded border border-gray-200 bg-white p-2">
      <div className="mb-2 text-sm font-medium">{t("SERVICE_COST_ALLOCATION", "Phân bổ chi phí")}</div>
      <DataGrid
        dataSource={rows}
        keyExpr="DETAIL_ROW_KEY"
        showBorders
        rowAlternationEnabled
        columnAutoWidth={false}
        allowColumnResizing
        columnResizingMode="widget"
        noDataText={t("NO_DATA", "Không có dữ liệu phân bổ")}
      >
        <FilterRow visible={false} />
        <HeaderFilter visible />
        <Scrolling mode="standard" showScrollbar="always" />
        {columns.map((column) => (
          <Column
            key={column.field}
            dataField={column.field}
            caption={column.caption}
            dataType={column.type}
            width={column.width}
            format={column.format}
            alignment={column.alignment}
            visible={column.visible}
            allowHiding={false}
            showInColumnChooser={false}
          />
        ))}
        {/* <Summary>
          <TotalItem column="AMOUNT_SHARE" summaryType="sum" valueFormat={FORMAT_NUMBER} displayFormat="{0}" />
        </Summary> */}
      </DataGrid>
    </div>
  )
}

export default function ServiceAllocationCheckPage() {
  const [fromDate, setFromDate] = useState<Date | null>(() => {
    const today = new Date()
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [toDate, setToDate] = useState<Date | null>(() => new Date())
  const [customerId, setCustomerId] = useState<number | null>(null)
  const [allocationFilter, setAllocationFilter] = useState<0 | 1 | null>(null)
  const [rows, setRows] = useState<ServiceAllocationVoucher[]>([])
  const [loading, setLoading] = useState(false)
  const [searchText, setSearchText] = useState("")
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsLoading, setColumnSettingsLoading] = useState(false)
  const [columnSettingsItems, setColumnSettingsItems] = useState<GridColumnSettingEditorItem[]>([])
  const requestVersion = useRef(0)
  const appliedFiltersRef = useRef<ServiceAllocationFilters | null>(null)
  const masterGridRef = useRef<dxDataGrid | null>(null)

  const { getGridColumnSettings } = useSysGridColumnSettings()
  const columnSettingState = useGridColumnSettingState({
    gridId: GRID_ID,
    hideColumnsMissingFromSettings: true,
  })
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate])
  const columns = useMemo(
    () => getColumns(masterColumnDefs, getGridColumnSettings(GRID_ID, columnSettingState.currentTemplateId), t),
    [getGridColumnSettings, columnSettingState.currentTemplateId, t],
  )

  const visibleRows = useMemo(() => {
    const search = searchText.trim().toLocaleLowerCase()
    if (!search) return rows
    return rows.filter((row) =>
      [
        row.SERVICES_CHIT_NO,
        row.SERVICES_CHIT_CD,
        row.CUSTOMER_CD,
        row.VAT_CHIT_NO,
        row.CONTENTS,
        row.TOTAL_COST,
        row.COST_NOT_YET_ALLOCATED,
        row.COST_REMAIN,
      ].some((value) => String(value ?? "").toLocaleLowerCase().includes(search)),
    )
  }, [rows, searchText])

  const statuses = useMemo(() => [
    { value: null, label: t("ALL", "Tất cả") },
    { value: 0, label: t("SERVICE_ALLOCATED", "Đã phân bổ") },
    { value: 1, label: t("SERVICE_NOT_ALLOCATED", "Chưa phân bổ") },
  ], [t])

  // Form values are drafts. The API only receives filters after Search.
  // Refresh reuses the last submitted filters, never unsent form changes.
  const loadSubmittedFilters = useCallback(async (filters: ServiceAllocationFilters) => {
    const currentRequest = ++requestVersion.current
    setLoading(true)
    try {
      const result = await getServiceAllocationCheck(filters)
      if (currentRequest === requestVersion.current) setRows(result.ITEMS)
    } catch (error) {
      if (currentRequest === requestVersion.current) {
        notify(getApiErrorMessage(error, t("LOAD_ERROR", "Không thể tải dữ liệu")), "error", 4000)
      }
    } finally {
      if (currentRequest === requestVersion.current) setLoading(false)
    }
  }, [t])

  const handleSearch = useCallback(() => {
    const fromYmd = formatDateToYmd(fromDate)
    const toYmd = formatDateToYmd(toDate)
    if (!fromYmd || !toYmd || fromYmd > toYmd) {
      notify(t("INVALID_DATE_RANGE", "Khoảng ngày không hợp lệ"), "warning", 3000)
      return
    }

    const submittedFilters: ServiceAllocationFilters = {
      fromYmd,
      toYmd,
      customerId,
      allocationFilter,
    }
    appliedFiltersRef.current = submittedFilters
    void loadSubmittedFilters(submittedFilters)
  }, [allocationFilter, customerId, fromDate, loadSubmittedFilters, t, toDate])

  const handleRefresh = useCallback(() => {
    const filters = appliedFiltersRef.current
    if (!filters) {
      notify(t("SEARCH_FIRST", "Vui lòng nhấn Tìm kiếm để tải dữ liệu"), "info", 2500)
      return
    }
    void loadSubmittedFilters(filters)
  }, [loadSubmittedFilters, t])

  useEffect(() => () => {
    requestVersion.current += 1
  }, [])

  const handleExportExcel = useCallback(async () => {
    // The main DataGrid data source contains filtered/sorted master records only.
    // Avoid the DevExtreme built-in export here because expanded Detail Grids
    // must not be included in the generated workbook.
    const grid = masterGridRef.current
    const masterFields = new Map(masterColumnDefs.map((column) => [column.field, column]))
    const excelColumns: ColumnConfig[] = (grid?.getVisibleColumns() ?? [])
      .filter((column) => typeof column.dataField === "string" && masterFields.has(column.dataField))
      .map((column, index) => {
        const field = column.dataField as string
        const fallback = masterFields.get(field)!
        return {
          id: field,
          dataField: field,
          displayName: column.caption || t(field, fallback.caption),
          width: typeof column.width === "number" ? column.width : fallback.width,
          visible: true,
          pinned: Boolean(column.fixed),
          originalOrder: index,
        }
      })

    const masterRows = grid?.getDataSource()?.items() as ServiceAllocationVoucher[] | undefined
    if (!masterRows?.length || !excelColumns.length) {
      notify(t("NO_DATA_TO_EXPORT", "Không có dữ liệu để xuất Excel"), "warning", 2500)
      return
    }

    // Export only visible master columns, in their current displayed order.
    // The ALLOCATIONS child collection and Detail Grid are deliberately omitted.
    const excelRows: Record<string, unknown>[] = masterRows.map((row) => {
      const item: Record<string, unknown> = {}
      for (const column of excelColumns) {
        const value = row[column.dataField as keyof ServiceAllocationVoucher]
        item[column.dataField] =
          column.dataField === "CHIT_YMD" || column.dataField === "VAT_YMD"
            ? typeof value === "string" || value instanceof Date
              ? formatYmdForDisplay(value)
              : ""
            : value
      }
      return item
    })

    try {
      const timeStamp = new Date().toISOString().replace(/[:.-]/g, "")
      await exportToExcel(
        excelRows,
        excelColumns,
        `ap_service_allocation_${timeStamp}.xlsx`,
        "Service Allocation",
      )
    } catch (error) {
      notify(getApiErrorMessage(error, t("EXPORT_EXCEL_FAILED", "Xuất Excel thất bại")), "error", 4000)
    }
  }, [t])

  const openColumnSettings = useCallback(async () => {
    if (!columnSettingState.enabled || !masterGridRef.current) return

    setColumnSettingsLoading(true)
    setColumnSettingsVisible(true)
    try {
      setColumnSettingsItems(await columnSettingState.loadEditorItems(masterGridRef.current))
    } catch (error) {
      setColumnSettingsVisible(false)
      notify(getApiErrorMessage(error, t("LOAD_ERROR", "Không thể tải thiết lập cột")), "error", 4000)
    } finally {
      setColumnSettingsLoading(false)
    }
  }, [columnSettingState, t])

  const saveColumnSettings = useCallback(async (items: GridColumnSettingEditorItem[]) => {
    const saved = masterGridRef.current
      ? await columnSettingState.applyEditorItemsToComponent(masterGridRef.current, items)
      : await columnSettingState.saveEditorItems(items)
    setColumnSettingsItems(saved)
    setColumnSettingsVisible(false)
  }, [columnSettingState])

  const resetColumnSettings = useCallback(async () => {
    setColumnSettingsItems(await columnSettingState.resetEditorItems(masterGridRef.current))
  }, [columnSettingState])

  const changeColumnTemplate = useCallback(async (templateId: number) => {
    setColumnSettingsItems(await columnSettingState.changeTemplate(templateId, masterGridRef.current))
  }, [columnSettingState])

  const createColumnTemplate = useCallback(async (payload: { templateName: string; isDefaultTemplate: boolean }) => {
    setColumnSettingsItems(await columnSettingState.createTemplate(payload, masterGridRef.current))
  }, [columnSettingState])

  const setDefaultColumnTemplate = useCallback(async (templateId: number) => {
    await columnSettingState.setDefaultTemplate(templateId)
  }, [columnSettingState])

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex-shrink-0">
            <ReportToolbar
            fromDate={fromDate}
            toDate={toDate}
            onFromDateChange={setFromDate}
            onToDateChange={setToDate}
            onSearch={handleSearch}
            onRefresh={handleRefresh}
            onExportExcel={() => void handleExportExcel()}
            onSysGridColumnSettings={() => void openColumnSettings()}
            searchText={searchText}
            onSearchTextChange={setSearchText}
            showSearch
            showRefresh
            showPrint={false}
            showExportPdf={false}
            showExportExcel={true}
            initialFilters={
              <>
                <SelectBox
                  className={TOOLBAR_FIELD}
                  dataSource={customerLookupStore}
                  valueExpr="CUSTOMER_ID"
                  displayExpr={formatCustomer}
                  value={customerId}
                  searchEnabled
                  searchExpr={["CUSTOMER_CD", "CUSTOMER_NM_VIET", "CUSTOMER_NM_ENG", "CUSTOMER_NM_KOR"]}
                  showClearButton
                  stylingMode="outlined"
                  labelMode="floating"
                  label={t("CUSTOMER", "Khách hàng")}
                  width={260}
                  onValueChanged={(event) => setCustomerId(typeof event.value === "number" && event.value > 0 ? event.value : null)}
                />
                <SelectBox
                  className={TOOLBAR_FIELD}
                  dataSource={statuses}
                  valueExpr="value"
                  displayExpr="label"
                  value={allocationFilter}
                  showClearButton={false}
                  stylingMode="outlined"
                  labelMode="floating"
                  label={t("ALLOCATION_STATUS", "Trạng thái phân bổ")}
                  width={180}
                  onValueChanged={(event) => setAllocationFilter(event.value === 0 || event.value === 1 ? event.value : null)}
                />
              </>
            }
          />
          </div>

          <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm">
            <div className="h-full min-h-0">
              <div className="report-data-grid-host h-full min-h-0 w-full overflow-hidden">
              <DataGrid
            className="report-data-grid ap-service-allocation-grid"
            onInitialized={(event) => { masterGridRef.current = event.component }}
            dataSource={visibleRows}
            keyExpr="SERVICES_CHIT_ID"
            height="100%"
            width="100%"
            showBorders
            showRowLines
            showColumnLines
            hoverStateEnabled
            focusedRowEnabled
            rowAlternationEnabled
            columnAutoWidth={false}
            allowColumnResizing
            allowColumnReordering
            columnResizingMode="widget"
            wordWrapEnabled={false}
            cellHintEnabled
            loadPanel={{ enabled: loading }}
            noDataText={loading ? t("LOADING", "Đang tải...") : t("NO_DATA", "Không có dữ liệu")}
          >
            <FilterRow visible={Boolean(searchText.trim())} />
            <HeaderFilter visible />
            <ColumnFixing enabled />
            {columnSettingState.enabled ? (
              <StateStoring
                enabled
                type="custom"
                customLoad={columnSettingState.customLoad}
                customSave={columnSettingState.customSave}
                savingTimeout={500}
              />
            ) : null}
            <Scrolling mode="standard" useNative={false} showScrollbar="always" />
            {columns.map((column) => (
              <Column
                key={column.field}
                dataField={column.field}
                caption={column.caption}
                width={column.width}
                dataType={column.type}
                format={column.format}
                alignment={column.alignment}
                visible={column.visible}
                allowHiding={column.allowHiding}
              />
            ))}
            <MasterDetail enabled component={ServiceAllocationDetailGrid} />
            {/* <Summary>
              <TotalItem column="TOTAL_COST" summaryType="sum" valueFormat={FORMAT_NUMBER} displayFormat="{0}" />
              <TotalItem column="COST_NOT_YET_ALLOCATED" summaryType="sum" valueFormat={FORMAT_NUMBER} displayFormat="{0}" />
              <TotalItem column="COST_REMAIN" summaryType="sum" valueFormat={FORMAT_NUMBER} displayFormat="{0}" />
            </Summary> */}
              </DataGrid>
              </div>
            </div>
          </div>
        </section>
      </div>

      <GridColumnSettingsPopup
        visible={columnSettingsVisible}
        title={t("SYS_GRID_COLUMN_SETTING", "Thiết lập cột hiển thị")}
        items={columnSettingsItems}
        loading={columnSettingsLoading}
        onClose={() => setColumnSettingsVisible(false)}
        onSave={saveColumnSettings}
        onReset={resetColumnSettings}
        templates={columnSettingState.templateOptions}
        selectedTemplateId={columnSettingState.currentTemplateId}
        templateLoading={columnSettingState.templateLoading}
        onTemplateChange={changeColumnTemplate}
        onCreateTemplate={createColumnTemplate}
        onSetDefaultTemplate={setDefaultColumnTemplate}
      />
    </DxPage>
  )
}
