import { useCallback, useEffect, useRef, useState } from "react"

import { getPeriodLockOverview, type PeriodLockOverview } from "@/api/periodLockApi"
import { getCurrentCompanyCd } from "@/lib/login"

export function usePeriodLockOverview(year: number) {
  const [overview, setOverview] = useState<PeriodLockOverview | undefined>(undefined)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<unknown>(null)
  const loadRequestRef = useRef(0)
  const pendingRequestsRef = useRef(new Map<string, ReturnType<typeof getPeriodLockOverview>>())

  const loadOverview = useCallback(async (targetYear?: number) => {
    const yearToLoad = targetYear ?? year
    const companyCd = getCurrentCompanyCd()

    if (!companyCd || !Number.isFinite(yearToLoad)) {
      return
    }

    const requestId = ++loadRequestRef.current
    setIsLoading(true)
    setError(null)

    try {
      // StrictMode replays the mount effect; share requests that are still running.
      const requestKey = JSON.stringify([companyCd, yearToLoad])
      let pendingRequest = pendingRequestsRef.current.get(requestKey)
      if (!pendingRequest) {
        pendingRequest = getPeriodLockOverview({ year: yearToLoad }).finally(() => {
          pendingRequestsRef.current.delete(requestKey)
        })
        pendingRequestsRef.current.set(requestKey, pendingRequest)
      }
      const response = await pendingRequest
      if (requestId !== loadRequestRef.current) return
      setOverview(response.data)
    } catch (err) {
      if (requestId !== loadRequestRef.current) return
      setError(err)
    } finally {
      if (requestId === loadRequestRef.current) {
        setIsLoading(false)
      }
    }
  }, [year])

  useEffect(() => {
    const requestSequence = loadRequestRef
    void loadOverview(year)
    return () => {
      // Ignore responses for a previous year or an unmounted page.
      ++requestSequence.current
    }
  }, [year, loadOverview])

  const refetch = useCallback(() => loadOverview(year), [loadOverview, year])

  return {
    data: overview,
    isLoading,
    isFetching: isLoading,
    isError: error != null,
    error,
    loadOverview,
    refetch,
  }
}
