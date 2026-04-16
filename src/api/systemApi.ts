import axios from "./axiosClient";
import API_BASE_URL from "../config/apiConfig";
import { convertLangToCode, getCurrentLang } from "@/utils/language";

const BASE_URL = `${API_BASE_URL}/System`;

type ApiResponse<T> = {
  Data?: T;
  data?: T;
  Message?: string;
  message?: string;
};

export type UserPermissionUpdatePayload = {
  COMPANY_CD: string;
  USERID: string;
  MENU_CODE: string;
  CAN_VIEW: "0" | "1";
  CAN_ADD: "0" | "1";
  CAN_EDIT: "0" | "1";
  CAN_DELETE: "0" | "1";
  CAN_PRINT: "0" | "1";
  CAN_EXPORT: "0" | "1";
  CAN_IMPORT: "0" | "1";
  CAN_APPROVE: "0" | "1";
  USERID_MODIFY: string;
};

function unwrapPayload<T>(payload: ApiResponse<T> | T): T {
  const envelope = (payload as ApiResponse<T>).Data ?? (payload as ApiResponse<T>).data;
  return (envelope ?? payload) as T;
}

export async function getUserPermissions(
  menuCode?: string,
  userId?: string,
  companyCd?: string,
) {
  const params: Record<string, string> = {};

  if (menuCode) {
    params.menuCode = menuCode;
  }

  if (userId) {
    params.userId = userId;
  }

  if (companyCd) {
    params.companyCd = companyCd;
  }

  const response = await axios.get<ApiResponse<unknown>>(`${BASE_URL}/user-permissions`, {
    params,
  });

  return unwrapPayload(response.data);
}

export async function updateUserPermission(data: UserPermissionUpdatePayload) {
  const response = await axios.put<ApiResponse<unknown>>(`${BASE_URL}/user-permissions`, data);
  return unwrapPayload(response.data);
}

export async function getEtData(
  etcType?: string,
  param1?: string,
  param2?: string,
) {
  const params: Record<string, string> = {};

  if (etcType) {
    params.etcType = etcType;
  }

  params.lang = convertLangToCode(getCurrentLang());

  if (param1) {
    params.param1 = param1;
  }

  if (param2) {
    params.param2 = param2;
  }

  const response = await axios.get<ApiResponse<unknown>>(`${BASE_URL}/etc-data`, {
    params,
  });

  return unwrapPayload(response.data);
}
