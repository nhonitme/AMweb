import { fetchBankLookup } from "@/api/lookupApi"
import type { BankInfo } from "@/types/bankInfo"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<BankInfo>("BANK_ID", fetchBankLookup)

export const bankLookupStore = store
export const clearBankLookupCache = clearCache
