import type { SysCode } from "@/api/sysCodeService"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { getCurrentCompanyCd } from "@/lib/login"
import { createLookupStore } from "./createLookupStore"

export type EinvTchatLookupItem = SysCode

async function loadEinvTchatItems(): Promise<EinvTchatLookupItem[]> {
  return await getCachedSysCodes("EINV_TCHAT")
}

const { store, clearCache } = createLookupStore<EinvTchatLookupItem>(
  "CODE_CD",
  loadEinvTchatItems,
  () => getCurrentCompanyCd(),
)

export const einvTchatLookupStore = store
export const clearEinvTchatLookupCache = clearCache
