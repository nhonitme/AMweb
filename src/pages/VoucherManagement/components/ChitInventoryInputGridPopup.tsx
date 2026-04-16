import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef } from "react"
import DataGrid, { Column, ColumnFixing, Editing, Pager, Paging, StateStoring } from "devextreme-react/data-grid"
import dayjs from "dayjs"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent } from "devextreme/ui/data_grid"

import { useGridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ChitDateValue, InventoryInputLine } from "@/types/voucher"

export interface ChitInventoryInputGridPopupHandle {
  getGridInstance: () => dxDataGrid<InventoryInputLine, string> | null
}

interface ChitInventoryInputGridPopupProps {
  companyCd?: string
  chitDetailId?: number | null
  chitDetailCd?: string | null
  detailRowKey?: string | null
  detailAmount?: number | null
  detailLabel?: string
  inventoryYmd?: ChitDateValue
  rows: InventoryInputLine[]
  disabled?: boolean
  onChange: (rows: InventoryInputLine[]) => void
  screenCd?: string
  gridId?: string
  persistColumnSettings?: boolean
}

function createRowKey(detailRowKey?: string | null) {
  return `input_${detailRowKey ?? "detail"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function normalizeInputLine(
  row: Partial<InventoryInputLine>,
  options: {
    companyCd?: string
    chitDetailId?: number | null
    chitDetailCd?: string | null
    detailRowKey?: string | null
    inventoryYmd?: ChitDateValue
  },
): InventoryInputLine {
  const quantity = row.QUANTITY == null ? null : toNumber(row.QUANTITY)
  const unitPrice = row.UNIT_PRICE_CC == null ? null : toNumber(row.UNIT_PRICE_CC)
  const amount =
    row.AMOUNT_CC != null
      ? toNumber(row.AMOUNT_CC)
      : quantity != null && unitPrice != null
        ? quantity * unitPrice
        : null

  return {
    ROW_KEY: row.ROW_KEY || createRowKey(options.detailRowKey),
    INPUT_ID: row.INPUT_ID ?? null,
    INPUT_CD: String(row.INPUT_CD ?? ""),
    COMPANY_CD: String(row.COMPANY_CD ?? options.companyCd ?? ""),
    PRODUCT_ID: row.PRODUCT_ID ?? null,
    PRODUCT_CD: String(row.PRODUCT_CD ?? ""),
    STORE_ID: row.STORE_ID ?? null,
    STORE_CD: String(row.STORE_CD ?? ""),
    UNIT_ID: row.UNIT_ID ?? null,
    UNIT_CD: String(row.UNIT_CD ?? ""),
    QUANTITY: quantity,
    UNIT_PRICE_CC: unitPrice,
    UNIT_PRICE_FC: row.UNIT_PRICE_FC == null ? 0 : toNumber(row.UNIT_PRICE_FC),
    EXCHANGE_RATES: row.EXCHANGE_RATES == null ? 0 : toNumber(row.EXCHANGE_RATES),
    AMOUNT_CC: amount,
    AMOUNT_FC: row.AMOUNT_FC == null ? 0 : toNumber(row.AMOUNT_FC),
    SUMMARY: String(row.SUMMARY ?? ""),
    INVENTORY_YMD: row.INVENTORY_YMD ?? options.inventoryYmd ?? dayjs().toISOString(),
    STATE: String(row.STATE ?? "1"),
    CHITDETAIL_ID: row.CHITDETAIL_ID ?? options.chitDetailId ?? null,
    CHITDETAIL_CD: String(row.CHITDETAIL_CD ?? options.chitDetailCd ?? ""),
    SORT: row.SORT ?? null,
    ISDEL: Boolean(row.ISDEL ?? false),
  }
}

function mergeInsertedRow(rows: InventoryInputLine[], nextRow: InventoryInputLine) {
  const key = String(nextRow.ROW_KEY)
  const exists = rows.some((row) => String(row.ROW_KEY) === key)

  if (exists) {
    return rows.map((row) => (String(row.ROW_KEY) === key ? nextRow : row))
  }

  return [...rows, nextRow]
}

export const ChitInventoryInputGridPopup = forwardRef<ChitInventoryInputGridPopupHandle, ChitInventoryInputGridPopupProps>(
function ChitInventoryInputGridPopup({
  companyCd,
  chitDetailId,
  chitDetailCd,
  detailRowKey,
  detailAmount,
  detailLabel,
  inventoryYmd,
  rows,
  disabled,
  onChange,
  screenCd,
  gridId,
  persistColumnSettings = false,
}, ref) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const gridRef = useRef<dxDataGrid<InventoryInputLine, string> | null>(null)
  const columnSettingState = useGridColumnSettingState({
    enabled: persistColumnSettings,
    screenCd,
    gridId,
  })

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const normalizedRows = useMemo(
    () =>
      rows.map((row) =>
        normalizeInputLine(row, {
          companyCd,
          chitDetailId,
          chitDetailCd,
          detailRowKey,
          inventoryYmd,
        }),
      ),
    [rows, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd],
  )

  const totalQuantity = useMemo(
    () => normalizedRows.reduce((sum, row) => sum + toNumber(row.QUANTITY), 0),
    [normalizedRows],
  )

  const totalAmount = useMemo(
    () => normalizedRows.reduce((sum, row) => sum + toNumber(row.AMOUNT_CC), 0),
    [normalizedRows],
  )
  const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number")

  useImperativeHandle(ref, () => ({
    getGridInstance: () => gridRef.current,
  }), [])

  const handleInitialized = useCallback((event: InitializedEvent<InventoryInputLine, string>) => {
    gridRef.current = event.component ?? null
    if (columnSettingState.cachedEditorItems.length) {
      columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
    }
  }, [columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent])

  useEffect(() => {
    if (!columnSettingState.enabled || !gridRef.current || !columnSettingState.cachedEditorItems.length) {
      return
    }

    columnSettingState.syncEditorItemsToComponent(gridRef.current, columnSettingState.cachedEditorItems)
  }, [
    columnSettingState.cachedEditorItems,
    columnSettingState.enabled,
    columnSettingState.syncEditorItemsToComponent,
    normalizedRows,
  ])

  const handleRowInserted = useCallback(
    (e: any) => {
      const nextRow = normalizeInputLine(e.data, {
        companyCd,
        chitDetailId,
        chitDetailCd,
        detailRowKey,
        inventoryYmd,
      })

      onChange(mergeInsertedRow(normalizedRows, nextRow))
    },
    [normalizedRows, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd, onChange],
  )

  const handleRowUpdated = useCallback(
    (e: any) => {
      const key = String(e.key)
      const nextRows = normalizedRows.map((row) => {
        if (String(row.ROW_KEY) !== key) return row
        return normalizeInputLine(
          { ...row, ...e.data },
          { companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd },
        )
      })
      onChange(nextRows)
    },
    [normalizedRows, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd, onChange],
  )

  const handleRowRemoved = useCallback(
    (e: any) => {
      const key = String(e.key)
      onChange(normalizedRows.filter((row) => String(row.ROW_KEY) !== key))
    },
    [normalizedRows, onChange],
  )

  const handleInitNewRow = useCallback(
    (e: any) => {
      Object.assign(
        e.data,
        normalizeInputLine(
          { SORT: normalizedRows.length + 1 },
          { companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd },
        ),
      )
    },
    [normalizedRows.length, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd],
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      <div className="grid gap-3 rounded-lg border border-gray-200 bg-slate-50 p-3 lg:grid-cols-4">
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("DETAIL_ROW", "Detail Row")}</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">{detailLabel || "-"}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("DETAIL_AMOUNT", "Detail Amount")}</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">{Number(detailAmount ?? 0).toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("TOTAL_INPUT_QTY", "Total Input Qty")}</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">{totalQuantity.toLocaleString()}</div>
        </div>
        <div>
          <div className="text-xs font-medium uppercase tracking-wide text-gray-500">{t("TOTAL_INPUT_AMOUNT", "Total Input Amount")}</div>
          <div className="mt-1 text-sm font-semibold text-gray-800">{totalAmount.toLocaleString()}</div>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
        <DataGrid
          loadPanel={{ enabled: false }}
          dataSource={normalizedRows}
          keyExpr="ROW_KEY"
          columnAutoWidth={!hasConfiguredColumnWidths}
          repaintChangesOnly={true}
          hoverStateEnabled={true}
          rowAlternationEnabled={true}
          height="100%"
          onInitialized={handleInitialized}
          onInitNewRow={handleInitNewRow}
          onRowInserted={handleRowInserted}
          onRowUpdated={handleRowUpdated}
          onRowRemoved={handleRowRemoved}
          noDataText={t("NO_INVENTORY_INPUT", "No inventory input lines")}
        >
          <ColumnFixing enabled={true} />
          {columnSettingState.enabled ? (
            <StateStoring
              enabled={true}
              type="custom"
              customLoad={columnSettingState.customLoad}
              customSave={columnSettingState.customSave}
              savingTimeout={500}
            />
          ) : null}
          <Editing mode="row" allowAdding={!disabled} allowUpdating={!disabled} allowDeleting={!disabled} useIcons={true} />
          <Paging defaultPageSize={20} />
          <Pager visible={true} showPageSizeSelector={true} allowedPageSizes={[20, 50, 100]} showInfo={true} />

          <Column dataField="INPUT_ID" caption={t("INPUT_ID", "Input ID")} visible={false} showInColumnChooser={false} allowHiding={false} />
          <Column dataField="INPUT_CD" caption={t("INPUT_CD", "Input Code")} visible={false} />
          <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CD", "Product Code")} />
          <Column dataField="STORE_CD" caption={t("STORE_CD", "Store Code")} />
          <Column dataField="UNIT_CD" caption={t("UNIT_CD", "Unit Code")} />
          <Column dataField="QUANTITY" caption={t("QUANTITY", "Quantity")} dataType="number" format="#,##0.###" />
          <Column dataField="UNIT_PRICE_CC" caption={t("UNIT_PRICE_CC", "Unit Price")} dataType="number" format="#,##0.00" />
          <Column dataField="AMOUNT_CC" caption={t("AMOUNT_CC", "Amount")} dataType="number" format="#,##0.00" />
          <Column dataField="INVENTORY_YMD" caption={t("INVENTORY_YMD", "Inventory Date")} visible={false} />
          <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
        </DataGrid>
      </div>
    </div>
  )
})

export default ChitInventoryInputGridPopup
