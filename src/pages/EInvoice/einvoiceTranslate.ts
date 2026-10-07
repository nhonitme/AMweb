import { readGlobalStorageItem } from "@/lib/globalStorageCache"
import { getCurrentLang, resolveLanguageLabel } from "@/utils/language"

const LANGUAGE_LABELS_NAMESPACE = "language-labels"

export type EInvoiceTranslateFn = (key: string, fallback: string) => string

export function einvoiceTranslate(key: string, fallback: string): string {
  const labels = readGlobalStorageItem<Record<string, string>>(
    LANGUAGE_LABELS_NAMESPACE,
    getCurrentLang(),
  )
  return resolveLanguageLabel(labels, key) ?? fallback
}

export function formatEinvoiceText(template: string, values: Array<string | number>): string {
  return values.reduce(
    (result, value, index) => result.replace(new RegExp(`\\{${index}\\}`, "g"), String(value)),
    template,
  )
}
