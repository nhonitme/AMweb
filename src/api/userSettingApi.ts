import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { logApiError } from "./apiTypes"

const BASE_URL = `${API_BASE_URL}/UserSetting`

export type UserSettingResolved = {
  KEY_NAME: string
  VALUE: string
  NOTE: string
  SOURCE: "USER" | "COMPANY" | "SYSTEM" | "DEFAULT" | string
}

type ApiPayload = Record<string, unknown>

function getApiPayload<T>(responseData: unknown): T {
  if (responseData == null || typeof responseData !== "object") {
    return responseData as T
  }

  const obj = responseData as ApiPayload

  return (obj.Data ?? obj.Result ?? obj.Payload ?? obj.Value ?? responseData) as T
}

function normalizeSettingList(data: unknown): UserSettingResolved[] {
  if (!Array.isArray(data)) return []

  return data
    .filter((item): item is UserSettingResolved => item != null && typeof item === "object")
    .map((item) => ({
      KEY_NAME: String(item.KEY_NAME ?? ""),
      VALUE: String(item.VALUE ?? ""),
      NOTE: String(item.NOTE ?? ""),
      SOURCE: String(item.SOURCE ?? ""),
    }))
}

export type UserSettingSaveItem = {
  KEY_NAME: string
  VALUE: string
  NOTE?: string
}

export async function getUserSettingsBatch(
  keyNames: string[],
): Promise<UserSettingResolved[]> {
  const normalizedKeys = keyNames.map((key) => key.trim()).filter(Boolean)
  if (normalizedKeys.length === 0) return []

  try {
    const resp = await axios.get(`${BASE_URL}/batch`, {
      params: { keyNames: normalizedKeys.join(",") },
    })

    return normalizeSettingList(getApiPayload<unknown>(resp.data))
  } catch (err: unknown) {
    logApiError("Error in getUserSettingsBatch:", err)
    throw err
  }
}

export async function saveUserSettingsBulk(
  items: UserSettingSaveItem[],
): Promise<UserSettingResolved[]> {
  if (items.length === 0) return []

  try {
    const resp = await axios.put(`${BASE_URL}/bulk`, { ITEMS: items })
    return normalizeSettingList(getApiPayload<unknown>(resp.data))
  } catch (err: unknown) {
    logApiError("Error in saveUserSettingsBulk:", err)
    throw err
  }
}
