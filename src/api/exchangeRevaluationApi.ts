import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import type {
  ExchangeRevaluationCurrencyItem,
  ExchangeRevaluationFilterPayload,
  ExchangeRevaluationHistoryQuery,
  ExchangeRevaluationHistoryResponse,
  ExchangeRevaluationPreviewResponse,
  ExchangeRevaluationSaveResponse,
} from "@/types/exchangeRevaluation"

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

const BASE_URL = `${API_BASE_URL}/exchange-rate/recalculate`

export async function previewExchangeRevaluation(
  payload: ExchangeRevaluationFilterPayload,
): Promise<{ data: ExchangeRevaluationPreviewResponse; message?: string }> {
  const response = await axios.post<ApiEnvelope<ExchangeRevaluationPreviewResponse> | ExchangeRevaluationPreviewResponse>(
    `${BASE_URL}/preview`,
    payload,
  )

  return normalizeResponse(response)
}

export async function saveExchangeRevaluation(
  payload: ExchangeRevaluationFilterPayload,
): Promise<{ data: ExchangeRevaluationSaveResponse; message?: string }> {
  const response = await axios.post<ApiEnvelope<ExchangeRevaluationSaveResponse> | ExchangeRevaluationSaveResponse>(
    `${BASE_URL}/save`,
    payload,
  )

  return normalizeResponse(response)
}

export async function getExchangeRevaluationHistory(
  filters: ExchangeRevaluationHistoryQuery = {},
): Promise<{ data: ExchangeRevaluationHistoryResponse; message?: string }> {
  const response = await axios.get<ApiEnvelope<ExchangeRevaluationHistoryResponse> | ExchangeRevaluationHistoryResponse>(
    `${BASE_URL}/history`,
    {
      params: filters,
    },
  )

  return normalizeResponse(response)
}

export async function getExchangeRevaluationCurrencies(
  companyCd?: string,
  moduleCd?: string | null,
): Promise<ExchangeRevaluationCurrencyItem[]> {
  const response = await axios.get<ApiEnvelope<{ data: ExchangeRevaluationCurrencyItem[] }> | { data: ExchangeRevaluationCurrencyItem[] }>(
    `${BASE_URL}/currencies`,
    {
      params: {
        COMPANY_CD: companyCd,
        MODULE_CD: moduleCd || undefined,
      },
    },
  )

  const { data } = normalizeResponse<{ data: ExchangeRevaluationCurrencyItem[] }>(response)
  return Array.isArray(data?.data) ? data.data : []
}
