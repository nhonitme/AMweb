import { fetchCustomerLookup } from "@/api/lookupApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { CustomerExt } from "@/types/customerExt"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache } = createLookupStore<CustomerExt>(
  "CUSTOMER_ID",
  fetchCustomerLookup,
  () => getCurrentCompanyCd(),
)

export const customerLookupStore = store
export const clearCustomerLookupCache = clearCache
