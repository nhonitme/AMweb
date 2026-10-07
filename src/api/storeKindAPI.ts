import axios from './axiosClient';
import API_BASE_URL from '../config/apiConfig';
import { getApiArrayPayload, logApiError, type ApiResponseEnvelope } from "./apiTypes";
import type { StoreKindInfo } from "@/types/storeKind"
import { deleteMasterRecords } from "@/lib/masterDelete";

const BASE_URL = `${API_BASE_URL}/StoreKindInfo`;

export async function getStoreKindInfos(
  storeKindId?: number
): Promise<{ data: StoreKindInfo[] }> {
  try {
    const resp = await axios.get(`${BASE_URL}`, {
      params: { STORE_KIND_ID: storeKindId },
    });

    if (resp.status !== 200) {
      throw new Error(`Unexpected HTTP status ${resp.status}`);
    }

    const payload = resp.data
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid response format from getStoreInfos");
    }

    const data = getApiArrayPayload<StoreKindInfo>(payload)
    if (data.length === 0 && storeKindId !== undefined) {
      throw new Error("Response did not contain an array of customer exts");
    }

    return { data }
  } catch (err: unknown) {
    logApiError("Error in getStoreInfos:", err)
    throw err
  }
}

export async function createStoreKindInfo(
  payload: Partial<StoreKindInfo>
): Promise<ApiResponseEnvelope<StoreKindInfo>> {
  const resp = await axios.post<ApiResponseEnvelope<StoreKindInfo>>(`${BASE_URL}`, payload);
  return resp.data;
}

export async function updateStoreKindInfo(
  payload: Partial<StoreKindInfo>
): Promise<ApiResponseEnvelope<StoreKindInfo>> {
  const resp = await axios.put<ApiResponseEnvelope<StoreKindInfo>>(`${BASE_URL}`, payload);
  return resp.data;
}

export async function deleteStoreKindInfos(
  storeKindIds: number[],
): Promise<ApiResponseEnvelope<unknown>> {
  await deleteMasterRecords(BASE_URL, storeKindIds, "StoreKindIds", "DeleteMany");
  return { Success: true, Data: { deleted: storeKindIds.length } };
}

export async function exportToExcel(
  storeKindID?: number,
  lang?: string, abortSignal?: AbortSignal
): Promise<Blob> {
  const params: Record<string, string | number> = {};
  if (storeKindID) params.STORE_KIND_ID = storeKindID;
  if (lang) params.lang = lang;

  const resp = await axios.get(`${BASE_URL}/export`, {
    params,
    signal: abortSignal, responseType: 'blob',
  });
  return resp.data;
}
