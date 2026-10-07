import type { SysCode } from "@/api/sysCodeService"

export const EINV_KHMSHDON_CODE_TYPE = "EINV_KHMSHDON"

export type EInvoiceKhmshdonOption = {
  value: string
  text: string
}

type TranslateFn = (key: string, fallback: string) => string

function formatOption(value: string, name: string): EInvoiceKhmshdonOption {
  const label = name.trim()
  return {
    value,
    text: label ? `${value} - ${label}` : value,
  }
}

export function buildEInvoiceKhmshdonOptions(
  codes: SysCode[],
  translate?: TranslateFn,
): EInvoiceKhmshdonOption[] {
  return codes
    .filter((code) => Number(code.IS_ACTIVE ?? 0) === 1 && String(code.ISDEL ?? "0") !== "1")
    .sort((left, right) => Number(left.SORT_ORDER ?? 0) - Number(right.SORT_ORDER ?? 0))
    .map((code) => {
      const value = String(code.CODE_CD ?? "").trim()
      if (!value) return null
      const name = String(code.CODE_NAME ?? "").trim()
      const label = name && translate ? translate(name, name) : name || value
      return formatOption(value, label)
    })
    .filter((item): item is EInvoiceKhmshdonOption => item !== null)
}
