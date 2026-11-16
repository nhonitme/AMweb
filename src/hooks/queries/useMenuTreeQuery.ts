import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { fetchMenuTree } from "@/api/menuApi"
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import { queryKeys } from "@/lib/query/queryKeys"

export function useMenuTreeQuery(companyCd: string) {
  const normalizedCompanyCd = companyCd.trim()
  const userId = getCurrentUserId()

  return useQuery({
    queryKey: queryKeys.menu.tree(normalizedCompanyCd, userId),
    queryFn: ({ signal }) => fetchMenuTree(normalizedCompanyCd, signal),
    enabled: Boolean(normalizedCompanyCd),
    staleTime: 60_000,
    refetchOnMount: true,
    refetchOnWindowFocus: true,
    refetchInterval: 60_000,
    retry: (failureCount, error) => {
      if (
        (error instanceof Error && (error.name === "CanceledError" || error.name === "AbortError"))
        || (typeof error === "object" && error !== null && "code" in error && error.code === "ERR_CANCELED")
      ) {
        return false
      }
      return failureCount < 2
    },
  })
}

export function useMenuTreeInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()
  const userId = getCurrentUserId()

  return useCallback(async () => {
    if (!companyCd.trim()) {
      return
    }

    await queryClient.invalidateQueries({
      queryKey: queryKeys.menu.tree(companyCd.trim(), userId),
    })
  }, [companyCd, userId, queryClient])
}
