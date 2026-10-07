import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { normalizeMessageLanguageKey } from "@/utils/language"
import { deleteMasterRecords } from "@/lib/masterDelete"
import type { UserInfoApi } from "@/types/userInfo"

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
    params.lang = normalizeMessageLanguageKey(lang)
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

export async function deleteUserInfos(
  userPkIds: number[],
): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, userPkIds, "UserPkIds")
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

function getApiOrigin(): string {
  try {
    return new URL(API_BASE_URL, typeof window === "undefined" ? "http://localhost" : window.location.origin).origin
  } catch {
    return typeof window === "undefined" ? "" : window.location.origin
  }
}

function isUserAvatarFtpPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/")
  return (
    normalized.includes("/UserAvatars/") ||
    normalized.startsWith("/home/WEB/amnoteweb/UserAvatars")
  )
}

/** Resolve stored avatar path/URL for <img src>. FTP paths need blob fetch. */
export function resolveUserAvatarImageUrl(path: string | null | undefined): string {
  const normalized = typeof path === "string" ? path.trim() : ""
  if (!normalized) {
    return ""
  }

  if (/^(https?:|data:|blob:)/i.test(normalized)) {
    return normalized
  }

  if (normalized.startsWith("//")) {
    return `${typeof window !== "undefined" ? window.location.protocol : "https:"}${normalized}`
  }

  if (isUserAvatarFtpPath(normalized)) {
    return ""
  }

  const origin = getApiOrigin()
  if (!origin) {
    return normalized
  }

  return `${origin}${normalized.startsWith("/") ? normalized : `/${normalized}`}`
}

export function isUserAvatarFtpStoredPath(path: string | null | undefined): boolean {
  const normalized = typeof path === "string" ? path.trim() : ""
  return Boolean(normalized) && isUserAvatarFtpPath(normalized)
}

export async function fetchUserAvatarImageBlob(userPkId: number): Promise<Blob> {
  if (!Number.isFinite(userPkId) || userPkId <= 0) {
    throw new Error("USER_PK_ID is required")
  }

  const response = await axios.get<Blob>(`${BASE_URL}/${userPkId}/avatar-file`, {
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

export async function uploadUserAvatar(
  userPkId: number,
  file: File,
): Promise<{ data: UserInfoApi; message?: string }> {
  if (!Number.isFinite(userPkId) || userPkId <= 0) {
    throw new Error("USER_PK_ID is required for avatar upload")
  }

  const form = new FormData()
  form.append("file", file)

  const response = await axios.post<ApiEnvelope<UserInfoApi> | UserInfoApi>(
    `${BASE_URL}/${userPkId}/avatar`,
    form,
  )
  const { data, message } = normalizeResponse<UserInfoApi>(response)

  return { data, message }
}
