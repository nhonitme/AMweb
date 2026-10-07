import type { AxiosResponse } from "axios"

import type {
  ChitLedger,
  ChitType,
  InventoryInputApi,
  InventoryLinkStatus,
  InventoryOutputApi,
  InventorySourceVoucher,
} from "@/types/voucher"
import API_BASE_URL from "../config/apiConfig"
import axios from "./axiosClient"

type ApiEnvelope<T> = {
  Data?: T
  Message?: string
  Success?: boolean
  data?: T
  message?: string
  success?: boolean
}

const inFlightGetRequestMap = new Map<string, Promise<unknown>>()

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

function extractArrayPayload<T>(payload: unknown): T[] {
  if (Array.isArray(payload)) {
    return payload as T[]
  }

  if (!payload || typeof payload !== "object") {
    return []
  }

  const source = payload as Record<string, unknown>
  const candidates = [source.Data, source.data, source.Items, source.items, source.Value, source.value]
  for (const candidate of candidates) {
    if (Array.isArray(candidate)) {
      return candidate as T[]
    }
  }

  return []
}

function buildIdsParam(ids: number[]): string {
  return ids.filter((id) => Number.isFinite(id) && id > 0).join(",")
}

function buildRequestKey(path: string, params: Record<string, unknown>) {
  return JSON.stringify({ path, params })
}

function runInFlightDedupedGet<T>(requestKey: string, requestFactory: () => Promise<T>): Promise<T> {
  const existingRequest = inFlightGetRequestMap.get(requestKey)
  if (existingRequest) {
    return existingRequest as Promise<T>
  }

  const nextRequest = requestFactory().finally(() => {
    if (inFlightGetRequestMap.get(requestKey) === nextRequest) {
      inFlightGetRequestMap.delete(requestKey)
    }
  })

  inFlightGetRequestMap.set(requestKey, nextRequest)
  return nextRequest
}

function getInventoryLinkBaseUrl(): string {
  return `${API_BASE_URL}/InventoryLink`
}

export async function getInventoryInputs(
  chitDetailIds: number[],
): Promise<InventoryInputApi[]> {
  const CHITDETAIL_IDS = buildIdsParam(chitDetailIds)
  if (!CHITDETAIL_IDS) return []

  const response = await axios.get<ApiEnvelope<InventoryInputApi[]> | InventoryInputApi[]>(
    `${getInventoryLinkBaseUrl()}/GetInputsBySourceDetailIds`,
    { params: { CHITDETAIL_IDS } },
  )
  return extractArrayPayload<InventoryInputApi>(unwrapPayload(response))
}

export async function getInventoryOutputs(
  chitDetailIds: number[],
): Promise<InventoryOutputApi[]> {
  const CHITDETAIL_IDS = buildIdsParam(chitDetailIds)
  if (!CHITDETAIL_IDS) return []

  const response = await axios.get<ApiEnvelope<InventoryOutputApi[]> | InventoryOutputApi[]>(
    `${getInventoryLinkBaseUrl()}/GetOutputsBySourceDetailIds`,
    { params: { CHITDETAIL_IDS } },
  )
  return extractArrayPayload<InventoryOutputApi>(unwrapPayload(response))
}

export async function getInventoryLinkStatus(
  ledger: ChitLedger,
  chitType: ChitType,
  chitId: number,
): Promise<InventoryLinkStatus | null> {
  if (!Number.isFinite(chitId) || chitId <= 0) {
    return null
  }

  const path = `${getInventoryLinkBaseUrl()}/GetStatus`
  const params = { INPUT_TYPE: ledger, CHIT_TYPE: chitType, CHIT_ID: chitId }
  const requestKey = buildRequestKey(path, params)

  return runInFlightDedupedGet(requestKey, async () => {
    const response = await axios.get<ApiEnvelope<InventoryLinkStatus> | InventoryLinkStatus>(path, { params })
    const { data } = normalizeResponse<InventoryLinkStatus>(response)
    return data ?? null
  })
}

export async function getInventoryLinkStatuses(
  ledger: ChitLedger,
  chitType: ChitType,
  chitIds: number[],
): Promise<InventoryLinkStatus[]> {
  const CHIT_IDS = buildIdsParam(chitIds)
  if (!CHIT_IDS) return []

  const response = await axios.get<ApiEnvelope<InventoryLinkStatus[]> | InventoryLinkStatus[]>(
    `${getInventoryLinkBaseUrl()}/GetStatusByChitIds`,
    { params: { INPUT_TYPE: ledger, CHIT_TYPE: chitType, CHIT_IDS } },
  )

  return extractArrayPayload<InventoryLinkStatus>(unwrapPayload(response))
}

export async function getInventorySourceVoucher(
  chitDetailId: number,
): Promise<InventorySourceVoucher | null> {
  if (!Number.isFinite(chitDetailId) || chitDetailId <= 0) {
    return null
  }

  const response = await axios.get<ApiEnvelope<InventorySourceVoucher> | InventorySourceVoucher>(
    `${getInventoryLinkBaseUrl()}/GetSourceVoucher`,
    { params: { CHITDETAIL_ID: chitDetailId } },
  )

  const { data } = normalizeResponse<InventorySourceVoucher>(response)
  return data ?? null
}
