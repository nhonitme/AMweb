const STORAGE_KEY = "amnote.voucher-info-descriptions"

export const VOUCHER_INFO_DESCRIPTION_FIELDS = [
  "DESCRIPTION_VIET",
  "DESCRIPTION_ENG",
  "DESCRIPTION_KOR",
] as const

export type VoucherInfoDescriptionField = (typeof VOUCHER_INFO_DESCRIPTION_FIELDS)[number]

function isDescriptionField(value: string): value is VoucherInfoDescriptionField {
  return (VOUCHER_INFO_DESCRIPTION_FIELDS as readonly string[]).includes(value)
}

function readStore(): Record<string, VoucherInfoDescriptionField[]> {
  if (typeof window === "undefined") {
    return {}
  }

  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "{}") as Record<string, unknown>
    const store: Record<string, VoucherInfoDescriptionField[]> = {}
    Object.entries(parsed).forEach(([companyCd, fields]) => {
      if (!Array.isArray(fields)) {
        return
      }
      store[companyCd] = fields.filter((field): field is VoucherInfoDescriptionField => typeof field === "string" && isDescriptionField(field))
    })
    return store
  } catch {
    return {}
  }
}

const DEFAULT_FIELDS: VoucherInfoDescriptionField[] = ["DESCRIPTION_VIET"]

export function readVoucherInfoDescriptionFields(companyCd: string): VoucherInfoDescriptionField[] {
  const key = companyCd.trim()
  if (!key) {
    return DEFAULT_FIELDS
  }

  return readStore()[key] ?? DEFAULT_FIELDS
}

export function writeVoucherInfoDescriptionFields(companyCd: string, fields: VoucherInfoDescriptionField[]): void {
  const key = companyCd.trim()
  if (!key || typeof window === "undefined") {
    return
  }

  const store = readStore()
  store[key] = VOUCHER_INFO_DESCRIPTION_FIELDS.filter((field) => fields.includes(field))
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
}
