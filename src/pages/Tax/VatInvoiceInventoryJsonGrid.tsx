import DataGrid, { Column, Editing, Scrolling } from "devextreme-react/data-grid"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import type { ColumnCellTemplateData, ColumnEditCellTemplateData } from "devextreme/ui/data_grid"
import ProductLookupCellEditor from "@/components/lookup/InventoryLookupCellEditor"
import WarehouseLookupCellEditor from "@/components/lookup/WarehouseLookupCellEditor"
import { LookupGridCellEditor, consumeLookupCellOpen, type LookupOpenMode } from "@/components/lookup/LookupGridCellDisplay"
import type { Product } from "@/types/product"
import type { StoreInfo } from "@/types/store"

export type VatInvoiceInventoryJsonRow = {
  key: string
  invoiceKey?: string
  invoiceLabel?: string
  lineNo: unknown
  name: unknown
  unit: unknown
  quantity: unknown
  unitPrice: unknown
  amount: unknown
  vatRate: unknown
  vatAmount: unknown
  discountAmount: unknown
  discountRate: unknown
}

export type VatInvoiceInventoryMapping = {
  includeInStock: boolean
  product: Product | null
  store: StoreInfo | null
}

type VatInvoiceInventoryGridRow = VatInvoiceInventoryJsonRow & {
  PRODUCT_ID?: number | null
  PRODUCT_CD?: string
  PRODUCT_NM_VIET?: string
  PRODUCT_KIND_ID?: number | null
  PRODUCT_KIND_CD?: string
  PRODUCTKIND_NM_VIET?: string
  UNIT_ID?: number | null
  UNIT_CD?: string
  UNIT_NM_VIET?: string
  STORE_ID?: number | null
  STORE_CD?: string
  STORE_NM_VIET?: string
  STORE_KIND_ID?: number | null
  STORE_KIND_CD?: string
  STORE_KIND_NM_VIET?: string
}

type InventoryCellInfo = ColumnCellTemplateData<VatInvoiceInventoryGridRow, string>
type InventoryEditCellInfo = ColumnEditCellTemplateData<VatInvoiceInventoryGridRow, string>

function renderLookupCell(dataField: string) {
  return (cellInfo: InventoryCellInfo) => (
    <LookupGridCellEditor mode="display" cellInfo={cellInfo} dataField={dataField} />
  )
}

function renderLookupEditor(children: JSX.Element) {
  return <LookupGridCellEditor mode="edit">{children}</LookupGridCellEditor>
}

type Props = {
  direction?: "input" | "output"
  rows: VatInvoiceInventoryJsonRow[]
  loading: boolean
  error?: string
  onRetry: () => void
  onQuickCreateProduct?: (row: VatInvoiceInventoryJsonRow) => void
  createdProducts?: Record<string, Product>
  products?: Product[]
  stores?: StoreInfo[]
  mappings?: Record<string, VatInvoiceInventoryMapping>
  onMappingChange?: (rowKey: string, mapping: VatInvoiceInventoryMapping) => void
  readOnly?: boolean
}

function formatNumber(value: unknown): string {
  if (value === null || value === undefined || value === "") return "—"
  const number = typeof value === "number" ? value : Number(value)
  return Number.isFinite(number) ? number.toLocaleString(undefined, { maximumFractionDigits: 6 }) : String(value)
}

export default function VatInvoiceInventoryJsonGrid({
  rows,
  loading,
  error,
  onRetry,
  onQuickCreateProduct,
  createdProducts = {},
  products = [],
  stores = [],
  mappings,
  onMappingChange,
  readOnly = false,
  direction = "output",
}: Props) {
  const gridRows: VatInvoiceInventoryGridRow[] = rows.map((row) => {
    const mapping = mappings?.[row.key]
    const product = mapping?.product
    const store = mapping?.store
    return {
      ...row,
      PRODUCT_ID: product?.PRODUCT_ID ?? null,
      PRODUCT_CD: product?.PRODUCT_CD ?? "",
      PRODUCT_NM_VIET: product?.PRODUCT_NM_VIET ?? "",
      PRODUCT_KIND_ID: product?.PRODUCT_KIND_ID ?? null,
      PRODUCT_KIND_CD: product?.PRODUCT_KIND_CD ?? "",
      PRODUCTKIND_NM_VIET: product?.PRODUCTKIND_NM_VIET ?? "",
      UNIT_ID: product?.UNIT_ID ?? null,
      UNIT_CD: product?.UNIT_CD ?? "",
      UNIT_NM_VIET: product?.UNIT_NM ?? "",
      STORE_ID: store?.STORE_ID ?? null,
      STORE_CD: store?.STORE_CD ?? "",
      STORE_NM_VIET: store?.STORE_NM_VIET ?? "",
      STORE_KIND_ID: store?.STORE_KIND_ID ?? null,
      STORE_KIND_CD: store?.STORE_KIND_CD ?? "",
      STORE_KIND_NM_VIET: store?.STORE_KIND_NM_VIET ?? "",
    }
  })

  if (loading) {
    return <div className="flex h-full min-h-[280px] items-center justify-center text-sm text-slate-500">Đang tải chi tiết hóa đơn...</div>
  }

  if (error) {
    return (
      <div className="flex h-full min-h-[280px] flex-col items-center justify-center gap-3 text-sm text-red-700">
        <div>{error}</div>
        <button type="button" className="rounded border border-slate-300 px-3 py-1.5 text-slate-700 hover:bg-slate-50" onClick={onRetry}>
          Tải lại
        </button>
      </div>
    )
  }

  return (
    <DataGrid<VatInvoiceInventoryGridRow, string>
      dataSource={gridRows}
      keyExpr="key"
      height="100%"
      showBorders
      showRowLines
      showColumnLines
      columnAutoWidth={false}
      allowColumnResizing
      noDataText="JSON hóa đơn không có dòng chi tiết hdhhdvu."
      className="h-full"
      onRowUpdated={(event) => {
        const row = event.data
        const previous = mappings?.[row.key] ?? { includeInStock: true, product: null, store: null }
        const product = products.find((item) => item.PRODUCT_ID === Number(row.PRODUCT_ID)) ?? null
        const store = stores.find((item) => item.STORE_ID === Number(row.STORE_ID)) ?? null
        onMappingChange?.(row.key, { ...previous, product, store })
      }}
      onEditingStart={(event) => {
        if (mappings?.[event.data.key]?.includeInStock === false) event.cancel = true
      }}
    >
      <Editing mode="cell" allowUpdating={!readOnly && Boolean(onMappingChange)} startEditAction="click" />
      <Scrolling mode="standard" useNative />
      {onMappingChange ? <>
        <Column
          dataField="PRODUCT_CD"
          caption="Mã sản phẩm"
          minWidth={240}
          allowSorting={false}
          allowFiltering={false}
          cssClass="am-grid-lookup-column-cell"
          cellRender={renderLookupCell("PRODUCT_CD")}
          editCellRender={(cellInfo: InventoryEditCellInfo) => renderLookupEditor(
            <ProductLookupCellEditor
              value={cellInfo.data?.PRODUCT_ID ?? null}
              rowData={(cellInfo.data ?? {}) as Record<string, unknown>}
              rowIndex={cellInfo.row?.rowIndex ?? -1}
              grid={cellInfo.component}
              setValue={(productId) => cellInfo.component.cellValue(cellInfo.row.rowIndex, "PRODUCT_ID", productId)}
              productIdField="PRODUCT_ID"
              productCdField="PRODUCT_CD"
              productNmField="PRODUCT_NM_VIET"
              productGroupIdField="PRODUCT_KIND_ID"
              productGroupCdField="PRODUCT_KIND_CD"
              productGroupNmField="PRODUCTKIND_NM_VIET"
              unitIdField="UNIT_ID"
              unitCdField="UNIT_CD"
              unitNmField="UNIT_NM_VIET"
              warehouseIdField="STORE_ID"
              warehouseCdField="STORE_CD"
              warehouseNmField="STORE_NM_VIET"
              placeholder="Chọn mã sản phẩm"
              popupTitle="Chọn mã sản phẩm"
              buttonHint="Mở danh sách sản phẩm"
              autoOpen={consumeLookupCellOpen(cellInfo, "PRODUCT_CD") as LookupOpenMode | null}
            />,
          )}
        />
        <Column
          dataField="STORE_CD"
          caption={direction === "input" ? "Kho nhập" : "Kho xuất"}
          minWidth={200}
          allowSorting={false}
          allowFiltering={false}
          cssClass="am-grid-lookup-column-cell"
          cellRender={renderLookupCell("STORE_CD")}
          editCellRender={(cellInfo: InventoryEditCellInfo) => renderLookupEditor(
            <WarehouseLookupCellEditor
              value={cellInfo.data?.STORE_ID ?? null}
              rowData={(cellInfo.data ?? {}) as Record<string, unknown>}
              rowIndex={cellInfo.row?.rowIndex ?? -1}
              grid={cellInfo.component}
              setValue={(storeId) => cellInfo.component.cellValue(cellInfo.row.rowIndex, "STORE_ID", storeId)}
              warehouseIdField="STORE_ID"
              warehouseCdField="STORE_CD"
              warehouseNmField="STORE_NM_VIET"
              placeholder={direction === "input" ? "Chọn kho nhập" : "Chọn kho xuất"}
              popupTitle={direction === "input" ? "Chọn kho nhập" : "Chọn kho xuất"}
              buttonHint="Mở danh sách kho"
              autoOpen={consumeLookupCellOpen(cellInfo, "STORE_CD") as LookupOpenMode | null}
            />,
          )}
        />
      </> : null}
      {rows.some((row) => row.invoiceLabel) ? <Column dataField="invoiceLabel" caption="Hóa đơn" minWidth={180} /> : null}
      <Column dataField="lineNo" caption="STT" width={64} alignment="center" />
      <Column dataField="name" caption="Tên hàng hóa/dịch vụ" minWidth={300} />
      <Column dataField="unit" caption="ĐVT" width={100} />
      <Column dataField="quantity" caption="Số lượng" width={110} alignment="right" customizeText={(cell) => formatNumber(cell.value)} />
      <Column dataField="unitPrice" caption="Đơn giá" width={130} alignment="right" customizeText={(cell) => formatNumber(cell.value)} />
      <Column dataField="amount" caption="Thành tiền" width={140} alignment="right" customizeText={(cell) => formatNumber(cell.value)} />
      <Column dataField="vatRate" caption="Thuế suất" width={100} alignment="center" />
      <Column dataField="vatAmount" caption="Tiền thuế" width={130} alignment="right" customizeText={(cell) => formatNumber(cell.value)} />
      <Column dataField="discountAmount" caption="Tiền chiết khấu" width={140} alignment="right" customizeText={(cell) => formatNumber(cell.value)} />
      <Column dataField="discountRate" caption="Tỷ lệ CK" width={100} alignment="right" customizeText={(cell) => formatNumber(cell.value)} />
      {onMappingChange ? <Column
        caption={direction === "input" ? "Nhập kho" : "Xuất kho"}
        width={90}
        allowSorting={false}
        allowFiltering={false}
        cellRender={(cell) => {
          const mapping = mappings?.[cell.data.key] ?? { includeInStock: true, product: null, store: null }
          return <CheckBox value={mapping.includeInStock} disabled={readOnly} onValueChanged={(event) => onMappingChange(cell.data.key, { ...mapping, includeInStock: Boolean(event.value) })} />
        }}
      /> : <Column
        caption="Danh mục"
        width={190}
        allowSorting={false}
        allowFiltering={false}
        cellRender={(cell) => {
          const product = createdProducts[cell.data.key]
          return product ? (
            <span className="text-xs text-emerald-700" title={product.PRODUCT_NM_VIET}>{product.PRODUCT_CD} · Đã tạo</span>
          ) : onQuickCreateProduct ? (
            <Button text="Tạo sản phẩm" icon="plus" stylingMode="outlined" onClick={() => onQuickCreateProduct(cell.data)} />
          ) : null
        }}
      />}
    </DataGrid>
  )
}

export function mapVatInvoiceInventoryJsonRows(payload: unknown): VatInvoiceInventoryJsonRow[] {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) return []
  const source = payload as Record<string, unknown>
  const detail = source.hdhhdvu ?? source.HDHHDVU
  if (!Array.isArray(detail)) return []

  return detail.filter((item): item is Record<string, unknown> => Boolean(item && typeof item === "object" && !Array.isArray(item)))
    .map((item, index) => ({
      key: String(item.id ?? item.ID ?? `${item.stt ?? item.STT ?? item.sxep ?? item.SXEP ?? "line"}-${index}`),
      lineNo: item.stt ?? item.STT ?? item.sxep ?? item.SXEP ?? index + 1,
      name: item.ten ?? item.TEN ?? "",
      unit: item.dvtinh ?? item.DVTINH ?? "",
      quantity: item.sluong ?? item.SLUONG ?? null,
      unitPrice: item.dgia ?? item.DGIA ?? null,
      amount: item.thtien ?? item.THTIEN ?? null,
      vatRate: item.ltsuat ?? item.LTSUAT ?? item.tsuat ?? item.TSUAT ?? null,
      vatAmount: item.tthue ?? item.TTHUE ?? null,
      discountAmount: item.stckhau ?? item.STCKHAU ?? null,
      discountRate: item.tlckhau ?? item.TLCKHAU ?? null,
    }))
}
