import type { MaterialKind } from "@/types/material";
import API_BASE_URL from "../config/apiConfig";

const API_ADD_MATERIAL_GROUP = `${API_BASE_URL}/ProductKind/insert`;
const API_DELETE_MATERIAL_GROUP = `${API_BASE_URL}/ProductKind/delete`;
const API_UPDATE_MATERIAL_GROUP = `${API_BASE_URL}/ProductKind/update`;

function mapMaterialGroupToApiFormat(material: MaterialKind): any {
  const apiData: any = {
    Lag: "VIET",
    PRODUCTKIND_CD: material.PRODUCTKIND_CD,
    PRODUCTKIND_NM: material.PRODUCTKIND_NM,
    PRODUCTKIND_NM_ENG: material.PRODUCTKIND_NM_ENG,
    PRODUCTKIND_NM_KOR: material.PRODUCTKIND_NM_KOR,
    REMARK: material.REMARK,
    COUNT: material.COUNT,
  };

  if (material.id) {
    apiData.PRODUCTKIND_CD = material.id;
  }

  return apiData;
}

export async function addMaterialGroupAPI(newMaterial: MaterialKind) {
  try {
    const apiData = mapMaterialGroupToApiFormat(newMaterial);
    const response = await fetch(API_ADD_MATERIAL_GROUP, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiData),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.messages?.[0] || result.message || "Thêm nhóm vật tư thất bại!");
    }
    if (result.status === "success") {
      return { success: true, message: result.messages?.[0] || "Thêm nhóm vật tư thành công!", data: result.result };
    }
    throw new Error(result.messages?.[0] || "Thêm nhóm vật tư thất bại.");
  } catch (error: any) {
    return { success: false, message: error.message || "Đã xảy ra lỗi khi thêm nhóm vật tư." };
  }
}

export async function updateMaterialGroupAPI(updatedMaterial: MaterialKind) {
  try {
    const apiData = mapMaterialGroupToApiFormat(updatedMaterial);
    if (!apiData.PRODUCTKIND_CD) {
      throw new Error("Không tìm thấy Mã nhóm vật tư (PRODUCTKIND_CD) để cập nhật.");
    }
    const response = await fetch(API_UPDATE_MATERIAL_GROUP, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiData),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(result.messages?.[0] || result.message || "Cập nhật nhóm vật tư thất bại!");
    }
    if (result.status === "success") {
      return { success: true, message: result.messages?.[0] || "Cập nhật nhóm vật tư thành công!", data: result.result };
    }
    throw new Error(result.messages?.[0] || "Cập nhật nhóm vật tư thất bại.");
  } catch (error: any) {
    return { success: false, message: error.message || "Đã xảy ra lỗi khi cập nhật nhóm vật tư." };
  }
}

export async function deleteMaterialGroupAPI(materialGroupId: string) {
  try {
    const apiData = {
      Lag: "VIET",
      PRODUCTKIND_CD: materialGroupId,
    };
    const response = await fetch(API_DELETE_MATERIAL_GROUP, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiData),
    });
    const result = await response.json();
    if (!response.ok) {
      throw new Error(`Lỗi API khi xóa nhóm vật tư: ${response.status} - ${result.messages?.[0] || result.message || JSON.stringify(result)}`);
    }
    if (result.status === "success") {
      alert(result.messages?.[0] || "Xóa nhóm vật tư thành công!");
      return { success: true, message: result.messages?.[0] || "Xóa nhóm vật tư thành công!" };
    }
    throw new Error(result.messages?.[0] || "Xóa nhóm vật tư thất bại.");
  } catch (error: any) {
    console.error("Lỗi trong deleteMaterialGroupAPI:", error);
    alert(error.message || "Đã xảy ra lỗi khi xóa nhóm vật tư.");
    return { success: false, message: error.message || "Đã xảy ra lỗi khi xóa nhóm vật tư." };
  }
}
