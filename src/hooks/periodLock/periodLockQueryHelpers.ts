import type { PeriodLockOverview } from "@/api/periodLockApi"

export function buildSafeYearList(
  overview: PeriodLockOverview | undefined,
  selectedYear: number,
): number[] {
  const nextYearList =
    Array.isArray(overview?.YearList) && overview.YearList.length > 0
      ? overview.YearList
      : [selectedYear]

  return nextYearList.includes(selectedYear)
    ? nextYearList
    : [...nextYearList, selectedYear].sort((a, b) => a - b)
}
