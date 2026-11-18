import axios from "@/api/axiosClient"
import { getCurrentCompanyCd } from "@/lib/login"

const inFlight = new Map<string, Promise<Blob>>()

async function readAxiosErrorMessage(error: unknown, fallback: string): Promise<string> {
  if (!axios.isAxiosError(error)) return fallback
  const data = error.response?.data
  if (data instanceof Blob) {
    try {
      const payload = JSON.parse(await data.text()) as { message?: string; Message?: string }
      return payload.message || payload.Message || error.message || fallback
    } catch {
      return error.message || fallback
    }
  }
  if (data && typeof data === "object") {
    const payload = data as { message?: string; Message?: string }
    return payload.message || payload.Message || error.message || fallback
  }
  return error.message || fallback
}

export function fetchDocumentPdf(url: string, params?: Record<string, string | boolean | number>, signal?: AbortSignal): Promise<Blob> {
  const key = JSON.stringify([getCurrentCompanyCd(), url, params])
  const pending = inFlight.get(key)
  if (pending && !signal) return pending
  const request = axios.get<Blob>(url, { params, signal, responseType: "blob" }).then(async response => {
    const blob = response.data
    if (!(blob instanceof Blob) || (await blob.slice(0, 5).text()) !== "%PDF-") {
      let message = "Không tải được PDF chứng từ."
      if (blob instanceof Blob) {
        try {
          const payload = JSON.parse(await blob.text()) as { message?: string; Message?: string }
          message = payload.message || payload.Message || message
        } catch { /* Keep the document error, never open an HTML response as a PDF. */ }
      }
      throw new Error(message)
    }
    return new Blob([blob], { type: "application/pdf" })
  }).catch(async error => {
    const message = await readAxiosErrorMessage(error, "Không tải được PDF chứng từ.")
    throw new Error(message)
  })
  if (!signal) {
    inFlight.set(key, request)
    void request.finally(() => { if (inFlight.get(key) === request) inFlight.delete(key) }).catch(() => {})
  }
  return request
}

export async function openDocumentPdf(load: () => Promise<Blob>): Promise<"tab"> {
  const viewer = window.open("about:blank", "_blank")
  if (!viewer) throw new Error("Trình duyệt đã chặn cửa sổ xem PDF.")
  viewer.opener = null
  let objectUrl: string | undefined
  try {
    const blob = await load()
    if (viewer.closed) return "tab"
    objectUrl = URL.createObjectURL(blob)
    viewer.location.replace(objectUrl)
    const handle = window.setInterval(() => {
      if (viewer.closed) { URL.revokeObjectURL(objectUrl!); window.clearInterval(handle) }
    }, 2000)
    return "tab"
  } catch (error) {
    viewer.close()
    if (objectUrl) URL.revokeObjectURL(objectUrl)
    throw error
  }
}
