import { fetchStoreLookup } from "@/api/lookupApi"
import type { StoreInfo } from "@/types/store"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<StoreInfo>("STORE_ID", fetchStoreLookup)

export const warehouseLookupStore = store
export const clearWarehouseLookupCache = clearCache
