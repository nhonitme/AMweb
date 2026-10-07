import { fetchUnitLookup } from "@/api/lookupApi"
import type { Unit } from "@/types/unit"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<Unit>("UNIT_ID", fetchUnitLookup)

export const unitLookupStore = store
export const clearUnitLookupCache = clearCache
