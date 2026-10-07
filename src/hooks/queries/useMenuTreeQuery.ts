import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { fetchMenuTree } from "@/api/menuApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"

export function useMenuTreeQuery(companyCd: string) {
  const normalizedCompanyCd = companyCd.trim()

  return useQuery({
    queryKey: queryKeys.menu.tree(normalizedCompanyCd),
    queryFn: () => fetchMenuTree(),
    enabled: Boolean(normalizedCompanyCd),
    staleTime: STALE_TIME.STATIC,
  })
}

export function useMenuTreeInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    if (!companyCd.trim()) {
      return
    }

    await queryClient.invalidateQueries({
      queryKey: queryKeys.menu.tree(companyCd.trim()),
    })
  }, [companyCd, queryClient])
}
