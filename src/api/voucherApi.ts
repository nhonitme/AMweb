import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { buildCurrentCompanyBusinessCacheKey } from "@/lib/businessCacheKey"
import type {
  ChitApi,
  ChitLedger,
  ChitType,
  InventoryLinkStatus,
  InventoryInputApi,
  InventoryOutputApi,
  InventoryVoucherApi,
  InventorySourceVoucher,
} from "@/types/voucher"
import { DEFAULT_PAGE_SIZE, normalizePagedResult, resolvePageNumber, resolvePageSize } from "@/lib/paging"
import type { PagedResult } from "@/types/paging"

type ApiEnvelope<T> = {
  Data?: T
  Message?: string
  Success?: boolean
  data?: T
  message?: string
  success?: boolean
  PageNumber?: number
  PageSize?: number
  TotalRecords?: number
  TotalPages?: number
  HasPrevious?: boolean
  HasNext?: boolean
}

type GetChitsParams = {
  fromYmd?: string | null
  toYmd?: string | null
  chitId?: number | null
  INCLUDE_DETAILS?: boolean
  pageNumber?: number
  pageSize?: number
}

type ExportChitsParams = GetChitsParams

const inFlightGetRequestMap = new Map<string, Promise<unknown>>()

const voucherControllerMap: Record<ChitLedger, Partial<Record<ChitType, string>>> = {
  AP: {
    PM: "PaymentVoucherAp",
    DN: "DebitNoteAp",
    PO: "PurchaseVoucherAp",
    IR: "InventoryReceiptVoucherAp",
    PS: "PurchaseServiceVoucherAp",
    PD: "PurchaseDiscountVoucherAp",
    PR: "PurchaseReturnVoucherAp",
    CO: "OffsetVoucherAp",
    OT: "OtherVoucherAp",
  },
  AR: {
    RC: "ReceiptVoucherAr",
    CN: "CreditNoteAr",
    SO: "SalesVoucherAr",
    SD: "SalesDiscountVoucherAr",
    SR: "SalesReturnVoucherAr",
    IO: "InventoryIssueVoucherAr",
    CO: "OffsetVoucherAr",
    OT: "OtherVoucherAr",
  },
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

  for (const candidate of candidates) {
    if (candidate && typeof candidate === "object") {
      const nested = extractArrayPayload<T>(candidate)
      if (nested.length > 0) {
        return nested
      }
    }
  }

  return []
}

function normalizePagedResponse<T>(
  response: AxiosResponse<ApiEnvelope<T[]> | T[]>,
  fallbackPageNumber = 1,
  fallbackPageSize = DEFAULT_PAGE_SIZE,
): PagedResult<T> {
  const payload = unwrapPayload(response) as ApiEnvelope<T[]> & Record<string, unknown>
  const envelope = payload.Data ?? payload.data
  const data = Array.isArray(envelope ?? payload) ? ((envelope ?? payload) as T[]) : []
  return normalizePagedResult(payload, data, fallbackPageNumber, fallbackPageSize)
}

function getBaseUrl(ledger: ChitLedger, chitType: ChitType): string {
  const controllerName = voucherControllerMap[ledger][chitType]

  if (!controllerName) {
    throw new Error(`Unsupported voucher endpoint for ledger ${ledger} and chit type ${chitType}`)
  }

  return `${API_BASE_URL}/${controllerName}`
}

function isInventoryVoucherType(chitType: ChitType): chitType is Extract<ChitType, "IR" | "IO"> {
  return chitType === "IR" || chitType === "IO"
}

function calculateInventoryApiAmount(lines: Array<InventoryInputApi | InventoryOutputApi>): number {
  return lines.reduce((total, line) => {
    const explicitAmount = Number(line.AMOUNT_CC ?? 0)
    if (Number.isFinite(explicitAmount) && explicitAmount !== 0) {
      return total + explicitAmount
    }

    const quantity = Number(line.QUANTITY ?? 0)
    const unitPrice = Number(line.UNIT_PRICE_CC ?? 0)
    return total + (Number.isFinite(quantity) ? quantity : 0) * (Number.isFinite(unitPrice) ? unitPrice : 0)
  }, 0)
}

function mapInventoryVoucherToChitApi(item: InventoryVoucherApi, chitType: Extract<ChitType, "IR" | "IO">): ChitApi {
  const inventoryInputs = item.INPUTS ?? []
  const inventoryOutputs = item.OUTPUTS ?? []
  const amount = item.AMOUNT ?? (chitType === "IR"
    ? calculateInventoryApiAmount(inventoryInputs)
    : calculateInventoryApiAmount(inventoryOutputs))

  return {
    CHIT_ID: item.CHIT_ID,
    COMPANY_CD: item.COMPANY_CD,
    CHIT_CD: item.CHIT_CD,
    CHIT_NO: item.CHIT_NO,
    CHIT_YMD: item.CHIT_YMD,
    CHIT_TYPE: chitType,
    AMOUNT: amount,
    PAYER_INFO: item.PAYER_INFO,
    ISDEL: item.ISDEL,
    CREATE_BY: item.CREATE_BY,
    CREATE_AT: item.CREATE_AT,
    UPDATE_BY: item.UPDATE_BY,
    UPDATE_AT: item.UPDATE_AT,
    IS_LOCK: item.IS_LOCK,
    ISEXCEL: item.ISEXCEL,
    EMAIL_EPAY: item.EMAIL_EPAY,
    IS_CONFIRMED: item.IS_CONFIRMED,
    NOTE: item.NOTE,
    DAY_OF_PAYMENT: item.DAY_OF_PAYMENT,
    TIME_FOR_PAYMENT: item.TIME_FOR_PAYMENT,
    IS_PAYMENT: item.IS_PAYMENT,
    CHIT_CD_COGS: item.CHIT_CD_COGS,
    DESCRIPTION_VIET: item.DESCRIPTION_VIET,
    DESCRIPTION_ENG: item.DESCRIPTION_ENG,
    DESCRIPTION_KOR: item.DESCRIPTION_KOR,
    DETAIL_COUNT: 1,
    DETAILS: [
      {
        COMPANY_CD: item.COMPANY_CD,
        CHIT_ID: item.CHIT_ID,
        CHIT_YMD: item.CHIT_YMD,
        CHITDETAIL_ID: null,
        CHITDETAIL_CD: "",
        AMOUNT: amount,
        PRODUCT_AMOUNT: amount,
        HASINVENTORY: "1",
        INVENTORY_YMD: item.CHIT_YMD,
        SORT: 1,
        ISDEL: "0",
        DETAIL_DESCRIPTION_VIET: item.DESCRIPTION_VIET,
        DETAIL_DESCRIPTION_ENG: item.DESCRIPTION_ENG,
        DETAIL_DESCRIPTION_KOR: item.DESCRIPTION_KOR,
        INVENTORY_INPUTS: inventoryInputs,
        INVENTORY_OUTPUTS: inventoryOutputs,
      },
    ],
  }
}

function buildDetailIdsParam(chitDetailIds: number[]) {
  return chitDetailIds.filter((id) => Number.isFinite(id) && id > 0).join(",")
}

function buildChitIdsParam(chitIds: number[]) {
  return chitIds.filter((id) => Number.isFinite(id) && id > 0).join(",")
}

function buildInFlightGetRequestKey(
  cacheName: string,
  params?: Record<string, unknown>,
) {
  return buildCurrentCompanyBusinessCacheKey(cacheName, params ?? {})
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

export async function getChits(
  ledger: ChitLedger,
  chitType: ChitType,
  filters: GetChitsParams = {},
): Promise<PagedResult<ChitApi>> {
  if (isInventoryVoucherType(chitType)) {
    const params: Record<string, string | number> = {
      INPUT_TYPE: ledger,
      CHIT_TYPE: chitType,
    }

    if (filters.chitId && filters.chitId > 0) params.CHIT_ID = filters.chitId
    if (filters.fromYmd) params.FROM_YMD = filters.fromYmd
    if (filters.toYmd) params.TO_YMD = filters.toYmd
    if (filters.pageNumber && filters.pageNumber > 0) params.PAGE_NUMBER = filters.pageNumber
    if (filters.pageSize && filters.pageSize > 0) params.PAGE_SIZE = filters.pageSize

    const baseUrl = `${API_BASE_URL}/ChitInventory/Get`
    const requestKey = buildInFlightGetRequestKey(baseUrl, params)

    return runInFlightDedupedGet(requestKey, async () => {
      const response = await axios.get<ApiEnvelope<InventoryVoucherApi[]>>(baseUrl, { params })
      const paged = normalizePagedResponse<InventoryVoucherApi>(
        response,
        resolvePageNumber(filters.pageNumber),
        resolvePageSize(filters.pageSize),
      )

      return {
        ...paged,
        data: paged.data.map((item) => mapInventoryVoucherToChitApi(item, chitType)),
      }
    })
  }

  const params: Record<string, boolean | string | number> = {}

  params.CHIT_TYPE = chitType
  if (filters.chitId && filters.chitId > 0) params.CHIT_ID = filters.chitId
  if (filters.fromYmd) params.FROM_YMD = filters.fromYmd
  if (filters.toYmd) params.TO_YMD = filters.toYmd
  if (filters.INCLUDE_DETAILS) params.INCLUDE_DETAILS = filters.INCLUDE_DETAILS
  if (filters.pageNumber && filters.pageNumber > 0) params.PAGE_NUMBER = filters.pageNumber
  if (filters.pageSize && filters.pageSize > 0) params.PAGE_SIZE = filters.pageSize

  const baseUrl = `${getBaseUrl(ledger, chitType)}/Get`
  const normalizedParams = Object.keys(params).length > 0 ? params : undefined
  const requestKey = buildInFlightGetRequestKey(baseUrl, normalizedParams)

  return runInFlightDedupedGet(requestKey, async () => {
    const response = await axios.get<ApiEnvelope<ChitApi[]>>(baseUrl, {
      params: normalizedParams,
    })

    return normalizePagedResponse<ChitApi>(
      response,
      resolvePageNumber(filters.pageNumber),
      resolvePageSize(filters.pageSize),
    )
  })
}

export async function exportChitExcel(
  ledger: ChitLedger,
  chitType: ChitType,
  filters: ExportChitsParams = {}, abortSignal?: AbortSignal,
): Promise<Blob> {
  const params: Record<string, string | number> = {}

  if (filters.chitId && filters.chitId > 0) params.CHIT_ID = filters.chitId
  if (filters.fromYmd) params.FROM_YMD = filters.fromYmd
  if (filters.toYmd) params.TO_YMD = filters.toYmd

  const response = await axios.get(`${getBaseUrl(ledger, chitType)}/ExportExcel`, {
    params: Object.keys(params).length > 0 ? params : undefined,
    signal: abortSignal, responseType: "blob",
  })

  return response.data
}

export async function createChit(
  ledger: ChitLedger,
  payload: Partial<ChitApi>,
  chitType: ChitType,
): Promise<{ data: ChitApi; message?: string }> {
  const response = await axios.post<ApiEnvelope<ChitApi> | ChitApi>(`${getBaseUrl(ledger, chitType)}/Create`, payload)
  const { data, message } = normalizeResponse<ChitApi>(response)
  return { data, message }
}

export async function updateChit(
  ledger: ChitLedger,
  payload: Partial<ChitApi>,
  chitType: ChitType,
): Promise<{ data: ChitApi; message?: string }> {
  const response = await axios.put<ApiEnvelope<ChitApi> | ChitApi>(`${getBaseUrl(ledger, chitType)}/Update`, payload)
  const { data, message } = normalizeResponse<ChitApi>(response)
  return { data, message }
}

export async function deleteChit(
  ledger: ChitLedger,
  chitId: number,
  chitType: ChitType,
): Promise<{ success: boolean; message?: string }> {
  const response = await axios.delete<ApiEnvelope<number>>(`${getBaseUrl(ledger, chitType)}/Delete`, {
    params: { CHIT_ID: chitId },
  })
  const { success, message } = normalizeResponse<number>(response)
  return { success: success ?? true, message }
}

export async function getInventoryInputs(
  ledger: ChitLedger,
  chitType: ChitType,
  chitDetailIds: number[],
): Promise<InventoryInputApi[]> {
  void ledger
  void chitType
  const CHITDETAIL_IDS = buildDetailIdsParam(chitDetailIds)
  if (!CHITDETAIL_IDS) return []

  const response = await axios.get<ApiEnvelope<InventoryInputApi[]> | InventoryInputApi[]>(
    `${API_BASE_URL}/InventoryLink/GetInputsBySourceDetailIds`,
    { params: { CHITDETAIL_IDS } },
  )
  return extractArrayPayload<InventoryInputApi>(unwrapPayload(response))
}

export async function getInventoryInputsByChitIds(
  ledger: ChitLedger,
  chitType: ChitType,
  chitIds: number[],
): Promise<InventoryInputApi[]> {
  void ledger
  void chitType
  const CHIT_IDS = buildChitIdsParam(chitIds)
  if (!CHIT_IDS) return []

  const baseUrl = `${API_BASE_URL}/InventoryLink/GetInputsByChitIds`
  const requestKey = buildInFlightGetRequestKey(baseUrl, { CHIT_IDS })

  return runInFlightDedupedGet(requestKey, async () => {
    const response = await axios.get<ApiEnvelope<InventoryInputApi[]> | InventoryInputApi[]>(
      baseUrl,
      { params: { CHIT_IDS } },
    )
    return extractArrayPayload<InventoryInputApi>(unwrapPayload(response))
  })
}

export async function getInventoryOutputs(
  ledger: ChitLedger,
  chitType: ChitType,
  chitDetailIds: number[],
): Promise<InventoryOutputApi[]> {
  void ledger
  void chitType
  const CHITDETAIL_IDS = buildDetailIdsParam(chitDetailIds)
  if (!CHITDETAIL_IDS) return []

  const response = await axios.get<ApiEnvelope<InventoryOutputApi[]> | InventoryOutputApi[]>(
    `${API_BASE_URL}/InventoryLink/GetOutputsBySourceDetailIds`,
    { params: { CHITDETAIL_IDS } },
  )
  return extractArrayPayload<InventoryOutputApi>(unwrapPayload(response))
}

export async function getInventoryOutputsByChitIds(
  ledger: ChitLedger,
  chitType: ChitType,
  chitIds: number[],
): Promise<InventoryOutputApi[]> {
  void ledger
  void chitType
  const CHIT_IDS = buildChitIdsParam(chitIds)
  if (!CHIT_IDS) return []

  const baseUrl = `${API_BASE_URL}/InventoryLink/GetOutputsByChitIds`
  const requestKey = buildInFlightGetRequestKey(baseUrl, { CHIT_IDS })

  return runInFlightDedupedGet(requestKey, async () => {
    const response = await axios.get<ApiEnvelope<InventoryOutputApi[]> | InventoryOutputApi[]>(
      baseUrl,
      { params: { CHIT_IDS } },
    )
    return extractArrayPayload<InventoryOutputApi>(unwrapPayload(response))
  })
}

export async function getInventoryLinkStatus(
  ledger: ChitLedger,
  chitType: ChitType,
  chitId: number,
): Promise<InventoryLinkStatus | null> {
  if (!Number.isFinite(chitId) || chitId <= 0) {
    return null
  }

  const baseUrl = `${API_BASE_URL}/InventoryLink/GetStatus`
  const params = { INPUT_TYPE: ledger, CHIT_TYPE: chitType, CHIT_ID: chitId }
  const requestKey = buildInFlightGetRequestKey(baseUrl, params)

  return runInFlightDedupedGet(requestKey, async () => {
    const response = await axios.get<ApiEnvelope<InventoryLinkStatus> | InventoryLinkStatus>(
      baseUrl,
      {
        params,
      },
    )

    const { data } = normalizeResponse<InventoryLinkStatus>(response)
    return data ?? null
  })
}

export async function getInventoryLinkStatuses(
  ledger: ChitLedger,
  chitType: ChitType,
  chitIds: number[],
): Promise<InventoryLinkStatus[]> {
  const CHIT_IDS = buildChitIdsParam(chitIds)
  if (!CHIT_IDS) return []

  const response = await axios.get<ApiEnvelope<InventoryLinkStatus[]> | InventoryLinkStatus[]>(
    `${API_BASE_URL}/InventoryLink/GetStatusByChitIds`,
    { params: { INPUT_TYPE: ledger, CHIT_TYPE: chitType, CHIT_IDS } },
  )

  return extractArrayPayload<InventoryLinkStatus>(unwrapPayload(response))
}

export async function getInventorySourceVoucher(
  ledger: ChitLedger,
  chitType: ChitType,
  chitDetailId: number,
): Promise<InventorySourceVoucher | null> {
  void ledger
  void chitType
  if (!Number.isFinite(chitDetailId) || chitDetailId <= 0) {
    return null
  }

  const response = await axios.get<ApiEnvelope<InventorySourceVoucher> | InventorySourceVoucher>(
    `${API_BASE_URL}/InventoryLink/GetSourceVoucher`,
    {
      params: { CHITDETAIL_ID: chitDetailId },
    },
  )

  const { data } = normalizeResponse<InventorySourceVoucher>(response)
  return data ?? null
}
