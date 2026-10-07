import { useMutation, useQuery } from "@tanstack/react-query"

import {
  createInventoryOpening,
  deleteInventoryOpenings,
  getInventoryOpenings,
  updateInventoryOpening,
} from "@/api/inventoryOpeningApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { InventoryOpeningRequest } from "@/types/inventoryOpening"
import { useMasterListInvalidate } from "@/hooks/queries/master/masterQueryHelpers"

export function useInventoryOpeningListQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.inventoryOpenings(companyCd),
    queryFn: () => getInventoryOpenings(),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useInventoryOpeningListInvalidate() {
  return useMasterListInvalidate(queryKeys.master.inventoryOpenings)
}

export function useInventoryOpeningMutations() {
  const invalidate = useInventoryOpeningListInvalidate()

  const createMutation = useMutation({
    mutationFn: (payload: InventoryOpeningRequest) => createInventoryOpening(payload),
    onSuccess: () => void invalidate(),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: InventoryOpeningRequest) => updateInventoryOpening(payload),
    onSuccess: () => void invalidate(),
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteInventoryOpenings(ids),
    onSuccess: () => void invalidate(),
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}
