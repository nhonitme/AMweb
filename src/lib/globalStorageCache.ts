export type GlobalStorageArea = "local" | "session"

const GLOBAL_STORAGE_PREFIX = "amnote_global"

function normalizeStoragePart(value: string): string {
  return value.trim().replace(/[^a-zA-Z0-9_-]/g, "_")
}

function resolveStorage(area: GlobalStorageArea): Storage | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    return area === "session" ? window.sessionStorage : window.localStorage
  } catch {
    return null
  }
}

export function buildGlobalStorageKey(namespace: string, key: string): string {
  return [
    GLOBAL_STORAGE_PREFIX,
    normalizeStoragePart(namespace),
    normalizeStoragePart(key),
  ].join(":")
}

export function readGlobalStorageItem<T>(
  namespace: string,
  key: string,
  area: GlobalStorageArea = "local",
): T | null {
  const storage = resolveStorage(area)
  if (!storage) {
    return null
  }

  const storageKey = buildGlobalStorageKey(namespace, key)
  const rawValue = storage.getItem(storageKey)
  if (!rawValue) {
    return null
  }

  try {
    return JSON.parse(rawValue) as T
  } catch {
    storage.removeItem(storageKey)
    return null
  }
}

export function writeGlobalStorageItem<T>(
  namespace: string,
  key: string,
  value: T,
  area: GlobalStorageArea = "local",
): void {
  const storage = resolveStorage(area)
  if (!storage) {
    return
  }

  try {
    storage.setItem(buildGlobalStorageKey(namespace, key), JSON.stringify(value))
  } catch {
  }
}

export function removeGlobalStorageItem(
  namespace: string,
  key: string,
  area: GlobalStorageArea = "local",
): void {
  const storage = resolveStorage(area)
  if (!storage) {
    return
  }

  try {
    storage.removeItem(buildGlobalStorageKey(namespace, key))
  } catch {
  }
}

export function clearGlobalStorageNamespace(
  namespace: string,
  area: GlobalStorageArea = "local",
): void {
  const storage = resolveStorage(area)
  if (!storage) {
    return
  }

  const prefix = `${GLOBAL_STORAGE_PREFIX}:${normalizeStoragePart(namespace)}:`
  const keys: string[] = []

  try {
    for (let index = 0; index < storage.length; index += 1) {
      const storageKey = storage.key(index)
      if (storageKey?.startsWith(prefix)) {
        keys.push(storageKey)
      }
    }

    keys.forEach((storageKey) => storage.removeItem(storageKey))
  } catch {
  }
}
