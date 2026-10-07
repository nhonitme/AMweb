import { getOpeningBalanceDepartmentAccountOptions } from "@/api/openingBalanceApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { etcData } from "@/types/etcData"
import { getCurrentLangCode } from "@/utils/language"
import { createLookupStore } from "./createLookupStore"

const lookupEntry = createLookupStore<etcData, "CD">(
  "CD",
  () => getOpeningBalanceDepartmentAccountOptions(getCurrentLangCode()),
  () => `${getCurrentCompanyCd()}|${getCurrentLangCode()}`,
)

export const openingBalanceCostObjectAccountLookupStore = lookupEntry.store

export async function reloadOpeningBalanceCostObjectAccountLookupStore(): Promise<void> {
  lookupEntry.clearCache()
  await openingBalanceCostObjectAccountLookupStore.load()
}
