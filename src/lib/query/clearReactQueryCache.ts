import { queryClient } from "@/lib/query/queryClient"

/** Xóa toàn bộ cache React Query (logout, đổi công ty, clearFrontendCaches). */
export function clearReactQueryCache(): void {
  queryClient.clear()
}
