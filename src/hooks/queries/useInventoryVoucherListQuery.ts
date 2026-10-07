import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import {
  getInventoryVouchers,
  type InventoryVoucherFilters,
} from "@/api/inventoryVoucherApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { InventoryInputType, InventoryVoucherType } from "@/types/voucher"

export type InventoryListQueryParams = {
  ledger: InventoryInputType
  chitType: InventoryVoucherType
  fromYmd: string
  toYmd: string
  pageNumber: number
  pageSize: number
}

export function useInventoryVoucherListQuery(params: InventoryListQueryParams, enabled = true) {
  const companyCd = getCurrentCompanyCd()
  const hasValidRange = Boolean(params.fromYmd && params.toYmd && params.fromYmd <= params.toYmd)

  return useQuery({
    queryKey: queryKeys.transaction.inventory(
      companyCd,
      params.ledger,
      params.chitType,
      params.fromYmd,
      params.toYmd,
      params.pageNumber,
      params.pageSize,
    ),
    queryFn: () => {
      const filters: InventoryVoucherFilters = {
        fromYmd: params.fromYmd,
        toYmd: params.toYmd,
        pageNumber: params.pageNumber,
        pageSize: params.pageSize,
      }
      return getInventoryVouchers(params.ledger, params.chitType, filters)
    },
    enabled: enabled && Boolean(companyCd) && hasValidRange,
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useInventoryVoucherListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.transaction.inventoryRoot(companyCd),
    })
  }, [companyCd, queryClient])
}
