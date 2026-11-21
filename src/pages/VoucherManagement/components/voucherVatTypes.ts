import type { ChitDateValue, ChitDetail } from "@/types/voucher"

/** Local VAT draft for one detail row — not written into save payload in this phase. */
export type VoucherVatDetail = {
  invoiceDate: ChitDateValue
  invoiceNo: string
  invoiceSymbol: string
  taxCode: string
  sellerName: string
  infoType: string
  goodsAmount: number | null
  taxRate: number | null
  taxRateCode: string
  taxAmount: number | null
  totalAmount: number | null
  fcAmount: number | null
  customsExchangeRate: number | null
  invoiceTemplateSymbol: string
  detailNote: string
  inquiryAt: string
  inquiryCode: string
}

export type VoucherVatDetailsMap = Record<string, VoucherVatDetail>

export function createEmptyVoucherVatDetail(): VoucherVatDetail {
  return {
    invoiceDate: null,
    invoiceNo: "",
    invoiceSymbol: "",
    taxCode: "",
    sellerName: "",
    infoType: "",
    goodsAmount: null,
    taxRate: null,
    taxRateCode: "",
    taxAmount: null,
    totalAmount: null,
    fcAmount: null,
    customsExchangeRate: null,
    invoiceTemplateSymbol: "",
    detailNote: "",
    inquiryAt: "",
    inquiryCode: "",
  }
}

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim()
}

function normalizeNumber(value: unknown): number | null {
  if (value == null || value === "") {
    return null
  }
  const numberValue = typeof value === "number" ? value : Number(value)
  return Number.isFinite(numberValue) ? numberValue : null
}

export function computeVoucherVatTotal(
  goodsAmount: number | null | undefined,
  taxAmount: number | null | undefined,
): number | null {
  const goods = normalizeNumber(goodsAmount)
  const tax = normalizeNumber(taxAmount)
  if (goods == null && tax == null) {
    return null
  }
  return (goods ?? 0) + (tax ?? 0)
}

/** Meaningful VAT entered in UI — empty object does not count. */
export function hasMeaningfulVoucherVatData(vat: VoucherVatDetail | null | undefined): boolean {
  if (!vat) {
    return false
  }

  if (vat.invoiceDate) {
    return true
  }

  if (
    trimText(vat.invoiceNo)
    || trimText(vat.invoiceSymbol)
    || trimText(vat.taxCode)
    || trimText(vat.sellerName)
    || trimText(vat.infoType)
    || trimText(vat.taxRateCode)
    || trimText(vat.invoiceTemplateSymbol)
    || trimText(vat.detailNote)
    || trimText(vat.inquiryAt)
    || trimText(vat.inquiryCode)
  ) {
    return true
  }

  if (normalizeNumber(vat.goodsAmount) != null && normalizeNumber(vat.goodsAmount) !== 0) {
    return true
  }
  // Default ChitDetail.PERCENT is 0 — do not treat a lone zero rate as entered VAT.
  if (normalizeNumber(vat.taxRate) != null && normalizeNumber(vat.taxRate) !== 0) {
    return true
  }
  if (normalizeNumber(vat.taxAmount) != null && normalizeNumber(vat.taxAmount) !== 0) {
    return true
  }
  if (normalizeNumber(vat.fcAmount) != null && normalizeNumber(vat.fcAmount) !== 0) {
    return true
  }
  if (normalizeNumber(vat.customsExchangeRate) != null && normalizeNumber(vat.customsExchangeRate) !== 0) {
    return true
  }

  return false
}

export function seedVoucherVatDetailFromChitDetail(detail: ChitDetail): VoucherVatDetail | null {
  const seeded: VoucherVatDetail = {
    invoiceDate: detail.VAT_YMD ?? null,
    invoiceNo: trimText(detail.VAT_CHIT_NO),
    invoiceSymbol: trimText(detail.VAT_SERIAL_NO),
    taxCode: trimText(detail.VAT_COMPANY_TAXCD),
    sellerName: trimText(detail.VAT_COMPANY_ISSUE),
    infoType: trimText(detail.VAT_INFO_TYPE) || trimText(detail.VAT_PRODUCT_NM),
    goodsAmount: normalizeNumber(detail.VAT_TAXABLE_AMOUNT),
    taxRate: null,
    taxRateCode: trimText(detail.CHITDETAIL_VAT_CD),
    taxAmount: normalizeNumber(detail.VAT_AMOUNT),
    totalAmount: null,
    fcAmount: normalizeNumber(detail.FO_VAT_AMOUNT),
    customsExchangeRate: null,
    invoiceTemplateSymbol: trimText(detail.VAT_INVOICE_CD),
    detailNote: trimText(detail.VAT_ETC),
    inquiryAt: trimText(detail.VAT_INQUIRY_IN),
    inquiryCode: trimText(detail.VAT_INQUIRY_CODE),
  }

  const percent = normalizeNumber(detail.PERCENT)
  if (seeded.taxRateCode || (percent != null && percent !== 0)) {
    seeded.taxRate = percent
  }

  // Treat default zeros on unused VAT numeric fields as empty when seeding.
  if (seeded.goodsAmount === 0 && !trimText(detail.VAT_CHIT_NO) && !detail.VAT_YMD) {
    seeded.goodsAmount = null
  }
  if (seeded.taxAmount === 0 && !trimText(detail.VAT_CHIT_NO) && !detail.VAT_YMD) {
    seeded.taxAmount = null
  }
  if (seeded.fcAmount === 0 && !trimText(detail.VAT_CHIT_NO) && !detail.VAT_YMD) {
    seeded.fcAmount = null
  }

  seeded.totalAmount = computeVoucherVatTotal(seeded.goodsAmount, seeded.taxAmount)

  return hasMeaningfulVoucherVatData(seeded) ? seeded : null
}

export function seedVoucherVatDetailsMap(details: readonly ChitDetail[]): VoucherVatDetailsMap {
  const next: VoucherVatDetailsMap = {}
  for (const detail of details) {
    const rowKey = typeof detail.ROW_KEY === "string" ? detail.ROW_KEY.trim() : ""
    if (!rowKey) {
      continue
    }
    const seeded = seedVoucherVatDetailFromChitDetail(detail)
    if (seeded) {
      next[rowKey] = seeded
    }
  }
  return next
}

export function remapVoucherVatDetailsByRowKeys(
  source: VoucherVatDetailsMap,
  keyPairs: ReadonlyArray<{ fromKey: string; toKey: string }>,
): VoucherVatDetailsMap {
  const next: VoucherVatDetailsMap = {}
  for (const { fromKey, toKey } of keyPairs) {
    const vat = source[fromKey]
    if (vat && toKey) {
      next[toKey] = { ...vat }
    }
  }
  return next
}

/**
 * Project local VAT UI state onto detail rows for copy/duplicate handoff only.
 * Does not mutate the live editor draft used by normal voucher save in this phase.
 */
export function applyLocalVatToDetailsForCopy(
  details: readonly ChitDetail[],
  vatByRowKey: VoucherVatDetailsMap,
): ChitDetail[] {
  return details.map((detail) => {
    const rowKey = typeof detail.ROW_KEY === "string" ? detail.ROW_KEY : ""
    const vat = rowKey ? vatByRowKey[rowKey] : undefined
    if (!vat || !hasMeaningfulVoucherVatData(vat)) {
      return detail
    }

    return {
      ...detail,
      VAT_YMD: vat.invoiceDate,
      VAT_CHIT_NO: vat.invoiceNo,
      VAT_SERIAL_NO: vat.invoiceSymbol,
      VAT_COMPANY_TAXCD: vat.taxCode,
      VAT_COMPANY_ISSUE: vat.sellerName,
      VAT_INFO_TYPE: vat.infoType,
      VAT_PRODUCT_NM: vat.infoType || detail.VAT_PRODUCT_NM,
      VAT_TAXABLE_AMOUNT: vat.goodsAmount,
      PERCENT: vat.taxRate,
      CHITDETAIL_VAT_CD: vat.taxRateCode,
      VAT_AMOUNT: vat.taxAmount,
      FO_VAT_AMOUNT: vat.fcAmount,
      VAT_INVOICE_CD: vat.invoiceTemplateSymbol,
      VAT_ETC: vat.detailNote,
      VAT_INQUIRY_IN: vat.inquiryAt,
      VAT_INQUIRY_CODE: vat.inquiryCode,
    }
  })
}
