import axios from "./axiosClient";
import API_BASE_URL from "../config/apiConfig";
import { getCurrentCompanyCd } from "@/lib/login";
import type { CompanyInfo, CompanyInfoApiResponse, CompanyInfoUpdateRequest } from "@/types/companyInfo";

const BASE_URL = `${API_BASE_URL}/CompanyInfo`;
const COMPANY_INFO_CACHE_STORAGE_KEY = "amnote_company_info_cache_v1";
const companyInfoCache = new Map<string, CompanyInfoApiResponse>();
const companyInfoRequestCache = new Map<string, Promise<CompanyInfoApiResponse>>();
let companyInfoStorageLoaded = false;

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

function normalizeCachePart(value?: string | null): string {
  return String(value ?? "").trim().toUpperCase();
}

function resolveCompanyCd(companyCd?: string): string {
  return normalizeCachePart(companyCd) || normalizeCachePart(getCurrentCompanyCd());
}

function resolveCompanyInfoCacheKey(companyCd?: string): string {
  return resolveCompanyCd(companyCd) || "__CURRENT__";
}

function loadCompanyInfoStorageCache() {
  if (companyInfoStorageLoaded || typeof window === "undefined") {
    return;
  }

  companyInfoStorageLoaded = true;
  const raw = sessionStorage.getItem(COMPANY_INFO_CACHE_STORAGE_KEY);
  if (!raw) {
    return;
  }

  try {
    const parsed = JSON.parse(raw) as Record<string, CompanyInfoApiResponse>;
    Object.entries(parsed).forEach(([key, value]) => {
      if (value && typeof value === "object") {
        companyInfoCache.set(key, value);
      }
    });
  } catch {
    sessionStorage.removeItem(COMPANY_INFO_CACHE_STORAGE_KEY);
  }
}

function syncCompanyInfoStorageCache() {
  if (typeof window === "undefined") {
    return;
  }

  sessionStorage.setItem(COMPANY_INFO_CACHE_STORAGE_KEY, JSON.stringify(Object.fromEntries(companyInfoCache.entries())));
}

function storeCompanyInfoCache(cacheKey: string, payload: CompanyInfoApiResponse) {
  const normalizedResponseCompanyCd = resolveCompanyCd(payload.data?.COMPANY_CD);

  companyInfoCache.set(cacheKey, payload);
  if (normalizedResponseCompanyCd) {
    companyInfoCache.set(normalizedResponseCompanyCd, payload);
  }

  syncCompanyInfoStorageCache();
}

export function clearCompanyInfoCache(): void {
  companyInfoCache.clear();
  companyInfoRequestCache.clear();

  if (typeof window !== "undefined") {
    sessionStorage.removeItem(COMPANY_INFO_CACHE_STORAGE_KEY);
  }
}

export async function getCompanyInfo(companyCd?: string): Promise<CompanyInfoApiResponse> {
  const params: Record<string, string> = {};
  const cacheKey = resolveCompanyInfoCacheKey(companyCd);
  loadCompanyInfoStorageCache();

  if (companyCd) {
    params.COMPANY_CD = companyCd;
  }

  const cachedData = companyInfoCache.get(cacheKey);
  if (cachedData) {
    return cachedData;
  }

  const existingRequest = companyInfoRequestCache.get(cacheKey);
  if (existingRequest) {
    return existingRequest;
  }

  const nextRequest = axios
    .get<ApiEnvelope<CompanyInfoApiResponse>>(`${BASE_URL}/Get`, { params })
    .then((response) => {
      const nextData = unwrapResponse(response.data).data;
      storeCompanyInfoCache(cacheKey, nextData);
      return nextData;
    })
    .finally(() => {
      if (companyInfoRequestCache.get(cacheKey) === nextRequest) {
        companyInfoRequestCache.delete(cacheKey);
      }
    });

  companyInfoRequestCache.set(cacheKey, nextRequest);
  return nextRequest;
}

export async function updateCompanyInfo(payload: CompanyInfoUpdateRequest): Promise<{ data: CompanyInfo; message?: string }> {
  const response = await axios.put<ApiEnvelope<CompanyInfo>>(`${BASE_URL}/Update`, payload);
  const normalizedResponse = unwrapResponse(response.data);
  const nextCompanyCd = resolveCompanyCd(payload.COMPANY_CD ?? normalizedResponse.data.COMPANY_CD);
  clearCompanyInfoCache();

  if (normalizedResponse.data) {
    storeCompanyInfoCache(nextCompanyCd || resolveCompanyInfoCacheKey(payload.COMPANY_CD), {
      data: normalizedResponse.data,
      exists: true,
    });
  }

  return normalizedResponse;
}
