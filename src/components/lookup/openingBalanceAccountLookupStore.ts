import { getOpeningBalanceAccountOptions } from "@/api/openingBalanceApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { etcData } from "@/types/etcData"
import { getCurrentLangCode } from "@/utils/language"
import { createLookupStore } from "./createLookupStore"

const lookupEntry = createLookupStore<etcData, "CD">(
  "CD",
  () => getOpeningBalanceAccountOptions(getCurrentLangCode()),
  () => `${getCurrentCompanyCd()}|${getCurrentLangCode()}`,
)

export const openingBalanceAccountLookupStore = lookupEntry.store

export async function reloadOpeningBalanceAccountLookupStore(): Promise<void> {
  lookupEntry.clearCache()
  await openingBalanceAccountLookupStore.load()
}
