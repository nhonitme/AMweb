import type { SysCode } from "@/api/sysCodeService"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { getCurrentCompanyCd } from "@/lib/login"
import { createLookupStore } from "./createLookupStore"

export type VatRateLookupItem = SysCode

async function loadVatRates(): Promise<VatRateLookupItem[]> {
  return await getCachedSysCodes("VAT_RATE")
}

const { store, clearCache } = createLookupStore<VatRateLookupItem>(
  "CODE_CD",
  loadVatRates,
  () => getCurrentCompanyCd(),
)

export const vatRateLookupStore = store
export const clearVatRateLookupCache = clearCache
