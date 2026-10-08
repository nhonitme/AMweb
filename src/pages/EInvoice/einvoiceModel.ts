import type { SysCode } from "@/api/sysCodeService"
import {
  buildEInvoiceNumericSysCodeOptions,
  formatEInvoiceNumericSysCodeText,
  type EInvoiceNumericSysCodeOption,
} from "./einvoiceSysCodeOptions"
import type { EInvoice, EInvoiceApi, EInvoiceBkeDetail, EInvoiceBkeDetailApi, EInvoiceBkeInfo, EInvoiceBkeInfoApi, EInvoiceBkeReason, EInvoiceBkeReasonApi, EInvoiceDetail, EInvoiceDetailApi, EInvoiceDetailSpecialInfo, EInvoiceDetailSpecialInfoApi, EInvoiceRelatedInfo, EInvoiceRelatedInfoApi, EInvoiceSeller } from "@/types/einvoice"
import { DEFAULT_CURRENCY_CODE, isForeignCurrencyCode, normalizeCurrencyCode } from "@/lib/currency"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import { convertAmountToWords } from "@/lib/reportCurrency"
import type { EInvoiceDecimalResolver } from "./einvoiceDecimalSettings"
import {
  applyWarehouseFieldsToInvoice,
  createEInvoicePxkInfoFromWarehouseFields,
  isEInvoiceWarehouseForm,
  normalizeEInvoicePxkInfo,
  stripWarehouseFieldsFromExtra,
  type EInvoiceWarehouseFields,
} from "./einvoiceWarehouseModel"
import {
  enrichWarehouseDetailRow,
  preparePxkInvoiceForSave,
  serializeWarehouseDetailExtra,
} from "./einvoiceWarehouseDetailModel"
import { applyEInvoiceNq204SalesTotals, isEInvoiceSalesForm } from "./einvoiceNq204Model"

export {
  applyEInvoiceNq204SalesTotals,
  calculateEInvoiceNq204ReductionAmount,
  isEInvoiceNq204Active,
  isEInvoiceSalesForm,
  setEInvoiceNq204Extra,
  type EInvoiceNq204TotalsOptions,
} from "./einvoiceNq204Model"

export interface EInvoiceCalcSettings {
  autoCalcAmount?: boolean
  autoCalcTax?: boolean
  autoCalcPriceFromBeforeTaxAmount?: boolean
  autoCalcPriceFromAfterTaxAmount?: boolean
  detailAmountDriver?: "quantity" | "beforeTaxAmount" | "afterTaxAmount" | "afterTaxUnitPrice"
  afterTaxUnitPriceValue?: number
  /** Hóa đơn điều chỉnh (TCHDON=2): cho phép số âm và phép tính có dấu +/- */
  allowNegativeValues?: boolean
}

export const EINV_ADJUSTMENT_TCHDON = 2

export function isEInvoiceAdjustmentInvoice(tchdon: number | null | undefined): boolean {
  return toNumber(tchdon, 0) === EINV_ADJUSTMENT_TCHDON
}

export const COMMERCIAL_DISCOUNT_TCHAT = 3
const SPECIAL_GOODS_TCHAT = 5

/** TCHAT=3: commercial discount amount is stored in THTIEN only, not STCKHAU. */
export function isCommercialDiscountTchat(tchat: unknown): boolean {
  return Number(tchat) === COMMERCIAL_DISCOUNT_TCHAT
}

/** TCHAT=3 lines store commercial discount in THTIEN as a positive amount; header TTCKTMAI sums those amounts. */
export function toStoredCommercialDiscountAmount(value: number | string | null | undefined): number {
  return Math.abs(toNumber(value, 0))
}

export function toDisplayCommercialDiscountAmount(value: number | string | null | undefined): number {
  return toStoredCommercialDiscountAmount(value)
}

function resolveCommercialDiscountLineAmount(detail: EInvoiceDetail): number {
  return toStoredCommercialDiscountAmount(detail.THTIEN)
}

function resolveCommercialDiscountLineAmountVnd(detail: EInvoiceDetail): number {
  return toStoredCommercialDiscountAmount(detail.THTIEN_VND)
}

export type EInvoiceCommercialDiscountSource = "detail-lines" | "header"

export interface EInvoiceCommercialDiscountResolution {
  source: EInvoiceCommercialDiscountSource
  amount: number
  amountVnd: number
  goodsBeforeTax: number
  goodsBeforeTaxVnd: number
  taxableAmount: number
  taxableAmountVnd: number
}

export function resolveEInvoiceCommercialDiscount(
  invoice: Pick<EInvoice, "TTCKTMAI" | "TTCKTMAI_VND">,
  activeDetails: EInvoiceDetail[],
  options?: { allowNegativeValues?: boolean },
): EInvoiceCommercialDiscountResolution {
  const allowNegative = options?.allowNegativeValues === true
  const clampMinimum = (value: number) => (allowNegative ? value : Math.max(value, 0))
  const productDetails = activeDetails.filter((detail) => !isCommercialDiscountTchat(detail.TCHAT))
  const discountLineDetails = activeDetails.filter((detail) => isCommercialDiscountTchat(detail.TCHAT))
  const goodsBeforeTax = productDetails.reduce((sum, detail) => sum + toNumber(detail.THTIEN, 0), 0)
  const goodsBeforeTaxVnd = productDetails.reduce((sum, detail) => sum + toNumber(detail.THTIEN_VND, 0), 0)

  if (discountLineDetails.length > 0) {
    const amount = discountLineDetails.reduce((sum, detail) => sum + resolveCommercialDiscountLineAmount(detail), 0)
    const amountVnd = discountLineDetails.reduce((sum, detail) => sum + resolveCommercialDiscountLineAmountVnd(detail), 0)

    return {
      source: "detail-lines",
      amount,
      amountVnd,
      goodsBeforeTax,
      goodsBeforeTaxVnd,
      taxableAmount: clampMinimum(goodsBeforeTax - amount),
      taxableAmountVnd: clampMinimum(goodsBeforeTaxVnd - amountVnd),
    }
  }

  const amount = allowNegative ? toNumber(invoice.TTCKTMAI, 0) : Math.max(toNumber(invoice.TTCKTMAI, 0), 0)
  const amountVnd = allowNegative ? toNumber(invoice.TTCKTMAI_VND, 0) : Math.max(toNumber(invoice.TTCKTMAI_VND, 0), 0)

  return {
    source: "header",
    amount,
    amountVnd,
    goodsBeforeTax,
    goodsBeforeTaxVnd,
    taxableAmount: clampMinimum(goodsBeforeTax - amount),
    taxableAmountVnd: clampMinimum(goodsBeforeTaxVnd - amountVnd),
  }
}

export const COMMERCIAL_DISCOUNT_LINE_NAME = "Chiết khấu thương mại"

export function resolveHeaderCommercialDiscountNote(
  source: EInvoiceCommercialDiscountSource,
  amount: number,
  currentNote: string | null | undefined,
): string {
  if (source === "detail-lines" || amount <= 0) {
    return ""
  }

  return trimText(currentNote) || COMMERCIAL_DISCOUNT_LINE_NAME
}

export function applyEInvoiceDetailTchatChange(detail: EInvoiceDetail, nextTchat: number): EInvoiceDetail {
  return {
    ...detail,
    TCHAT: nextTchat,
    SPECIAL: Number(nextTchat) === SPECIAL_GOODS_TCHAT ? detail.SPECIAL : null,
  }
}

export function resolveHeaderCommercialDiscountAmount(
  invoice: Pick<EInvoice, "TTCKTMAI" | "TTCKTMAI_VND">,
  manualOverrides: Partial<Record<string, unknown>> = {},
): { amount: number; amountVnd: number } {
  return {
    amount: Math.max(Number(manualOverrides.TTCKTMAI ?? invoice.TTCKTMAI ?? 0), 0),
    amountVnd: Math.max(Number(manualOverrides.TTCKTMAI_VND ?? invoice.TTCKTMAI_VND ?? 0), 0),
  }
}

export function migrateHeaderCommercialDiscountToDetailLine(
  invoice: Pick<EInvoice, "TTCKTMAI" | "TTCKTMAI_VND" | "CKTMAI_GCHU" | "DETAILS">,
  detail: EInvoiceDetail,
  nextTchat: number,
  manualOverrides: Partial<Record<string, unknown>> = {},
  defaultVatRate = "",
): {
  detail: EInvoiceDetail
  manualOverrides: Partial<Record<string, unknown>>
} {
  const transitioned = applyEInvoiceDetailTchatChange(detail, nextTchat)

  if (!isCommercialDiscountTchat(nextTchat)) {
    return { detail: transitioned, manualOverrides }
  }

  const nextOverrides = { ...manualOverrides }
  delete nextOverrides.TTCKTMAI
  delete nextOverrides.TTCKTMAI_VND
  delete nextOverrides.CKTMAI_GCHU

  const activeDetails = invoice.DETAILS.filter((item) => item.ISDEL !== 1)
  const otherDiscountLines = activeDetails.filter(
    (item) => item.ROW_KEY !== detail.ROW_KEY && isCommercialDiscountTchat(item.TCHAT),
  )
  const { amount: headerAmount, amountVnd: headerAmountVnd } = resolveHeaderCommercialDiscountAmount(
    invoice,
    manualOverrides,
  )
  const lineAmount = toNumber(transitioned.THTIEN, 0)
  const headerNote = trimText(
    typeof manualOverrides.CKTMAI_GCHU === "string"
      ? manualOverrides.CKTMAI_GCHU
      : invoice.CKTMAI_GCHU,
  )

  if (headerAmount > 0 && lineAmount <= 0 && otherDiscountLines.length === 0) {
    transitioned.THTIEN = headerAmount
    if (headerAmountVnd > 0) {
      transitioned.THTIEN_VND = headerAmountVnd
    }
  }

  if (!trimText(transitioned.THHDVU)) {
    transitioned.THHDVU = headerNote || COMMERCIAL_DISCOUNT_LINE_NAME
  }

  if (!trimText(transitioned.TSUAT)) {
    const resolvedTaxRate =
      resolveHeaderTaxRateFromDetails(invoice.DETAILS, defaultVatRate) ||
      trimText(defaultVatRate) ||
      null
    if (resolvedTaxRate) {
      transitioned.TSUAT = resolvedTaxRate
    }
  }

  transitioned.TLCKHAU = null
  transitioned.STCKHAU = 0
  transitioned.STCKHAU_VND = 0

  return { detail: transitioned, manualOverrides: nextOverrides }
}

const trimText = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "")

const trimUnknownText = (value: unknown): string => String(value ?? "").trim()
const nullableText = (value: string | null | undefined): string | null => {
  const text = trimText(value)
  return text.length > 0 ? text : null
}

const toNumber = (value: number | string | null | undefined, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

const toNullableNumber = (value: number | string | null | undefined): number | null => {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsed = toNumber(value, Number.NaN)
  return Number.isFinite(parsed) ? parsed : null
}

const toDateText = (value: string | Date | null | undefined): string | null => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = `${value.getMonth() + 1}`.padStart(2, "0")
    const day = `${value.getDate()}`.padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const text = trimText(value)
  return text.length > 0 ? text.slice(0, 10) : null
}

const buildRowKey = (): string => `einv-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
const taxCodeWithoutPercent = new Set(["KCT", "KKKNT", "KHAC", "CTTC"])

export interface EInvoiceTaxSummary {
  TSuat: string
  ThTien: number
  TThue: number
}

export function formatDateForApi(value: Date | null): string | undefined {
  const dateText = toDateText(value)
  return dateText ?? undefined
}

export function isEInvoiceSigned(
  invoice: Pick<EInvoice, "IS_SIGNED"> | null | undefined,
): boolean {
  if (!invoice) {
    return false
  }

  return toNumber(invoice.IS_SIGNED, 0) === 1
}

export function isEInvoiceMttIssued(
  invoice: Pick<EInvoice, "SHDON"> | null | undefined,
): boolean {
  return String(invoice?.SHDON ?? "").trim().length > 0
}

export function isEInvoiceReadyToSendMail(
  invoice: Pick<EInvoice, "IS_SIGNED" | "SHDON"> | null | undefined,
): boolean {
  if (!invoice || !isEInvoiceSigned(invoice)) {
    return false
  }

  return String(invoice.SHDON ?? "").trim().length > 0
}

const BUYER_EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export function parseBuyerEmails(value: string | null | undefined): string[] {
  const text = String(value ?? "").trim()
  if (!text) {
    return []
  }

  return [...new Set(
    text
      .split(/[;,]/)
      .map((part) => part.trim())
      .filter(Boolean),
  )]
}

export function normalizeBuyerEmailList(value: string | null | undefined): string {
  return parseBuyerEmails(value).join(";")
}

export function isValidBuyerEmailList(value: string | null | undefined): boolean {
  const emails = parseBuyerEmails(value)
  if (emails.length === 0) {
    return true
  }

  return emails.every((email) => BUYER_EMAIL_PATTERN.test(email))
}

export const EINV_INVOICE_STATUS_CODE_TYPE = "EINV_INVOICE_STATUS"
export const EINV_MAIL_STATUS_CODE_TYPE = "EINV_MAIL_STATUS"

export type EInvoiceMailStatusOption = EInvoiceNumericSysCodeOption

export type EInvoiceStatusOption = {
  value: number
  text: string
}

type SysCodeTranslate = (key: string, fallback: string) => string

export function buildInvoiceStatusOptions(codes: SysCode[], translate: SysCodeTranslate): EInvoiceStatusOption[] {
  return codes
    .filter((code) => Number(code.IS_ACTIVE ?? 0) === 1 && String(code.ISDEL ?? "0") !== "1")
    .sort((left, right) => Number(left.SORT_ORDER ?? 0) - Number(right.SORT_ORDER ?? 0))
    .map((code) => {
      const value = Number(code.CODE_CD)
      if (!Number.isFinite(value) || value < 0 || value > 6) {
        return null
      }

      const langKey = trimText(code.CODE_NAME)
      const fallback = langKey || String(code.CODE_CD)
      return {
        value,
        text: langKey ? translate(langKey, fallback) : fallback,
      }
    })
    .filter((option): option is EInvoiceStatusOption => option !== null)
}

export function formatEInvoiceInvoiceStatusText(
  status: number | null | undefined,
  options: EInvoiceStatusOption[],
): string {
  const value = toNumber(status, 0)
  const matched = options.find((option) => option.value === value)?.text
  if (matched) {
    return matched
  }

  // Avoid flashing raw codes (e.g. "0") before sys-codes finish loading.
  if (options.length === 0) {
    return ""
  }

  return String(value)
}

export function getEInvoiceInvoiceStatusClassName(status: number | null | undefined): string {
  const value = toNumber(status, 0)
  if (value === 6) {
    return "font-medium text-red-600"
  }

  if (value === 1) {
    return "font-medium text-green-600"
  }

  return "text-slate-600"
}

export function buildEInvoiceMailStatusOptions(codes: SysCode[], translate: SysCodeTranslate): EInvoiceMailStatusOption[] {
  return buildEInvoiceNumericSysCodeOptions(codes, translate, (value) => value >= 0 && value <= 2)
}

export function formatEInvoiceMailStatusText(
  status: number | null | undefined,
  options: EInvoiceMailStatusOption[],
): string {
  return formatEInvoiceNumericSysCodeText(status, options, options.length === 0 ? "" : String(toNumber(status, 0)))
}

export function getEInvoiceMailStatusBadgeClassName(status: number | null | undefined): string {
  const value = toNumber(status, 0)
  if (value === 1) {
    return "bg-sky-50 text-sky-700 ring-sky-200"
  }

  if (value === 2) {
    return "bg-red-50 text-red-700 ring-red-200"
  }

  return "bg-slate-50 text-slate-600 ring-slate-200"
}

export function formatEInvoiceSignedLabel(
  invoice: Pick<EInvoice, "IS_SIGNED"> | null | undefined,
  signedYes: string,
  signedNo: string,
): string {
  return isEInvoiceSigned(invoice) ? signedYes : signedNo
}

export function formatEInvoiceStatusSummary(
  invoice: Pick<EInvoice, "IS_SIGNED" | "INVOICE_STATUS" | "TCHDON" | "MAIL_STATUS"> | null | undefined,
  statusOptions: EInvoiceStatusOption[],
  signedYes: string,
  signedNo: string,
  tchdonOptions: EInvoiceTchdonOption[] = [],
  mailStatusOptions: EInvoiceMailStatusOption[] = [],
): string {
  if (!invoice) {
    return ""
  }

  const signedLabel = formatEInvoiceSignedLabel(invoice, signedYes, signedNo)
  const statusLabel = formatEInvoiceInvoiceStatusText(invoice.INVOICE_STATUS, statusOptions)
  const tchdonLabel = formatEInvoiceTchdonStatusText(invoice.TCHDON, tchdonOptions)
  const mailStatusLabel = isEInvoiceSigned(invoice)
    ? formatEInvoiceMailStatusText(invoice.MAIL_STATUS, mailStatusOptions)
    : ""
  return [signedLabel, statusLabel, tchdonLabel, mailStatusLabel].filter(Boolean).join(" · ")
}

export type EInvoiceTchdonOption = {
  value: number
  text: string
}

export const EINV_TCHDON_STATUS_DISPLAY_VALUES = new Set<number>([1, 2, 3, 4, 5])

export function buildEInvoiceTchdonOptions(codes: SysCode[], translate: SysCodeTranslate): EInvoiceTchdonOption[] {
  return codes
    .filter((code) => Number(code.IS_ACTIVE ?? 0) === 1 && String(code.ISDEL ?? "0") !== "1")
    .sort((left, right) => Number(left.SORT_ORDER ?? 0) - Number(right.SORT_ORDER ?? 0))
    .map((code) => {
      const value = Number(code.CODE_CD)
      if (!Number.isFinite(value)) {
        return null
      }

      const langKey = trimText(code.CODE_NAME)
      const fallback = langKey || String(code.CODE_CD)
      return {
        value,
        text: langKey ? translate(langKey, fallback) : fallback,
      }
    })
    .filter((option): option is EInvoiceTchdonOption => option !== null)
}

export function shouldDisplayEInvoiceTchdonInStatus(tchdon: number | null | undefined): boolean {
  return EINV_TCHDON_STATUS_DISPLAY_VALUES.has(toNumber(tchdon, 0))
}

export function formatEInvoiceTchdonText(
  tchdon: number | null | undefined,
  options: EInvoiceTchdonOption[],
): string {
  const value = toNumber(tchdon, 0)
  const matched = options.find((option) => option.value === value)?.text
  if (matched) {
    return matched
  }

  // Avoid flashing raw codes (e.g. "4") before sys-codes finish loading.
  if (options.length === 0) {
    return ""
  }

  return String(value)
}

export function formatEInvoiceTchdonStatusText(
  tchdon: number | null | undefined,
  options: EInvoiceTchdonOption[],
): string {
  if (!shouldDisplayEInvoiceTchdonInStatus(tchdon)) {
    return ""
  }

  return formatEInvoiceTchdonText(tchdon, options)
}

export function normalizeEInvoiceVatRateCode(value: string | null | undefined): string {
  const text = trimText(value).toUpperCase().replace(/\s+/g, "")
  if (!text) {
    return ""
  }

  if (taxCodeWithoutPercent.has(text)) {
    return text
  }

  const specialMatch = text.match(/^(KHAC|CTTC):?([0-9]+(?:[.,][0-9]+)?)%?$/)
  if (specialMatch) {
    return `${specialMatch[1]}:${specialMatch[2].replace(",", ".")}%`
  }

  const numberMatch = text.match(/^([0-9]+(?:[.,][0-9]+)?)%?$/)
  if (numberMatch) {
    return `${numberMatch[1].replace(",", ".")}%`
  }

  return text
}

export function resolveEInvoiceVatRatePercent(value: string | null | undefined): number {
  const code = normalizeEInvoiceVatRateCode(value)
  const percentMatch = code.match(/([0-9]+(?:\.[0-9]+)?)%$/)
  if (!percentMatch) {
    return 0
  }

  const parsed = Number(percentMatch[1])
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0
}

function roundDetailNumber(
  decimalResolver: EInvoiceDecimalResolver | null | undefined,
  fieldKey: string,
  value: number,
  currencyCode: string,
): number {
  return decimalResolver?.round("DETAIL", fieldKey, value, currencyCode) ?? value
}

function roundNullableDetailNumber(
  decimalResolver: EInvoiceDecimalResolver | null | undefined,
  fieldKey: string,
  value: number | null,
  currencyCode: string,
): number | null {
  return decimalResolver?.roundNullable("DETAIL", fieldKey, value, currencyCode) ?? value
}

function roundHeaderNumber(
  decimalResolver: EInvoiceDecimalResolver | null | undefined,
  fieldKey: string,
  value: number,
  currencyCode: string,
): number {
  return decimalResolver?.round("HEADER", fieldKey, value, currencyCode) ?? value
}

export function calculateEInvoiceDetailTaxAmount(
  detail: EInvoiceDetail,
  currencyCode = DEFAULT_CURRENCY_CODE,
  decimalResolver?: EInvoiceDecimalResolver | null,
): number {
  const taxInput = toNullableNumber(detail.TTHUE)
  if (taxInput !== null && (taxInput !== 0 || toNumber(detail.TSAUTHUE, 0) !== 0)) {
    return roundHeaderNumber(decimalResolver, "TGTTTHUE", taxInput, currencyCode)
  }

  const taxAmount = toNumber(detail.THTIEN, 0) * resolveEInvoiceVatRatePercent(detail.TSUAT) / 100
  return roundHeaderNumber(decimalResolver, "TGTTTHUE", taxAmount, currencyCode)
}

function calculateEInvoiceDetailTaxAmountVnd(
  detail: EInvoiceDetail,
  decimalResolver?: EInvoiceDecimalResolver | null,
): number {
  const taxInput = toNullableNumber(detail.TTHUE_VND)
  if (taxInput !== null && (taxInput !== 0 || toNumber(detail.TSAUTHUE_VND, 0) !== 0)) {
    return roundHeaderNumber(decimalResolver, "TGTTTHUE", taxInput, DEFAULT_CURRENCY_CODE)
  }

  const taxAmount = toNumber(detail.THTIEN_VND, 0) * resolveEInvoiceVatRatePercent(detail.TSUAT) / 100
  return roundHeaderNumber(decimalResolver, "TGTTTHUE", taxAmount, DEFAULT_CURRENCY_CODE)
}

function resolveEInvoiceDetailDiscount(
  detail: EInvoiceDetail,
  quantityValue: number,
  unitPrice: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
): number {
  const discountPercent = toNullableNumber(detail.TLCKHAU)
  if (discountPercent != null && discountPercent > 0) {
    const gross = quantityValue * unitPrice
    return roundDetailNumber(decimalResolver, "STCKHAU", gross * discountPercent / 100, currencyCode)
  }

  return roundDetailNumber(decimalResolver, "STCKHAU", toNumber(detail.STCKHAU, 0), currencyCode)
}

export function resolveAfterTaxUnitPrice(detail: Pick<EInvoiceDetail, "TSAUTHUE" | "SLUONG">): number {
  const quantityValue = toNumber(detail.SLUONG, 0)
  if (quantityValue === 0) {
    return 0
  }

  return toNumber(detail.TSAUTHUE, 0) / quantityValue
}

export function resolveLineAfterTaxAmount(
  afterTaxUnitPrice: number,
  quantityValue: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
): number {
  if (quantityValue === 0) {
    return 0
  }

  return roundDetailNumber(
    decimalResolver,
    "TSAUTHUE",
    afterTaxUnitPrice * quantityValue,
    currencyCode,
  )
}

export function resolveDetailAmountsFromAfterTaxUnitPrice(
  afterTaxUnitPrice: number,
  quantityValue: number,
  vatPercent: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
): {
  unitPrice: number
  amount: number
  taxAmount: number
  afterTaxAmount: number
} {
  const lineAfterTaxAmount = resolveLineAfterTaxAmount(
    afterTaxUnitPrice,
    quantityValue,
    currencyCode,
    decimalResolver,
  )
  const amount = vatPercent > 0
    ? roundDetailNumber(
      decimalResolver,
      "THTIEN",
      lineAfterTaxAmount / (1 + vatPercent / 100),
      currencyCode,
    )
    : lineAfterTaxAmount
  const unitPrice = quantityValue === 0
    ? 0
    : roundDetailNumber(decimalResolver, "DGIA", amount / quantityValue, currencyCode)
  const taxAmount = roundDetailNumber(
    decimalResolver,
    "TTHUE",
    lineAfterTaxAmount - amount,
    currencyCode,
  )

  return {
    unitPrice,
    amount,
    taxAmount,
    afterTaxAmount: lineAfterTaxAmount,
  }
}

function resolveUnitPriceFromBeforeTaxAmount(
  detail: EInvoiceDetail,
  quantityValue: number,
  targetAmount: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
): number {
  if (quantityValue === 0) {
    return toNumber(detail.DGIA, 0)
  }

  const discountPercent = toNullableNumber(detail.TLCKHAU)
  if (discountPercent != null && discountPercent > 0) {
    const factor = 1 - discountPercent / 100
    if (factor <= 0) {
      return 0
    }
    const gross = targetAmount / factor
    return roundDetailNumber(decimalResolver, "DGIA", gross / quantityValue, currencyCode)
  }

  const fixedDiscount = toNumber(detail.STCKHAU, 0)
  return roundDetailNumber(
    decimalResolver,
    "DGIA",
    (targetAmount + fixedDiscount) / quantityValue,
    currencyCode,
  )
}

function resolveEInvoiceDetailAmount(
  detail: EInvoiceDetail,
  quantityValue: number,
  unitPrice: number,
  discount: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
  calcSettings?: EInvoiceCalcSettings,
): number {
  const preserveAmount = calcSettings?.autoCalcAmount === false
    || (calcSettings?.detailAmountDriver === "beforeTaxAmount" && calcSettings.autoCalcPriceFromBeforeTaxAmount === true)
    || (calcSettings?.detailAmountDriver === "afterTaxAmount" && calcSettings.autoCalcPriceFromAfterTaxAmount === true)
    || calcSettings?.detailAmountDriver === "afterTaxUnitPrice"
  const hasQuantityOrPrice = detail.SLUONG != null || detail.DGIA != null

  if (preserveAmount) {
    return roundDetailNumber(decimalResolver, "THTIEN", toNumber(detail.THTIEN, 0), currencyCode)
  }

  if (hasQuantityOrPrice) {
    const rawAmount = quantityValue * unitPrice - discount
    const amount = calcSettings?.allowNegativeValues ? rawAmount : Math.max(rawAmount, 0)
    return roundDetailNumber(decimalResolver, "THTIEN", amount, currencyCode)
  }

  return roundDetailNumber(decimalResolver, "THTIEN", toNumber(detail.THTIEN, 0), currencyCode)
}

export const DEFAULT_EINVOICE_MSTTCGP = "0312270160"

export function createDefaultEInvoiceDetailSpecial(
  invoiceId = 0,
  detailId = 0,
  companyCd = "",
): EInvoiceDetailSpecialInfo {
  return {
    SPECIAL_ID: 0,
    INVOICE_ID: invoiceId,
    DETAIL_ID: detailId,
    COMPANY_CD: companyCd,
    LHHDTRUNG: 0,
    SKHUNG: "",
    SMAY: "",
    BKSPT_VCHUYEN: "",
    TNG_HANG: "",
    DCNG_HANG: "",
    MSTNG_HANG: "",
    MDDNG_HANG: "",
    EXTRA_JSON: "",
  }
}

export function normalizeEInvoiceDetailSpecial(
  record: EInvoiceDetailSpecialInfoApi | null | undefined,
  invoiceId: number,
  detailId: number,
  companyCd: string,
): EInvoiceDetailSpecialInfo | null {
  if (!record) {
    return null
  }

  const lhhdtrung = toNumber(record.LHHDTRUNG, 0)
  if (lhhdtrung !== 1 && lhhdtrung !== 2 && lhhdtrung !== 3 && lhhdtrung !== 4) {
    return null
  }

  return {
    SPECIAL_ID: toNumber(record.SPECIAL_ID, 0),
    INVOICE_ID: toNumber(record.INVOICE_ID, invoiceId),
    DETAIL_ID: toNumber(record.DETAIL_ID, detailId),
    COMPANY_CD: trimText(record.COMPANY_CD) || companyCd,
    LHHDTRUNG: lhhdtrung,
    SKHUNG: trimText(record.SKHUNG),
    SMAY: trimText(record.SMAY),
    BKSPT_VCHUYEN: trimText(record.BKSPT_VCHUYEN),
    TNG_HANG: trimText(record.TNG_HANG),
    DCNG_HANG: trimText(record.DCNG_HANG),
    MSTNG_HANG: trimText(record.MSTNG_HANG),
    MDDNG_HANG: trimText(record.MDDNG_HANG),
    EXTRA_JSON: trimText(record.EXTRA_JSON),
  }
}

export function hasEInvoiceDetailSpecialData(special: EInvoiceDetailSpecialInfo | null | undefined): boolean {
  if (!special || (special.LHHDTRUNG !== 1 && special.LHHDTRUNG !== 2 && special.LHHDTRUNG !== 3 && special.LHHDTRUNG !== 4)) {
    return false
  }

  if (special.LHHDTRUNG === 1) {
    // QD 1233 Phụ lục XV: SKhung và SMay đều bắt buộc nhập
    return Boolean(trimText(special.SKHUNG) && trimText(special.SMAY))
  }

  if (special.LHHDTRUNG === 2) {
    return Boolean(trimText(special.BKSPT_VCHUYEN) || hasSpecialExtraValue(special.EXTRA_JSON, ["DDi", "DDen"]))
  }

  if (special.LHHDTRUNG === 4) {
    return hasSpecialExtraValue(special.EXTRA_JSON, ["TTTDat", "TTTSGLTDat"])
  }

  return Boolean(
    trimText(special.TNG_HANG)
    || trimText(special.DCNG_HANG)
    || trimText(special.MSTNG_HANG)
    || trimText(special.MDDNG_HANG)
    || hasSpecialExtraValue(special.EXTRA_JSON, ["THHVChuyen"]),
  )
}

function hasSpecialExtraValue(extraJson: string | null | undefined, keys: string[]): boolean {
  const map = parseSpecialExtraJson(extraJson)
  return keys.some((key) => trimText(map[key]).length > 0)
}

export function parseSpecialExtraJson(extraJson: string | null | undefined): Record<string, string> {
  const text = trimText(extraJson)
  if (!text) {
    return {}
  }

  try {
    const parsed = JSON.parse(text) as Record<string, unknown>
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }

    const result: Record<string, string> = {}
    for (const [key, value] of Object.entries(parsed)) {
      if (!key) continue
      if (value === null || value === undefined) continue
      result[key] = String(value).trim()
    }
    return result
  } catch {
    return {}
  }
}

export function stringifySpecialExtraJson(values: Record<string, string | number | null | undefined>): string {
  const payload: Record<string, string> = {}
  for (const [key, value] of Object.entries(values)) {
    const text = value === null || value === undefined ? "" : String(value).trim()
    if (!text) continue
    payload[key] = text
  }
  return Object.keys(payload).length > 0 ? JSON.stringify(payload) : ""
}

export type EInvoiceDetailSpecialFieldValues = Pick<
  EInvoiceDetailSpecialInfo,
  "SKHUNG" | "SMAY" | "BKSPT_VCHUYEN" | "TNG_HANG" | "DCNG_HANG" | "MSTNG_HANG" | "MDDNG_HANG"
>

export function inferEInvoiceDetailLhhdtrungFromSpecialFields(
  values: Partial<EInvoiceDetailSpecialFieldValues>,
): number {
  if (
    trimText(values.TNG_HANG)
    || trimText(values.DCNG_HANG)
    || trimText(values.MSTNG_HANG)
    || trimText(values.MDDNG_HANG)
  ) {
    return 3
  }

  if (trimText(values.BKSPT_VCHUYEN)) {
    return 2
  }

  if (trimText(values.SKHUNG) || trimText(values.SMAY)) {
    return 1
  }

  return 0
}

export function formatEInvoiceDetailSpecialSummary(
  detail: Pick<EInvoiceDetail, "TCHAT" | "SPECIAL"> | null | undefined,
  resolveLhhdtrungLabel?: (lhhdtrung: number) => string,
): string {
  if (!detail || Number(detail.TCHAT) !== 5) {
    return ""
  }

  const special = detail.SPECIAL
  const lhhdtrung = Number(special?.LHHDTRUNG ?? 0)
  if (lhhdtrung < 1 || lhhdtrung > 4) {
    return ""
  }

  const segments: string[] = []
  const typeLabel = resolveLhhdtrungLabel?.(lhhdtrung) ?? String(lhhdtrung)
  segments.push(typeLabel)

  if (lhhdtrung === 1) {
    const skhung = trimText(special?.SKHUNG)
    const smay = trimText(special?.SMAY)
    if (skhung) {
      segments.push(`SKhung: ${skhung}`)
    }
    if (smay) {
      segments.push(`SMay: ${smay}`)
    }
  } else if (lhhdtrung === 2) {
    const plate = trimText(special?.BKSPT_VCHUYEN)
    if (plate) {
      segments.push(`BKSPTVChuyen: ${plate}`)
    }
  } else {
    const senderName = trimText(special?.TNG_HANG)
    const senderAddress = trimText(special?.DCNG_HANG)
    const senderTax = trimText(special?.MSTNG_HANG)
    const senderId = trimText(special?.MDDNG_HANG)
    if (senderName) {
      segments.push(`TNGHang: ${senderName}`)
    }
    if (senderAddress) {
      segments.push(`DCNGHang: ${senderAddress}`)
    }
    if (senderTax) {
      segments.push(`MSTNGHang: ${senderTax}`)
    }
    if (senderId) {
      segments.push(`MDDNGHang: ${senderId}`)
    }
  }

  return segments.join(" · ")
}

export function applyEInvoiceDetailSpecialLhhdtrung(
  special: EInvoiceDetailSpecialInfo,
  lhhdtrung: number,
): EInvoiceDetailSpecialInfo {
  const next = {
    ...special,
    LHHDTRUNG: lhhdtrung,
  }

  if (lhhdtrung !== 1) {
    next.SKHUNG = ""
    next.SMAY = ""
  }

  if (lhhdtrung !== 2) {
    next.BKSPT_VCHUYEN = ""
  }

  if (lhhdtrung !== 3) {
    next.TNG_HANG = ""
    next.DCNG_HANG = ""
    next.MSTNG_HANG = ""
    next.MDDNG_HANG = ""
  }

  // Clear EXTRA_JSON when switching type — UI rebuilds for current LHHDTRUNG.
  next.EXTRA_JSON = ""

  return next
}

export function createDefaultEInvoiceDetail(index: number, invoiceId = 0, companyCd = ""): EInvoiceDetail {
  return {
    ROW_KEY: buildRowKey(),
    DETAIL_ID: 0,
    INVOICE_ID: invoiceId,
    COMPANY_CD: companyCd,
    PRODUCT_ID: 0,
    TCHAT: 1,
    STT: index,
    MHHDVU: "",
    THHDVU: "",
    DVTINH: "",
    SLUONG: 1,
    SLTHUCNHAP: null,
    DGIA: 0,
    TLCKHAU: null,
    STCKHAU: 0,
    THTIEN: 0,
    TSUAT: "",
    TTHUE: 0,
    TSAUTHUE: 0,
    DGIA_VND: 0,
    STCKHAU_VND: 0,
    THTIEN_VND: 0,
    TTHUE_VND: 0,
    TSAUTHUE_VND: 0,
    SPECIAL: null,
    EXTRA_JSON: "",
    ISDEL: 0,
  }
}

export function createDefaultEInvoice(companyCd: string): EInvoice {
  return {
    INVOICE_ID: 0,
    DOC_VERSION: 1,
    COMPANY_CD: companyCd,
    PBAN: "",
    THDON: "Hoa don gia tri gia tang",
    KHMSHDON: "",
    KHHDON: "",
    SHDON: "",
    MHSO: "",
    NLAP: toDateText(new Date()),
    HDCTTCHINH: 0,
    SBKE: "",
    NBKE: null,
    DVTTE: DEFAULT_CURRENCY_CODE,
    TGIA: 1,
    HTTTOAN: "",
    MSTTCGP: DEFAULT_EINVOICE_MSTTCGP,
    TCHDON: 0,
    SELLER_ID: 0,
    XSL_ID: 0,
    SELLER_NM: "",
    SELLER_TAX_CD: "",
    NMUA_TEN: "",
    NMUA_MST: "",
    NMUA_MDVQHNSACH: "",
    NMUA_DCHI: "",
    NMUA_MTINH: "",
    NMUA_TTINH: "",
    NMUA_MXA: "",
    NMUA_TXA: "",
    NMUA_MKHANG: "",
    NMUA_SDTHOAI: "",
    NMUA_CCCDAN: "",
    NMUA_SHCHIEU: "",
    NMUA_DCTDTU: "",
    NMUA_HVTNMHANG: "",
    NMUA_STKNHANG: "",
    NMUA_TNHANG: "",
    TGTCTHUE: 0,
    TGTKCTHUE: 0,
    TGTTTHUE: 0,
    TTCKTMAI: 0,
    CKTMAI_GCHU: "",
    TGTKHAC: 0,
    TGTTTBSO: 0,
    TGTTTBCHU: "",
    TGTCTHUE_VND: 0,
    TGTKCTHUE_VND: 0,
    TGTTTHUE_VND: 0,
    TTCKTMAI_VND: 0,
    TGTKHAC_VND: 0,
    TGTTTBSO_VND: 0,
    DLQRCODE: "",
    MCCQT: "",
    MTRACUU: "",
    XML_FTP_PATH: "",
    MTDIEP: "",
    MGDDTu: "",
    TAX_SUMMARY_JSON: "",
    FEE_JSON: "",
    EXTRA_JSON: "",
    IS_SIGNED: 0,
    INVOICE_STATUS: 0,
    MAIL_STATUS: 0,
    SOURCE_INVOICE_ID: null,
    ERROR_MESSAGE: "",
    ISDEL: 0,
    PXK_INFO: null,
    RELATED: null,
    BKE_INFO: null,
    DETAILS: [createDefaultEInvoiceDetail(1, 0, companyCd)],
  }
}

export function createDefaultEInvoiceRelated(invoiceId = 0, companyCd = ""): EInvoiceRelatedInfo {
  return {
    RELATED_ID: 0,
    INVOICE_ID: invoiceId,
    COMPANY_CD: companyCd,
    TCHDON: 0,
    IS_EXTERNAL: 0,
    MSTCLQUAN: "",
    LHDCLQUAN: null,
    KHMSHDCLQUAN: "",
    KHHDCLQUAN: "",
    SHDCLQUAN: "",
    NLHDCLQUAN: "",
    LDDCTTHE: null,
    SBKCLQUAN: "",
    NBKCLQUAN: "",
    GCHU: "",
  }
}

export const EINV_TCHDON_CODE_TYPE = "EINV_TCHDON"

export function requiresEInvoiceRelatedInvoice(tchdon: number | null | undefined): boolean {
  const value = toNumber(tchdon, 0)
  return value === 1 || value === 2 || value === 3 || value === 4
}

export function isEInvoiceMultiRelatedInvoice(tchdon: number | null | undefined): boolean {
  const value = toNumber(tchdon, 0)
  return value === 3 || value === 4
}

export function resolveEInvoiceBkeTchdon(relatedTchdon: number | null | undefined): 1 | 2 {
  return toNumber(relatedTchdon, 0) === 3 ? 1 : 2
}

export function createDefaultEInvoiceBkeReason(sortOrder = 1, bkeId = 0): EInvoiceBkeReason {
  return {
    REASON_ID: 0,
    BKE_ID: bkeId,
    SORT_ORDER: sortOrder,
    LDO: "",
    ISDEL: 0,
  }
}

export function createDefaultEInvoiceBkeDetail(stt = 1, bkeId = 0): EInvoiceBkeDetail {
  return {
    ROW_KEY: buildRowKey(),
    DETAIL_ID: 0,
    BKE_ID: bkeId,
    STT: stt,
    REF_INVOICE_ID: null,
    KHMSHDON: "",
    KHHDON: "",
    SHDON: "",
    THHDVGOC: "",
    SLGOC: null,
    DGGOC: null,
    THTGOC: null,
    TSGOC: "",
    TTGOC: null,
    TGTKGOC: null,
    TGTSTGOC: null,
    THHDVTDOI: "",
    SLTDOI: null,
    DGTDOI: null,
    THTTDOI: null,
    TSTDOI: "",
    TTTDOI: null,
    TGTTDOI: null,
    TGTSTTDOI: null,
    TGTCTCLECH: null,
    TGTTCLECH: null,
    TGTKCLECH: null,
    TGTTTCLECH: null,
    EXTRA_JSON: "",
    ISDEL: 0,
  }
}

export function createDefaultEInvoiceBke(
  invoiceId = 0,
  companyCd = "",
  relatedTchdon: number | null | undefined = 4,
): EInvoiceBkeInfo {
  const tchdon = resolveEInvoiceBkeTchdon(relatedTchdon)
  return {
    BKE_ID: 0,
    COMPANY_CD: companyCd,
    INVOICE_ID: invoiceId,
    SELLER_ID: null,
    PBAN: "2.1.1",
    TBKE: tchdon === 1
      ? "Bảng kê hóa đơn điện tử bị thay thế"
      : "Bảng kê hóa đơn điện tử bị điều chỉnh",
    KHMBKE: "01/BK-ĐCTT",
    SBKE: "",
    NBKE: toDateText(new Date()),
    TCHDON: tchdon,
    NBAN: "",
    MSTNBAN: "",
    DCNBAN: "",
    TCTCNHANG: 0,
    NMUA: "",
    MSTNMUA: "",
    DCNMUA: "",
    TTKHAC_XML: "",
    SIGNED_XML: "",
    IS_SIGNED: 0,
    NMUA_IS_SIGNED: 0,
    ISDEL: 0,
    REASONS: [createDefaultEInvoiceBkeReason(1)],
    DETAILS: [],
  }
}

export function normalizeEInvoiceBkeReason(record: EInvoiceBkeReasonApi | null | undefined, index = 0): EInvoiceBkeReason {
  return {
    REASON_ID: toNumber(record?.REASON_ID, 0),
    BKE_ID: toNumber(record?.BKE_ID, 0),
    SORT_ORDER: toNumber(record?.SORT_ORDER, index + 1),
    LDO: trimText(record?.LDO),
    ISDEL: toNumber(record?.ISDEL, 0),
  }
}

export function normalizeEInvoiceBkeDetail(record: EInvoiceBkeDetailApi | null | undefined, index = 0): EInvoiceBkeDetail {
  const nullableAmount = (value: number | string | null | undefined): number | null => {
    if (value === null || value === undefined || value === "") {
      return null
    }
    return toNumber(value, 0)
  }

  return {
    ROW_KEY: buildRowKey(),
    DETAIL_ID: toNumber(record?.DETAIL_ID, 0),
    BKE_ID: toNumber(record?.BKE_ID, 0),
    STT: record?.STT == null ? index + 1 : toNumber(record.STT, index + 1),
    REF_INVOICE_ID: toNumber(record?.REF_INVOICE_ID, 0) > 0 ? toNumber(record?.REF_INVOICE_ID, 0) : null,
    KHMSHDON: trimText(record?.KHMSHDON),
    KHHDON: trimText(record?.KHHDON),
    SHDON: trimText(record?.SHDON),
    THHDVGOC: trimText(record?.THHDVGOC),
    SLGOC: nullableAmount(record?.SLGOC),
    DGGOC: nullableAmount(record?.DGGOC),
    THTGOC: nullableAmount(record?.THTGOC),
    TSGOC: trimText(record?.TSGOC),
    TTGOC: nullableAmount(record?.TTGOC),
    TGTKGOC: nullableAmount(record?.TGTKGOC),
    TGTSTGOC: nullableAmount(record?.TGTSTGOC),
    THHDVTDOI: trimText(record?.THHDVTDOI),
    SLTDOI: nullableAmount(record?.SLTDOI),
    DGTDOI: nullableAmount(record?.DGTDOI),
    THTTDOI: nullableAmount(record?.THTTDOI),
    TSTDOI: trimText(record?.TSTDOI),
    TTTDOI: nullableAmount(record?.TTTDOI),
    TGTTDOI: nullableAmount(record?.TGTTDOI),
    TGTSTTDOI: nullableAmount(record?.TGTSTTDOI),
    TGTCTCLECH: nullableAmount(record?.TGTCTCLECH),
    TGTTCLECH: nullableAmount(record?.TGTTCLECH),
    TGTKCLECH: nullableAmount(record?.TGTKCLECH),
    TGTTTCLECH: nullableAmount(record?.TGTTTCLECH),
    EXTRA_JSON: trimText(record?.EXTRA_JSON),
    ISDEL: toNumber(record?.ISDEL, 0),
  }
}

export function normalizeEInvoiceBke(
  record: EInvoiceBkeInfoApi | null | undefined,
  invoiceId: number,
  companyCd: string,
  relatedTchdon?: number | null,
): EInvoiceBkeInfo | null {
  if (!record) {
    return null
  }

  const reasons = Array.isArray(record.REASONS)
    ? record.REASONS.map((reason, index) => normalizeEInvoiceBkeReason(reason, index)).filter((x) => x.ISDEL !== 1)
    : []
  const details = Array.isArray(record.DETAILS)
    ? record.DETAILS.map((detail, index) => normalizeEInvoiceBkeDetail(detail, index)).filter((x) => x.ISDEL !== 1)
    : []

  return {
    ...createDefaultEInvoiceBke(invoiceId, companyCd, relatedTchdon ?? record.TCHDON),
    BKE_ID: toNumber(record.BKE_ID, 0),
    COMPANY_CD: trimText(record.COMPANY_CD) || companyCd,
    INVOICE_ID: toNumber(record.INVOICE_ID, invoiceId),
    SELLER_ID: toNumber(record.SELLER_ID, 0) > 0 ? toNumber(record.SELLER_ID, 0) : null,
    PBAN: trimText(record.PBAN) || "2.1.1",
    TBKE: trimText(record.TBKE),
    KHMBKE: trimText(record.KHMBKE) || "01/BK-ĐCTT",
    SBKE: trimText(record.SBKE),
    NBKE: toDateText(record.NBKE),
    TCHDON: toNumber(record.TCHDON, 0) === 1 ? 1 : 2,
    NBAN: trimText(record.NBAN),
    MSTNBAN: trimText(record.MSTNBAN),
    DCNBAN: trimText(record.DCNBAN),
    TCTCNHANG: toNumber(record.TCTCNHANG, 0) === 1 ? 1 : 0,
    NMUA: trimText(record.NMUA),
    MSTNMUA: trimText(record.MSTNMUA),
    DCNMUA: trimText(record.DCNMUA),
    TTKHAC_XML: trimText(record.TTKHAC_XML),
    SIGNED_XML: trimText(record.SIGNED_XML),
    IS_SIGNED: toNumber(record.IS_SIGNED, 0) === 1 ? 1 : 0,
    NMUA_IS_SIGNED: toNumber(record.NMUA_IS_SIGNED, 0) === 1 ? 1 : 0,
    ISDEL: toNumber(record.ISDEL, 0),
    REASONS: reasons.length > 0 ? reasons : [createDefaultEInvoiceBkeReason(1)],
    DETAILS: details,
  }
}

export function hasEInvoiceBkeData(bke: EInvoiceBkeInfo | null | undefined): boolean {
  if (!bke || bke.ISDEL === 1) {
    return false
  }

  return (
    trimText(bke.SBKE).length > 0
    || Boolean(toDateText(bke.NBKE))
    || bke.REASONS.some((reason) => reason.ISDEL !== 1 && trimText(reason.LDO).length > 0)
    || bke.DETAILS.some((detail) => detail.ISDEL !== 1)
  )
}

export function hasActiveEInvoiceBkeDetails(bke: EInvoiceBkeInfo | null | undefined): boolean {
  return (bke?.DETAILS ?? []).some((detail) => detail.ISDEL !== 1)
}

export function normalizeEInvoiceTaxCode(value: string | null | undefined): string {
  return trimText(value).replace(/[\s.\-]/g, "").toUpperCase()
}

export function isSameEInvoiceBuyerTaxCode(
  left: string | null | undefined,
  right: string | null | undefined,
): boolean {
  return normalizeEInvoiceTaxCode(left) === normalizeEInvoiceTaxCode(right)
}

export function syncEInvoiceBkeWithRelated(
  bke: EInvoiceBkeInfo | null | undefined,
  related: EInvoiceRelatedInfo | null | undefined,
  invoice: Pick<EInvoice, "INVOICE_ID" | "COMPANY_CD" | "SELLER_ID" | "SELLER_NM" | "SELLER_TAX_CD" | "NMUA_TEN" | "NMUA_MST" | "NMUA_DCHI">,
): EInvoiceBkeInfo {
  const next = bke
    ? { ...bke, REASONS: [...bke.REASONS], DETAILS: [...bke.DETAILS] }
    : createDefaultEInvoiceBke(invoice.INVOICE_ID, invoice.COMPANY_CD, related?.TCHDON)

  next.INVOICE_ID = invoice.INVOICE_ID
  next.COMPANY_CD = invoice.COMPANY_CD
  next.TCHDON = resolveEInvoiceBkeTchdon(related?.TCHDON)
  if (!trimText(next.TBKE)) {
    next.TBKE = next.TCHDON === 1
      ? "Bảng kê hóa đơn điện tử bị thay thế"
      : "Bảng kê hóa đơn điện tử bị điều chỉnh"
  }

  const sbke = trimText(next.SBKE) || trimText(related?.SBKCLQUAN)
  const nbke = toDateText(next.NBKE) || toDateText(related?.NBKCLQUAN)
  next.SBKE = sbke
  next.NBKE = nbke
  next.SELLER_ID = (invoice.SELLER_ID ?? 0) > 0
    ? invoice.SELLER_ID
    : (next.SELLER_ID && next.SELLER_ID > 0 ? next.SELLER_ID : null)
  // Header bảng kê luôn đồng bộ người bán / người mua với HĐ ĐC/TT nhiều HĐ.
  next.NBAN = trimText(invoice.SELLER_NM)
  next.MSTNBAN = trimText(invoice.SELLER_TAX_CD)
  next.NMUA = trimText(invoice.NMUA_TEN)
  next.MSTNMUA = trimText(invoice.NMUA_MST)
  next.DCNMUA = trimText(invoice.NMUA_DCHI)
  return next
}

export function buildEInvoiceBkeDetailFromSourceInvoice(
  source: Pick<EInvoice, "INVOICE_ID" | "IS_SIGNED" | "NMUA_MST" | "KHMSHDON" | "KHHDON" | "SHDON" | "TGTTTBSO" | "TGTCTHUE" | "TGTTTHUE" | "TTCKTMAI" | "DETAILS">,
  stt: number,
  bkeId = 0,
): EInvoiceBkeDetail {
  const firstLine = source.DETAILS?.find((detail) => detail.ISDEL !== 1)
  return recalculateEInvoiceBkeDetailDiff({
    ...createDefaultEInvoiceBkeDetail(stt, bkeId),
    REF_INVOICE_ID: toNumber(source.INVOICE_ID, 0) > 0 ? toNumber(source.INVOICE_ID, 0) : null,
    KHMSHDON: trimText(source.KHMSHDON).slice(0, 1),
    KHHDON: trimText(source.KHHDON),
    SHDON: trimText(source.SHDON),
    THHDVGOC: trimText(firstLine?.THHDVU),
    SLGOC: firstLine?.SLUONG ?? null,
    DGGOC: firstLine?.DGIA ?? null,
    THTGOC: firstLine?.THTIEN ?? source.TGTCTHUE ?? null,
    TSGOC: trimText(firstLine?.TSUAT),
    TTGOC: firstLine?.TTHUE ?? source.TGTTTHUE ?? null,
    TGTKGOC: firstLine?.STCKHAU ?? source.TTCKTMAI ?? null,
    TGTSTGOC: firstLine?.TSAUTHUE ?? source.TGTTTBSO ?? null,
    THHDVTDOI: trimText(firstLine?.THHDVU),
    SLTDOI: firstLine?.SLUONG ?? null,
    DGTDOI: firstLine?.DGIA ?? null,
    THTTDOI: firstLine?.THTIEN ?? source.TGTCTHUE ?? null,
    TSTDOI: trimText(firstLine?.TSUAT),
    TTTDOI: firstLine?.TTHUE ?? source.TGTTTHUE ?? null,
    TGTTDOI: firstLine?.STCKHAU ?? source.TTCKTMAI ?? null,
    TGTSTTDOI: firstLine?.TSAUTHUE ?? source.TGTTTBSO ?? null,
  })
}

export function buildEInvoiceBkeDetailsFromSourceInvoice(
  source: Pick<EInvoice, "INVOICE_ID" | "IS_SIGNED" | "NMUA_MST" | "KHMSHDON" | "KHHDON" | "SHDON" | "TGTTTBSO" | "TGTCTHUE" | "TGTTTHUE" | "TTCKTMAI" | "DETAILS">,
  startStt: number,
  bkeId = 0,
): EInvoiceBkeDetail[] {
  const lines = (source.DETAILS ?? []).filter((detail) => detail.ISDEL !== 1)
  if (lines.length === 0) {
    return [buildEInvoiceBkeDetailFromSourceInvoice(source, startStt, bkeId)]
  }

  return lines.map((line, index) =>
    recalculateEInvoiceBkeDetailDiff({
      ...createDefaultEInvoiceBkeDetail(startStt + index, bkeId),
      REF_INVOICE_ID: toNumber(source.INVOICE_ID, 0) > 0 ? toNumber(source.INVOICE_ID, 0) : null,
      KHMSHDON: trimText(source.KHMSHDON).slice(0, 1),
      KHHDON: trimText(source.KHHDON),
      SHDON: trimText(source.SHDON),
      THHDVGOC: trimText(line.THHDVU),
      SLGOC: line.SLUONG ?? null,
      DGGOC: line.DGIA ?? null,
      THTGOC: line.THTIEN ?? null,
      TSGOC: trimText(line.TSUAT),
      TTGOC: line.TTHUE ?? null,
      TGTKGOC: line.STCKHAU ?? null,
      TGTSTGOC: line.TSAUTHUE ?? null,
      THHDVTDOI: trimText(line.THHDVU),
      SLTDOI: line.SLUONG ?? null,
      DGTDOI: line.DGIA ?? null,
      THTTDOI: line.THTIEN ?? null,
      TSTDOI: trimText(line.TSUAT),
      TTTDOI: line.TTHUE ?? null,
      TGTTDOI: line.STCKHAU ?? null,
      TGTSTTDOI: line.TSAUTHUE ?? null,
    }),
  )
}

export function renumberEInvoiceBkeDetails(details: EInvoiceBkeDetail[]): EInvoiceBkeDetail[] {
  let stt = 0
  return details.map((detail) => {
    if (detail.ISDEL === 1) {
      return detail
    }
    stt += 1
    return { ...detail, STT: stt }
  })
}

export function recalculateEInvoiceBkeDetailDiff(detail: EInvoiceBkeDetail): EInvoiceBkeDetail {
  const beforeAmount = toNullableNumber(detail.THTGOC)
  const afterAmount = toNullableNumber(detail.THTTDOI)
  const beforeTax = toNullableNumber(detail.TTGOC)
  const afterTax = toNullableNumber(detail.TTTDOI)
  const beforeOther = toNullableNumber(detail.TGTKGOC)
  const afterOther = toNullableNumber(detail.TGTTDOI)
  const beforeTotal = toNullableNumber(detail.TGTSTGOC)
  const afterTotal = toNullableNumber(detail.TGTSTTDOI)

  return {
    ...detail,
    TGTCTCLECH:
      beforeAmount === null && afterAmount === null
        ? null
        : Number((afterAmount ?? 0) - (beforeAmount ?? 0)),
    TGTTCLECH:
      beforeTax === null && afterTax === null
        ? null
        : Number((afterTax ?? 0) - (beforeTax ?? 0)),
    TGTKCLECH:
      beforeOther === null && afterOther === null
        ? null
        : Number((afterOther ?? 0) - (beforeOther ?? 0)),
    TGTTTCLECH:
      beforeTotal === null && afterTotal === null
        ? null
        : Number((afterTotal ?? 0) - (beforeTotal ?? 0)),
  }
}

export function isEInvoiceEligibleForBkeSource(
  source: Pick<EInvoice, "IS_SIGNED" | "NMUA_MST">,
  buyerTaxCd: string | null | undefined,
): boolean {
  if (toNumber(source.IS_SIGNED, 0) !== 1) {
    return false
  }
  return isSameEInvoiceBuyerTaxCode(source.NMUA_MST, buyerTaxCd)
}

export function formatEInvoiceBkeDateToday(): string {
  return toDateText(new Date()) ?? ""
}

export function resolveEInvoiceRelatedInvoiceType(khmsHDON: string | null | undefined): number | null {
  const match = trimText(khmsHDON).match(/^(\d+)/)
  if (!match) {
    return null
  }

  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

export function isEInvoiceWithoutTaxRate(khmsHDON: string | null | undefined): boolean {
  const formNo = resolveEInvoiceRelatedInvoiceType(khmsHDON)
  return formNo === 2 || formNo === 6
}

export function validateEInvoiceForeignCurrencyRate(
  dvtte: string | null | undefined,
  tgia: number | null | undefined,
): boolean {
  if (!isForeignCurrencyCode(dvtte)) {
    return true
  }

  const rate = Number(tgia ?? 0)
  return Number.isFinite(rate) && rate > 0
}

export { isEInvoiceWarehouseForm, resolveEInvoiceWarehouseVariant } from "./einvoiceWarehouseModel"

export function buildEInvoiceRelatedFromSourceInvoice(
  source: Pick<EInvoice, "INVOICE_ID" | "KHMSHDON" | "KHHDON" | "SHDON" | "NLAP">,
  tchdon: number,
  invoiceId: number,
  companyCd: string,
  existing?: EInvoiceRelatedInfo | null,
): EInvoiceRelatedInfo {
  return {
    ...(existing ?? createDefaultEInvoiceRelated(invoiceId, companyCd)),
    TCHDON: tchdon,
    IS_EXTERNAL: 0,
    LHDCLQUAN: resolveEInvoiceRelatedInvoiceType(source.KHMSHDON),
    KHMSHDCLQUAN: trimText(source.KHMSHDON),
    KHHDCLQUAN: trimText(source.KHHDON),
    SHDCLQUAN: trimText(source.SHDON),
    NLHDCLQUAN: toDateText(source.NLAP),
  }
}

export function resolveEInvoiceSourceInvoiceId(
  related: EInvoiceRelatedInfo | null | undefined,
  sourceInvoiceId: number | null | undefined,
): number | null {
  if (Number(related?.IS_EXTERNAL ?? 0) === 1) {
    return null
  }

  return toNumber(sourceInvoiceId, 0) > 0 ? toNumber(sourceInvoiceId, 0) : null
}

export function getEInvoiceTchdon(related: EInvoiceRelatedInfo | null | undefined): number {
  return toNumber(related?.TCHDON, 0)
}

/** Tính chất hiển thị trên form: ưu tiên RELATED, fallback header.TCHDON. */
export function resolveEInvoiceFormTchdon(
  invoice: Pick<EInvoice, "TCHDON" | "RELATED"> | null | undefined,
): number {
  const fromRelated = getEInvoiceTchdon(invoice?.RELATED)
  if (requiresEInvoiceRelatedInvoice(fromRelated)) {
    return fromRelated
  }

  const fromHeader = toNumber(invoice?.TCHDON, 0)
  if (requiresEInvoiceRelatedInvoice(fromHeader)) {
    return fromHeader
  }

  return fromRelated || fromHeader
}

export function formatEInvoiceRelatedDisplay(
  related: Pick<EInvoiceRelatedInfo, "KHMSHDCLQUAN" | "KHHDCLQUAN" | "SHDCLQUAN" | "NLHDCLQUAN"> | null | undefined,
): string {
  if (!related) {
    return ""
  }

  const template = [trimText(related.KHMSHDCLQUAN), trimText(related.KHHDCLQUAN)].filter(Boolean).join("/")
  const invoiceNo = trimText(related.SHDCLQUAN)
  const date = trimText(related.NLHDCLQUAN)

  if (template && invoiceNo && date) {
    return `${template} · ${invoiceNo} · ${formatYmdForDisplay(date)}`
  }

  if (template && invoiceNo) {
    return `${template} · ${invoiceNo}`
  }

  return template || invoiceNo || date
}

export function hasEInvoiceRelatedData(related: EInvoiceRelatedInfo | null | undefined): boolean {
  if (!related || !requiresEInvoiceRelatedInvoice(related.TCHDON)) {
    return false
  }

  // ĐC/TT nhiều HĐ: chỉ cần TCHDon 3/4 là đủ giữ RELATED (chi tiết nằm ở bảng kê).
  if (isEInvoiceMultiRelatedInvoice(related.TCHDON)) {
    return true
  }

  return (
    trimText(related.KHMSHDCLQUAN).length > 0 ||
    trimText(related.KHHDCLQUAN).length > 0 ||
    trimText(related.SHDCLQUAN).length > 0 ||
    related.LHDCLQUAN !== null && related.LHDCLQUAN !== undefined ||
    trimText(related.NLHDCLQUAN).length > 0 ||
    trimText(related.MSTCLQUAN).length > 0 ||
    related.LDDCTTHE !== null && related.LDDCTTHE !== undefined ||
    trimText(related.SBKCLQUAN).length > 0 ||
    trimText(related.NBKCLQUAN).length > 0 ||
    trimText(related.GCHU).length > 0
  )
}

export function normalizeEInvoiceRelated(
  record: EInvoiceRelatedInfoApi | null | undefined,
  invoiceId: number,
  companyCd: string,
): EInvoiceRelatedInfo | null {
  if (!record) {
    return null
  }

  const normalized = {
    ...createDefaultEInvoiceRelated(invoiceId, companyCd),
    ...record,
    RELATED_ID: toNumber(record.RELATED_ID, 0),
    INVOICE_ID: toNumber(record.INVOICE_ID, invoiceId),
    COMPANY_CD: trimText(record.COMPANY_CD) || companyCd,
    TCHDON: toNumber(record.TCHDON, 0),
    IS_EXTERNAL: toNumber(record.IS_EXTERNAL, 0) === 1 ? 1 : 0,
    MSTCLQUAN: trimText(record.MSTCLQUAN),
    LHDCLQUAN: toNullableNumber(record.LHDCLQUAN),
    KHMSHDCLQUAN: trimText(record.KHMSHDCLQUAN),
    KHHDCLQUAN: trimText(record.KHHDCLQUAN),
    SHDCLQUAN: trimText(record.SHDCLQUAN),
    NLHDCLQUAN: toDateText(record.NLHDCLQUAN),
    LDDCTTHE: toNullableNumber(record.LDDCTTHE),
    SBKCLQUAN: trimText(record.SBKCLQUAN),
    NBKCLQUAN: toDateText(record.NBKCLQUAN),
    GCHU: trimText(record.GCHU),
  } satisfies EInvoiceRelatedInfo

  if (!requiresEInvoiceRelatedInvoice(normalized.TCHDON)) {
    return null
  }

  return hasEInvoiceRelatedData(normalized) ? normalized : null
}

export function findEInvoiceSeller(
  sellers: EInvoiceSeller[],
  khhdon?: string | null,
  khmsHDON?: string | null,
): EInvoiceSeller | null {
  const selectedKhhdon = trimText(khhdon)
  const selectedKhms = trimText(khmsHDON)
  if (selectedKhhdon || selectedKhms) {
    const seller = sellers.find((item) => {
      const khhdonMatch = !selectedKhhdon || trimText(item.KHHDON) === selectedKhhdon
      const khmsMatch = !selectedKhms || trimText(item.KHMSHDON) === selectedKhms
      return khhdonMatch && khmsMatch
    })
    if (seller) {
      return seller
    }

    if (selectedKhhdon) {
      const byKhhdon = sellers.find((item) => trimText(item.KHHDON) === selectedKhhdon)
      if (byKhhdon) {
        return byKhhdon
      }
    }
  }

  return sellers.find((item) => Number(item.XSL_IS_DEFAULT ?? 0) === 1) ?? sellers[0] ?? null
}

export function findEInvoiceSellerById(sellers: EInvoiceSeller[], sellerId?: number | null): EInvoiceSeller | null {
  const id = toNumber(sellerId, 0)
  if (id <= 0) {
    return null
  }

  return sellers.find((item) => toNumber(item.SELLER_ID, 0) === id) ?? null
}

export function findEInvoiceSellerByXslId(sellers: EInvoiceSeller[], xslId?: number | null): EInvoiceSeller | null {
  const id = toNumber(xslId, 0)
  if (id <= 0) {
    return null
  }

  return sellers.find((item) => toNumber(item.XSL_ID, 0) === id) ?? null
}

export function resolveEInvoiceTemplateXslId(
  sellers: EInvoiceSeller[],
  invoice: Pick<EInvoice, "XSL_ID" | "SELLER_ID" | "KHMSHDON" | "KHHDON">,
): number {
  const selectedXslId = toNumber(invoice.XSL_ID, 0)
  if (selectedXslId > 0 && findEInvoiceSellerByXslId(sellers, selectedXslId)) {
    return selectedXslId
  }

  return findEInvoiceSeller(sellers, invoice.KHHDON, invoice.KHMSHDON)?.XSL_ID ?? 0
}

export function formatEInvoiceSellerOption(seller: EInvoiceSeller | null): string {
  if (!seller) {
    return ""
  }

  const symbol = [trimText(seller.KHMSHDON), trimText(seller.KHHDON)]
    .filter((value) => value.length > 0)
    .join("/")
  const templateName = trimText(seller.XSL_TEMPLATE_NM)

  if (symbol && templateName) {
    return `${symbol} · ${templateName}`
  }

  if (symbol) {
    return symbol
  }

  if (templateName) {
    return templateName
  }

  return trimText(seller.SELLER_NM)
}

export function formatEInvoiceDisplayNo(
  invoice: Pick<EInvoice, "KHMSHDON" | "KHHDON" | "SHDON"> | null | undefined,
): string {
  if (!invoice) {
    return ""
  }

  const template = [trimText(invoice.KHMSHDON), trimText(invoice.KHHDON)]
    .filter((value) => value.length > 0)
    .join("/")
  const invoiceNo = trimText(invoice.SHDON)

  if (template && invoiceNo) {
    return `${template} · ${invoiceNo}`
  }

  return template || invoiceNo
}

export function formatEInvoiceCqtResultText(
  invoice: Pick<EInvoice, "MCCQT" | "ERROR_MESSAGE"> | null | undefined,
): string {
  if (!invoice) {
    return ""
  }

  const mccqt = trimText(invoice.MCCQT)
  const errorMessage = trimText(invoice.ERROR_MESSAGE)

  if (mccqt && errorMessage) {
    return `${mccqt} · ${errorMessage}`
  }

  return mccqt || errorMessage
}

export const EINVOICE_ERROR_MESSAGE_PREVIEW_LENGTH = 50

export function truncateEInvoiceErrorMessage(
  value: string | null | undefined,
  maxLength = EINVOICE_ERROR_MESSAGE_PREVIEW_LENGTH,
): string {
  const text = trimText(value)
  if (text.length <= maxLength) {
    return text
  }

  return `${text.slice(0, maxLength).trimEnd()}…`
}

export function formatEInvoiceBuyerSummaryText(
  invoice: Pick<EInvoice, "NMUA_HVTNMHANG" | "NMUA_TEN" | "NMUA_MST" | "MTRACUU" | "MCCQT" | "ERROR_MESSAGE"> | null | undefined,
): string {
  if (!invoice) {
    return ""
  }

  const personName = trimText(invoice.NMUA_HVTNMHANG)
  const companyName = trimText(invoice.NMUA_TEN)
  const taxCode = trimText(invoice.NMUA_MST)
  const lookupCode = trimText(invoice.MTRACUU)
  const mccqt = trimText(invoice.MCCQT)
  const errorMessage = trimText(invoice.ERROR_MESSAGE)

  return [
    personName,
    companyName,
    taxCode,
    lookupCode,
    mccqt,
    errorMessage,
  ]
    .filter((line) => line.length > 0)
    .join("\n")
}

export function isEInvoiceSellerUseMultiTaxRate(seller: EInvoiceSeller | null | undefined): boolean {
  return Number(seller?.USE_MULTI_TAX_RATE ?? 0) === 1
}

/** MST hộ kinh doanh / CNKD: đúng 12 chữ số. */
export function isEInvoiceHouseholdBusinessTaxCode(taxCode: string | null | undefined): boolean {
  const text = typeof taxCode === "string" ? taxCode.trim() : ""
  if (!text) {
    return false
  }

  let digitCount = 0
  for (const ch of text) {
    if (ch >= "0" && ch <= "9") {
      digitCount += 1
      continue
    }
    if (ch === " " || ch === "-" || ch === ".") {
      continue
    }
    return false
  }

  return digitCount === 12
}

export function resolveHeaderTaxRateFromDetails(
  details: EInvoiceDetail[],
  fallback = "",
): string {
  for (const detail of details) {
    if (Number(detail.ISDEL ?? 0) === 1) {
      continue
    }

    const code = normalizeEInvoiceVatRateCode(detail.TSUAT)
    if (code) {
      return code
    }
  }

  return normalizeEInvoiceVatRateCode(fallback)
}

export function applyHeaderTaxRateToInvoiceDetails(
  invoice: EInvoice,
  taxRate: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
  calcSettings?: EInvoiceCalcSettings,
): EInvoice {
  const normalizedRate = normalizeEInvoiceVatRateCode(taxRate)
  const rate = Number(invoice.TGIA ?? 1)
  const currencyCode = invoice.DVTTE

  return {
    ...invoice,
    DETAILS: invoice.DETAILS.map((detail) =>
      Number(detail.ISDEL ?? 0) === 1
        ? detail
        : normalizeEInvoiceDetailRow(
            {
              ...detail,
              TSUAT: normalizedRate,
              TTHUE: null,
              TSAUTHUE: null,
              TTHUE_VND: null,
              TSAUTHUE_VND: null,
            },
            rate,
            currencyCode,
            decimalResolver,
            calcSettings,
          ),
    ),
  }
}

export function applySellerToEInvoice(invoice: EInvoice, seller: EInvoiceSeller | null): EInvoice {
  if (!seller) {
    return invoice
  }

  return {
    ...invoice,
    SELLER_ID: seller?.SELLER_ID ?? 0,
    XSL_ID: seller?.XSL_ID ?? invoice.XSL_ID,
    SELLER_NM: trimText(seller?.SELLER_NM),
    SELLER_TAX_CD: trimText(seller?.SELLER_TAX_CD),
    THDON: trimText(seller?.THDON) || invoice.THDON,
    KHMSHDON: trimText(seller?.KHMSHDON) || invoice.KHMSHDON,
    KHHDON: trimText(seller?.KHHDON) || invoice.KHHDON,
  }
}

export function normalizeEInvoiceDetail(record: EInvoiceDetailApi, index: number, companyCd: string): EInvoiceDetail {
  return enrichWarehouseDetailRow({
    ROW_KEY: buildRowKey(),
    DETAIL_ID: toNumber(record.DETAIL_ID, 0),
    INVOICE_ID: toNumber(record.INVOICE_ID, 0),
    COMPANY_CD: trimText(record.COMPANY_CD) || companyCd,
    TCHAT: toNullableNumber(record.TCHAT) ?? 1,
    STT: toNumber(record.STT, index + 1),
    MHHDVU: trimText(record.MHHDVU),
    THHDVU: trimText(record.THHDVU),
    DVTINH: trimText(record.DVTINH),
    SLUONG: toNullableNumber(record.SLUONG),
    SLTHUCNHAP: toNullableNumber(record.SLTHUCNHAP),
    DGIA: toNullableNumber(record.DGIA),
    TLCKHAU: toNullableNumber(record.TLCKHAU),
    STCKHAU: toNumber(record.STCKHAU, 0),
    THTIEN: toNumber(record.THTIEN, 0),
    TSUAT: normalizeEInvoiceVatRateCode(record.TSUAT),
    TTHUE: toNumber(record.TTHUE, 0),
    TSAUTHUE: toNumber(record.TSAUTHUE, 0),
    DGIA_VND: toNullableNumber(record.DGIA_VND),
    STCKHAU_VND: toNumber(record.STCKHAU_VND, 0),
    THTIEN_VND: toNumber(record.THTIEN_VND, 0),
    TTHUE_VND: toNumber(record.TTHUE_VND, 0),
    TSAUTHUE_VND: toNumber(record.TSAUTHUE_VND, 0),
    SPECIAL: normalizeEInvoiceDetailSpecial(record.SPECIAL, toNumber(record.INVOICE_ID, 0), toNumber(record.DETAIL_ID, 0), trimText(record.COMPANY_CD) || companyCd),
    EXTRA_JSON: trimText(record.EXTRA_JSON),
    ISDEL: toNumber(record.ISDEL, 0),
  })
}

export function normalizeEInvoice(record: EInvoiceApi, companyCd: string): EInvoice {
  const details = Array.isArray(record.DETAILS)
    ? record.DETAILS.map((detail, index) => normalizeEInvoiceDetail(detail, index, companyCd))
    : []
  const invoiceId = toNumber(record.INVOICE_ID, 0)
  const normalizedCompanyCd = trimText(record.COMPANY_CD) || companyCd
  const headerTchdon = toNumber(record.TCHDON, 0)
  let related = normalizeEInvoiceRelated(record.RELATED, invoiceId, normalizedCompanyCd)
  // Header đã lưu TCHDON 1..4 nhưng RELATED thiếu/bị strip → dựng lại để form không nhảy về gốc.
  if (!related && requiresEInvoiceRelatedInvoice(headerTchdon)) {
    related = {
      ...createDefaultEInvoiceRelated(invoiceId, normalizedCompanyCd),
      TCHDON: headerTchdon,
    }
  }
  const pxkInfo = normalizeEInvoicePxkInfo(record.PXK_INFO, invoiceId)
  let bkeInfo = normalizeEInvoiceBke(
    record.BKE_INFO,
    invoiceId,
    normalizedCompanyCd,
    related?.TCHDON ?? headerTchdon,
  )

  // API thiếu BKE_INFO nhưng RELATED đã có số BK → dựng shell để form không mất SBKE (chi tiết vẫn cần GetBke).
  if (
    !bkeInfo
    && related
    && isEInvoiceMultiRelatedInvoice(related.TCHDON)
    && (trimText(related.SBKCLQUAN).length > 0 || Boolean(toDateText(related.NBKCLQUAN)))
  ) {
    bkeInfo = syncEInvoiceBkeWithRelated(null, related, {
      INVOICE_ID: invoiceId,
      COMPANY_CD: normalizedCompanyCd,
      SELLER_ID: toNumber(record.SELLER_ID, 0),
      SELLER_NM: trimText(record.SELLER_NM),
      SELLER_TAX_CD: trimText(record.SELLER_TAX_CD),
      NMUA_TEN: trimUnknownText(record.NMUA_TEN),
      NMUA_MST: trimUnknownText(record.NMUA_MST),
      NMUA_DCHI: trimUnknownText(record.NMUA_DCHI),
    })
  }

  // Đồng bộ số/ngày bảng kê 2 chiều RELATED ↔ BKE sau khi load.
  if (related && bkeInfo) {
    if (!trimText(related.SBKCLQUAN) && trimText(bkeInfo.SBKE)) {
      related.SBKCLQUAN = trimText(bkeInfo.SBKE)
    }
    if (!toDateText(related.NBKCLQUAN) && toDateText(bkeInfo.NBKE)) {
      related.NBKCLQUAN = toDateText(bkeInfo.NBKE)
    }
    if (!trimText(bkeInfo.SBKE) && trimText(related.SBKCLQUAN)) {
      bkeInfo.SBKE = trimText(related.SBKCLQUAN)
    }
    if (!toDateText(bkeInfo.NBKE) && toDateText(related.NBKCLQUAN)) {
      bkeInfo.NBKE = toDateText(related.NBKCLQUAN)
    }
  }

  const invoice = {
    ...createDefaultEInvoice(companyCd),
    ...record,
    INVOICE_ID: invoiceId,
    COMPANY_CD: normalizedCompanyCd,
    DOC_VERSION: toNumber(record.DOC_VERSION, 1),
    PBAN: trimText(record.PBAN),
    THDON: trimText(record.THDON),
    KHMSHDON: trimText(record.KHMSHDON),
    KHHDON: trimText(record.KHHDON),
    SHDON: trimText(record.SHDON),
    MHSO: trimText(record.MHSO),
    NLAP: toDateText(record.NLAP),
    HDCTTCHINH: toNumber(record.HDCTTCHINH, 0),
    NBKE: toDateText(record.NBKE),
    DVTTE: normalizeCurrencyCode(record.DVTTE) || DEFAULT_CURRENCY_CODE,
    TGIA: toNumber(record.TGIA, 1),
    SELLER_ID: toNumber(record.SELLER_ID, 0),
    XSL_ID: toNumber(record.XSL_ID, 0),
    SELLER_NM: trimText(record.SELLER_NM),
    SELLER_TAX_CD: trimText(record.SELLER_TAX_CD),
    NMUA_TEN: trimUnknownText(record.NMUA_TEN),
    NMUA_MST: trimUnknownText(record.NMUA_MST),
    NMUA_HVTNMHANG: trimUnknownText(record.NMUA_HVTNMHANG),
    MSTTCGP: trimText(record.MSTTCGP) || DEFAULT_EINVOICE_MSTTCGP,
    MCCQT: trimUnknownText(record.MCCQT),
    MTRACUU: trimUnknownText(record.MTRACUU),
    XML_FTP_PATH: trimText(record.XML_FTP_PATH),
    IS_SIGNED: toNumber(record.IS_SIGNED, 0) === 1 ? 1 : 0,
    TCHDON: toNumber(record.TCHDON, getEInvoiceTchdon(related)),
    INVOICE_STATUS: toNumber(record.INVOICE_STATUS, 0),
    MAIL_STATUS: toNumber(record.MAIL_STATUS, 0),
    SOURCE_INVOICE_ID: toNumber(record.SOURCE_INVOICE_ID, 0) > 0 ? toNumber(record.SOURCE_INVOICE_ID, 0) : null,
    ISDEL: toNumber(record.ISDEL, 0),
    PXK_INFO: pxkInfo,
    RELATED: related,
    BKE_INFO: bkeInfo,
    DETAILS: details.length > 0 ? details : [createDefaultEInvoiceDetail(1, invoiceId, companyCd)],
  }

  // Đồng bộ header.TCHDON với RELATED để list/editor cùng nguồn.
  if (related && requiresEInvoiceRelatedInvoice(related.TCHDON)) {
    invoice.TCHDON = toNumber(related.TCHDON, invoice.TCHDON)
  }

  return applyWarehouseFieldsToInvoice(invoice)
}

export function normalizeEInvoiceRows(records: EInvoiceApi[], companyCd: string): EInvoice[] {
  return records.map((record) => normalizeEInvoice(record, companyCd))
}

export function createEInvoiceCopy(source: EInvoice, companyCd: string): EInvoice {
  const activeDetails = source.DETAILS.filter((detail) => detail.ISDEL !== 1)
  const details =
    activeDetails.length > 0
      ? activeDetails.map((detail, index) => ({
          ...detail,
          ROW_KEY: buildRowKey(),
          DETAIL_ID: 0,
          INVOICE_ID: 0,
          COMPANY_CD: companyCd,
          STT: index + 1,
          ISDEL: 0,
        }))
      : [createDefaultEInvoiceDetail(1, 0, companyCd)]

  return recalculateInvoiceTotals({
    ...source,
    INVOICE_ID: 0,
    DOC_VERSION: 1,
    COMPANY_CD: companyCd,
    SHDON: "",
    MHSO: "",
    MCCQT: "",
    MTRACUU: "",
    MTDIEP: "",
    MGDDTu: "",
    NLAP: toDateText(new Date()),
    SBKE: "",
    NBKE: null,
    DLQRCODE: "",
    IS_SIGNED: 0,
    MAIL_STATUS: 0,
    ERROR_MESSAGE: "",
    ISDEL: 0,
    PXK_INFO: source.PXK_INFO
      ? {
          ...source.PXK_INFO,
          PXK_ID: 0,
          INVOICE_ID: 0,
          ISDEL: 0,
        }
      : null,
    BKE_INFO: null,
    DETAILS: details,
  })
}

export function getActiveEInvoiceDetails(details: EInvoiceDetail[]): EInvoiceDetail[] {
  return details.filter((detail) => Number(detail.ISDEL ?? 0) !== 1)
}

export function resolveEInvoiceDetailRowKey(
  rowKey: string | number | undefined,
  data: EInvoiceDetail | undefined,
): string | null {
  if (typeof rowKey === "string" && rowKey.length > 0) {
    return rowKey
  }

  if (typeof data?.ROW_KEY === "string" && data.ROW_KEY.length > 0) {
    return data.ROW_KEY
  }

  return null
}

export function normalizeEInvoiceDetailRow(
  detail: EInvoiceDetail,
  rate: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
  calcSettings?: EInvoiceCalcSettings,
): EInvoiceDetail {
  return calculateDetailAmount(
    {
      ...detail,
      MHHDVU: trimText(detail.MHHDVU),
      THHDVU: trimText(detail.THHDVU),
      DVTINH: trimText(detail.DVTINH),
      TSUAT: normalizeEInvoiceVatRateCode(detail.TSUAT),
      TCHAT: toNullableNumber(detail.TCHAT) ?? 1,
      ISDEL: Number(detail.ISDEL ?? 0),
    },
    rate,
    currencyCode,
    decimalResolver,
    calcSettings,
  )
}

export function renumberEInvoiceDetails(
  rows: EInvoiceDetail[],
  rate: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
  calcSettings?: EInvoiceCalcSettings,
): EInvoiceDetail[] {
  let activeStt = 0
  return rows.map((row) => {
    if (Number(row.ISDEL ?? 0) === 1) {
      return { ...row }
    }

    activeStt += 1
    return normalizeEInvoiceDetailRow({ ...row, STT: activeStt }, rate, currencyCode, decimalResolver, calcSettings)
  })
}

export function createNextEInvoiceDetail(
  details: EInvoiceDetail[],
  invoiceId: number,
  companyCd: string,
): EInvoiceDetail {
  const nextStt = getActiveEInvoiceDetails(details).length + 1
  return createDefaultEInvoiceDetail(nextStt, invoiceId, companyCd)
}

export function shouldValidateEInvoiceDetailBeforeAppend(
  row: EInvoiceDetail,
  activeRowCount: number,
): boolean {
  if (activeRowCount > 1) {
    return true
  }

  return (
    trimText(row.MHHDVU).length > 0 ||
    trimText(row.THHDVU).length > 0 ||
    toNumber(row.DGIA, 0) !== 0 ||
    toNumber(row.SLUONG, 0) !== 1
  )
}

export type EInvoiceRequiredField = {
  fieldKey: string
  fieldFallback: string
}

export function getEInvoiceDetailAppendRequiredField(row: EInvoiceDetail): EInvoiceRequiredField | null {
  if (trimText(row.THHDVU).length > 0) {
    return null
  }

  return { fieldKey: "THHDVU", fieldFallback: "Item name" }
}

export function calculateDetailAmount(
  detail: EInvoiceDetail,
  rate: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
  calcSettings?: EInvoiceCalcSettings,
): EInvoiceDetail {
  const foreignCurrency = isForeignCurrencyCode(currencyCode)
  const effectiveRate = rate > 0 ? rate : 1
  const quantityValue = toNumber(detail.SLUONG, 0)

  if (
    calcSettings?.detailAmountDriver === "afterTaxUnitPrice"
    && quantityValue !== 0
  ) {
    const afterTaxUnitPrice = toNumber(calcSettings.afterTaxUnitPriceValue ?? 0)
    const vatPercent = resolveEInvoiceVatRatePercent(detail.TSUAT)
    const resolved = resolveDetailAmountsFromAfterTaxUnitPrice(
      afterTaxUnitPrice,
      quantityValue,
      vatPercent,
      currencyCode,
      decimalResolver,
    )
    const unitPriceVnd = roundNullableDetailNumber(
      decimalResolver,
      "DGIA_VND",
      foreignCurrency ? resolved.unitPrice * effectiveRate : resolved.unitPrice,
      DEFAULT_CURRENCY_CODE,
    )
    const amountVnd = roundDetailNumber(
      decimalResolver,
      "THTIEN_VND",
      foreignCurrency ? resolved.amount * effectiveRate : resolved.amount,
      DEFAULT_CURRENCY_CODE,
    )
    const taxAmountVnd = roundDetailNumber(
      decimalResolver,
      "TTHUE_VND",
      foreignCurrency ? resolved.taxAmount * effectiveRate : resolved.taxAmount,
      DEFAULT_CURRENCY_CODE,
    )

    return {
      ...detail,
      TSUAT: normalizeEInvoiceVatRateCode(detail.TSUAT),
      SLUONG: roundNullableDetailNumber(decimalResolver, "SLUONG", toNullableNumber(detail.SLUONG), currencyCode),
      DGIA: resolved.unitPrice,
      TLCKHAU: roundNullableDetailNumber(decimalResolver, "TLCKHAU", toNullableNumber(detail.TLCKHAU), currencyCode),
      STCKHAU: 0,
      THTIEN: resolved.amount,
      TTHUE: resolved.taxAmount,
      TSAUTHUE: resolved.afterTaxAmount,
      DGIA_VND: unitPriceVnd,
      STCKHAU_VND: 0,
      THTIEN_VND: amountVnd,
      TTHUE_VND: taxAmountVnd,
      TSAUTHUE_VND: roundDetailNumber(
        decimalResolver,
        "TSAUTHUE_VND",
        amountVnd + taxAmountVnd,
        DEFAULT_CURRENCY_CODE,
      ),
    }
  }

  let workingDetail = detail

  if (
    calcSettings?.detailAmountDriver === "beforeTaxAmount"
    && calcSettings.autoCalcPriceFromBeforeTaxAmount === true
    && quantityValue !== 0
  ) {
    const targetAmount = toNumber(detail.THTIEN, 0)
    workingDetail = {
      ...detail,
      DGIA: resolveUnitPriceFromBeforeTaxAmount(detail, quantityValue, targetAmount, currencyCode, decimalResolver),
    }
  } else if (
    calcSettings?.detailAmountDriver === "afterTaxAmount"
    && calcSettings.autoCalcPriceFromAfterTaxAmount === true
    && quantityValue !== 0
  ) {
    const afterTaxAmount = toNumber(detail.TSAUTHUE, 0)
    const vatPercent = resolveEInvoiceVatRatePercent(detail.TSUAT)
    const beforeTaxAmount = vatPercent > 0 ? afterTaxAmount / (1 + vatPercent / 100) : afterTaxAmount
    workingDetail = {
      ...detail,
      THTIEN: beforeTaxAmount,
      DGIA: resolveUnitPriceFromBeforeTaxAmount(
        { ...detail, THTIEN: beforeTaxAmount },
        quantityValue,
        beforeTaxAmount,
        currencyCode,
        decimalResolver,
      ),
    }
  }

  const unitPrice = roundNullableDetailNumber(decimalResolver, "DGIA", toNullableNumber(workingDetail.DGIA), currencyCode) ?? 0
  const discount = resolveEInvoiceDetailDiscount(workingDetail, quantityValue, unitPrice, currencyCode, decimalResolver)
  const amount = resolveEInvoiceDetailAmount(
    workingDetail,
    quantityValue,
    unitPrice,
    discount,
    currencyCode,
    decimalResolver,
    calcSettings,
  )
  const isCommercialDiscount = isCommercialDiscountTchat(detail.TCHAT)
  const normalizedAmount = isCommercialDiscount
    ? toStoredCommercialDiscountAmount(
      calcSettings?.autoCalcAmount === false ? toNumber(detail.THTIEN, 0) : amount,
    )
    : amount
  const persistedDiscount = isCommercialDiscount ? 0 : discount
  const taxInput = toNullableNumber(detail.TTHUE)
  const afterTaxInput = toNullableNumber(detail.TSAUTHUE)
  const preserveLineTax = calcSettings?.autoCalcTax === false
  const hasLineTaxOverride = preserveLineTax
    ? taxInput !== null || afterTaxInput !== null
    : taxInput !== null && (taxInput !== 0 || toNumber(detail.TSAUTHUE, 0) !== 0)
  const rawTaxAmount = normalizedAmount * resolveEInvoiceVatRatePercent(detail.TSUAT) / 100
  const taxAmount = hasLineTaxOverride
    ? roundDetailNumber(
      decimalResolver,
      "TTHUE",
      isCommercialDiscount ? Math.abs(taxInput ?? 0) : (taxInput ?? 0),
      currencyCode,
    )
    : roundDetailNumber(
      decimalResolver,
      "TTHUE",
      isCommercialDiscount ? Math.abs(rawTaxAmount) : rawTaxAmount,
      currencyCode,
    )
  const afterTaxAmount = afterTaxInput !== null && (afterTaxInput !== 0 || hasLineTaxOverride)
    ? roundDetailNumber(
      decimalResolver,
      "TSAUTHUE",
      isCommercialDiscount ? Math.abs(afterTaxInput) : afterTaxInput,
      currencyCode,
    )
    : roundDetailNumber(decimalResolver, "TSAUTHUE", normalizedAmount + taxAmount, currencyCode)
  const unitPriceVnd = roundNullableDetailNumber(
    decimalResolver,
    "DGIA_VND",
    foreignCurrency ? unitPrice * effectiveRate : unitPrice,
    DEFAULT_CURRENCY_CODE,
  )
  const discountVnd = roundDetailNumber(
    decimalResolver,
    "STCKHAU_VND",
    foreignCurrency ? persistedDiscount * effectiveRate : persistedDiscount,
    DEFAULT_CURRENCY_CODE,
  )
  const amountVnd = roundDetailNumber(
    decimalResolver,
    "THTIEN_VND",
    foreignCurrency ? normalizedAmount * effectiveRate : normalizedAmount,
    DEFAULT_CURRENCY_CODE,
  )
  const taxAmountVnd = roundDetailNumber(
    decimalResolver,
    "TTHUE_VND",
    foreignCurrency ? taxAmount * effectiveRate : taxAmount,
    DEFAULT_CURRENCY_CODE,
  )

  return {
    ...detail,
    TSUAT: normalizeEInvoiceVatRateCode(detail.TSUAT),
    SLUONG: roundNullableDetailNumber(decimalResolver, "SLUONG", toNullableNumber(detail.SLUONG), currencyCode),
    DGIA: roundNullableDetailNumber(decimalResolver, "DGIA", unitPrice, currencyCode),
    TLCKHAU: roundNullableDetailNumber(decimalResolver, "TLCKHAU", toNullableNumber(detail.TLCKHAU), currencyCode),
    STCKHAU: persistedDiscount,
    THTIEN: normalizedAmount,
    TTHUE: taxAmount,
    TSAUTHUE: afterTaxAmount,
    DGIA_VND: unitPriceVnd,
    STCKHAU_VND: discountVnd,
    THTIEN_VND: amountVnd,
    TTHUE_VND: taxAmountVnd,
    TSAUTHUE_VND: roundDetailNumber(
      decimalResolver,
      "TSAUTHUE_VND",
      amountVnd + taxAmountVnd,
      DEFAULT_CURRENCY_CODE,
    ),
  }
}

export function serializeEInvoiceTaxSummary(summary: EInvoiceTaxSummary[]): string {
  if (summary.length === 0) {
    return ""
  }

  return JSON.stringify(
    summary.map((row) => ({
      TSuat: row.TSuat,
      ThTien: row.ThTien,
      TThue: row.TThue,
    })),
  )
}

export function calculateEInvoiceTaxSummary(
  details: EInvoiceDetail[],
  currencyCode = DEFAULT_CURRENCY_CODE,
  decimalResolver?: EInvoiceDecimalResolver | null,
  commercialDiscount?: Pick<EInvoiceCommercialDiscountResolution, "source" | "amount" | "taxableAmount">,
): EInvoiceTaxSummary[] {
  const activeDetails = details.filter((detail) => detail.ISDEL !== 1)
  const discountResolution = commercialDiscount ?? resolveEInvoiceCommercialDiscount({}, activeDetails)
  const taxDetails = activeDetails.filter((detail) => !isCommercialDiscountTchat(detail.TCHAT))
  const summaryMap = new Map<string, EInvoiceTaxSummary>()

  taxDetails.forEach((detail) => {
    const code = normalizeEInvoiceVatRateCode(detail.TSUAT) || "KCT"
    const current = summaryMap.get(code) ?? { TSuat: code, ThTien: 0, TThue: 0 }
    current.ThTien += toNumber(detail.THTIEN, 0)
    summaryMap.set(code, current)
  })

  if (discountResolution.source === "header" && discountResolution.amount > 0) {
    const productTotal = taxDetails.reduce((sum, detail) => sum + toNumber(detail.THTIEN, 0), 0)
    if (productTotal > 0) {
      summaryMap.forEach((row) => {
        const share = row.ThTien / productTotal
        row.ThTien = roundHeaderNumber(
          decimalResolver,
          "THTIEN",
          row.ThTien - discountResolution.amount * share,
          currencyCode,
        )
      })
    }
  } else if (discountResolution.source === "detail-lines") {
    activeDetails
      .filter((detail) => isCommercialDiscountTchat(detail.TCHAT))
      .forEach((detail) => {
        const code = normalizeEInvoiceVatRateCode(detail.TSUAT) || "KCT"
        const current = summaryMap.get(code) ?? { TSuat: code, ThTien: 0, TThue: 0 }
        current.ThTien = Math.max(current.ThTien - resolveCommercialDiscountLineAmount(detail), 0)
        summaryMap.set(code, current)
      })
  }

  summaryMap.forEach((row) => {
    row.TThue = roundHeaderNumber(
      decimalResolver,
      "TGTTTHUE",
      row.ThTien * resolveEInvoiceVatRatePercent(row.TSuat) / 100,
      currencyCode,
    )
  })

  return Array.from(summaryMap.values())
}

export function recalculateInvoiceTotals(
  invoice: EInvoice,
  decimalResolver?: EInvoiceDecimalResolver | null,
  calcSettings?: EInvoiceCalcSettings,
  nq204Options?: { preferInvoiceReduction?: boolean; defaultVatRate?: string },
): EInvoice {
  const activeDetails = invoice.DETAILS.filter((detail) => detail.ISDEL !== 1)
  const foreignCurrency = isForeignCurrencyCode(invoice.DVTTE)
  const currencyCode = normalizeCurrencyCode(invoice.DVTTE) || DEFAULT_CURRENCY_CODE
  const commercialDiscount = resolveEInvoiceCommercialDiscount(invoice, activeDetails, {
    allowNegativeValues: calcSettings?.allowNegativeValues,
  })
  const totalBeforeTax = commercialDiscount.goodsBeforeTax
  const totalBeforeTaxVnd = commercialDiscount.goodsBeforeTaxVnd
  const taxableAmount = commercialDiscount.taxableAmount
  const taxableAmountVnd = commercialDiscount.taxableAmountVnd
  const withoutTaxRate = isEInvoiceWithoutTaxRate(invoice.KHMSHDON)
  const preserveTax = !withoutTaxRate && calcSettings?.autoCalcTax === false
  const taxSummary = withoutTaxRate
    ? []
    : calculateEInvoiceTaxSummary(activeDetails, currencyCode, decimalResolver, commercialDiscount)
  const tax = withoutTaxRate
    ? 0
    : preserveTax
    ? roundHeaderNumber(decimalResolver, "TGTTTHUE", toNumber(invoice.TGTTTHUE, 0), currencyCode)
    : taxSummary.reduce((sum, item) => sum + item.TThue, 0)
  const rate = roundHeaderNumber(
    decimalResolver,
    "TGIA",
    foreignCurrency ? toNumber(invoice.TGIA, 1) : 1,
    currencyCode,
  )
  const taxVnd = withoutTaxRate
    ? 0
    : preserveTax
    ? roundHeaderNumber(decimalResolver, "TGTTTHUE_VND", toNumber(invoice.TGTTTHUE_VND, 0), DEFAULT_CURRENCY_CODE)
    : foreignCurrency
      ? roundHeaderNumber(
          decimalResolver,
          "TGTTTHUE_VND",
          calculateEInvoiceTaxSummary(activeDetails, DEFAULT_CURRENCY_CODE, decimalResolver, {
            source: commercialDiscount.source,
            amount: commercialDiscount.amountVnd,
            taxableAmount: commercialDiscount.taxableAmountVnd,
          }).reduce((sum, item) => sum + item.TThue, 0),
          DEFAULT_CURRENCY_CODE,
        )
      : tax
  const taxSummaryJson = withoutTaxRate ? "" : serializeEInvoiceTaxSummary(taxSummary)
  const nonTaxableDiscount = toNumber(invoice.TGTKCTHUE, 0)
  const nq204VatRatePercent = resolveEInvoiceVatRatePercent(
    resolveHeaderTaxRateFromDetails(invoice.DETAILS, nq204Options?.defaultVatRate ?? ""),
  )
  const nq204Totals = withoutTaxRate
    ? applyEInvoiceNq204SalesTotals(invoice, totalBeforeTax, totalBeforeTaxVnd, foreignCurrency, rate, decimalResolver, {
        preferInvoiceReduction: nq204Options?.preferInvoiceReduction,
        vatRatePercent: nq204VatRatePercent,
      })
    : null
  const paymentAmount = roundHeaderNumber(
    decimalResolver,
    "TGTTTBSO",
    withoutTaxRate ? (nq204Totals?.TGTTTBSO ?? totalBeforeTax) : taxableAmount + tax,
    currencyCode,
  )
  const otherDiscount = isEInvoiceSalesForm(invoice.KHMSHDON) ? (nq204Totals?.TGTKHAC ?? 0) : toNumber(invoice.TGTKHAC, 0)

  return {
    ...invoice,
    DVTTE: currencyCode,
    TGIA: rate,
    TGTCTHUE: roundHeaderNumber(
      decimalResolver,
      "TGTCTHUE",
      withoutTaxRate ? (nq204Totals?.TGTCTHUE ?? 0) : totalBeforeTax,
      currencyCode,
    ),
    TTCKTMAI: roundHeaderNumber(decimalResolver, "TTCKTMAI", commercialDiscount.amount, currencyCode),
    CKTMAI_GCHU: resolveHeaderCommercialDiscountNote(
      commercialDiscount.source,
      commercialDiscount.amount,
      invoice.CKTMAI_GCHU,
    ),
    TGTTTHUE: roundHeaderNumber(decimalResolver, "TGTTTHUE", tax, currencyCode),
    TGTTTBSO: paymentAmount,
    TGTTTBCHU: convertAmountToWords(paymentAmount, currencyCode),
    TGTCTHUE_VND: roundHeaderNumber(
      decimalResolver,
      "TGTCTHUE_VND",
      withoutTaxRate ? (nq204Totals?.TGTCTHUE_VND ?? 0) : totalBeforeTaxVnd,
      DEFAULT_CURRENCY_CODE,
    ),
    TGTKCTHUE_VND: roundHeaderNumber(
      decimalResolver,
      "TGTKCTHUE_VND",
      foreignCurrency ? nonTaxableDiscount * rate : nonTaxableDiscount,
      DEFAULT_CURRENCY_CODE,
    ),
    TGTTTHUE_VND: roundHeaderNumber(decimalResolver, "TGTTTHUE_VND", taxVnd, DEFAULT_CURRENCY_CODE),
    TTCKTMAI_VND: roundHeaderNumber(decimalResolver, "TTCKTMAI_VND", commercialDiscount.amountVnd, DEFAULT_CURRENCY_CODE),
    TGTKHAC: roundHeaderNumber(decimalResolver, "TGTKHAC", otherDiscount, currencyCode),
    TGTKHAC_VND: roundHeaderNumber(
      decimalResolver,
      "TGTKHAC_VND",
      withoutTaxRate
        ? (nq204Totals?.TGTKHAC_VND ?? 0)
        : foreignCurrency
          ? otherDiscount * rate
          : otherDiscount,
      DEFAULT_CURRENCY_CODE,
    ),
    TGTTTBSO_VND: roundHeaderNumber(
      decimalResolver,
      "TGTTTBSO_VND",
      withoutTaxRate ? (nq204Totals?.TGTTTBSO_VND ?? totalBeforeTaxVnd) : taxableAmountVnd + taxVnd,
      DEFAULT_CURRENCY_CODE,
    ),
    TAX_SUMMARY_JSON: taxSummaryJson,
  }
}

export function mapEInvoiceToApiPayload(
  record: EInvoice & Partial<EInvoiceWarehouseFields> & Partial<{ TEMPLATE_XSL_ID: number }>,
): EInvoiceApi {
  const source = isEInvoiceWarehouseForm(record.KHMSHDON) ? preparePxkInvoiceForSave(record) : record
  const selectedXslId = toNumber(source.TEMPLATE_XSL_ID ?? source.XSL_ID, 0)

  return {
    INVOICE_ID: source.INVOICE_ID,
    DOC_VERSION: toNumber(source.DOC_VERSION, 1) > 0 ? toNumber(source.DOC_VERSION, 1) : 1,
    COMPANY_CD: source.COMPANY_CD,
    THDON: nullableText(source.THDON),
    KHMSHDON: nullableText(source.KHMSHDON),
    KHHDON: nullableText(source.KHHDON),
    SHDON: null,
    MHSO: nullableText(source.MHSO),
    NLAP: toDateText(source.NLAP),
    HDCTTCHINH: source.HDCTTCHINH,
    SBKE: nullableText(source.SBKE),
    NBKE: toDateText(source.NBKE),
    DVTTE: normalizeCurrencyCode(source.DVTTE) || DEFAULT_CURRENCY_CODE,
    TGIA: source.TGIA,
    HTTTOAN: nullableText(source.HTTTOAN),
    MSTTCGP: nullableText(trimText(source.MSTTCGP) || DEFAULT_EINVOICE_MSTTCGP),
    TCHDON: resolveEInvoiceFormTchdon(source),
    SOURCE_INVOICE_ID: resolveEInvoiceSourceInvoiceId(source.RELATED, source.SOURCE_INVOICE_ID),
    SELLER_ID: toNumber(source.SELLER_ID, 0) > 0 ? toNumber(source.SELLER_ID, 0) : null,
    XSL_ID: selectedXslId > 0 ? selectedXslId : null,
    NMUA_TEN: nullableText(source.NMUA_TEN),
    NMUA_MST: nullableText(source.NMUA_MST),
    NMUA_MDVQHNSACH: nullableText(source.NMUA_MDVQHNSACH),
    NMUA_DCHI: nullableText(source.NMUA_DCHI),
    NMUA_MTINH: nullableText(source.NMUA_MTINH),
    NMUA_TTINH: nullableText(source.NMUA_TTINH),
    NMUA_MXA: nullableText(source.NMUA_MXA),
    NMUA_TXA: nullableText(source.NMUA_TXA),
    NMUA_MKHANG: nullableText(source.NMUA_MKHANG),
    NMUA_SDTHOAI: nullableText(source.NMUA_SDTHOAI),
    NMUA_CCCDAN: nullableText(source.NMUA_CCCDAN),
    NMUA_SHCHIEU: nullableText(source.NMUA_SHCHIEU),
    NMUA_DCTDTU: nullableText(source.NMUA_DCTDTU),
    NMUA_HVTNMHANG: nullableText(source.NMUA_HVTNMHANG),
    NMUA_STKNHANG: nullableText(source.NMUA_STKNHANG),
    NMUA_TNHANG: nullableText(source.NMUA_TNHANG),
    TGTCTHUE: source.TGTCTHUE,
    TGTKCTHUE: source.TGTKCTHUE,
    TGTTTHUE: source.TGTTTHUE,
    TTCKTMAI: source.TTCKTMAI,
    CKTMAI_GCHU: nullableText(source.CKTMAI_GCHU),
    TGTKHAC: source.TGTKHAC,
    TGTTTBSO: source.TGTTTBSO,
    TGTTTBCHU: nullableText(source.TGTTTBCHU),
    TGTCTHUE_VND: source.TGTCTHUE_VND,
    TGTKCTHUE_VND: source.TGTKCTHUE_VND,
    TGTTTHUE_VND: source.TGTTTHUE_VND,
    TTCKTMAI_VND: source.TTCKTMAI_VND,
    TGTKHAC_VND: source.TGTKHAC_VND,
    TGTTTBSO_VND: source.TGTTTBSO_VND,
    DLQRCODE: nullableText(source.DLQRCODE),
    MCCQT: nullableText(source.MCCQT),
    MTRACUU: nullableText(source.MTRACUU),
    MTDIEP: nullableText(source.MTDIEP),
    MGDDTu: nullableText(source.MGDDTu),
    RELATED: (() => {
      const formTchdon = resolveEInvoiceFormTchdon(source)
      if (!requiresEInvoiceRelatedInvoice(formTchdon)) {
        return null
      }
      const related = source.RELATED ?? createDefaultEInvoiceRelated(toNumber(source.INVOICE_ID, 0), source.COMPANY_CD)
      return {
        RELATED_ID: related.RELATED_ID ?? 0,
        INVOICE_ID: source.INVOICE_ID,
        COMPANY_CD: source.COMPANY_CD,
        TCHDON: related.TCHDON || formTchdon,
        IS_EXTERNAL: toNumber(related.IS_EXTERNAL, 0) === 1 ? 1 : 0,
        MSTCLQUAN: nullableText(related.MSTCLQUAN),
        LHDCLQUAN: related.LHDCLQUAN ?? null,
        KHMSHDCLQUAN: nullableText(related.KHMSHDCLQUAN),
        KHHDCLQUAN: nullableText(related.KHHDCLQUAN),
        SHDCLQUAN: nullableText(related.SHDCLQUAN),
        NLHDCLQUAN: toDateText(related.NLHDCLQUAN),
        LDDCTTHE: related.LDDCTTHE ?? null,
        SBKCLQUAN: nullableText(related.SBKCLQUAN) ?? nullableText(source.BKE_INFO?.SBKE),
        NBKCLQUAN: toDateText(related.NBKCLQUAN) ?? toDateText(source.BKE_INFO?.NBKE),
        GCHU: nullableText(related.GCHU),
      }
    })(),
    BKE_INFO: isEInvoiceMultiRelatedInvoice(resolveEInvoiceFormTchdon(source)) && hasEInvoiceBkeData(source.BKE_INFO)
      ? {
          BKE_ID: source.BKE_INFO?.BKE_ID ?? 0,
          COMPANY_CD: source.COMPANY_CD,
          INVOICE_ID: source.INVOICE_ID,
          SELLER_ID: source.BKE_INFO?.SELLER_ID ?? null,
          PBAN: nullableText(source.BKE_INFO?.PBAN) ?? "2.1.1",
          TBKE: nullableText(source.BKE_INFO?.TBKE),
          KHMBKE: nullableText(source.BKE_INFO?.KHMBKE) ?? "01/BK-ĐCTT",
          SBKE: nullableText(source.BKE_INFO?.SBKE) ?? nullableText(source.RELATED?.SBKCLQUAN),
          NBKE: toDateText(source.BKE_INFO?.NBKE) ?? toDateText(source.RELATED?.NBKCLQUAN),
          TCHDON: resolveEInvoiceBkeTchdon(resolveEInvoiceFormTchdon(source)),
          NBAN: nullableText(source.BKE_INFO?.NBAN),
          MSTNBAN: nullableText(source.BKE_INFO?.MSTNBAN),
          DCNBAN: nullableText(source.BKE_INFO?.DCNBAN),
          TCTCNHANG: toNumber(source.BKE_INFO?.TCTCNHANG, 0) === 1 ? 1 : 0,
          NMUA: nullableText(source.BKE_INFO?.NMUA),
          MSTNMUA: nullableText(source.BKE_INFO?.MSTNMUA),
          DCNMUA: nullableText(source.BKE_INFO?.DCNMUA),
          TTKHAC_XML: nullableText(source.BKE_INFO?.TTKHAC_XML),
          REASONS: (source.BKE_INFO?.REASONS ?? [])
            .filter((reason) => reason.ISDEL !== 1 && trimText(reason.LDO).length > 0)
            .map((reason, index) => ({
              REASON_ID: 0,
              BKE_ID: source.BKE_INFO?.BKE_ID ?? 0,
              SORT_ORDER: index + 1,
              LDO: nullableText(reason.LDO),
              ISDEL: 0,
            })),
          DETAILS: (source.BKE_INFO?.DETAILS ?? [])
            .filter((detail) => detail.ISDEL !== 1)
            .map((detail, index) => ({
              DETAIL_ID: 0,
              BKE_ID: source.BKE_INFO?.BKE_ID ?? 0,
              STT: detail.STT ?? index + 1,
              REF_INVOICE_ID: detail.REF_INVOICE_ID,
              KHMSHDON: nullableText(detail.KHMSHDON),
              KHHDON: nullableText(detail.KHHDON),
              SHDON: nullableText(detail.SHDON),
              THHDVGOC: nullableText(detail.THHDVGOC),
              SLGOC: detail.SLGOC,
              DGGOC: detail.DGGOC,
              THTGOC: detail.THTGOC,
              TSGOC: nullableText(detail.TSGOC),
              TTGOC: detail.TTGOC,
              TGTKGOC: detail.TGTKGOC,
              TGTSTGOC: detail.TGTSTGOC,
              THHDVTDOI: nullableText(detail.THHDVTDOI),
              SLTDOI: detail.SLTDOI,
              DGTDOI: detail.DGTDOI,
              THTTDOI: detail.THTTDOI,
              TSTDOI: nullableText(detail.TSTDOI),
              TTTDOI: detail.TTTDOI,
              TGTTDOI: detail.TGTTDOI,
              TGTSTTDOI: detail.TGTSTTDOI,
              TGTCTCLECH: detail.TGTCTCLECH,
              TGTTCLECH: detail.TGTTCLECH,
              TGTKCLECH: detail.TGTKCLECH,
              TGTTTCLECH: detail.TGTTTCLECH,
              EXTRA_JSON: nullableText(detail.EXTRA_JSON),
              ISDEL: 0,
            })),
        }
      : null,
    TAX_SUMMARY_JSON: nullableText(source.TAX_SUMMARY_JSON),
    FEE_JSON: nullableText(source.FEE_JSON),
    EXTRA_JSON: isEInvoiceWarehouseForm(source.KHMSHDON)
      ? nullableText(stripWarehouseFieldsFromExtra(source.EXTRA_JSON))
      : nullableText(source.EXTRA_JSON),
    PXK_INFO: isEInvoiceWarehouseForm(source.KHMSHDON)
      ? createEInvoicePxkInfoFromWarehouseFields(source, source.KHHDON)
      : null,
    IS_SIGNED: toNumber(source.IS_SIGNED, 0) === 1 ? 1 : 0,
    ERROR_MESSAGE: nullableText(source.ERROR_MESSAGE),
    ISDEL: source.ISDEL,
    DETAILS: source.DETAILS
      .filter((detail) => detail.ISDEL !== 1)
      .map<EInvoiceDetailApi>((detail) => {
        const serializedDetail = isEInvoiceWarehouseForm(source.KHMSHDON)
          ? serializeWarehouseDetailExtra(detail)
          : detail

        return {
        DETAIL_ID: serializedDetail.DETAIL_ID,
        INVOICE_ID: source.INVOICE_ID,
        COMPANY_CD: source.COMPANY_CD,
        TCHAT: serializedDetail.TCHAT,
        STT: serializedDetail.STT,
        MHHDVU: nullableText(serializedDetail.MHHDVU),
        THHDVU: nullableText(serializedDetail.THHDVU),
        DVTINH: nullableText(serializedDetail.DVTINH),
        SLUONG: serializedDetail.SLUONG,
        SLTHUCNHAP: serializedDetail.SLTHUCNHAP,
        DGIA: serializedDetail.DGIA,
        TLCKHAU: serializedDetail.TLCKHAU,
        STCKHAU: isCommercialDiscountTchat(serializedDetail.TCHAT) ? 0 : serializedDetail.STCKHAU,
        THTIEN: serializedDetail.THTIEN,
        TSUAT: nullableText(normalizeEInvoiceVatRateCode(serializedDetail.TSUAT)),
        TTHUE: serializedDetail.TTHUE,
        TSAUTHUE: serializedDetail.TSAUTHUE,
        DGIA_VND: serializedDetail.DGIA_VND,
        STCKHAU_VND: isCommercialDiscountTchat(serializedDetail.TCHAT) ? 0 : serializedDetail.STCKHAU_VND,
        THTIEN_VND: serializedDetail.THTIEN_VND,
        TTHUE_VND: serializedDetail.TTHUE_VND,
        TSAUTHUE_VND: serializedDetail.TSAUTHUE_VND,
        SPECIAL: serializedDetail.TCHAT === 5 && serializedDetail.SPECIAL && [1, 2, 3, 4].includes(Number(serializedDetail.SPECIAL.LHHDTRUNG))
          ? {
              SPECIAL_ID: serializedDetail.SPECIAL?.SPECIAL_ID ?? 0,
              INVOICE_ID: source.INVOICE_ID,
              DETAIL_ID: serializedDetail.DETAIL_ID,
              COMPANY_CD: source.COMPANY_CD,
              LHHDTRUNG: serializedDetail.SPECIAL?.LHHDTRUNG ?? 0,
              SKHUNG: nullableText(serializedDetail.SPECIAL?.SKHUNG),
              SMAY: nullableText(serializedDetail.SPECIAL?.SMAY),
              BKSPT_VCHUYEN: nullableText(serializedDetail.SPECIAL?.BKSPT_VCHUYEN),
              TNG_HANG: nullableText(serializedDetail.SPECIAL?.TNG_HANG),
              DCNG_HANG: nullableText(serializedDetail.SPECIAL?.DCNG_HANG),
              MSTNG_HANG: nullableText(serializedDetail.SPECIAL?.MSTNG_HANG),
              MDDNG_HANG: nullableText(serializedDetail.SPECIAL?.MDDNG_HANG),
              EXTRA_JSON: nullableText(serializedDetail.SPECIAL?.EXTRA_JSON),
            }
          : null,
        EXTRA_JSON: nullableText(serializedDetail.EXTRA_JSON),
        ISDEL: serializedDetail.ISDEL,
      }}),
  }
}
