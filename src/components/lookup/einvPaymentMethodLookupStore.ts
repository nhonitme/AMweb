import type { SysCode } from "@/api/sysCodeService"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { getCurrentCompanyCd } from "@/lib/login"
import { createLookupStore } from "./createLookupStore"

export type EinvPaymentMethodLookupItem = SysCode

async function loadEinvPaymentMethods(): Promise<EinvPaymentMethodLookupItem[]> {
  return await getCachedSysCodes("EINV_PAYMENT_METHOD")
}

const { store, clearCache } = createLookupStore<EinvPaymentMethodLookupItem>(
  "CODE_CD",
  loadEinvPaymentMethods,
  () => getCurrentCompanyCd(),
)

export const einvPaymentMethodLookupStore = store
export const clearEinvPaymentMethodLookupCache = clearCache
