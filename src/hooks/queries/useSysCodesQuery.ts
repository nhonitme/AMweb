import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import {
  clearSysCodesCache as clearAllSysCodesCaches,
  clearSysCodesServiceCache,
  fetchSysCodeMap,
  warmupSysCodesCache,
} from "@/lib/sysCodeCache"
import { useCurrentCompanyCd } from "@/lib/currentCompanyCd"
import { canRestoreSession } from "@/lib/login"
import { isPublicAppPath } from "@/lib/publicRoutes"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"

export function useSysCodesQuery() {
  const companyCd = useCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.sysCodes.byCompany(companyCd),
    queryFn: () => fetchSysCodeMap(false),
    enabled: !isPublicAppPath() && canRestoreSession() && Boolean(companyCd),
    staleTime: STALE_TIME.STATIC,
    // Keep longer than default gcTime (5m) so brief observer gaps / idle do not drop lookups.
    gcTime: 30 * 60_000,
  })
}

export function useSysCodesQueryActions() {
  const queryClient = useQueryClient()
  const companyCd = useCurrentCompanyCd()

  const invalidateSysCodes = useCallback(async () => {
    clearSysCodesServiceCache()
    await queryClient.invalidateQueries({
      queryKey: queryKeys.sysCodes.byCompany(companyCd),
    })
  }, [companyCd, queryClient])

  const refreshSysCodes = useCallback(async () => {
    return warmupSysCodesCache(true)
  }, [])

  const clearSysCodes = useCallback(() => {
    clearAllSysCodesCaches()
  }, [])

  return {
    invalidateSysCodes,
    refreshSysCodes,
    clearSysCodes,
  }
}
