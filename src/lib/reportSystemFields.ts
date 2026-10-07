/**
 * Report/grid convention: fields starting with `__` are system/technical
 * (link targets, drill keys). APIs may return them; UI auto-hides them.
 */
export const REPORT_SYSTEM_FIELD_PREFIX = "__"

export function isReportSystemField(fieldName?: string | null): boolean {
  const normalized = String(fieldName ?? "").trim()
  if (!normalized) {
    return false
  }

  return normalized.startsWith(REPORT_SYSTEM_FIELD_PREFIX)
}

export function filterReportDisplayFields<T extends string>(fields: readonly T[]): T[] {
  return fields.filter((field) => !isReportSystemField(field))
}

