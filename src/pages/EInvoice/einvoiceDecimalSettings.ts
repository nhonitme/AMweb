import { useMemo } from "react"
import type { Format as LocalizationFormat } from "devextreme/common/core/localization"

import { useEInvoiceSettingDecimalsQuery } from "@/hooks/queries/useEInvoiceSettingQueries"
import { DEFAULT_CURRENCY_CODE, isForeignCurrencyCode, normalizeCurrencyCode } from "@/lib/currency"
import type {
  EInvoiceDecimalApplyTarget,
  EInvoiceDecimalCurrencyScope,
  EInvoiceDecimalFieldScope,
  EInvoiceDecimalRoundMode,
  EInvoiceDecimalSetting,
} from "@/types/einvoiceSetting"

export type EInvoiceDecimalFormat = LocalizationFormat

const DEFAULT_APPLY_TARGET_PRIORITIES: EInvoiceDecimalApplyTarget[] = ["UI", "TAX_XML", "INTERNAL_REPORT"]

export interface EInvoiceDecimalResolver {
  rules: EInvoiceDecimalSetting[]
  version: number
  getRule: (
    fieldScope: EInvoiceDecimalFieldScope,
    fieldKey: string,
    currencyCode?: string | null,
  ) => EInvoiceDecimalSetting | null
  getPrecision: (
    fieldScope: EInvoiceDecimalFieldScope,
    fieldKey: string,
    currencyCode: string | null | undefined,
    fallbackPrecision: number,
  ) => number
  getFormat: (
    fieldScope: EInvoiceDecimalFieldScope,
    fieldKey: string,
    currencyCode: string | null | undefined,
    fallbackPrecision: number,
  ) => EInvoiceDecimalFormat
  round: (
    fieldScope: EInvoiceDecimalFieldScope,
    fieldKey: string,
    value: number,
    currencyCode?: string | null,
  ) => number
  roundNullable: (
    fieldScope: EInvoiceDecimalFieldScope,
    fieldKey: string,
    value: number | null | undefined,
    currencyCode?: string | null,
  ) => number | null
}

const FIELD_NAME_ALIASES: Record<string, string> = {
  TGTTHUE: "TGTTTHUE",
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeFieldName(value: unknown): string {
  const normalized = normalizeText(value).replace(/\s+/g, "").toUpperCase()
  return FIELD_NAME_ALIASES[normalized] ?? normalized
}

function normalizeFieldScope(value: unknown): EInvoiceDecimalFieldScope {
  return normalizeText(value).toUpperCase() === "DETAIL" ? "DETAIL" : "HEADER"
}

function normalizeApplyTarget(value: unknown): EInvoiceDecimalApplyTarget {
  const normalized = normalizeText(value).toUpperCase()
  if (normalized === "INTERNAL_REPORT" || normalized === "UI") {
    return normalized
  }

  return "TAX_XML"
}

function normalizeCurrencyScope(value: unknown): EInvoiceDecimalCurrencyScope {
  const normalized = normalizeText(value).toUpperCase()
  if (normalized === "VND" || normalized === "FC") {
    return normalized
  }

  return "ANY"
}

function normalizeRoundMode(value: unknown): EInvoiceDecimalRoundMode {
  const normalized = normalizeText(value).toUpperCase()
  if (normalized === "TRUNCATE" || normalized === "CEIL" || normalized === "FLOOR") {
    return normalized
  }

  return "ROUND"
}

function normalizeScale(value: unknown): number {
  const numeric = Number(value ?? 2)
  if (!Number.isFinite(numeric)) {
    return 2
  }

  return Math.max(0, Math.min(12, Math.trunc(numeric)))
}

function normalizeSetting(row: EInvoiceDecimalSetting): EInvoiceDecimalSetting {
  return {
    ...row,
    XSL_ID: Number.isFinite(Number(row.XSL_ID)) ? Math.max(0, Math.trunc(Number(row.XSL_ID))) : 0,
    APPLY_TARGET: normalizeApplyTarget(row.APPLY_TARGET),
    FIELD_SCOPE: normalizeFieldScope(row.FIELD_SCOPE),
    FIELD_NAME: normalizeFieldName(row.FIELD_NAME),
    CURRENCY_SCOPE: normalizeCurrencyScope(row.CURRENCY_SCOPE),
    DECIMAL_SCALE: normalizeScale(row.DECIMAL_SCALE),
    ROUND_MODE: normalizeRoundMode(row.ROUND_MODE),
    IS_ACTIVE: Number(row.IS_ACTIVE) === 1 ? 1 : 0,
    SORT_ORDER: Number.isFinite(Number(row.SORT_ORDER)) ? Math.trunc(Number(row.SORT_ORDER)) : 0,
  }
}

function normalizeRules(rules: EInvoiceDecimalSetting[]): EInvoiceDecimalSetting[] {
  return rules
    .map(normalizeSetting)
    .filter((rule) => rule.IS_ACTIVE === 1 && rule.FIELD_NAME.length > 0)
    .sort((left, right) => {
      const sortOrder = left.SORT_ORDER - right.SORT_ORDER
      if (sortOrder !== 0) {
        return sortOrder
      }

      return left.SETTING_ID - right.SETTING_ID
    })
}

function resolveCurrencyScope(fieldName: string, currencyCode?: string | null): EInvoiceDecimalCurrencyScope {
  if (normalizeFieldName(fieldName).endsWith("_VND")) {
    return "VND"
  }

  const normalizedCurrency = normalizeCurrencyCode(currencyCode) || DEFAULT_CURRENCY_CODE
  return isForeignCurrencyCode(normalizedCurrency) ? "FC" : "VND"
}

function roundWithMode(value: number, precision: number, roundMode: EInvoiceDecimalRoundMode): number {
  if (!Number.isFinite(value)) {
    return value
  }

  const factor = 10 ** normalizeScale(precision)
  const scaled = value * factor

  switch (roundMode) {
    case "TRUNCATE":
      return (scaled < 0 ? Math.ceil(scaled) : Math.floor(scaled)) / factor
    case "CEIL":
      return Math.ceil(scaled) / factor
    case "FLOOR":
      return Math.floor(scaled) / factor
    default:
      return (Math.sign(scaled) * Math.round(Math.abs(scaled) + Number.EPSILON)) / factor
  }
}

function createFixedPointFormat(precision: number): EInvoiceDecimalFormat {
  return {
    type: "fixedPoint",
    precision: normalizeScale(precision),
  }
}

function pickFieldRule(
  fieldRules: EInvoiceDecimalSetting[],
  fieldScope: EInvoiceDecimalFieldScope,
  fieldKey: string,
  currencyScope: EInvoiceDecimalCurrencyScope,
): EInvoiceDecimalSetting | null {
  return (
    fieldRules.find((rule) => rule.FIELD_SCOPE === fieldScope && rule.FIELD_NAME === fieldKey && rule.CURRENCY_SCOPE === currencyScope) ??
    fieldRules.find((rule) => rule.FIELD_SCOPE === fieldScope && rule.FIELD_NAME === fieldKey && rule.CURRENCY_SCOPE === "ANY") ??
    null
  )
}

function createEInvoiceDecimalResolver(
  rules: EInvoiceDecimalSetting[],
  version: number,
  applyTargetPriorities: EInvoiceDecimalApplyTarget[] = DEFAULT_APPLY_TARGET_PRIORITIES,
): EInvoiceDecimalResolver {
  const normalizedRules = normalizeRules(rules)

  const getRule: EInvoiceDecimalResolver["getRule"] = (fieldScope, fieldKey, currencyCode) => {
    const normalizedScope = normalizeFieldScope(fieldScope)
    const normalizedFieldKey = normalizeFieldName(fieldKey)
    if (!normalizedFieldKey) {
      return null
    }

    const desiredCurrencyScope = resolveCurrencyScope(normalizedFieldKey, currencyCode)

    for (const applyTarget of applyTargetPriorities) {
      const targetRules = normalizedRules.filter((rule) => rule.APPLY_TARGET === applyTarget)
      const matched = pickFieldRule(targetRules, normalizedScope, normalizedFieldKey, desiredCurrencyScope)
      if (matched) {
        return matched
      }
    }

    return null
  }

  const getPrecision: EInvoiceDecimalResolver["getPrecision"] = (fieldScope, fieldKey, currencyCode, fallbackPrecision) => {
    return getRule(fieldScope, fieldKey, currencyCode)?.DECIMAL_SCALE ?? normalizeScale(fallbackPrecision)
  }

  const round: EInvoiceDecimalResolver["round"] = (fieldScope, fieldKey, value, currencyCode) => {
    const numeric = Number(value)
    if (!Number.isFinite(numeric)) {
      return 0
    }

    const rule = getRule(fieldScope, fieldKey, currencyCode)
    return rule ? roundWithMode(numeric, rule.DECIMAL_SCALE, rule.ROUND_MODE) : numeric
  }

  return {
    rules: normalizedRules,
    version,
    getRule,
    getPrecision,
    getFormat: (fieldScope, fieldKey, currencyCode, fallbackPrecision) =>
      createFixedPointFormat(getPrecision(fieldScope, fieldKey, currencyCode, fallbackPrecision)),
    round,
    roundNullable: (fieldScope, fieldKey, value, currencyCode) => {
      if (value === null || value === undefined) {
        return null
      }

      const numeric = Number(value)
      return Number.isFinite(numeric) ? round(fieldScope, fieldKey, numeric, currencyCode) : null
    },
  }
}

export function useEInvoiceDecimalResolver(
  applyTarget: EInvoiceDecimalApplyTarget | "ALL" = "ALL",
  xslId = 0,
): EInvoiceDecimalResolver {
  const normalizedXslId = Number.isFinite(Number(xslId)) && Number(xslId) > 0 ? Number(xslId) : 0
  const applyTargetPriorities = useMemo<EInvoiceDecimalApplyTarget[]>(() => {
    if (applyTarget === "ALL" || applyTarget === "UI") {
      return DEFAULT_APPLY_TARGET_PRIORITIES
    }

    return [applyTarget]
  }, [applyTarget])

  const { data: rules = [], dataUpdatedAt } = useEInvoiceSettingDecimalsQuery(normalizedXslId, true, {
    includeInactive: false,
  })

  return useMemo(
    () => createEInvoiceDecimalResolver(rules, dataUpdatedAt, applyTargetPriorities),
    [applyTargetPriorities, dataUpdatedAt, rules],
  )
}

export function formatEInvoiceDecimalValue(
  value: unknown,
  resolver: EInvoiceDecimalResolver,
  fieldScope: EInvoiceDecimalFieldScope,
  fieldKey: string,
  currencyCode: string | null | undefined,
  fallbackPrecision: number,
): string {
  if (value === null || value === undefined || value === "") {
    return ""
  }

  const numeric = Number(value)
  if (!Number.isFinite(numeric)) {
    return String(value)
  }

  const precision = resolver.getPrecision(fieldScope, fieldKey, currencyCode, fallbackPrecision)
  return new Intl.NumberFormat(undefined, {
    minimumFractionDigits: precision,
    maximumFractionDigits: precision,
  }).format(numeric)
}

export function getEInvoiceMoneyFallbackPrecision(currencyCode: string | null | undefined): number {
  return isForeignCurrencyCode(currencyCode) ? 2 : 0
}

export function getEInvoiceRateFallbackPrecision(): number {
  return 6
}

export function getEInvoiceQuantityFallbackPrecision(): number {
  return 6
}

export function getEInvoiceDiscountRateFallbackPrecision(): number {
  return 4
}
