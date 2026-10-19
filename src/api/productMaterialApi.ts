import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import type { ApiResponse } from "@/types/apiResponse"
import type {
  ProductMaterialRow,
  ProductMaterialSave,
  ProductMaterialSummary,
} from "@/types/productMaterial"

const base = API_BASE_URL + "/ProductMaterialInfo"

export async function getProductMaterials(productId: number): Promise<ProductMaterialRow[]> {
  const response = await axios.get<ApiResponse<ProductMaterialRow[]>>(base, { params: { productId } })
  return response.data.Data ?? []
}

export async function getProductMaterialSummary(): Promise<ProductMaterialSummary[]> {
  const response = await axios.get<ApiResponse<ProductMaterialSummary[]>>(base + "/summary")
  return response.data.Data ?? []
}

export async function saveProductMaterial(materialId: number, data: ProductMaterialSave): Promise<void> {
  const response = materialId > 0
    ? await axios.put<ApiResponse<object>>(base + "/" + materialId, data)
    : await axios.post<ApiResponse<object>>(base, data)
  if (!response.data.Success) throw new Error(response.data.Message || "Lưu nguyên vật liệu thất bại")
}

export async function deleteProductMaterial(materialId: number): Promise<void> {
  const response = await axios.delete<ApiResponse<object>>(base + "/" + materialId)
  if (!response.data.Success) throw new Error(response.data.Message || "Xóa nguyên vật liệu thất bại")
}
