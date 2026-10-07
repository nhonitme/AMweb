import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { getChits, type GetChitsParams } from "@/api/voucherApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { resolvePageNumber, resolvePageSize } from "@/lib/paging"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { ChitLedger, ChitType } from "@/types/voucher"

export type ChitListQueryParams = {
  ledger: ChitLedger
  chitType: ChitType
  fromYmd: string
  toYmd: string
  pageNumber: number
  pageSize: number
  includeDetails?: boolean
}

export function useChitListQuery(params: ChitListQueryParams, enabled = true) {
  const companyCd = getCurrentCompanyCd()
  const hasValidRange = Boolean(params.fromYmd && params.toYmd && params.fromYmd <= params.toYmd)

  return useQuery({
    queryKey: queryKeys.transaction.chits(
      companyCd,
      params.ledger,
      params.chitType,
      params.fromYmd,
      params.toYmd,
      params.pageNumber,
      params.pageSize,
    ),
    queryFn: () => {
      const filters: GetChitsParams = {
        fromYmd: params.fromYmd,
        toYmd: params.toYmd,
        pageNumber: resolvePageNumber(params.pageNumber),
        pageSize: resolvePageSize(params.pageSize),
        INCLUDE_DETAILS: params.includeDetails ?? true,
      }
      return getChits(params.ledger, params.chitType, filters)
    },
    enabled: enabled && Boolean(companyCd) && hasValidRange,
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useChitListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.transaction.chitsRoot(companyCd),
    })
  }, [companyCd, queryClient])
}
