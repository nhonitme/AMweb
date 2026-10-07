import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { deleteMasterRecords } from "@/lib/masterDelete"
import type {
  EInvoiceErrorNoticeApi,
  EInvoiceErrorNoticeSearchParams,
  EInvoiceErrorNoticeSignaturePayload,
  EInvoiceErrorNoticeSigningPayload,
} from "@/types/einvoiceErrorNotice"
import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"

const BASE_URL = `${API_BASE_URL}/EInvoiceErrorNotice`

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

function buildSearchParams(params: EInvoiceErrorNoticeSearchParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}

  if (typeof params.tbaoId === "number" && Number.isFinite(params.tbaoId) && params.tbaoId > 0) {
    query.tbaoId = params.tbaoId
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

  if (typeof params.isSigned === "number" && Number.isFinite(params.isSigned)) {
    query.isSigned = params.isSigned
  }

  if (typeof params.includeDetails === "boolean") {
    query.includeDetails = params.includeDetails
  }

  return query
}

export async function getEInvoiceErrorNotices(params: EInvoiceErrorNoticeSearchParams = {}): Promise<{ data: EInvoiceErrorNoticeApi[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceErrorNoticeApi[]>>(`${BASE_URL}`, {
    params: buildSearchParams(params),
  })
  const { data } = normalizeResponse<EInvoiceErrorNoticeApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function getEInvoiceErrorNotice(tbaoId: number): Promise<{ data: EInvoiceErrorNoticeApi; message?: string }> {
  if (!Number.isFinite(tbaoId) || tbaoId <= 0) {
    throw new Error("TBAO_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceErrorNoticeApi> | EInvoiceErrorNoticeApi>(`${BASE_URL}/${tbaoId}`)
  return normalizeResponse<EInvoiceErrorNoticeApi>(response)
}

export async function getEInvoiceErrorNoticeTransmissionMessages(tbaoId: number): Promise<{ data: EInvoiceTransmissionMessage[]; message?: string }> {
  if (!Number.isFinite(tbaoId) || tbaoId <= 0) {
    throw new Error("TBAO_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceTransmissionMessage[]> | EInvoiceTransmissionMessage[]>(`${BASE_URL}/${tbaoId}/transmission-messages`)
  const { data, message } = normalizeResponse<EInvoiceTransmissionMessage[]>(response)

  return { data: Array.isArray(data) ? data : [], message }
}

export async function createEInvoiceErrorNotice(payload: EInvoiceErrorNoticeApi): Promise<{ data: EInvoiceErrorNoticeApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<EInvoiceErrorNoticeApi> | EInvoiceErrorNoticeApi>(`${BASE_URL}`, payload)
  return normalizeResponse<EInvoiceErrorNoticeApi>(response)
}

export async function updateEInvoiceErrorNotice(payload: EInvoiceErrorNoticeApi): Promise<{ data: EInvoiceErrorNoticeApi; message?: string }> {
  const tbaoId = Number(payload.TBAO_ID ?? 0)
  if (!Number.isFinite(tbaoId) || tbaoId <= 0) {
    throw new Error("TBAO_ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<EInvoiceErrorNoticeApi> | EInvoiceErrorNoticeApi>(`${BASE_URL}/${tbaoId}`, payload)
  return normalizeResponse<EInvoiceErrorNoticeApi>(response)
}

export async function getEInvoiceErrorNoticeSigningPayload(tbaoId: number): Promise<{ data: EInvoiceErrorNoticeSigningPayload; message?: string }> {
  if (!Number.isFinite(tbaoId) || tbaoId <= 0) {
    throw new Error("TBAO_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceErrorNoticeSigningPayload> | EInvoiceErrorNoticeSigningPayload>(`${BASE_URL}/${tbaoId}/signing-payload`)
  return normalizeResponse<EInvoiceErrorNoticeSigningPayload>(response)
}

export async function saveEInvoiceErrorNoticeSignature(
  tbaoId: number,
  payload: EInvoiceErrorNoticeSignaturePayload,
): Promise<{ data: EInvoiceErrorNoticeApi; message?: string }> {
  if (!Number.isFinite(tbaoId) || tbaoId <= 0) {
    throw new Error("TBAO_ID is required")
  }

  const response = await axios.post<ApiEnvelope<EInvoiceErrorNoticeApi> | EInvoiceErrorNoticeApi>(`${BASE_URL}/${tbaoId}/signature`, payload)
  return normalizeResponse<EInvoiceErrorNoticeApi>(response)
}

export async function deleteEInvoiceErrorNotices(tbaoIds: number[]): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, tbaoIds, "TbaoIds")
}

export type EInvoiceErrorNoticeSendMailItemPayload = {
  tbaoId: number
  toEmail: string
}

export type EInvoiceErrorNoticeSendMailPayload = {
  items: EInvoiceErrorNoticeSendMailItemPayload[]
}

export type EInvoiceErrorNoticeSendMailResultItem = {
  TbaoId: number
  Success: boolean
  ToEmail?: string
  Message?: string
}

export type EInvoiceErrorNoticeSendMailResult = {
  Sent: number
  Skipped: number
  Results: EInvoiceErrorNoticeSendMailResultItem[]
}

export async function sendEInvoiceErrorNoticeMail(
  payload: EInvoiceErrorNoticeSendMailPayload,
): Promise<{ data: EInvoiceErrorNoticeSendMailResult; message?: string }> {
  const items = (payload.items ?? [])
    .map((item) => ({
      tbaoId: Number(item.tbaoId),
      toEmail: String(item.toEmail ?? "").trim(),
    }))
    .filter((item) => Number.isFinite(item.tbaoId) && item.tbaoId > 0 && item.toEmail)

  if (items.length === 0) {
    throw new Error("Items is required")
  }

  const response = await axios.post<ApiEnvelope<EInvoiceErrorNoticeSendMailResult> | EInvoiceErrorNoticeSendMailResult>(
    `${BASE_URL}/send-mail`,
    { items },
  )

  return normalizeResponse<EInvoiceErrorNoticeSendMailResult>(response)
}
