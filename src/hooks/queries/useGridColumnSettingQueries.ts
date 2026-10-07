import type { QueryClient } from "@tanstack/react-query"

import { getAllSysGridColumnSettings } from "@/api/sysGridColumnSettingApi"
import { type GridSettingScope } from "@/lib/gridSettingCache"
import { applyAllSettingsToQueryCache } from "@/lib/gridColumnSettingUtils"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { SysGridColumnBundle } from "@/types/sysGridColumnSetting"

export async function fetchAllGridColumnSettings(): Promise<SysGridColumnBundle> {
  const response = await getAllSysGridColumnSettings()
  return response.data
}

export function getAllGridColumnSettingsQueryOptions(scope: GridSettingScope) {
  return {
    queryKey: queryKeys.gridColumnSettings.allForScope(scope.companyCd, scope.userId),
    queryFn: fetchAllGridColumnSettings,
    staleTime: STALE_TIME.GRID_SETTINGS,
    // Keep longer than default gcTime (5m). Provider used fetchQuery without a stable
    // observer, so idle tabs dropped the bundle → remount showed every column (incl. hidden)
    // and raw field-name captions until hard refresh.
    gcTime: 30 * 60_000,
  }
}

export function applyBundleToQueryCache(
  queryClient: QueryClient,
  scope: GridSettingScope,
  bundle: SysGridColumnBundle,
): void {
  applyAllSettingsToQueryCache(queryClient, scope, bundle)
}
