import {
  type SysCode,
  type SysCodeMap,
  clearSysCodesCache as clearSysCodesCacheService,
  fetchSysCodes,
  groupSysCodesByType,
} from "@/api/sysCodeService"
import { canRestoreSession, getCurrentCompanyCd } from "@/lib/login"
import { isPublicAppPath } from "@/lib/publicRoutes"
import { queryClient } from "@/lib/query/queryClient"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"

export type SysCodesMap = SysCodeMap

function canLoadSysCodes(): boolean {
  return !isPublicAppPath() && canRestoreSession() && Boolean(getCurrentCompanyCd())
}

export async function fetchSysCodeMap(forceRefresh = false): Promise<SysCodeMap> {
  if (forceRefresh) {
    clearSysCodesCacheService()
  }

  const items = await fetchSysCodes({ forceRefresh })
  return groupSysCodesByType(items)
}

export async function loadSysCodesMap(): Promise<SysCodesMap> {
  if (!canLoadSysCodes()) {
    return {}
  }

  const companyCd = getCurrentCompanyCd()
  return queryClient.fetchQuery({
    queryKey: queryKeys.sysCodes.byCompany(companyCd),
    queryFn: () => fetchSysCodeMap(false),
    staleTime: STALE_TIME.STATIC,
  })
}

export async function getCachedSysCodes(codeType: string): Promise<SysCode[]> {
  if (!codeType?.trim()) {
    return []
  }

  const map = await loadSysCodesMap()
  const key = codeType.trim().toUpperCase()
  return map[key] ?? []
}

export function clearSysCodesServiceCache(): void {
  clearSysCodesCacheService()
}

export function clearSysCodesCache(): void {
  clearSysCodesServiceCache()
  queryClient.removeQueries({ queryKey: queryKeys.sysCodes.all })
}

export async function warmupSysCodesCache(forceRefresh = false): Promise<SysCodeMap> {
  if (!canLoadSysCodes()) {
    return {}
  }

  const companyCd = getCurrentCompanyCd()
  const queryKey = queryKeys.sysCodes.byCompany(companyCd)

  if (forceRefresh) {
    clearSysCodesCacheService()
  }

  // Prefer fetchQuery over setQueryData so active useQuery observers stay in sync
  // after queryClient.clear() / login races.
  return queryClient.fetchQuery({
    queryKey,
    queryFn: () => fetchSysCodeMap(forceRefresh),
    staleTime: forceRefresh ? 0 : STALE_TIME.STATIC,
    gcTime: 30 * 60_000,
  })
}
