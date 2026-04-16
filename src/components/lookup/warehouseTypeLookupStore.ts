import { getStoreKindInfos } from "@/api/storeKindAPI"
import type { StoreKindInfo } from "@/types/storeKind"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<StoreKindInfo>("STORE_KIND_ID", async () => {
  const response = await getStoreKindInfos()
  return Array.isArray(response.data) ? response.data : []
})

export const warehouseTypeLookupStore = store
export const clearWarehouseTypeLookupCache = clearCache
