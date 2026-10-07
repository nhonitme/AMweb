import axios from "@/api/axiosClient";
import { getApiErrorMessage } from "./apiTypes";
import { buildCurrentCompanyBusinessCacheKey } from "@/lib/businessCacheKey";

export interface SysCode {
  CODE_ID: number;
  CODE_TYPE: string;
  CODE_CD: string;
  CODE_NAME: string;
  SORT_ORDER: number;
  IS_ACTIVE: number;
  ISDEL: string;
  CREATED_AT?: string;
  UPDATED_AT?: string;
}

export interface SysCodeApiResponse {
  Status: number;
  Success: boolean;
  Message: string;
  Data: {
    data: SysCode[];
  };
}

export interface SysCodesResponse {
  data: SysCode[];
}

export type SysCodeMap = Record<string, SysCode[]>;

export type FetchSysCodesOptions = {
  forceRefresh?: boolean;
};

const SYS_CODE_URL = "/system/sys-codes";

const sysCodesCachePromises = new Map<string, Promise<SysCode[]>>();
const sysCodesMapPromises = new Map<string, Promise<SysCodeMap>>();

function unwrapSysCodeList(payload: unknown): SysCode[] {
  if (Array.isArray(payload)) {
    return payload as SysCode[];
  }

  if (!payload || typeof payload !== "object") {
    return [];
  }

  const root = payload as SysCodeApiResponse & { data?: { data?: SysCode[] } | SysCode[] };
  const envelope = root.Data ?? root.data;

  if (Array.isArray(envelope)) {
    return envelope;
  }

  if (envelope && typeof envelope === "object") {
    const nested = (envelope as { data?: SysCode[] }).data;
    if (Array.isArray(nested)) {
      return nested;
    }
  }

  return [];
}

export function isSysCodeActive(value: unknown): boolean {
  return Number(value) === 1;
}

export function isSysCodeDeleted(value: unknown): boolean {
  return String(value ?? "") === "1";
}

export async function fetchSysCodes(options?: FetchSysCodesOptions): Promise<SysCode[]> {
  const forceRefresh = options?.forceRefresh === true;
  const cacheKey = buildCurrentCompanyBusinessCacheKey("sys-codes");

  if (forceRefresh) {
    sysCodesCachePromises.delete(cacheKey);
    sysCodesMapPromises.delete(buildCurrentCompanyBusinessCacheKey("sys-codes-map"));
  } else {
    const cachedPromise = sysCodesCachePromises.get(cacheKey);
    if (cachedPromise) {
      return cachedPromise;
    }
  }

  const request = (async () => {
    try {
      const res = await axios.get<SysCodeApiResponse>(SYS_CODE_URL, {
        params: forceRefresh ? { refresh: true } : undefined,
      });
      return unwrapSysCodeList(res.data);
    } catch (err: unknown) {
      sysCodesCachePromises.delete(cacheKey);
      sysCodesMapPromises.delete(buildCurrentCompanyBusinessCacheKey("sys-codes-map"));
      const msg = getApiErrorMessage(err, "Failed to fetch sys codes");
      throw new Error(msg);
    }
  })();

  sysCodesCachePromises.set(cacheKey, request);
  return request;
}

export function groupSysCodesByType(items: SysCode[]): SysCodeMap {
  const result: SysCodeMap = {};

  for (const item of items) {
    if (!item?.CODE_TYPE) continue;
    if (isSysCodeDeleted(item.ISDEL)) continue;
    if (!isSysCodeActive(item.IS_ACTIVE)) continue;

    const key = item.CODE_TYPE.trim().toUpperCase();
    if (!result[key]) {
      result[key] = [];
    }

    result[key].push(item);
  }

  for (const key of Object.keys(result)) {
    result[key].sort((a, b) => (a.SORT_ORDER ?? 0) - (b.SORT_ORDER ?? 0));
  }

  return result;
}

export async function getSysCodes(codeType?: string): Promise<SysCodesResponse> {
  const map = await loadSysCodesMap();
  if (!codeType) {
    const all = Object.values(map).flat();
    return { data: all };
  }

  const key = codeType.trim().toUpperCase();
  return { data: map[key] ?? [] };
}

export async function loadSysCodesMap(): Promise<SysCodeMap> {
  const cacheKey = buildCurrentCompanyBusinessCacheKey("sys-codes-map");
  const cachedPromise = sysCodesMapPromises.get(cacheKey);
  if (cachedPromise) return cachedPromise;

  const request = (async () => {
    try {
      const items = await fetchSysCodes();
      return groupSysCodesByType(items);
    } catch (err) {
      sysCodesMapPromises.delete(cacheKey);
      throw err;
    }
  })();

  sysCodesMapPromises.set(cacheKey, request);
  return request;
}

export function clearSysCodesCache(): void {
  sysCodesCachePromises.clear();
  sysCodesMapPromises.clear();
}
