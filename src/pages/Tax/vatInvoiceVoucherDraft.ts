import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import { formatYmdForDisplay, normalizeYmd } from "@/pages/Accounting/accountingDateUtils"
import {
  calculateChitAmount,
  createDefaultChit,
  createDefaultChitDetail,
} from "@/pages/VoucherManagement/chitUtils"
import type { ChitInfo, ChitType, VatVoucherType } from "@/types/voucher"
export type { VatVoucherType } from "@/types/voucher"
import type { CustomerExt } from "@/types/customerExt"
import type { VatInOutInvoice } from "@/api/vatInOutApi"

export type VatInvoiceRow = VatInOutInvoice & { ROW_KEY: string }
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

export function getVatInvoiceKey(row: VatInvoiceRow): string {
  return row.mhdon
}

export function formatVatInvoiceLabel(row: VatInvoiceRow): string {
  const form = (row.khmshdon ?? "")
  const series = (row.khhdon ?? "")
  const number = (row.shdon ?? "")
  const date = normalizeYmd((row.tdlap ?? ""))
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
  const firstDate = normalizeYmd((invoices[0].tdlap ?? "")) ?? new Date()
  const details = invoices.flatMap((invoice, index) => {
    const date = normalizeYmd((invoice.tdlap ?? "")) ?? firstDate
    const taxable = (invoice.tgtcthue ?? 0)
    const vat = (invoice.tgtthue ?? 0)
    const currency = (invoice.dvtte ?? "") || "VND"
    const exchangeRate = (invoice.TGia ?? 0) || 1
    const isForeignCurrency = currency.toUpperCase() !== "VND"
    const taxableAmount = isForeignCurrency ? taxable * exchangeRate : taxable
    const vatAmount = isForeignCurrency ? vat * exchangeRate : vat
    const issuerName = (invoice.nbten ?? "")
    const issuerAddress = (invoice.nbdchi ?? "")
    const issuerTaxCode = (invoice.nbmst ?? "")
    const partyName = invoiceType === "BUY" ? issuerName : (invoice.nmten ?? "")
    const partyAddress = invoiceType === "BUY" ? issuerAddress : (invoice.nmdchi ?? "")
    const partyTaxCode = invoiceType === "BUY" ? issuerTaxCode : (invoice.nmmst ?? "")

    const sharedDetail = {
      CHIT_YMD: date,
      FC_TYPE: currency,
      FC_RATE: exchangeRate,
      CUSTOMER_NM_VIET: partyName,
      VAT_SERIAL_NO: (invoice.khhdon ?? ""),
      VAT_CHIT_NO: (invoice.shdon ?? ""),
      VAT_CHIT_NO_2: getVatInvoiceKey(invoice),
      VAT_INVOICE_CD: (invoice.khmshdon ?? ""),
      VAT_INVOICE_NM: (invoice.khmshdon_ten ?? ""),
      VAT_COMPANY_ISSUE: issuerName,
      VAT_COMPANY_ISSUE_ADDRESS: issuerAddress,
      VAT_COMPANY_ISSUE_CD: issuerTaxCode,
      VAT_COMPANY_TAXCD: issuerTaxCode,
      VAT_PRODUCT_NM: partyName,
      VAT_ETC: (invoice.GChu ?? ""),
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
  const taxCode = normalizeCustomerMatchText(invoiceType === "BUY" ? invoice.nbmst : invoice.nmmst)
  const name = normalizeCustomerMatchText(invoiceType === "BUY" ? invoice.nbten : invoice.nmten)
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


