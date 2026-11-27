/**
 * Group labels for TAX_VAT_INVOICE_LIST (bảng kê) by VAT_INFO_TYPE.
 * Mirrors reduction-appendix section headers: show category title only, no "Loại: code -".
 */

export type VatInvoiceListDirection = "BUY" | "SELL"

/** Marker on synthetic rows that only exist so empty VAT_INFO_TYPE groups still render. */
export const VAT_INVOICE_LIST_GROUP_PLACEHOLDER_FIELD = "__VAT_GROUP_PLACEHOLDER"

/** Official section labels (NOTE without [[RATE:...]]); used when i18n key is missing. */
const VAT_INFO_TYPE_FALLBACKS: Record<VatInvoiceListDirection, Record<string, string>> = {
  SELL: {
    "1": "1. Hàng hóa, dịch vụ không chịu thuế GTGT",
    "2": "2. Hàng hóa, dịch vụ chịu thuế suất GTGT 0%",
    "3": "3. Hàng hóa, dịch vụ chịu thuế suất GTGT 5%",
    "4": "4. Hàng hóa, dịch vụ chịu thuế suất GTGT 10%",
    "5": "5. Hàng hóa, dịch vụ không tính thuế GTGT",
    "6": "Không lên bảng kê",
  },
  BUY: {
    "1a": "1a. Hàng hóa, dịch vụ dùng riêng cho SXKD chịu thuế GTGT (nhóm 1a)",
    "1b": "1b. Hàng hóa, dịch vụ dùng riêng cho SXKD chịu thuế GTGT (nhóm 1b)",
    "2": "2. Hàng hóa, dịch vụ dùng chung cho SXKD chịu thuế và không chịu thuế",
    "3": "3. Hàng hóa, dịch vụ dùng cho dự án đầu tư",
    "4": "Không lên bảng kê",
    "5": "4. Hàng hóa, dịch vụ không đủ điều kiện khấu trừ",
    "6": "5. Hàng hóa, dịch vụ không phải tổng hợp trên tờ khai 01/GTGT",
  },
}

const EXCLUDED_VAT_INFO_TYPE_LABEL = "không lên bảng kê"

function normalizeInfoTypeCode(value: unknown): string {
  return typeof value === "string" ? value.trim() : value == null ? "" : String(value).trim()
}

function infoTypeLookupKey(code: string): string {
  return code.trim().toLowerCase()
}

/** Categories marked "Không lên bảng kê" must not appear as fixed section headers. */
export function isVatInvoiceListExcludedInfoType(
  direction: VatInvoiceListDirection | null | undefined,
  infoType: unknown,
  noteOrName?: unknown,
): boolean {
  const code = normalizeInfoTypeCode(infoType)
  if (!code) {
    return true
  }

  const dir = normalizeVatInvoiceListDirection(direction)
  const fallback = dir
    ? VAT_INFO_TYPE_FALLBACKS[dir][code] ?? VAT_INFO_TYPE_FALLBACKS[dir][code.toLowerCase()]
    : undefined
  const label = typeof noteOrName === "string" ? noteOrName.trim() : noteOrName == null ? "" : String(noteOrName).trim()
  const strippedLabel = label.replace(/\[\[RATE:[^\]]*\]\]/gi, "").replace(/\s{2,}/g, " ").trim()
  const candidates = [fallback, label, strippedLabel].filter((text): text is string => Boolean(text && text.trim()))
  return candidates.some((text) => text.trim().toLowerCase() === EXCLUDED_VAT_INFO_TYPE_LABEL)
}

/**
 * Fixed VAT_INFO_TYPE codes that must always show as groups on the invoice list,
 * even when the filtered dataset has no rows for that code.
 * Prefer sys_code (VAT_*_CATEGORY); fall back to the known catalog order.
 */
export function listFixedVatInvoiceListInfoTypes(
  direction: VatInvoiceListDirection | null | undefined,
  catalogCodes?: ReadonlyArray<{ CODE_CD?: unknown; NOTE?: unknown; CODE_NAME?: unknown; SORT_ORDER?: unknown }>,
): string[] {
  const dir = normalizeVatInvoiceListDirection(direction)
  if (!dir) {
    return []
  }

  const fromCatalog = (catalogCodes ?? [])
    .slice()
    .sort((a, b) => {
      const sortA = Number(a.SORT_ORDER)
      const sortB = Number(b.SORT_ORDER)
      const safeA = Number.isFinite(sortA) ? sortA : 0
      const safeB = Number.isFinite(sortB) ? sortB : 0
      if (safeA !== safeB) {
        return safeA - safeB
      }
      return normalizeInfoTypeCode(a.CODE_CD).localeCompare(normalizeInfoTypeCode(b.CODE_CD))
    })
    .map((item) => normalizeInfoTypeCode(item.CODE_CD))
    .filter((code) => code.length > 0)
    .filter((code, index, all) => all.findIndex((other) => infoTypeLookupKey(other) === infoTypeLookupKey(code)) === index)
    .filter((code) => {
      const item = (catalogCodes ?? []).find(
        (entry) => infoTypeLookupKey(normalizeInfoTypeCode(entry.CODE_CD)) === infoTypeLookupKey(code),
      )
      return !isVatInvoiceListExcludedInfoType(dir, code, item?.NOTE ?? item?.CODE_NAME)
    })

  if (fromCatalog.length > 0) {
    return fromCatalog
  }

  return Object.keys(VAT_INFO_TYPE_FALLBACKS[dir]).filter(
    (code) => !isVatInvoiceListExcludedInfoType(dir, code),
  )
}

export function isVatInvoiceListGroupPlaceholderRow(row: Record<string, unknown> | null | undefined): boolean {
  if (!row) {
    return false
  }
  const marker = row[VAT_INVOICE_LIST_GROUP_PLACEHOLDER_FIELD]
  return marker === 1 || marker === true || marker === "1"
}

type EnsureVatInvoiceListGroupRowsArgs<T extends Record<string, unknown>> = {
  rows: T[]
  direction: VatInvoiceListDirection | null | undefined
  catalogCodes?: ReadonlyArray<{ CODE_CD?: unknown; NOTE?: unknown; CODE_NAME?: unknown; SORT_ORDER?: unknown }>
  translate: (key: string, fallback: string) => string
}

/**
 * Append one blank seed row per missing fixed VAT_INFO_TYPE so DevExtreme still
 * creates the group header when the period has no invoices in that category.
 */
export function ensureVatInvoiceListGroupRows<T extends Record<string, unknown>>({
  rows,
  direction,
  catalogCodes,
  translate,
}: EnsureVatInvoiceListGroupRowsArgs<T>): T[] {
  const dir = normalizeVatInvoiceListDirection(direction)
  if (!dir) {
    return rows
  }

  const present = new Set<string>()
  for (const row of rows) {
    if (isVatInvoiceListGroupPlaceholderRow(row)) {
      continue
    }
    const code = normalizeInfoTypeCode(row.VAT_INFO_TYPE)
    if (code) {
      present.add(infoTypeLookupKey(code))
    }
  }

  const missing = listFixedVatInvoiceListInfoTypes(dir, catalogCodes).filter(
    (code) => !present.has(infoTypeLookupKey(code)),
  )
  if (missing.length === 0) {
    return rows
  }

  const seeds = missing.map((code) => {
    const label = resolveVatInvoiceListGroupLabel(dir, code, translate)
    return {
      ROW_KEY: `${VAT_INVOICE_LIST_GROUP_PLACEHOLDER_FIELD}:${dir}:${code}`,
      VAT_DIRECTION: dir,
      VAT_INFO_TYPE: code,
      VAT_INFO_TYPE_NM: label,
      [VAT_INVOICE_LIST_GROUP_PLACEHOLDER_FIELD]: 1,
    } as unknown as T
  })

  return [...rows, ...seeds]
}

export function normalizeVatInvoiceListDirection(value: unknown): VatInvoiceListDirection | null {
  const text = typeof value === "string" ? value.trim().toUpperCase() : ""
  if (text === "BUY" || text === "SELL") {
    return text
  }
  return null
}

export function resolveVatInfoTypeTranslationKey(
  direction: VatInvoiceListDirection | null,
  infoType: string,
): string | null {
  const code = infoType.trim()
  if (!direction || !code) {
    return null
  }
  return `${direction === "BUY" ? "VAT_BUY_CATEGORY" : "VAT_SELL_CATEGORY"}_${code.toUpperCase()}`
}

/**
 * Localized group header for one VAT_INFO_TYPE.
 * Prefers language table (VAT_*_CATEGORY_*), then numbered NOTE-style fallback.
 */
export function resolveVatInvoiceListGroupLabel(
  direction: unknown,
  infoType: unknown,
  translate: (key: string, fallback: string) => string,
): string {
  const code = typeof infoType === "string" ? infoType.trim() : infoType == null ? "" : String(infoType).trim()
  if (!code) {
    return translate("VAT_INFO_TYPE_EMPTY", "Chưa phân loại")
  }

  const dir = normalizeVatInvoiceListDirection(direction)
  const key = resolveVatInfoTypeTranslationKey(dir, code)
  const fallback =
    (dir
      ? VAT_INFO_TYPE_FALLBACKS[dir][code] ?? VAT_INFO_TYPE_FALLBACKS[dir][code.toLowerCase()]
      : undefined) ?? code
  const raw = key ? translate(key, fallback) : fallback
  const text = raw.trim()
  if (!text) {
    return fallback
  }

  // Language rows often omit the section number that appears on the tax form.
  if (/^\d/i.test(text) || text.toLowerCase() === code.toLowerCase() || text === fallback) {
    return text
  }
  return `${code}. ${text}`
}

export function isVatSectionStyleGroupReport(reportCode: string | null | undefined): boolean {
  const code = String(reportCode ?? "").trim().toUpperCase()
  return code === "TAX_VAT_REDUCTION_APPENDIX" || code === "TAX_VAT_INVOICE_LIST"
}

/** Stable DevExtreme group/sort key: catalog order, empty last. */
export function resolveVatInvoiceListGroupSortKey(direction: unknown, infoType: unknown): string {
  const code = typeof infoType === "string" ? infoType.trim() : infoType == null ? "" : String(infoType).trim()
  if (!code) {
    return "999|"
  }

  const dir = normalizeVatInvoiceListDirection(direction)
  if (dir === "BUY") {
    const buyOrder: Record<string, string> = {
      "1a": "01",
      "1b": "02",
      "2": "03",
      "3": "04",
      "5": "05",
      "6": "06",
      "4": "07",
    }
    return `${buyOrder[code.toLowerCase()] ?? buyOrder[code] ?? "100"}|${code}`
  }

  if (dir === "SELL" && /^\d+$/.test(code)) {
    return `${code.padStart(2, "0")}|${code}`
  }

  return `100|${code}`
}
