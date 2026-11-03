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

export function createCurrentQuarterDateRange(baseDate = new Date()): DateRange {
  const anchor = new Date(baseDate)
  anchor.setHours(0, 0, 0, 0)
  const year = anchor.getFullYear()
  const quarterStartMonth = Math.floor(anchor.getMonth() / 3) * 3
  const fromDate = new Date(year, quarterStartMonth, 1)
  fromDate.setHours(0, 0, 0, 0)
  const toDate = new Date(year, quarterStartMonth + 3, 0)
  toDate.setHours(0, 0, 0, 0)
  return { fromDate, toDate }
}
