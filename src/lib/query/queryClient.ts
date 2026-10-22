import { isMobileDeviceError } from "@/lib/mobileDevicePolicy"
import { QueryClient, focusManager } from "@tanstack/react-query"

/** QueryClient dùng chung toàn app. */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000,
      gcTime: 5 * 60_000,
      retry: (failureCount, error) => !isMobileDeviceError(error) && failureCount < 1,
      refetchOnWindowFocus: false,
    },
  },
})

/**
 * TanStack Query v5 normally listens for document visibility only.
 * Also track browser window focus/blur so returning from another desktop
 * application (e.g. HeidiSQL) checks stale License data. A focus event does
 * not force a fetch: each query's staleTime/refetchOnWindowFocus still applies.
 */
focusManager.setEventListener((handleFocus) => {
  if (typeof window === "undefined") return () => {}

  const onVisibilityChange = () => handleFocus(document.visibilityState === "visible")
  const onWindowFocus = () => handleFocus(document.visibilityState === "visible")
  const onWindowBlur = () => handleFocus(false)

  document.addEventListener("visibilitychange", onVisibilityChange)
  window.addEventListener("focus", onWindowFocus)
  window.addEventListener("blur", onWindowBlur)

  return () => {
    document.removeEventListener("visibilitychange", onVisibilityChange)
    window.removeEventListener("focus", onWindowFocus)
    window.removeEventListener("blur", onWindowBlur)
  }
})
