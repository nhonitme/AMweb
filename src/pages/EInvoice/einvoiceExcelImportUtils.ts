import * as XLSX from "xlsx"

export type ExcelCellValue = string | number | boolean | Date | null | undefined
export type ExcelRecord = Record<string, ExcelCellValue>

export function normalizeExcelHeader(value: string): string {
  return value
    .trim()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/Đ/g, "D")
    .replace(/đ/g, "d")
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, "")
}

export function normalizeExcelRecord(row: ExcelRecord): Record<string, ExcelCellValue> {
  return Object.entries(row).reduce<Record<string, ExcelCellValue>>((result, [key, value]) => {
    result[normalizeExcelHeader(key)] = value
    return result
  }, {})
}

export function readExcelCellValue(record: Record<string, ExcelCellValue>, aliases: string[]): ExcelCellValue {
  for (const alias of aliases) {
    const value = record[normalizeExcelHeader(alias)]
    if (value !== undefined && value !== null && String(value).trim().length > 0) {
      return value
    }
  }

  return undefined
}

export function readExcelText(record: Record<string, ExcelCellValue>, aliases: string[], fallback = ""): string {
  const value = readExcelCellValue(record, aliases)
  if (value === undefined || value === null) {
    return fallback
  }

  return String(value).trim()
}

export function readExcelNumber(record: Record<string, ExcelCellValue>, aliases: string[], fallback = 0): number {
  const value = readExcelCellValue(record, aliases)
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

export function readExcelNullableNumber(record: Record<string, ExcelCellValue>, aliases: string[]): number | null {
  const value = readExcelCellValue(record, aliases)
  if (value === undefined || value === null || String(value).trim().length === 0) {
    return null
  }

  return readExcelNumber(record, aliases, 0)
}

export function readExcelWorksheetRows(sheet: XLSX.WorkSheet | undefined): ExcelRecord[] {
  if (!sheet) {
    return []
  }

  return XLSX.utils.sheet_to_json<ExcelRecord>(sheet, {
    defval: "",
    raw: true,
    blankrows: false,
  })
}

export function hasExcelRecordValue(record: Record<string, ExcelCellValue>, aliases: string[]): boolean {
  return readExcelText(record, aliases).length > 0
}

export function isEInvoiceDetailExcelRecord(record: Record<string, ExcelCellValue>): boolean {
  return (
    hasExcelRecordValue(record, ["THHDVU", "THHDVu", "Tên hàng", "Ten hang", "Item name"]) ||
    hasExcelRecordValue(record, ["MHHDVU", "MHHDVu", "Mã hàng", "Ma hang", "Item code"]) ||
    hasExcelRecordValue(record, ["SLUONG", "SLuong", "Số lượng", "So luong"]) ||
    hasExcelRecordValue(record, ["DGIA", "DGia", "Đơn giá", "Don gia"])
  )
}

export function findExcelWorksheetName(workbook: XLSX.WorkBook, aliases: string[]): string | null {
  const normalizedAliases = new Set(aliases.map(normalizeExcelHeader))
  return workbook.SheetNames.find((name) => normalizedAliases.has(normalizeExcelHeader(name))) ?? null
}

export function resolveExcelWorksheetName(
  workbook: XLSX.WorkBook,
  preferredSheetName: string | undefined,
  fallbackAliases: string[],
): string {
  if (preferredSheetName && workbook.SheetNames.includes(preferredSheetName)) {
    return preferredSheetName
  }

  return findExcelWorksheetName(workbook, fallbackAliases) ?? workbook.SheetNames[0]
}
