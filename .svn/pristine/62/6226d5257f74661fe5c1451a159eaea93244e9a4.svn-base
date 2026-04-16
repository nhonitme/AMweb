import type { Unit } from "@/types/unit";
import API_BASE_URL from '../config/apiConfig';
import { ApiResponse } from "@/types/apiResponse";
import axios from "./axiosClient";

const API_URL = `${API_BASE_URL}/ProductUnit`;

export async function getProductUnits(): Promise<Unit[]> {
    const resp = await axios.get<ApiResponse<Unit[]>>(API_URL, {
        headers: {
            "Content-Type": "application/json",
        },
        withCredentials: true,
    });

    return Array.isArray(resp.data.Data) ? resp.data.Data : [];
}

export async function createProductUnit(payload: Partial<Unit>): Promise<ApiResponse<object>> {
    const resp = await axios.post<ApiResponse<object>>(API_URL, payload);
    return resp.data;
}

export async function updateProductUnit(id: string, payload: Partial<Unit>): Promise<ApiResponse<object>> {
    const resp = await axios.put<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`, payload);
    return resp.data;
}

export async function deleteProductUnit(id: string): Promise<ApiResponse<object>> {
    const resp = await axios.delete<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`);
    return resp.data;
}

export async function checkProductUnitExists(
    UNIT_ID: number,
    UNIT_CD: string
) : Promise<ApiResponse<boolean>> {
    const resp = await axios.get(`${API_URL}/Exists`, { params: { UNIT_ID, UNIT_CD } });
    return resp.data;
}

export async function deleteProductUnits(UnitIds: number[]) : Promise<ApiResponse<object>> {
    const resp = await axios.post<ApiResponse<object>>(`${API_URL}/DeleteMany`, { UnitIds  });
    return resp.data;
}
