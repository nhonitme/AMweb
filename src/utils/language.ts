import type { MessageLanguageKey } from "@/types/languages"

export const LANG_KEY = "lang"
export const DEFAULT_MESSAGE_LANGUAGE: MessageLanguageKey = "VIET"
export const MESSAGE_LANGUAGE_KEYS = ["VIET", "ENG", "KOR", "JPN", "THA", "CHN"] as const

export type AppLocaleCode = "vi" | "en" | "ko" | "ja" | "th" | "zh"
export type DataLanguageSuffix = "VIET" | "ENG" | "KOR" | "CHN"

export interface Language {
  code: MessageLanguageKey
  locale: AppLocaleCode
  name: string
  flag: string
  shortLabel: string
}

export const languages: Language[] = [
  { code: "VIET", locale: "vi", name: "Vietnamese", flag: "VN", shortLabel: "VI" },
  { code: "ENG", locale: "en", name: "English", flag: "US", shortLabel: "EN" },
  { code: "KOR", locale: "ko", name: "Korean", flag: "KR", shortLabel: "KOR" },
  // { code: "JPN", locale: "ja", name: "Japanese", flag: "JP", shortLabel: "JPN" },
  // { code: "THA", locale: "th", name: "Traditional Chinese", flag: "TW", shortLabel: "THA" },
  // { code: "CHN", locale: "zh", name: "Chinese", flag: "CN", shortLabel: "CHN" },
]

const languageByKey: Record<MessageLanguageKey, Language> = languages.reduce(
  (items, language) => ({
    ...items,
    [language.code]: language,
  }),
  {} as Record<MessageLanguageKey, Language>,
)

export function isMessageLanguageKey(value: string): value is MessageLanguageKey {
  return MESSAGE_LANGUAGE_KEYS.includes(value as MessageLanguageKey)
}

export function normalizeMessageLanguageKey(lang?: string | null): MessageLanguageKey {
  const normalized = String(lang ?? "").trim().toUpperCase()
  return isMessageLanguageKey(normalized) ? normalized : DEFAULT_MESSAGE_LANGUAGE
}

export function getLocaleCode(lang?: string | null): AppLocaleCode {
  return languageByKey[normalizeMessageLanguageKey(lang)]?.locale ?? languageByKey[DEFAULT_MESSAGE_LANGUAGE].locale
}

export function getDataLanguageSuffix(lang?: string | null): DataLanguageSuffix {
  switch (normalizeMessageLanguageKey(lang)) {
    case "ENG":
      return "ENG"
    case "KOR":
      return "KOR"
    case "CHN":
    case "THA":
      return "CHN"
    case "VIET":
    case "JPN":
    default:
      return "VIET"
  }
}

export function getCurrentLang(): MessageLanguageKey {
  const normalized = normalizeMessageLanguageKey(localStorage.getItem(LANG_KEY))
  const resolved = languageByKey[normalized] ? normalized : DEFAULT_MESSAGE_LANGUAGE
  localStorage.setItem(LANG_KEY, resolved)
  return resolved
}

export const getCurrentLangCode = getCurrentLang
export const getCurrentDataLanguageSuffix = () => getDataLanguageSuffix(getCurrentLang())

export function getCurrentLangArray(): Language[] {
  const lang = getCurrentLang()
  return languages.filter((language) => language.code === lang)
}

export function setCurrentLang(lang: string): void {
  localStorage.setItem(LANG_KEY, normalizeMessageLanguageKey(lang))
}

export function normalizeLanguageLookupKey(key: string): string {
  return key.trim().toUpperCase()
}

export function buildLanguageLabelIndex(labels: Record<string, string>): Map<string, string> {
  const index = new Map<string, string>()

  for (const [labelKey, value] of Object.entries(labels)) {
    if (typeof value !== "string" || value.trim().length === 0) {
      continue
    }

    const normalizedKey = normalizeLanguageLookupKey(labelKey)
    if (!index.has(normalizedKey)) {
      index.set(normalizedKey, value)
    }
  }

  return index
}

export function resolveLanguageLabel(
  labels: Record<string, string> | null | undefined,
  key: string,
  index?: Map<string, string> | null,
): string | undefined {
  const trimmed = key.trim()
  if (!trimmed) {
    return undefined
  }

  const direct = labels?.[trimmed]
  if (typeof direct === "string" && direct.trim().length > 0) {
    return direct
  }

  const normalizedKey = normalizeLanguageLookupKey(trimmed)
  const indexed = index?.get(normalizedKey)
  if (indexed) {
    return indexed
  }

  if (!labels) {
    return undefined
  }

  for (const [labelKey, value] of Object.entries(labels)) {
    if (
      normalizeLanguageLookupKey(labelKey) === normalizedKey
      && typeof value === "string"
      && value.trim().length > 0
    ) {
      return value
    }
  }

  return undefined
}
