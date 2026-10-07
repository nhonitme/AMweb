export const DEFAULT_CURRENCY_CODE = "VND"

export function normalizeCurrencyCode(value: unknown): string {
  return String(value ?? "").trim().toUpperCase()
}

export function normalizeCurrencyCodes(values?: readonly unknown[] | null): string[] {
  return Array.from(
    new Set((values ?? []).map((value) => normalizeCurrencyCode(value)).filter(Boolean)),
  )
}

export function getPrimaryCurrencyCode(values?: readonly unknown[] | null): string {
  return normalizeCurrencyCodes(values)[0] ?? DEFAULT_CURRENCY_CODE
}

export function isForeignCurrencyCode(value: unknown): boolean {
  const code = normalizeCurrencyCode(value)
  return code.length > 0 && code !== DEFAULT_CURRENCY_CODE
}
