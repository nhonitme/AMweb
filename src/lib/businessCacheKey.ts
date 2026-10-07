import { getCurrentCompanyCd } from "@/lib/login"

type BusinessCachePrimitive = string | number | boolean | null
type BusinessCacheValue = BusinessCachePrimitive | BusinessCacheValue[] | { [key: string]: BusinessCacheValue }

function normalizeName(value: string): string {
  return value.trim()
}

function normalizeCompanyCd(value: string): string {
  return value.trim().toUpperCase() || "DEFAULT"
}

function normalizeCacheValue(value: unknown): BusinessCacheValue {
  if (value === null || value === undefined) {
    return null
  }

  if (value instanceof Date) {
    return value.toISOString()
  }

  if (Array.isArray(value)) {
    return value.map(normalizeCacheValue)
  }

  if (typeof value === "string" || typeof value === "number" || typeof value === "boolean") {
    return value
  }

  if (typeof value === "object") {
    const record = value as Record<string, unknown>
    return Object.keys(record)
      .sort()
      .reduce<{ [key: string]: BusinessCacheValue }>((accumulator, key) => {
        accumulator[key] = normalizeCacheValue(record[key])
        return accumulator
      }, {})
  }

  return String(value)
}

export function buildBusinessCacheKey(cacheName: string, companyCd: string, params?: unknown): string {
  return JSON.stringify([
    normalizeName(cacheName),
    normalizeCompanyCd(companyCd),
    normalizeCacheValue(params ?? {}),
  ])
}

export function buildCurrentCompanyBusinessCacheKey(cacheName: string, params?: unknown): string {
  return buildBusinessCacheKey(cacheName, getCurrentCompanyCd(), params)
}
