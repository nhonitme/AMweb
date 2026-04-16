"use server"

import type { UnitManagement } from "@/types/unitmanagement"
import API_BASE_URL from "../config/apiConfig";

const API_GET_ALL_UNIT = `${API_BASE_URL}/ProductUnitInfo/getAll`
const API_ADD_UNIT = `${API_BASE_URL}/ProductUnitInfo/insert`
const API_UPDATE_UNIT = `${API_BASE_URL}/ProductUnitInfo/update`
const API_DELETE_UNIT = `${API_BASE_URL}/ProductUnitInfo/delete`

function mapUnitToApiFormat(unit: UnitManagement): any {
  const apiData: any = {
    Lag: "VIET",
    UnitCD: unit.UNIT_CD,
    UnitNM: unit.UNIT_NM,
    IsDel: unit.ISDEL,
    UserID: unit.USERID,
  }

  if (unit.UNIT_CD) {
    apiData.UnitCD = unit.UNIT_CD
  }

  return apiData
}

export async function getAllUnitAPI() {
  try {
    const response = await fetch(API_GET_ALL_UNIT, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ Lag: "VIET" }),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || "Lấy danh sách đơn vị tính thất bại!")
    return result.result || []
  } catch (error: any) {
    alert(error.message || "Lỗi khi lấy danh sách đơn vị tính!")
    return []
  }
}

export async function addUnitAPI(newUnit: UnitManagement) {
  try {
    const apiData = mapUnitToApiFormat(newUnit)
    const response = await fetch(API_ADD_UNIT, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiData),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || "Thêm đơn vị tính thất bại!")
    if (result.status === "success") {
      alert(result.messages?.[0] || "Thêm đơn vị tính thành công!")
      return { success: true, message: result.messages?.[0] || "Thêm đơn vị tính thành công!", data: result.result }
    }
    throw new Error(result.messages?.[0] || "Thêm đơn vị tính thất bại.")
  } catch (error: any) {
    alert(error.message || "Lỗi khi thêm đơn vị tính!")
    return { success: false, message: error.message || "Lỗi khi thêm đơn vị tính!" }
  }
}

export async function updateUnitAPI(updatedUnit: UnitManagement) {
  try {
    const apiData = mapUnitToApiFormat(updatedUnit)
    if (!apiData.UnitCD) throw new Error("Không tìm thấy Mã đơn vị (UnitCD) để cập nhật.")
    const response = await fetch(API_UPDATE_UNIT, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiData),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || "Cập nhật đơn vị tính thất bại!")
    if (result.status === "success") {
      alert(result.messages?.[0] || "Cập nhật đơn vị tính thành công!")
      return { success: true, message: result.messages?.[0] || "Cập nhật đơn vị tính thành công!", data: result.result }
    }
    throw new Error(result.messages?.[0] || "Cập nhật đơn vị tính thất bại.")
  } catch (error: any) {
    alert(error.message || "Lỗi khi cập nhật đơn vị tính!")
    return { success: false, message: error.message || "Lỗi khi cập nhật đơn vị tính!" }
  }
}

export async function deleteUnitAPI(unitId: string) {
  try {
    const apiData = { Lag: "VIET", UnitCD: unitId }
    const response = await fetch(API_DELETE_UNIT, {
      method: "POST",
      credentials: "include",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(apiData),
    })
    const result = await response.json()
    if (!response.ok) throw new Error(result.message || "Xóa đơn vị tính thất bại!")
    if (result.status === "success") {
      alert(result.messages?.[0] || "Xóa đơn vị tính thành công!")
      return { success: true, message: result.messages?.[0] || "Xóa đơn vị tính thành công!" }
    }
    throw new Error(result.messages?.[0] || "Xóa đơn vị tính thất bại.")
  } catch (error: any) {
    alert(error.message || "Lỗi khi xóa đơn vị tính!")
    return { success: false, message: error.message || "Lỗi khi xóa đơn vị tính!" }
  }
}
