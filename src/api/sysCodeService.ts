import axios from "@/api/axiosClient";

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

const SYS_CODE_URL = "/system/sys-codes";

let sysCodesCachePromise: Promise<SysCode[]> | null = null;
let sysCodesMapPromise: Promise<SysCodeMap> | null = null;

export async function fetchSysCodes(): Promise<SysCode[]> {
  if (sysCodesCachePromise) return sysCodesCachePromise;

  sysCodesCachePromise = (async () => {
    try {
      const res = await axios.get<SysCodeApiResponse>(SYS_CODE_URL);
      const payload = res.data?.Data?.data ?? [];
      return Array.isArray(payload) ? payload : [];
    } catch (err: any) {
      const msg = err?.response?.data?.Message || err.message || "Failed to fetch sys codes";
      throw new Error(msg);
    }
  })();

  return sysCodesCachePromise;
}

export function groupSysCodesByType(items: SysCode[]): SysCodeMap {
  const result: SysCodeMap = {};

  for (const item of items) {
    if (!item?.CODE_TYPE) continue;
    if (item.ISDEL === "1") continue;
    if (item.IS_ACTIVE !== 1) continue;

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
  if (sysCodesMapPromise) return sysCodesMapPromise;

  sysCodesMapPromise = (async () => {
    const items = await fetchSysCodes();
    return groupSysCodesByType(items);
  })();

  return sysCodesMapPromise;
}

export function clearSysCodesCache(): void {
  sysCodesCachePromise = null;
  sysCodesMapPromise = null;
}


