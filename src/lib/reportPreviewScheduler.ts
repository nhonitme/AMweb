const MAX_CONCURRENT_REPORT_PREVIEWS = 3

type QueueEntry<T> = {
  signal?: AbortSignal
  started: boolean
  task: () => Promise<T>
  resolve: (value: T | PromiseLike<T>) => void
  reject: (reason?: unknown) => void
  onAbort: () => void
}

const queue: QueueEntry<unknown>[] = []
let activeCount = 0

function abortError(): DOMException {
  return new DOMException("The report preview request was aborted.", "AbortError")
}

function removeQueuedEntry(entry: QueueEntry<unknown>): boolean {
  const index = queue.indexOf(entry)
  if (index < 0) return false
  queue.splice(index, 1)
  return true
}

function drainQueue(): void {
  while (activeCount < MAX_CONCURRENT_REPORT_PREVIEWS && queue.length > 0) {
    const entry = queue.shift()
    if (!entry) return

    if (entry.signal?.aborted) {
      entry.signal.removeEventListener("abort", entry.onAbort)
      entry.reject(abortError())
      continue
    }

    entry.started = true
    activeCount += 1

    void entry.task()
      .then(entry.resolve, entry.reject)
      .finally(() => {
        entry.signal?.removeEventListener("abort", entry.onAbort)
        activeCount -= 1
        drainQueue()
      })
  }
}

export function scheduleReportPreview<T>(
  task: () => Promise<T>,
  signal?: AbortSignal,
): Promise<T> {
  if (signal?.aborted) {
    return Promise.reject(abortError())
  }

  return new Promise<T>((resolve, reject) => {
    const entry: QueueEntry<T> = {
      signal,
      started: false,
      task,
      resolve,
      reject,
      onAbort: () => {
        if (entry.started) return
        if (removeQueuedEntry(entry as QueueEntry<unknown>)) {
          signal?.removeEventListener("abort", entry.onAbort)
          reject(abortError())
        }
      },
    }

    signal?.addEventListener("abort", entry.onAbort, { once: true })
    queue.push(entry as QueueEntry<unknown>)
    drainQueue()
  })
}

