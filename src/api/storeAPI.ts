import axios from './axiosClient';
import API_BASE_URL from '../config/apiConfig';
import { getApiArrayPayload, logApiError, type ApiResponseEnvelope } from "./apiTypes";
import type { StoreInfo } from "@/types/store"
import { deleteMasterRecords } from "@/lib/masterDelete";

const BASE_URL = `${API_BASE_URL}/StoreInfo`;



// GET all (optionally filtered by storeId)
export async function getStoreInfos(
  storeId?: number
): Promise<{ data: StoreInfo[] }> {
  try {
    const resp = await axios.get(`${BASE_URL}`, {
      params: { STORE_ID: storeId },
    });

    if (resp.status !== 200) {
      throw new Error(`Unexpected HTTP status ${resp.status}`);
    }

    // the controller may return several wrapper shapes. normalize to { data, labels }
    const payload = resp.data
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid response format from getStoreInfos");
    }

    const data = getApiArrayPayload<StoreInfo>(payload)
    if (data.length === 0 && storeId !== undefined) {
      throw new Error("Response did not contain an array of customer exts");
    }

    return { data }
  } catch (err: unknown) {
    logApiError("Error in getStoreInfos:", err)
    throw err
  }
}

// POST create
export async function createStoreInfo(
  payload: Partial<StoreInfo>
): Promise<ApiResponseEnvelope<StoreInfo>> {
  const resp = await axios.post<ApiResponseEnvelope<StoreInfo>>(`${BASE_URL}`, payload);
  return resp.data;
}

// PUT update
export async function updateStoreInfo(
  payload: Partial<StoreInfo>
): Promise<ApiResponseEnvelope<StoreInfo>> {
  const resp = await axios.put<ApiResponseEnvelope<StoreInfo>>(`${BASE_URL}`, payload);
  return resp.data;
}

// Export to Excel (optionally filter by store ID)
export async function exportToExcel(
  storeID?: number,
  lang?: string, abortSignal?: AbortSignal
): Promise<Blob> {
  const params: Record<string, string | number> = {};
  if (storeID) params.STORE_ID = storeID;
  if (lang) params.lang = lang;

  const resp = await axios.get(`${BASE_URL}/export`, {
    params,
    signal: abortSignal, responseType: 'blob',
  });
  return resp.data;
}

export async function deleteStoreInfos(
  storeIds: number[],
): Promise<ApiResponseEnvelope<unknown>> {
  await deleteMasterRecords(BASE_URL, storeIds, "StoreIds", "DeleteMany");
  return { Success: true, Data: { deleted: storeIds.length } };
}
