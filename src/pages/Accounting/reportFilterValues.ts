import { trimLookupText } from "@/components/lookup/lookupHelpers"

export function joinReportFilterValues(values: readonly string[]): string {
  return Array.from(new Set(values.map((value) => trimLookupText(value)).filter(Boolean))).join(",")
}
