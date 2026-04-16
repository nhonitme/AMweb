import { getManagementInfos } from "@/api/managementInfoApi"
import { normalizeManagementInfoRows } from "@/pages/Module/ManagementInfo/managementInfoUtils"
import type { ManagementInfo } from "@/types/managementInfo"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<ManagementInfo>("MG_ID", async () => {
  const response = await getManagementInfos()
  return normalizeManagementInfoRows(response.data || [])
})

export const managementLookupStore = store
export const clearManagementLookupCache = clearCache
