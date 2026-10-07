import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { normalizeMessageLanguageKey } from "@/utils/language"
import { deleteMasterRecords } from "@/lib/masterDelete"
import type {
  ManagementInfoApi,
  ManagementInfoRequest,
} from "@/types/managementInfo"

const BASE_URL = `${API_BASE_URL}/ManagementInfo`

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

export async function getManagementInfos(
  mgCd?: string,
  lang?: string,
  managementId?: number,
): Promise<{ data: ManagementInfoApi[] }> {
  const params: Record<string, string | number> = {}

  if (typeof managementId === "number" && Number.isFinite(managementId) && managementId > 0) {
    params.managementId = managementId
  }

  if (mgCd) {
    params.mgCd = mgCd
  }

  if (lang) {
    params.lang = normalizeMessageLanguageKey(lang)
  }

  const response = await axios.get<ApiEnvelope<ManagementInfoApi[]>>(`${BASE_URL}`, { params })
  const { data } = normalizeResponse<ManagementInfoApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function createManagementInfo(
  payload: ManagementInfoRequest,
  lang?: string,
): Promise<{ data: ManagementInfoApi; message?: string }> {
  const langParam = lang ? `?lang=${encodeURIComponent(normalizeMessageLanguageKey(lang))}` : ""
  const response = await axios.post<ApiEnvelope<ManagementInfoApi> | ManagementInfoApi>(`${BASE_URL}${langParam}`, payload)
  const { data, message } = normalizeResponse<ManagementInfoApi>(response)

  return { data, message }
}

export async function updateManagementInfo(
  payload: ManagementInfoRequest,
  lang?: string,
): Promise<{ data: ManagementInfoApi; message?: string }> {
  if (!payload.MG_ID || payload.MG_ID <= 0) {
    throw new Error("MG_ID is required for update")
  }

  const langParam = lang ? `?lang=${encodeURIComponent(normalizeMessageLanguageKey(lang))}` : ""
  const response = await axios.put<ApiEnvelope<ManagementInfoApi> | ManagementInfoApi>(
    `${BASE_URL}/${payload.MG_ID}${langParam}`,
    payload,
  )
  const { data, message } = normalizeResponse<ManagementInfoApi>(response)

  return { data, message }
}

export async function deleteManagementInfos(
  managementIds: number[],
): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, managementIds, "ManagementIds")
}

export async function exportManagementInfoExcel(
  managementId?: number,
  lang?: string, abortSignal?: AbortSignal,
): Promise<Blob> {
  const params: Record<string, number | string> = {}

  if (typeof managementId === "number" && Number.isFinite(managementId) && managementId > 0) {
    params.managementId = managementId
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
