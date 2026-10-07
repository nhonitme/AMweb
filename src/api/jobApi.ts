import {
  isBackgroundJobFinished,
  normalizeBackgroundJobStatus,
  waitAsync,
  type BackgroundJobStatus,
} from "./apiTypes"

export { isBackgroundJobFinished, normalizeBackgroundJobStatus, waitAsync }
export type { BackgroundJobStatus }

export type PeriodLockJobStatus = "RUNNING" | "DONE" | "ERROR"

export function isPeriodLockJobFinished(status: PeriodLockJobStatus): boolean {
  return status === "DONE" || status === "ERROR"
}

export type PollBackgroundJobOptions<TProgress> = {
  fetchProgress: () => Promise<TProgress>
  isFinished: (progress: TProgress) => boolean
  onProgress?: (progress: TProgress) => void
  intervalMs?: number
  maxAttempts?: number
  timeoutMessage?: string
}

export async function pollBackgroundJob<TProgress>(
  options: PollBackgroundJobOptions<TProgress>,
): Promise<TProgress> {
  const intervalMs = options.intervalMs ?? 500
  const maxAttempts = options.maxAttempts ?? 3600
  const timeoutMessage = options.timeoutMessage ?? "Job progress polling timed out"

  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const progress = await options.fetchProgress()
    options.onProgress?.(progress)

    if (options.isFinished(progress)) {
      return progress
    }

    await waitAsync(intervalMs)
  }

  throw new Error(timeoutMessage)
}

export const DEFAULT_JOB_POLL_INTERVAL_MS = 500
export const DEFAULT_JOB_POLL_MAX_ATTEMPTS = 3600
