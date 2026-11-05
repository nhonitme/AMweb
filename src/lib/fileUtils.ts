import { DownloadQueue, type DownloadRequest } from "./downloadQueue"
import { getCurrentLang, resolveLanguageLabel } from "@/utils/language"
import { readGlobalStorageItem } from "@/lib/globalStorageCache"

function translate(key: string, fallback: string): string {
  const labels = readGlobalStorageItem<Record<string, string>>("language-labels", getCurrentLang())
  return resolveLanguageLabel(labels, key) ?? fallback
}

export const downloadQueue = new DownloadQueue(saveBlobDirect)

export async function downloadFile(request: DownloadRequest): Promise<boolean> {
  const result = await downloadQueue.enqueue(request)
  return result.status === "completed"
}

export function downloadBlobFile(blob: Blob, fileName: string, language?: string): Promise<boolean> {
  return downloadFile({ fileName, language, retryable: false, load: async () => blob })
}

export function downloadUrlFile(url: string, fileName: string): Promise<boolean> {
  return downloadFile({ fileName, load: async signal => {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(translate("DOWNLOAD_HTTP_FAILED", "Tải tệp thất bại: HTTP {0}").replace("{0}", String(response.status)))
    return response.blob()
  } })
}

function saveBlobDirect(blob: Blob, fileName: string): Promise<boolean> {
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = fileName
  try {
    document.body.appendChild(link)
    link.click()
    return Promise.resolve(true)
  } finally {
    link.remove()
    window.setTimeout(() => URL.revokeObjectURL(url), 60_000)
  }
}
