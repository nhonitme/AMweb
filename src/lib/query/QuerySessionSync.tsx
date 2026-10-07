import { useQueryClient } from "@tanstack/react-query"
import { useEffect } from "react"

import { AUTH_SESSION_CHANGED_EVENT, type AuthSession } from "@/lib/login"

/**
 * Đồng bộ React Query với phiên đăng nhập.
 * Logout / đổi session → xóa cache (Ctrl+F5 vẫn fetch lại vì RAM trống).
 */
export function QuerySessionSync() {
  const queryClient = useQueryClient()

  useEffect(() => {
    const handleSessionChanged = (event: Event) => {
      const session = (event as CustomEvent<AuthSession | null>).detail
      if (!session?.isAuthenticated) {
        queryClient.clear()
      }
    }

    window.addEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged)
    return () => {
      window.removeEventListener(AUTH_SESSION_CHANGED_EVENT, handleSessionChanged)
    }
  }, [queryClient])

  return null
}
