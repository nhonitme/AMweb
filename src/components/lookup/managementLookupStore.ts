import { fetchManagementLookup } from "@/api/lookupApi"
import type { ManagementInfo } from "@/types/managementInfo"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<ManagementInfo>("MG_ID", fetchManagementLookup, undefined, ["MG_CD"])

export const managementLookupStore = store
export const clearManagementLookupCache = clearCache
