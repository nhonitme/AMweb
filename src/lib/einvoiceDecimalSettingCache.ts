import { getEInvoiceDecimalSettings } from "@/api/einvoiceSettingApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { EInvoiceDecimalSetting, EInvoiceDecimalSettingSearchParams } from "@/types/einvoiceSetting"

const STORAGE_KEY_PREFIX = "einvoice-decimal-setting-cache"
const cacheByKey = new Map<string, Promise<EInvoiceDecimalSetting[]>>()

function normalizeXslId(value: unknown): number {
  const xslId = Number(value ?? 0)
  return Number.isFinite(xslId) && xslId > 0 ? Math.trunc(xslId) : 0
}

function buildCacheKey(companyCd: string, params: EInvoiceDecimalSettingSearchParams): string {
  const xslId = normalizeXslId(params.xslId)
  const includeInactive = params.includeInactive === true ? 1 : 0
  return `${companyCd}|${xslId}|${includeInactive}`
}

function getStorageKey(cacheKey: string): string {
  return `${STORAGE_KEY_PREFIX}-${cacheKey}`
}

export async function loadEInvoiceDecimalSettings(
  params: EInvoiceDecimalSettingSearchParams = {},
  forceRefresh = false,
): Promise<EInvoiceDecimalSetting[]> {
  const companyCd = getCurrentCompanyCd()
  if (!companyCd) {
    return []
  }

  const cacheKey = buildCacheKey(companyCd, params)

  if (!forceRefresh) {
    const cachedPromise = cacheByKey.get(cacheKey)
    if (cachedPromise) {
      return cachedPromise
    }

    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(getStorageKey(cacheKey))
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as EInvoiceDecimalSetting[]
          const promise = Promise.resolve(Array.isArray(parsed) ? parsed : [])
          cacheByKey.set(cacheKey, promise)
          return promise
        } catch {
          window.sessionStorage.removeItem(getStorageKey(cacheKey))
        }
      }
    }
  } else {
    cacheByKey.delete(cacheKey)
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(getStorageKey(cacheKey))
    }
  }

  const promise = getEInvoiceDecimalSettings(params)
    .then((response) => {
      const data = Array.isArray(response.data) ? response.data : []
      if (typeof window !== "undefined") {
        window.sessionStorage.setItem(getStorageKey(cacheKey), JSON.stringify(data))
      }
      return data
    })
    .catch((error) => {
      cacheByKey.delete(cacheKey)
      throw error
    })

  cacheByKey.set(cacheKey, promise)
  return promise
}

export function clearEInvoiceDecimalSettingsCache(companyCd?: string): void {
  if (companyCd === "") {
    cacheByKey.clear()
    if (typeof window !== "undefined") {
      for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
        const storageKey = window.sessionStorage.key(index)
        if (storageKey?.startsWith(`${STORAGE_KEY_PREFIX}-`)) {
          window.sessionStorage.removeItem(storageKey)
        }
      }
    }
    return
  }

  const resolvedCompanyCd = (companyCd ?? getCurrentCompanyCd()).trim()
  if (!resolvedCompanyCd) {
    cacheByKey.clear()
    return
  }

  for (const key of [...cacheByKey.keys()]) {
    if (key.startsWith(`${resolvedCompanyCd}|`)) {
      cacheByKey.delete(key)
    }
  }

  if (typeof window === "undefined") {
    return
  }

  for (let index = window.sessionStorage.length - 1; index >= 0; index -= 1) {
    const storageKey = window.sessionStorage.key(index)
    if (storageKey?.startsWith(`${STORAGE_KEY_PREFIX}-${resolvedCompanyCd}|`)) {
      window.sessionStorage.removeItem(storageKey)
    }
  }
}
