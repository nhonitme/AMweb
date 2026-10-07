import { useCallback, useEffect, type RefObject } from "react"
import { useQueryClient } from "@tanstack/react-query"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"
import type dxTreeList from "devextreme/ui/tree_list"

import { getApiErrorMessage } from "@/api/apiTypes"
import { getCurrentCompanyCd } from "@/lib/login"
import { normalizeMessageLanguageKey } from "@/utils/language"

export function useMasterListInvalidate(getQueryKey: (companyCd: string) => readonly unknown[]) {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getQueryKey(companyCd) })
  }, [companyCd, getQueryKey, queryClient])
}

export function useLangScopedMasterInvalidate(
  getQueryKey: (companyCd: string, lang: string) => readonly unknown[],
  lang: string,
) {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()
  const langKey = normalizeMessageLanguageKey(lang)

  return useCallback(async () => {
    await queryClient.invalidateQueries({ queryKey: getQueryKey(companyCd, langKey) })
  }, [companyCd, getQueryKey, langKey, queryClient])
}

export function useMasterListReload(
  refetch: () => Promise<unknown>,
  gridRef: RefObject<dxDataGrid | null> | RefObject<dxTreeList | null>,
) {
  return useCallback(async () => {
    await refetch()
    gridRef.current?.clearSelection?.()
  }, [gridRef, refetch])
}

export function useMasterListLoadError(
  isError: boolean,
  error: unknown,
  t: (key: string, fallback?: string) => string,
  logLabel: string,
) {
  useEffect(() => {
    if (isError && error) {
      console.error(logLabel, error)
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải thất bại")), "error", 3000)
    }
  }, [error, isError, logLabel, t])
}
