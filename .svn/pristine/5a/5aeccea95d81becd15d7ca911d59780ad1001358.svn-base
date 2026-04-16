import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import type {
  CompanySignatureInfoApi,
  DeleteCompanySignaturesRequest,
} from "@/types/companySignatureInfo"

const BASE_URL = `${API_BASE_URL}/CompanySignatureInfo`

type ApiEnvelope<T> = {
  Data?: T
  Message?: string
  Success?: boolean
  data?: T
  message?: string
  success?: boolean
}

function normalizeResponse<T>(
  response: AxiosResponse<ApiEnvelope<T> | T>,
): { data: T; message?: string; success?: boolean } {
  const payload = response.data
  const envelope = (payload as ApiEnvelope<T>).Data ?? (payload as ApiEnvelope<T>).data

  return {
    data: (envelope ?? payload) as T,
    message: (payload as ApiEnvelope<T>).Message ?? (payload as ApiEnvelope<T>).message ?? "",
    success: (payload as ApiEnvelope<T>).Success ?? (payload as ApiEnvelope<T>).success ?? true,
  }
}

export async function getCompanySignatures(params?: {
  id?: number
  signCode?: string
  isActive?: boolean
}): Promise<{ data: CompanySignatureInfoApi[] }> {
  const query: Record<string, string | number | boolean> = {}

  if (typeof params?.id === "number" && Number.isFinite(params.id) && params.id > 0) {
    query.id = params.id
  }

  if (params?.signCode?.trim()) {
    query.signCode = params.signCode.trim()
  }

  if (typeof params?.isActive === "boolean") {
    query.isActive = params.isActive
  }

  const response = await axios.get<ApiEnvelope<CompanySignatureInfoApi[]>>(`${BASE_URL}`, { params: query })
  const { data } = normalizeResponse<CompanySignatureInfoApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function createCompanySignature(
  payload: Partial<CompanySignatureInfoApi>,
): Promise<{ data: CompanySignatureInfoApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<CompanySignatureInfoApi> | CompanySignatureInfoApi>(`${BASE_URL}`, payload)
  const { data, message } = normalizeResponse<CompanySignatureInfoApi>(response)

  return { data, message }
}

export async function updateCompanySignature(
  payload: Partial<CompanySignatureInfoApi>,
): Promise<{ data: CompanySignatureInfoApi; message?: string }> {
  if (!payload.ID || payload.ID <= 0) {
    throw new Error("ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<CompanySignatureInfoApi> | CompanySignatureInfoApi>(
    `${BASE_URL}/${payload.ID}`,
    payload,
  )
  const { data, message } = normalizeResponse<CompanySignatureInfoApi>(response)

  return { data, message }
}

export async function deleteCompanySignature(id: number): Promise<{ success: boolean; message?: string }> {
  const response = await axios.delete<ApiEnvelope<number>>(`${BASE_URL}/${id}`)
  const { success, message } = normalizeResponse<number>(response)

  return { success: success ?? true, message }
}

export async function deleteCompanySignatures(
  payload: DeleteCompanySignaturesRequest,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.post<ApiEnvelope<{ deleted: number }>>(`${BASE_URL}/bulk-delete`, payload)
  const { success, message } = normalizeResponse<{ deleted: number }>(response)

  return { success: success ?? true, message }
}
