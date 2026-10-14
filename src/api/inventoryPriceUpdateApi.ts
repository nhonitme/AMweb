import axios from "./axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import { getApiArrayPayload } from "./apiTypes"
import type { InventoryPriceFlow, InventoryPriceUpdateBatch, InventoryPriceUpdateFilter, InventoryPriceUpdateRow } from "@/types/inventoryPriceUpdate"

const BASE_URL = `${API_BASE_URL}/inventory/price-update`

export async function getInventoryPriceUpdateRows(
  flow: InventoryPriceFlow,
  filter: InventoryPriceUpdateFilter,
): Promise<InventoryPriceUpdateRow[]> {
  const path = flow === "IN" ? "in-price" : "out-price"
  const response = await axios.get(`${BASE_URL}/${path}`, { params: filter })
  return getApiArrayPayload<InventoryPriceUpdateRow>(response.data)
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
