import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { getAllSysGridColumnSettings, getSysGridColumnSettings } from "@/api/sysGridColumnSettingApi";
import { getCurrentCompanyCd, getCurrentUserId, isAuthenticated } from "@/lib/login";
import type { SysGridColumnSetting } from "@/types/sysGridColumnSetting";

type SysGridColumnSettingMap = Record<string, SysGridColumnSetting[]>;

type SysGridColumnSettingContextValue = {
  settingsLoading: boolean;
  settingsVersion: number;
  ensureGridColumnSettingsLoaded: (force?: boolean) => Promise<void>;
  refreshGridColumnSettings: (force?: boolean) => Promise<void>;
  reloadGridColumnSettings: (screenCd: string, gridId: string) => Promise<SysGridColumnSetting[]>;
  getGridColumnSettings: (screenCd: string, gridId: string) => SysGridColumnSetting[];
  setGridColumnSettings: (screenCd: string, gridId: string, items: SysGridColumnSetting[]) => void;
  removeGridColumnSettings: (screenCd: string, gridId: string) => void;
  clearGridColumnSettings: () => void;
};

type SysGridColumnSettingCachePayload = {
  companyCd: string;
  items: SysGridColumnSetting[];
  userId: string;
};

const STORAGE_KEY = "sys_grid_column_settings";

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function buildCacheKey(screenCd: unknown, gridId: unknown): string {
  const normalizedScreenCd = normalizeText(screenCd);
  const normalizedGridId = normalizeText(gridId);

  if (!normalizedScreenCd || !normalizedGridId) {
    return "";
  }

  return `${normalizedScreenCd}::${normalizedGridId}`;
}

function sortGridSettings(items: SysGridColumnSetting[]): SysGridColumnSetting[] {
  return [...items].sort((left, right) => {
    const leftIndex = typeof left.VISIBLE_INDEX === "number" ? left.VISIBLE_INDEX : Number.MAX_SAFE_INTEGER;
    const rightIndex = typeof right.VISIBLE_INDEX === "number" ? right.VISIBLE_INDEX : Number.MAX_SAFE_INTEGER;

    if (left.SCREEN_CD !== right.SCREEN_CD) {
      return left.SCREEN_CD.localeCompare(right.SCREEN_CD);
    }

    if (left.GRID_ID !== right.GRID_ID) {
      return left.GRID_ID.localeCompare(right.GRID_ID);
    }

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex;
    }

    return left.COLUMN_NAME.localeCompare(right.COLUMN_NAME);
  });
}

function buildSettingsMap(items: SysGridColumnSetting[]): SysGridColumnSettingMap {
  return sortGridSettings(items).reduce<SysGridColumnSettingMap>((accumulator, item) => {
    const cacheKey = buildCacheKey(item.SCREEN_CD, item.GRID_ID);
    if (!cacheKey) {
      return accumulator;
    }

    if (!accumulator[cacheKey]) {
      accumulator[cacheKey] = [];
    }

    accumulator[cacheKey].push(item);
    return accumulator;
  }, {});
}

function flattenSettingsMap(settingsMap: SysGridColumnSettingMap): SysGridColumnSetting[] {
  return sortGridSettings(Object.values(settingsMap).flat());
}

function readCachedSettings(companyCd: string, userId: string): SysGridColumnSetting[] | null {
  if (typeof window === "undefined") {
    return null;
  }

  const raw = sessionStorage.getItem(STORAGE_KEY);
  if (!raw) {
    return null;
  }

  try {
    const payload = JSON.parse(raw) as SysGridColumnSettingCachePayload;
    if (
      normalizeText(payload?.companyCd) !== normalizeText(companyCd) ||
      normalizeText(payload?.userId) !== normalizeText(userId) ||
      !Array.isArray(payload?.items)
    ) {
      sessionStorage.removeItem(STORAGE_KEY);
      return null;
    }

    return payload.items;
  } catch {
    sessionStorage.removeItem(STORAGE_KEY);
    return null;
  }
}

function writeCachedSettings(companyCd: string, userId: string, settingsMap: SysGridColumnSettingMap) {
  if (typeof window === "undefined") {
    return;
  }

  const payload: SysGridColumnSettingCachePayload = {
    companyCd,
    items: flattenSettingsMap(settingsMap),
    userId,
  };

  sessionStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
}

const SysGridColumnSettingContext = createContext<SysGridColumnSettingContextValue | null>(null);

export function SysGridColumnSettingProvider({ children }: { children: ReactNode }) {
  const [settingsLoading, setSettingsLoading] = useState(false);
  const settingsMapRef = useRef<SysGridColumnSettingMap>({});
  const [settingsVersion, setSettingsVersion] = useState(0);
  const loadPromiseRef = useRef<Promise<SysGridColumnSettingMap> | null>(null);
  const reloadPromiseMapRef = useRef<Map<string, Promise<SysGridColumnSetting[]>>>(new Map());

  const updateSettingsMap = useCallback((nextMap: SysGridColumnSettingMap) => {
    settingsMapRef.current = nextMap;
    setSettingsVersion((currentVersion) => currentVersion + 1);
  }, []);

  const clearGridColumnSettings = useCallback(() => {
    updateSettingsMap({});
    loadPromiseRef.current = null;

    if (typeof window !== "undefined") {
      sessionStorage.removeItem(STORAGE_KEY);
    }
  }, [updateSettingsMap]);

  const hydrateFromStorage = useCallback(() => {
    const companyCd = getCurrentCompanyCd();
    const userId = getCurrentUserId();

    if (!companyCd || !userId) {
      updateSettingsMap({});
      return false;
    }

    const cachedItems = readCachedSettings(companyCd, userId);
    if (!cachedItems) {
      return false;
    }

    updateSettingsMap(buildSettingsMap(cachedItems));
    return true;
  }, [updateSettingsMap]);

  const persistCurrentMap = useCallback((settingsMap: SysGridColumnSettingMap) => {
    const companyCd = getCurrentCompanyCd();
    const userId = getCurrentUserId();

    if (!companyCd || !userId) {
      return;
    }

    writeCachedSettings(companyCd, userId, settingsMap);
  }, []);

  const replaceGridColumnSettings = useCallback((screenCd: string, gridId: string, items: SysGridColumnSetting[]) => {
    const cacheKey = buildCacheKey(screenCd, gridId);
    if (!cacheKey) {
      return;
    }

    const nextMap = { ...settingsMapRef.current };
    const normalizedItems = sortGridSettings(items);

    if (normalizedItems.length) {
      nextMap[cacheKey] = normalizedItems;
    } else {
      delete nextMap[cacheKey];
    }

    updateSettingsMap(nextMap);
    persistCurrentMap(nextMap);
  }, [persistCurrentMap, updateSettingsMap]);

  const ensureGridColumnSettingsLoaded = useCallback(async (force = false) => {
    if (!isAuthenticated()) {
      clearGridColumnSettings();
      return;
    }

    if (!force) {
      if (Object.keys(settingsMapRef.current).length > 0) {
        return;
      }

      if (hydrateFromStorage()) {
        return;
      }

      if (loadPromiseRef.current) {
        await loadPromiseRef.current;
        return;
      }
    } else if (loadPromiseRef.current) {
      await loadPromiseRef.current;
      return;
    }

    const promise = (async () => {
      setSettingsLoading(true);

      try {
        const response = await getAllSysGridColumnSettings();
        const nextMap = buildSettingsMap(response.data);
        updateSettingsMap(nextMap);
        persistCurrentMap(nextMap);
        return nextMap;
      } catch (error) {
        console.error("Failed to preload sys grid column settings", error);
        if (!Object.keys(settingsMapRef.current).length) {
          hydrateFromStorage();
        }

        return settingsMapRef.current;
      } finally {
        setSettingsLoading(false);
        loadPromiseRef.current = null;
      }
    })();

    loadPromiseRef.current = promise;
    await promise;
  }, [clearGridColumnSettings, hydrateFromStorage, persistCurrentMap]);

  const refreshGridColumnSettings = useCallback(async (force = true) => {
    await ensureGridColumnSettingsLoaded(force);
  }, [ensureGridColumnSettingsLoaded]);

  const reloadGridColumnSettings = useCallback(async (screenCd: string, gridId: string) => {
    if (!isAuthenticated()) {
      clearGridColumnSettings();
      return [];
    }

    const cacheKey = buildCacheKey(screenCd, gridId);
    if (!cacheKey) {
      return [];
    }

    const pendingPromise = reloadPromiseMapRef.current.get(cacheKey);
    if (pendingPromise) {
      return await pendingPromise;
    }

    const promise = (async () => {
      try {
        const response = await getSysGridColumnSettings(screenCd, gridId);
        const nextItems = Array.isArray(response.data) ? response.data : [];
        replaceGridColumnSettings(screenCd, gridId, nextItems);
        return sortGridSettings(nextItems);
      } catch (error) {
        console.error("Failed to reload sys grid column settings", error);
        return sortGridSettings(settingsMapRef.current[cacheKey] ?? []);
      } finally {
        reloadPromiseMapRef.current.delete(cacheKey);
      }
    })();

    reloadPromiseMapRef.current.set(cacheKey, promise);
    return await promise;
  }, [clearGridColumnSettings, replaceGridColumnSettings]);

  const getGridColumnSettings = useCallback((screenCd: string, gridId: string) => {
    const cacheKey = buildCacheKey(screenCd, gridId);
    if (!cacheKey) {
      return [];
    }

    return sortGridSettings(settingsMapRef.current[cacheKey] ?? []);
  }, []);

  const setGridColumnSettings = useCallback((screenCd: string, gridId: string, items: SysGridColumnSetting[]) => {
    replaceGridColumnSettings(screenCd, gridId, items);
  }, [replaceGridColumnSettings]);

  const removeGridColumnSettings = useCallback((screenCd: string, gridId: string) => {
    const cacheKey = buildCacheKey(screenCd, gridId);
    if (!cacheKey || !settingsMapRef.current[cacheKey]) {
      return;
    }

    const nextMap = { ...settingsMapRef.current };
    delete nextMap[cacheKey];
    updateSettingsMap(nextMap);
    persistCurrentMap(nextMap);
  }, [persistCurrentMap, updateSettingsMap]);

  useEffect(() => {
    if (isAuthenticated()) {
      hydrateFromStorage();
      return;
    }

    clearGridColumnSettings();
  }, [clearGridColumnSettings, hydrateFromStorage]);

  const value = useMemo<SysGridColumnSettingContextValue>(() => ({
    settingsLoading,
    settingsVersion,
    ensureGridColumnSettingsLoaded,
    refreshGridColumnSettings,
    reloadGridColumnSettings,
    getGridColumnSettings,
    setGridColumnSettings,
    removeGridColumnSettings,
    clearGridColumnSettings,
  }), [
    clearGridColumnSettings,
    ensureGridColumnSettingsLoaded,
    getGridColumnSettings,
    reloadGridColumnSettings,
    refreshGridColumnSettings,
    removeGridColumnSettings,
    setGridColumnSettings,
    settingsLoading,
    settingsVersion,
  ]);

  return (
    <SysGridColumnSettingContext.Provider value={value}>
      {children}
    </SysGridColumnSettingContext.Provider>
  );
}

export function useSysGridColumnSettings(): SysGridColumnSettingContextValue {
  const context = useContext(SysGridColumnSettingContext);
  if (!context) {
    throw new Error("useSysGridColumnSettings must be used within SysGridColumnSettingProvider");
  }

  return context;
}
