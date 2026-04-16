import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { convertLangToCode } from "@/utils/language"
import type { BankInfoApi, DeleteBankInfosRequest } from "@/types/bankInfo"

const BASE_URL = `${API_BASE_URL}/BankInfo`

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

export async function getBankInfos(
  bankCd?: string,
  lang?: string,
  bankId?: number,
): Promise<{ data: BankInfoApi[] }> {
  const params: Record<string, string | number> = {}

  if (typeof bankId === "number" && Number.isFinite(bankId) && bankId > 0) {
    params.bankId = bankId
  }

  if (bankCd) {
    params.bankCd = bankCd
  }

  if (lang) {
    params.lang = convertLangToCode(lang)
  }

  const response = await axios.get<ApiEnvelope<BankInfoApi[]>>(`${BASE_URL}`, { params })
  const { data } = normalizeResponse<BankInfoApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function createBankInfo(
  payload: Partial<BankInfoApi>,
): Promise<{ data: BankInfoApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<BankInfoApi> | BankInfoApi>(`${BASE_URL}`, payload)
  const { data, message } = normalizeResponse<BankInfoApi>(response)

  return { data, message }
}

export async function updateBankInfo(
  payload: Partial<BankInfoApi>,
): Promise<{ data: BankInfoApi; message?: string }> {
  if (!payload.BANK_ID || payload.BANK_ID <= 0) {
    throw new Error("BANK_ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<BankInfoApi> | BankInfoApi>(`${BASE_URL}/${payload.BANK_ID}`, payload)
  const { data, message } = normalizeResponse<BankInfoApi>(response)

  return { data, message }
}

export async function deleteBankInfo(
  bankId: number,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.delete<ApiEnvelope<number>>(`${BASE_URL}/${bankId}`)
  const { success, message } = normalizeResponse<number>(response)

  return { success: success ?? true, message }
}

export async function deleteBankInfos(
  payload: DeleteBankInfosRequest,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.post<ApiEnvelope<{ deleted: number }>>(`${BASE_URL}/bulk-delete`, payload)
  const { success, message } = normalizeResponse<{ deleted: number }>(response)

  return { success: success ?? true, message }
}

export async function checkBankCdExists(
  bankId: number | null | undefined,
  bankCd: string,
): Promise<boolean> {
  const params: Record<string, string | number> = {}

  if (typeof bankId === "number" && Number.isFinite(bankId) && bankId > 0) {
    params.bankId = bankId
  }

  if (bankCd.trim()) {
    params.bankCd = bankCd.trim()
  }

  const response = await axios.get<ApiEnvelope<boolean>>(`${BASE_URL}/check-exists`, { params })
  const { data } = normalizeResponse<boolean>(response)

  return Boolean(data)
}

export async function exportBankInfoExcel(
  bankId?: number,
  lang?: string,
): Promise<Blob> {
  const params: Record<string, number | string> = {}

  if (typeof bankId === "number" && Number.isFinite(bankId) && bankId > 0) {
    params.bankId = bankId
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

export async function importBankInfoExcel(
  file: File,
  lang?: string,
): Promise<unknown> {
  const formData = new FormData()
  formData.append("file", file)

  const langParam = lang ? `?lang=${encodeURIComponent(convertLangToCode(lang))}` : ""
  const response = await axios.post(`${BASE_URL}/import${langParam}`, formData)

  return response.data
}
