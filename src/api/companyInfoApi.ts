import axios from "./axiosClient";
import API_BASE_URL from "../config/apiConfig";
import type { CompanyInfo, CompanyInfoApiResponse, CompanyInfoUpdateRequest } from "@/types/companyInfo";

const BASE_URL = `${API_BASE_URL}/CompanyInfo`;

type ApiEnvelope<T> = {
  Data?: T;
  Message?: string;
  data?: T;
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

export async function getCompanyInfo(companyCd?: string): Promise<CompanyInfoApiResponse> {
  const params: Record<string, string> = {};

  if (companyCd) {
    params.COMPANY_CD = companyCd;
  }

  const response = await axios.get<ApiEnvelope<CompanyInfoApiResponse>>(`${BASE_URL}/Get`, { params });
  return unwrapResponse(response.data).data;
}

export async function updateCompanyInfo(payload: CompanyInfoUpdateRequest): Promise<{ data: CompanyInfo; message?: string }> {
  const response = await axios.put<ApiEnvelope<CompanyInfo>>(`${BASE_URL}/Update`, payload);
  return unwrapResponse(response.data);
}
