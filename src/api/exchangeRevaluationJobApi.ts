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
  ExchangeRevaluationFilterPayload,
  ExchangeRevaluationJobProgress,
  ExchangeRevaluationJobStatus,
  ExchangeRevaluationStartJobResult,
} from "@/types/exchangeRevaluation"

const BASE_URL = `${API_BASE_URL}/exchange-rate/recalculate`

function normalizeStartJobResult(payload: unknown): ExchangeRevaluationStartJobResult {
  if (!isApiRecord(payload)) {
    return { jobId: "", status: "QUEUED" }
  }

  return {
    jobId: readApiString(payload, "jobId", "JobId"),
    status: normalizeBackgroundJobStatus(payload.status ?? payload.Status) as ExchangeRevaluationJobStatus,
    message: readApiString(payload, "message", "Message") || undefined,
  }
}

function normalizeJobProgress(payload: unknown): ExchangeRevaluationJobProgress {
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
    status: normalizeBackgroundJobStatus(payload.status ?? payload.Status) as ExchangeRevaluationJobStatus,
    percent: readApiNumber(payload, "percent", "Percent"),
    savedCount: readApiNumber(payload, "savedCount", "SavedCount"),
    message: readApiString(payload, "message", "Message") || undefined,
    createdAt: readApiString(payload, "createdAt", "CreatedAt") || undefined,
    updatedAt: readApiString(payload, "updatedAt", "UpdatedAt") || undefined,
  }
}

export async function startExchangeRevaluationJob(
  payload: ExchangeRevaluationFilterPayload,
): Promise<ExchangeRevaluationStartJobResult> {
  const response = await axios.post(`${BASE_URL}/jobs/start`, payload)
  return normalizeStartJobResult(getApiObjectPayload(response.data))
}

export async function getExchangeRevaluationJobProgress(
  jobId: string,
): Promise<ExchangeRevaluationJobProgress> {
  const response = await axios.get(`${BASE_URL}/jobs/progress`, { params: { jobId } })
  return normalizeJobProgress(getApiObjectPayload(response.data))
}
