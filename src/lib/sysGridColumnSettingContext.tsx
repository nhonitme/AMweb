import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react"
import { useQuery, useQueryClient } from "@tanstack/react-query"

import { getAllGridColumnSettingsQueryOptions } from "@/hooks/queries/useGridColumnSettingQueries"
import { useCurrentCompanyCd } from "@/lib/currentCompanyCd"
import { getCurrentGridSettingScope, normalizeGridSettingKey, normalizeGridSettingText } from "@/lib/gridSettingCache"
import {
  applyAllSettingsToQueryCache,
  getCachedBundle,
  getGridTemplates,
  mergeGridLayout,
  patchGridSliceInQueryCache,
  persistScopeToLocalStorage,
  readGridColumnSettingsCache,
  removeGridColumnSettingsCache,
} from "@/lib/gridColumnSettingUtils"
import {
  AUTH_SESSION_CHANGED_EVENT,
  getCurrentCompanyCd,
  getCurrentUserId,
  isAuthenticated,
  isSessionResolved,
  type AuthSession,
} from "@/lib/login"
import { queryKeys } from "@/lib/query/queryKeys"
import { clearStoredGridTemplateSelections } from "@/lib/sysGridColumnTemplateStorage"
import type {
  SysGridColumn,
  SysGridColumnBundle,
  SysGridColumnTemplate,
} from "@/types/sysGridColumnSetting"
import { SYSTEM_GRID_TEMPLATE_ID } from "@/types/sysGridColumnSetting"

type SysGridColumnSettingContextValue = {
  settingsLoading: boolean
  settingsRevision: number
  refreshGridColumnSettings: (force?: boolean) => Promise<void>
  getGridColumnSettings: (gridId: string, templateId?: number | null) => SysGridColumn[]
  getGridColumnTemplates: (gridId: string) => SysGridColumnTemplate[]
  patchGridSlice: (gridId: string, slice: Partial<Pick<SysGridColumnBundle, "COLUMNS" | "TEMPLATES" | "SETTINGS">>) => void
  clearGridColumnSettings: () => void
}

const SysGridColumnSettingContext = createContext<SysGridColumnSettingContextValue | null>(null)

function hasBundleContent(bundle: SysGridColumnBundle | null | undefined): boolean {
  return Boolean(
    bundle
    && (bundle.COLUMNS.length > 0 || bundle.TEMPLATES.length > 0 || bundle.SETTINGS.length > 0),
  )
}

function hydrateScopeFromLocalStorage(queryClient: ReturnType<typeof useQueryClient>): boolean {
  const scope = getCurrentGridSettingScope()
  if (!scope) {
    return false
  }

  const cachedState = readGridColumnSettingsCache(scope)
  if (!cachedState || !hasBundleContent(cachedState.bundle)) {
    return false
  }

  applyAllSettingsToQueryCache(queryClient, scope, cachedState.bundle)
  return true
}

function hasCachedGridSettings(queryClient: ReturnType<typeof useQueryClient>): boolean {
  const scope = getCurrentGridSettingScope()
  if (!scope) {
    return false
  }

  return hasBundleContent(getCachedBundle(queryClient, scope))
}

export function SysGridColumnSettingProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient()
  const companyCd = useCurrentCompanyCd()
  const [settingsLoading, setSettingsLoading] = useState(false)
  const [settingsRevision, setSettingsRevision] = useState(0)
  const hydratedRef = useRef(false)
  const bootstrapPromiseRef = useRef<Promise<void> | null>(null)
  const emptyRecoverAttemptsRef = useRef(0)

  const bumpRevision = useCallback(() => {
    setSettingsRevision((current) => current + 1)
  }, [])

  if (!hydratedRef.current) {
    hydratedRef.current = true
    hydrateScopeFromLocalStorage(queryClient)
  }

  const authenticated = isAuthenticated()
  const sessionResolved = isSessionResolved()
  const scope = useMemo(() => getCurrentGridSettingScope(), [authenticated, companyCd, sessionResolved])
  const lastAppliedRef = useRef<{
    scopeKey: string
    data: SysGridColumnBundle
    updatedAt: number
  } | null>(null)

  const gridSettingsQuery = useQuery({
    ...getAllGridColumnSettingsQueryOptions(
      scope ?? { companyCd: "__pending__", userId: "__pending__" },
    ),
    enabled: Boolean(scope) && sessionResolved && authenticated,
  })

  useEffect(() => {
    if (!scope || !gridSettingsQuery.data || !hasBundleContent(gridSettingsQuery.data)) {
      return
    }

    const scopeKey = JSON.stringify([scope.companyCd, scope.userId])
    const previous = lastAppliedRef.current
    if (previous?.scopeKey === scopeKey
      && previous.data === gridSettingsQuery.data
      && previous.updatedAt === gridSettingsQuery.dataUpdatedAt) {
      return
    }

    lastAppliedRef.current = { scopeKey, data: gridSettingsQuery.data, updatedAt: gridSettingsQuery.dataUpdatedAt }
    persistScopeToLocalStorage(queryClient, scope)
    emptyRecoverAttemptsRef.current = 0
    bumpRevision()
  }, [bumpRevision, gridSettingsQuery.data, gridSettingsQuery.dataUpdatedAt, queryClient, scope])

  const clearGridColumnSettings = useCallback(() => {
    queryClient.removeQueries({ queryKey: queryKeys.gridColumnSettings.all })
    clearStoredGridTemplateSelections()

    const currentScope = getCurrentGridSettingScope()
    if (currentScope) {
      removeGridColumnSettingsCache(currentScope)
    }

    emptyRecoverAttemptsRef.current = 0
    lastAppliedRef.current = null
    bumpRevision()
  }, [bumpRevision, queryClient])

  const patchGridSlice = useCallback((
    gridId: string,
    slice: Partial<Pick<SysGridColumnBundle, "COLUMNS" | "TEMPLATES" | "SETTINGS">>,
  ) => {
    const currentScope = getCurrentGridSettingScope()
    if (!currentScope) {
      return
    }

    patchGridSliceInQueryCache(queryClient, currentScope, gridId, slice)
    bumpRevision()
  }, [bumpRevision, queryClient])

  const refreshGridColumnSettings = useCallback(async (force = true) => {
    if (!isSessionResolved()) {
      return
    }

    if (!isAuthenticated()) {
      clearGridColumnSettings()
      return
    }

    const currentScope = getCurrentGridSettingScope()
    if (!currentScope) {
      clearGridColumnSettings()
      return
    }

    if (!force) {
      hydrateScopeFromLocalStorage(queryClient)
      bumpRevision()
      return
    }

    if (bootstrapPromiseRef.current) {
      return bootstrapPromiseRef.current
    }

    const run = (async () => {
      setSettingsLoading(true)
      try {
        const options = getAllGridColumnSettingsQueryOptions(currentScope)
        await queryClient.fetchQuery({
          ...options,
          staleTime: 0,
        })
        persistScopeToLocalStorage(queryClient, currentScope)
        emptyRecoverAttemptsRef.current = 0
        bumpRevision()
      } finally {
        setSettingsLoading(false)
        bootstrapPromiseRef.current = null
      }
    })()

    bootstrapPromiseRef.current = run
    return run
  }, [bumpRevision, clearGridColumnSettings, queryClient])

  const getGridColumnSettings = useCallback((gridId: string, templateId?: number | null) => {
    const currentScope = getCurrentGridSettingScope()
    if (!currentScope) {
      return []
    }

    return mergeGridLayout(getCachedBundle(queryClient, currentScope), gridId, templateId ?? SYSTEM_GRID_TEMPLATE_ID)
  }, [queryClient, settingsRevision])

  const getGridColumnTemplates = useCallback((gridId: string) => {
    const currentScope = getCurrentGridSettingScope()
    if (!currentScope) {
      return []
    }

    return getGridTemplates(getCachedBundle(queryClient, currentScope), gridId)
  }, [queryClient, settingsRevision])

  useEffect(() => {
    if (!sessionResolved) {
      return
    }

    if (!authenticated) {
      clearGridColumnSettings()
    }
  }, [authenticated, clearGridColumnSettings, sessionResolved])

  useEffect(() => {
    const handleSessionChanged = (event: Event) => {
      const session = (event as CustomEvent<AuthSession | null>).detail

      if (!session?.isAuthenticated) {
        emptyRecoverAttemptsRef.current = 0
        return
      }

      if (!hasCachedGridSettings(queryClient)) {
        if (!hydrateScopeFromLocalStorage(queryClient)) {
          void refreshGridColumnSettings(true)
        } else {
          bumpRevision()
        }
      }
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged as EventListener)
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged as EventListener)
    }
  }, [bumpRevision, queryClient, refreshGridColumnSettings])

  useEffect(() => {
    if (!authenticated || !sessionResolved || !scope) {
      emptyRecoverAttemptsRef.current = 0
      return
    }

    if (hasCachedGridSettings(queryClient)) {
      emptyRecoverAttemptsRef.current = 0
      return
    }

    if (gridSettingsQuery.isFetching || settingsLoading) {
      return
    }

    if (emptyRecoverAttemptsRef.current >= 3) {
      return
    }

    emptyRecoverAttemptsRef.current += 1
    if (!hydrateScopeFromLocalStorage(queryClient)) {
      void refreshGridColumnSettings(true)
    } else {
      bumpRevision()
    }
  }, [
    authenticated,
    bumpRevision,
    gridSettingsQuery.isFetching,
    queryClient,
    refreshGridColumnSettings,
    scope,
    sessionResolved,
    settingsLoading,
    settingsRevision,
  ])

  useEffect(() => {
    const onVisibility = () => {
      if (document.visibilityState !== "visible") {
        return
      }

      if (!isAuthenticated()) {
        return
      }

      if (!hasCachedGridSettings(queryClient)) {
        if (!hydrateScopeFromLocalStorage(queryClient)) {
          void refreshGridColumnSettings(true)
        } else {
          bumpRevision()
        }
      }
    }

    document.addEventListener("visibilitychange", onVisibility)
    return () => document.removeEventListener("visibilitychange", onVisibility)
  }, [bumpRevision, queryClient, refreshGridColumnSettings])

  const value = useMemo<SysGridColumnSettingContextValue>(() => ({
    settingsLoading: settingsLoading || gridSettingsQuery.isFetching,
    settingsRevision,
    refreshGridColumnSettings,
    patchGridSlice,
    getGridColumnSettings,
    getGridColumnTemplates,
    clearGridColumnSettings,
  }), [
    clearGridColumnSettings,
    getGridColumnSettings,
    getGridColumnTemplates,
    gridSettingsQuery.isFetching,
    patchGridSlice,
    refreshGridColumnSettings,
    settingsLoading,
    settingsRevision,
  ])

  return (
    <SysGridColumnSettingContext.Provider value={value}>
      {children}
    </SysGridColumnSettingContext.Provider>
  )
}

export function useSysGridColumnSettings(): SysGridColumnSettingContextValue {
  const context = useContext(SysGridColumnSettingContext)
  if (!context) {
    throw new Error("useSysGridColumnSettings must be used within SysGridColumnSettingProvider")
  }

  return context
}

export function useCurrentGridSettingIdentity(gridId?: string): string {
  const companyCd = normalizeGridSettingText(getCurrentCompanyCd())
  const userId = normalizeGridSettingText(getCurrentUserId())
  const normalizedGridId = normalizeGridSettingText(gridId)

  if (!companyCd || !userId || !normalizedGridId) {
    return ""
  }

  return [companyCd, userId, normalizedGridId].map(normalizeGridSettingKey).join("::")
}
