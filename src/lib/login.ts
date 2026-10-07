import axios from "axios";

import { getApiErrorMessage, normalizeApiError } from "@/api/apiTypes";
import { clearNotificationSummaryCache } from "@/api/notificationApi";
import { attachClientPublicIpInterceptor } from "@/lib/clientPublicIp";
import { normalizeMessageLanguageKey } from "@/utils/language";
import API_BASE_URL from "../config/apiConfig";
import { AUTH_REQUEST_TIMEOUT_MS } from "../config/httpConfig";

const SESSION_STORAGE_KEY = "amnote_auth_session";
const SESSION_RESTORE_HINT_KEY = "amnote_auth_restore_hint";
export const AUTH_SESSION_CHANGED_EVENT = "amnote:session-changed";

interface AuthEnvelope<T> {
  Data?: T;
  Message?: string;
  data?: T;
  message?: string;
}

interface LoginRequest {
  CompanyCD?: string;
  UserName: string;
  Password: string;
  Lang: string;
}

export type AuthCompany = {
  COMPANY_CD: string;
  COMPANY_NM: string;
  USERID?: string;
  USERLV?: number | null;
  ROLE_CODE: string;
  DEFAULT_YN: string;
};

type AuthSessionPayload = {
  Companies?: AuthCompany[];
  DefaultCompanyCd?: string;
  IsAuthenticated?: boolean;
  Lang?: string;
  Roles?: string[];
  UserPkId?: number;
  UserId?: string;
  Username?: string;
  companies?: AuthCompany[];
  defaultCompanyCd?: string;
  isAuthenticated?: boolean;
  lang?: string;
  roles?: string[];
  userPkId?: number;
  userId?: string;
  username?: string;
};

export interface AuthSession {
  companies: AuthCompany[];
  defaultCompanyCd: string;
  isAuthenticated: boolean;
  lang: string;
  roles: string[];
  userPkId: number;
  userId: string;
  username: string;
}

const authHttp = axios.create({
  baseURL: API_BASE_URL,
  withCredentials: true,
  timeout: AUTH_REQUEST_TIMEOUT_MS,
});

attachClientPublicIpInterceptor(authHttp);

authHttp.interceptors.response.use(
  (response) => response,
  (error: unknown) => Promise.reject(normalizeApiError(error)),
);

function readStoredSession(): AuthSession | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(SESSION_STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const parsed = JSON.parse(raw) as AuthSession;
    return parsed?.isAuthenticated ? parsed : null;
  } catch {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    return null;
  }
}

let sessionCache: AuthSession | null = readStoredSession();
let sessionResolved = sessionCache === null;

function hasStoredRestoreHint(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return localStorage.getItem(SESSION_RESTORE_HINT_KEY) === "1";
}

function setRestoreHint(enabled: boolean) {
  if (typeof window === "undefined") {
    return;
  }

  if (enabled) {
    localStorage.setItem(SESSION_RESTORE_HINT_KEY, "1");
    return;
  }

  localStorage.removeItem(SESSION_RESTORE_HINT_KEY);
}

function setSessionCache(session: AuthSession | null) {
  const previousIdentity = sessionCache
    ? `${sessionCache.userPkId}:${sessionCache.userId}`
    : "";
  sessionCache = session?.isAuthenticated ? session : null;
  sessionResolved = true;

  const nextIdentity = sessionCache
    ? `${sessionCache.userPkId}:${sessionCache.userId}`
    : "";
  if (previousIdentity !== nextIdentity) {
    clearNotificationSummaryCache();
  }

  if (typeof window === "undefined") {
    return;
  }

  if (sessionCache) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionCache));
    setRestoreHint(true);
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    setRestoreHint(false);
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT, { detail: sessionCache }));
}

export function clearAuthSession(): void {
  setSessionCache(null);
}

function unwrapEnvelope<T>(payload: AuthEnvelope<T> | T): T {
  if (payload && typeof payload === "object") {
    const envelope = payload as AuthEnvelope<T>;
    return (envelope.Data ?? envelope.data ?? payload) as T;
  }

  return payload as T;
}

function toSession(payload: unknown): AuthSession | null {
  const raw = unwrapEnvelope(payload as AuthEnvelope<AuthSessionPayload>) as AuthSessionPayload | null;
  if (!raw || typeof raw !== "object") {
    return null;
  }

  const isAuthenticated = Boolean(raw.IsAuthenticated ?? raw.isAuthenticated);
  if (!isAuthenticated) {
    return null;
  }

  const companiesPayload = raw.Companies ?? raw.companies ?? [];
  const companies = Array.isArray(companiesPayload)
    ? companiesPayload.map((company) => ({
        COMPANY_CD: String(company.COMPANY_CD ?? "").trim(),
        COMPANY_NM: String(company.COMPANY_NM ?? "").trim(),
        USERID: String(company.USERID ?? "").trim(),
        USERLV: typeof company.USERLV === "number" ? company.USERLV : null,
        ROLE_CODE: String(company.ROLE_CODE ?? "").trim(),
        DEFAULT_YN: String(company.DEFAULT_YN ?? "0").trim() || "0",
      })).filter((company) => company.COMPANY_CD.length > 0)
    : [];

  const userPkIdRaw = raw.UserPkId ?? raw.userPkId;
  const userPkId = typeof userPkIdRaw === "number" && Number.isFinite(userPkIdRaw)
    ? userPkIdRaw
    : Number(userPkIdRaw) || 0;

  return {
    companies,
    defaultCompanyCd: String(raw.DefaultCompanyCd ?? raw.defaultCompanyCd ?? "").trim(),
    isAuthenticated: true,
    lang: normalizeMessageLanguageKey(String(raw.Lang ?? raw.lang ?? "VIET").trim() || "VIET"),
    roles: Array.isArray(raw.Roles ?? raw.roles) ? [...(raw.Roles ?? raw.roles ?? [])] : [],
    userPkId,
    userId: String(raw.UserId ?? raw.userId ?? "").trim(),
    username: String(raw.Username ?? raw.username ?? "").trim(),
  };
}

function readErrorMessage(error: unknown, fallback: string): string {
  return getApiErrorMessage(error, fallback);
}

async function requestSession(): Promise<AuthSession | null> {
  try {
    const response = await authHttp.get<AuthEnvelope<AuthSessionPayload> | AuthSessionPayload>("/auth/session");
    const session = toSession(response.data);
    setSessionCache(session);
    return session;
  } catch {
    return null;
  }
}

export async function login(companyCD: string, userName: string, password: string, lang: string): Promise<AuthSession> {
  const preferredCompanyCd = companyCD.trim();
  if (!preferredCompanyCd) {
    throw new Error("Company code or tax code is required");
  }

  const requestBody: LoginRequest = {
    CompanyCD: preferredCompanyCd,
    UserName: userName,
    Password: password,
    Lang: lang,
  };

  try {
    const response = await authHttp.post<AuthEnvelope<AuthSessionPayload> | AuthSessionPayload>("/auth/login", requestBody);
    const session = toSession(response.data);
    if (!session) {
      throw new Error("Login session was not created");
    }

    setSessionCache(session);

    localStorage.setItem("lang", normalizeMessageLanguageKey(requestBody.Lang));

    return session;
  } catch (error) {
    throw new Error(readErrorMessage(error, "Login failed"));
  }
}

export async function refreshToken(): Promise<boolean> {
  if (!canRestoreSession()) {
    clearAuthSession();
    return false;
  }

  try {
    const response = await authHttp.post<AuthEnvelope<AuthSessionPayload> | AuthSessionPayload>("/auth/refresh");
    const session = toSession(response.data);
    setSessionCache(session);
    return Boolean(session);
  } catch {
    setSessionCache(null);
    return false;
  }
}

export async function getSession(forceRefresh = false): Promise<AuthSession | null> {
  if (!forceRefresh && sessionCache?.isAuthenticated && sessionResolved) {
    return sessionCache;
  }

  const session = await requestSession();
  if (session) {
    return session;
  }

  if (!canRestoreSession()) {
    sessionResolved = true;
    return null;
  }

  const refreshed = await refreshToken();
  return refreshed ? sessionCache : null;
}

export async function logout(): Promise<void> {
  try {
    await authHttp.post("/auth/logout");
  } finally {
    clearAuthSession();
  }
}

export function isAuthenticated(): boolean {
  return Boolean(sessionCache?.isAuthenticated);
}

export function isSessionResolved(): boolean {
  return sessionResolved;
}

export function canRestoreSession(): boolean {
  return Boolean(sessionCache?.isAuthenticated) || hasStoredRestoreHint();
}

export function getCurrentSession(): AuthSession | null {
  return sessionCache;
}

export function getCurrentCompanyCd(): string {
  if (typeof window === "undefined") {
    return "";
  }

  const fromPath = getCompanyCdFromPathname(window.location.pathname);
  if (fromPath) {
    return fromPath;
  }

  return resolveDefaultCompanyCd();
}

export function getCurrentUserId(): string {
  if (!sessionCache?.isAuthenticated) {
    return "";
  }

  const companyCd = getCurrentCompanyCd();
  if (companyCd) {
    const companyUserId = sessionCache.companies.find(
      (company) => company.COMPANY_CD.toLowerCase() === companyCd.toLowerCase(),
    )?.USERID?.trim();
    if (companyUserId) {
      return companyUserId;
    }
  }

  return sessionCache.userId ?? "";
}

export function getCurrentUserPkId(): number {
  return sessionCache?.userPkId ?? 0;
}

export function updateCurrentSession(partial: Partial<AuthSession>): void {
  if (!sessionCache?.isAuthenticated) {
    return;
  }

  setSessionCache({
    ...sessionCache,
    ...partial,
    isAuthenticated: true,
  });
}

export function getCompanyCdFromPathname(pathname: string): string {
  const match = /^\/app\/([^/]+)/i.exec(pathname);
  return match ? decodeURIComponent(match[1]).trim() : "";
}

export function resolveDefaultCompanyCd(session: AuthSession | null = sessionCache): string {
  if (!session?.isAuthenticated) {
    return "";
  }

  const defaultCompany = session.companies.find((company) => company.DEFAULT_YN === "1")?.COMPANY_CD;
  return session.defaultCompanyCd || defaultCompany || session.companies[0]?.COMPANY_CD || "";
}

export function buildAppPath(companyCd: string, path = "/"): string {
  const normalizedCompanyCd = companyCd.trim();
  const normalizedPath = path.startsWith("/") ? path : `/${path}`;

  if (!normalizedCompanyCd) {
    return normalizedPath;
  }

  if (normalizedPath === "/") {
    return `/app/${encodeURIComponent(normalizedCompanyCd)}`;
  }

  return `/app/${encodeURIComponent(normalizedCompanyCd)}${normalizedPath}`;
}
