import { getOpeningBalanceBankAccountOptions } from "@/api/openingBalanceApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { etcData } from "@/types/etcData"
import { getCurrentLangCode } from "@/utils/language"
import { createLookupStore } from "./createLookupStore"

const lookupEntry = createLookupStore<etcData, "CD">(
  "CD",
  () => getOpeningBalanceBankAccountOptions(getCurrentLangCode()),
  () => `${getCurrentCompanyCd()}|${getCurrentLangCode()}`,
)

export const openingBalanceBankAccountLookupStore = lookupEntry.store

export async function reloadOpeningBalanceBankAccountLookupStore(): Promise<void> {
  lookupEntry.clearCache()
  await openingBalanceBankAccountLookupStore.load()
}
