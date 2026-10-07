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

export async function uploadMyAvatar(
  file: File,
): Promise<{ data: UserProfileApi; message?: string }> {
  const form = new FormData()
  form.append("file", file)

  const response = await axios.post<ApiEnvelope<UserProfileApi> | UserProfileApi>(
    `${BASE_URL}/me/avatar`,
    form,
  )
  const { data, message } = normalizeResponse<UserProfileApi>(response)

  return { data, message }
}

export async function fetchMyAvatarImageBlob(): Promise<Blob> {
  const response = await axios.get<Blob>(`${BASE_URL}/me/avatar-file`, {
    responseType: "blob",
    validateStatus: () => true,
  })
  const blob = response.data
  if (response.status >= 400 || blob.type === "application/json") {
    let message = `Không tải được ảnh đại diện (${response.status})`
    if (blob?.type === "application/json") {
      try {
        const parsed = JSON.parse(await blob.text()) as { Message?: string; message?: string }
        message = parsed.Message || parsed.message || message
      } catch {
        // keep fallback
      }
    }
    throw new Error(message)
  }

  return blob
}
