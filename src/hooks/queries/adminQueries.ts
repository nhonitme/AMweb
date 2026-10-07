import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { getCompanyDecimalSettings } from "@/api/companyDecimalSettingApi"
import { getCompanySignatures } from "@/api/companySignatureInfoApi"
import { getCompanyInfo, updateCompanyInfo } from "@/api/companyInfoApi"
import { getFixedAssets, type FixedAssetListQuery } from "@/api/fixedAssetApi"
import { getMyProfile } from "@/api/profileApi"
import { getReportSignatureMapping, updateReportSignatureMapping } from "@/api/reportSignatureMappingApi"
import { getSysCodeSequences } from "@/api/sysCodeSequenceApi"
import {
  createUserInfo,
  deleteUserInfos,
  getUserInfos,
  updateUserInfo,
} from "@/api/userInfoApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { CompanyInfo, CompanyInfoUpdateRequest } from "@/types/companyInfo"
import type { SaveReportSignatureMappingRequest } from "@/types/reportSignatureMapping"
import type { UserInfoApi } from "@/types/userInfo"

export function useUserListQuery(lang: string) {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.admin.users(companyCd, lang),
    queryFn: async () => {
      const response = await getUserInfos(undefined, lang)
      return response.data
    },
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useUserListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.admin.all, "users", companyCd],
    })
  }, [companyCd, queryClient])
}

export function useUserMutations() {
  const invalidate = useUserListInvalidate()

  const createMutation = useMutation({
    mutationFn: (payload: Partial<UserInfoApi>) => createUserInfo(payload),
    onSuccess: () => invalidate(),
  })

  const updateMutation = useMutation({
    mutationFn: (payload: Partial<UserInfoApi>) => updateUserInfo(payload),
    onSuccess: () => invalidate(),
  })

  const deleteMutation = useMutation({
    mutationFn: (ids: number[]) => deleteUserInfos(ids),
    onSuccess: () => invalidate(),
  })

  return { createMutation, updateMutation, deleteMutation, invalidate }
}

export function useFixedAssetListQuery(query: FixedAssetListQuery = {}) {
  const companyCd = getCurrentCompanyCd()
  const status = query.status?.trim() ?? ""
  const accCd = query.accCd?.trim() ?? ""

  return useQuery({
    queryKey: queryKeys.admin.fixedAssets(companyCd, status, accCd),
    queryFn: () => getFixedAssets(query),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useFixedAssetListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.admin.all, "fixed-assets", companyCd],
    })
  }, [companyCd, queryClient])
}

export function useCompanyInfoQuery() {
  const companyCd = getCurrentCompanyCd()

  return useQuery({
    queryKey: queryKeys.admin.companyInfo(companyCd),
    queryFn: () => getCompanyInfo(companyCd),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useCompanyInfoMutations() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  const updateMutation = useMutation({
    mutationFn: (payload: CompanyInfoUpdateRequest) => updateCompanyInfo(payload),
    onSuccess: async () => {
      await queryClient.invalidateQueries({
        queryKey: queryKeys.admin.companyInfo(companyCd),
      })
    },
  })

  return { updateMutation }
}

export function useMyProfileQuery() {
  return useQuery({
    queryKey: queryKeys.admin.profile(),
    queryFn: async () => {
      const response = await getMyProfile()
      return response.data
    },
    staleTime: STALE_TIME.USER_SETTING,
  })
}

export function useMyProfileInvalidate() {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.admin.profile(),
    })
  }, [queryClient])
}

export function useCompanySignaturesQuery(companyCd: string) {
  return useQuery({
    queryKey: queryKeys.admin.companySignatures(companyCd),
    queryFn: () => getCompanySignatures(),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useCompanySignaturesInvalidate(companyCd: string) {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.admin.companySignatures(companyCd),
    })
  }, [companyCd, queryClient])
}

export function useSysCodeSequencesQuery(objectType?: string) {
  const companyCd = getCurrentCompanyCd()
  const normalizedType = objectType?.trim() ?? ""

  return useQuery({
    queryKey: queryKeys.admin.sysCodeSequences(companyCd, normalizedType),
    queryFn: () => getSysCodeSequences(normalizedType || undefined),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useSysCodeSequencesInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.admin.all, "sys-code-sequences", companyCd],
    })
  }, [companyCd, queryClient])
}

export function useCompanyDecimalSettingsQuery(companyCd: string) {
  return useQuery({
    queryKey: queryKeys.admin.companyDecimalSettings(companyCd),
    queryFn: () => getCompanyDecimalSettings(companyCd),
    enabled: Boolean(companyCd),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useCompanyDecimalSettingsInvalidate(companyCd: string) {
  const queryClient = useQueryClient()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.admin.companyDecimalSettings(companyCd),
    })
  }, [companyCd, queryClient])
}

export function useReportSignatureMappingQuery(reportKey: string, reportCode?: string) {
  const companyCd = getCurrentCompanyCd()
  const normalizedKey = reportKey.trim()
  const normalizedCode = reportCode?.trim() ?? ""

  return useQuery({
    queryKey: queryKeys.admin.reportSignatureMapping(companyCd, normalizedKey, normalizedCode),
    queryFn: () => getReportSignatureMapping(normalizedKey, normalizedCode || undefined),
    enabled: Boolean(companyCd && normalizedKey),
    staleTime: STALE_TIME.MASTER,
  })
}

export function useReportSignatureMappingMutations(reportKey: string, reportCode?: string) {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()
  const normalizedKey = reportKey.trim()
  const normalizedCode = reportCode?.trim() ?? ""

  const invalidate = useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.admin.reportSignatureMapping(companyCd, normalizedKey, normalizedCode),
    })
  }, [companyCd, normalizedCode, normalizedKey, queryClient])

  const saveMutation = useMutation({
    mutationFn: (payload: SaveReportSignatureMappingRequest) =>
      updateReportSignatureMapping(normalizedKey, payload),
    onSuccess: () => void invalidate(),
  })

  return { saveMutation, invalidate }
}
