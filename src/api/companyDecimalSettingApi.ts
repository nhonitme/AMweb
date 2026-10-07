import axios from "./axiosClient";
import API_BASE_URL from "../config/apiConfig";
import type {
  CompanyDecimalFieldSettingItem,
  CompanyDecimalSettingItem,
  CompanyDecimalSettingUpdateRequest,
} from "@/types/companyDecimalSetting";

const BASE_URL = `${API_BASE_URL}/SysDecimalSetting`;

type ApiEnvelope<T> = {
  Data?: T;
  data?: T;
  Message?: string;
  message?: string;
};

function unwrapResponse<T>(payload: ApiEnvelope<T> | T): { data: T; message?: string } {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid API response");
  }

  const envelope = payload as ApiEnvelope<T>;
  return {
    data: (envelope.Data ?? envelope.data ?? payload) as T,
    message: envelope.Message ?? envelope.message,
  };
}

export async function getCompanyDecimalSettings(companyCd?: string): Promise<CompanyDecimalSettingItem[]> {
  const params: Record<string, string> = {};
  if (companyCd) {
    params.companyCd = companyCd;
  }

  const response = await axios.get<ApiEnvelope<CompanyDecimalSettingItem[]>>(BASE_URL, { params });
  return unwrapResponse(response.data).data;
}

export async function getCompanyDecimalFieldSettings(companyCd?: string): Promise<CompanyDecimalFieldSettingItem[]> {
  const params: Record<string, string> = {};
  if (companyCd) {
    params.companyCd = companyCd;
  }

  const response = await axios.get<ApiEnvelope<CompanyDecimalFieldSettingItem[]>>(`${BASE_URL}/fields`, { params });
  return unwrapResponse(response.data).data;
}

export async function updateCompanyDecimalSetting(
  settingType: string,
  payload: CompanyDecimalSettingUpdateRequest,
): Promise<CompanyDecimalSettingItem> {
  const response = await axios.put<ApiEnvelope<CompanyDecimalSettingItem>>(
    `${BASE_URL}/${encodeURIComponent(settingType)}`,
    payload,
  );

  return unwrapResponse(response.data).data;
}
