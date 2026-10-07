import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { deleteMasterRecords } from "@/lib/masterDelete"
import { normalizeMessageLanguageKey } from "@/utils/language"
import type {
  DepartmentInfoApi,
} from "@/types/departmentInfo"

const BASE_URL = `${API_BASE_URL}/DepartmentInfo`

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

export async function getDepartmentInfos(
  departmentCd?: string,
  lang?: string,
): Promise<{ data: DepartmentInfoApi[] }> {
  const params: Record<string, string> = {}

  if (departmentCd) {
    params.departmentCd = departmentCd
  }

  if (lang) {
    params.lang = normalizeMessageLanguageKey(lang)
  }

  const response = await axios.get<ApiEnvelope<DepartmentInfoApi[]>>(`${BASE_URL}`, { params })
  const { data } = normalizeResponse<DepartmentInfoApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function createDepartmentInfo(
  payload: Partial<DepartmentInfoApi>,
): Promise<{ data: DepartmentInfoApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<DepartmentInfoApi> | DepartmentInfoApi>(`${BASE_URL}`, payload)
  const { data, message } = normalizeResponse<DepartmentInfoApi>(response)

  return { data, message }
}

export async function updateDepartmentInfo(
  payload: Partial<DepartmentInfoApi>,
): Promise<{ data: DepartmentInfoApi; message?: string }> {
  if (!payload.DEPARTMENT_ID || payload.DEPARTMENT_ID <= 0) {
    throw new Error("DEPARTMENT_ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<DepartmentInfoApi> | DepartmentInfoApi>(`${BASE_URL}/${payload.DEPARTMENT_ID}`, payload)
  const { data, message } = normalizeResponse<DepartmentInfoApi>(response)

  return { data, message }
}

export async function deleteDepartmentInfos(
  departmentIds: number[],
): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, departmentIds, "DepartmentIds")
}

export async function exportDepartmentInfoExcel(
  departmentId?: number,
  lang?: string, abortSignal?: AbortSignal,
): Promise<Blob> {
  const params: Record<string, number | string> = {}

  if (typeof departmentId === "number" && Number.isFinite(departmentId) && departmentId > 0) {
    params.departmentId = departmentId
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
