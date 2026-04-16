type AccountingDateValue = Date | string | null | undefined

const isValidDate = (value: Date): boolean => !Number.isNaN(value.getTime())

const toYmdText = (value: Date): string => {
  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")

  return `${year}${month}${day}`
}

const parseYmdText = (value: string): Date | null => {
  const normalized = value.trim()
  const exactMatch = /^(\d{4})(\d{2})(\d{2})$/.exec(normalized)

  if (exactMatch) {
    const year = Number(exactMatch[1])
    const month = Number(exactMatch[2])
    const day = Number(exactMatch[3])
    const date = new Date(year, month - 1, day)

    if (
      isValidDate(date) &&
      date.getFullYear() === year &&
      date.getMonth() === month - 1 &&
      date.getDate() === day
    ) {
      return date
    }
  }

  const parsed = new Date(normalized)
  return isValidDate(parsed) ? parsed : null
}

const normalizeYmd = (value: AccountingDateValue): Date | null => {
  if (value instanceof Date) {
    return isValidDate(value) ? value : null
  }

  if (typeof value === "string") {
    return parseYmdText(value)
  }

  return null
}

export const formatDateToYmd = (value: AccountingDateValue): string | null => {
  if (value instanceof Date) {
    return isValidDate(value) ? toYmdText(value) : null
  }

  if (typeof value === "string") {
    const normalized = value.trim()

    if (!normalized) {
      return null
    }

    if (/^\d{8}$/.test(normalized)) {
      return normalized
    }

    const parsed = parseYmdText(normalized)
    return parsed ? toYmdText(parsed) : null
  }

  return null
}

export const formatYmdForDisplay = (value: AccountingDateValue): string => {
  const parsed = normalizeYmd(value)

  if (!parsed) {
    return ""
  }

  const year = parsed.getFullYear()
  const month = `${parsed.getMonth() + 1}`.padStart(2, "0")
  const day = `${parsed.getDate()}`.padStart(2, "0")

  return `${year}-${month}-${day}`
}
