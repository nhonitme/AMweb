const createDate = (year: number, month: number, day: number, hour = 0, minute = 0, second = 0): Date | null => {
  const date = new Date(year, month - 1, day, hour, minute, second)
  if (
    date.getFullYear() !== year ||
    date.getMonth() !== month - 1 ||
    date.getDate() !== day ||
    date.getHours() !== hour ||
    date.getMinutes() !== minute ||
    date.getSeconds() !== second
  ) {
    return null
  }

  return date
}

const parseDateParts = (text: string): Date | null => {
  const digits = text.replace(/[-/.:\s]/g, "")

  if (/^\d{14}$/.test(digits)) {
    const hour = Number(digits.slice(8, 10))
    const minute = Number(digits.slice(10, 12))
    const second = Number(digits.slice(12, 14))
    return createDate(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6, 8)), hour, minute, second)
      ?? createDate(Number(digits.slice(4, 8)), Number(digits.slice(2, 4)), Number(digits.slice(0, 2)), hour, minute, second)
  }

  if (/^\d{12}$/.test(digits)) {
    const hour = Number(digits.slice(8, 10))
    const minute = Number(digits.slice(10, 12))
    return createDate(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6, 8)), hour, minute)
      ?? createDate(Number(digits.slice(4, 8)), Number(digits.slice(2, 4)), Number(digits.slice(0, 2)), hour, minute)
  }

  if (/^\d{8}$/.test(digits)) {
    return createDate(Number(digits.slice(0, 4)), Number(digits.slice(4, 6)), Number(digits.slice(6, 8)))
      ?? createDate(Number(digits.slice(4, 8)), Number(digits.slice(2, 4)), Number(digits.slice(0, 2)))
  }

  return null
}

const formatDateTime = (date: Date): string => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, "0")
  const day = String(date.getDate()).padStart(2, "0")
  const hour = String(date.getHours()).padStart(2, "0")
  const minute = String(date.getMinutes()).padStart(2, "0")
  const second = String(date.getSeconds()).padStart(2, "0")
  return `${year}-${month}-${day}T${hour}:${minute}:${second}`
}

export const normalizeDateTime = (value: unknown): string | null => {
  if (value == null || value === "") {
    return null
  }

  if (value instanceof Date) {
    return formatDateTime(value)
  }

  if (typeof value === "number") {
    const date = new Date(value)
    return !Number.isNaN(date.getTime()) ? formatDateTime(date) : null
  }

  const trimmed = String(value).trim()
  if (!trimmed) {
    return null
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return formatDateTime(parsed)
  }

  const parsedFromParts = parseDateParts(trimmed)
  if (parsedFromParts) {
    return formatDateTime(parsedFromParts)
  }

  return trimmed.includes("T") ? trimmed : null
}

export const normalizeDate = (value: unknown): string | null => {
  if (value == null || value === "") {
    return null
  }

  if (value instanceof Date) {
    const date = value
    return !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null
  }

  if (typeof value === "number") {
    const date = new Date(value)
    return !Number.isNaN(date.getTime()) ? date.toISOString().slice(0, 10) : null
  }

  const trimmed = String(value).trim()
  if (!trimmed) {
    return null
  }

  const parsed = new Date(trimmed)
  if (!Number.isNaN(parsed.getTime())) {
    return parsed.toISOString().slice(0, 10)
  }

  const parsedFromParts = parseDateParts(trimmed)
  if (parsedFromParts) {
    return parsedFromParts.toISOString().slice(0, 10)
  }

  return trimmed
}
