import type { SysCode } from "@/api/sysCodeService"

export const EINV_KHHDON_MCCQT_CODE_TYPE = "EINV_KHHDON_MCCQT"
export const EINV_KHHDON_LOAI_CODE_TYPE = "EINV_KHHDON_LOAI"

export type EInvoiceKhhdonPartOption = {
  value: string
  text: string
}

export type EInvoiceKhhdonParts = {
  mccqt: string
  year: string
  loai: string
  suffix: string
}

type TranslateFn = (key: string, fallback: string) => string

function formatOption(value: string, name: string): EInvoiceKhhdonPartOption {
  const label = name.trim()
  return {
    value,
    text: label ? `${value} - ${label}` : value,
  }
}

function buildOptions(codes: SysCode[], translate?: TranslateFn): EInvoiceKhhdonPartOption[] {
  return codes
    .filter((code) => Number(code.IS_ACTIVE ?? 0) === 1 && String(code.ISDEL ?? "0") !== "1")
    .sort((left, right) => Number(left.SORT_ORDER ?? 0) - Number(right.SORT_ORDER ?? 0))
    .map((code) => {
      const value = String(code.CODE_CD ?? "").trim().toUpperCase()
      if (!value) return null
      const name = String(code.CODE_NAME ?? "").trim()
      const label = name && translate ? translate(name, name) : name || value
      return formatOption(value, label)
    })
    .filter((item): item is EInvoiceKhhdonPartOption => item !== null)
}

export function buildEInvoiceKhhdonMccqtOptions(
  codes: SysCode[],
  translate?: TranslateFn,
): EInvoiceKhhdonPartOption[] {
  return buildOptions(codes, translate)
}

export function buildEInvoiceKhhdonLoaiOptions(
  codes: SysCode[],
  translate?: TranslateFn,
): EInvoiceKhhdonPartOption[] {
  return buildOptions(codes, translate)
}

export function getDefaultInvoiceYearCode(date = new Date()): string {
  return String(date.getFullYear() % 100).padStart(2, "0")
}

export function createDefaultKhhdonParts(date = new Date()): EInvoiceKhhdonParts {
  return {
    mccqt: "C",
    year: getDefaultInvoiceYearCode(date),
    loai: "T",
    suffix: "YY",
  }
}

export function parseKhhdonParts(khhdon: string | null | undefined): EInvoiceKhhdonParts {
  const normalized = (khhdon ?? "").trim().toUpperCase()
  const defaults = createDefaultKhhdonParts()
  if (normalized.length < 4) {
    return {
      ...defaults,
      mccqt: normalized[0] && /[CK]/.test(normalized[0]) ? normalized[0] : defaults.mccqt,
      year: normalized.length >= 3 && /^\d{2}$/.test(normalized.slice(1, 3))
        ? normalized.slice(1, 3)
        : defaults.year,
      loai: normalized[3] || defaults.loai,
      suffix: normalized.length >= 6 ? normalized.slice(4, 6) : defaults.suffix,
    }
  }

  return {
    mccqt: /[CK]/.test(normalized[0]) ? normalized[0] : defaults.mccqt,
    year: /^\d{2}$/.test(normalized.slice(1, 3)) ? normalized.slice(1, 3) : defaults.year,
    loai: normalized[3] || defaults.loai,
    suffix: (normalized.slice(4, 6) || defaults.suffix).padEnd(2, "Y").slice(0, 2),
  }
}

export function composeKhhdon(parts: EInvoiceKhhdonParts): string {
  const mccqt = (parts.mccqt || "C").trim().toUpperCase().slice(0, 1)
  const year = (parts.year || getDefaultInvoiceYearCode()).replace(/\D/g, "").padStart(2, "0").slice(-2)
  const loai = (parts.loai || "T").trim().toUpperCase().slice(0, 1)
  const suffixRaw = (parts.suffix || "YY").trim().toUpperCase().replace(/[^A-Z]/g, "")
  const suffix = (suffixRaw || "YY").padEnd(2, "Y").slice(0, 2)
  return `${mccqt}${year}${loai}${suffix}`
}

export function isValidKhhdon(khhdon: string | null | undefined): boolean {
  return /^[CK]\d{2}[TDLMNBGHXF][A-Z]{2}$/.test((khhdon ?? "").trim().toUpperCase())
}
