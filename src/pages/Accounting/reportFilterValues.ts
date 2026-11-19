import { trimLookupText } from "@/components/lookup/lookupHelpers"

export const REPORT_FILTER_ALL_VALUE = "all"

export function isReportFilterAllValue(value: unknown): boolean {
  return trimLookupText(String(value ?? "")).toLowerCase() === REPORT_FILTER_ALL_VALUE
}

export function joinReportFilterValues(values: readonly string[]): string {
  const normalized = Array.from(
    new Set(values.map((value) => trimLookupText(value)).filter(Boolean)),
  )

  if (normalized.length === 1 && isReportFilterAllValue(normalized[0])) {
    return REPORT_FILTER_ALL_VALUE
  }

  return normalized.join(",")
}

export function splitReportFilterValues(value: string | null | undefined): string[] {
  const trimmed = (value ?? "").trim()
  if (!trimmed) {
    return []
  }

  if (isReportFilterAllValue(trimmed)) {
    return [REPORT_FILTER_ALL_VALUE]
  }

  const result: string[] = []
  const seen = new Set<string>()

  for (const item of trimmed.split(",")) {
    const normalized = item.trim()
    const key = normalized.toUpperCase()
    if (!normalized || seen.has(key)) {
      continue
    }

    seen.add(key)
    result.push(isReportFilterAllValue(normalized) ? REPORT_FILTER_ALL_VALUE : normalized)
  }

  return result
}
