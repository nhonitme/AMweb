import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import {
  getBeforeStateBanks,
  getBeforeStateCustomers,
  getBeforeStateDepartments,
  getBeforeStates,
  getOpeningBalanceSummary,
  SaveBeforeState,
  SaveBeforeStateBank,
  SaveBeforeStateCustomer,
  SaveBeforeStateDepartment,
} from "@/api/openingBalanceApi"
import type { BeforeState } from "@/types/openingBalance"
import { getCurrentCompanyCd } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { BeforeStateBank, BeforeStateCustomer, BeforeStateDepartment } from "@/api/openingBalanceApi"

export function useOpeningBalanceSummaryQuery(openYmd: string) {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.openingBalance.summary(companyCd, openYmd),
    queryFn: async () => {
      const response = await getOpeningBalanceSummary({ openYmd })
      return response.data
    },
    enabled: Boolean(companyCd && openYmd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useOpeningBalanceAccountsQuery(openYmd: string, keyword = "") {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.openingBalance.accounts(companyCd, openYmd, keyword),
    queryFn: async () => {
      const response = await getBeforeStates({ openYmd, keyWORD: keyword || null })
      return response.data
    },
    enabled: Boolean(companyCd && openYmd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useOpeningBalanceBanksQuery(openYmd: string, keyword = "") {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.openingBalance.banks(companyCd, openYmd, keyword),
    queryFn: async () => {
      const response = await getBeforeStateBanks({ openYmd, keyWORD: keyword || null })
      return response.data
    },
    enabled: Boolean(companyCd && openYmd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useOpeningBalanceCustomersQuery(openYmd: string, keyword = "") {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.openingBalance.customers(companyCd, openYmd, keyword),
    queryFn: async () => {
      const response = await getBeforeStateCustomers({ openYmd, keyWORD: keyword || null })
      return response.data
    },
    enabled: Boolean(companyCd && openYmd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useOpeningBalanceDepartmentsQuery(openYmd: string, keyword = "") {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.openingBalance.departments(companyCd, openYmd, keyword),
    queryFn: async () => {
      const response = await getBeforeStateDepartments({ openYmd, keyWORD: keyword || null })
      return response.data
    },
    enabled: Boolean(companyCd && openYmd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

function useOpeningBalanceInvalidate(scope: "summary" | "accounts" | "banks" | "customers" | "departments") {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.openingBalance.all, scope, companyCd],
    })
  }, [companyCd, queryClient, scope])
}

export function useOpeningBalanceAccountsMutations() {
  const invalidate = useOpeningBalanceInvalidate("accounts")

  const saveMutation = useMutation({
    mutationFn: (payload: BeforeState[]) => SaveBeforeState(payload),
    onSuccess: () => void invalidate(),
  })

  return { saveMutation, invalidate }
}

export function useOpeningBalanceBanksMutations() {
  const invalidate = useOpeningBalanceInvalidate("banks")

  const saveMutation = useMutation({
    mutationFn: (payload: BeforeStateBank[]) => SaveBeforeStateBank(payload),
    onSuccess: () => void invalidate(),
  })

  return { saveMutation, invalidate }
}

export function useOpeningBalanceCustomersMutations() {
  const invalidate = useOpeningBalanceInvalidate("customers")

  const saveMutation = useMutation({
    mutationFn: (payload: BeforeStateCustomer[]) => SaveBeforeStateCustomer(payload),
    onSuccess: () => void invalidate(),
  })

  return { saveMutation, invalidate }
}

export function useOpeningBalanceDepartmentsMutations() {
  const invalidate = useOpeningBalanceInvalidate("departments")

  const saveMutation = useMutation({
    mutationFn: (payload: BeforeStateDepartment[]) => SaveBeforeStateDepartment(payload),
    onSuccess: () => void invalidate(),
  })

  return { saveMutation, invalidate }
}

export type { BeforeStateBank, BeforeStateCustomer, BeforeStateDepartment }
