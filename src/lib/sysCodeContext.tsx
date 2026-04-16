import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { fetchSysCodes, groupSysCodesByType, SysCode, SysCodeMap } from '@/api/sysCodeService';

interface SysCodeContextType {
  sysCodeMap: SysCodeMap;
  loadSysCodes: () => Promise<void>;
  getCodesByType: (codeType: string) => SysCode[];
  getCodeName: (codeType: string, codeCd: string | number) => string;
  clearSysCodes: () => void;
}

const SysCodeContext = createContext<SysCodeContextType | null>(null);

const SYS_CODE_STORAGE_KEY = 'sys_codes';

export function SysCodeProvider({ children }: { children: React.ReactNode }) {
  const [sysCodeMap, setSysCodeMap] = useState<SysCodeMap>({});
  const [loading, setLoading] = useState(false);

  const loadSysCodes = useCallback(async () => {
    if (loading) return;
    setLoading(true);

    try {
      const items = await fetchSysCodes();
      const grouped = groupSysCodesByType(items);
      setSysCodeMap(grouped);
      sessionStorage.setItem(SYS_CODE_STORAGE_KEY, JSON.stringify(grouped));
    } catch (error) {
      console.error('Failed to load sys codes', error);
      // Keep existing map if any
    } finally {
      setLoading(false);
    }
  }, [loading]);

  const clearSysCodes = useCallback(() => {
    setSysCodeMap({});
    sessionStorage.removeItem(SYS_CODE_STORAGE_KEY);
  }, []);

  const getCodesByType = useCallback(
    (codeType: string): SysCode[] => {
      if (!codeType) return [];
      const key = codeType.trim().toUpperCase();
      return sysCodeMap[key] ?? [];
    },
    [sysCodeMap],
  );

  const getCodeName = useCallback(
    (codeType: string, codeCd: string | number): string => {
      const key = codeType?.trim().toUpperCase();
      const list = sysCodeMap[key] ?? [];
      const found = list.find((item) => String(item.CODE_CD) === String(codeCd));
      return found?.CODE_NAME ?? '';
    },
    [sysCodeMap],
  );

  useEffect(() => {
    const cached = sessionStorage.getItem(SYS_CODE_STORAGE_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached) as SysCodeMap;
        if (parsed && typeof parsed === 'object') {
          setSysCodeMap(parsed);
          return;
        }
      } catch {
        sessionStorage.removeItem(SYS_CODE_STORAGE_KEY);
      }
    }

    void loadSysCodes();
  }, [loadSysCodes]);

  const value = useMemo(
    () => ({ sysCodeMap, loadSysCodes, getCodesByType, getCodeName, clearSysCodes }),
    [sysCodeMap, loadSysCodes, getCodesByType, getCodeName, clearSysCodes],
  );

  return <SysCodeContext.Provider value={value}>{children}</SysCodeContext.Provider>;
}

export function useSysCodes(): SysCodeContextType {
  const context = useContext(SysCodeContext);
  if (!context) {
    throw new Error('useSysCodes must be used within SysCodeProvider');
  }
  return context;
}
