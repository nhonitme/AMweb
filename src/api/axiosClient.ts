import axios, { type AxiosError, type InternalAxiosRequestConfig } from "axios";
import API_BASE_URL from "../config/apiConfig";
import { API_REQUEST_TIMEOUT_MS } from "../config/httpConfig";
import { attachClientPublicIpInterceptor } from "@/lib/clientPublicIp";
import { canRestoreSession, clearAuthSession, getCurrentCompanyCd, refreshToken } from "@/lib/login";
import { isPublicApiPath, isPublicAppPath } from "@/lib/publicRoutes";
import { normalizeApiError } from "./apiTypes";

type RetriableRequestConfig = InternalAxiosRequestConfig & {
  _retry?: boolean
}

axios.defaults.baseURL = API_BASE_URL;
axios.defaults.withCredentials = true;
axios.defaults.timeout = API_REQUEST_TIMEOUT_MS;

attachClientPublicIpInterceptor(axios);

let refreshPromise: Promise<boolean> | null = null;

const COMPANY_CD_HEADER = "X-Company-CD";
const forbiddenCompanyPayloadFields = new Set(["COMPANY_CD", "companyCd", "DatabaseName", "databaseName", "DB_NAME", "dbName"]);
const mutatingMethods = new Set(["post", "put", "patch"]);

function normalizePath(value: string): string {
  return value.replace(/\/{2,}/g, "/").replace(/\/$/, "");
}

function getApiBaseUrl(): URL {
  return new URL(API_BASE_URL, typeof window === "undefined" ? "http://localhost" : window.location.origin);
}

function getApiRelativePath(rawUrl: string): string {
  const apiBaseUrl = getApiBaseUrl();
  const apiPath = normalizePath(apiBaseUrl.pathname);
  const url = new URL(rawUrl, apiBaseUrl);

  if (url.origin === apiBaseUrl.origin && normalizePath(url.pathname).startsWith(`${apiPath}/`)) {
    return `${url.pathname.slice(apiPath.length).replace(/^\/+/, "")}${url.search}`;
  }

  return `${rawUrl.replace(/^\/+/, "")}`;
}

function isAuthEndpointPath(path: string): boolean {
  return path.toLowerCase().replace(/^\/+/, "").startsWith("auth/");
}

function isCompanyScopedPath(path: string): boolean {
  return path.toLowerCase().replace(/^\/+/, "").startsWith("companies/");
}

function buildCompanyScopedUrl(rawUrl: string, companyCd: string): string {
  const apiBaseUrl = getApiBaseUrl();
  const relativePath = getApiRelativePath(rawUrl);
  const pathOnly = relativePath.split("?")[0] ?? "";

  if (!relativePath || isAuthEndpointPath(pathOnly) || isCompanyScopedPath(pathOnly)) {
    return rawUrl;
  }

  const [pathPart, queryPart] = relativePath.split("?");
  const normalizedPath = pathPart.replace(/^\/+/, "");
  const scopedPath = normalizePath(`${apiBaseUrl.pathname}/companies/${encodeURIComponent(companyCd)}/${normalizedPath}`);
  const nextUrl = new URL(apiBaseUrl.toString());
  nextUrl.pathname = scopedPath;
  nextUrl.search = queryPart ? `?${queryPart}` : "";

  return nextUrl.toString();
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === "[object Object]";
}

function stripCompanyPayloadFields(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(stripCompanyPayloadFields);
  }

  if (!isRecord(value)) {
    return value;
  }

  return Object.entries(value).reduce<Record<string, unknown>>((result, [key, item]) => {
    if (!forbiddenCompanyPayloadFields.has(key)) {
      result[key] = stripCompanyPayloadFields(item);
    }

    return result;
  }, {});
}

function normalizeRequestData(config: InternalAxiosRequestConfig): void {
  const method = String(config.method ?? "get").toLowerCase();
  if (!mutatingMethods.has(method)) {
    return;
  }

  if (typeof FormData !== "undefined" && config.data instanceof FormData) {
    forbiddenCompanyPayloadFields.forEach((field) => config.data.delete(field));
    return;
  }

  config.data = stripCompanyPayloadFields(config.data);
}

axios.interceptors.request.use((config) => {
  const companyCd = getCurrentCompanyCd();
  const url = String(config.url ?? "");

  if (companyCd) {
    config.headers.set(COMPANY_CD_HEADER, companyCd);
  }

  if (companyCd && url) {
    config.url = buildCompanyScopedUrl(url, companyCd);
  }

  normalizeRequestData(config);
  return config;
});

function redirectToLoginIfNeeded() {
  if (typeof window !== "undefined" && isPublicAppPath()) {
    return;
  }

  if (typeof window !== "undefined" && window.location.pathname !== "/login") {
    window.location.href = "/login";
  }
}

axios.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<unknown, RetriableRequestConfig>) => {
    const normalizedError = normalizeApiError(error)
    const originalRequest = error.config;
    if (!originalRequest) {
      return Promise.reject(normalizedError);
    }

    const status = error.response?.status;
    const requestUrl = String(originalRequest.url ?? "");
    const requestPath = getApiRelativePath(requestUrl).split("?")[0] ?? "";
    const isAuthEndpoint =
      requestUrl.includes("/auth/login") ||
      requestUrl.includes("/auth/refresh") ||
      requestUrl.includes("/auth/session") ||
      requestUrl.includes("/auth/logout");
    const isPublicEndpoint = isPublicApiPath(requestPath);

    if (status === 401 && !originalRequest._retry && !isAuthEndpoint && !isPublicEndpoint && !isPublicAppPath()) {
      if (!canRestoreSession()) {
        clearAuthSession();
        redirectToLoginIfNeeded();
        return Promise.reject(normalizedError);
      }

      originalRequest._retry = true;

      if (!refreshPromise) {
        refreshPromise = refreshToken().finally(() => {
          refreshPromise = null;
        });
      }

      const refreshed = await refreshPromise;
      if (refreshed) {
        return axios(originalRequest);
      }

      clearAuthSession();
      redirectToLoginIfNeeded();
    }

    return Promise.reject(normalizedError);
  },
);

export default axios;
