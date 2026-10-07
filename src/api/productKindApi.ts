import type { ProductKind } from "@/types/productKind";
import type { ApiResponse } from "@/types/apiResponse";
import API_BASE_URL from "../config/apiConfig";
import axios from "./axiosClient";
import { deleteMasterRecords } from "@/lib/masterDelete";

const API_URL = `${API_BASE_URL}/ProductKind`;

export async function getProductKinds(): Promise<ProductKind[]> {
  const resp = await axios.get<ApiResponse<ProductKind[]>>(API_URL, {
    headers: {
      "Content-Type": "application/json",
    },
    withCredentials: true,
  });

  return Array.isArray(resp.data.Data) ? resp.data.Data : [];
}

export async function createProductKind(payload: Partial<ProductKind>): Promise<ApiResponse<ProductKind>> {
  const resp = await axios.post<ApiResponse<ProductKind>>(API_URL, payload);
  return resp.data;
}

export async function updateProductKind(id: string, payload: Partial<ProductKind>): Promise<ApiResponse<object>> {
  const resp = await axios.put<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`, payload);
  return resp.data;
}

export async function deleteProductKinds(productKindIds: number[]): Promise<ApiResponse<object>> {
  await deleteMasterRecords(API_URL, productKindIds, "ProductKindIds");
  return { Success: true, Data: { deleted: productKindIds.length } };
}

export async function exportToExcel(
  productKindId?: number,
  productKindCd?: string,
  lang?: string, abortSignal?: AbortSignal,
): Promise<Blob> {
  const params: Record<string, string | number> = {};
  if (productKindId) params.productKindId = productKindId;
  if (productKindCd) params.productKindCd = productKindCd;
  if (lang) params.lang = lang;

  const resp = await axios.get(`${API_URL}/export`, {
    params,
    signal: abortSignal, responseType: "blob",
  });

  return resp.data;
}
