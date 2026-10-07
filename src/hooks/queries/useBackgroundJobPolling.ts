import type { QueryClient } from "@tanstack/react-query"

import { waitAsync } from "@/api/apiTypes"
import { DEFAULT_JOB_POLL_INTERVAL_MS, DEFAULT_JOB_POLL_MAX_ATTEMPTS } from "@/api/jobApi"
import { queryKeys } from "@/lib/query/queryKeys"

export type PollBackgroundJobOptions<TProgress> = {
  namespace: string
  jobId: string
  fetchProgress: () => Promise<TProgress>
  isFinished: (progress: TProgress) => boolean
  onProgress?: (progress: TProgress) => void
  intervalMs?: number
  maxAttempts?: number
  timeoutMessage?: string
}

/** Poll job tiến độ qua React Query cache (excel import, revaluation, …). */
export async function pollBackgroundJobProgress<TProgress>(
  queryClient: QueryClient,
  options: PollBackgroundJobOptions<TProgress>,
): Promise<TProgress> {
  const intervalMs = options.intervalMs ?? DEFAULT_JOB_POLL_INTERVAL_MS
  const maxAttempts = options.maxAttempts ?? DEFAULT_JOB_POLL_MAX_ATTEMPTS
  const timeoutMessage = options.timeoutMessage ?? "Job progress polling timed out"

  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    const progress = await queryClient.fetchQuery({
      queryKey: queryKeys.jobs.progress(options.namespace, options.jobId),
      queryFn: options.fetchProgress,
      staleTime: 0,
    })

    options.onProgress?.(progress)

    if (options.isFinished(progress)) {
      return progress
    }

    await waitAsync(intervalMs)
  }

  throw new Error(timeoutMessage)
}
