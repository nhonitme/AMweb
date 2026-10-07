import axios from "./axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import {
  getApiObjectPayload,
  isApiRecord,
  readApiNumber,
  readApiString,
} from "./apiTypes"
import { normalizeBackgroundJobStatus } from "./jobApi"
import type {
  CashExchangeRevaluationJobProgress,
  CashExchangeRevaluationJobStatus,
  CashExchangeRevaluationStartJobResult,
  ExchangeRevaluationFilterPayload,
} from "@/types/exchangeRevaluation"

const BASE_URL = `${API_BASE_URL}/cash/exchange-rate/recalculate`

function normalizeStartJobResult(payload: unknown): CashExchangeRevaluationStartJobResult {
  if (!isApiRecord(payload)) {
    return { jobId: "", status: "QUEUED" }
  }

  return {
    jobId: readApiString(payload, "jobId", "JobId"),
    status: normalizeBackgroundJobStatus(payload.status ?? payload.Status) as CashExchangeRevaluationJobStatus,
    message: readApiString(payload, "message", "Message") || undefined,
  }
}

function normalizeJobProgress(payload: unknown): CashExchangeRevaluationJobProgress {
  if (!isApiRecord(payload)) {
    return {
      jobId: "",
      status: "QUEUED",
      percent: 0,
      savedCount: 0,
    }
  }

  return {
    jobId: readApiString(payload, "jobId", "JobId"),
    status: normalizeBackgroundJobStatus(payload.status ?? payload.Status) as CashExchangeRevaluationJobStatus,
    percent: readApiNumber(payload, "percent", "Percent"),
    savedCount: readApiNumber(payload, "savedCount", "SavedCount"),
    message: readApiString(payload, "message", "Message") || undefined,
    createdAt: readApiString(payload, "createdAt", "CreatedAt") || undefined,
    updatedAt: readApiString(payload, "updatedAt", "UpdatedAt") || undefined,
  }
}

export async function startCashExchangeRevaluationJob(
  payload: ExchangeRevaluationFilterPayload,
): Promise<CashExchangeRevaluationStartJobResult> {
  const response = await axios.post(`${BASE_URL}/jobs/start`, payload)
  return normalizeStartJobResult(getApiObjectPayload(response.data))
}

export async function getCashExchangeRevaluationJobProgress(
  jobId: string,
): Promise<CashExchangeRevaluationJobProgress> {
  const response = await axios.get(`${BASE_URL}/jobs/progress`, { params: { jobId } })
  return normalizeJobProgress(getApiObjectPayload(response.data))
}
