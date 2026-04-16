import type { Product } from "@/types/product";
import type { ApiResponse } from "@/types/apiResponse";
import API_BASE_URL from "../config/apiConfig";
import axios from "axios";

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

export async function updateProduct(id: string, payload: Partial<Product>): Promise<ApiResponse<object>> {
    const resp = await axios.put<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`, payload);
    return resp.data;
}

export async function deleteProduct(id: string): Promise<ApiResponse<object>> {
    const resp = await axios.delete<ApiResponse<object>>(`${API_URL}/${encodeURIComponent(id)}`);
    return resp.data;
}

export async function checkProductExists(
    PRODUCT_ID: number,
    PRODUCT_CD: string
) : Promise<ApiResponse<boolean>> {
    const resp = await axios.get(`${API_URL}/Exists`, { params: { PRODUCT_ID, PRODUCT_CD } });
    return resp.data;
}

export async function deleteProducts(ProductIds: number[]) : Promise<ApiResponse<object>> {
    const resp = await axios.post<ApiResponse<object>>(`${API_URL}/DeleteMany`, { ProductIds });
    return resp.data;
}
