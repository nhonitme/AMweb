import { getProductUnits } from "@/api/productUnitApi"
import type { Unit } from "@/types/unit"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<Unit>("UNIT_ID", async () => {
  const response = await getProductUnits()
  return Array.isArray(response) ? response : []
})

export const unitLookupStore = store
export const clearUnitLookupCache = clearCache
