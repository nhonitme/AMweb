import axios from "./axiosClient";
import API_BASE_URL from "../config/apiConfig";
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login";
import { getCurrentLangCode } from "@/utils/language";

const BASE_URL = `${API_BASE_URL}/System`;

type ApiResponse<T> = {
  Data?: T;
  data?: T;
  Message?: string;
  message?: string;
};

export type UserPermissionRecord = {
  USER_PERMISSION_ID: number;
  COMPANY_CD: string;
  USERID: string;
  MENU_CODE: string;
  CAN_VIEW: string;
  CAN_ADD: string;
  CAN_EDIT: string;
  CAN_DELETE: string;
  CAN_PRINT: string;
  CAN_EXPORT: string;
  CAN_IMPORT: string;
  CAN_APPROVE: string;
  ISDEL: string;
  PERMISSION_SOURCE: string;
};

export type UserPermissionUpdatePayload = {
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

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim();
}

function normalizeNumber(value: unknown): number {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizePermissionFlag(value: unknown): string {
  return value === 1 || value === "1" || value === true || value === "true" ? "1" : "0";
}

function normalizeUserPermissionRecord(record: Record<string, unknown>): UserPermissionRecord {
  return {
    USER_PERMISSION_ID: normalizeNumber(record.USER_PERMISSION_ID ?? record.userPermissionId),
    COMPANY_CD: normalizeText(record.COMPANY_CD ?? record.companyCd),
    USERID: normalizeText(record.USERID ?? record.userId),
    MENU_CODE: normalizeText(record.MENU_CODE ?? record.menuCode),
    CAN_VIEW: normalizePermissionFlag(record.CAN_VIEW ?? record.canView),
    CAN_ADD: normalizePermissionFlag(record.CAN_ADD ?? record.canAdd),
    CAN_EDIT: normalizePermissionFlag(record.CAN_EDIT ?? record.canEdit),
    CAN_DELETE: normalizePermissionFlag(record.CAN_DELETE ?? record.canDelete),
    CAN_PRINT: normalizePermissionFlag(record.CAN_PRINT ?? record.canPrint),
    CAN_EXPORT: normalizePermissionFlag(record.CAN_EXPORT ?? record.canExport),
    CAN_IMPORT: normalizePermissionFlag(record.CAN_IMPORT ?? record.canImport),
    CAN_APPROVE: normalizePermissionFlag(record.CAN_APPROVE ?? record.canApprove),
    ISDEL: normalizePermissionFlag(record.ISDEL ?? record.isDel),
    PERMISSION_SOURCE: normalizeText(record.PERMISSION_SOURCE ?? record.permissionSource),
  };
}

function normalizeUserPermissionRecords(payload: unknown): UserPermissionRecord[] {
  if (!Array.isArray(payload)) {
    return [];
  }

  return payload
    .map((item) => normalizeUserPermissionRecord((item ?? {}) as Record<string, unknown>))
    .filter((item) => item.MENU_CODE.length > 0);
}

export async function getUserPermissions(
  menuCode?: string,
  userId?: string,
): Promise<UserPermissionRecord[]> {
  const normalizedUserId = normalizeText(userId || getCurrentUserId());
  const normalizedCompanyCd = normalizeText(getCurrentCompanyCd());
  const normalizedMenuCode = normalizeText(menuCode);

  if (!normalizedUserId || !normalizedCompanyCd) {
    return [];
  }

  const params: Record<string, string> = {
    userId: normalizedUserId,
  };

  if (normalizedMenuCode) {
    params.menuCode = normalizedMenuCode;
  }

  const response = await axios.get<ApiResponse<unknown>>(`${BASE_URL}/user-permissions`, {
    params,
  });

  return normalizeUserPermissionRecords(unwrapPayload(response.data));
}

export async function updateUserPermission(data: UserPermissionUpdatePayload) {
  const response = await axios.put<ApiResponse<unknown>>(`${BASE_URL}/user-permissions`, data);
  return unwrapPayload(response.data);
}

export enum EtcType {
  cbxAccount = 0,
  cbxAccountLoad = 1,
  cbxAccountParent = 2,
  cbxAccountParentChild = 3,
  cbxFixedAssetAccount = 4,
  /** Tài khoản Có phân bổ TSCĐ */
  cbxFixedAssetCreditAccount = 9,
  /** Tài khoản Nợ phân bổ TSCĐ */
  cbxFixedAssetDebitAccount = 10,
  /** Sổ tiền gửi ngân hàng — TK 112* và 128* */
  cbxBankDepositBookAccount = 11,
  /** Sổ quỹ tiền mặt — TK 111* */
  cbxCashBookAccount = 12,
  /** Sổ công nợ phải thu — TK ISCUSTOMER */
  cbxArBookAccount = 13,
}

export async function getEtcData(
  etcType: EtcType,
  param1?: string,
  param2?: string,
) {
  const params: Record<string, string | number> = {};

  params.etcType = etcType;
  params.lang = getCurrentLangCode();

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
