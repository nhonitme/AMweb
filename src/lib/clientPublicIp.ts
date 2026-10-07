import type { AxiosInstance, InternalAxiosRequestConfig } from "axios";

/** Browser public IP via ipinfo — cached so we do not spam the lookup. */
const IP_INFO_URL = "https://ipinfo.io/ip";
const STORAGE_KEY = "amnote.clientPublicIp";
const CACHE_TTL_MS = 24 * 60 * 60 * 1000;

export const CLIENT_IP_HEADER = "X-Client-IP";

type StoredIp = {
  ip: string;
  cachedAt: number;
};

let memoryIp: string | null = null;
let resolvePromise: Promise<string> | null = null;

function readStoredIp(): string | null {
  if (typeof sessionStorage === "undefined") {
    return null;
  }

  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (!raw) {
      return null;
    }

    const parsed = JSON.parse(raw) as StoredIp;
    if (!parsed?.ip || typeof parsed.cachedAt !== "number") {
      return null;
    }

    if (Date.now() - parsed.cachedAt > CACHE_TTL_MS) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return parsed.ip.trim() || null;
  } catch {
    return null;
  }
}

function writeStoredIp(ip: string): void {
  if (typeof sessionStorage === "undefined") {
    return;
  }

  try {
    const payload: StoredIp = { ip, cachedAt: Date.now() };
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
  } catch {
    // ignore quota / private mode
  }
}

function isLikelyIp(value: string): boolean {
  // IPv4 or IPv6 (loose — enough to reject HTML/error bodies)
  return /^(?:\d{1,3}\.){3}\d{1,3}$/.test(value) || value.includes(":");
}

export async function getClientPublicIp(): Promise<string> {
  if (memoryIp) {
    return memoryIp;
  }

  const stored = readStoredIp();
  if (stored) {
    memoryIp = stored;
    return stored;
  }

  if (!resolvePromise) {
    resolvePromise = fetch(IP_INFO_URL)
      .then((response) => (response.ok ? response.text() : ""))
      .then((text) => {
        const ip = text.trim();
        if (!ip || !isLikelyIp(ip)) {
          return "";
        }

        memoryIp = ip;
        writeStoredIp(ip);
        return ip;
      })
      .catch(() => "")
      .finally(() => {
        resolvePromise = null;
      });
  }

  return resolvePromise;
}

export function attachClientPublicIpInterceptor(instance: AxiosInstance): void {
  instance.interceptors.request.use(async (config: InternalAxiosRequestConfig) => {
    const ip = await getClientPublicIp();
    if (ip) {
      config.headers.set(CLIENT_IP_HEADER, ip);
    }
    return config;
  });
}

// Warm cache once on module load (non-blocking).
void getClientPublicIp();
