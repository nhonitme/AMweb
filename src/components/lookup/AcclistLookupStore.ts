import { getCurrentCompanyCd } from "@/lib/login"
import type { etcData } from "@/types/etcData"
import { createLookupStore } from "./createLookupStore"
import { EtcType, getEtcData } from "@/api/systemApi"
import type CustomStore from "devextreme/data/custom_store"

type EtcDataPayload = etcData[] | { data?: etcData[] | null } | null | undefined

export type AcclistLookupStoreOptions = {
  etcType?: EtcType
  param1?: string
  param2?: string
}

function normalizeEtcDataRows(response: EtcDataPayload): etcData[] {
  if (Array.isArray(response)) {
    return response
  }

  return Array.isArray(response?.data) ? response.data : []
}

function buildAcclistLookupStoreKey(options: AcclistLookupStoreOptions = {}): string {
  const etcType = options.etcType ?? EtcType.cbxAccount
  const param1 = options.param1 ?? ""
  const param2 = options.param2 ?? ""
  return `${getCurrentCompanyCd()}|${etcType}|${param1}|${param2}`
}

export function createAcclistLookupStore(options: AcclistLookupStoreOptions = {}) {
  const {
    etcType = EtcType.cbxAccount,
    param1 = "",
    param2 = "",
  } = options

  return createLookupStore<etcData, "CD">(
    "CD",
    async () => {
      const response = await getEtcData<EtcDataPayload>(etcType, param1, param2)
      return normalizeEtcDataRows(response)
    },
    () => `${getCurrentCompanyCd()}|${etcType}|${param1}|${param2}`,
  )
}

const acclistStoreCache = new Map<string, ReturnType<typeof createAcclistLookupStore>>()
const detailAccountLookupStore = createAcclistLookupStore({ etcType: EtcType.cbxAccount })
const reportAccountLookupStore = createAcclistLookupStore({ etcType: EtcType.cbxAccountParent })

export const LookupStore = detailAccountLookupStore.store
export const reportAccountLookupStoreInstance = reportAccountLookupStore.store
export function getAcclistLookupStore(options: AcclistLookupStoreOptions = {}): CustomStore {
  const key = buildAcclistLookupStoreKey(options)
  let entry = acclistStoreCache.get(key)

  if (!entry) {
    entry = createAcclistLookupStore(options)
    acclistStoreCache.set(key, entry)
  }

  return entry.store
}

export function clearAcclistLookupCache(): void {
  acclistStoreCache.forEach((entry) => entry.clearCache())
  acclistStoreCache.clear()
  detailAccountLookupStore.clearCache()
  reportAccountLookupStore.clearCache()
}

export async function reloadAcclistLookupStore(
  options: AcclistLookupStoreOptions = { etcType: EtcType.cbxAccount },
): Promise<void> {
  const key = buildAcclistLookupStoreKey(options)
  acclistStoreCache.get(key)?.clearCache()
  await getAcclistLookupStore(options).load()
}
