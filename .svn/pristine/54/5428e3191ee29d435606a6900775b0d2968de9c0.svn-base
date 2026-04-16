import { clearLanguageCache } from "@/api/LanguagesApi";
import { convertCodeToLang } from "@/utils/language";
import API_BASE_URL from "../config/apiConfig";

const SESSION_STORAGE_KEY = "amnote_auth_session";
export const AUTH_SESSION_CHANGED_EVENT = "amnote:session-changed";

interface AuthEnvelope<T> {
  Data?: T;
  Message?: string;
  data?: T;
  message?: string;
}

interface LoginRequest {
  CompanyCD: string;
  UserName: string;
  Password: string;
  Lang: string;
}

type AuthSessionPayload = {
  CompanyCd?: string;
  DatabaseName?: string;
  IsAuthenticated?: boolean;
  Lang?: string;
  Roles?: string[];
  UserId?: string;
  Username?: string;
  companyCd?: string;
  databaseName?: string;
  isAuthenticated?: boolean;
  lang?: string;
  roles?: string[];
  userId?: string;
  username?: string;
};

export interface AuthSession {
  companyCd: string;
  databaseName: string;
  isAuthenticated: boolean;
  lang: string;
  roles: string[];
  userId: string;
  username: string;
}

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

function setSessionCache(session: AuthSession | null) {
  sessionCache = session?.isAuthenticated ? session : null;

  if (typeof window === "undefined") {
    return;
  }

  if (sessionCache) {
    sessionStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(sessionCache));
    localStorage.setItem("companyCd", sessionCache.companyCd);
  } else {
    sessionStorage.removeItem(SESSION_STORAGE_KEY);
    localStorage.removeItem("companyCd");
  }

  window.dispatchEvent(new CustomEvent(AUTH_SESSION_CHANGED_EVENT, { detail: sessionCache }));
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

  return {
    companyCd: String(raw.CompanyCd ?? raw.companyCd ?? "").trim(),
    databaseName: String(raw.DatabaseName ?? raw.databaseName ?? "").trim(),
    isAuthenticated: true,
    lang: String(raw.Lang ?? raw.lang ?? "VIET").trim() || "VIET",
    roles: Array.isArray(raw.Roles ?? raw.roles) ? [...(raw.Roles ?? raw.roles ?? [])] : [],
    userId: String(raw.UserId ?? raw.userId ?? "").trim(),
    username: String(raw.Username ?? raw.username ?? "").trim(),
  };
}

async function readErrorMessage(response: Response, fallback: string): Promise<string> {
  try {
    const payload = (await response.json()) as AuthEnvelope<unknown>;
    return payload?.Message ?? payload?.message ?? fallback;
  } catch {
    try {
      const text = await response.text();
      return text || fallback;
    } catch {
      return fallback;
    }
  }
}

async function requestSession(): Promise<AuthSession | null> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/session`, {
      credentials: "include",
      method: "GET",
    });

    if (!response.ok) {
      return null;
    }

    const payload = await response.json();
    const session = toSession(payload);
    setSessionCache(session);
    return session;
  } catch {
    return null;
  }
}

export async function login(companyCD: string, userName: string, password: string, lang: string): Promise<AuthSession> {
  const requestBody: LoginRequest = {
    CompanyCD: companyCD,
    UserName: userName,
    Password: password,
    Lang: lang,
  };

  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    credentials: "include",
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    throw new Error(await readErrorMessage(response, `Login failed with status ${response.status}`));
  }

  const payload = await response.json();
  const session = toSession(payload);
  if (!session) {
    throw new Error("Login session was not created");
  }

  setSessionCache(session);

  const langCode = convertCodeToLang(requestBody.Lang);
  localStorage.setItem("lang", langCode);
  clearLanguageCache(langCode);

  return session;
}

export async function refreshToken(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
      method: "POST",
      credentials: "include",
    });

    if (!response.ok) {
      setSessionCache(null);
      return false;
    }

    const payload = await response.json();
    const session = toSession(payload);
    setSessionCache(session);
    return Boolean(session);
  } catch {
    setSessionCache(null);
    return false;
  }
}

export async function getSession(forceRefresh = false): Promise<AuthSession | null> {
  if (!forceRefresh && sessionCache?.isAuthenticated) {
    return sessionCache;
  }

  const session = await requestSession();
  if (session) {
    return session;
  }

  const refreshed = await refreshToken();
  return refreshed ? sessionCache : null;
}

export async function logout(): Promise<void> {
  try {
    await fetch(`${API_BASE_URL}/auth/logout`, {
      method: "POST",
      credentials: "include",
    });
  } finally {
    setSessionCache(null);
    sessionStorage.removeItem("menuTree");
  }
}

export function isAuthenticated(): boolean {
  return Boolean(sessionCache?.isAuthenticated);
}

export function getCurrentSession(): AuthSession | null {
  return sessionCache;
}

export function getCurrentCompanyCd(): string {
  return sessionCache?.companyCd ?? "";
}

export function getCurrentUserId(): string {
  return sessionCache?.userId ?? "";
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
