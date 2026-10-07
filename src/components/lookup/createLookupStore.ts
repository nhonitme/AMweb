import CustomStore from "devextreme/data/custom_store"

export function createLookupStore<T extends object, K extends Extract<keyof T, string>>(
  key: K,
  loadRows: () => Promise<T[]>,
  getCacheToken?: () => string,
  alternateKeys: Array<Extract<keyof T, string>> = [],
) {
  let cachedRows: T[] | null = null
  let loadingPromise: Promise<T[]> | null = null
  let cacheToken = ""

  const readCacheToken = () => getCacheToken?.() ?? ""

  const resetCache = () => {
    cachedRows = null
    loadingPromise = null
  }

  const ensureCacheScope = () => {
    const nextToken = readCacheToken()

    if (nextToken !== cacheToken) {
      cacheToken = nextToken
      resetCache()
    }
  }

  const loadRowsOnce = async () => {
    ensureCacheScope()

    if (cachedRows) {
      return cachedRows
    }

    if (!loadingPromise) {
      loadingPromise = loadRows()
        .then((rows) => {
          const normalizedRows = Array.isArray(rows) ? rows : []
          cachedRows = normalizedRows
          return normalizedRows
        })
        .catch((error) => {
          cachedRows = null
          throw error
        })
        .finally(() => {
          loadingPromise = null
        })
    }

    return await loadingPromise
  }

  const store = new CustomStore({
    key,
    loadMode: "raw",
    cacheRawData: false,
    load: loadRowsOnce,
    byKey: async (lookupKey) => {
      const rows = await loadRowsOnce()
      const matchesKey = (rowValue: unknown, candidate: unknown) => {
        if (rowValue === candidate) {
          return true
        }

        if (rowValue == null || candidate == null) {
          return false
        }

        if (String(rowValue) === String(candidate)) {
          return true
        }

        const left = Number(rowValue)
        const right = Number(candidate)
        return Number.isFinite(left) && Number.isFinite(right) && left === right
      }

      const primary = rows.find((row) => matchesKey(row[key], lookupKey))
      if (primary) {
        return primary
      }

      for (const alternateKey of alternateKeys) {
        const alternate = rows.find((row) => matchesKey(row[alternateKey], lookupKey))
        if (alternate) {
          return alternate
        }
      }

      return null
    },
  })

  return {
    store,
    clearCache: () => {
      cacheToken = readCacheToken()
      resetCache()
    },
  }
}
