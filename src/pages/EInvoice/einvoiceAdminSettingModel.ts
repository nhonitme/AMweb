import type { EInvoiceAdminSetting } from "@/types/einvoiceSetting"
import { isBooleanSettingValueTrue } from "./einvoiceUserSettingModel"

export function formatEInvoiceAdminSettingKeyLabel(
  t: (key: string, fallback: string) => string,
  settingKey: string,
): string {
  const key = settingKey.trim()
  if (!key) {
    return ""
  }

  return t(key, key)
}

export function normalizeYnSettingValue(value: unknown): string {
  return isBooleanSettingValueTrue(value) ? "Y" : "N"
}

export function normalizeAdminSettingValue(row: Pick<EInvoiceAdminSetting, "VALUE_TYPE" | "SETTING_VALUE">): string | null {
  if (row.VALUE_TYPE === "BOOLEAN") {
    return normalizeYnSettingValue(row.SETTING_VALUE)
  }

  const text = String(row.SETTING_VALUE ?? "").trim()
  return text.length > 0 ? text : null
}

export function getAdminSettingEditorKind(row: Pick<EInvoiceAdminSetting, "SETTING_KEY" | "VALUE_TYPE">): "boolean" | "number" | "string" {
  if (row.VALUE_TYPE === "BOOLEAN") {
    return "boolean"
  }
  if (row.VALUE_TYPE === "NUMBER") {
    return "number"
  }
  return "string"
}
