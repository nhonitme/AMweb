import axios from "./axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import { getApiArrayPayload } from "./apiTypes"
import type { InventoryPriceFlow, InventoryPriceUpdateBatch, InventoryPriceUpdateFilter, InventoryPriceUpdateRow } from "@/types/inventoryPriceUpdate"

const BASE_URL = `${API_BASE_URL}/inventory/price-update`

export function getInventoryPriceUpdateExcelModuleCd(flow: InventoryPriceFlow): string {
  return flow === "IN" ? "InventoryUpdateInPrice" : "InventoryUpdateOutPrice"
}

export async function getInventoryPriceUpdateRows(
  flow: InventoryPriceFlow,
  filter: InventoryPriceUpdateFilter,
): Promise<InventoryPriceUpdateRow[]> {
  const path = flow === "IN" ? "in-price" : "out-price"
  const response = await axios.get(`${BASE_URL}/${path}`, { params: filter })
  return getApiArrayPayload<InventoryPriceUpdateRow>(response.data)
}

export async function exportInventoryPriceUpdateExcel(
  flow: InventoryPriceFlow,
  filter: InventoryPriceUpdateFilter,
  lang?: string,
  abortSignal?: AbortSignal,
): Promise<Blob> {
  const path = flow === "IN" ? "in-price/export" : "out-price/export"
  const params: Record<string, string> = {
    STORE_CD: filter.STORE_CD ?? "",
    FROM_YMD: filter.FROM_YMD,
    TO_YMD: filter.TO_YMD,
  }
  if (lang) params.lang = lang

  const response = await axios.get(`${BASE_URL}/${path}`, {
    params,
    signal: abortSignal,
    responseType: "blob",
  })
  return response.data
}

export async function applyInventoryPriceUpdate(
  flow: InventoryPriceFlow,
  batch: InventoryPriceUpdateBatch,
): Promise<number> {
  const path = flow === "IN" ? "in-price" : "out-price"
  const response = await axios.post(`${BASE_URL}/${path}`, batch)
  const payload = response.data?.Data ?? response.data?.data ?? response.data
  return Number(payload?.UPDATED_PRODUCTS ?? payload?.updatedProducts ?? 0)
}
