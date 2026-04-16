import { getProducts } from "@/api/productApi"
import type { Product } from "@/types/product"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<Product>("PRODUCT_ID", async () => {
  const response = await getProducts()
  return Array.isArray(response) ? response : []
})

export const inventoryLookupStore = store
export const clearInventoryLookupCache = clearCache
