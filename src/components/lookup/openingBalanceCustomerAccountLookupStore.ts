import { getOpeningBalanceCustomerAccountOptions } from "@/api/openingBalanceApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { etcData } from "@/types/etcData"
import { getCurrentLangCode } from "@/utils/language"
import { createLookupStore } from "./createLookupStore"

const lookupEntry = createLookupStore<etcData, "CD">(
  "CD",
  () => getOpeningBalanceCustomerAccountOptions(getCurrentLangCode()),
  () => `${getCurrentCompanyCd()}|${getCurrentLangCode()}`,
)

export const openingBalanceCustomerAccountLookupStore = lookupEntry.store

export async function reloadOpeningBalanceCustomerAccountLookupStore(): Promise<void> {
  lookupEntry.clearCache()
  await openingBalanceCustomerAccountLookupStore.load()
}
