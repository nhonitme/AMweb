import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import type {
  SysGridColumnSetting,
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

export async function getSysGridColumnSettings(
  screenCd: string,
  gridId: string,
): Promise<{ data: SysGridColumnSetting[]; message?: string; success?: boolean }> {
  const response = await axios.get<ApiEnvelope<SysGridColumnSetting[]> | SysGridColumnSetting[]>(BASE_URL, {
    params: {
      screenCd,
      gridId,
      activeOnly: true,
    },
  })

  const { data, message, success } = normalizeResponse<SysGridColumnSetting[]>(response)
  return {
    data: Array.isArray(data) ? data : [],
    message,
    success,
  }
}

export async function getAllSysGridColumnSettings(
  activeOnly = true,
): Promise<{ data: SysGridColumnSetting[]; message?: string; success?: boolean }> {
  const response = await axios.get<ApiEnvelope<SysGridColumnSetting[]> | SysGridColumnSetting[]>(
    `${BASE_URL}/all`,
    {
      params: {
        activeOnly,
      },
    },
  )

  const { data, message, success } = normalizeResponse<SysGridColumnSetting[]>(response)
  return {
    data: Array.isArray(data) ? data : [],
    message,
    success,
  }
}

export async function saveSysGridColumnSettings(
  screenCd: string,
  gridId: string,
  payload: SysGridColumnSettingSaveRequest,
): Promise<{ data: SysGridColumnSetting[]; message?: string; success?: boolean }> {
  const response = await axios.put<ApiEnvelope<SysGridColumnSetting[]> | SysGridColumnSetting[]>(BASE_URL, payload, {
    params: {
      screenCd,
      gridId,
    },
  })

  const { data, message, success } = normalizeResponse<SysGridColumnSetting[]>(response)
  return {
    data: Array.isArray(data) ? data : [],
    message,
    success,
  }
}

export async function resetSysGridColumnSettings(
  screenCd: string,
  gridId: string,
): Promise<{ data: SysGridColumnSetting[]; message?: string; success?: boolean }> {
  const response = await axios.post<ApiEnvelope<SysGridColumnSetting[]> | SysGridColumnSetting[]>(
    `${BASE_URL}/reset`,
    undefined,
    {
      params: {
        screenCd,
        gridId,
      },
    },
  )

  const { data, message, success } = normalizeResponse<SysGridColumnSetting[]>(response)
  return {
    data: Array.isArray(data) ? data : [],
    message,
    success,
  }
}
