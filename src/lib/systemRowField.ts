export function readSystemValue(record: object | null | undefined, name: string): unknown {
  if (!record || typeof record !== "object") return undefined
  const row = record as Record<string, unknown>
  const aliased = `__${name}`
  if (Object.prototype.hasOwnProperty.call(row, aliased) && row[aliased] != null && row[aliased] !== "") {
    return row[aliased]
  }
  return row[name]
}

export function readSystemId(record: object | null | undefined, name: string): number | null {
  const value = readSystemValue(record, name)
  if (typeof value === "number" && Number.isFinite(value)) return value
  if (typeof value === "string" && value.trim() !== "") {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return null
}

export function readSystemText(record: object | null | undefined, name: string): string {
  const value = readSystemValue(record, name)
  if (typeof value === "string") return value.trim()
  if (value == null) return ""
  return String(value).trim()
}

export function toWriteRow<T extends object>(row: T): T {
  const next = { ...(row as Record<string, unknown>) }
  for (const key of Object.keys(next)) {
    if (!key.startsWith("__") || key.length < 3) continue
    const plain = key.slice(2)
    if (next[plain] == null || next[plain] === "") {
      next[plain] = next[key]
    }
    delete next[key]
  }
  return next as T
}

export function omitPlainFields<T extends object>(row: T, names: readonly string[]): T {
  const next = { ...(row as Record<string, unknown>) }
  for (const name of names) {
    delete next[name]
  }
  return next as T
}
