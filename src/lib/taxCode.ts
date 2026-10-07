/**
 * Normalize Vietnamese tax code (MST) for display/storage/lookup.
 * - Strips spaces/dots and other non-digit noise
 * - 10 digits → `0123456789`
 * - 13 digits → `0123456789-001` (branch suffix)
 */
export function normalizeTaxCode(value: string | null | undefined): string {
  const raw = String(value ?? "").trim().toUpperCase()
  if (!raw) return ""

  const digits = raw.replace(/\D/g, "")
  if (digits.length === 13) {
    return `${digits.slice(0, 10)}-${digits.slice(10)}`
  }
  if (digits.length === 10) {
    return digits
  }

  // Keep a single hyphen if the user already typed a partial/branch form.
  return raw.replace(/[\s.]+/g, "").replace(/-+/g, "-")
}
