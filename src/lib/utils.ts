type ClassNameValue =
  | string
  | number
  | false
  | null
  | undefined
  | ClassNameValue[]
  | Record<string, boolean | null | undefined>

function normalizeClassName(value: ClassNameValue): string[] {
  if (!value) {
    return []
  }

  if (typeof value === "string" || typeof value === "number") {
    return [String(value)]
  }

  if (Array.isArray(value)) {
    return value.flatMap((item) => normalizeClassName(item))
  }

  return Object.entries(value)
    .filter(([, enabled]) => Boolean(enabled))
    .map(([className]) => className)
}

export function cn(...args: ClassNameValue[]) {
  return args.flatMap((arg) => normalizeClassName(arg)).join(" ")
}
