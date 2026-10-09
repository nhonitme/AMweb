export type DateRange = {
  fromDate: Date
  toDate: Date
}

export function createMonthStartDate(baseDate = new Date()): Date {
  const monthStart = new Date(baseDate)
  monthStart.setDate(1)
  monthStart.setHours(0, 0, 0, 0)
  return monthStart
}

export function createCurrentMonthDateRange(baseDate = new Date()): DateRange {
  const toDate = new Date(baseDate)
  toDate.setHours(0, 0, 0, 0)

  return {
    fromDate: createMonthStartDate(toDate),
    toDate,
  }
}
