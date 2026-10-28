import { useCallback, useEffect, useMemo, useRef } from "react"
import { linkGdtInvoicesToVoucher } from "@/api/gdtImportApi"
import type { ChitDetail, ChitInfo } from "@/types/voucher"
import type { InventoryDraftPreparation } from "@/pages/VoucherManagement/components/useRowInventoryEditor"
import { getVatInvoiceKey, type VatInvoiceRow, type VatInvoiceType } from "./vatInvoiceVoucherDraft"
import { prepareVatMergedInventoryDraft, validateVatMergedInventoryDraft } from "./vatMergedInventoryDraft"

export type VatVoucherSource = {
  record: ChitInfo
  invoices: VatInvoiceRow[]
  invoiceType: VatInvoiceType
  loadInventoryDetail: boolean
}

// Supplies invoice context to the existing purchase/sales editor and save pipeline.
export function useVatVoucherSource(source: VatVoucherSource | null) {
  const linkedKeys = useRef(new Set<string>())
  useEffect(() => { linkedKeys.current.clear() }, [source])
  const inventoryEnabled = Boolean(source?.loadInventoryDetail && source.invoices.length > 0)
  const moneyRows = useMemo(() => new Map(source?.invoices.flatMap((invoice, index) => {
    const row = source.record.DETAILS[index * 2]
    return row ? [[row.ROW_KEY, invoice] as const] : []
  }) ?? []), [source])
  const canOpenInventoryRow = useCallback((row: ChitDetail) => moneyRows.has(row.ROW_KEY), [moneyRows])
  const prepareInventoryDraft = useCallback<InventoryDraftPreparation>(async (value, row, record) => {
    const invoice = moneyRows.get(row.ROW_KEY)
    if (!source || !invoice) return { ...value, INPUTS: [], OUTPUTS: [], TOTAL_QTY: 0, AMOUNT: 0 }
    return prepareVatMergedInventoryDraft(value, row, record, invoice, source.invoiceType)
  }, [source, moneyRows])
  const validate = useCallback((record: ChitInfo) => {
    if (!inventoryEnabled) return
    const missing = record.DETAILS.find((row) => !row.ISDEL && moneyRows.has(row.ROW_KEY)
      && (!(Number(row.CUSTOMER_ID) > 0) || !String(row.CUSTOMER_CD ?? "").trim()))
    if (missing) throw new Error(`Hóa đơn ${missing.VAT_CHIT_NO ?? ""} — ${missing.CUSTOMER_NM_VIET ?? ""}: chưa có mã khách hàng/nhà cung cấp.`)
  }, [inventoryEnabled, moneyRows, source])
  const link = useCallback(async (record: ChitInfo) => {
    if (!source) return
    const code = String(record.CHIT_CD ?? "").trim()
    if (!code) throw new Error("Không nhận được mã chứng từ để liên kết hóa đơn.")
    const keys = source.invoices.map(getVatInvoiceKey)
    const pending = keys.filter((key) => !linkedKeys.current.has(key))
    if (pending.length) {
      const results = await linkGdtInvoicesToVoucher(source.invoiceType, pending.map((Mhdon) => ({ Mhdon, ChitCd: code })))
      results.forEach((item) => {
        if (["LINKED", "ALREADY_LINKED"].includes(String(item.Status ?? "").toUpperCase())) linkedKeys.current.add(item.Mhdon)
      })
    }
    if (keys.some((key) => !linkedKeys.current.has(key))) throw new Error(`Đã lưu chứng từ ${code}, còn hóa đơn chưa liên kết. Bấm Lưu để thử lại.`)
  }, [source])
  return { inventoryEnabled, canOpenInventoryRow, prepareInventoryDraft, validateInventoryDraft: validateVatMergedInventoryDraft, validate, link }
}
