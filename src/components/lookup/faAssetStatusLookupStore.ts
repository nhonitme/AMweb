import type { SysCode } from "@/api/sysCodeService"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { getCurrentCompanyCd } from "@/lib/login"
import { createLookupStore } from "./createLookupStore"

export type FaAssetStatusLookupItem = SysCode

async function loadFaAssetStatuses(): Promise<FaAssetStatusLookupItem[]> {
  return await getCachedSysCodes("FA_STATUS")
}

const { store, clearCache } = createLookupStore<FaAssetStatusLookupItem>(
  "CODE_CD",
  loadFaAssetStatuses,
  () => getCurrentCompanyCd(),
)

export const faAssetStatusLookupStore = store
export const clearFaAssetStatusLookupCache = clearCache
