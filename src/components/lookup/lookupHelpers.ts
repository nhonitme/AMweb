export const trimLookupText = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim()
  }

  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim()
}

export const firstLookupText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = trimLookupText(value)
    if (text) {
      return text
    }
  }

  return ""
}

export const toLookupNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

export const setLookupGridCellValue = (
  grid: any,
  rowIndex: number,
  fieldName: string | undefined,
  fieldValue: unknown,
) => {
  if (!fieldName) {
    return
  }

  if (typeof rowIndex !== "number" || rowIndex < 0) {
    return
  }

  grid?.cellValue?.(rowIndex, fieldName, fieldValue)
}

export const hasLookupRowField = (
  rowData: object | undefined,
  fieldName: string | undefined,
) => Boolean(rowData && fieldName && fieldName in rowData)
