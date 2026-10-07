import type { AxiosResponse } from "axios"
import { downloadFile } from "@/lib/fileUtils"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { deleteMasterRecords } from "@/lib/masterDelete"
import { normalizeMessageLanguageKey } from "@/utils/language"
import type { EInvoiceApi, EInvoiceSearchParams, EInvoiceSeller, EInvoiceSellerSearchParams, EInvoiceSignaturePayload, EInvoiceSigningPayload } from "@/types/einvoice"
import type { EInvoiceEmailHistory } from "@/types/einvoiceMailHistory"
import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"
import { DEFAULT_PAGE_SIZE, normalizePagedResult, resolvePageNumber, resolvePageSize } from "@/lib/paging"
import type { PagedResult } from "@/types/paging"

const BASE_URL = `${API_BASE_URL}/EInvoice`

export type MttBatchPayload = { BATCH_ID: string; RAW_XML: string; NLAP: string; COUNT: number }
export async function issueMttInvoice(invoiceId: number) {
  return normalizeResponse<EInvoiceApi>(await axios.post(`${BASE_URL}/${invoiceId}/mtt/issue`))
}
export async function prepareMttBatch(invoiceIds: number[]) {
  return normalizeResponse<MttBatchPayload>(await axios.post(`${BASE_URL}/mtt/signing-payload`, { INVOICE_IDS: invoiceIds }))
}
export async function saveMttBatch(batchId: string, xml: string) {
  return normalizeResponse<number>(await axios.post(`${BASE_URL}/mtt/${encodeURIComponent(batchId)}/signature`, { XML: xml }))
}
export async function downloadMttBatchXml(invoiceIds: number[]) {
  return downloadFile({ fileName: `MTT-${new Date().toISOString().slice(0, 10)}.xml`, load: async signal => {
    const response = await axios.post(`${BASE_URL}/mtt/xml`, { INVOICE_IDS: invoiceIds }, { responseType: "blob", signal })
    return response.data
  } })
}

type ApiEnvelope<T> = {
  Data?: T
  data?: T
  Message?: string
  message?: string
  Success?: boolean
  success?: boolean
  PageNumber?: number
  pageNumber?: number
  PageSize?: number
  pageSize?: number
  TotalRecords?: number
  totalRecords?: number
  TotalPages?: number
  totalPages?: number
  HasPrevious?: boolean
  hasPrevious?: boolean
  HasNext?: boolean
  hasNext?: boolean
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

function buildSearchParams(params: EInvoiceSearchParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}
  if (params.cashRegister !== undefined) query.cashRegister = params.cashRegister

  if (typeof params.invoiceId === "number" && Number.isFinite(params.invoiceId) && params.invoiceId > 0) {
    query.invoiceId = params.invoiceId
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

  if (params.khhdon) {
    query.khhdon = params.khhdon
    if (params.khhdonOp) {
      query.khhdonOp = params.khhdonOp
    }
  }

  if (params.shdonFrom) {
    query.shdonFrom = params.shdonFrom
  }

  if (params.shdonTo) {
    query.shdonTo = params.shdonTo
  }

  if (params.nmuaTen) {
    query.nmuaTen = params.nmuaTen
    if (params.nmuaTenOp) {
      query.nmuaTenOp = params.nmuaTenOp
    }
  }

  if (params.nmuaMst) {
    query.nmuaMst = params.nmuaMst
    if (params.nmuaMstOp) {
      query.nmuaMstOp = params.nmuaMstOp
    }
  }

  if (typeof params.invoiceStatus === "number" && Number.isFinite(params.invoiceStatus)) {
    query.invoiceStatus = params.invoiceStatus
  }

  if (typeof params.cqtStatus === "number" && Number.isFinite(params.cqtStatus)) {
    query.cqtStatus = params.cqtStatus
  }

  if (typeof params.isSigned === "number" && Number.isFinite(params.isSigned)) {
    query.isSigned = params.isSigned
  }

  if (typeof params.tchdon === "number" && Number.isFinite(params.tchdon)) {
    query.tchdon = params.tchdon
  }

  if (typeof params.mailStatus === "number" && Number.isFinite(params.mailStatus)) {
    query.mailStatus = params.mailStatus
  }

  if (typeof params.includeDetails === "boolean") {
    query.includeDetails = params.includeDetails
  }

  if (params.lang) {
    query.lang = normalizeMessageLanguageKey(params.lang)
  }

  if (typeof params.pageNumber === "number" && Number.isFinite(params.pageNumber) && params.pageNumber > 0) {
    query.pageNumber = params.pageNumber
  }

  if (typeof params.pageSize === "number" && Number.isFinite(params.pageSize) && params.pageSize > 0) {
    query.pageSize = params.pageSize
  }

  return query
}

function normalizePagedEInvoiceResponse(
  response: AxiosResponse<ApiEnvelope<EInvoiceApi[]> | EInvoiceApi[]>,
  fallbackPageNumber = 1,
  fallbackPageSize = DEFAULT_PAGE_SIZE,
): PagedResult<EInvoiceApi> {
  const payload = response.data as ApiEnvelope<EInvoiceApi[]> & Record<string, unknown>
  const envelope = payload.Data ?? payload.data
  const data = Array.isArray(envelope ?? payload) ? ((envelope ?? payload) as EInvoiceApi[]) : []
  return normalizePagedResult(payload, data, fallbackPageNumber, fallbackPageSize)
}

export async function getEInvoices(params: EInvoiceSearchParams = {}): Promise<{ data: EInvoiceApi[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceApi[]>>(`${BASE_URL}`, {
    params: buildSearchParams(params),
  })
  const { data } = normalizeResponse<EInvoiceApi[]>(response)

  return { data: Array.isArray(data) ? data : [] }
}

export async function getEInvoicesPaged(
  params: EInvoiceSearchParams & { pageNumber: number; pageSize: number },
): Promise<PagedResult<EInvoiceApi>> {
  const pageNumber = resolvePageNumber(params.pageNumber)
  const pageSize = resolvePageSize(params.pageSize)
  const response = await axios.get<ApiEnvelope<EInvoiceApi[]>>(`${BASE_URL}`, {
    params: buildSearchParams({ ...params, pageNumber, pageSize }),
  })

  return normalizePagedEInvoiceResponse(response, pageNumber, pageSize)
}

export async function getEInvoice(invoiceId: number): Promise<{ data: EInvoiceApi; message?: string }> {
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceApi> | EInvoiceApi>(`${BASE_URL}/${invoiceId}`)
  return normalizeResponse<EInvoiceApi>(response)
}

export async function getEInvoiceTransmissionMessages(invoiceId: number): Promise<{ data: EInvoiceTransmissionMessage[]; message?: string }> {
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceTransmissionMessage[]> | EInvoiceTransmissionMessage[]>(`${BASE_URL}/${invoiceId}/transmission-messages`)
  const { data, message } = normalizeResponse<EInvoiceTransmissionMessage[]>(response)

  return { data: Array.isArray(data) ? data : [], message }
}

export async function getEInvoiceMailHistory(invoiceId: number): Promise<{ data: EInvoiceEmailHistory[]; message?: string }> {
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceEmailHistory[]> | EInvoiceEmailHistory[]>(`${BASE_URL}/${invoiceId}/mail-history`)
  const { data, message } = normalizeResponse<EInvoiceEmailHistory[]>(response)

  return { data: Array.isArray(data) ? data : [], message }
}

export async function updateEInvoiceBuyerEmail(
  invoiceId: number,
  toEmail: string,
): Promise<{ data: EInvoiceApi; message?: string }> {
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  const response = await axios.put<ApiEnvelope<EInvoiceApi> | EInvoiceApi>(
    `${BASE_URL}/${invoiceId}/buyer-email`,
    { toEmail },
  )

  return normalizeResponse<EInvoiceApi>(response)
}

export async function lookupEInvoiceByCode(mtracuu: string): Promise<{ data: EInvoiceApi; message?: string }> {
  const lookupCode = String(mtracuu ?? "").trim()
  if (!lookupCode) {
    throw new Error("MTRACUU is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceApi> | EInvoiceApi>(`${BASE_URL}/lookup`, {
    params: { mtracuu: lookupCode },
  })
  return normalizeResponse<EInvoiceApi>(response)
}

export async function getEInvoiceSellers(
  params: EInvoiceSellerSearchParams | string = {},
): Promise<{ data: EInvoiceSeller[]; message?: string }> {
  const normalizedParams: EInvoiceSellerSearchParams =
    typeof params === "string" ? { khhdon: params } : params

  const query: Record<string, string | number | boolean> = {}
  const khhdon = (normalizedParams.khhdon ?? "").trim()
  if (khhdon) {
    query.khhdon = khhdon
  }
  if (typeof normalizedParams.sellerId === "number" && Number.isFinite(normalizedParams.sellerId) && normalizedParams.sellerId > 0) {
    query.sellerId = normalizedParams.sellerId
  }
  if (normalizedParams.keyword) {
    query.keyword = normalizedParams.keyword
  }
  if (typeof normalizedParams.includeInactive === "boolean") {
    query.includeInactive = normalizedParams.includeInactive
  }
  if (typeof normalizedParams.includeAllTemplates === "boolean") {
    query.includeAllTemplates = normalizedParams.includeAllTemplates
  }

  const response = await axios.get<ApiEnvelope<EInvoiceSeller[]> | EInvoiceSeller[]>(`${BASE_URL}/sellers`, {
    params: Object.keys(query).length > 0 ? query : undefined,
  })
  const normalized = normalizeResponse<EInvoiceSeller[]>(response)

  return {
    data: Array.isArray(normalized.data) ? normalized.data : [],
    message: normalized.message,
  }
}

export async function createEInvoice(payload: EInvoiceApi): Promise<{ data: EInvoiceApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<EInvoiceApi> | EInvoiceApi>(`${BASE_URL}`, payload)
  return normalizeResponse<EInvoiceApi>(response)
}

export async function updateEInvoice(payload: EInvoiceApi): Promise<{ data: EInvoiceApi; message?: string }> {
  const invoiceId = Number(payload.INVOICE_ID ?? 0)
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required for update")
  }

  const response = await axios.put<ApiEnvelope<EInvoiceApi> | EInvoiceApi>(`${BASE_URL}/${invoiceId}`, payload)
  return normalizeResponse<EInvoiceApi>(response)
}

export async function getEInvoiceSigningPayload(invoiceId: number): Promise<{ data: EInvoiceSigningPayload; message?: string }> {
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  const response = await axios.get<ApiEnvelope<EInvoiceSigningPayload> | EInvoiceSigningPayload>(`${BASE_URL}/${invoiceId}/signing-payload`)
  return normalizeResponse<EInvoiceSigningPayload>(response)
}

export async function saveEInvoiceSignature(
  invoiceId: number,
  payload: EInvoiceSignaturePayload,
): Promise<{ data: EInvoiceApi; message?: string }> {
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  const response = await axios.post<ApiEnvelope<EInvoiceApi> | EInvoiceApi>(`${BASE_URL}/${invoiceId}/signature`, payload)
  return normalizeResponse<EInvoiceApi>(response)
}

export async function deleteEInvoice(invoiceId: number): Promise<{ success: boolean; message?: string }> {
  if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  const response = await axios.delete<ApiEnvelope<{ deleted: number }>>(`${BASE_URL}/${invoiceId}`)
  const normalized = normalizeResponse<{ deleted: number }>(response)

  return {
    success: normalized.success ?? true,
    message: normalized.message,
  }
}

export async function deleteEInvoices(invoiceIds: number[]): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, invoiceIds, "InvoiceIds")
}

export type EInvoiceSendMailItemPayload = {
  invoiceId: number
  toEmail: string
}

export type EInvoiceSendMailPayload = {
  items: EInvoiceSendMailItemPayload[]
}

export type EInvoiceSendMailResultItem = {
  InvoiceId: number
  Success: boolean
  ToEmail?: string
  Message?: string
}

export type EInvoiceSendMailResult = {
  Sent: number
  Skipped: number
  Results: EInvoiceSendMailResultItem[]
}

export async function getNextEInvoiceBkeNo(year?: number | null): Promise<string> {
  const params: Record<string, number> = {}
  if (year != null && Number.isFinite(year) && year > 0) {
    params.year = year
  }

  const response = await axios.get<ApiEnvelope<{ NEXT_SBKE?: string; next_SBKE?: string }> | { NEXT_SBKE?: string }>(
    `${BASE_URL}/bke/next-no`,
    { params },
  )
  const normalized = normalizeResponse<{ NEXT_SBKE?: string; next_SBKE?: string }>(response)
  const next = String(normalized.data?.NEXT_SBKE ?? normalized.data?.next_SBKE ?? "").trim()
  if (!next) {
    throw new Error("Failed to get next bảng kê number")
  }
  return next
}

export async function sendEInvoiceMail(
  payload: EInvoiceSendMailPayload,
): Promise<{ data: EInvoiceSendMailResult; message?: string }> {
  const items = (payload.items ?? [])
    .map((item) => ({
      invoiceId: Number(item.invoiceId),
      toEmail: String(item.toEmail ?? "").trim(),
    }))
    .filter((item) => Number.isFinite(item.invoiceId) && item.invoiceId > 0 && item.toEmail)

  if (items.length === 0) {
    throw new Error("Items is required")
  }

  const response = await axios.post<ApiEnvelope<EInvoiceSendMailResult> | EInvoiceSendMailResult>(
    `${BASE_URL}/send-mail`,
    { items },
  )

  return normalizeResponse<EInvoiceSendMailResult>(response)
}
