import type { ProductKind } from "@/types/productKind";
import API_BASE_URL from '../config/apiConfig';
import axios from "./axiosClient";
import { ApiResponse } from "@/types/apiResponse";

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

export async function createProductKind(payload: Partial<ProductKind>): Promise<ApiResponse<object>> {
  const resp = await axios.post<ApiResponse<object>>(API_URL, payload);
  return resp.data;
}

export async function updateProductKind(id: string, payload: Partial<ProductKind>): Promise<ApiResponse<object>> {
  const resp = await axios.put<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`, payload);
  return resp.data;
}

export async function deleteProductKind(id: string): Promise<ApiResponse<object>> {
  const resp = await axios.delete<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`);
  return resp.data;
}

export async function checkProductKindExists(
    PRODUCT_KIND_ID: number,
    PRODUCT_KIND_CD: string
) : Promise<ApiResponse<boolean>> {
    const resp = await axios.get(`${API_URL}/Exists`, { params: { PRODUCT_KIND_ID, PRODUCT_KIND_CD } });
    return resp.data;
}

export async function deleteProductKinds(ProductKindIds: number[]) : Promise<ApiResponse<object>> {
    const resp = await axios.post<ApiResponse<object>>(`${API_URL}/DeleteMany`, { ProductKindIds });
    return resp.data;
}
