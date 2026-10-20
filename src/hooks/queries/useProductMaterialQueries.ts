import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import { getProducts } from "@/api/productApi"
import {
  deleteProductMaterial,
  getProductMaterialSummary,
  getProductMaterials,
  saveProductMaterial,
} from "@/api/productMaterialApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { ProductMaterialSave } from "@/types/productMaterial"

function sortByProductCd<T extends { PRODUCT_CD: string }>(rows: T[]): T[] {
  return [...rows].sort((a, b) => a.PRODUCT_CD.localeCompare(b.PRODUCT_CD))
}

export function useProductsByDivisionQuery(division: string) {
  const companyCd = getCurrentCompanyCd()
  const divisionKey = String(division ?? "").trim()

  return useQuery({
    queryKey: queryKeys.master.productsByDivision(companyCd, divisionKey),
    queryFn: async () => sortByProductCd(await getProducts(divisionKey)),
    enabled: Boolean(companyCd) && Boolean(divisionKey),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useProductMaterialSummaryQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.productMaterialsSummary(companyCd),
    queryFn: () => getProductMaterialSummary(),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useProductMaterialsQuery(productId: number) {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.productMaterials(companyCd, productId),
    queryFn: () => getProductMaterials(productId),
    enabled: Boolean(companyCd) && productId > 0,
    staleTime: STALE_TIME.MASTER,
  })
}

export function useProductMaterialInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async (productId?: number) => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.master.productMaterialsRoot(companyCd),
    })
    if (productId && productId > 0) {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.master.productMaterials(companyCd, productId),
      })
    }
  }, [companyCd, queryClient])
}

export function useProductMaterialMutations() {
  const invalidate = useProductMaterialInvalidate()

  const saveMutation = useMutation({
    mutationFn: ({ materialId, payload }: { materialId: number; payload: ProductMaterialSave }) =>
      saveProductMaterial(materialId, payload),
    onSuccess: (_data, variables) => void invalidate(variables.payload.PRODUCT_ID),
  })

  const deleteMutation = useMutation({
    mutationFn: ({ materialId, productId }: { materialId: number; productId: number }) =>
      deleteProductMaterial(materialId).then(() => productId),
    onSuccess: (productId) => void invalidate(productId),
  })

  return { saveMutation, deleteMutation, invalidate }
}
