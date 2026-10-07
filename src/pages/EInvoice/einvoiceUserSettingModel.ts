import type { EInvoiceUserSetting } from "@/types/einvoiceSetting"

export type EInvoiceUserSettingValueType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON"

export const EINVOICE_USER_SETTING_KEYS = {
  DEFAULT_LINE_TYPE: "DEFAULT_LINE_TYPE",
  SHOW_DISCOUNT_COLUMNS: "SHOW_DISCOUNT_COLUMNS",
  AUTO_CALC_AMOUNT: "AUTO_CALC_AMOUNT",
  AUTO_CALC_TAX: "AUTO_CALC_TAX",
  AUTO_CALC_PRICE_FROM_BEFORE_TAX_AMOUNT: "AUTO_CALC_PRICE_FROM_BEFORE_TAX_AMOUNT",
  AUTO_CALC_PRICE_FROM_AFTER_TAX_AMOUNT: "AUTO_CALC_PRICE_FROM_AFTER_TAX_AMOUNT",
  AFTER_TAX_PRICE: "AFTER_TAX_PRICE",
  DEFAULT_VAT_RATE: "DEFAULT_VAT_RATE",
  DEFAULT_CURRENCY: "DEFAULT_CURRENCY",
  DEFAULT_PAYMENT: "DEFAULT_PAYMENT",
  ENABLE_EXCEL_IMPORT: "ENABLE_EXCEL_IMPORT",
} as const

export type EInvoiceUserSettingKey = (typeof EINVOICE_USER_SETTING_KEYS)[keyof typeof EINVOICE_USER_SETTING_KEYS]

const USER_SETTING_KEY_FALLBACKS: Record<EInvoiceUserSettingKey, string> = {
  DEFAULT_LINE_TYPE: "Default line type",
  SHOW_DISCOUNT_COLUMNS: "Show discount columns",
  AUTO_CALC_AMOUNT: "Auto calculate amount",
  AUTO_CALC_TAX: "Auto calculate tax",
  AUTO_CALC_PRICE_FROM_BEFORE_TAX_AMOUNT: "Auto calculate unit price from before-tax amount",
  AUTO_CALC_PRICE_FROM_AFTER_TAX_AMOUNT: "Auto calculate unit price from after-tax amount",
  AFTER_TAX_PRICE: "After-tax unit price column",
  DEFAULT_VAT_RATE: "Default VAT rate",
  DEFAULT_CURRENCY: "Default currency",
  DEFAULT_PAYMENT: "Default payment method",
  ENABLE_EXCEL_IMPORT: "Enable Excel import",
}

export function formatEInvoiceUserSettingKeyLabel(
  t: (key: string, fallback: string) => string,
  settingKey: string,
): string {
  const key = settingKey.trim()
  if (!key) {
    return ""
  }

  const fallback = USER_SETTING_KEY_FALLBACKS[key as EInvoiceUserSettingKey] ?? key
  return t(key, fallback)
}

export function normalizeEInvoiceUserSettingValueType(value: unknown): EInvoiceUserSettingValueType {
  const normalized = typeof value === "string" ? value.trim().toUpperCase() : ""
  if (normalized === "NUMBER" || normalized === "BOOLEAN" || normalized === "JSON") {
    return normalized
  }
  return "STRING"
}

export function usesVatRateLookup(settingKey: string): boolean {
  return settingKey === EINVOICE_USER_SETTING_KEYS.DEFAULT_VAT_RATE
}

export function usesCurrencyLookup(settingKey: string): boolean {
  return settingKey === EINVOICE_USER_SETTING_KEYS.DEFAULT_CURRENCY
}

export function usesLineTypeLookup(settingKey: string): boolean {
  return settingKey === EINVOICE_USER_SETTING_KEYS.DEFAULT_LINE_TYPE
}

export function usesPaymentLookup(settingKey: string): boolean {
  return settingKey === EINVOICE_USER_SETTING_KEYS.DEFAULT_PAYMENT
}

export function normalizeBooleanSettingValue(value: unknown): string {
  const text = typeof value === "string" ? value.trim().toLowerCase() : String(value ?? "").trim().toLowerCase()
  return text === "true" || text === "1" || text === "yes" ? "true" : "false"
}

export function isBooleanSettingValueTrue(value: unknown): boolean {
  const text = typeof value === "string" ? value.trim().toLowerCase() : String(value ?? "").trim().toLowerCase()
  return text === "true" || text === "1" || text === "yes" || text === "y"
}

export function getUserSettingEditorKind(row: Pick<EInvoiceUserSetting, "SETTING_KEY" | "VALUE_TYPE">): "vat" | "currency" | "lineType" | "payment" | "boolean" | "number" | "string" {
  if (usesVatRateLookup(row.SETTING_KEY)) {
    return "vat"
  }
  if (usesCurrencyLookup(row.SETTING_KEY)) {
    return "currency"
  }
  if (usesPaymentLookup(row.SETTING_KEY)) {
    return "payment"
  }
  if (usesLineTypeLookup(row.SETTING_KEY)) {
    return "lineType"
  }
  if (row.VALUE_TYPE === "BOOLEAN") {
    return "boolean"
  }
  if (row.VALUE_TYPE === "NUMBER") {
    return "number"
  }
  return "string"
}
