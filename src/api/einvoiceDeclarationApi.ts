import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { deleteMasterRecords } from "@/lib/masterDelete"
import type {
  EInvoiceDeclarationApi,
  EInvoiceDeclarationSearchParams,
  EInvoiceDeclarationSignaturePayload,
  EInvoiceDeclarationSigningPayload,
} from "@/types/einvoiceDeclaration"
import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"

const BASE_URL = `${API_BASE_URL}/EInvoiceDeclaration`

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

function buildSearchParams(params: EInvoiceDeclarationSearchParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}

  if (typeof params.tkhaiId === "number" && Number.isFinite(params.tkhaiId) && params.tkhaiId > 0) {
    query.tkhaiId = params.tkhaiId
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

export async function getEInvoiceDeclarations(params: EInvoiceDeclarationSearchParams = {}): Promise<{ data: EInvoiceDeclarationApi[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceDeclarationApi[]>>(`${BASE_URL}`, {
    params: buildSearchParams(params),
  })
  const { data } = normalizeResponse<EInvoiceDeclarationApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function getEInvoiceDeclaration(tkhaiId: number): Promise<{ data: EInvoiceDeclarationApi; message?: string }> {
  if (!Number.isFinite(tkhaiId) || tkhaiId <= 0) {
    throw new Error("TKHAI_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceDeclarationApi> | EInvoiceDeclarationApi>(`${BASE_URL}/${tkhaiId}`)
  return normalizeResponse<EInvoiceDeclarationApi>(response)
}

export async function getEInvoiceDeclarationTransmissionMessages(tkhaiId: number): Promise<{ data: EInvoiceTransmissionMessage[]; message?: string }> {
  if (!Number.isFinite(tkhaiId) || tkhaiId <= 0) {
    throw new Error("TKHAI_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceTransmissionMessage[]> | EInvoiceTransmissionMessage[]>(`${BASE_URL}/${tkhaiId}/transmission-messages`)
  const { data, message } = normalizeResponse<EInvoiceTransmissionMessage[]>(response)

  return { data: Array.isArray(data) ? data : [], message }
}

export async function createEInvoiceDeclaration(payload: EInvoiceDeclarationApi): Promise<{ data: EInvoiceDeclarationApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<EInvoiceDeclarationApi> | EInvoiceDeclarationApi>(`${BASE_URL}`, payload)
  return normalizeResponse<EInvoiceDeclarationApi>(response)
}

export async function updateEInvoiceDeclaration(payload: EInvoiceDeclarationApi): Promise<{ data: EInvoiceDeclarationApi; message?: string }> {
  const tkhaiId = Number(payload.TKHAI_ID ?? 0)
  if (!Number.isFinite(tkhaiId) || tkhaiId <= 0) {
    throw new Error("TKHAI_ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<EInvoiceDeclarationApi> | EInvoiceDeclarationApi>(`${BASE_URL}/${tkhaiId}`, payload)
  return normalizeResponse<EInvoiceDeclarationApi>(response)
}

export async function getEInvoiceDeclarationSigningPayload(tkhaiId: number): Promise<{ data: EInvoiceDeclarationSigningPayload; message?: string }> {
  if (!Number.isFinite(tkhaiId) || tkhaiId <= 0) {
    throw new Error("TKHAI_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceDeclarationSigningPayload> | EInvoiceDeclarationSigningPayload>(`${BASE_URL}/${tkhaiId}/signing-payload`)
  return normalizeResponse<EInvoiceDeclarationSigningPayload>(response)
}

export async function saveEInvoiceDeclarationSignature(
  tkhaiId: number,
  payload: EInvoiceDeclarationSignaturePayload,
): Promise<{ data: EInvoiceDeclarationApi; message?: string }> {
  if (!Number.isFinite(tkhaiId) || tkhaiId <= 0) {
    throw new Error("TKHAI_ID is required")
  }

  const response = await axios.post<ApiEnvelope<EInvoiceDeclarationApi> | EInvoiceDeclarationApi>(`${BASE_URL}/${tkhaiId}/signature`, payload)
  return normalizeResponse<EInvoiceDeclarationApi>(response)
}

export async function deleteEInvoiceDeclarations(tkhaiIds: number[]): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, tkhaiIds, "TkhaiIds")
}
