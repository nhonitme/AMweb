import type { SysCode } from "@/api/sysCodeService"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { getCurrentCompanyCd } from "@/lib/login"
import { createLookupStore } from "./createLookupStore"

export const LHHDTRUNG_CODE_TYPE = "LHHDTRUNG"

export type EinvLhhdtrungLookupItem = SysCode

async function loadEinvLhhdtrungItems(): Promise<EinvLhhdtrungLookupItem[]> {
  return await getCachedSysCodes(LHHDTRUNG_CODE_TYPE)
}

const { store, clearCache } = createLookupStore<EinvLhhdtrungLookupItem>(
  "CODE_CD",
  loadEinvLhhdtrungItems,
  () => getCurrentCompanyCd(),
)

export const einvLhhdtrungLookupStore = store
export const clearEinvLhhdtrungLookupCache = clearCache
