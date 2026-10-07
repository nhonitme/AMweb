export type EInvoiceDetailExcelTranslate = (key: string, fallback: string) => string

export type EInvoiceDetailExcelFormKind = "default" | "sales" | "pxk"

export type EInvoiceDetailExcelColumn = {
  key: string
  fallback: string
  required?: boolean
  includeInTemplate?: boolean
  explanationLookup?: "productCode" | "productName" | "vat" | "tchat"
  excludeFromForms?: readonly EInvoiceDetailExcelFormKind[]
  extraAliases?: readonly string[]
}

function resolveEInvoiceFormNumber(khmsHDON: string | null | undefined): number | null {
  const match = String(khmsHDON ?? "").trim().match(/^(\d+)/)
  if (!match) {
    return null
  }

  const parsed = Number(match[1])
  return Number.isFinite(parsed) ? parsed : null
}

export function resolveEInvoiceDetailExcelFormKind(khmsHDON: string | null | undefined): EInvoiceDetailExcelFormKind {
  const formNo = resolveEInvoiceFormNumber(khmsHDON)
  if (formNo === 6) {
    return "pxk"
  }

  if (formNo === 2) {
    return "sales"
  }

  return "default"
}

export function isEInvoiceDetailExcelColumnInForm(
  column: EInvoiceDetailExcelColumn,
  formKind: EInvoiceDetailExcelFormKind,
): boolean {
  if (column.includeInTemplate === false) {
    return false
  }

  return !(column.excludeFromForms?.includes(formKind) ?? false)
}

export function getEInvoiceDetailExcelColumnsForForm(formKind: EInvoiceDetailExcelFormKind): EInvoiceDetailExcelColumn[] {
  return EINVOICE_DETAIL_EXCEL_COLUMNS.filter((column) => isEInvoiceDetailExcelColumnInForm(column, formKind))
}

export function getEInvoiceDetailExcelTemplateFileSuffix(formKind: EInvoiceDetailExcelFormKind): string {
  if (formKind === "pxk") {
    return "PXK"
  }

  if (formKind === "sales") {
    return "Sales"
  }

  return "Detail"
}

export const EINVOICE_DETAIL_EXCEL_SHEET_NAME = "DETAIL"

export const EINVOICE_DETAIL_EXCEL_COLUMNS: readonly EInvoiceDetailExcelColumn[] = [
  { key: "MHHDVU", fallback: "Item code", explanationLookup: "productCode", extraAliases: ["MHHDVu", "Ma hang", "Item code"] },
  { key: "THHDVU", fallback: "Item name", required: true, explanationLookup: "productName", extraAliases: ["THHDVu", "Ten hang", "Ten hang hoa", "Item name"] },
  { key: "DVTINH", fallback: "Unit", extraAliases: ["DVTinh", "Don vi tinh", "Unit"] },
  { key: "TCHAT", fallback: "Line type", explanationLookup: "tchat", extraAliases: ["TChat", "Tinh chat"] },
  { key: "SLUONG", fallback: "Quantity", extraAliases: ["SLuong", "So luong", "Quantity"] },
  { key: "DGIA", fallback: "Unit price", extraAliases: ["DGia", "Don gia", "Unit price"] },
  { key: "TLCKHAU", fallback: "Discount %", excludeFromForms: ["pxk"], extraAliases: ["TLCKhau", "Ty le chiet khau"] },
  { key: "STCKHAU", fallback: "Discount", excludeFromForms: ["pxk"], extraAliases: ["STCKhau", "Chiet khau", "Discount"] },
  { key: "THTIEN", fallback: "Amount", extraAliases: ["ThTien", "Thanh tien", "Amount"] },
  { key: "TSUAT", fallback: "Tax", explanationLookup: "vat", excludeFromForms: ["pxk", "sales"], extraAliases: ["TSuat", "Thue suat", "Tax"] },
  { key: "TTHUE", fallback: "Tax amount", excludeFromForms: ["pxk", "sales"], extraAliases: ["Tien thue dong"] },
  { key: "TSAUTHUE", fallback: "Amount after tax", excludeFromForms: ["pxk", "sales"], extraAliases: ["Thanh tien sau thue"] },
  { key: "LHHDTRUNG", fallback: "Loại HHDV đặc trưng", includeInTemplate: false, extraAliases: ["LHHDTrung", "Loai HHDV dac thu"] },
  { key: "SKHUNG", fallback: "Số khung (SKhung)", extraAliases: ["SKhung", "So khung"] },
  { key: "SMAY", fallback: "Số máy (SMay)", extraAliases: ["SMay", "So may"] },
  { key: "BKSPT_VCHUYEN", fallback: "Biển kiểm soát (BKSPTVChuyen)", extraAliases: ["BKSPTVChuyen", "Bien kiem soat"] },
  { key: "TNG_HANG", fallback: "Tên người gửi (TNGHang)", extraAliases: ["TNGHang", "Ten nguoi gui hang"] },
  { key: "DCNG_HANG", fallback: "Địa chỉ người gửi (DCNGHang)", extraAliases: ["DCNGHang", "Dia chi nguoi gui hang"] },
  { key: "MSTNG_HANG", fallback: "MST người gửi (MSTNGHang)", extraAliases: ["MSTNGHang", "MST nguoi gui hang"] },
  { key: "MDDNG_HANG", fallback: "Mã định danh người gửi (MDDNGHang)", extraAliases: ["MDDNGHang", "Ma dinh danh nguoi gui hang"] },
] as const

export function buildEInvoiceDetailExcelColumnAliases(
  column: EInvoiceDetailExcelColumn,
  translate?: EInvoiceDetailExcelTranslate,
): string[] {
  const aliases = new Set<string>([column.key, ...(column.extraAliases ?? [])])
  if (translate) {
    aliases.add(translate(column.key, column.fallback))
  }
  return Array.from(aliases)
}

export function buildEInvoiceDetailExcelTemplateHeaders(
  translate: EInvoiceDetailExcelTranslate,
  formKind: EInvoiceDetailExcelFormKind = "default",
): string[] {
  return getEInvoiceDetailExcelColumnsForForm(formKind).map((column) => {
    const label = translate(column.key, column.fallback)
    return column.required ? `${label} (*)` : label
  })
}

export function getEInvoiceDetailExcelColumnByKey(key: string): EInvoiceDetailExcelColumn | undefined {
  return EINVOICE_DETAIL_EXCEL_COLUMNS.find((column) => column.key === key)
}
