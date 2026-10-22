import { useEffect, useRef, useState } from "react"
import { getGdtInvoiceDetail } from "@/api/gdtImportApi"
import { fetchProductLookup, fetchStoreLookup } from "@/api/lookupApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import type { ChitInfo } from "@/types/voucher"
import type { Product } from "@/types/product"
import type { StoreInfo } from "@/types/store"
import VatInvoiceInventoryJsonGrid, { mapVatInvoiceInventoryJsonRows, type VatInvoiceInventoryJsonRow, type VatInvoiceInventoryMapping } from "./VatInvoiceInventoryJsonGrid"
import { buildVatInventoryInputLines, defaultVatInventoryMapping, getVatInventoryInputSource, saveVatInventoryInput } from "./vatInventoryInput"
import { formatVatInvoiceLabel, getVatInvoiceKey, type VatInvoiceRow } from "./vatInvoiceVoucherDraft"

export function useVatMergedInventoryInput(visible: boolean, enabled: boolean, invoices: VatInvoiceRow[], saving: boolean) {
  const [rows, setRows] = useState<VatInvoiceInventoryJsonRow[]>([])
  const [mappings, setMappings] = useState<Record<string, VatInvoiceInventoryMapping>>({})
  const [products, setProducts] = useState<Product[]>([])
  const [stores, setStores] = useState<StoreInfo[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string>()
  const [reload, setReload] = useState(0)
  const [posted, setPosted] = useState<string[]>([])
  const postedRef = useRef(new Set<string>())
  const [invoiceKey, setInvoiceKey] = useState("")

  useEffect(() => {
    setMappings({})
    setRows([])
    setPosted([])
    postedRef.current.clear()
    setInvoiceKey(invoices[0] ? getVatInvoiceKey(invoices[0]) : "")
  }, [visible, invoices])

  useEffect(() => {
    if (!visible || !enabled) return
    let cancelled = false
    setLoading(true)
    setError(undefined)
    void (async () => {
      const [nextProducts, nextStores] = await Promise.all([fetchProductLookup(), fetchStoreLookup()])
      // Read sequentially to avoid flooding the invoice detail endpoint for large selections.
      const nextRows: VatInvoiceInventoryJsonRow[] = []
      for (const invoice of invoices) {
        if (cancelled) return
        const key = getVatInvoiceKey(invoice)
        const detail = await getGdtInvoiceDetail("BUY", key)
        nextRows.push(...mapVatInvoiceInventoryJsonRows(detail).map((row) => ({
          ...row, key: JSON.stringify([key, row.key]), invoiceKey: key, invoiceLabel: formatVatInvoiceLabel(invoice),
        })))
      }
      if (cancelled) return
      setProducts(nextProducts)
      setStores(nextStores)
      setRows(nextRows)
      setMappings((current) => Object.fromEntries(nextRows.map((row) => [row.key,
        current[row.key] ?? defaultVatInventoryMapping(row, nextProducts, nextStores),
      ])))
    })().catch((reason) => {
      if (!cancelled) setError(getApiErrorMessage(reason, "Không tải được dữ liệu nhập kho."))
    }).finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [visible, enabled, invoices, reload])

  const prepare = (record: ChitInfo, persisted: boolean) => {
    if (loading || error) throw new Error(error || "Đang tải chi tiết nhập kho. Vui lòng đợi tải xong trước khi lưu.")
    return invoices.map((invoice) => {
      const key = getVatInvoiceKey(invoice)
      const invoiceRows = rows.filter((row) => row.invoiceKey === key)
      const source = getVatInventoryInputSource(record, invoice)
      if (persisted && !(Number(source.CHITDETAIL_ID) > 0)) throw new Error(`Hóa đơn ${formatVatInvoiceLabel(invoice)} chưa có dòng nguồn đã lưu.`)
      const lines = buildVatInventoryInputLines(invoiceRows, mappings, record, invoice, source)
      if (lines.length && !(Number(source.CUSTOMER_ID) > 0)) throw new Error(`Chọn đối tác cho hóa đơn ${formatVatInvoiceLabel(invoice)} trước khi nhập kho.`)
      return { invoice, source, lines }
    })
  }

  return {
    hasPending: enabled && invoices.some((invoice) => !posted.includes(getVatInvoiceKey(invoice))),
    validate: (record: ChitInfo) => { if (enabled) prepare(record, false) },
    save: async (record: ChitInfo) => {
      if (!enabled) return
      for (const { invoice, source, lines } of prepare(record, true)) {
        await saveVatInventoryInput(record, invoice, source, lines)
        postedRef.current.add(getVatInvoiceKey(invoice))
        setPosted([...postedRef.current])
      }
    },
    content: <div className="flex h-full min-h-0 flex-col gap-2 pt-2">
      <select aria-label="Hóa đơn nhập kho" className="h-8 shrink-0 rounded border border-slate-300 px-2 text-sm" value={invoiceKey} disabled={saving} onChange={(event) => setInvoiceKey(event.target.value)}>
        {invoices.map((invoice) => <option key={getVatInvoiceKey(invoice)} value={getVatInvoiceKey(invoice)}>{formatVatInvoiceLabel(invoice)}{posted.includes(getVatInvoiceKey(invoice)) ? " — Đã nhập kho" : ""}</option>)}
      </select>
      <div className="min-h-0 flex-1">
        <VatInvoiceInventoryJsonGrid direction="input" rows={rows.filter((row) => row.invoiceKey === invoiceKey)} loading={loading} error={error}
          onRetry={() => setReload((value) => value + 1)} products={products} stores={stores} mappings={mappings}
          readOnly={saving || posted.includes(invoiceKey)} onMappingChange={(key, mapping) => setMappings((current) => ({ ...current, [key]: mapping }))} />
      </div>
    </div>,
  }
}
