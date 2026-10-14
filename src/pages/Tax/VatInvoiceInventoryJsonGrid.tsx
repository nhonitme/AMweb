import DataGrid, { Column, Scrolling } from "devextreme-react/data-grid"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import SelectBox from "devextreme-react/select-box"
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

type Props = {
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
}: Props) {
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
    <DataGrid<VatInvoiceInventoryJsonRow, string>
      dataSource={rows}
      keyExpr="key"
      height="100%"
      showBorders
      showRowLines
      showColumnLines
      columnAutoWidth={false}
      allowColumnResizing
      noDataText="JSON hóa đơn không có dòng chi tiết hdhhdvu."
      className="h-full"
    >
      <Scrolling mode="standard" useNative />
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
      {onMappingChange ? <>
        <Column
          caption="Xuất kho"
          width={90}
          allowSorting={false}
          allowFiltering={false}
          cellRender={(cell) => {
            const mapping = mappings?.[cell.data.key] ?? { includeInStock: true, product: null, store: null }
            return <CheckBox value={mapping.includeInStock} disabled={readOnly} onValueChanged={(event) => onMappingChange(cell.data.key, { ...mapping, includeInStock: Boolean(event.value) })} />
          }}
        />
        <Column
          caption="Mã sản phẩm"
          minWidth={240}
          allowSorting={false}
          allowFiltering={false}
          cellRender={(cell) => {
            const mapping = mappings?.[cell.data.key] ?? { includeInStock: true, product: null, store: null }
            return <SelectBox
              dataSource={products}
              valueExpr="PRODUCT_ID"
              displayExpr={(item: Product | null) => item ? `${item.PRODUCT_CD} · ${item.PRODUCT_NM_VIET}` : ""}
              value={mapping.product?.PRODUCT_ID ?? null}
              searchEnabled
              showClearButton
              disabled={readOnly || !mapping.includeInStock}
              placeholder="Chọn mã sản phẩm"
              onValueChanged={(event) => {
                const product = products.find((item) => item.PRODUCT_ID === Number(event.value)) ?? null
                const defaultStore = product?.STORE_ID ? stores.find((item) => item.STORE_ID === product.STORE_ID) ?? null : null
                onMappingChange(cell.data.key, { ...mapping, product, store: defaultStore ?? mapping.store })
              }}
            />
          }}
        />
        <Column
          caption="Kho xuất"
          minWidth={200}
          allowSorting={false}
          allowFiltering={false}
          cellRender={(cell) => {
            const mapping = mappings?.[cell.data.key] ?? { includeInStock: true, product: null, store: null }
            return <SelectBox
              dataSource={stores}
              valueExpr="STORE_ID"
              displayExpr={(item: StoreInfo | null) => item ? `${item.STORE_CD} · ${item.STORE_NM_VIET}` : ""}
              value={mapping.store?.STORE_ID ?? null}
              searchEnabled
              showClearButton
              disabled={readOnly || !mapping.includeInStock}
              placeholder="Chọn kho xuất"
              onValueChanged={(event) => {
                const store = stores.find((item) => item.STORE_ID === Number(event.value)) ?? null
                onMappingChange(cell.data.key, { ...mapping, store })
              }}
            />
          }}
        />
      </> : <Column
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
