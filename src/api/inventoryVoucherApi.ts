import type { AxiosResponse } from "axios"

import { DEFAULT_PAGE_SIZE, normalizePagedResult, resolvePageNumber, resolvePageSize } from "@/lib/paging"
import type { PagedResult } from "@/types/paging"
import type { InventoryInputType, InventoryVoucherApi } from "@/types/voucher"
import API_BASE_URL from "../config/apiConfig"
import axios from "./axiosClient"

type ApiEnvelope<T> = {
  Data?: T
  Message?: string
  Success?: boolean
  data?: T
  message?: string
  success?: boolean
  PageNumber?: number
  PageSize?: number
  TotalRecords?: number
  TotalPages?: number
  HasPrevious?: boolean
  HasNext?: boolean
}

type InventoryVoucherType = "IR" | "IO" | "IA"

type InventoryVoucherFilters = {
  fromYmd?: string | null
  toYmd?: string | null
  chitId?: number | null
  pageNumber?: number
  pageSize?: number
}

type ExportInventoryVoucherFilters = Omit<InventoryVoucherFilters, "pageNumber" | "pageSize">

function unwrapPayload<T>(response: AxiosResponse<ApiEnvelope<T> | T>): ApiEnvelope<T> | T {
  return response.data
}

function normalizeResponse<T>(
  response: AxiosResponse<ApiEnvelope<T> | T>,
): { data: T; message?: string; success?: boolean } {
  const payload = unwrapPayload(response)
  const envelope = (payload as ApiEnvelope<T>).Data ?? (payload as ApiEnvelope<T>).data

  return {
    data: (envelope ?? payload) as T,
    message: (payload as ApiEnvelope<T>).Message ?? (payload as ApiEnvelope<T>).message ?? "",
    success: (payload as ApiEnvelope<T>).Success ?? (payload as ApiEnvelope<T>).success ?? true,
  }
}

function normalizePagedResponse<T>(
  response: AxiosResponse<ApiEnvelope<T[]> | T[]>,
  fallbackPageNumber = 1,
  fallbackPageSize = DEFAULT_PAGE_SIZE,
): PagedResult<T> {
  const payload = unwrapPayload(response) as ApiEnvelope<T[]> & Record<string, unknown>
  const envelope = payload.Data ?? payload.data
  const data = Array.isArray(envelope ?? payload) ? ((envelope ?? payload) as T[]) : []
  return normalizePagedResult(payload, data, fallbackPageNumber, fallbackPageSize)
}

function getInventoryBaseUrl(): string {
  return `${API_BASE_URL}/ChitInventory`
}

export async function getInventoryVouchers(
  ledger: InventoryInputType,
  chitType: InventoryVoucherType,
  filters: InventoryVoucherFilters = {},
): Promise<PagedResult<InventoryVoucherApi>> {
  const params: Record<string, boolean | string | number> = {
    INPUT_TYPE: ledger,
    CHIT_TYPE: chitType,
  }

  if (filters.chitId && filters.chitId > 0) params.CHIT_ID = filters.chitId
  if (filters.fromYmd) params.FROM_YMD = filters.fromYmd
  if (filters.toYmd) params.TO_YMD = filters.toYmd
  if (filters.pageNumber && filters.pageNumber > 0) params.PAGE_NUMBER = filters.pageNumber
  if (filters.pageSize && filters.pageSize > 0) params.PAGE_SIZE = filters.pageSize

  const response = await axios.get<ApiEnvelope<InventoryVoucherApi[]>>(`${getInventoryBaseUrl()}/Get`, {
    params,
  })

  return normalizePagedResponse<InventoryVoucherApi>(
    response,
    resolvePageNumber(filters.pageNumber),
    resolvePageSize(filters.pageSize),
  )
}

export async function createInventoryVoucher(
  ledger: InventoryInputType,
  chitType: InventoryVoucherType,
  payload: InventoryVoucherApi,
): Promise<{ data: InventoryVoucherApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<InventoryVoucherApi> | InventoryVoucherApi>(
    `${getInventoryBaseUrl()}/Create`,
    {
      ...payload,
      INPUT_TYPE: ledger,
      CHIT_TYPE: chitType,
    },
  )
  const { data, message } = normalizeResponse<InventoryVoucherApi>(response)
  return { data, message }
}

export async function updateInventoryVoucher(
  ledger: InventoryInputType,
  chitType: InventoryVoucherType,
  payload: InventoryVoucherApi,
): Promise<{ data: InventoryVoucherApi; message?: string }> {
  const response = await axios.put<ApiEnvelope<InventoryVoucherApi> | InventoryVoucherApi>(
    `${getInventoryBaseUrl()}/Update`,
    {
      ...payload,
      INPUT_TYPE: ledger,
      CHIT_TYPE: chitType,
    },
  )
  const { data, message } = normalizeResponse<InventoryVoucherApi>(response)
  return { data, message }
}

export async function deleteInventoryVoucher(
  ledger: InventoryInputType,
  chitType: InventoryVoucherType,
  chitId: number,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.delete<ApiEnvelope<number>>(`${getInventoryBaseUrl()}/Delete`, {
    params: {
      INPUT_TYPE: ledger,
      CHIT_TYPE: chitType,
      CHIT_ID: chitId,
    },
  })
  const { success, message } = normalizeResponse<number>(response)
  return { success: success ?? true, message }
}

export async function exportInventoryVoucherExcel(
  ledger: InventoryInputType,
  chitType: InventoryVoucherType,
  filters: ExportInventoryVoucherFilters = {}, abortSignal?: AbortSignal,
): Promise<Blob> {
  const params: Record<string, string | number> = {
    INPUT_TYPE: ledger,
    CHIT_TYPE: chitType,
  }

  if (filters.chitId && filters.chitId > 0) params.CHIT_ID = filters.chitId
  if (filters.fromYmd) params.FROM_YMD = filters.fromYmd
  if (filters.toYmd) params.TO_YMD = filters.toYmd

  const response = await axios.get(`${getInventoryBaseUrl()}/ExportExcel`, {
    params,
    signal: abortSignal, responseType: "blob",
  })

  return response.data
}
