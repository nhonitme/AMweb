import { waitAsync } from "@/api/apiTypes"
import {
  DEFAULT_JOB_POLL_INTERVAL_MS,
  DEFAULT_JOB_POLL_MAX_ATTEMPTS,
  isPeriodLockJobFinished,
} from "@/api/jobApi"
import { getPeriodLockProgress, type PeriodLockProgress } from "@/api/periodLockApi"

/** Poll job tiến độ khóa/mở sổ (gọi API trực tiếp, không qua React Query). */
export async function pollPeriodLockProgress(
  jobId: string,
  onProgress?: (progress: PeriodLockProgress) => void,
  timeoutMessage = "Job progress polling timed out",
): Promise<PeriodLockProgress> {
  for (let attempt = 0; attempt < DEFAULT_JOB_POLL_MAX_ATTEMPTS; attempt += 1) {
    const progress = (await getPeriodLockProgress(jobId)).data

    onProgress?.(progress)

    if (isPeriodLockJobFinished(progress.Status)) {
      return progress
    }

    await waitAsync(DEFAULT_JOB_POLL_INTERVAL_MS)
  }

  throw new Error(timeoutMessage)
}
