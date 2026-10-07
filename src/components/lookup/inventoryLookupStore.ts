import { fetchProductLookup } from "@/api/lookupApi"
import type { Product } from "@/types/product"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<Product>("PRODUCT_ID", fetchProductLookup, undefined, ["PRODUCT_CD"])

export const inventoryLookupStore = store
export const clearInventoryLookupCache = clearCache
