import { useMutation } from "@tanstack/react-query"

import {
  startPeriodLock,
  startPeriodUnlock,
  type StartPeriodLockRequest,
  type StartPeriodUnlockRequest,
} from "@/api/periodLockApi"
import { usePeriodLockOverviewInvalidate } from "@/hooks/periodLock/usePeriodLockOverview"

export function useStartPeriodLockMutation() {
  const invalidateOverview = usePeriodLockOverviewInvalidate()

  return useMutation({
    mutationFn: async (payload: StartPeriodLockRequest) => {
      const response = await startPeriodLock(payload)
      return response.data
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateOverview(variables.Year)
    },
  })
}

export function useStartPeriodUnlockMutation() {
  const invalidateOverview = usePeriodLockOverviewInvalidate()

  return useMutation({
    mutationFn: async (payload: StartPeriodUnlockRequest) => {
      const response = await startPeriodUnlock(payload)
      return response.data
    },
    onSettled: async (_data, _error, variables) => {
      await invalidateOverview(variables.Year)
    },
  })
}
