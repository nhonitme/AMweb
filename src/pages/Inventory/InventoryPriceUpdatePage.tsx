import { useCallback, useContext, useMemo, useRef, useState } from "react"
import { Column, Editing } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import * as XLSX from "xlsx"

import { applyInventoryPriceUpdate, getInventoryPriceUpdateRows } from "@/api/inventoryPriceUpdateApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import type { ClientExcelImportContext, ExcelImportResponse } from "@/api/excelApi"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid"
import {
  VOUCHER_SPREADSHEET_GRID_CLASS,
  voucherSpreadsheetKeyboardNavigation,
} from "@/components/datagrid/voucherSpreadsheetGrid"
import MultiLookupCellEditor from "@/components/lookup/MultiLookupCellEditor"
import { trimLookupText } from "@/components/lookup/lookupHelpers"
import { warehouseLookupStore } from "@/components/lookup/warehouseLookupStore"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { createCurrentMonthDateRange } from "@/lib/dateRangeDefaults"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import type { InventoryPriceFlow, InventoryPriceUpdateFilter, InventoryPriceUpdateRow } from "@/types/inventoryPriceUpdate"
import type { StoreInfo } from "@/types/store"

type Props = { flow: InventoryPriceFlow }
type TranslationFn = (key: string, fallback: string) => string

function toYmd(value: Date | null): string | null {
  if (!value || Number.isNaN(value.getTime())) return null
  return `${value.getFullYear()}${String(value.getMonth() + 1).padStart(2, "0")}${String(value.getDate()).padStart(2, "0")}`
}

function asText(value: unknown): string {
  return value == null ? "" : String(value).trim()
}

function asPrice(value: unknown): number | null {
  if (typeof value === "number") return Number.isFinite(value) && value >= 0 ? value : null
  const raw = asText(value).replace(/\s/g, "")
  if (!raw) return null
  const parsed = Number(raw.replace(/,/g, ""))
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null
}

export default function InventoryPriceUpdatePage({ flow }: Props) {
  const initialRange = useMemo(createCurrentMonthDateRange, [])
  const [fromDate, setFromDate] = useState<Date | null>(initialRange.fromDate)
  const [toDate, setToDate] = useState<Date | null>(initialRange.toDate)
  const [storeCds, setStoreCds] = useState<string[]>([])
  const [rows, setRows] = useState<InventoryPriceUpdateRow[]>([])
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [importVisible, setImportVisible] = useState(false)
  const gridRef = useRef<dxDataGrid | null>(null)
  const { translate } = useContext(LanguageContext) as { translate?: TranslationFn }
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate])
  const isInput = flow === "IN"
  const priceCaption = isInput
    ? t("INVENTORY_INPUT_PRICE", "Giá nhập mới")
    : t("INVENTORY_COGS_UNIT_PRICE", "Giá vốn xuất mới")

  const buildFilter = useCallback((): InventoryPriceUpdateFilter | null => {
    const fromYmd = toYmd(fromDate)
    const toYmdValue = toYmd(toDate)
    if (!fromYmd || !toYmdValue) {
      notify(t("INVENTORY_PRICE_FILTER_REQUIRED", "Vui lòng chọn Từ ngày và Đến ngày"), "warning", 3000)
      return null
    }
    if (fromYmd > toYmdValue) {
      notify(t("INVALID_DATE_RANGE", "Từ ngày phải nhỏ hơn hoặc bằng Đến ngày"), "warning", 3000)
      return null
    }
    return { STORE_CD: storeCds.join("|"), FROM_YMD: fromYmd, TO_YMD: toYmdValue }
  }, [fromDate, storeCds, t, toDate])

  const loadRows = useCallback(async () => {
    const filter = buildFilter()
    if (!filter) return
    setLoading(true)
    try {
      const result = await getInventoryPriceUpdateRows(flow, filter)
      setRows(result.map(row => ({ ...row, NEW_UNIT_PRICE: null })))
      if (!result.length) notify(t("NO_DATA", "Không có dữ liệu phù hợp"), "info", 2500)
    } catch (error) {
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải dữ liệu thất bại")), "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [buildFilter, flow, t])

  const handleImportFile = useCallback(async (file: File, context: ClientExcelImportContext): Promise<ExcelImportResponse> => {
    try {
      const bytes = await file.arrayBuffer()
      const workbook = XLSX.read(bytes, { type: "array", cellDates: false })
      const sheet = workbook.Sheets[context.sheetName] ?? workbook.Sheets[workbook.SheetNames[0]]
      if (!sheet) throw new Error(t("IMPORT_EMPTY_FILE", "File Excel không có sheet dữ liệu"))
      const input = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" })
      const priceByProduct = new Map<string, number>()
      const invalidRows: number[] = []
      input.forEach((record, index) => {
        const normalized = new Map<string, unknown>()
        Object.entries(record).forEach(([key, value]) => normalized.set(key.trim().toUpperCase().replace(/[\s_-]/g, ""), value))
        const code = asText(normalized.get("PRODUCTCD"))
        const price = asPrice(normalized.get("NEWUNITPRICE") ?? normalized.get("NEWPRICE") ?? normalized.get("GIAMOI"))
        if (!code || price == null || priceByProduct.has(code.toUpperCase())) {
          invalidRows.push(index + 2)
          return
        }
        priceByProduct.set(code.toUpperCase(), price)
      })
      if (priceByProduct.size === 0) throw new Error(t("IMPORT_NO_VALID_DETAIL_ROWS", "Excel không có dòng mã sản phẩm và giá hợp lệ"))
      const knownCodes = new Set(rows.map(row => row.PRODUCT_CD.trim().toUpperCase()))
      const unknownCodes = [...priceByProduct.keys()].filter(code => !knownCodes.has(code))
      if (unknownCodes.length) throw new Error(`${t("INVENTORY_PRICE_IMPORT_UNKNOWN_CODES", "Mã sản phẩm không có trong danh sách đang lọc")}: ${unknownCodes.slice(0, 10).join(", ")}`)
      setRows(current => current.map(row => {
        const imported = priceByProduct.get(row.PRODUCT_CD.trim().toUpperCase())
        return imported == null ? row : { ...row, NEW_UNIT_PRICE: imported }
      }))
      const message = invalidRows.length
        ? t("INVENTORY_PRICE_IMPORT_PARTIAL", "Đã nạp các dòng hợp lệ; có dòng thiếu mã, giá hoặc bị trùng")
        : t("INVENTORY_PRICE_IMPORT_SUCCESS", "Đã nạp giá mới vào lưới")
      return {
        success: true,
        totalRows: input.length,
        successRows: priceByProduct.size,
        warningRows: 0,
        errorRows: invalidRows.length,
        message,
        sheetName: context.sheetName,
        rows: invalidRows.map(rowNo => ({ rowNo, status: "ERROR", message: t("INVALID_OR_DUPLICATE_ROW", "Thiếu mã/giá hoặc mã sản phẩm bị trùng"), sheetName: context.sheetName })),
      }
    } catch (error) {
      const message = getApiErrorMessage(error, t("IMPORT_FAILED", "Đọc Excel thất bại"))
      return { success: false, totalRows: 0, successRows: 0, warningRows: 0, errorRows: 1, message, sheetName: context.sheetName }
    }
  }, [rows, t])

  const handleExport = useCallback(() => {
    if (!rows.length) {
      notify(t("NO_DATA_TO_EXPORT", "Không có dữ liệu để xuất"), "warning", 2500)
      return
    }
    const exportRows = rows.map(row => ({
      PRODUCT_CD: row.PRODUCT_CD,
      PRODUCT_NAME: row.PRODUCT_NAME,
      MOVEMENT_COUNT: row.MOVEMENT_COUNT,
      TOTAL_QUANTITY: row.TOTAL_QUANTITY,
      CURRENT_PRICE_MIN: row.CURRENT_PRICE_MIN,
      CURRENT_PRICE_MAX: row.CURRENT_PRICE_MAX,
      CURRENT_AMOUNT: row.CURRENT_AMOUNT,
      NEW_UNIT_PRICE: row.NEW_UNIT_PRICE ?? "",
    }))
    const sheet = XLSX.utils.json_to_sheet(exportRows)
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, sheet, "Price update")
    XLSX.writeFile(workbook, `${isInput ? "inventory_in_price" : "inventory_out_price"}_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`)
  }, [isInput, rows, t])

  const handleApply = useCallback(async () => {
    const filter = buildFilter()
    if (!filter) return
    const changedRows = rows.filter(row => row.NEW_UNIT_PRICE != null)
    if (!changedRows.length) {
      notify(t("INVENTORY_PRICE_NO_CHANGES", "Chưa nhập giá mới"), "warning", 2500)
      return
    }
    const confirmMessage = storeCds.length > 0
      ? t("INVENTORY_PRICE_CONFIRM_SELECTED_STORES", "Cập nhật giá cho {0} mã sản phẩm tại {1} kho đã chọn trong khoảng ngày?")
          .replace("{1}", String(storeCds.length))
      : t("INVENTORY_PRICE_CONFIRM_ALL_STORES", "Không chọn kho: cập nhật cho {0} mã sản phẩm ở tất cả kho trong khoảng ngày?")
    const accepted = await confirm(
      confirmMessage.replace("{0}", String(changedRows.length)),
      t("CONFIRM", "Xác nhận"),
    )
    if (!accepted) return
    setSaving(true)
    try {
      const count = await applyInventoryPriceUpdate(flow, { ...filter, ROWS: changedRows })
      notify(t("INVENTORY_PRICE_UPDATE_SUCCESS", "Đã cập nhật {0} mã sản phẩm").replace("{0}", String(count)), "success", 3500)
      await loadRows()
    } catch (error) {
      notify(getApiErrorMessage(error, t("INVENTORY_PRICE_UPDATE_FAILED", "Cập nhật giá thất bại")), "error", 5000)
    } finally {
      setSaving(false)
    }
  }, [buildFilter, flow, loadRows, rows, storeCds, t])

  const warehouseColumns = useMemo(() => [
    { dataField: "STORE_CD", caption: t("WAREHOUSE_CODE", "Mã kho"), width: 120 },
    { dataField: "STORE_NM_VIET", caption: t("WAREHOUSE_NAME", "Tên kho"), minWidth: 220 },
  ], [t])

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-3 overflow-auto bg-white p-4">
        <GridToolbar
          gridRef={gridRef}
          showAdd={false}
          showRefresh={!loading && !saving}
          onRefresh={() => void loadRows()}
          onRangeSearch={() => void loadRows()}
          rangeSearchDisabled={loading || saving}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          showDateRange
          showSearch={false}
          showColumnChooser
          showExportPdf={false}
          showExportXlsx
          exportXlsxDisabled={!rows.length || saving}
          onExportXlsx={handleExport}
          showImport
          importDisabled={!rows.length || saving}
          onImport={() => setImportVisible(true)}
          showDelete={false}
          customItems={[
            {
              key: "apply-price-update",
              icon: "save",
              text: t("APPLY", "Cập nhật giá"),
              hint: t("APPLY", "Cập nhật giá"),
              stylingMode: "contained",
              disabled: !rows.length || saving,
              onClick: () => void handleApply(),
            },
          ]}
          filtersLeadingContent={(
            <MultiLookupCellEditor<StoreInfo>
              dataSource={warehouseLookupStore}
              values={storeCds}
              valueExpr="STORE_CD"
              searchExpr={["STORE_CD", "STORE_NM_VIET", "STORE_NM_ENG", "STORE_NM_KOR", "STORE_NM_CHINA"]}
              placeholder={t("WAREHOUSE_CODE", "Chọn kho")}
              buttonHint={t("OPEN_WAREHOUSE_LOOKUP", "Chọn kho")}
              onApply={values => setStoreCds(values.map(value => trimLookupText(value)).filter((value): value is string => Boolean(value)))}
              onClear={() => setStoreCds([])}
              width={260}
              variant="toolbar"
              selectedCountLabel={count => `${count} kho`}
              columns={warehouseColumns}
            />
          )}
        />
        <div className={`min-h-0 flex-1 ${VOUCHER_SPREADSHEET_GRID_CLASS}`}>
          <BaseDataGrid
            dataSource={rows}
            keyExpr="PRODUCT_CD"
            menuCode={isInput ? "INV_UPDATE_IN_PRICE" : "INV_UPDATE_OUT_PRICE"}
            screenCd={isInput ? "/inventory/update-in-price" : "/inventory/update-out-price"}
            gridId={isInput ? "inventory-update-in-price-grid" : "inventory-update-out-price-grid"}
            persistColumnSettings
            pagingEnabled={false}
            showPager={false}
            selectMode="none"
            keyboardNavigation={voucherSpreadsheetKeyboardNavigation}
            showGridFilters={false}
            onInitialized={event => { gridRef.current = event.component ?? null }}
            onCellClick={event => {
              if (event.rowType !== "data" || event.column?.dataField !== "NEW_UNIT_PRICE") return
              if (saving) return
              event.component.editCell(event.rowIndex, "NEW_UNIT_PRICE")
              window.requestAnimationFrame(() => {
                const cell = event.component.getCellElement(event.rowIndex, event.columnIndex)
                const cellElement = cell instanceof HTMLElement ? cell : cell?.[0]
                const input = cellElement?.querySelector<HTMLInputElement>("input.dx-texteditor-input")
                input?.focus()
              })
            }}
            onRowUpdated={event => setRows(current => current.map(row => row.PRODUCT_CD === event.key ? { ...row, ...event.data } : row))}
          >
            <Editing
              mode="cell"
              allowUpdating={!saving}
              startEditAction="click"
              selectTextOnEditStart
            />
            <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CODE", "Mã sản phẩm")} allowEditing={false} />
            <Column dataField="PRODUCT_NAME" caption={t("PRODUCT_NAME", "Tên sản phẩm")} allowEditing={false} />
            <Column dataField="TOTAL_QUANTITY" caption={t("TOTAL_QUANTITY", "Tổng số lượng")} dataType="number" format="#,##0.###" allowEditing={false} />
            <Column dataField="CURRENT_PRICE_MIN" caption={t("CURRENT_PRICE_MIN", "Giá hiện tại thấp nhất")} dataType="number" format="#,##0.00" allowEditing={false} />
            <Column dataField="CURRENT_PRICE_MAX" caption={t("CURRENT_PRICE_MAX", "Giá hiện tại cao nhất")} dataType="number" format="#,##0.00" allowEditing={false} />
            <Column dataField="CURRENT_AMOUNT" caption={t("CURRENT_AMOUNT", "Thành tiền hiện tại")} dataType="number" format="#,##0.00" allowEditing={false} />
            <Column
              dataField="NEW_UNIT_PRICE"
              caption={priceCaption}
              dataType="number"
              format="#,##0.00"
              editorOptions={createNumberEditorOptions("#,##0.00", { min: 0 })}
            />
          </BaseDataGrid>
        </div>
        <BaseExcelImportPopup
          visible={importVisible}
          onClose={() => setImportVisible(false)}
          title={t("INVENTORY_PRICE_IMPORT_TITLE", "Nhập giá từ Excel")}
          description={t("INVENTORY_PRICE_IMPORT_FIELDS_DESC", "Giữ cột PRODUCT_CD và nhập NEW_UNIT_PRICE.")}
          onImportFile={handleImportFile}
          onImported={() => setImportVisible(false)}
          importMode="client"
          showTemplateDownload={false}
          showSheetSelector
        />
      </div>
    </DxPage>
  )
}
