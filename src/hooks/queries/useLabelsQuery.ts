import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { getLanguage } from "@/api/LanguagesApi"
import { clearGlobalStorageNamespace } from "@/lib/globalStorageCache"
import { canRestoreSession } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { MessageLanguageKey } from "@/types/languages"

export function useLabelsQuery(lang: MessageLanguageKey, enabled = canRestoreSession()) {
  return useQuery({
    queryKey: queryKeys.labels.byLang(lang),
    queryFn: () => getLanguage(lang),
    enabled,
    staleTime: STALE_TIME.LABELS,
    // Survive brief observer gaps / idle session races (same class as sys-codes).
    gcTime: 30 * 60_000,
  })
}

export function useLabelsQueryActions(lang: MessageLanguageKey) {
  const queryClient = useQueryClient()

  const refreshLabels = useCallback(
    async (forLang?: string) => {
      const targetLang = forLang ?? lang
      clearGlobalStorageNamespace("language-labels")
      await queryClient.invalidateQueries({
        queryKey: queryKeys.labels.byLang(targetLang),
      })
    },
    [lang, queryClient],
  )

  const clearLabels = useCallback(() => {
    queryClient.removeQueries({
      queryKey: queryKeys.labels.all,
    })
  }, [queryClient])

  return {
    refreshLabels,
    clearLabels,
  }
}
