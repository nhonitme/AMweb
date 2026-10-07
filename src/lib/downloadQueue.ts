export type DownloadStatus = "queued" | "downloading" | "ready" | "saving" | "completed" | "cancelled" | "failed"
export type DownloadResult = { id: string; status: "completed" | "cancelled" | "failed"; error?: string }
export type DownloadProgress = { loaded: number; total?: number }
export type DownloadJobView = { id: string; fileName: string; batchId?: string; status: DownloadStatus; error?: string; size?: number; retryable?: boolean; progress?: DownloadProgress }
export type DownloadRequest = { fileName: string; batchId?: string; retryable?: boolean; load: (signal: AbortSignal, progress: (value: DownloadProgress) => void) => Promise<Blob> }
type Job = DownloadJobView & { request: DownloadRequest; controller: AbortController; blob?: Blob; readyOrder?: number; resolve: (result: DownloadResult) => void }
export const DOWNLOAD_LIMITS = { concurrent: 5, readyFiles: 5, readyBytes: 128 * 1024 * 1024 } as const

export class DownloadQueue {
  private jobs: Job[] = []
  private listeners = new Set<() => void>()
  private snapshot: DownloadJobView[] = []
  private active = 0
  private saving = false
  private readySequence = 0
  constructor(private save: (blob: Blob, name: string) => Promise<boolean>) {}
  subscribe = (listener: () => void) => { this.listeners.add(listener); return () => { this.listeners.delete(listener) } }
  getSnapshot = () => this.snapshot
  private publish() {
    this.snapshot = this.jobs.map(({ id, fileName, batchId, status, error, size, retryable, progress }) => ({ id, fileName, batchId, status, error, size, retryable, progress }))
    this.listeners.forEach(listener => listener())
  }
  enqueue(request: DownloadRequest): Promise<DownloadResult> {
    return new Promise(resolve => {
      this.jobs.push({ id: crypto.randomUUID(), fileName: request.fileName, batchId: request.batchId, retryable: request.retryable !== false, status: "queued", request, controller: new AbortController(), resolve })
      this.publish()
      this.pump()
    })
  }
  cancel(id: string) {
    const job = this.jobs.find(item => item.id === id)
    if (!job || job.status === "saving" || ["completed", "cancelled", "failed"].includes(job.status)) return
    job.controller.abort()
    this.finish(job, "cancelled")
    this.pump()
  }
  cancelBatch(batchId: string) { this.jobs.filter(job => job.batchId === batchId).forEach(job => this.cancel(job.id)) }
  retry(id: string) {
    const job = this.jobs.find(item => item.id === id)
    if (!job || !job.retryable || !["failed", "cancelled"].includes(job.status)) return
    return this.enqueue(job.request)
  }
  clearFinished() { this.jobs = this.jobs.filter(job => !["completed", "cancelled", "failed"].includes(job.status)); this.publish() }
  private finish(job: Job, status: DownloadResult["status"], error?: string) {
    job.status = status
    job.error = error
    job.blob = undefined
    if (status === "completed" || !job.retryable) {
      job.request = { fileName: job.fileName, load: async () => { throw new Error("Download source released") } }
    }
    job.resolve({ id: job.id, status, error })
    this.publish()
  }
  private pump() {
    while (this.active < DOWNLOAD_LIMITS.concurrent) {
      const buffered = this.jobs.filter(job => job.blob)
      if (buffered.length >= DOWNLOAD_LIMITS.readyFiles || buffered.reduce((sum, job) => sum + (job.blob?.size ?? 0), 0) >= DOWNLOAD_LIMITS.readyBytes) break
      const job = this.jobs.find(item => item.status === "queued")
      if (!job) break
      this.active++
      job.status = "downloading"
      this.publish()
      void Promise.resolve().then(() => job.request.load(job.controller.signal, progress => {
        if (job.status === "downloading") { job.progress = progress; this.publish() }
      })).then(blob => {
        if (job.controller.signal.aborted) return
        job.blob = blob
        job.size = blob.size
        job.readyOrder = ++this.readySequence
        job.status = "ready"
        this.publish()
        void this.saveNext()
      }).catch(error => {
        if (!job.controller.signal.aborted) this.finish(job, "failed", error instanceof Error ? error.message : String(error))
      }).finally(() => { this.active--; this.pump() })
    }
  }
  private async saveNext() {
    if (this.saving) return
    const job = this.jobs.filter(item => item.status === "ready").sort((a, b) => a.readyOrder! - b.readyOrder!)[0]
    if (!job?.blob) return
    this.saving = true
    job.status = "saving"
    this.publish()
    try { this.finish(job, await this.save(job.blob, job.fileName) ? "completed" : "cancelled") }
    catch (error) { this.finish(job, "failed", error instanceof Error ? error.message : String(error)) }
    finally { this.saving = false; this.pump(); void this.saveNext() }
  }
}
