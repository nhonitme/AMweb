import axios from "./axiosClient";
import API_BASE_URL from "../config/apiConfig";

export type LicenseStatus = "ACTIVE" | "EXPIRING" | "EXPIRED" | "SUSPENDED" | string;

export type LicenseState = LicenseStatus | "UNCONFIGURED";

export interface LicenseStatusInfo {
  COMPANY_CD: string;
  LICENSE_STATUS: LicenseState;
  END_DATE: string | null;
}

export interface LicenseRenewalHistory {
  ID: number;
  RENEWED_AT: string;
  OLD_END_DATE: string | null;
  NEW_END_DATE: string | null;
  NOTE: string | null;
}

export interface LicenseInfo {
  COMPANY_CD: string;
  COMPANY_NM: string | null;
  LICENSE_KEY_MASKED: string;
  PLAN_CODE: string;
  LICENSE_TYPE: string;
  START_DATE: string | null;
  END_DATE: string | null;
  MAX_USERS: number | null;
  ACTIVE_USERS: number | null;
  MAX_CONCURRENT_USERS: number | null;
  LICENSE_STATUS: LicenseStatus;
  DAYS_REMAINING: number | null;
  RENEWAL_HISTORY: LicenseRenewalHistory[];
}

type Envelope<T> = { Data?: T; data?: T; Success?: boolean; success?: boolean; Message?: string; message?: string };

export async function getCurrentLicense(): Promise<LicenseInfo | null> {
  const response = await axios.get<Envelope<LicenseInfo | null>>(`${API_BASE_URL}/license/current`);
  const envelope = response.data;
  if (envelope.Success === false || envelope.success === false) {
    throw new Error(envelope.Message ?? envelope.message ?? "Không thể tải thông tin License");
  }
  return envelope.Data ?? envelope.data ?? null;
}

/** Lightweight lookup used by the global License Access Gate. */
export async function getLicenseStatus(): Promise<LicenseStatusInfo> {
  const response = await axios.get<Envelope<LicenseStatusInfo>>(`${API_BASE_URL}/license/status`);
  const envelope = response.data;
  if (envelope.Success === false || envelope.success === false) {
    throw new Error(envelope.Message ?? envelope.message ?? "Không thể kiểm tra License");
  }
  const data = envelope.Data ?? envelope.data;
  if (!data) throw new Error("License status response is empty");
  return data;
}
