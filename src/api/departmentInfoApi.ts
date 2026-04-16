import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { convertLangToCode } from "@/utils/language"
import type {
  DeleteDepartmentInfosRequest,
  DepartmentInfoApi,
  DepartmentLookupItem,
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
    params.lang = convertLangToCode(lang)
  }

  const response = await axios.get<ApiEnvelope<DepartmentInfoApi[]>>(`${BASE_URL}`, { params })
  const { data } = normalizeResponse<DepartmentInfoApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function getDepartmentLookup(lang?: string): Promise<DepartmentLookupItem[]> {
  const params: Record<string, string> = {}

  if (lang) {
    params.lang = convertLangToCode(lang)
  }

  const response = await axios.get<ApiEnvelope<DepartmentLookupItem[]>>(`${BASE_URL}/lookup`, { params })
  const { data } = normalizeResponse<DepartmentLookupItem[]>(response)

  return Array.isArray(data) ? data : []
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

export async function deleteDepartmentInfo(
  departmentId: number,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.delete<ApiEnvelope<number>>(`${BASE_URL}/${departmentId}`)
  const { success, message } = normalizeResponse<number>(response)

  return { success: success ?? true, message }
}

export async function deleteDepartmentInfos(
  payload: DeleteDepartmentInfosRequest,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.post<ApiEnvelope<{ deleted: number }>>(`${BASE_URL}/bulk-delete`, payload)
  const { success, message } = normalizeResponse<{ deleted: number }>(response)

  return { success: success ?? true, message }
}

export async function checkDepartmentCdExists(
  departmentId: number | null | undefined,
  departmentCd: string,
): Promise<boolean> {
  const params: Record<string, string | number> = {}

  if (typeof departmentId === "number" && Number.isFinite(departmentId) && departmentId > 0) {
    params.departmentId = departmentId
  }

  if (departmentCd.trim()) {
    params.departmentCd = departmentCd.trim()
  }

  const response = await axios.get<ApiEnvelope<boolean>>(`${BASE_URL}/check-exists`, { params })
  const { data } = normalizeResponse<boolean>(response)

  return Boolean(data)
}

export async function exportDepartmentInfoExcel(
  departmentId?: number,
  lang?: string,
): Promise<Blob> {
  const params: Record<string, number | string> = {}

  if (typeof departmentId === "number" && Number.isFinite(departmentId) && departmentId > 0) {
    params.departmentId = departmentId
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

export async function importDepartmentInfoExcel(
  file: File,
  lang?: string,
): Promise<unknown> {
  const formData = new FormData()
  formData.append("file", file)

  const langParam = lang ? `?lang=${encodeURIComponent(convertLangToCode(lang))}` : ""
  const response = await axios.post(`${BASE_URL}/import${langParam}`, formData)

  return response.data
}
