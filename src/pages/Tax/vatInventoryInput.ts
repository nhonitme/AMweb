import type { ChitDetail, ChitInfo, InventoryInputApi, InventoryInputLine } from "@/types/voucher"
import type { Product } from "@/types/product"
import type { StoreInfo } from "@/types/store"
import { createInventoryVoucher } from "@/api/inventoryVoucherApi"
import { getInventoryInputs } from "@/api/inventoryLinkApi"
import { createDefaultInventoryInputLine, createDefaultInventoryVoucher, getInventoryLedger, mapInventoryVoucherToApiPayload } from "@/pages/Inventory/inventoryVoucherModel"
import { formatVatInvoiceLabel, getVatInvoiceKey, type VatInvoiceRow } from "./vatInvoiceVoucherDraft"
import type { VatInvoiceInventoryJsonRow, VatInvoiceInventoryMapping } from "./VatInvoiceInventoryJsonGrid"

const normalize = (value: unknown) => String(value ?? "").trim().toLocaleLowerCase().replace(/\s+/g, " ")

export function getVatInventoryInputSource(record: ChitInfo, invoice: VatInvoiceRow): ChitDetail {
  const key = getVatInvoiceKey(invoice).trim()
  const matches = record.DETAILS.filter((detail) => !detail.ISDEL && String(detail.VAT_CHIT_NO_2 ?? "").trim() === key
    && !Number(detail.VAT_AMOUNT) && !Number(detail.FO_VAT_AMOUNT)
    && !String(detail.DETAIL_DESCRIPTION_VIET).trim().endsWith("- Tiền thuế"))
  if (matches.length !== 1) throw new Error(`Hóa đơn ${formatVatInvoiceLabel(invoice)}: cần đúng một dòng tiền hàng để liên kết nhập kho.`)
  return matches[0]
}

export function matchVatInventoryProduct(row: VatInvoiceInventoryJsonRow, products: Product[]): Product | null {
  if (!normalize(row.name) || !normalize(row.unit)) return null
  const matches = products.filter((product) => normalize(product.PRODUCT_NM_VIET) === normalize(row.name)
    && [product.UNIT_CD, product.UNIT_NM].some((unit) => normalize(unit) === normalize(row.unit)))
  return matches.length === 1 ? matches[0] : null
}

export function defaultVatInventoryMapping(row: VatInvoiceInventoryJsonRow, products: Product[], stores: StoreInfo[]): VatInvoiceInventoryMapping {
  const product = matchVatInventoryProduct(row, products)
  return { includeInStock: true, product, store: stores.find((store) => store.STORE_ID === product?.STORE_ID) ?? null }
}

function number(value: unknown): number {
  return value == null || value === "" ? NaN : Number(value)
}

export function validateVatInventoryInput(rows: VatInvoiceInventoryJsonRow[], mappings: Record<string, VatInvoiceInventoryMapping>): void {
  if (!rows.length) throw new Error("Chưa có chi tiết hàng hóa để lập nhập kho. Tải lại hoặc tắt tùy chọn nếu hóa đơn không theo dõi kho.")
  for (const row of rows) {
    const mapping = mappings[row.key]
    if (mapping?.includeInStock === false) continue
    if (!mapping?.product || !mapping.store || !(Number(mapping.product.PRODUCT_ID) > 0) || !(Number(mapping.store.STORE_ID) > 0)
      || !String(mapping.product.PRODUCT_CD ?? "").trim() || !String(mapping.store.STORE_CD ?? "").trim()
      || !normalize(row.unit) || ![mapping.product.UNIT_CD, mapping.product.UNIT_NM].some((unit) => normalize(unit) === normalize(row.unit))
      || !Number.isFinite(number(row.quantity)) || number(row.quantity) <= 0) {
      throw new Error(`Dòng ${String(row.lineNo)}: chọn mã hàng, kho, đơn vị tính và số lượng dương hợp lệ trước khi nhập kho.`)
    }
    const amount = row.amount == null || row.amount === "" ? number(row.quantity) * number(row.unitPrice) : number(row.amount)
    if (!Number.isFinite(amount) || amount < 0 || (row.unitPrice != null && row.unitPrice !== "" && (!Number.isFinite(number(row.unitPrice)) || number(row.unitPrice) < 0))) {
      throw new Error(`Dòng ${String(row.lineNo)}: giá trị nhập kho không hợp lệ; chưa hỗ trợ dòng điều chỉnh âm.`)
    }
  }
}

export function buildVatInventoryInputLines(
  rows: VatInvoiceInventoryJsonRow[], mappings: Record<string, VatInvoiceInventoryMapping>,
  record: ChitInfo, invoice: VatInvoiceRow, source: ChitDetail,
): InventoryInputLine[] {
  validateVatInventoryInput(rows, mappings)
  const currency = String(invoice.dvtte || "VND").trim().toUpperCase()
  const rate = currency === "VND" ? 1 : Number(invoice.TGia)
  if (!Number.isFinite(rate) || rate <= 0) throw new Error("Nhập tỷ giá dương hợp lệ trước khi lập nhập kho.")
  return rows.filter((row) => mappings[row.key]?.includeInStock).map((row, index) => {
    const { product, store } = mappings[row.key]
    const quantity = number(row.quantity)
    // GDT thtien is the source line amount before VAT. Preserve an explicit zero.
    const amount = row.amount == null || row.amount === "" ? quantity * number(row.unitPrice) : number(row.amount)
    const unitPrice = row.unitPrice == null || row.unitPrice === "" ? amount / quantity : number(row.unitPrice)
    return {
      ...createDefaultInventoryInputLine(record.COMPANY_CD, record.CHIT_YMD, index + 1),
      PRODUCT_ID: product!.PRODUCT_ID, PRODUCT_CD: product!.PRODUCT_CD,
      PRODUCT_NM_VIET: product!.PRODUCT_NM_VIET,
      STORE_ID: store!.STORE_ID, STORE_CD: store!.STORE_CD, STORE_NM_VIET: store!.STORE_NM_VIET,
      UNIT_ID: product!.UNIT_ID ?? null, UNIT_CD: product!.UNIT_CD ?? "", UNIT_NM_VIET: product!.UNIT_NM ?? "",
      QUANTITY: quantity, FC_TYPE: currency, EXCHANGE_RATES: rate,
      UNIT_PRICE_FC: unitPrice, UNIT_PRICE_CC: unitPrice * rate,
      AMOUNT_FC: amount, AMOUNT_CC: amount * rate,
      SUMMARY: String(row.name ?? "").trim(),
      CHITDETAIL_ID: source.CHITDETAIL_ID, CHITDETAIL_CD: source.CHITDETAIL_CD,
    }
  })
}

function sameInputs(existing: InventoryInputApi[], expected: InventoryInputLine[]): boolean {
  const remaining = [...existing]
  const equal = (a: unknown, b: number | null) => a != null && b != null && Number.isFinite(Number(a))
    && Math.abs(Number(a) - b) <= Math.max(1e-8, Number.EPSILON * 16 * Math.max(1, Math.abs(b)))
  const dateKey = (value: unknown) => value instanceof Date
    ? `${value.getFullYear()}-${String(value.getMonth() + 1).padStart(2, "0")}-${String(value.getDate()).padStart(2, "0")}`
    : String(value ?? "").slice(0, 10)
  for (const line of expected) {
    const index = remaining.findIndex((item) => Number(item.PRODUCT_ID) === Number(line.PRODUCT_ID)
      && Number(item.STORE_ID) === Number(line.STORE_ID) && String(item.UNIT_CD ?? "") === line.UNIT_CD
      && String(item.FC_TYPE ?? "").toUpperCase() === line.FC_TYPE.toUpperCase()
      && equal(item.QUANTITY, line.QUANTITY) && equal(item.AMOUNT_FC, line.AMOUNT_FC)
      && equal(item.AMOUNT_CC, line.AMOUNT_CC) && equal(item.EXCHANGE_RATES, line.EXCHANGE_RATES)
      && equal(item.UNIT_PRICE_CC, line.UNIT_PRICE_CC) && equal(item.UNIT_PRICE_FC, line.UNIT_PRICE_FC)
      && dateKey(item.INVENTORY_YMD) === dateKey(line.INVENTORY_YMD))
    if (index < 0) return false
    remaining.splice(index, 1)
  }
  return remaining.length === 0
}

export async function saveVatInventoryInput(record: ChitInfo, invoice: VatInvoiceRow, source: ChitDetail, lines: InventoryInputLine[]): Promise<void> {
  if (!lines.length) return
  if (!(Number(source.CHITDETAIL_ID) > 0)) throw new Error("Không xác định được dòng nguồn để lập nhập kho.")
  const existing = (await getInventoryInputs([Number(source.CHITDETAIL_ID)]))
    .filter((line) => Number(line.INVENTORY_ID) > 0 && Number(line.ISDEL ?? 0) !== 1)
  if (existing.length) {
    if (sameInputs(existing, lines)) return
    throw new Error(`Hóa đơn ${formatVatInvoiceLabel(invoice)} đã có nhập kho khác bản nháp. Kiểm tra phiếu liên kết trước khi tiếp tục.`)
  }
  const inventory = createDefaultInventoryVoucher("IR", record.COMPANY_CD)
  inventory.CHIT_YMD = record.CHIT_YMD
  inventory.DESCRIPTION_VIET = record.DESCRIPTION_VIET
  inventory.REMARK = formatVatInvoiceLabel(invoice)
  inventory.NOTE = formatVatInvoiceLabel(invoice)
  inventory.CUSTOMER_ID = source.CUSTOMER_ID
  inventory.CUSTOMER_CD = source.CUSTOMER_CD
  inventory.INPUTS = lines
  inventory.TOTAL_QTY = lines.reduce((sum, line) => sum + Number(line.QUANTITY ?? 0), 0)
  const result = await createInventoryVoucher(getInventoryLedger("IR"), "IR", mapInventoryVoucherToApiPayload(inventory))
  if (!(Number(result.data?.CHIT_ID) > 0)) throw new Error("Chưa nhận được xác nhận lưu phiếu nhập kho. Bấm lưu lại để kiểm tra liên kết.")
}
