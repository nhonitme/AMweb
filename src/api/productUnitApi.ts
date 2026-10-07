import type { ProductUnit } from "@/types/productUnit";
import type { ApiResponse } from "@/types/apiResponse";
import API_BASE_URL from "../config/apiConfig";
import axios from "./axiosClient";
import { deleteMasterRecords } from "@/lib/masterDelete";

const API_URL = `${API_BASE_URL}/ProductUnit`;

export async function getProductUnits(): Promise<ProductUnit[]> {
    const resp = await axios.get<ApiResponse<ProductUnit[]>>(API_URL, {
        headers: {
            "Content-Type": "application/json",
        },
        withCredentials: true,
    });

    return Array.isArray(resp.data.Data) ? resp.data.Data : [];
}

export async function createProductUnit(payload: Partial<ProductUnit>): Promise<ApiResponse<ProductUnit>> {
    const resp = await axios.post<ApiResponse<ProductUnit>>(API_URL, payload);
    return resp.data;
}

export async function updateProductUnit(id: string, payload: Partial<ProductUnit>): Promise<ApiResponse<object>> {
    const resp = await axios.put<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`, payload);
    return resp.data;
}

export async function deleteProductUnits(unitIds: number[]): Promise<ApiResponse<object>> {
    await deleteMasterRecords(API_URL, unitIds, "UnitIds");
    return { Success: true, Data: { deleted: unitIds.length } };
}

export async function exportToExcel(
    unitId?: number,
    unitCd?: string,
    lang?: string, abortSignal?: AbortSignal,
): Promise<Blob> {
    const params: Record<string, string | number> = {};
    if (unitId) params.unitId = unitId;
    if (unitCd) params.unitCd = unitCd;
    if (lang) params.lang = lang;

    const resp = await axios.get(`${API_URL}/export`, {
        params,
        signal: abortSignal, responseType: 'blob',
    });

    return resp.data;
}
