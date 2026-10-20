/** Optional presentation metadata supplied by a report procedure. */
export function getReportRowLabel(row: Record<string, unknown> | null | undefined): string {
  return typeof row?.__ROW_LABEL === "string" ? row.__ROW_LABEL.trim() : ""
}

export function preservesReportRowOrder(rows: readonly Record<string, unknown>[]): boolean {
  return rows.some((row) => row.__KEEP_ROW_ORDER === 1 || row.__KEEP_ROW_ORDER === true)
}

/** Render the procedure's spanning row label in the first exported column. */
export function prepareReportOutlineExportRows<T extends Record<string, unknown>>(
  rows: readonly T[],
  visibleFields: readonly string[],
): T[] {
  const firstField = visibleFields[0]
  return rows.map((row) => {
    const label = getReportRowLabel(row)
    if (!label || !firstField) return row
    const result: Record<string, unknown> = { ...row }
    visibleFields.forEach((field) => { result[field] = null })
    result[firstField] = label
    return result as T
  })
}
