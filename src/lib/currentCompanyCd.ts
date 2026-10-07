import { useSyncExternalStore } from "react"

import { AUTH_SESSION_CHANGED_EVENT, getCurrentCompanyCd } from "@/lib/login"

const listeners = new Set<() => void>()
let historyPatched = false
let originalPushState: History["pushState"] | null = null
let originalReplaceState: History["replaceState"] | null = null

function emitCompanyCdChange() {
  listeners.forEach((listener) => listener())
}

/**
 * SysCodeProvider mounts above Router, so companyCd from pathname would stay stale
 * after SPA navigations (e.g. /login → /app/0001/...). Patch history + session events
 * so subscribers re-render when the effective company changes.
 */
function ensureCompanyCdSubscription() {
  if (historyPatched || typeof window === "undefined") {
    return
  }

  historyPatched = true
  originalPushState = window.history.pushState.bind(window.history)
  originalReplaceState = window.history.replaceState.bind(window.history)

  window.history.pushState = (...args) => {
    const result = originalPushState!(...args)
    emitCompanyCdChange()
    return result
  }
  window.history.replaceState = (...args) => {
    const result = originalReplaceState!(...args)
    emitCompanyCdChange()
    return result
  }

  window.addEventListener("popstate", emitCompanyCdChange)
  window.addEventListener(AUTH_SESSION_CHANGED_EVENT, emitCompanyCdChange)
}

function subscribeCompanyCd(listener: () => void) {
  ensureCompanyCdSubscription()
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useCurrentCompanyCd(): string {
  return useSyncExternalStore(subscribeCompanyCd, getCurrentCompanyCd, () => "")
}
