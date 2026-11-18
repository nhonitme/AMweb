import * as XLSX from "xlsx"

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
