import { downloadFile } from "@/lib/fileUtils"
import type { ColumnConfig } from "@/types/table"
import * as XLSX from "xlsx"

type ExcelRow = Record<string, string | number | boolean | null | undefined>

type ExcelColumnWidthOptions = {
  minWidth?: number
  maxWidth?: number
  padding?: number
}

export function estimateExcelDisplayWidth(text: string): number {
  let width = 0

  for (const character of text) {
    const code = character.codePointAt(0) ?? 0
    width += code > 0xff ? 2 : 1
  }

  return width
}

export function buildExcelColumnWidthsFromMatrix(
  matrix: readonly (readonly string[])[],
  measureRowIndexes: readonly number[],
  options: ExcelColumnWidthOptions = {},
): Array<{ wch: number }> {
  const minWidth = options.minWidth ?? 8
  const maxWidth = options.maxWidth ?? 60
  const padding = options.padding ?? 2
  const columnCount = matrix.reduce((max, row) => Math.max(max, row.length), 0)
  const widths = Array.from({ length: columnCount }, () => minWidth)

  for (const rowIndex of measureRowIndexes) {
    const row = matrix[rowIndex]
    if (!row) {
      continue
    }

    row.forEach((cell, columnIndex) => {
      const nextWidth = estimateExcelDisplayWidth(String(cell ?? "")) + padding
      widths[columnIndex] = Math.min(maxWidth, Math.max(widths[columnIndex] ?? minWidth, nextWidth))
    })
  }

  return widths.map((width) => ({ wch: width }))
}

export function applyExcelColumnWidthsFromMatrix(
  worksheet: XLSX.WorkSheet,
  matrix: readonly (readonly string[])[],
  measureRowIndexes: readonly number[],
  options?: ExcelColumnWidthOptions,
): void {
  worksheet["!cols"] = buildExcelColumnWidthsFromMatrix(matrix, measureRowIndexes, options)
}

const EXPORT_COLUMN_MIN_WIDTH = 8
const EXPORT_COLUMN_MAX_WIDTH = 50
const EXPORT_COLUMN_PADDING = 2

/** Marker on data rows that should merge across all exported columns. */
export const EXCEL_EXPORT_GROUP_ROW_FLAG = "__IS_EXPORT_GROUP_ROW"

export type ExportToExcelOptions = {
  withBorders?: boolean
  preserveFileName?: boolean
  /** Merge rows flagged with EXCEL_EXPORT_GROUP_ROW_FLAG across all columns. */
  mergeGroupRows?: boolean
}

function isExportGroupRow(item: Record<string, unknown>): boolean {
  const flag = item[EXCEL_EXPORT_GROUP_ROW_FLAG]
  return flag === true || flag === 1 || flag === "1"
}

export async function exportToExcel<T extends Record<string, unknown>>(
  data: T[],
  columns: ColumnConfig[],
  fileName: string,
  sheetName = "Sheet1",
  options: ExportToExcelOptions = {},
) {
  return downloadFile({ fileName, preserveFileName: options.preserveFileName, load: async () => {

  const widthMatrix: string[][] = [columns.map((column) => column.displayName)]
  const groupRowIndexes: number[] = []
  const worksheetData = data.map((item, index) => {
    const row: ExcelRow = {}
    const widthRow: string[] = []
    if (isExportGroupRow(item)) {
      groupRowIndexes.push(index)
    }

    columns.forEach((column) => {
      const value = item[column.dataField]
      const cell =
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean" ||
        value == null
          ? value
          : String(value)

      row[column.displayName] = cell
      widthRow.push(cell == null ? "" : String(cell))
    })

    widthMatrix.push(widthRow)
    return row
  })

  const useExcelJs = Boolean(options.withBorders || options.mergeGroupRows)
  if (useExcelJs) {
    const ExcelJS = (await import("exceljs")).default
    const workbook = new ExcelJS.Workbook()
    const worksheet = workbook.addWorksheet(sheetName)
    worksheet.addRow(columns.map((column) => column.displayName))
    worksheet.getRow(1).font = { bold: true }
    worksheetData.forEach((row) => {
      worksheet.addRow(columns.map((column) => row[column.displayName]))
    })

    buildExcelColumnWidthsFromMatrix(
      widthMatrix,
      widthMatrix.map((_, index) => index),
      {
        minWidth: EXPORT_COLUMN_MIN_WIDTH,
        maxWidth: EXPORT_COLUMN_MAX_WIDTH,
        padding: EXPORT_COLUMN_PADDING,
      },
    ).forEach((width, index) => {
      worksheet.getColumn(index + 1).width = width.wch
    })

    if (options.mergeGroupRows && columns.length > 1) {
      groupRowIndexes.forEach((dataIndex) => {
        // Sheet row 1 = header; data starts at row 2.
        const excelRowNumber = dataIndex + 2
        worksheet.mergeCells(excelRowNumber, 1, excelRowNumber, columns.length)
        const cell = worksheet.getCell(excelRowNumber, 1)
        cell.font = { bold: true }
        cell.alignment = { vertical: "middle", horizontal: "left" }
      })
    }

    if (options.withBorders) {
      worksheet.eachRow({ includeEmpty: true }, (row) => {
        row.eachCell({ includeEmpty: true }, (cell) => {
          cell.border = {
            top: { style: "thin", color: { argb: "FFD1D5DB" } },
            bottom: { style: "thin", color: { argb: "FFD1D5DB" } },
            left: { style: "thin", color: { argb: "FFD1D5DB" } },
            right: { style: "thin", color: { argb: "FFD1D5DB" } },
          }
        })
      })
    }

    const buffer = await workbook.xlsx.writeBuffer()
    return new Blob([buffer as BlobPart], {
      type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    })
  }

  const worksheet = XLSX.utils.json_to_sheet(worksheetData)
  applyExcelColumnWidthsFromMatrix(
    worksheet,
    widthMatrix,
    widthMatrix.map((_, index) => index),
    {
      minWidth: EXPORT_COLUMN_MIN_WIDTH,
      maxWidth: EXPORT_COLUMN_MAX_WIDTH,
      padding: EXPORT_COLUMN_PADDING,
    },
  )
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, sheetName)

  const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  const blob = new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })

    return blob
  } })
}
