/** Optional presentation metadata supplied by a report procedure. */
export function getReportRowLabel(row: Record<string, unknown> | null | undefined): string {
  return typeof row?.__ROW_LABEL === "string" ? row.__ROW_LABEL.trim() : ""
}

export function preservesReportRowOrder(rows: readonly Record<string, unknown>[]): boolean {
  return rows.some((row) => row.__KEEP_ROW_ORDER === 1 || row.__KEEP_ROW_ORDER === true)
}

