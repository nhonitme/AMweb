import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef } from "react"

import type { SysCode, SysCodeMap } from "@/api/sysCodeService"
import { useSysCodesQuery, useSysCodesQueryActions } from "@/hooks/queries/useSysCodesQuery"
import { warmupSysCodesCache } from "@/lib/sysCodeCache"
import { AUTH_SESSION_CHANGED_EVENT, canRestoreSession, getCurrentCompanyCd, isAuthenticated, type AuthSession } from "@/lib/login"
import { setSysCodeDropdownRefreshHandler, tagSysCodeList } from "@/lib/sysCodeDropdownRefresh"

interface SysCodeContextType {
  sysCodeMap: SysCodeMap
  loadSysCodes: () => Promise<void>
  refreshSysCodes: () => Promise<SysCodeMap>
  getCodesByType: (codeType: string) => SysCode[]
  getCodeName: (codeType: string, codeCd: string | number) => string
  clearSysCodes: () => void
}

const SysCodeContext = createContext<SysCodeContextType | null>(null)

function hasSysCodeEntries(map: SysCodeMap): boolean {
  return Object.keys(map).length > 0
}

export function SysCodeProvider({ children }: { children: React.ReactNode }) {
  const query = useSysCodesQuery()
  const { data: sysCodeMap = {}, fetchStatus } = query
  const { invalidateSysCodes, refreshSysCodes, clearSysCodes } = useSysCodesQueryActions()
  const sysCodeMapRef = useRef(sysCodeMap)
  const emptyRecoverAttemptsRef = useRef(0)
  sysCodeMapRef.current = sysCodeMap

  const loadSysCodes = useCallback(async () => {
    if (!isAuthenticated()) {
      clearSysCodes()
      return
    }

    await invalidateSysCodes()
  }, [clearSysCodes, invalidateSysCodes])

  // If lookups stay empty while authenticated (e.g. login race), force a recover.
  useEffect(() => {
    if (!isAuthenticated() || !canRestoreSession() || !getCurrentCompanyCd()) {
      emptyRecoverAttemptsRef.current = 0
      return
    }

    if (hasSysCodeEntries(sysCodeMap)) {
      emptyRecoverAttemptsRef.current = 0
      return
    }

    if (fetchStatus === "fetching") {
      return
    }

    if (emptyRecoverAttemptsRef.current >= 3) {
      return
    }

    emptyRecoverAttemptsRef.current += 1
    void refreshSysCodes()
  }, [sysCodeMap, fetchStatus, refreshSysCodes])

  useEffect(() => {
    const handleSessionChanged = (event: Event) => {
      const session = (event as CustomEvent<AuthSession | null>).detail

      if (!session?.isAuthenticated) {
        emptyRecoverAttemptsRef.current = 0
        clearSysCodes()
        return
      }

      // Token refresh re-fires this event. Only reload when cache was wiped
      // (logout / queryClient.clear / idle session drop) so lookups recover.
      if (!hasSysCodeEntries(sysCodeMapRef.current)) {
        void refreshSysCodes()
      }
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged)
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged)
    }
  }, [clearSysCodes, refreshSysCodes])

  useEffect(() => {
    return setSysCodeDropdownRefreshHandler(async (codeType: string) => {
      const refreshedMap = await warmupSysCodesCache(false)
      const key = codeType.trim().toUpperCase()
      return tagSysCodeList(refreshedMap[key] ?? [], key)
    })
  }, [])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        return
      }

      // Tab focus after idle: recover empty sys-code lookups app-wide.
      if (!hasSysCodeEntries(sysCodeMapRef.current) && isAuthenticated()) {
        void refreshSysCodes()
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [refreshSysCodes])

  const getCodesByType = useCallback(
    (codeType: string): SysCode[] => {
      if (!codeType) return []
      const key = codeType.trim().toUpperCase()
      return tagSysCodeList(sysCodeMap[key] ?? [], key)
    },
    [sysCodeMap],
  )

  const getCodeName = useCallback(
    (codeType: string, codeCd: string | number): string => {
      const key = codeType?.trim().toUpperCase()
      const list = sysCodeMap[key] ?? []
      const found = list.find((item) => String(item.CODE_CD) === String(codeCd))
      return found?.CODE_NAME ?? ""
    },
    [sysCodeMap],
  )

  const value = useMemo(
    () => ({
      sysCodeMap,
      loadSysCodes,
      refreshSysCodes,
      getCodesByType,
      getCodeName,
      clearSysCodes,
    }),
    [sysCodeMap, loadSysCodes, refreshSysCodes, getCodesByType, getCodeName, clearSysCodes],
  )

  return <SysCodeContext.Provider value={value}>{children}</SysCodeContext.Provider>
}

export function useSysCodes(): SysCodeContextType {
  const context = useContext(SysCodeContext)
  if (!context) {
    throw new Error("useSysCodes must be used within SysCodeProvider")
  }
  return context
}
