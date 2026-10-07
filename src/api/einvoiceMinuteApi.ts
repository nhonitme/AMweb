import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { deleteMasterRecords } from "@/lib/masterDelete"
import type {
  EInvoiceMinuteApi,
  EInvoiceMinuteSearchParams,
  EInvoiceMinuteSignaturePayload,
  EInvoiceMinuteSigningPayload,
} from "@/types/einvoiceMinute"

const BASE_URL = `${API_BASE_URL}/EInvoiceMinutes`

type ApiEnvelope<T> = {
  Data?: T
  data?: T
  Message?: string
  message?: string
  Success?: boolean
  success?: boolean
}

function normalizeResponse<T>(response: AxiosResponse<ApiEnvelope<T> | T>): { data: T; message?: string; success?: boolean } {
  const payload = response.data
  const envelope = (payload as ApiEnvelope<T>).Data ?? (payload as ApiEnvelope<T>).data

  return {
    data: (envelope ?? payload) as T,
    message: (payload as ApiEnvelope<T>).Message ?? (payload as ApiEnvelope<T>).message ?? "",
    success: (payload as ApiEnvelope<T>).Success ?? (payload as ApiEnvelope<T>).success ?? true,
  }
}

function buildSearchParams(params: EInvoiceMinuteSearchParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}

  if (typeof params.bbanId === "number" && Number.isFinite(params.bbanId) && params.bbanId > 0) {
    query.bbanId = params.bbanId
  }

  if (params.fromYmd) {
    query.fromYmd = params.fromYmd
  }

  if (params.toYmd) {
    query.toYmd = params.toYmd
  }

  if (params.keyword) {
    query.keyword = params.keyword
  }

  if (typeof params.isSigned === "number" && Number.isFinite(params.isSigned) && params.isSigned >= 0) {
    query.isSigned = params.isSigned
  }

  if (typeof params.includeReasons === "boolean") {
    query.includeReasons = params.includeReasons
  }

  return query
}

export async function getEInvoiceMinutes(params: EInvoiceMinuteSearchParams = {}): Promise<{ data: EInvoiceMinuteApi[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceMinuteApi[]>>(`${BASE_URL}`, {
    params: buildSearchParams(params),
  })
  const { data } = normalizeResponse<EInvoiceMinuteApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function getEInvoiceMinute(bbanId: number): Promise<{ data: EInvoiceMinuteApi; message?: string }> {
  if (!Number.isFinite(bbanId) || bbanId <= 0) {
    throw new Error("BBAN_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceMinuteApi> | EInvoiceMinuteApi>(`${BASE_URL}/${bbanId}`)
  return normalizeResponse<EInvoiceMinuteApi>(response)
}

export async function createEInvoiceMinute(payload: EInvoiceMinuteApi): Promise<{ data: EInvoiceMinuteApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<EInvoiceMinuteApi> | EInvoiceMinuteApi>(`${BASE_URL}`, payload)
  return normalizeResponse<EInvoiceMinuteApi>(response)
}

export async function updateEInvoiceMinute(payload: EInvoiceMinuteApi): Promise<{ data: EInvoiceMinuteApi; message?: string }> {
  const bbanId = Number(payload.BBAN_ID ?? 0)
  if (!Number.isFinite(bbanId) || bbanId <= 0) {
    throw new Error("BBAN_ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<EInvoiceMinuteApi> | EInvoiceMinuteApi>(`${BASE_URL}/${bbanId}`, payload)
  return normalizeResponse<EInvoiceMinuteApi>(response)
}

export async function getEInvoiceMinuteSigningPayload(bbanId: number): Promise<{ data: EInvoiceMinuteSigningPayload; message?: string }> {
  if (!Number.isFinite(bbanId) || bbanId <= 0) {
    throw new Error("BBAN_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceMinuteSigningPayload> | EInvoiceMinuteSigningPayload>(`${BASE_URL}/${bbanId}/signing-payload`)
  return normalizeResponse<EInvoiceMinuteSigningPayload>(response)
}

export async function saveEInvoiceMinuteSignature(
  bbanId: number,
  payload: EInvoiceMinuteSignaturePayload,
): Promise<{ data: EInvoiceMinuteApi; message?: string }> {
  if (!Number.isFinite(bbanId) || bbanId <= 0) {
    throw new Error("BBAN_ID is required")
  }

  const response = await axios.post<ApiEnvelope<EInvoiceMinuteApi> | EInvoiceMinuteApi>(`${BASE_URL}/${bbanId}/signature`, payload)
  return normalizeResponse<EInvoiceMinuteApi>(response)
}

export async function deleteEInvoiceMinutes(bbanIds: number[]): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, bbanIds, "BbanIds")
}

export type EInvoiceMinuteSendMailItemPayload = {
  bbanId: number
  toEmail: string
}

export type EInvoiceMinuteSendMailPayload = {
  items: EInvoiceMinuteSendMailItemPayload[]
}

export type EInvoiceMinuteSendMailResultItem = {
  BbanId: number
  Success: boolean
  ToEmail?: string
  Message?: string
}

export type EInvoiceMinuteSendMailResult = {
  Sent: number
  Skipped: number
  Results: EInvoiceMinuteSendMailResultItem[]
}

export async function sendEInvoiceMinuteMail(
  payload: EInvoiceMinuteSendMailPayload,
): Promise<{ data: EInvoiceMinuteSendMailResult; message?: string }> {
  const items = (payload.items ?? [])
    .map((item) => ({
      bbanId: Number(item.bbanId),
      toEmail: String(item.toEmail ?? "").trim(),
    }))
    .filter((item) => Number.isFinite(item.bbanId) && item.bbanId > 0 && item.toEmail)

  if (items.length === 0) {
    throw new Error("Items is required")
  }

  const response = await axios.post<ApiEnvelope<EInvoiceMinuteSendMailResult> | EInvoiceMinuteSendMailResult>(
    `${BASE_URL}/send-mail`,
    { items },
  )

  return normalizeResponse<EInvoiceMinuteSendMailResult>(response)
}
