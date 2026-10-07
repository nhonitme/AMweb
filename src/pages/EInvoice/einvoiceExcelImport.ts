import * as XLSX from "xlsx"

import { DEFAULT_CURRENCY_CODE, isForeignCurrencyCode, normalizeCurrencyCode } from "@/lib/currency"
import type { EInvoice, EInvoiceDetail, EInvoiceSeller } from "@/types/einvoice"
import {
  applyEInvoiceDetailSpecialLhhdtrung,
  applySellerToEInvoice,
  createDefaultEInvoice,
  createDefaultEInvoiceDetail,
  createDefaultEInvoiceDetailSpecial,
  findEInvoiceSeller,
  findEInvoiceSellerById,
  findEInvoiceSellerByXslId,
  hasEInvoiceDetailSpecialData,
  recalculateInvoiceTotals,
  renumberEInvoiceDetails,
} from "./einvoiceModel"

type ExcelCellValue = string | number | boolean | Date | null | undefined
type ExcelRecord = Record<string, ExcelCellValue>
type EInvoiceStringField =
  | "THDON"
  | "KHMSHDON"
  | "KHHDON"
  | "MHSO"
  | "SBKE"
  | "DVTTE"
  | "HTTTOAN"
  | "MSTTCGP"
  | "NMUA_TEN"
  | "NMUA_MST"
  | "NMUA_MDVQHNSACH"
  | "NMUA_DCHI"
  | "NMUA_MKHANG"
  | "NMUA_SDTHOAI"
  | "NMUA_CCCDAN"
  | "NMUA_SHCHIEU"
  | "NMUA_DCTDTU"
  | "NMUA_HVTNMHANG"
  | "NMUA_STKNHANG"
  | "NMUA_TNHANG"
  | "TGTTTBCHU"
  | "DLQRCODE"
  | "MCCQT"
  | "MTRACUU"
  | "MTDIEP"
  | "MGDDTu"
  | "TAX_SUMMARY_JSON"
  | "FEE_JSON"
  | "EXTRA_JSON"
type EInvoiceNumberField =
  | "HDCTTCHINH"
  | "TGIA"
  | "TGTCTHUE"
  | "TGTKCTHUE"
  | "TGTTTHUE"
  | "TTCKTMAI"
  | "TGTKHAC"
  | "TGTTTBSO"
  | "TGTCTHUE_VND"
  | "TGTKCTHUE_VND"
  | "TGTTTHUE_VND"
  | "TTCKTMAI_VND"
  | "TGTKHAC_VND"
  | "TGTTTBSO_VND"
type EInvoiceDetailStringField = "MHHDVU" | "THHDVU" | "DVTINH" | "TSUAT" | "EXTRA_JSON"
type EInvoiceDetailNumberField = "TCHAT" | "SLUONG" | "DGIA" | "TLCKHAU" | "STCKHAU" | "THTIEN" | "TTHUE" | "TSAUTHUE" | "DGIA_VND" | "STCKHAU_VND" | "THTIEN_VND" | "TTHUE_VND" | "TSAUTHUE_VND" | "LHHDTRUNG"

export interface EInvoiceExcelImportResult {
  invoices: EInvoice[]
  sourceRows: number
}

const headerStringAliases: Array<[EInvoiceStringField, string[]]> = [
  ["THDON", ["THDON", "THDon", "Tên hóa đơn", "Ten hoa don"]],
  ["KHMSHDON", ["KHMSHDON", "KHMSHDon", "Ký hiệu mẫu số", "Ky hieu mau so"]],
  ["KHHDON", ["KHHDON", "KHHDon", "Ký hiệu hóa đơn", "Ky hieu hoa don"]],
  ["MHSO", ["MHSO", "MHSo", "Mã hồ sơ", "Ma ho so"]],
  ["SBKE", ["SBKE", "SBKe", "Số bảng kê", "So bang ke"]],
  ["DVTTE", ["DVTTE", "DVTTe", "Tiền tệ", "Tien te", "Currency"]],
  ["HTTTOAN", ["HTTTOAN", "HTTToan", "Hình thức thanh toán", "Hinh thuc thanh toan"]],
  ["MSTTCGP", ["MSTTCGP", "MST TCGP"]],
  ["NMUA_TEN", ["NMUA_TEN", "NMua_Ten", "Tên người mua", "Ten nguoi mua", "Buyer name"]],
  ["NMUA_MST", ["NMUA_MST", "MST người mua", "MST nguoi mua", "Buyer tax code"]],
  ["NMUA_MDVQHNSACH", ["NMUA_MDVQHNSACH", "MDVQHNSach"]],
  ["NMUA_DCHI", ["NMUA_DCHI", "Địa chỉ người mua", "Dia chi nguoi mua", "Buyer address"]],
  ["NMUA_MKHANG", ["NMUA_MKHANG", "Mã khách hàng", "Ma khach hang", "Customer code"]],
  ["NMUA_SDTHOAI", ["NMUA_SDTHOAI", "Số điện thoại người mua", "So dien thoai nguoi mua"]],
  ["NMUA_CCCDAN", ["NMUA_CCCDAN", "CCCDan", "CCCD"]],
  ["NMUA_SHCHIEU", ["NMUA_SHCHIEU", "SHChieu", "Hộ chiếu", "Ho chieu"]],
  ["NMUA_DCTDTU", ["NMUA_DCTDTU", "Email người mua", "Email nguoi mua"]],
  ["NMUA_HVTNMHANG", ["NMUA_HVTNMHANG", "HVTNMHang", "Người mua hàng", "Nguoi mua hang"]],
  ["NMUA_STKNHANG", ["NMUA_STKNHANG", "STKNHang", "Số tài khoản người mua", "So tai khoan nguoi mua"]],
  ["NMUA_TNHANG", ["NMUA_TNHANG", "TNHang", "Ngân hàng người mua", "Ngan hang nguoi mua"]],
  ["TGTTTBCHU", ["TGTTTBCHU", "TgTTTBChu", "Tổng tiền bằng chữ", "Tong tien bang chu"]],
  ["DLQRCODE", ["DLQRCODE", "DLQRCode", "QR Code"]],
  ["MCCQT", ["MCCQT", "Mã CQT", "Ma CQT"]],
  ["MTRACUU", ["MTRACUU", "MaTraCuu", "Mã tra cứu", "Ma tra cuu", "Mã tra cứu hóa đơn", "Ma tra cuu hoa don"]],
  ["MTDIEP", ["MTDIEP", "Mã thông điệp", "Ma thong diep"]],
  ["MGDDTu", ["MGDDTu", "MGDDTU", "Mã giao dịch", "Ma giao dich"]],
  ["TAX_SUMMARY_JSON", ["TAX_SUMMARY_JSON"]],
  ["FEE_JSON", ["FEE_JSON"]],
  ["EXTRA_JSON", ["EXTRA_JSON", "TTKhac"]],
]

const headerNumberAliases: Array<[EInvoiceNumberField, string[]]> = [
  ["HDCTTCHINH", ["HDCTTCHINH", "HDCTTChinh"]],
  ["TGIA", ["TGIA", "TGia", "Tỷ giá", "Ty gia", "Rate"]],
  ["TGTCTHUE", ["TGTCTHUE", "TgTCThue", "Tổng trước thuế", "Tong truoc thue"]],
  ["TGTKCTHUE", ["TGTKCTHUE", "TGTKCThue"]],
  ["TGTTTHUE", ["TGTTTHUE", "TgTThue", "Tiền thuế", "Tien thue"]],
  ["TTCKTMAI", ["TTCKTMAI", "TTCKTMai", "Chiết khấu thương mại", "Chiet khau thuong mai"]],
  ["TGTKHAC", ["TGTKHAC", "TGTKhac"]],
  ["TGTTTBSO", ["TGTTTBSO", "TgTTTBSo", "Tổng thanh toán", "Tong thanh toan"]],
  ["TGTCTHUE_VND", ["TGTCTHUE_VND"]],
  ["TGTKCTHUE_VND", ["TGTKCTHUE_VND"]],
  ["TGTTTHUE_VND", ["TGTTTHUE_VND"]],
  ["TTCKTMAI_VND", ["TTCKTMAI_VND"]],
  ["TGTKHAC_VND", ["TGTKHAC_VND"]],
  ["TGTTTBSO_VND", ["TGTTTBSO_VND"]],
]

const detailStringAliases: Array<[EInvoiceDetailStringField, string[]]> = [
  ["MHHDVU", ["MHHDVU", "MHHDVu", "Mã hàng", "Ma hang", "Item code"]],
  ["THHDVU", ["THHDVU", "THHDVu", "Tên hàng", "Ten hang", "Tên hàng hóa", "Ten hang hoa", "Item name"]],
  ["DVTINH", ["DVTINH", "DVTinh", "Đơn vị tính", "Don vi tinh", "Unit"]],
  ["TSUAT", ["TSUAT", "TSuat", "Thuế suất", "Thue suat", "Tax"]],
  ["EXTRA_JSON", ["EXTRA_JSON", "TTKhac dòng", "TTKhac dong"]],
]

const detailSpecialStringAliases: Array<[keyof ReturnType<typeof createDefaultEInvoiceDetailSpecial>, string[]]> = [
  ["SKHUNG", ["SKHUNG", "SKhung", "Số khung", "So khung"]],
  ["SMAY", ["SMAY", "SMay", "Số máy", "So may"]],
  ["BKSPT_VCHUYEN", ["BKSPT_VCHUYEN", "BKSPTVChuyen", "Biển kiểm soát", "Bien kiem soat"]],
  ["TNG_HANG", ["TNG_HANG", "TNGHang", "Tên người gửi hàng", "Ten nguoi gui hang"]],
  ["DCNG_HANG", ["DCNG_HANG", "DCNGHang", "Địa chỉ người gửi hàng", "Dia chi nguoi gui hang"]],
  ["MSTNG_HANG", ["MSTNG_HANG", "MSTNGHang", "MST người gửi hàng", "MST nguoi gui hang"]],
  ["MDDNG_HANG", ["MDDNG_HANG", "MDDNGHang", "Mã định danh người gửi hàng", "Ma dinh danh nguoi gui hang"]],
]

const detailNumberAliases: Array<[EInvoiceDetailNumberField, string[]]> = [
  ["TCHAT", ["TCHAT", "TChat", "Tính chất", "Tinh chat"]],
  ["SLUONG", ["SLUONG", "SLuong", "Số lượng", "So luong", "Quantity"]],
  ["DGIA", ["DGIA", "DGia", "Đơn giá", "Don gia", "Unit price"]],
  ["TLCKHAU", ["TLCKHAU", "TLCKhau", "Tỷ lệ chiết khấu", "Ty le chiet khau"]],
  ["STCKHAU", ["STCKHAU", "STCKhau", "Chiết khấu", "Chiet khau", "Discount"]],
  ["THTIEN", ["THTIEN", "ThTien", "Thành tiền", "Thanh tien", "Amount"]],
  ["TTHUE", ["TTHUE", "Tien thue dong", "Tax amount"]],
  ["TSAUTHUE", ["TSAUTHUE", "Thanh tien sau thue", "Amount after tax"]],
  ["DGIA_VND", ["DGIA_VND"]],
  ["STCKHAU_VND", ["STCKHAU_VND"]],
  ["THTIEN_VND", ["THTIEN_VND"]],
  ["TTHUE_VND", ["TTHUE_VND"]],
  ["TSAUTHUE_VND", ["TSAUTHUE_VND"]],
  ["LHHDTRUNG", ["LHHDTRUNG", "LHHDTrung", "Loại HHDV đặc thù", "Loai HHDV dac thu"]],
]

const invoiceKeyAliases = ["INVOICE_KEY", "MA_HOA_DON", "MAHD", "KEY", "Invoice key"]
const sellerCodeAliases = ["SELLER_CD", "MA_NGUOI_BAN", "Mã người bán", "Ma nguoi ban"]

function normalizeHeader(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

function normalizeRecord(row: ExcelRecord): Record<string, ExcelCellValue> {
  return Object.entries(row).reduce<Record<string, ExcelCellValue>>((result, [key, value]) => {
    result[normalizeHeader(key)] = value
    return result
  }, {})
}

function readValue(record: Record<string, ExcelCellValue>, aliases: string[]): ExcelCellValue {
  for (const alias of aliases) {
    const value = record[normalizeHeader(alias)]
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      return value
    }
  }

  return undefined
}

function readText(record: Record<string, ExcelCellValue>, aliases: string[], fallback = ""): string {
  const value = readValue(record, aliases)
  if (value === undefined || value === null) {
    return fallback
  }

  return String(value).trim()
}

function readNumber(record: Record<string, ExcelCellValue>, aliases: string[], fallback = 0): number {
  const value = readValue(record, aliases)
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "boolean") {
    return value ? 1 : 0
  }

  const text = String(value ?? "").trim()
  if (!text) {
    return fallback
  }

  const compact = text.replace(/\s/g, "")
  const commaIndex = compact.lastIndexOf(",")
  const dotIndex = compact.lastIndexOf(".")
  const normalized =
    commaIndex >= 0 && dotIndex >= 0
      ? commaIndex > dotIndex
        ? compact.replace(/\./g, "").replace(",", ".")
        : compact.replace(/,/g, "")
      : commaIndex >= 0
        ? compact.replace(",", ".")
        : compact
  const parsed = Number(normalized)
  return Number.isFinite(parsed) ? parsed : fallback
}

function readNullableNumber(record: Record<string, ExcelCellValue>, aliases: string[]): number | null {
  const value = readValue(record, aliases)
  if (value === undefined || value === null || String(value).trim().length === 0) {
    return null
  }

  return readNumber(record, aliases, 0)
}

function formatDateParts(year: number, month: number, day: number): string {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`
}

function readDateText(record: Record<string, ExcelCellValue>, aliases: string[], fallback: string | null): string | null {
  const value = readValue(record, aliases)
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return formatDateParts(value.getFullYear(), value.getMonth() + 1, value.getDate())
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    const parsed = XLSX.SSF.parse_date_code(value)
    if (parsed) {
      return formatDateParts(parsed.y, parsed.m, parsed.d)
    }
  }

  const text = String(value ?? "").trim()
  if (!text) {
    return fallback
  }

  const isoMatch = text.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})/)
  if (isoMatch) {
    return formatDateParts(Number(isoMatch[1]), Number(isoMatch[2]), Number(isoMatch[3]))
  }

  const localMatch = text.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})/)
  if (localMatch) {
    return formatDateParts(Number(localMatch[3]), Number(localMatch[2]), Number(localMatch[1]))
  }

  return text.slice(0, 10)
}

function worksheetRows(sheet: XLSX.WorkSheet | undefined): ExcelRecord[] {
  if (!sheet) {
    return []
  }

  return XLSX.utils.sheet_to_json<ExcelRecord>(sheet, {
    defval: "",
    raw: true,
    blankrows: false,
  })
}

function hasRecordValue(record: Record<string, ExcelCellValue>, aliases: string[]): boolean {
  return readText(record, aliases).length > 0
}

function isDetailRecord(record: Record<string, ExcelCellValue>): boolean {
  return (
    hasRecordValue(record, ["THHDVU", "THHDVu", "Tên hàng", "Ten hang", "Item name"]) ||
    hasRecordValue(record, ["MHHDVU", "MHHDVu", "Mã hàng", "Ma hang", "Item code"]) ||
    hasRecordValue(record, ["SLUONG", "SLuong", "Số lượng", "So luong"]) ||
    hasRecordValue(record, ["DGIA", "DGia", "Đơn giá", "Don gia"])
  )
}

function readInvoiceGroupKey(record: Record<string, ExcelCellValue>, rowIndex: number): string {
  const explicitKey = readText(record, invoiceKeyAliases)
  if (explicitKey) {
    return explicitKey
  }

  const identity = [
    readText(record, ["MCCQT", "Mã CQT", "Ma CQT"]),
    readText(record, ["MTRACUU", "MaTraCuu", "Mã tra cứu", "Ma tra cuu", "Mã tra cứu hóa đơn", "Ma tra cuu hoa don"]),
    readText(record, ["KHMSHDON", "KHMSHDon"]),
    readText(record, ["KHHDON", "KHHDon"]),
    readText(record, ["SHDON", "SHDon", "Số hóa đơn", "So hoa don"]),
    readDateText(record, ["NLAP", "NLap", "Ngày lập", "Ngay lap"], ""),
    readText(record, ["NMUA_MST", "MST người mua", "MST nguoi mua"]),
  ]
    .filter((value) => String(value ?? "").trim().length > 0)
    .join("|")

  return identity || `ROW_${rowIndex + 1}`
}

function findSheetName(workbook: XLSX.WorkBook, aliases: string[]): string | null {
  const normalizedAliases = new Set(aliases.map(normalizeHeader))
  return workbook.SheetNames.find((name) => normalizedAliases.has(normalizeHeader(name))) ?? null
}

function findSellerForImport(invoice: EInvoice, record: Record<string, ExcelCellValue>, sellers: EInvoiceSeller[]): EInvoiceSeller | null {
  const xslId = readNumber(record, ["XSL_ID", "XSLID"], Number(invoice.XSL_ID ?? 0))
  const sellerId = readNumber(record, ["SELLER_ID", "SELLERID"], Number(invoice.SELLER_ID ?? 0))
  const sellerCode = readText(record, sellerCodeAliases)
  if (xslId > 0) {
    const seller = findEInvoiceSellerByXslId(sellers, xslId)
    if (seller) {
      return seller
    }
  }

  if (sellerId > 0) {
    const seller = findEInvoiceSellerById(sellers, sellerId)
    if (seller) {
      return seller
    }
  }

  if (sellerCode) {
    const seller = sellers.find((item) => String(item.SELLER_CD ?? "").trim().toUpperCase() === sellerCode.toUpperCase())
    if (seller) {
      return seller
    }
  }

  return findEInvoiceSeller(sellers, invoice.KHHDON, invoice.KHMSHDON)
}

function applyHeaderRecord(base: EInvoice, record: Record<string, ExcelCellValue>): EInvoice {
  const next: EInvoice = { ...base }

  for (const [field, aliases] of headerStringAliases) {
    const value = readText(record, aliases)
    if (value) {
      next[field] = value
    }
  }

  for (const [field, aliases] of headerNumberAliases) {
    const value = readNullableNumber(record, aliases)
    if (value !== null) {
      next[field] = value
    }
  }

  next.NBKE = readDateText(record, ["NBKE", "NBKe", "Ngày bảng kê", "Ngay bang ke"], next.NBKE)
  next.DVTTE = normalizeCurrencyCode(next.DVTTE) || DEFAULT_CURRENCY_CODE
  next.TGIA = isForeignCurrencyCode(next.DVTTE) ? Number(next.TGIA ?? 1) || 1 : 1

  return next
}

function createDetailFromRecord(
  record: Record<string, ExcelCellValue>,
  index: number,
  invoiceId: number,
  companyCd: string,
  rate: number,
  currencyCode: string,
): EInvoiceDetail {
  const detail = createDefaultEInvoiceDetail(index + 1, invoiceId, companyCd)

  for (const [field, aliases] of detailStringAliases) {
    const value = readText(record, aliases)
    if (value) {
      detail[field] = value
    }
  }

  for (const [field, aliases] of detailNumberAliases) {
    const value = readNullableNumber(record, aliases)
    if (value !== null) {
      if (field === "LHHDTRUNG") {
        continue
      }
      detail[field] = value
    }
  }

  const lhhdtrung = readNumber(record, ["LHHDTRUNG", "LHHDTrung"], 0)
  if (detail.TCHAT === 5 && lhhdtrung >= 1 && lhhdtrung <= 3) {
    let special = applyEInvoiceDetailSpecialLhhdtrung(
      createDefaultEInvoiceDetailSpecial(invoiceId, 0, companyCd),
      lhhdtrung,
    )

    for (const [field, aliases] of detailSpecialStringAliases) {
      const value = readText(record, aliases)
      if (value) {
        special[field] = value
      }
    }

    detail.SPECIAL = hasEInvoiceDetailSpecialData(special) ? special : null
  }

  return renumberEInvoiceDetails([detail], rate, currencyCode)[0]
}

function createInvoiceFromRecords(
  headerRow: ExcelRecord,
  detailRows: ExcelRecord[],
  companyCd: string,
  sellers: EInvoiceSeller[],
): EInvoice {
  const normalizedHeader = normalizeRecord(headerRow)
  const importedHeader = applyHeaderRecord(createDefaultEInvoice(companyCd), normalizedHeader)
  const seller = findSellerForImport(importedHeader, normalizedHeader, sellers)
  const withSeller = applySellerToEInvoice(importedHeader, seller)
  const details = detailRows
    .map(normalizeRecord)
    .filter(isDetailRecord)
    .map((record, index) =>
      createDetailFromRecord(record, index, withSeller.INVOICE_ID, companyCd, Number(withSeller.TGIA ?? 1), withSeller.DVTTE),
    )

  return recalculateInvoiceTotals({
    ...withSeller,
    COMPANY_CD: companyCd,
    SHDON: "",
    DETAILS: details.length > 0 ? renumberEInvoiceDetails(details, Number(withSeller.TGIA ?? 1), withSeller.DVTTE) : withSeller.DETAILS,
  })
}

function groupRows(rows: ExcelRecord[]): Array<{ headerRow: ExcelRecord; detailRows: ExcelRecord[] }> {
  const groups = new Map<string, { headerRow: ExcelRecord; detailRows: ExcelRecord[] }>()

  rows.forEach((row, index) => {
    const normalized = normalizeRecord(row)
    const key = readInvoiceGroupKey(normalized, index)
    const current = groups.get(key)
    if (current) {
      current.detailRows.push(row)
      return
    }

    groups.set(key, {
      headerRow: row,
      detailRows: [row],
    })
  })

  return Array.from(groups.values())
}

function groupHeaderDetailSheets(headerRows: ExcelRecord[], detailRows: ExcelRecord[]): Array<{ headerRow: ExcelRecord; detailRows: ExcelRecord[] }> {
  const detailGroups = new Map<string, ExcelRecord[]>()

  detailRows.forEach((row, index) => {
    const key = readInvoiceGroupKey(normalizeRecord(row), index)
    detailGroups.set(key, [...(detailGroups.get(key) ?? []), row])
  })

  const linkedKeys = new Set<string>()
  const groups = headerRows.map((row, index) => {
    const key = readInvoiceGroupKey(normalizeRecord(row), index)
    linkedKeys.add(key)
    return {
      headerRow: row,
      detailRows: detailGroups.get(key) ?? [],
    }
  })

  detailGroups.forEach((rows, key) => {
    if (!linkedKeys.has(key) && rows[0]) {
      groups.push({ headerRow: rows[0], detailRows: rows })
    }
  })

  return groups
}

export async function parseEInvoiceExcelFile(
  file: File,
  companyCd: string,
  sellers: EInvoiceSeller[],
): Promise<EInvoiceExcelImportResult> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const headerSheetName = findSheetName(workbook, ["INFO", "HEADER", "INVOICE", "EINVOICE_INFO", "HOA_DON", "HOADON"])
  const detailSheetName = findSheetName(workbook, ["DETAIL", "DETAILS", "EINVOICE_DETAIL", "CHI_TIET", "CHITIET", "DONG_HANG"])
  const firstSheetName = workbook.SheetNames[0]
  const headerRows = worksheetRows(workbook.Sheets[headerSheetName ?? firstSheetName])
  const detailRows = detailSheetName ? worksheetRows(workbook.Sheets[detailSheetName]) : []
  const groups = detailSheetName && detailSheetName !== (headerSheetName ?? firstSheetName) ? groupHeaderDetailSheets(headerRows, detailRows) : groupRows(headerRows)
  const invoices = groups.map((group) => createInvoiceFromRecords(group.headerRow, group.detailRows, companyCd, sellers))

  return {
    invoices,
    sourceRows: headerRows.length + detailRows.length,
  }
}

export async function parseEInvoiceDetailExcelFile(
  file: File,
  invoiceId: number,
  companyCd: string,
  rate: number,
  currencyCode: string,
): Promise<EInvoiceDetail[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const detailSheetName = findSheetName(workbook, ["DETAIL", "DETAILS", "EINVOICE_DETAIL", "CHI_TIET", "CHITIET", "DONG_HANG"])
  const firstSheetName = detailSheetName ?? workbook.SheetNames[0]
  const rows = worksheetRows(workbook.Sheets[firstSheetName])

  return rows
    .map(normalizeRecord)
    .filter(isDetailRecord)
    .map((record, index) => createDetailFromRecord(record, index, invoiceId, companyCd, rate, currencyCode))
}

export function isBlankEInvoiceDetail(detail: EInvoiceDetail): boolean {
  const special = detail.SPECIAL
  const specialTextEmpty = !special
    || [
      special.SKHUNG,
      special.SMAY,
      special.BKSPT_VCHUYEN,
      special.TNG_HANG,
      special.DCNG_HANG,
      special.MSTNG_HANG,
      special.MDDNG_HANG,
    ].every((value) => String(value ?? "").trim().length === 0)
  const textEmpty = [detail.MHHDVU, detail.THHDVU, detail.DVTINH, detail.TSUAT, detail.EXTRA_JSON]
    .every((value) => String(value ?? "").trim().length === 0) && specialTextEmpty
  const amountEmpty =
    Number(detail.DGIA ?? 0) === 0 &&
    Number(detail.STCKHAU ?? 0) === 0 &&
    Number(detail.THTIEN ?? 0) === 0 &&
    Number(detail.TTHUE ?? 0) === 0 &&
    Number(detail.TSAUTHUE ?? 0) === 0 &&
    Number(detail.TLCKHAU ?? 0) === 0

  return textEmpty && amountEmpty
}
