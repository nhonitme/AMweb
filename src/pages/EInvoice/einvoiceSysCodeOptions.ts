import type { SysCode } from "@/api/sysCodeService"

export type EInvoiceNumericSysCodeOption = {
  value: number
  text: string
}

type SysCodeTranslate = (key: string, fallback: string) => string

const trimText = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "")

export function getActiveSortedSysCodes(codes: SysCode[]): SysCode[] {
  return codes
    .filter((code) => Number(code.IS_ACTIVE ?? 0) === 1 && String(code.ISDEL ?? "0") !== "1")
    .sort((left, right) => Number(left.SORT_ORDER ?? 0) - Number(right.SORT_ORDER ?? 0))
}

export function buildEInvoiceNumericSysCodeOptions(
  codes: SysCode[],
  translate: SysCodeTranslate,
  isValidValue: (value: number) => boolean = () => true,
): EInvoiceNumericSysCodeOption[] {
  return getActiveSortedSysCodes(codes)
    .map((code) => {
      const value = Number(code.CODE_CD)
      if (!Number.isFinite(value) || !isValidValue(value)) {
        return null
      }

      const langKey = trimText(code.CODE_NAME)
      const note = trimText(code.NOTE)
      const fallback = note || langKey || String(code.CODE_CD)
      return {
        value,
        text: langKey ? translate(langKey, fallback) : fallback,
      }
    })
    .filter((option): option is EInvoiceNumericSysCodeOption => option !== null)
}

export function formatEInvoiceNumericSysCodeText(
  value: number | null | undefined,
  options: EInvoiceNumericSysCodeOption[],
  fallback = "",
): string {
  const normalized = Number(value)
  if (!Number.isFinite(normalized)) {
    return fallback
  }

  const matched = options.find((option) => option.value === normalized)?.text
  if (matched) {
    return matched
  }

  // Keep empty while sys-codes are still loading so UI does not flash raw numbers.
  if (options.length === 0) {
    return ""
  }

  return fallback || String(normalized)
}
