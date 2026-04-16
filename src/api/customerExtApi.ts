import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { convertLangToCode } from "@/utils/language"
import type { CustomerExtApi, DeleteCustomerInfosRequest } from "@/types/customerExt"

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
    params.lang = convertLangToCode(lang)
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

export async function deleteCustomerExt(
  customerId: number,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.delete<ApiEnvelope<number>>(`${BASE_URL}/${customerId}`)
  const { success, message } = normalizeResponse<number>(response)
  return { success: success ?? true, message }
}

export async function deleteCustomerExts(
  payload: DeleteCustomerInfosRequest,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.post<ApiEnvelope<{ deleted: number }>>(`${BASE_URL}/bulk-delete`, payload)
  const { success, message } = normalizeResponse<{ deleted: number }>(response)
  return { success: success ?? true, message }
}

export async function checkCustomerCdExists(
  customerId: number | null | undefined,
  customerCd: string,
): Promise<boolean> {
  const params: Record<string, string | number> = {}

  if (typeof customerId === "number" && Number.isFinite(customerId) && customerId > 0) {
    params.customerId = customerId
  }

  if (customerCd.trim()) {
    params.customerCd = customerCd.trim()
  }

  const response = await axios.get<ApiEnvelope<boolean>>(`${BASE_URL}/check-exists`, { params })
  const { data } = normalizeResponse<boolean>(response)
  return Boolean(data)
}

export async function exportCustomerExtExcel(
  customerId?: number,
  lang?: string,
): Promise<Blob> {
  const params: Record<string, string | number> = {}

  if (typeof customerId === "number" && Number.isFinite(customerId) && customerId > 0) {
    params.customerId = customerId
  }

  if (lang) {
    params.lang = convertLangToCode(lang)
  }

  const response = await axios.get(`${BASE_URL}/export`, {
    params,
    responseType: "blob",
  })

  return response.data as Blob
}

export async function importCustomerExtExcel(
  file: File,
  lang?: string,
): Promise<unknown> {
  const formData = new FormData()
  formData.append("file", file)

  const langParam = lang ? `?lang=${encodeURIComponent(convertLangToCode(lang))}` : ""
  const response = await axios.post(`${BASE_URL}/import${langParam}`, formData)
  return response.data
}
