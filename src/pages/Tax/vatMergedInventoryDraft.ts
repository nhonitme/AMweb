import { fetchProductLookup, fetchStoreLookup } from "@/api/lookupApi"
import { getGdtInvoiceDetail } from "@/api/gdtImportApi"
import { createDefaultInventoryInputLine, createDefaultInventoryOutputLine, validateInventoryVoucherDetails } from "@/pages/Inventory/inventoryVoucherModel"
import type { ChitDetail, ChitInfo, InventoryVoucher } from "@/types/voucher"
import { mapVatInvoiceInventoryJsonRows } from "./VatInvoiceInventoryJsonGrid"
import { formatVatInvoiceLabel, getVatInvoiceKey, type VatInvoiceRow, type VatInvoiceType } from "./vatInvoiceVoucherDraft"

const text = (value: unknown) => String(value ?? "").trim()
const matchText = (value: unknown) => text(value).toLocaleLowerCase().replace(/\s+/g, " ")
const number = (value: unknown) => {
  const result = Number(text(value).replace(/,/g, ""))
  if (!Number.isFinite(result)) throw new Error(`Giá trị số không hợp lệ: ${text(value)}`)
  return result
}

export async function prepareVatMergedInventoryDraft(value: InventoryVoucher, row: ChitDetail, source: ChitInfo, invoice: VatInvoiceRow, invoiceType: VatInvoiceType): Promise<InventoryVoucher> {
  const [payload, products, stores] = await Promise.all([
    getGdtInvoiceDetail(invoiceType, getVatInvoiceKey(invoice)), fetchProductLookup(), fetchStoreLookup(),
  ])
  const rows = mapVatInvoiceInventoryJsonRows(payload)
  if (!rows.length) throw new Error(`Hóa đơn ${formatVatInvoiceLabel(invoice)} chưa có chi tiết hàng hóa để lập phiếu kho.`)
  const currency = text(row.FC_TYPE) || "VND"
  const rate = currency.toUpperCase() === "VND" ? 1 : number(row.FC_RATE)
  if (rate <= 0) throw new Error(`Hóa đơn ${formatVatInvoiceLabel(invoice)}: tỷ giá phải lớn hơn 0.`)
  const lines = rows.map((item, index) => {
    const matches = products.filter((product) => matchText(product.PRODUCT_NM_VIET) === matchText(item.name)
      && Boolean(matchText(item.unit)) && [product.UNIT_CD, product.UNIT_NM].some((unit) => matchText(unit) === matchText(item.unit)))
    const product = matches.length === 1 ? matches[0] : undefined
    const store = product?.STORE_ID ? stores.find((entry) => entry.STORE_ID === product.STORE_ID) : undefined
    const quantity = number(item.quantity)
    const price = number(item.unitPrice)
    const amount = item.amount == null || item.amount === "" ? quantity * price : number(item.amount)
    return {
      ...(invoiceType === "BUY" ? createDefaultInventoryInputLine(source.COMPANY_CD, source.CHIT_YMD, index + 1) : createDefaultInventoryOutputLine(source.COMPANY_CD, source.CHIT_YMD, index + 1)),
      PRODUCT_ID: product?.PRODUCT_ID ?? null,
      PRODUCT_CD: product?.PRODUCT_CD ?? "",
      PRODUCT_NM_VIET: product?.PRODUCT_NM_VIET || text(item.name),
      PRODUCT_NM_ENG: product?.PRODUCT_NM_ENG ?? "",
      PRODUCT_NM_KOR: product?.PRODUCT_NM_KOR ?? "",
      PRODUCT_NM_CHINA: product?.PRODUCT_NM_CHINA ?? "",
      UNIT_ID: product?.UNIT_ID ?? null,
      UNIT_CD: product?.UNIT_CD ?? "",
      UNIT_NM_VIET: product?.UNIT_NM || text(item.unit),
      STORE_ID: store?.STORE_ID ?? null,
      STORE_CD: store?.STORE_CD ?? "",
      STORE_NM_VIET: store?.STORE_NM_VIET ?? "",
      QUANTITY: quantity,
      FC_TYPE: currency,
      EXCHANGE_RATES: rate,
      UNIT_PRICE_CC: invoiceType === "BUY" ? price * rate : 0,
      UNIT_PRICE_FC: invoiceType === "BUY" ? price : 0,
      AMOUNT_CC: invoiceType === "BUY" ? amount * rate : 0,
      AMOUNT_FC: invoiceType === "BUY" ? amount : 0,
      REVENUE_UNIT_PRICE_CC: invoiceType === "SELL" ? price * rate : 0,
      REVENUE_UNIT_PRICE_FC: invoiceType === "SELL" ? price : 0,
      REVENUE_AMOUNT_CC: invoiceType === "SELL" ? amount * rate : 0,
      REVENUE_AMOUNT_FC: invoiceType === "SELL" ? amount : 0,
      SUMMARY: text(item.name),
      CHITDETAIL_ID: row.CHITDETAIL_ID,
      CHITDETAIL_CD: row.CHITDETAIL_CD,
    }
  })
  return {
    ...value,
    CUSTOMER_ID: row.CUSTOMER_ID ?? null,
    CUSTOMER_CD: text(row.CUSTOMER_CD),
    PAYER_INFO: text(row.CUSTOMER_NM_VIET) || text(invoiceType === "BUY" ? invoice.nbten : invoice.nmten),
    NOTE: formatVatInvoiceLabel(invoice),
    INPUTS: invoiceType === "BUY" ? lines as InventoryVoucher["INPUTS"] : [],
    OUTPUTS: invoiceType === "SELL" ? lines as InventoryVoucher["OUTPUTS"] : [],
    TOTAL_QTY: lines.reduce((sum, line) => sum + line.QUANTITY, 0),
    AMOUNT: invoiceType === "BUY" ? lines.reduce((sum, line) => sum + line.AMOUNT_CC, 0) : 0,
  }
}

export function validateVatMergedInventoryDraft(value: InventoryVoucher): void {
  const prefix = `Hóa đơn ${value.NOTE}: `
  if (!(Number(value.CUSTOMER_ID) > 0) || !text(value.CUSTOMER_CD)) {
    throw new Error(`${prefix}${value.PAYER_INFO}: chưa có mã khách hàng/nhà cung cấp. Vui lòng chọn mã trước khi lưu.`)
  }
  const lines = (value.CHIT_TYPE === "IR" ? value.INPUTS : value.OUTPUTS).filter((line) => !line.ISDEL)
  lines.forEach((line, index) => {
    const label = `${prefix}dòng ${index + 1} — ${line.SUMMARY || line.PRODUCT_NM_VIET || ""}: `
    if (!(Number(line.PRODUCT_ID) > 0) || !text(line.PRODUCT_CD)) throw new Error(label + "chưa có mã hàng. Vui lòng chọn mã trước khi lưu.")
    if (!(Number(line.STORE_ID) > 0) || !text(line.STORE_CD)) throw new Error(label + "chưa có mã kho. Vui lòng chọn mã trước khi lưu.")
    if (!Number.isFinite(Number(line.QUANTITY)) || Number(line.QUANTITY) <= 0) throw new Error(label + "số lượng phải lớn hơn 0.")
  })
  try {
    validateInventoryVoucherDetails(value)
  } catch (error) {
    throw new Error(prefix + (error instanceof Error ? error.message : String(error)))
  }
}
