import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import type { ChangeUserPasswordPayload, UserProfileApi } from "@/types/profile"

const BASE_URL = `${API_BASE_URL}/UserProfile`

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

export async function getMyProfile(): Promise<{ data: UserProfileApi }> {
  const response = await axios.get<ApiEnvelope<UserProfileApi>>(`${BASE_URL}/me`)
  const { data } = normalizeResponse<UserProfileApi>(response)

  return { data }
}

export async function updateMyProfile(
  payload: Partial<UserProfileApi>,
): Promise<{ data: UserProfileApi; message?: string }> {
  const response = await axios.put<ApiEnvelope<UserProfileApi> | UserProfileApi>(`${BASE_URL}/me`, payload)
  const { data, message } = normalizeResponse<UserProfileApi>(response)

  return { data, message }
}

export async function changeMyPassword(
  payload: ChangeUserPasswordPayload,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.put<ApiEnvelope<{ USERID: string }>>(`${BASE_URL}/me/password`, payload)
  const { success, message } = normalizeResponse<{ USERID: string }>(response)

  return { success: success ?? true, message }
}
