import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { convertLangToCode } from "@/utils/language"
import type { DeleteUserInfosRequest, UserInfoApi } from "@/types/userInfo"

const BASE_URL = `${API_BASE_URL}/UserInfo`

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

export async function getUserInfos(
  userId?: string,
  lang?: string,
  userPkId?: number,
): Promise<{ data: UserInfoApi[] }> {
  const params: Record<string, string | number> = {}

  if (typeof userPkId === "number" && Number.isFinite(userPkId) && userPkId > 0) {
    params.userPkId = userPkId
  }

  if (userId?.trim()) {
    params.userId = userId.trim()
  }

  if (lang) {
    params.lang = convertLangToCode(lang)
  }

  const response = await axios.get<ApiEnvelope<UserInfoApi[]>>(`${BASE_URL}`, { params })
  const { data } = normalizeResponse<UserInfoApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function createUserInfo(
  payload: Partial<UserInfoApi>,
): Promise<{ data: UserInfoApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<UserInfoApi> | UserInfoApi>(`${BASE_URL}`, payload)
  const { data, message } = normalizeResponse<UserInfoApi>(response)

  return { data, message }
}

export async function updateUserInfo(
  payload: Partial<UserInfoApi>,
): Promise<{ data: UserInfoApi; message?: string }> {
  if (!payload.USER_PK_ID || payload.USER_PK_ID <= 0) {
    throw new Error("USER_PK_ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<UserInfoApi> | UserInfoApi>(`${BASE_URL}/${payload.USER_PK_ID}`, payload)
  const { data, message } = normalizeResponse<UserInfoApi>(response)

  return { data, message }
}

export async function deleteUserInfo(
  userPkId: number,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.delete<ApiEnvelope<number>>(`${BASE_URL}/${userPkId}`)
  const { success, message } = normalizeResponse<number>(response)

  return { success: success ?? true, message }
}

export async function deleteUserInfos(
  payload: DeleteUserInfosRequest,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.post<ApiEnvelope<{ deleted: number }>>(`${BASE_URL}/bulk-delete`, payload)
  const { success, message } = normalizeResponse<{ deleted: number }>(response)

  return { success: success ?? true, message }
}

export async function checkUserIdExists(
  userPkId: number | null | undefined,
  userId: string,
): Promise<boolean> {
  const params: Record<string, string | number> = {}

  if (typeof userPkId === "number" && Number.isFinite(userPkId) && userPkId > 0) {
    params.userPkId = userPkId
  }

  if (userId.trim()) {
    params.userId = userId.trim()
  }

  const response = await axios.get<ApiEnvelope<boolean>>(`${BASE_URL}/check-exists`, { params })
  const { data } = normalizeResponse<boolean>(response)

  return Boolean(data)
}
