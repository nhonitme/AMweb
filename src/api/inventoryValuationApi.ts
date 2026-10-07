import {
  getApiObjectPayload,
  isApiRecord,
  readApiNumber,
  readApiString,
} from "./apiTypes";
import { normalizeBackgroundJobStatus } from "./jobApi";
import type {
  InventoryValuationJobProgress,
  InventoryValuationJobStatus,
  InventoryValuationMethodCode,
  InventoryValuationRequest,
  InventoryValuationStartJobResult,
} from "@/types/inventoryValuation";
import API_BASE_URL from "../config/apiConfig";
import axios from "./axiosClient";

const BASE_URL = `${API_BASE_URL}/inventory/valuation`;

function normalizeStartJobResult(payload: unknown): InventoryValuationStartJobResult {
  if (!isApiRecord(payload)) {
    return { jobId: "", status: "QUEUED" };
  }

  return {
    jobId: readApiString(payload, "jobId", "JobId"),
    status: normalizeBackgroundJobStatus(payload.status ?? payload.Status) as InventoryValuationJobStatus,
    message: readApiString(payload, "message", "Message") || undefined,
  };
}

function normalizeJobProgress(payload: unknown): InventoryValuationJobProgress {
  if (!isApiRecord(payload)) {
    return {
      jobId: "",
      status: "QUEUED",
      percent: 0,
      processedGroups: 0,
      totalGroups: 0,
      movementCount: 0,
      methodCode: "PERIOD_END_AVG",
      methodName: "",
    };
  }

  const methodCode = readApiString(payload, "methodCode", "MethodCode", "PERIOD_END_AVG") as InventoryValuationMethodCode;

  return {
    jobId: readApiString(payload, "jobId", "JobId"),
    status: normalizeBackgroundJobStatus(payload.status ?? payload.Status) as InventoryValuationJobStatus,
    percent: readApiNumber(payload, "percent", "Percent"),
    processedGroups: readApiNumber(payload, "processedGroups", "ProcessedGroups"),
    totalGroups: readApiNumber(payload, "totalGroups", "TotalGroups"),
    movementCount: readApiNumber(payload, "movementCount", "MovementCount"),
    methodCode,
    methodName: readApiString(payload, "methodName", "MethodName"),
    message: readApiString(payload, "message", "Message") || undefined,
    createdAt: readApiString(payload, "createdAt", "CreatedAt") || undefined,
    updatedAt: readApiString(payload, "updatedAt", "UpdatedAt") || undefined,
  };
}

export async function startInventoryValuationJob(
  payload: InventoryValuationRequest,
): Promise<InventoryValuationStartJobResult> {
  const response = await axios.post(`${BASE_URL}/jobs/start`, payload);
  return normalizeStartJobResult(getApiObjectPayload(response.data));
}

export async function getInventoryValuationJobProgress(jobId: string): Promise<InventoryValuationJobProgress> {
  const response = await axios.get(`${BASE_URL}/jobs/progress`, { params: { jobId } });
  return normalizeJobProgress(getApiObjectPayload(response.data));
}
