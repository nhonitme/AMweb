import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { normalizeMessageLanguageKey } from "@/utils/language"
import { deleteMasterRecords } from "@/lib/masterDelete"
import type { CustomerExtApi } from "@/types/customerExt"

const BASE_URL = `${API_BASE_URL}/CustomerInfoCustomerExt`

type ApiEnvelope<T> = {
  Data?: T
  Message?: string
  Success?: boolean
  data?: T
  message?: string
  success?: boolean
}

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

export async function getCustomerExts(
  customerCd?: string,
  lang?: string,
  customerId?: number,
): Promise<{ data: CustomerExtApi[] }> {
  const params: Record<string, string | number> = {}

  if (typeof customerId === "number" && Number.isFinite(customerId) && customerId > 0) {
    params.customerId = customerId
  }

  if (customerCd) {
    params.customerCd = customerCd
  }

  if (lang) {
    params.lang = normalizeMessageLanguageKey(lang)
  }

  const response = await axios.get<ApiEnvelope<CustomerExtApi[]>>(`${BASE_URL}`, { params })
  const { data } = normalizeResponse<CustomerExtApi[]>(response)
  return { data: Array.isArray(data) ? data : [] }
}

export async function createCustomerExt(
  payload: Partial<CustomerExtApi>,
): Promise<{ data: CustomerExtApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<CustomerExtApi> | CustomerExtApi>(`${BASE_URL}`, payload)
  const { data, message } = normalizeResponse<CustomerExtApi>(response)
  return { data, message }
}

export async function updateCustomerExt(
  payload: Partial<CustomerExtApi>,
): Promise<{ data: CustomerExtApi; message?: string }> {
  if (!payload.CUSTOMER_ID || payload.CUSTOMER_ID <= 0) {
    throw new Error("CUSTOMER_ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<CustomerExtApi> | CustomerExtApi>(`${BASE_URL}/${payload.CUSTOMER_ID}`, payload)
  const { data, message } = normalizeResponse<CustomerExtApi>(response)
  return { data, message }
}

export async function deleteCustomerExts(
  customerIds: number[],
): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, customerIds, "CustomerIds")
}

export async function exportCustomerExtExcel(
  customerId?: number,
  lang?: string, abortSignal?: AbortSignal,
): Promise<Blob> {
  const params: Record<string, string | number> = {}

  if (typeof customerId === "number" && Number.isFinite(customerId) && customerId > 0) {
    params.customerId = customerId
  }

  if (lang) {
    params.lang = normalizeMessageLanguageKey(lang)
  }

  const response = await axios.get(`${BASE_URL}/export`, {
    params,
    signal: abortSignal, responseType: "blob",
  })

  return response.data as Blob
}
