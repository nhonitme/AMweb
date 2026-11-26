import type { ChitDateValue, ChitDetail, ChitType } from "@/types/voucher"

export type VatDirection = "BUY" | "SELL"

/** Local VAT draft for one detail row. */
export type VoucherVatDetail = {
  direction: VatDirection | null
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

const NULL_PERCENT_RATE_CODES = new Set(["KCT", "KKKNT", "CTTC"])

export function createEmptyVoucherVatDetail(
  direction: VatDirection | null = null,
): VoucherVatDetail {
  return {
    direction,
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

export function normalizeVatDirection(value: unknown): VatDirection | null {
  const normalized = trimText(value).toUpperCase()
  return normalized === "BUY" || normalized === "SELL" ? normalized : null
}

/** Suggested UI default by voucher type — not auto-persisted until user confirms data. */
export function suggestVatDirectionForChitType(chitType: ChitType | string | null | undefined): VatDirection | null {
  const type = trimText(chitType).toUpperCase()
  switch (type) {
    case "PO":
    case "PS":
    case "PD":
    case "PR":
    case "IR":
      return "BUY"
    case "SO":
    case "SD":
    case "SR":
    case "IO":
      return "SELL"
    default:
      return null
  }
}

export function getVatCategoryCodeType(direction: VatDirection | null | undefined): string | null {
  if (direction === "BUY") {
    return "VAT_BUY_CATEGORY"
  }
  if (direction === "SELL") {
    return "VAT_SELL_CATEGORY"
  }
  return null
}

export function resolveVatRatePercent(
  taxRateCode: string,
  currentPercent: number | null | undefined,
): number | null {
  const code = trimText(taxRateCode).toUpperCase()
  if (!code) {
    return null
  }
  if (NULL_PERCENT_RATE_CODES.has(code)) {
    return null
  }
  if (code === "KHAC") {
    return normalizeNumber(currentPercent)
  }
  const match = code.replace(",", ".").match(/-?\d+(\.\d+)?/)
  if (!match) {
    return null
  }
  const value = Number(match[0])
  return Number.isFinite(value) ? value : null
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

/** Round money to 2 decimals (half-up via standard Number rounding). */
export function roundVoucherVatMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

/**
 * Auto tax from goods × rate%. Returns null when rate does not apply (KCT/KKKNT/CTTC/empty)
 * or goods/rate missing — caller keeps the previous tax amount in those cases.
 */
export function computeVoucherVatTaxAmount(
  goodsAmount: number | null | undefined,
  taxRatePercent: number | null | undefined,
): number | null {
  const goods = normalizeNumber(goodsAmount)
  const percent = normalizeNumber(taxRatePercent)
  if (goods == null || percent == null) {
    return null
  }
  return roundVoucherVatMoney((goods * percent) / 100)
}

export function canAutoCalculateVatTax(
  taxRateCode: string | null | undefined,
  taxRatePercent: number | null | undefined,
): boolean {
  const code = trimText(taxRateCode).toUpperCase()
  if (!code || NULL_PERCENT_RATE_CODES.has(code)) {
    return false
  }
  return normalizeNumber(taxRatePercent) != null
}

/** Apply rate/goods/tax patches and keep total (+ tax when rate applies) in sync. */
export function applyVoucherVatAmountPatch(
  previous: VoucherVatDetail,
  patch: Partial<VoucherVatDetail>,
): VoucherVatDetail {
  const merged: VoucherVatDetail = { ...previous, ...patch }

  const rateCodeChanged = Object.prototype.hasOwnProperty.call(patch, "taxRateCode")
  const rateChanged = Object.prototype.hasOwnProperty.call(patch, "taxRate")
  const goodsChanged = Object.prototype.hasOwnProperty.call(patch, "goodsAmount")
  const taxChanged = Object.prototype.hasOwnProperty.call(patch, "taxAmount")
  const totalExplicit = Object.prototype.hasOwnProperty.call(patch, "totalAmount")

  if ((rateCodeChanged || rateChanged || goodsChanged) && !taxChanged) {
    if (canAutoCalculateVatTax(merged.taxRateCode, merged.taxRate)) {
      merged.taxAmount = computeVoucherVatTaxAmount(merged.goodsAmount, merged.taxRate)
    }
  }

  if (!totalExplicit && (goodsChanged || taxChanged || rateCodeChanged || rateChanged)) {
    merged.totalAmount = computeVoucherVatTotal(merged.goodsAmount, merged.taxAmount)
  }

  return merged
}

export function detailAmountToVatNumber(value: unknown): number | null {
  const numberValue = normalizeNumber(value)
  if (numberValue == null) {
    return null
  }
  return numberValue
}

/** Any non-empty VAT draft field — used to keep in-progress edits in UI state. */
export function hasAnyVoucherVatInput(vat: VoucherVatDetail | null | undefined): boolean {
  if (!vat) {
    return false
  }

  if (vat.direction) {
    return true
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

/** Complete VAT for persist / green button — requires both invoice date and invoice no. */
export function hasMeaningfulVoucherVatData(vat: VoucherVatDetail | null | undefined): boolean {
  if (!vat) {
    return false
  }
  return Boolean(vat.invoiceDate) && Boolean(trimText(vat.invoiceNo))
}

/**
 * Allow closing VAT panel when both required fields are filled, or both are empty
 * (reset / no invoice keys yet). Block when only one of the two is present.
 */
export function canDismissVoucherVatPanel(vat: VoucherVatDetail | null | undefined): boolean {
  if (!vat) {
    return true
  }
  const hasDate = Boolean(vat.invoiceDate)
  const hasInvoiceNo = Boolean(trimText(vat.invoiceNo))
  if (hasDate && hasInvoiceNo) {
    return true
  }
  if (!hasDate && !hasInvoiceNo) {
    return true
  }
  return false
}

function clearVatFieldsOnDetail(detail: ChitDetail): ChitDetail {
  return {
    ...detail,
    VAT_DIRECTION: null,
    VAT_RATE_CD: "",
    VAT_RATE_PERCENT: null,
    VAT_CUSTOMS_EXCHANGE_RATE: null,
    VAT_YMD: null,
    VAT_CHIT_NO: "",
    VAT_SERIAL_NO: "",
    VAT_COMPANY_TAXCD: "",
    VAT_COMPANY_ISSUE: "",
    VAT_INFO_TYPE: "",
    VAT_PRODUCT_NM: "",
    VAT_TAXABLE_AMOUNT: 0,
    PERCENT: 0,
    CHITDETAIL_VAT_CD: "",
    VAT_AMOUNT: 0,
    FO_VAT_AMOUNT: 0,
    VAT_INVOICE_CD: "",
    VAT_ETC: "",
    VAT_INQUIRY_IN: "",
    VAT_INQUIRY_CODE: "",
  }
}

function projectVatOntoDetail(detail: ChitDetail, vat: VoucherVatDetail): ChitDetail {
  const rateCode = trimText(vat.taxRateCode)
  const ratePercent = vat.taxRate
  return {
    ...detail,
    VAT_DIRECTION: vat.direction,
    VAT_RATE_CD: rateCode,
    VAT_RATE_PERCENT: ratePercent,
    VAT_CUSTOMS_EXCHANGE_RATE: vat.customsExchangeRate,
    VAT_YMD: vat.invoiceDate,
    VAT_CHIT_NO: vat.invoiceNo,
    VAT_SERIAL_NO: vat.invoiceSymbol,
    VAT_COMPANY_TAXCD: vat.taxCode,
    VAT_COMPANY_ISSUE: vat.sellerName,
    VAT_INFO_TYPE: vat.infoType,
    VAT_PRODUCT_NM: vat.infoType || detail.VAT_PRODUCT_NM,
    VAT_TAXABLE_AMOUNT: vat.goodsAmount,
    PERCENT: ratePercent,
    CHITDETAIL_VAT_CD: rateCode,
    VAT_AMOUNT: vat.taxAmount,
    FO_VAT_AMOUNT: vat.fcAmount,
    VAT_INVOICE_CD: vat.invoiceTemplateSymbol,
    VAT_ETC: vat.detailNote,
    VAT_INQUIRY_IN: vat.inquiryAt,
    VAT_INQUIRY_CODE: vat.inquiryCode,
  }
}

export function seedVoucherVatDetailFromChitDetail(detail: ChitDetail): VoucherVatDetail | null {
  const rateCode =
    trimText(detail.VAT_RATE_CD) || trimText(detail.CHITDETAIL_VAT_CD)
  const ratePercent =
    normalizeNumber(detail.VAT_RATE_PERCENT) ??
    (rateCode || (normalizeNumber(detail.PERCENT) != null && normalizeNumber(detail.PERCENT) !== 0)
      ? normalizeNumber(detail.PERCENT)
      : null)

  const seeded: VoucherVatDetail = {
    direction: normalizeVatDirection(detail.VAT_DIRECTION),
    invoiceDate: detail.VAT_YMD ?? null,
    invoiceNo: trimText(detail.VAT_CHIT_NO),
    invoiceSymbol: trimText(detail.VAT_SERIAL_NO),
    taxCode: trimText(detail.VAT_COMPANY_TAXCD),
    sellerName: trimText(detail.VAT_COMPANY_ISSUE),
    infoType: trimText(detail.VAT_INFO_TYPE),
    goodsAmount: normalizeNumber(detail.VAT_TAXABLE_AMOUNT),
    taxRate: ratePercent,
    taxRateCode: rateCode,
    taxAmount: normalizeNumber(detail.VAT_AMOUNT),
    totalAmount: null,
    fcAmount: normalizeNumber(detail.FO_VAT_AMOUNT),
    customsExchangeRate: normalizeNumber(detail.VAT_CUSTOMS_EXCHANGE_RATE),
    invoiceTemplateSymbol: trimText(detail.VAT_INVOICE_CD),
    detailNote: trimText(detail.VAT_ETC),
    inquiryAt: trimText(detail.VAT_INQUIRY_IN),
    inquiryCode: trimText(detail.VAT_INQUIRY_CODE),
  }

  // Treat default zeros on unused VAT numeric fields as empty when seeding.
  if (seeded.goodsAmount === 0 && !trimText(detail.VAT_CHIT_NO) && !detail.VAT_YMD && !seeded.direction) {
    seeded.goodsAmount = null
  }
  if (seeded.taxAmount === 0 && !trimText(detail.VAT_CHIT_NO) && !detail.VAT_YMD && !seeded.direction) {
    seeded.taxAmount = null
  }
  if (seeded.fcAmount === 0 && !trimText(detail.VAT_CHIT_NO) && !detail.VAT_YMD && !seeded.direction) {
    seeded.fcAmount = null
  }

  seeded.totalAmount = computeVoucherVatTotal(seeded.goodsAmount, seeded.taxAmount)

  // Keep incomplete drafts editable in UI; green/save still require hasMeaningfulVoucherVatData.
  return hasAnyVoucherVatInput(seeded) ? seeded : null
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
 * Merge local VAT UI state onto detail rows for save / copy.
 * - dirty + meaningful (Ngày HĐ + số HĐ) → apply new VAT
 * - dirty + incomplete/empty → clear VAT (intentional delete / abandon)
 * - not dirty → keep existing detail VAT fields
 */
export function applyLocalVatToDetails(
  details: readonly ChitDetail[],
  vatByRowKey: VoucherVatDetailsMap,
  dirtyRowKeys?: ReadonlySet<string> | null,
): ChitDetail[] {
  return details.map((detail) => {
    const rowKey = typeof detail.ROW_KEY === "string" ? detail.ROW_KEY : ""
    if (!rowKey) {
      return detail
    }

    const isDirty = dirtyRowKeys ? dirtyRowKeys.has(rowKey) : rowKey in vatByRowKey
    if (!isDirty) {
      return detail
    }

    const vat = vatByRowKey[rowKey]
    if (!vat || !hasMeaningfulVoucherVatData(vat)) {
      return clearVatFieldsOnDetail(detail)
    }

    return projectVatOntoDetail(detail, vat)
  })
}

/** @deprecated Prefer applyLocalVatToDetails — kept for existing copy call sites. */
export function applyLocalVatToDetailsForCopy(
  details: readonly ChitDetail[],
  vatByRowKey: VoucherVatDetailsMap,
): ChitDetail[] {
  return applyLocalVatToDetails(details, vatByRowKey, null)
}
