import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { getApiArrayPayload, logApiError, type ApiResponseEnvelope } from "./apiTypes"
import type { InventoryOpening, InventoryOpeningRequest } from "@/types/inventoryOpening"
import { deleteMasterRecords } from "@/lib/masterDelete"

const BASE_URL = `${API_BASE_URL}/InventoryOpening`

export async function getInventoryOpenings(inputId?: number): Promise<InventoryOpening[]> {
  try {
    const resp = await axios.get(BASE_URL, {
      params: inputId ? { INPUT_ID: inputId } : undefined,
    })
    return getApiArrayPayload<InventoryOpening>(resp.data)
  } catch (err: unknown) {
    logApiError("Error in getInventoryOpenings:", err)
    throw err
  }
}

export async function createInventoryOpening(
  payload: InventoryOpeningRequest,
): Promise<ApiResponseEnvelope<InventoryOpening>> {
  const resp = await axios.post<ApiResponseEnvelope<InventoryOpening>>(BASE_URL, payload)
  return resp.data
}

export async function updateInventoryOpening(
  payload: InventoryOpeningRequest,
): Promise<ApiResponseEnvelope<InventoryOpening>> {
  const resp = await axios.put<ApiResponseEnvelope<InventoryOpening>>(BASE_URL, payload)
  return resp.data
}

export async function deleteInventoryOpenings(
  inputIds: number[],
): Promise<ApiResponseEnvelope<unknown>> {
  await deleteMasterRecords(BASE_URL, inputIds, "InputIds")
  return { Success: true, Data: { deleted: inputIds.length } }
}
