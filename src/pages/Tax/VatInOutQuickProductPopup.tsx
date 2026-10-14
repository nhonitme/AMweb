import { useCallback, useEffect, useMemo, useState } from "react"
import Popup from "devextreme-react/popup"
import { getApiErrorMessage } from "@/api/apiTypes"
import { getGdtInvoiceDetail } from "@/api/gdtImportApi"
import type { Product } from "@/types/product"
import type { VatInvoiceRow, VatInvoiceType } from "./vatInvoiceVoucherDraft"
import { formatVatInvoiceLabel, getVatInvoiceKey } from "./vatInvoiceVoucherDraft"
import VatInvoiceInventoryJsonGrid, { mapVatInvoiceInventoryJsonRows, type VatInvoiceInventoryJsonRow } from "./VatInvoiceInventoryJsonGrid"
import { VatProductQuickCreatePopup } from "@/components/lookup/VatQuickCreatePopups"

type Props = {
  visible: boolean
  invoiceType: VatInvoiceType
  invoice: VatInvoiceRow | null
  onClose: () => void
}

export default function VatInOutQuickProductPopup({ visible, invoiceType, invoice, onClose }: Props) {
  const invoiceKey = invoice ? getVatInvoiceKey(invoice) : ""
  const [rows, setRows] = useState<VatInvoiceInventoryJsonRow[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [activeRow, setActiveRow] = useState<VatInvoiceInventoryJsonRow | null>(null)
  const [createdProducts, setCreatedProducts] = useState<Record<string, Product>>({})

  useEffect(() => {
    if (!visible || !invoiceKey) return
    let cancelled = false
    setLoading(true)
    setError("")
    setRows([])
    setActiveRow(null)
    setCreatedProducts({})
    void getGdtInvoiceDetail(invoiceType, invoiceKey)
      .then((payload) => {
        if (!cancelled) setRows(mapVatInvoiceInventoryJsonRows(payload))
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(getApiErrorMessage(cause, "Không tải được chi tiết hàng hóa/dịch vụ của hóa đơn."))
      })
      .finally(() => {
        if (!cancelled) setLoading(false)
      })
    return () => { cancelled = true }
  }, [invoiceKey, invoiceType, visible])

  const createdByRow = useMemo(() => createdProducts, [createdProducts])
  const onSaved = useCallback((product: Product) => {
    if (!activeRow) return
    setCreatedProducts((current) => ({ ...current, [activeRow.key]: product }))
    setActiveRow(null)
  }, [activeRow])

  return (
    <>
      <Popup
        visible={visible}
        title="Tạo nhanh sản phẩm từ hóa đơn VAT"
        showTitle
        showCloseButton
        width="min(1100px, 96vw)"
        height="min(720px, 90vh)"
        dragEnabled={false}
        hideOnOutsideClick={false}
        onHiding={onClose}
      >
        <div className="flex h-full min-h-0 flex-col gap-2 p-2">
          <div className="text-sm text-slate-600">Hóa đơn: {invoice ? formatVatInvoiceLabel(invoice) : "—"}. Chọn dòng để tạo sản phẩm vào danh mục.</div>
          <div className="min-h-0 flex-1 overflow-hidden rounded border border-slate-200">
            <VatInvoiceInventoryJsonGrid
              rows={rows}
              loading={loading}
              error={error || undefined}
              onRetry={() => {
                if (invoice) {
                  setError("")
                  setLoading(true)
                  void getGdtInvoiceDetail(invoiceType, invoiceKey)
                    .then((payload) => setRows(mapVatInvoiceInventoryJsonRows(payload)))
                    .catch((cause: unknown) => setError(getApiErrorMessage(cause, "Không tải được chi tiết hóa đơn.")))
                    .finally(() => setLoading(false))
                }
              }}
              createdProducts={createdByRow}
              onQuickCreateProduct={setActiveRow}
            />
          </div>
        </div>
      </Popup>
      <VatProductQuickCreatePopup
        visible={Boolean(activeRow)}
        name={String(activeRow?.name ?? "")}
        unitName={String(activeRow?.unit ?? "")}
        onClose={() => setActiveRow(null)}
        onSaved={onSaved}
      />
    </>
  )
}
