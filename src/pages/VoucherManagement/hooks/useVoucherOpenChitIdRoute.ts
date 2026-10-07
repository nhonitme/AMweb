import { useCallback, useEffect, useMemo, useRef } from "react"
import type { Location, NavigateFunction } from "react-router-dom"

import {
  hasVoucherNavigationOpenState,
  hasVoucherOpenChitIdInQuery,
  hasVoucherOpenChitIdRoute,
  resolveVoucherOpenChitId,
} from "../voucherOpenRouteUtils"

type UseVoucherOpenChitIdRouteOptions = {
  location: Location
  navigate: NavigateFunction
  routeScopeKey: string
  loadList: () => Promise<void>
  openVoucher: (chitId: number) => Promise<boolean>
  onPageLoadingChange?: (loading: boolean) => void
}

export type VoucherOpenChitIdRouteController = {
  hasPendingOpenRoute: boolean
  shouldDeferInitialListLoad: () => boolean
  beginDirectOpen: () => void
  markListLoaded: () => void
  completeDirectOpenOnPopupClose: () => Promise<void>
}

export function useVoucherOpenChitIdRoute({
  location,
  navigate,
  routeScopeKey,
  loadList,
  openVoucher,
  onPageLoadingChange,
}: UseVoucherOpenChitIdRouteOptions): VoucherOpenChitIdRouteController {
  const handledOpenRef = useRef("")
  const openRunSeqRef = useRef(0)
  const openInFlightRef = useRef(false)
  const activeIntentKeyRef = useRef("")
  const pendingRouteCleanupRef = useRef(false)
  const openRouteFromNavigationRef = useRef(false)
  const directOpenActiveRef = useRef(false)
  const listLoadCompletedRef = useRef(false)

  const openVoucherRef = useRef(openVoucher)
  openVoucherRef.current = openVoucher
  const onPageLoadingChangeRef = useRef(onPageLoadingChange)
  onPageLoadingChangeRef.current = onPageLoadingChange
  const locationRef = useRef(location)
  locationRef.current = location
  const navigateRef = useRef(navigate)
  navigateRef.current = navigate

  const beginDirectOpen = useCallback(() => {
    directOpenActiveRef.current = true
  }, [])

  const shouldDeferListLoad = useCallback(() => {
    return directOpenActiveRef.current && !listLoadCompletedRef.current
  }, [])

  const markListLoaded = useCallback(() => {
    listLoadCompletedRef.current = true
    directOpenActiveRef.current = false
  }, [])

  const clearOpenRoute = useCallback((clearNavigationState: boolean) => {
    const currentLocation = locationRef.current
    if (clearNavigationState) {
      navigateRef.current(currentLocation.pathname, { replace: true, state: null })
      return
    }

    if (hasVoucherOpenChitIdInQuery(currentLocation)) {
      navigateRef.current(currentLocation.pathname, { replace: true })
    }
  }, [])

  const completeDirectOpenOnPopupClose = useCallback(async () => {
    directOpenActiveRef.current = false
    const shouldClearRoute = pendingRouteCleanupRef.current || hasVoucherOpenChitIdInQuery(locationRef.current)
    pendingRouteCleanupRef.current = false

    if (shouldClearRoute) {
      clearOpenRoute(openRouteFromNavigationRef.current)
    }

    if (listLoadCompletedRef.current) {
      return
    }

    listLoadCompletedRef.current = true
    await loadList()
  }, [clearOpenRoute, loadList])

  const completeDirectOpenRef = useRef(completeDirectOpenOnPopupClose)
  completeDirectOpenRef.current = completeDirectOpenOnPopupClose

  const openChitId = useMemo(() => resolveVoucherOpenChitId(location), [location])
  const hasPendingOpenRoute = useMemo(() => hasVoucherOpenChitIdRoute(location), [location])
  const openRouteFromNavigation = useMemo(() => hasVoucherNavigationOpenState(location), [location])
  openRouteFromNavigationRef.current = openRouteFromNavigation
  const openRouteSearch = location.search

  useEffect(() => {
    if (!hasPendingOpenRoute || openChitId <= 0) {
      return
    }

    const intentKey = `${routeScopeKey}:open:${openChitId}:${openRouteSearch}:${openRouteFromNavigation ? "nav" : "query"}`
    if (handledOpenRef.current === intentKey) {
      // Keep ?openChitId while popup is open so the list stays deferred and we avoid
      // a mid-open navigate() that flashes the page behind the editor.
      return
    }

    handledOpenRef.current = intentKey
    activeIntentKeyRef.current = intentKey
    const runId = openRunSeqRef.current + 1
    openRunSeqRef.current = runId
    openInFlightRef.current = true

    const processOpen = async () => {
      beginDirectOpen()
      onPageLoadingChangeRef.current?.(false)

      const opened = await openVoucherRef.current(openChitId)

      const isStale = runId !== openRunSeqRef.current
      if (isStale) {
        if (opened) {
          pendingRouteCleanupRef.current = true
        }
        if (activeIntentKeyRef.current === intentKey) {
          openInFlightRef.current = false
        }
        return
      }

      openInFlightRef.current = false

      if (!opened) {
        clearOpenRoute(openRouteFromNavigation)
        await completeDirectOpenRef.current()
        return
      }

      // Defer URL cleanup until popup close — clearing here caused list load + flicker.
      pendingRouteCleanupRef.current = true
    }

    void processOpen()
  }, [
    beginDirectOpen,
    clearOpenRoute,
    hasPendingOpenRoute,
    openChitId,
    openRouteFromNavigation,
    openRouteSearch,
    routeScopeKey,
  ])

  const shouldDeferInitialListLoad = useCallback(() => {
    return hasPendingOpenRoute || shouldDeferListLoad()
  }, [hasPendingOpenRoute, shouldDeferListLoad])

  return {
    hasPendingOpenRoute,
    shouldDeferInitialListLoad,
    beginDirectOpen,
    markListLoaded,
    completeDirectOpenOnPopupClose,
  }
}
