import { getStoreInfos } from "@/api/storeAPI"
import type { StoreInfo } from "@/types/store"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<StoreInfo>("STORE_ID", async () => {
  const response = await getStoreInfos()
  return Array.isArray(response.data) ? response.data : []
})

export const warehouseLookupStore = store
export const clearWarehouseLookupCache = clearCache
