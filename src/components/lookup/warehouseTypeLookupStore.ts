import { fetchStoreKindLookup } from "@/api/lookupApi"
import type { StoreKindInfo } from "@/types/storeKind"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<StoreKindInfo>("STORE_KIND_ID", fetchStoreKindLookup)

export const warehouseTypeLookupStore = store
export const clearWarehouseTypeLookupCache = clearCache
