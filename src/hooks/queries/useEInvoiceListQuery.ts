import { useQuery, useQueryClient } from "@tanstack/react-query"
import { useCallback } from "react"

import { getEInvoices, getEInvoicesPaged } from "@/api/einvoiceApi"
import { getEInvoiceDeclarations } from "@/api/einvoiceDeclarationApi"
import { getEInvoiceErrorNotices } from "@/api/einvoiceErrorNoticeApi"
import { getEInvoiceMinutes } from "@/api/einvoiceMinuteApi"
import { getCurrentCompanyCd } from "@/lib/login"
import { resolvePageNumber, resolvePageSize } from "@/lib/paging"
import { queryKeys, STALE_TIME } from "@/lib/query/queryKeys"
import type { EInvoiceApi, EInvoiceSearchParams } from "@/types/einvoice"
import type { EInvoiceDeclarationSearchParams } from "@/types/einvoiceDeclaration"
import type { EInvoiceErrorNoticeSearchParams } from "@/types/einvoiceErrorNotice"
import type { EInvoiceMinuteSearchParams } from "@/types/einvoiceMinute"

export type EInvoiceListQueryParams = {
  cashRegister?: boolean
  lang: string
  fromYmd?: string
  toYmd?: string
  keyword?: string
  invoiceId?: number
  khhdon?: string
  khhdonOp?: string
  shdonFrom?: string
  shdonTo?: string
  nmuaTen?: string
  nmuaTenOp?: string
  nmuaMst?: string
  nmuaMstOp?: string
  invoiceStatus?: number
  cqtStatus?: number
  isSigned?: number
  tchdon?: number
  mailStatus?: number
}

export type EInvoicePagedListQueryParams = EInvoiceListQueryParams & {
  pageNumber: number
  pageSize: number
  includeDetails?: boolean
}

export type EInvoiceDateRangeQueryParams = {
  fromYmd?: string
  toYmd?: string
  keyword?: string
}

function buildAdvancedFiltersKey(params: Partial<EInvoiceListQueryParams>): string {
  return JSON.stringify({
    cashRegister: params.cashRegister ?? null,
    khhdon: params.khhdon ?? "",
    khhdonOp: params.khhdonOp ?? "",
    shdonFrom: params.shdonFrom ?? "",
    shdonTo: params.shdonTo ?? "",
    nmuaTen: params.nmuaTen ?? "",
    nmuaTenOp: params.nmuaTenOp ?? "",
    nmuaMst: params.nmuaMst ?? "",
    nmuaMstOp: params.nmuaMstOp ?? "",
    invoiceStatus: params.invoiceStatus ?? null,
    cqtStatus: params.cqtStatus ?? null,
    isSigned: params.isSigned ?? null,
    tchdon: params.tchdon ?? null,
    mailStatus: params.mailStatus ?? null,
  })
}

function toAdvancedSearchParams(params: EInvoiceListQueryParams): Partial<EInvoiceSearchParams> {
  return {
    cashRegister: params.cashRegister,
    khhdon: params.khhdon || undefined,
    khhdonOp: params.khhdonOp || undefined,
    shdonFrom: params.shdonFrom || undefined,
    shdonTo: params.shdonTo || undefined,
    nmuaTen: params.nmuaTen || undefined,
    nmuaTenOp: params.nmuaTenOp || undefined,
    nmuaMst: params.nmuaMst || undefined,
    nmuaMstOp: params.nmuaMstOp || undefined,
    invoiceStatus: params.invoiceStatus,
    cqtStatus: params.cqtStatus,
    isSigned: params.isSigned,
    tchdon: params.tchdon,
    mailStatus: params.mailStatus,
  }
}

export function useEInvoiceListQuery(params: EInvoiceListQueryParams, enabled = true) {
  const companyCd = getCurrentCompanyCd()
  const fromYmd = params.fromYmd ?? ""
  const toYmd = params.toYmd ?? ""
  const keyword = params.keyword ?? ""
  const invoiceId = params.invoiceId ?? 0
  const filtersKey = buildAdvancedFiltersKey(params)

  return useQuery({
    queryKey: queryKeys.transaction.einvoices(companyCd, params.lang, fromYmd, toYmd, keyword, invoiceId, undefined, undefined, filtersKey),
    queryFn: async () => {
      const searchParams: EInvoiceSearchParams = {
        invoiceId: invoiceId > 0 ? invoiceId : undefined,
        fromYmd: fromYmd || undefined,
        toYmd: toYmd || undefined,
        keyword: keyword || undefined,
        lang: params.lang,
        ...toAdvancedSearchParams(params),
      }
      const response = await getEInvoices(searchParams)
      return response.data
    },
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useEInvoicePagedListQuery(params: EInvoicePagedListQueryParams, enabled = true) {
  const companyCd = getCurrentCompanyCd()
  const fromYmd = params.fromYmd ?? ""
  const toYmd = params.toYmd ?? ""
  const keyword = params.keyword ?? ""
  const invoiceId = params.invoiceId ?? 0
  const pageNumber = resolvePageNumber(params.pageNumber)
  const pageSize = resolvePageSize(params.pageSize)
  const filtersKey = buildAdvancedFiltersKey(params)
  const hasLinkedFilter = invoiceId > 0 || keyword.length > 0 || filtersKey !== buildAdvancedFiltersKey({})
  const hasValidRange = hasLinkedFilter || !fromYmd || !toYmd || fromYmd <= toYmd

  return useQuery({
    queryKey: queryKeys.transaction.einvoices(
      companyCd,
      params.lang,
      fromYmd,
      toYmd,
      keyword,
      invoiceId,
      pageNumber,
      pageSize,
      filtersKey,
    ),
    queryFn: () =>
      getEInvoicesPaged({
        lang: params.lang || undefined,
        fromYmd: fromYmd || undefined,
        toYmd: toYmd || undefined,
        keyword: keyword || undefined,
        invoiceId: invoiceId > 0 ? invoiceId : undefined,
        includeDetails: params.includeDetails ?? true,
        pageNumber,
        pageSize,
        ...toAdvancedSearchParams(params),
      }),
    enabled: enabled && Boolean(companyCd) && hasValidRange,
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useEInvoiceListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: queryKeys.transaction.einvoiceRoot(companyCd),
    })
  }, [companyCd, queryClient])
}

export function useEInvoicePagedListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.transaction.einvoiceRoot(companyCd), "list"],
    })
  }, [companyCd, queryClient])
}

export function useEInvoiceDeclarationListQuery(params: EInvoiceDateRangeQueryParams, enabled = true) {
  const companyCd = getCurrentCompanyCd()
  const fromYmd = params.fromYmd ?? ""
  const toYmd = params.toYmd ?? ""
  const keyword = params.keyword ?? ""

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceDeclarations(companyCd, fromYmd, toYmd, keyword),
    queryFn: async () => {
      const searchParams: EInvoiceDeclarationSearchParams = {
        fromYmd: fromYmd || undefined,
        toYmd: toYmd || undefined,
        keyword: keyword || undefined,
      }
      const response = await getEInvoiceDeclarations(searchParams)
      return response.data
    },
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useEInvoiceDeclarationListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.transaction.einvoiceRoot(companyCd), "declarations"],
    })
  }, [companyCd, queryClient])
}

export function useEInvoiceErrorNoticeListQuery(params: EInvoiceDateRangeQueryParams, enabled = true) {
  const companyCd = getCurrentCompanyCd()
  const fromYmd = params.fromYmd ?? ""
  const toYmd = params.toYmd ?? ""
  const keyword = params.keyword ?? ""

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceErrorNotices(companyCd, fromYmd, toYmd, keyword),
    queryFn: async () => {
      const searchParams: EInvoiceErrorNoticeSearchParams = {
        fromYmd: fromYmd || undefined,
        toYmd: toYmd || undefined,
        keyword: keyword || undefined,
      }
      const response = await getEInvoiceErrorNotices(searchParams)
      return response.data
    },
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useEInvoiceErrorNoticeListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.transaction.einvoiceRoot(companyCd), "error-notices"],
    })
  }, [companyCd, queryClient])
}

export type EInvoiceMinuteListQueryParams = {
  fromYmd?: string
  toYmd?: string
  keyword?: string
  isSigned?: number
}

export function useEInvoiceMinuteListQuery(params: EInvoiceMinuteListQueryParams, enabled = true) {
  const companyCd = getCurrentCompanyCd()
  const fromYmd = params.fromYmd ?? ""
  const toYmd = params.toYmd ?? ""
  const keyword = params.keyword ?? ""
  const isSigned = typeof params.isSigned === "number" ? params.isSigned : -1

  return useQuery({
    queryKey: queryKeys.transaction.einvoiceMinutes(companyCd, fromYmd, toYmd, keyword, String(isSigned)),
    queryFn: async () => {
      const searchParams: EInvoiceMinuteSearchParams = {
        fromYmd: fromYmd || undefined,
        toYmd: toYmd || undefined,
        keyword: keyword || undefined,
        isSigned: isSigned >= 0 ? isSigned : undefined,
      }
      const response = await getEInvoiceMinutes(searchParams)
      return response.data
    },
    enabled: enabled && Boolean(companyCd),
    staleTime: STALE_TIME.TRANSACTION,
  })
}

export function useEInvoiceMinuteListInvalidate() {
  const queryClient = useQueryClient()
  const companyCd = getCurrentCompanyCd()

  return useCallback(async () => {
    await queryClient.invalidateQueries({
      queryKey: [...queryKeys.transaction.einvoiceRoot(companyCd), "minutes"],
    })
  }, [companyCd, queryClient])
}
