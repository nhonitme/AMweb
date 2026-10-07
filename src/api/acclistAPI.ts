import axios from './axiosClient';
import API_BASE_URL from '../config/apiConfig';
import { getApiArrayPayload, logApiError, type ApiResponseEnvelope } from "./apiTypes";
import type { AcclistInfo } from "@/types/acclist"
import { normalizeMessageLanguageKey } from '@/utils/language';
import { deleteMasterRecords } from "@/lib/masterDelete";

const BASE_URL = `${API_BASE_URL}/AcclistInfo`;
export async function getAcclistInfos(
  accId?: number
): Promise<{ data: AcclistInfo[] }> {
  try {
    const resp = await axios.get(`${BASE_URL}`, {
      params: { ACC_ID: accId },
    });

    if (resp.status !== 200) {
      throw new Error(`Unexpected HTTP status ${resp.status}`);
    }

    const payload = resp.data
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid response format from getStoreInfos");
    }

    const data = getApiArrayPayload<AcclistInfo>(payload)
    if (data.length === 0 && accId !== undefined) {
      throw new Error("Response did not contain an array of customer exts");
    }

    return { data }
  } catch (err: unknown) {
    logApiError("Error in getAcclistInfos:", err)
    throw err
  }
}

export async function createAcclistInfo(
  payload: Partial<AcclistInfo>
): Promise<ApiResponseEnvelope<AcclistInfo>> {
  const resp = await axios.post<ApiResponseEnvelope<AcclistInfo>>(`${BASE_URL}`, payload);
  return resp.data;
}

export async function updateAcclistInfo(
  payload: Partial<AcclistInfo>
): Promise<ApiResponseEnvelope<AcclistInfo>> {
  const resp = await axios.put<ApiResponseEnvelope<AcclistInfo>>(`${BASE_URL}`, payload);
  return resp.data;
}

export async function exportToExcel(
  accId?: number,
  lang?: string, abortSignal?: AbortSignal
): Promise<Blob> {
  const params: Record<string, string | number> = {};
  if (accId) params.ACC_ID = accId;
  if (lang) params.lang = normalizeMessageLanguageKey(lang);

  const resp = await axios.get(`${BASE_URL}/export`, {
    params,
    signal: abortSignal, responseType: 'blob',
  });
  return resp.data;
}

export async function deleteAcclistInfos(
  acclistIds: number[],
): Promise<ApiResponseEnvelope<unknown>> {
  await deleteMasterRecords(BASE_URL, acclistIds, "AcclistIds", "DeleteMany");
  return { Success: true, Data: { deleted: acclistIds.length } };
}
