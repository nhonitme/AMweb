import { getProductKinds } from "@/api/productKindApi"
import type { ProductKind } from "@/types/productKind"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<ProductKind>("PRODUCT_KIND_ID", async () => {
  const response = await getProductKinds()
  return Array.isArray(response) ? response : []
})

export const productGroupLookupStore = store
export const clearProductGroupLookupCache = clearCache
