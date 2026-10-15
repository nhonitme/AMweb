import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import { formatYmdForDisplay, normalizeYmd } from "@/pages/Accounting/accountingDateUtils"
import {
  calculateChitAmount,
  createDefaultChit,
  createDefaultChitDetail,
} from "@/pages/VoucherManagement/chitUtils"
import type { ChitInfo, VatVoucherType } from "@/types/voucher"
import type { CustomerExt } from "@/types/customerExt"
import type { ReportPreviewCellValue } from "@/api/configuredReportPreviewApi"

export type VatInvoiceRow = Record<string, ReportPreviewCellValue> & { ROW_KEY: string }
export type VatInvoiceType = "BUY" | "SELL"
export function getDefaultVatVoucherType(invoiceType: VatInvoiceType): VatVoucherType {
  return invoiceType === "BUY" ? "PO" : "SO"
}

export type VatVoucherDraft = {
  key: string
  invoices: VatInvoiceRow[]
  record: ChitInfo
  edited: boolean
  savedChitCd?: string
  linkedInvoiceKeys: string[]
  error?: string
}

export function readInvoiceValue(row: VatInvoiceRow, candidates: string[]): ReportPreviewCellValue {
  const fields = new Map(Object.keys(row).map((key) => [key.trim().toUpperCase(), key]))
  for (const candidate of candidates) {
    const field = fields.get(candidate.toUpperCase())
    const value = field ? row[field] : null
    if (value !== null && value !== undefined && String(value).trim() !== "") return value
  }
  return null
}

export function readInvoiceText(row: VatInvoiceRow, candidates: string[]): string {
  const value = readInvoiceValue(row, candidates)
  return value == null ? "" : String(value).trim()
}

export function readInvoiceNumber(row: VatInvoiceRow, candidates: string[]): number {
  const value = readInvoiceValue(row, candidates)
  if (typeof value === "number" && Number.isFinite(value)) return value
  const parsed = Number(String(value ?? "").replace(/,/g, ""))
  return Number.isFinite(parsed) ? parsed : 0
}

export function getVatInvoiceKey(row: VatInvoiceRow): string {
  return readInvoiceText(row, ["mhdon", "MHDON", "INVOICE_ID", "ID"])
}

export function formatVatInvoiceLabel(row: VatInvoiceRow): string {
  const form = readInvoiceText(row, ["khmshdon", "KHMSHDON"])
  const series = readInvoiceText(row, ["khhdon", "KHHDON"])
  const number = readInvoiceText(row, ["shdon", "SHDON"])
  const date = normalizeYmd(readInvoiceText(row, ["tdlap", "TDLAP"]))
  const formAndSeries = `${form}${series}`
  const invoiceNumber = [formAndSeries, number].filter(Boolean).join("/")
  return [invoiceNumber, date && formatYmdForDisplay(date)]
    .filter(Boolean)
    .join(" ") || getVatInvoiceKey(row)
}

export function buildVatVoucherDraft(
  invoices: VatInvoiceRow[],
  invoiceType: VatInvoiceType,
  voucherType: VatVoucherType = getDefaultVatVoucherType(invoiceType),
): ChitInfo {
  if (invoices.length === 0) throw new Error("Cần ít nhất một hóa đơn để lập chứng từ.")

  const companyCd = getCurrentCompanyCd()
  const userId = getCurrentUserId()
  const chitType: ChitType = voucherType
  const firstDate = normalizeYmd(readInvoiceText(invoices[0], ["tdlap", "TDLAP"])) ?? new Date()
  const details = invoices.flatMap((invoice, index) => {
    const date = normalizeYmd(readInvoiceText(invoice, ["tdlap", "TDLAP"])) ?? firstDate
    const taxable = readInvoiceNumber(invoice, ["tgtcthue", "TGTCTHUE"])
    const vat = readInvoiceNumber(invoice, ["tgtthue", "TGTTHUE"])
    const currency = readInvoiceText(invoice, ["dvtte", "DVTTE"]) || "VND"
    const exchangeRate = readInvoiceNumber(invoice, ["tgia", "TGIA"]) || 1
    const isForeignCurrency = currency.toUpperCase() !== "VND"
    const taxableAmount = isForeignCurrency ? taxable * exchangeRate : taxable
    const vatAmount = isForeignCurrency ? vat * exchangeRate : vat
    const issuerName = readInvoiceText(invoice, ["nbten", "NBTEN"])
    const issuerAddress = readInvoiceText(invoice, ["nbdchi", "NBDCHI"])
    const issuerTaxCode = readInvoiceText(invoice, ["nbmst", "NBMST"])
    const partyName = invoiceType === "BUY" ? issuerName : readInvoiceText(invoice, ["nmten", "NMTEN"])
    const partyAddress = invoiceType === "BUY" ? issuerAddress : readInvoiceText(invoice, ["nmdchi", "NMDCHI"])
    const partyTaxCode = invoiceType === "BUY" ? issuerTaxCode : readInvoiceText(invoice, ["nmmst", "NMMST"])

    const sharedDetail = {
      CHIT_YMD: date,
      FC_TYPE: currency,
      FC_RATE: exchangeRate,
      CUSTOMER_NM_VIET: partyName,
      VAT_SERIAL_NO: readInvoiceText(invoice, ["khhdon", "KHHDON"]),
      VAT_CHIT_NO: readInvoiceText(invoice, ["shdon", "SHDON"]),
      VAT_CHIT_NO_2: getVatInvoiceKey(invoice),
      VAT_INVOICE_CD: readInvoiceText(invoice, ["khmshdon", "KHMSHDON"]),
      VAT_INVOICE_NM: readInvoiceText(invoice, ["khmshdon_ten", "KHMSHDON_TEN"]),
      VAT_COMPANY_ISSUE: issuerName,
      VAT_COMPANY_ISSUE_ADDRESS: issuerAddress,
      VAT_COMPANY_ISSUE_CD: issuerTaxCode,
      VAT_COMPANY_TAXCD: issuerTaxCode,
      VAT_PRODUCT_NM: partyName,
      VAT_ETC: readInvoiceText(invoice, ["GChu", "GCHU"]),
      VAT_YMD: date,
      UNDEFINE: [partyAddress, partyTaxCode].filter(Boolean).join(" | "),
    }

    const invoiceDescription = partyName
      ? `${formatVatInvoiceLabel(invoice)} - ${partyName}`
      : formatVatInvoiceLabel(invoice)

    return [
      {
        ...createDefaultChitDetail(index * 2 + 1, companyCd),
        ...sharedDetail,
        SORT: index * 2 + 1,
        AMOUNT: taxableAmount,
        FC_AMOUNT: taxable,
        VAT_TAXABLE_AMOUNT: taxableAmount,
        VAT_AMOUNT: 0,
        FO_VAT_AMOUNT: 0,
        DETAIL_DESCRIPTION_VIET: `${invoiceDescription} - Tiền hàng`,
      },
      {
        ...createDefaultChitDetail(index * 2 + 2, companyCd),
        ...sharedDetail,
        SORT: index * 2 + 2,
        AMOUNT: vatAmount,
        FC_AMOUNT: vat,
        VAT_TAXABLE_AMOUNT: 0,
        VAT_AMOUNT: vatAmount,
        FO_VAT_AMOUNT: isForeignCurrency ? vat : 0,
        DETAIL_DESCRIPTION_VIET: `${invoiceDescription} - Tiền thuế`,
      },
    ]
  })

  return {
    ...createDefaultChit(chitType, companyCd, userId),
    CHIT_YMD: firstDate,
    DESCRIPTION_VIET: invoices.length > 1
      ? `Chứng từ từ ${invoices.length} hóa đơn VAT`
      : `Chứng từ từ hóa đơn VAT ${formatVatInvoiceLabel(invoices[0])}`,
    NOTE: invoices.map(formatVatInvoiceLabel).join("; "),
    DETAILS: details,
    DETAIL_COUNT: details.length,
    AMOUNT: calculateChitAmount(details),
  }
}

function normalizeCustomerMatchText(value: unknown): string {
  return String(value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ")
}

export function findMatchingInvoiceCustomer(invoice: VatInvoiceRow, invoiceType: VatInvoiceType, customers: CustomerExt[]): CustomerExt | null {
  const taxCode = normalizeCustomerMatchText(readInvoiceText(invoice, invoiceType === "BUY"
    ? ["nbmst", "NBMST"]
    : ["nmmst", "NMMST"]))
  const name = normalizeCustomerMatchText(readInvoiceText(invoice, invoiceType === "BUY"
    ? ["nbten", "NBTEN"]
    : ["nmten", "NMTEN"]))
  const activeCustomers = customers.filter((customer) => !customer.ISDEL && Number(customer.CUSTOMER_ID) > 0)
  if (taxCode) {
    const taxMatches = activeCustomers.filter((customer) => normalizeCustomerMatchText(customer.TAX_CD) === taxCode)
    if (taxMatches.length === 1) return taxMatches[0]
  }
  if (!name) return null
  const nameMatches = activeCustomers.filter((customer) => [customer.CUSTOMER_NM_VIET, customer.BUYER_NM]
    .some((candidate) => normalizeCustomerMatchText(candidate) === name))
  return nameMatches.length === 1 ? nameMatches[0] : null
}

export function applyInvoiceCustomerMatch(record: ChitInfo, invoices: VatInvoiceRow[], invoiceType: VatInvoiceType, customers: CustomerExt[]): ChitInfo {
  if (customers.length === 0) return record
  const invoicesByKey = new Map(invoices.map((invoice) => [getVatInvoiceKey(invoice), invoice]))
  let changed = false
  const details = record.DETAILS.map((detail) => {
    if (Number(detail.CUSTOMER_ID) > 0) return detail
    const invoice = invoicesByKey.get(String(detail.VAT_CHIT_NO_2 ?? "").trim())
    if (!invoice) return detail
    const customer = findMatchingInvoiceCustomer(invoice, invoiceType, customers)
    if (!customer) return detail
    changed = true
    return {
      ...detail,
      CUSTOMER_ID: customer.CUSTOMER_ID,
      CUSTOMER_CD: customer.CUSTOMER_CD,
      CUSTOMER_NM_VIET: customer.CUSTOMER_NM_VIET,
      CUSTOMER_NM_ENG: customer.CUSTOMER_NM_ENG,
      CUSTOMER_NM_KOR: customer.CUSTOMER_NM_KOR,
      CUSTOMER_NM_CHINA: customer.CUSTOMER_NM_CHINA,
    }
  })
  return changed ? { ...record, DETAILS: details } : record
}

export function createVatVoucherDrafts(
  invoices: VatInvoiceRow[],
  invoiceType: VatInvoiceType,
  voucherType: VatVoucherType = getDefaultVatVoucherType(invoiceType),
): VatVoucherDraft[] {
  return invoices.map((invoice) => ({
    key: getVatInvoiceKey(invoice),
    invoices: [invoice],
    record: buildVatVoucherDraft([invoice], invoiceType, voucherType),
    edited: false,
    linkedInvoiceKeys: [],
  }))
}
