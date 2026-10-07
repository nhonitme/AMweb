import { useCallback, useEffect, useMemo, useState } from "react"
import type { Format as LocalizationFormat } from "devextreme/common/core/localization"
import {
  buildDecimalFormat,
  clearDecimalSettingsCache,
  loadDecimalSettings,
  resolveDecimalSetting,
  subscribeDecimalSettingUpdates,
} from "@/lib/decimalSettingCache"
import type { DecimalSettingRule } from "@/lib/decimalSettingCache"

export type DecimalColumnFormat = LocalizationFormat | string

type UseDecimalColumnFormatsResult = {
  rules: DecimalSettingRule[]
  formatMap: Record<string, DecimalColumnFormat>
  formatVersion: number
  getFormat: (fieldName: string, fallback?: DecimalColumnFormat) => DecimalColumnFormat
}

const DEFAULT_NUMBER_FORMAT = "#,##0"

function normalizeFieldName(fieldName: string): string {
  return String(fieldName ?? "").trim().toUpperCase()
}

export function clearDecimalColumnFormatCache() {
  clearDecimalSettingsCache()
}

export function useDecimalColumnFormats(): UseDecimalColumnFormatsResult {
  const [cacheVersion, setCacheVersion] = useState(0)
  const [rules, setRules] = useState<DecimalSettingRule[]>([])

  useEffect(() => {
    let active = true

    const loadSettings = async () => {
      try {
        const loadedRules = await loadDecimalSettings()
        if (!active) return

        setRules(loadedRules)
      } catch (error) {
        console.error("Failed to load decimal settings", error)
      }
    }

    void loadSettings()

    return () => {
      active = false
    }
  }, [cacheVersion])

  useEffect(() => {
    const unsubscribe = subscribeDecimalSettingUpdates(() => {
      setCacheVersion((current) => current + 1)
    })

    return unsubscribe
  }, [])

  const formatMap = useMemo<Record<string, DecimalColumnFormat>>(() => {
    const nextMap: Record<string, DecimalColumnFormat> = {}

    rules.forEach((rule) => {
      const fieldName = normalizeFieldName(rule.FIELD_NAME)
      if (!fieldName) return

      const format = buildDecimalFormat(rule)
      if (format) {
        nextMap[fieldName] = format
      }
    })

    return nextMap
  }, [rules])

  const getFormat = useCallback(
    (fieldName: string, fallback: DecimalColumnFormat = DEFAULT_NUMBER_FORMAT): DecimalColumnFormat => {
      const normalized = normalizeFieldName(fieldName)
      if (!normalized) return fallback

      const exactFormat = formatMap[normalized]
      if (exactFormat) return exactFormat

      const resolvedRule = resolveDecimalSetting(rules, normalized)
      if (resolvedRule) {
        return buildDecimalFormat(resolvedRule) ?? fallback
      }

      return fallback
    },
    [formatMap, rules],
  )

  return {
    rules,
    formatMap,
    formatVersion: cacheVersion,
    getFormat,
  }
}
