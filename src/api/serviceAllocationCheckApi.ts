import API_BASE_URL from "@/config/apiConfig"
import axios from "@/api/axiosClient"
import { getApiObjectPayload } from "@/api/apiTypes"

const BASE_URL = `${API_BASE_URL}/ap/utility/check-service-allocation`

export type ServiceAllocationDetail = {
  SERVICES_CHIT_ID: number
  SERVICES_CHIT_CD: string | null
  CHIT_TYPE: string | null
  INVENTORY_CHIT_ID: number
  INVENTORY_CHIT_CD: string | null
  CHIT_NO: string | null
  CHIT_YMD: string | null
  AMOUNT_SHARE: number
}

export type ServiceAllocationVoucher = {
  SERVICES_CHIT_ID: number
  SERVICES_CHIT_CD: string
  SERVICES_CHIT_NO: string
  CUSTOMER_ID: number | null
  CUSTOMER_CD: string | null
  CHIT_YMD: string | null
  VAT_CHIT_NO: string | null
  VAT_YMD: string | null
  CONTENTS: string | null
  TOTAL_COST: number
  COST_NOT_YET_ALLOCATED: number
  COST_NOW_ALLOCATES: number
  COST_REMAIN: number
  ALLOCATIONS: ServiceAllocationDetail[]
}

type CheckResult = {
  ITEMS: ServiceAllocationVoucher[]
  TOTAL_RECORDS: number
}

export type ServiceAllocationFilters = {
  fromYmd: string
  toYmd: string
  customerId: number | null
  /** UI semantics: null = all; 0 = allocated; 1 = not allocated. */
  allocationFilter: 0 | 1 | null
}

export async function getServiceAllocationCheck(filters: ServiceAllocationFilters): Promise<CheckResult> {
  const response = await axios.get(BASE_URL, {
    params: {
      fromYmd: filters.fromYmd,
      toYmd: filters.toYmd,
      customerId: filters.customerId ?? undefined,
      allocationFilter: filters.allocationFilter ?? undefined,
    },
  })

  const payload = getApiObjectPayload(response.data) as CheckResult
  return {
    ITEMS: Array.isArray(payload.ITEMS) ? payload.ITEMS : [],
    TOTAL_RECORDS: Number(payload.TOTAL_RECORDS) || 0,
  }
}
