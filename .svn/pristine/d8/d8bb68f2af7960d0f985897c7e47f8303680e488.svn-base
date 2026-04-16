import { getCustomerExts } from "@/api/customerExtApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { CustomerExt } from "@/types/customerExt"
import { createLookupStore } from "./createLookupStore"

async function loadCustomers(): Promise<CustomerExt[]> {
  const response = await getCustomerExts()
  return response.data || []
}

const { store, clearCache } = createLookupStore<CustomerExt>(
  "CUSTOMER_ID",
  loadCustomers,
  () => getCurrentCompanyCd(),
)

export const customerLookupStore = store
export const clearCustomerLookupCache = clearCache
