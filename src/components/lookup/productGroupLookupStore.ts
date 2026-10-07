import { fetchProductKindLookup } from "@/api/lookupApi"
import type { ProductKind } from "@/types/productKind"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<ProductKind>("PRODUCT_KIND_ID", fetchProductKindLookup)

export const productGroupLookupStore = store
export const clearProductGroupLookupCache = clearCache
