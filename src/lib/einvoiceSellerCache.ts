import { getEInvoiceSellers } from "@/api/einvoiceApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { EInvoiceSeller, EInvoiceSellerSearchParams } from "@/types/einvoice"

const STORAGE_KEY_PREFIX = "einvoice-seller-cache"
const cacheByKey = new Map<string, Promise<EInvoiceSeller[]>>()

function normalizeSellerId(value: unknown): number {
  const sellerId = Number(value ?? 0)
  return Number.isFinite(sellerId) && sellerId > 0 ? Math.trunc(sellerId) : 0
}

function buildCacheKey(companyCd: string, params: EInvoiceSellerSearchParams): string {
  const khhdon = (params.khhdon ?? "").trim()
  const sellerId = normalizeSellerId(params.sellerId)
  const keyword = (params.keyword ?? "").trim()
  const includeInactive = params.includeInactive === true ? 1 : 0
  const includeAllTemplates = params.includeAllTemplates === true ? 1 : 0
  return `${companyCd}|${khhdon}|${sellerId}|${keyword}|${includeInactive}|${includeAllTemplates}`
}

function getStorageKey(cacheKey: string): string {
  return `${STORAGE_KEY_PREFIX}-${cacheKey}`
}

export async function loadEInvoiceSellers(
  params: EInvoiceSellerSearchParams | string = {},
  forceRefresh = false,
): Promise<EInvoiceSeller[]> {
  const normalizedParams: EInvoiceSellerSearchParams =
    typeof params === "string" ? { khhdon: params } : params

  const companyCd = getCurrentCompanyCd()
  if (!companyCd) {
    return []
  }

  const cacheKey = buildCacheKey(companyCd, normalizedParams)

  if (!forceRefresh) {
    const cachedPromise = cacheByKey.get(cacheKey)
    if (cachedPromise) {
      return cachedPromise
    }

    if (typeof window !== "undefined") {
      const stored = window.sessionStorage.getItem(getStorageKey(cacheKey))
      if (stored) {
        try {
          const parsed = JSON.parse(stored) as EInvoiceSeller[]
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

  const promise = getEInvoiceSellers(normalizedParams)
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

/** @deprecated Use loadEInvoiceSellers */
export const loadEInvoiceSellerSettings = loadEInvoiceSellers

export function clearEInvoiceSellersCache(companyCd?: string): void {
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

/** @deprecated Use clearEInvoiceSellersCache */
export const clearEInvoiceSellerSettingsCache = clearEInvoiceSellersCache
