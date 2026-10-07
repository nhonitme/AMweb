import { useContext, useState, useSyncExternalStore } from "react"
import { LanguageContext } from "@/lib/i18nLoader"
import { downloadQueue } from "@/lib/fileUtils"

export default function DownloadQueuePanel() {
  const jobs = useSyncExternalStore(downloadQueue.subscribe, downloadQueue.getSnapshot)
  const { translate: t } = useContext(LanguageContext)
  const [expanded, setExpanded] = useState(true)
  if (!jobs.length) return null
  const labels = {
    queued: t("DOWNLOAD_QUEUED", "Chờ tải"), downloading: t("DOWNLOAD_RUNNING", "Đang tải"),
    ready: t("DOWNLOAD_READY", "Chờ lưu"), saving: t("DOWNLOAD_SAVING", "Đang lưu"),
    completed: t("DOWNLOAD_COMPLETED", "Đã lưu"), cancelled: t("DOWNLOAD_CANCELLED", "Đã hủy"), failed: t("DOWNLOAD_FAILED", "Lỗi"),
  }
  const active = jobs.filter(job => ["queued", "downloading", "ready", "saving"].includes(job.status))
  const batches = [...new Set(active.map(job => job.batchId).filter((id): id is string => Boolean(id)))]
  return <section className="fixed bottom-3 right-3 z-[1500] w-96 max-w-[95vw] rounded-lg border bg-white p-3 shadow-xl" aria-label={t("DOWNLOAD_QUEUE", "Tải tệp")}>
    <div className="flex items-center justify-between gap-2">
      <button onClick={() => setExpanded(!expanded)} className="font-semibold">{t("DOWNLOAD_QUEUE", "Tải tệp")} ({active.length}) {expanded ? "▾" : "▸"}</button>
      <button onClick={() => downloadQueue.clearFinished()}>{t("DOWNLOAD_CLEAR_FINISHED", "Dọn mục đã xong")}</button>
    </div>
    {expanded && <>
      <div className="my-2 text-xs text-slate-600">{Object.entries(labels).map(([status, label]) => `${label}: ${jobs.filter(job => job.status === status).length}`).join(" · ")}</div>
      {batches.map(id => <button key={id} className="mr-2 text-sm text-red-600" onClick={() => downloadQueue.cancelBatch(id)}>{t("DOWNLOAD_CANCEL_BATCH", "Hủy đợt tải")}</button>)}
      <ul className="max-h-64 overflow-auto" aria-live="polite">
        {jobs.map(job => <li key={job.id} className="border-t py-2 text-sm">
          <div className="truncate" title={job.fileName}>{job.fileName}</div>
          <div className="flex justify-between gap-2"><span>{labels[job.status]}{job.size !== undefined ? ` · ${(job.size / 1024).toFixed(1)} KB` : ""}</span>
            {["queued", "downloading", "ready"].includes(job.status) && <button className="text-red-600" onClick={() => downloadQueue.cancel(job.id)}>{t("DOWNLOAD_CANCEL", "Hủy")}</button>}
            {job.retryable && ["failed", "cancelled"].includes(job.status) && <button className="text-blue-600" onClick={() => { void downloadQueue.retry(job.id) }}>{t("DOWNLOAD_RETRY", "Thử lại")}</button>}
          </div>
          {job.error && <div className="text-red-600">{job.error}</div>}
          {job.status === "downloading" && job.progress?.total && <progress className="w-full" value={job.progress.loaded} max={job.progress.total} />}
        </li>)}
      </ul>
    </>}
  </section>
}
