import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import type {
  SysGridColumnBundle,
  SysGridColumnResetRequest,
  SysGridColumnSettingSaveRequest,
} from "@/types/sysGridColumnSetting"

const BASE_URL = `${API_BASE_URL}/SysGridColumnSetting`

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

function emptyBundle(): SysGridColumnBundle {
  return { COLUMNS: [], TEMPLATES: [], SETTINGS: [] }
}

function asBundle(data: SysGridColumnBundle | null | undefined): SysGridColumnBundle {
  if (!data || typeof data !== "object") {
    return emptyBundle()
  }

  return {
    COLUMNS: Array.isArray(data.COLUMNS) ? data.COLUMNS : [],
    TEMPLATES: Array.isArray(data.TEMPLATES) ? data.TEMPLATES : [],
    SETTINGS: Array.isArray(data.SETTINGS) ? data.SETTINGS : [],
  }
}

export async function getAllSysGridColumnSettings(): Promise<{
  data: SysGridColumnBundle
  message?: string
  success?: boolean
}> {
  const response = await axios.get<ApiEnvelope<SysGridColumnBundle> | SysGridColumnBundle>(`${BASE_URL}/all`)
  const { data, message, success } = normalizeResponse<SysGridColumnBundle>(response)
  return { data: asBundle(data), message, success }
}

export async function saveSysGridColumnSettings(
  payload: SysGridColumnSettingSaveRequest,
): Promise<{ data: SysGridColumnBundle; message?: string; success?: boolean }> {
  const response = await axios.put<ApiEnvelope<SysGridColumnBundle> | SysGridColumnBundle>(BASE_URL, payload)
  const { data, message, success } = normalizeResponse<SysGridColumnBundle>(response)
  return { data: asBundle(data), message, success }
}

export async function resetSysGridColumnTemplate(
  payload: SysGridColumnResetRequest,
): Promise<{ data: SysGridColumnBundle; message?: string; success?: boolean }> {
  const response = await axios.post<ApiEnvelope<SysGridColumnBundle> | SysGridColumnBundle>(
    `${BASE_URL}/reset`,
    payload,
  )
  const { data, message, success } = normalizeResponse<SysGridColumnBundle>(response)
  return { data: asBundle(data), message, success }
}
