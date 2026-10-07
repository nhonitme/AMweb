import { useEffect, useState } from "react"

import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"

export const COMPANY_LANG_KEYS = ["VIET", "ENG", "KOR", "CHINA"] as const
export type CompanyLangKey = (typeof COMPANY_LANG_KEYS)[number]

export type CompanyLangSetting = {
  lang: CompanyLangKey
  isActive: boolean
  sort: number
}

export type CompanyLangState = {
  configured: boolean
  defaultLang: CompanyLangKey
  languages: CompanyLangSetting[]
}

type ApiEnvelope<T> = {
  Data?: T
  data?: T
}

const listeners = new Set<() => void>()
let revision = 0
let loadPromise: Promise<CompanyLangState> | null = null
let loadedCompanyCd = ""
let state: CompanyLangState = {
  configured: false,
  defaultLang: "VIET",
  languages: COMPANY_LANG_KEYS.map((lang, index) => ({
    lang,
    isActive: lang !== "CHINA",
    sort: index + 1,
  })),
}

function notify() {
  revision += 1
  listeners.forEach((listener) => {
    try {
      listener()
    } catch (error) {
      console.error("companyLang subscriber error", error)
    }
  })
}

export function subscribeCompanyLang(listener: () => void): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

export function getCompanyLangRevision(): number {
  return revision
}

export function useCompanyLangRevision(): number {
  const [value, setValue] = useState(revision)
  useEffect(() => subscribeCompanyLang(() => setValue(revision)), [])
  return value
}

export function isCompanyLangKey(value: string): value is CompanyLangKey {
  return (COMPANY_LANG_KEYS as readonly string[]).includes(value)
}

export function getCompanyLangState(): CompanyLangState {
  return state
}

export function getCompanyLangKey(fieldName: string | null | undefined): CompanyLangKey | null {
  const upper = String(fieldName ?? "").trim().toUpperCase()
  if (!upper) {
    return null
  }

  if (upper.endsWith("_VIET")) return "VIET"
  if (upper.endsWith("_ENG")) return "ENG"
  if (upper.endsWith("_KOR")) return "KOR"
  if (upper.endsWith("_CHINA") || upper.endsWith("_CHN")) return "CHINA"
  if (/(?:NM|NAME|ADDRESS|DESC)_EN$/.test(upper)) return "ENG"
  return null
}

export function getLangFieldBase(fieldName: string | null | undefined): string | null {
  const upper = String(fieldName ?? "").trim().toUpperCase()
  const key = getCompanyLangKey(upper)
  if (!key || !upper) {
    return null
  }

  if (upper.endsWith("_CHINA")) return upper.slice(0, -6)
  if (upper.endsWith("_CHN")) return upper.slice(0, -4)
  if (upper.endsWith("_VIET") || upper.endsWith("_ENG") || upper.endsWith("_KOR")) return upper.slice(0, -5)
  if (upper.endsWith("_EN")) return upper.slice(0, -3)
  return null
}

export function isLangSuffixVisible(lang: CompanyLangKey): boolean {
  if (lang === "CHINA") {
    return false
  }

  if (!state.configured) {
    return true
  }

  return state.languages.some((item) => item.lang === lang && item.isActive)
}

export function isLangFieldVisible(fieldName: string | null | undefined): boolean {
  const key = getCompanyLangKey(fieldName)
  if (!key) {
    return true
  }

  return isLangSuffixVisible(key)
}

export function shouldHideLangColumn(fieldName: string, allFieldNames: string[]): boolean {
  const key = getCompanyLangKey(fieldName)
  const base = getLangFieldBase(fieldName)
  if (!key || !base || isLangSuffixVisible(key)) {
    return false
  }

  const siblings = allFieldNames.filter((name) => getLangFieldBase(name) === base)
  return siblings.length > 1
}

export function isDefaultLangField(fieldName: string | null | undefined): boolean {
  const key = getCompanyLangKey(fieldName)
  if (!key || !isLangSuffixVisible(key)) {
    return false
  }

  return key === state.defaultLang
}

export function filterActiveLangFields(fields: string[]): string[] {
  return fields.filter((field) => isLangFieldVisible(field))
}

function readRowText(row: Record<string, unknown>, fieldName: string): string {
  const direct = row[fieldName]
  if (direct !== undefined && direct !== null && String(direct).trim()) {
    return String(direct).trim()
  }

  const match = Object.keys(row).find((key) => key.toUpperCase() === fieldName)
  if (!match) {
    return ""
  }

  return String(row[match] ?? "").trim()
}

function fieldNamesFor(base: string, lang: CompanyLangKey): string[] {
  if (lang === "CHINA") {
    return [`${base}_CHINA`, `${base}_CHN`]
  }

  if (lang === "ENG") {
    return [`${base}_ENG`, `${base}_EN`]
  }

  return [`${base}_${lang}`]
}

export function pickLocalizedText(row: object | null | undefined, base: string): string {
  if (!row || typeof row !== "object") {
    return ""
  }

  const record = row as Record<string, unknown>
  const prefix = base.trim().toUpperCase()
  if (!prefix) {
    return ""
  }

  const order = state.configured
    ? [state.defaultLang, ...state.languages.filter((item) => item.isActive && item.lang !== state.defaultLang).map((item) => item.lang)]
    : [...COMPANY_LANG_KEYS]

  for (const lang of order) {
    if (!isLangSuffixVisible(lang)) {
      continue
    }

    for (const fieldName of fieldNamesFor(prefix, lang)) {
      const text = readRowText(record, fieldName)
      if (text) {
        return text
      }
    }
  }

  return ""
}

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (!payload || typeof payload !== "object") {
    return payload as T
  }

  const envelope = payload as ApiEnvelope<T>
  return (envelope.Data ?? envelope.data ?? payload) as T
}

function asConfigRows(payload: unknown): Array<Record<string, unknown>> {
  const data = unwrap(payload)
  if (Array.isArray(data)) {
    return data as Array<Record<string, unknown>>
  }

  if (data && typeof data === "object") {
    const nested = (data as { data?: unknown; Data?: unknown }).data ?? (data as { Data?: unknown }).Data
    if (Array.isArray(nested)) {
      return nested as Array<Record<string, unknown>>
    }
  }

  return []
}

function readFlag(row: Record<string, unknown>, name: string): string {
  const match = Object.keys(row).find((key) => key.toUpperCase() === name)
  return String(match ? row[match] : "").trim().toUpperCase()
}

export function toUiLanguageCode(lang: CompanyLangKey): string {
  return lang === "CHINA" ? "CHN" : lang
}

export function isUiLanguageEnabled(code: string | null | undefined): boolean {
  const upper = String(code ?? "").trim().toUpperCase()
  const key = upper === "CHN" ? "CHINA" : upper
  if (!isCompanyLangKey(key)) {
    return !state.configured
  }

  return isLangSuffixVisible(key)
}

export function parseCompanyLangRows(rows: Array<Record<string, unknown>>): CompanyLangState {
  const configured = rows.some((row) => isCompanyLangKey(readFlag(row, "CONFIG_KEY")))
  const languages = COMPANY_LANG_KEYS.map((lang, index) => {
    const row = rows.find((item) => readFlag(item, "CONFIG_KEY") === lang)
    const sort = Number(readFlag(row ?? {}, "CONFIG_VALUE"))
    return {
      lang,
      isActive: lang === "CHINA" ? false : configured ? Boolean(row) && readFlag(row ?? {}, "IS_ACTIVE") !== "0" : true,
      sort: Number.isFinite(sort) && sort > 0 ? sort : index + 1,
    }
  })
  const defaultRow = rows.find((row) => readFlag(row, "CONFIG_KEY") === "DEFAULT")
  const requested = readFlag(defaultRow ?? {}, "CONFIG_VALUE")
  const defaultLang = isCompanyLangKey(requested) && languages.some((item) => item.lang === requested && item.isActive)
    ? requested
    : languages.find((item) => item.isActive)?.lang ?? "VIET"

  return {
    configured,
    defaultLang,
    languages,
  }
}

export function clearCompanyLangCache(publish = true): void {
  loadedCompanyCd = ""
  loadPromise = null
  state = {
    configured: false,
    defaultLang: "VIET",
    languages: COMPANY_LANG_KEYS.map((lang, index) => ({
      lang,
      isActive: lang !== "CHINA",
      sort: index + 1,
    })),
  }
  if (publish) {
    notify()
  }
}

export async function loadCompanyLangSettings(companyCd: string, force = false): Promise<CompanyLangState> {
  const resolved = companyCd.trim()
  if (!resolved) {
    clearCompanyLangCache()
    return state
  }

  if (!force && loadedCompanyCd === resolved && loadPromise) {
    return loadPromise
  }

  loadedCompanyCd = resolved
  loadPromise = axios
    .get(`${API_BASE_URL}/SysConfig`, {
      params: { configGroup: "LANG", activeOnly: false },
    })
    .then((response) => {
      const rows = asConfigRows(response.data)
      state = parseCompanyLangRows(rows)
      notify()
      return state
    })
    .catch((error) => {
      console.error("load company lang settings failed", error)
      state = { ...state, configured: false }
      notify()
      return state
    })

  return loadPromise
}
