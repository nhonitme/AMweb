import { SysCode, getSysCodes, clearSysCodesCache as clearSysCodesCacheService } from '@/api/sysCodeService';

export type SysCodesMap = Record<string, SysCode[]>;

let sysCodesMapCache: Promise<SysCodesMap> | null = null;

export async function loadSysCodesMap(): Promise<SysCodesMap> {
  if (sysCodesMapCache) return sysCodesMapCache;

  sysCodesMapCache = (async () => {
    const response = await getSysCodes();
    const map: SysCodesMap = {};

    response.data.forEach((code) => {
      const type = code.CODE_TYPE || "";
      if (!map[type]) map[type] = [];
      map[type].push(code);
    });

    return map;
  })();

  return sysCodesMapCache;
}

export async function getCachedSysCodes(codeType: string): Promise<SysCode[]> {
  const map = await loadSysCodesMap();
  return map[codeType] || [];
}

export function clearSysCodesCache(): void {
  sysCodesMapCache = null;
  clearSysCodesCacheService();
}

