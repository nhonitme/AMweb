import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { deleteMasterRecords } from "@/lib/masterDelete"
import type { CompanySignatureInfoApi } from "@/types/companySignatureInfo"

const BASE_URL = `${API_BASE_URL}/CompanySignatureInfo`

type ApiEnvelope<T> = {
  Data?: T
  Message?: string
  Success?: boolean
  data?: T
  message?: string
  success?: boolean
}

function normalizeResponse<T>(
  response: AxiosResponse<ApiEnvelope<T> | T>,
): { data: T; message?: string; success?: boolean } {
  const payload = response.data
  const envelope = (payload as ApiEnvelope<T>).Data ?? (payload as ApiEnvelope<T>).data

  return {
    data: (envelope ?? payload) as T,
    message: (payload as ApiEnvelope<T>).Message ?? (payload as ApiEnvelope<T>).message ?? "",
    success: (payload as ApiEnvelope<T>).Success ?? (payload as ApiEnvelope<T>).success ?? true,
  }
}

function getApiOrigin(): string {
  try {
    return new URL(API_BASE_URL, typeof window === "undefined" ? "http://localhost" : window.location.origin).origin
  } catch {
    return typeof window === "undefined" ? "" : window.location.origin
  }
}

function isCompanySignatureFtpPath(path: string): boolean {
  const normalized = path.replace(/\\/g, "/")
  return (
    normalized.includes("/CompanySignatures/") ||
    normalized.startsWith("/home/WEB/amnoteweb/CompanySignatures")
  )
}

/** Resolve stored signature image path/URL for <img src> / report demo. */
export function resolveCompanySignatureImageUrl(path: string | null | undefined): string {
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

  // FTP paths must be loaded via authenticated axios blob (see fetchCompanySignatureImageBlob).
  // Direct <img src> to proxy often 404s (no auth headers).
  if (isCompanySignatureFtpPath(normalized)) {
    return ""
  }

  const origin = getApiOrigin()
  if (!origin) {
    return normalized
  }

  return `${origin}${normalized.startsWith("/") ? normalized : `/${normalized}`}`
}

export function isCompanySignatureFtpStoredPath(path: string | null | undefined): boolean {
  const normalized = typeof path === "string" ? path.trim() : ""
  return Boolean(normalized) && isCompanySignatureFtpPath(normalized)
}

export async function fetchCompanySignatureImageBlob(signatureId: number): Promise<Blob> {
  if (!Number.isFinite(signatureId) || signatureId <= 0) {
    throw new Error("ID is required")
  }

  const response = await axios.get<Blob>(`${BASE_URL}/${signatureId}/image-file`, {
    responseType: "blob",
    validateStatus: () => true,
  })
  const blob = response.data
  if (response.status >= 400 || blob.type === "application/json") {
    let message = `Không tải được ảnh chữ ký (${response.status})`
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

export async function getCompanySignatures(params?: {
  id?: number
  signCode?: string
  isActive?: boolean
}): Promise<{ data: CompanySignatureInfoApi[] }> {
  const query: Record<string, string | number | boolean> = {}

  if (typeof params?.id === "number" && Number.isFinite(params.id) && params.id > 0) {
    query.id = params.id
  }

  if (params?.signCode?.trim()) {
    query.signCode = params.signCode.trim()
  }

  if (typeof params?.isActive === "boolean") {
    query.isActive = params.isActive
  }

  const response = await axios.get<ApiEnvelope<CompanySignatureInfoApi[]>>(`${BASE_URL}`, { params: query })
  const { data } = normalizeResponse<CompanySignatureInfoApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function createCompanySignature(
  payload: Partial<CompanySignatureInfoApi>,
): Promise<{ data: CompanySignatureInfoApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<CompanySignatureInfoApi> | CompanySignatureInfoApi>(`${BASE_URL}`, payload)
  const { data, message } = normalizeResponse<CompanySignatureInfoApi>(response)

  return { data, message }
}

export async function updateCompanySignature(
  payload: Partial<CompanySignatureInfoApi>,
): Promise<{ data: CompanySignatureInfoApi; message?: string }> {
  if (!payload.ID || payload.ID <= 0) {
    throw new Error("ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<CompanySignatureInfoApi> | CompanySignatureInfoApi>(
    `${BASE_URL}/${payload.ID}`,
    payload,
  )
  const { data, message } = normalizeResponse<CompanySignatureInfoApi>(response)

  return { data, message }
}

export async function uploadCompanySignatureImage(
  signatureId: number,
  file: File,
): Promise<{ data: CompanySignatureInfoApi; message?: string }> {
  if (!Number.isFinite(signatureId) || signatureId <= 0) {
    throw new Error("ID is required for image upload")
  }

  const form = new FormData()
  form.append("file", file)

  const url = `${BASE_URL}/${signatureId}/image`
  const response = await axios.post<ApiEnvelope<CompanySignatureInfoApi> | CompanySignatureInfoApi>(url, form)
  const { data, message } = normalizeResponse<CompanySignatureInfoApi>(response)

  return { data, message }
}

export async function deleteCompanySignatures(
  signatureIds: number[],
): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, signatureIds, "SignatureIds")
}
