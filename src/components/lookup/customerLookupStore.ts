import { fetchCustomerLookup } from "@/api/lookupApi"
import { getCurrentCompanyCd } from "@/lib/login"
import type { CustomerExt } from "@/types/customerExt"
import { createLookupStore } from "./createLookupStore"

const { store, clearCache, loadRows } = createLookupStore<CustomerExt>(
  "CUSTOMER_ID",
  fetchCustomerLookup,
  () => getCurrentCompanyCd(),
)

export const customerLookupStore = store
export const loadCachedCustomerLookup = loadRows
export const clearCustomerLookupCache = clearCache
