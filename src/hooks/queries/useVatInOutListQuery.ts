import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { getVatInOutPage, type VatInOutQuery } from "@/api/vatInOutApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { resolvePageNumber, resolvePageSize } from "@/lib/paging"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"

export function useVatInOutListQuery(
  params: VatInOutQuery | null,
  pageNumber: number,
  pageSize: number,
) {
  const companyCd = getCurrentCompanyCd()
  return useQuery({
    queryKey: [...queryKeys.transaction.vatInOutRoot(companyCd), params, pageNumber, pageSize],
    queryFn: ({ signal }) => getVatInOutPage(params!, resolvePageNumber(pageNumber), resolvePageSize(pageSize), signal),
    enabled: Boolean(companyCd && params?.FROM_YMD && params?.TO_YMD && params.FROM_YMD <= params.TO_YMD),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useVatInOutListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()
  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: queryKeys.transaction.vatInOutRoot(companyCd) })
  }, [companyCd, queryClient])
}

