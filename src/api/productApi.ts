import type { Product } from "@/types/product";
import type { ApiResponse } from "@/types/apiResponse";
import API_BASE_URL from "../config/apiConfig";
import axios from "./axiosClient";
import { deleteMasterRecords } from "@/lib/masterDelete";

const API_URL = `${API_BASE_URL}/ProductInfo`;

export async function getProducts(): Promise<Product[]> {
    const resp = await axios.get<ApiResponse<Product[]>>(API_URL, {
        headers: {
            "Content-Type": "application/json",
        },
        withCredentials: true,
    });

    return Array.isArray(resp.data.Data) ? resp.data.Data : [];
}

export async function createProduct(payload: Partial<Product>): Promise<ApiResponse<Product>> {
    const resp = await axios.post<ApiResponse<Product>>(API_URL, payload);
    return resp.data;
}

export async function updateProduct(id: string, payload: Partial<Product>): Promise<ApiResponse<Product>> {
    const resp = await axios.put<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`, payload);
    return resp.data;
}

export async function deleteProducts(productIds: number[]): Promise<ApiResponse<object>> {
    await deleteMasterRecords(API_URL, productIds, "ProductIds");
    return { Success: true, Data: { deleted: productIds.length } };
}

export async function exportToExcel(
    productId?: number,
    productCd?: string,
    lang?: string, abortSignal?: AbortSignal,
): Promise<Blob> {
    const params: Record<string, string | number> = {};
    if (productId) params.productId = productId;
    if (productCd) params.productCd = productCd;
    if (lang) params.lang = lang;

    const resp = await axios.get(`${API_URL}/export`, {
        params,
        signal: abortSignal, responseType: 'blob',
    });

    return resp.data;
}
