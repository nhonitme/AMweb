export type VatInvoiceStatusOption = {
  value: string
  langKey: string
  fallback: string
}

/** Shared VAT e-invoice status codes (tthai) — same keys as VatInOut / combobox. */
export const VAT_INVOICE_STATUS_OPTIONS: VatInvoiceStatusOption[] = [
  { value: "", langKey: "VAT_INOUT_STATUS_ALL", fallback: "Tất cả" },
  { value: "1", langKey: "eInvoice_AdjustType_NM_1", fallback: "Hóa đơn mới" },
  { value: "2", langKey: "eInvoice_AdjustType_NM_3", fallback: "Hóa đơn thay thế" },
  { value: "3", langKey: "eInvoice_AdjustType_NM_5", fallback: "Hóa đơn điều chỉnh" },
  { value: "4", langKey: "eInvoice_AdjustType_NM_2", fallback: "Hóa đơn bị thay thế" },
  { value: "5", langKey: "eInvoice_AdjustType_NM_4", fallback: "Hóa đơn bị điều chỉnh" },
  { value: "6", langKey: "eInvoice_AdjustType_NM_6", fallback: "Hóa đơn hủy" },
  { value: "998", langKey: "eInvoice_AdjustType_NM_998", fallback: "Chưa có JSON" },
]

/** Resolve display label from status code, lang key, or legacy Vietnamese text. */
export function resolveVatInvoiceStatusLabel(
  statusOrKeyOrText: string,
  translate: (key: string, fallback: string) => string,
): string | null {
  const raw = statusOrKeyOrText.trim()
  if (!raw) return null
  const option = VAT_INVOICE_STATUS_OPTIONS.find(
    (item) => item.value === raw || item.langKey === raw || item.fallback === raw,
  )
  if (!option || option.value === "") return null
  return translate(option.langKey, option.fallback)
}
