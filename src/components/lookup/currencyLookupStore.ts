import type { SysCode } from "@/api/sysCodeService"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import { createLookupStore } from "./createLookupStore"

export type CurrencyLookupItem = SysCode

async function loadCurrencies(): Promise<CurrencyLookupItem[]> {
  return await getCachedSysCodes("CURRENCY")
}

const { store, clearCache } = createLookupStore<CurrencyLookupItem>("CODE_CD", loadCurrencies)

export const currencyLookupStore = store
export const clearCurrencyLookupCache = clearCache
