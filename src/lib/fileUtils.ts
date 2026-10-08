import { custom } from "devextreme/ui/dialog"
import { DownloadQueue, type DownloadRequest } from "./downloadQueue"
import { getCurrentLang, resolveLanguageLabel } from "@/utils/language"
import { readGlobalStorageItem } from "@/lib/globalStorageCache"

function translate(key: string, fallback: string): string {
  const labels = readGlobalStorageItem<Record<string, string>>("language-labels", getCurrentLang())
  return resolveLanguageLabel(labels, key) ?? fallback
}

type SavePickerWindow = Window & {
  showSaveFilePicker?: (options: { suggestedName: string }) => Promise<{
    createWritable: () => Promise<{ write: (blob: Blob) => Promise<void>; close: () => Promise<void>; abort: () => Promise<void> }>
  }>
}

export const downloadQueue = new DownloadQueue(saveBlobDirect)

export async function downloadFile(request: DownloadRequest): Promise<boolean> {
  const result = await downloadQueue.enqueue(request)
  return result.status === "completed"
}

export function downloadBlobFile(blob: Blob, fileName: string): Promise<boolean> {
  return downloadFile({ fileName, retryable: false, load: async () => blob })
}

export function downloadUrlFile(url: string, fileName: string): Promise<boolean> {
  return downloadFile({ fileName, load: async signal => {
    const response = await fetch(url, { signal })
    if (!response.ok) throw new Error(translate("DOWNLOAD_HTTP_FAILED", "Tải tệp thất bại: HTTP {0}").replace("{0}", String(response.status)))
    return response.blob()
  } })
}



function saveBlobDirect(blob: Blob, fileName: string): Promise<boolean> {
  const save = async () => {
    try {
      const picker = (window as SavePickerWindow).showSaveFilePicker
      if (!picker) throw new Error(translate("DOWNLOAD_SAVE_AS_UNSUPPORTED", "Trình duyệt không hỗ trợ Save As. Hãy dùng Chrome hoặc Edge qua HTTPS."))
      if (!navigator.userActivation.isActive) {
        const escapedName = fileName.replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[char]!))
        const dialog = custom({
          title: translate("DOWNLOAD_SAVE_AS", "Lưu tệp thành"),
          messageHtml: escapedName,
          buttons: [
            { text: translate("DOWNLOAD_SAVE", "Lưu"), onClick: () => true },
            { text: translate("DOWNLOAD_CANCEL", "Hủy"), onClick: () => false },
          ],
        })
        if (!await dialog.show()) return false
      }
      const handle = await picker.call(window, { suggestedName: fileName })
      const writer = await handle.createWritable()
      try {
        await writer.write(blob)
        await writer.close()
      } catch (error) {
        await writer.abort()
        throw error
      }
      return true
    } catch (error) {
      const isAbort = error instanceof DOMException && error.name === "AbortError"
      if (isAbort) return false
      throw error
    }
  }
  return save()
}

