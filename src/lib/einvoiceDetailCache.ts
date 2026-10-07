import { getEInvoice } from "@/api/einvoiceApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { EInvoiceApi } from "@/types/einvoice"

const STORAGE_KEY_PREFIX = "einvoice-detail-cache"
const cacheByKey = new Map<string, Promise<EInvoiceApi>>()

type CachedEInvoiceDetail = {
  docVersion: number
  data: EInvoiceApi
}

function buildCacheKey(companyCd: string, invoiceId: number): string {
  return `${companyCd}|${invoiceId}`
}

function getStorageKey(cacheKey: string): string {
  return `${STORAGE_KEY_PREFIX}-${cacheKey}`
}

function readCachedDetail(cacheKey: string): CachedEInvoiceDetail | null {
  if (typeof window === "undefined") {
    return null
  }

  const stored = window.sessionStorage.getItem(getStorageKey(cacheKey))
  if (!stored) {
    return null
  }

  try {
    const parsed = JSON.parse(stored) as CachedEInvoiceDetail
    if (!parsed || typeof parsed !== "object" || !parsed.data) {
      return null
    }

    return {
      docVersion: Number(parsed.docVersion) > 0 ? Number(parsed.docVersion) : 1,
      data: parsed.data,
    }
  } catch {
    window.sessionStorage.removeItem(getStorageKey(cacheKey))
    return null
  }
}

function writeCachedDetail(cacheKey: string, data: EInvoiceApi): void {
  const docVersion = Number(data.DOC_VERSION) > 0 ? Number(data.DOC_VERSION) : 1
  const payload: CachedEInvoiceDetail = { docVersion, data }

  if (typeof window !== "undefined") {
    window.sessionStorage.setItem(getStorageKey(cacheKey), JSON.stringify(payload))
  }
}

export function peekEInvoiceDetailDocVersion(invoiceId: number): number | null {
  const companyCd = getCurrentCompanyCd().trim()
  if (!companyCd || invoiceId <= 0) {
    return null
  }

  const cached = readCachedDetail(buildCacheKey(companyCd, invoiceId))
  return cached?.docVersion ?? null
}

export function saveEInvoiceDetailCache(data: EInvoiceApi): void {
  const companyCd = getCurrentCompanyCd().trim()
  const invoiceId = Number(data.INVOICE_ID ?? 0)
  if (!companyCd || invoiceId <= 0) {
    return
  }

  const cacheKey = buildCacheKey(companyCd, invoiceId)
  writeCachedDetail(cacheKey, data)
  cacheByKey.set(cacheKey, Promise.resolve(data))
}

export function clearEInvoiceDetailCache(invoiceId?: number, companyCd?: string): void {
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

  if (invoiceId && invoiceId > 0) {
    const cacheKey = buildCacheKey(resolvedCompanyCd, invoiceId)
    cacheByKey.delete(cacheKey)
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(getStorageKey(cacheKey))
    }
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

export async function loadEInvoiceDetail(invoiceId: number, forceRefresh = false): Promise<EInvoiceApi> {
  const companyCd = getCurrentCompanyCd().trim()
  if (!companyCd || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  const cacheKey = buildCacheKey(companyCd, invoiceId)

  if (!forceRefresh) {
    const cachedPromise = cacheByKey.get(cacheKey)
    if (cachedPromise) {
      return cachedPromise
    }

    const cached = readCachedDetail(cacheKey)
    if (cached) {
      const promise = Promise.resolve(cached.data)
      cacheByKey.set(cacheKey, promise)
      return promise
    }
  } else {
    cacheByKey.delete(cacheKey)
    if (typeof window !== "undefined") {
      window.sessionStorage.removeItem(getStorageKey(cacheKey))
    }
  }

  const promise = getEInvoice(invoiceId)
    .then((response) => {
      const data = response.data
      writeCachedDetail(cacheKey, data)
      return data
    })
    .catch((error) => {
      cacheByKey.delete(cacheKey)
      throw error
    })

  cacheByKey.set(cacheKey, promise)
  return promise
}

export function isEInvoiceVersionConflictError(message: string): boolean {
  const normalized = message.trim().toLowerCase()
  return normalized.includes("version conflict") || normalized.includes("doc_version")
}
