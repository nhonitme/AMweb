import { useCallback } from "react"
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"

import {
  createAcclistInfo,
  deleteAcclistInfos,
  getAcclistInfos,
  updateAcclistInfo,
} from "@/api/acclistAPI"
import {
  createBankInfo,
  deleteBankInfos,
  getBankInfos,
  updateBankInfo,
} from "@/api/bankInfoApi"
import {
  createCustomerExt,
  deleteCustomerExts,
  getCustomerExts,
  updateCustomerExt,
} from "@/api/customerExtApi"
import {
  createDepartmentInfo,
  deleteDepartmentInfos,
  getDepartmentInfos,
  updateDepartmentInfo,
} from "@/api/departmentInfoApi"
import {
  createManagementInfo,
  deleteManagementInfos,
  getManagementInfos,
  updateManagementInfo,
} from "@/api/managementInfoApi"
import {
  createProduct,
  deleteProducts,
  getProducts,
  updateProduct,
} from "@/api/productApi"
import {
  createProductKind,
  deleteProductKinds,
  getProductKinds,
  updateProductKind,
} from "@/api/productKindApi"
import {
  createProductUnit,
  deleteProductUnits,
  getProductUnits,
  updateProductUnit,
} from "@/api/productUnitApi"
import {
  createStoreInfo,
  deleteStoreInfos,
  getStoreInfos,
  updateStoreInfo,
} from "@/api/storeAPI"
import {
  createStoreKindInfo,
  deleteStoreKindInfos,
  getStoreKindInfos,
  updateStoreKindInfo,
} from "@/api/storeKindAPI"
import { getCurrentCompanyCd } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import { clearAcclistLookupCache } from "@/components/lookup/AcclistLookupStore"
import { clearBankLookupCache } from "@/components/lookup/bankLookupStore"
import { clearCustomerLookupCache } from "@/components/lookup/customerLookupStore"
import { clearInventoryLookupCache } from "@/components/lookup/inventoryLookupStore"
import { clearProductGroupLookupCache } from "@/components/lookup/productGroupLookupStore"
import { clearUnitLookupCache } from "@/components/lookup/unitLookupStore"
import { clearWarehouseLookupCache } from "@/components/lookup/warehouseLookupStore"
import { clearWarehouseTypeLookupCache } from "@/components/lookup/warehouseTypeLookupStore"
import type { AcclistInfo } from "@/types/acclist"
import type { BankInfoApi } from "@/types/bankInfo"
import type { CustomerExtApi } from "@/types/customerExt"
import type { DepartmentInfoApi } from "@/types/departmentInfo"
import type { ManagementInfoRequest } from "@/types/managementInfo"
import type { Product } from "@/types/product"
import type { ProductKind } from "@/types/productKind"
import type { Unit } from "@/types/unit"
import type { StoreInfo } from "@/types/store"
import type { StoreKindInfo } from "@/types/storeKind"
import { normalizeMessageLanguageKey } from "@/utils/language"

import {
  useLangScopedMasterInvalidate,
  useMasterListInvalidate,
} from "./masterQueryHelpers"

// ── Products ──────────────────────────────────────────────────────────────────

export function useProductListQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.products(companyCd),
    queryFn: () => getProducts(),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useProductListInvalidate() {
  return useMasterListInvalidate(queryKeys.master.products)
}

export function useProductMutations() {
  const invalidateProducts = useProductListInvalidate()
  const queryClient = useQueryClient()
  const refreshProductData = () => {
    clearInventoryLookupCache()
    // Let the grid close the editor before the active product-list refetch starts.
    window.setTimeout(() => {
      void invalidateProducts().catch(() => undefined)
    }, 0)
  }

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Product>) => createProduct(payload),
    onSuccess: refreshProductData,
  })

  const updateProductAsync = useCallback((variables: { id: string; payload: Partial<Product> }) => {
    // The edit popup already patches its existing row object and repaints only
    // that row. Avoid subscribing the whole product grid to mutation status changes,
    // which otherwise re-renders the whole grid when the request starts/ends.
    const mutation = queryClient.getMutationCache().build(queryClient, {
      mutationFn: ({ id, payload }: { id: string; payload: Partial<Product> }) => updateProduct(id, payload),
      onSuccess: () => {
        clearInventoryLookupCache()
      },
    })
    return mutation.execute(variables)
  }, [queryClient])

  const deleteMutation = useMutation({
    mutationFn: (productIds: number[]) => deleteProducts(productIds),
    onSuccess: refreshProductData,
  })

  return { createMutation, updateProductAsync, deleteMutation, invalidateProducts }
}

// ── Product kinds ─────────────────────────────────────────────────────────────

export function useProductKindListQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.productKinds(companyCd),
    queryFn: () => getProductKinds(),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useProductKindListInvalidate() {
  return useMasterListInvalidate(queryKeys.master.productKinds)
}

export function useProductKindMutations() {
  const invalidate = useProductKindListInvalidate()
  const refreshProductKindData = async () => {
    clearProductGroupLookupCache()
    await invalidate()
  }

  const createMutation = useMutation({
    mutationFn: (payload: Partial<ProductKind>) => createProductKind(payload),
    onSuccess: refreshProductKindData,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<ProductKind> }) =>
      updateProductKind(id, payload),
    onSuccess: refreshProductKindData,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteProductKinds(ids),
    onSuccess: refreshProductKindData,
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

// ── Product units ─────────────────────────────────────────────────────────────

export function useProductUnitListQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.productUnits(companyCd),
    queryFn: () => getProductUnits(),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useProductUnitListInvalidate() {
  return useMasterListInvalidate(queryKeys.master.productUnits)
}

export function useProductUnitMutations() {
  const invalidate = useProductUnitListInvalidate()
  const refreshProductUnitData = async () => {
    clearUnitLookupCache()
    await invalidate()
  }

  const createMutation = useMutation({
    mutationFn: (payload: Partial<Unit>) => createProductUnit(payload),
    onSuccess: refreshProductUnitData,
  })

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: string; payload: Partial<Unit> }) =>
      updateProductUnit(id, payload),
    onSuccess: refreshProductUnitData,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteProductUnits(ids),
    onSuccess: refreshProductUnitData,
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

// ── Stores ────────────────────────────────────────────────────────────────────

export function useStoreListQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.stores(companyCd),
    queryFn: async () => {
      const response = await getStoreInfos()
      return response.data
    },
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useStoreListInvalidate() {
  return useMasterListInvalidate(queryKeys.master.stores)
}

export function useStoreMutations() {
  const invalidate = useStoreListInvalidate()
  const refreshStoreData = async () => {
    clearWarehouseLookupCache()
    await invalidate()
  }

  const createMutation = useMutation({
    mutationFn: (payload: Partial<StoreInfo>) => createStoreInfo(payload),
    onSuccess: refreshStoreData,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<StoreInfo>) => updateStoreInfo(payload),
    onSuccess: refreshStoreData,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteStoreInfos(ids),
    onSuccess: refreshStoreData,
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

// ── Store kinds ───────────────────────────────────────────────────────────────

export function useStoreKindListQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.storeKinds(companyCd),
    queryFn: async () => {
      const response = await getStoreKindInfos()
      return response.data
    },
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useStoreKindListInvalidate() {
  return useMasterListInvalidate(queryKeys.master.storeKinds)
}

export function useStoreKindMutations() {
  const invalidate = useStoreKindListInvalidate()
  const refreshStoreKindData = async () => {
    clearWarehouseTypeLookupCache()
    await invalidate()
  }

  const createMutation = useMutation({
    mutationFn: (payload: Partial<StoreKindInfo>) => createStoreKindInfo(payload),
    onSuccess: refreshStoreKindData,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<StoreKindInfo>) => updateStoreKindInfo(payload),
    onSuccess: refreshStoreKindData,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteStoreKindInfos(ids),
    onSuccess: refreshStoreKindData,
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

// ── Acclists ──────────────────────────────────────────────────────────────────

export function useAcclistListQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.master.acclists(companyCd),
    queryFn: async () => {
      const response = await getAcclistInfos()
      return response.data
    },
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useAcclistListInvalidate() {
  return useMasterListInvalidate(queryKeys.master.acclists)
}

export function useAcclistMutations() {
  const invalidate = useAcclistListInvalidate()
  const refreshAcclistData = async () => {
    clearAcclistLookupCache()
    await invalidate()
  }

  const createMutation = useMutation({
    mutationFn: (payload: Partial<AcclistInfo>) => createAcclistInfo(payload),
    onSuccess: refreshAcclistData,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<AcclistInfo>) => updateAcclistInfo(payload),
    onSuccess: refreshAcclistData,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteAcclistInfos(ids),
    onSuccess: refreshAcclistData,
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

// ── Banks (lang-scoped list) ──────────────────────────────────────────────────

export function useBankListQuery(lang: string) {
  const companyCd = getCurrentCompanyCd()
  const langKey = normalizeMessageLanguageKey(lang)

  return useQuery({
    queryKey: queryKeys.master.banks(companyCd, langKey),
    queryFn: async () => {
      const response = await getBankInfos(undefined, langKey)
      return response.data
    },
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useBankListInvalidate(lang: string) {
  return useLangScopedMasterInvalidate(queryKeys.master.banks, lang)
}

export function useBankMutations(lang: string) {
  const invalidate = useBankListInvalidate(lang)
  const refreshBankData = async () => {
    clearBankLookupCache()
    await invalidate()
  }

  const createMutation = useMutation({
    mutationFn: (payload: Partial<BankInfoApi>) => createBankInfo(payload),
    onSuccess: refreshBankData,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<BankInfoApi>) => updateBankInfo(payload),
    onSuccess: refreshBankData,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteBankInfos(ids),
    onSuccess: refreshBankData,
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

// ── Customer exts (lang-scoped list) ──────────────────────────────────────────

export function useCustomerExtListQuery(lang: string) {
  const companyCd = getCurrentCompanyCd()
  const langKey = normalizeMessageLanguageKey(lang)

  return useQuery({
    queryKey: queryKeys.master.customerExts(companyCd, langKey),
    queryFn: async () => (await getCustomerExts(undefined, langKey)).data,
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useCustomerExtListInvalidate(lang: string) {
  return useLangScopedMasterInvalidate(queryKeys.master.customerExts, lang)
}

export function useCustomerExtMutations(lang: string) {
  const invalidate = useCustomerExtListInvalidate(lang)
  const refreshCustomerData = async () => {
    clearCustomerLookupCache()
    await invalidate()
  }

  const createMutation = useMutation({
    mutationFn: (payload: Partial<CustomerExtApi>) => createCustomerExt(payload),
    onSuccess: refreshCustomerData,
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<CustomerExtApi>) => updateCustomerExt(payload),
    onSuccess: refreshCustomerData,
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteCustomerExts(ids),
    onSuccess: refreshCustomerData,
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

// ── Departments (lang-scoped list) ──────────────────────────────────────────

export function useDepartmentListQuery(lang: string) {
  const companyCd = getCurrentCompanyCd()
  const langKey = normalizeMessageLanguageKey(lang)

  return useQuery({
    queryKey: queryKeys.master.departments(companyCd, langKey),
    queryFn: async () => {
      const response = await getDepartmentInfos(undefined, langKey)
      return response.data
    },
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useDepartmentListInvalidate(lang: string) {
  return useLangScopedMasterInvalidate(queryKeys.master.departments, lang)
}

export function useDepartmentMutations(lang: string) {
  const invalidate = useDepartmentListInvalidate(lang)

  const createMutation = useMutation({
    mutationFn: (payload: Partial<DepartmentInfoApi>) => createDepartmentInfo(payload),
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<DepartmentInfoApi>) => updateDepartmentInfo(payload),
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteDepartmentInfos(ids),
    onSuccess: () => invalidate(),
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

// ── Management infos (lang-scoped list) ───────────────────────────────────────

export function useManagementInfoListQuery(lang: string) {
  const companyCd = getCurrentCompanyCd()
  const langKey = normalizeMessageLanguageKey(lang)

  return useQuery({
    queryKey: queryKeys.master.managementInfos(companyCd, langKey),
    queryFn: async () => {
      const response = await getManagementInfos(undefined, langKey)
      return response.data
    },
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useManagementInfoListInvalidate(lang: string) {
  return useLangScopedMasterInvalidate(queryKeys.master.managementInfos, lang)
}

export function useManagementInfoMutations(lang: string) {
  const invalidate = useManagementInfoListInvalidate(lang)
  const langKey = normalizeMessageLanguageKey(lang)

  const createMutation = useMutation({
    mutationFn: (payload: ManagementInfoRequest) => createManagementInfo(payload, langKey),
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: ManagementInfoRequest) => updateManagementInfo(payload, langKey),
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteManagementInfos(ids),
    onSuccess: () => invalidate(),
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}
