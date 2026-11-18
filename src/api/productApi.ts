import type { Product } from "@/types/product";
import type { ApiResponse } from "@/types/apiResponse";
import API_BASE_URL from "../config/apiConfig";
import axios from "./axiosClient";
import { deleteMasterRecords } from "@/lib/masterDelete";

const API_URL = `${API_BASE_URL}/ProductInfo`;

export async function getProducts(division?: string | string[] | null): Promise<Product[]> {
    const params: Record<string, string> = {};
    const divisions = (Array.isArray(division) ? division : [division])
        .flatMap((value) => String(value ?? "").split(/[,;|]/))
        .map((value) => value.trim())
        .filter(Boolean);
    if (divisions.length > 0) params.division = divisions.join(",");

    const resp = await axios.get<ApiResponse<Product[]>>(API_URL, {
        params,
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
