import { getBankInfos } from "@/api/bankInfoApi"
import { normalizeBankInfoRows } from "@/pages/Module/BankManagementPage/bankInfoUtils"
import type { BankInfo } from "@/types/bankInfo"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<BankInfo>("BANK_ID", async () => {
  const response = await getBankInfos()
  return normalizeBankInfoRows(response.data || [])
})

export const bankLookupStore = store
export const clearBankLookupCache = clearCache
