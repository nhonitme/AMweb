import { useCallback, useMemo, useRef } from "react"
import Button from "devextreme-react/button"
import DataGrid, {
  Column,
  ColumnFixing,
  Editing,
  Paging,
  Scrolling,
  Toolbar as GridToolbar,
  Item as GridToolbarItem,
} from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
  InitializedEvent,
  RowRemovingEvent,
  RowUpdatedEvent,
} from "devextreme/ui/data_grid"

import DeleteRowButton from "@/components/datagrid/DeleteRowButton"
import {
  AM_GRID_READONLY_COLUMN_CELL_CLASS,
  VOUCHER_SPREADSHEET_GRID_CLASS,
  voucherSpreadsheetKeyboardNavigation,
} from "@/components/datagrid/voucherSpreadsheetGrid"
import type { EInvoiceBkeDetail } from "@/types/einvoice"
import {
  getEInvoiceMoneyFallbackPrecision,
  getEInvoiceQuantityFallbackPrecision,
  useEInvoiceDecimalResolver,
} from "../einvoiceDecimalSettings"
import { recalculateEInvoiceBkeDetailDiff, renumberEInvoiceBkeDetails } from "../einvoiceModel"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import { EInvoiceTableShell } from "./EInvoiceTableShell"

type GridKey = string

type EInvoiceBkeDetailGridSectionProps = {
  rows: EInvoiceBkeDetail[]
  readOnly?: boolean
  currencyCode?: string | null
  t: (key: string, fallback: string) => string
  onChange: (rows: EInvoiceBkeDetail[]) => void
  onSelectInvoices: () => void
}

export default function EInvoiceBkeDetailGridSection({
  rows,
  readOnly = false,
  currencyCode = "VND",
  t,
  onChange,
  onSelectInvoices,
}: EInvoiceBkeDetailGridSectionProps) {
  const gridRef = useRef<dxDataGrid<EInvoiceBkeDetail, GridKey> | null>(null)
  const decimalResolver = useEInvoiceDecimalResolver("UI")
  const moneyFallback = getEInvoiceMoneyFallbackPrecision(currencyCode)
  const quantityFallback = getEInvoiceQuantityFallbackPrecision()

  const moneyFormat = useMemo(
    () => decimalResolver.getFormat("DETAIL", "THTIEN", currencyCode, moneyFallback),
    [currencyCode, decimalResolver, moneyFallback],
  )
  const quantityFormat = useMemo(
    () => decimalResolver.getFormat("DETAIL", "SLUONG", currencyCode, quantityFallback),
    [currencyCode, decimalResolver, quantityFallback],
  )
  const unitPriceFormat = useMemo(
    () => decimalResolver.getFormat("DETAIL", "DGIA", currencyCode, moneyFallback),
    [currencyCode, decimalResolver, moneyFallback],
  )

  const handleInitialized = useCallback((event: InitializedEvent<EInvoiceBkeDetail, GridKey>) => {
    gridRef.current = event.component ?? null
    event.component?.option("keyboardNavigation", voucherSpreadsheetKeyboardNavigation)
  }, [])

  const handleRowUpdated = useCallback(
    (event: RowUpdatedEvent<EInvoiceBkeDetail, GridKey>) => {
      const current = event.data
      if (!current) {
        return
      }

      const patched = recalculateEInvoiceBkeDetailDiff(current)
      onChange(rows.map((row) => (row.ROW_KEY === current.ROW_KEY ? patched : row)))
    },
    [onChange, rows],
  )

  const handleRowRemoving = useCallback(
    (event: RowRemovingEvent<EInvoiceBkeDetail, GridKey>) => {
      const current = event.data
      if (!current) {
        return
      }
      onChange(renumberEInvoiceBkeDetails(rows.filter((row) => row.ROW_KEY !== current.ROW_KEY)))
      event.cancel = true
    },
    [onChange, rows],
  )

  const handleDeleteRow = useCallback(
    (rowKey: string) => {
      onChange(renumberEInvoiceBkeDetails(rows.filter((row) => row.ROW_KEY !== rowKey)))
    },
    [onChange, rows],
  )

  return (
    <div className="flex h-full min-h-0 flex-col gap-2">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm font-medium">{t("BKE_DETAILS", "Chi tiết hóa đơn trên bảng kê")}</div>
        {!readOnly ? (
          <Button
            text={t("SELECT_SIGNED_INVOICES", "Chọn hóa đơn đã ký")}
            icon="search"
            stylingMode="outlined"
            onClick={onSelectInvoices}
          />
        ) : null}
      </div>

      <EInvoiceTableShell className="min-h-0 flex-1">
        <DataGrid<EInvoiceBkeDetail, GridKey>
          className={`${VOUCHER_SPREADSHEET_GRID_CLASS} h-full`}
          dataSource={rows}
          keyExpr="ROW_KEY"
          height="100%"
          showBorders={true}
          columnAutoWidth={false}
          allowColumnResizing={true}
          columnResizingMode="widget"
          rowAlternationEnabled={true}
          hoverStateEnabled={true}
          wordWrapEnabled={false}
          repaintChangesOnly={true}
          loadPanel={{ enabled: false }}
          onInitialized={handleInitialized}
          onRowUpdated={handleRowUpdated}
          onRowRemoving={handleRowRemoving}
        >
          <Paging enabled={false} />
          <Scrolling mode="standard" useNative={false} showScrollbar="always" />
          <ColumnFixing enabled={true} />
          <Editing
            mode="cell"
            allowUpdating={!readOnly}
            allowDeleting={false}
            useIcons={true}
            selectTextOnEditStart={true}
            startEditAction="click"
          />
          <GridToolbar visible={false}>
            <GridToolbarItem />
          </GridToolbar>

          <Column
            dataField="STT"
            caption={t("STT", "STT")}
            width={50}
            allowEditing={false}
            fixed={true}
            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
          />
          <Column
            dataField="KHMSHDON"
            caption={t("KHMSHDON", "Mẫu số")}
            width={56}
            allowEditing={false}
            fixed={true}
            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
          />
          <Column
            dataField="KHHDON"
            caption={t("KHHDON", "Ký hiệu")}
            width={88}
            allowEditing={false}
            fixed={true}
            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
          />
          <Column
            dataField="SHDON"
            caption={t("SHDON", "Số hóa đơn")}
            width={88}
            allowEditing={false}
            fixed={true}
            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
          />

          <Column dataField="THHDVGOC" caption={t("THHDVGOC", "Tên hàng hóa dịch vụ gốc")} minWidth={140} allowEditing={!readOnly} />
          <Column
            dataField="SLGOC"
            caption={t("SLGOC", "Số lượng gốc")}
            dataType="number"
            format={quantityFormat}
            editorOptions={createNumberEditorOptions(quantityFormat)}
            width={90}
            allowEditing={!readOnly}
          />
          <Column
            dataField="DGGOC"
            caption={t("DGGOC", "Đơn giá gốc")}
            dataType="number"
            format={unitPriceFormat}
            editorOptions={createNumberEditorOptions(unitPriceFormat)}
            width={100}
            allowEditing={!readOnly}
          />
          <Column
            dataField="THTGOC"
            caption={t("THTGOC", "Thành tiền gốc")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={110}
            allowEditing={!readOnly}
          />
          <Column dataField="TSGOC" caption={t("TSGOC", "Thuế suất gốc")} width={80} allowEditing={!readOnly} />
          <Column
            dataField="TTGOC"
            caption={t("TTGOC", "Tiền thuế gốc")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={100}
            allowEditing={!readOnly}
          />
          <Column
            dataField="TGTSTGOC"
            caption={t("TGTSTGOC", "Tổng tiền gốc")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={110}
            allowEditing={!readOnly}
          />

          <Column dataField="THHDVTDOI" caption={t("THHDVTDOI", "Tên hàng hóa dịch vụ sau điều chỉnh")} minWidth={140} allowEditing={!readOnly} />
          <Column
            dataField="SLTDOI"
            caption={t("SLTDOI", "Số lượng sau điều chỉnh")}
            dataType="number"
            format={quantityFormat}
            editorOptions={createNumberEditorOptions(quantityFormat)}
            width={90}
            allowEditing={!readOnly}
          />
          <Column
            dataField="DGTDOI"
            caption={t("DGTDOI", "Đơn giá sau điều chỉnh")}
            dataType="number"
            format={unitPriceFormat}
            editorOptions={createNumberEditorOptions(unitPriceFormat)}
            width={100}
            allowEditing={!readOnly}
          />
          <Column
            dataField="THTTDOI"
            caption={t("THTTDOI", "Thành tiền sau điều chỉnh")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={110}
            allowEditing={!readOnly}
          />
          <Column dataField="TSTDOI" caption={t("TSTDOI", "Thuế suất sau điều chỉnh")} width={80} allowEditing={!readOnly} />
          <Column
            dataField="TTTDOI"
            caption={t("TTTDOI", "Tiền thuế sau điều chỉnh")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={100}
            allowEditing={!readOnly}
          />
          <Column
            dataField="TGTSTTDOI"
            caption={t("TGTSTTDOI", "Tổng tiền sau điều chỉnh")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={110}
            allowEditing={!readOnly}
          />

          <Column
            dataField="TGTCTCLECH"
            caption={t("TGTCTCLECH", "Chênh lệch trước thuế")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={110}
            allowEditing={false}
            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
          />
          <Column
            dataField="TGTTCLECH"
            caption={t("TGTTCLECH", "Chênh lệch thuế")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={100}
            allowEditing={false}
            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
          />
          <Column
            dataField="TGTTTCLECH"
            caption={t("TGTTTCLECH", "Chênh lệch thanh toán")}
            dataType="number"
            format={moneyFormat}
            editorOptions={createNumberEditorOptions(moneyFormat)}
            width={120}
            allowEditing={false}
            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
          />

          {!readOnly ? (
            <Column
              type="buttons"
              width={48}
              fixed={true}
              fixedPosition="right"
              allowEditing={false}
              cellRender={(cell) => (
                <DeleteRowButton
                  hint={t("DELETE", "Delete")}
                  onDelete={() => handleDeleteRow(String(cell.data?.ROW_KEY ?? ""))}
                />
              )}
            />
          ) : null}
        </DataGrid>
      </EInvoiceTableShell>
    </div>
  )
}
