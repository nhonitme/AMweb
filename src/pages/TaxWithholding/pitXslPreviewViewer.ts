import notify from "devextreme/ui/notify"
import { getApiErrorMessage } from "@/api/apiTypes"
import { downloadBlobFile } from "@/lib/fileUtils"
import {
  injectHtmlPreviewToolbar,
  PREVIEW_EXPORT_DONE_MESSAGE,
  PREVIEW_EXPORT_ERROR_MESSAGE,
} from "@/pages/EInvoice/einvoiceHtmlPreviewToolbar"
import { pitXslApi } from "./pitXslApi"

const PIT_XSL_EXPORT_MESSAGE = "amnote-pit-xsl-export-pdf"
let activeXslId = 0
let listenerRegistered = false

function ensureExportListener() {
  if (listenerRegistered) return
  listenerRegistered = true

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return
    const data = event.data as { type?: string; xslId?: number } | null
    if (data?.type !== PIT_XSL_EXPORT_MESSAGE) return

    const xslId = Number(data.xslId ?? activeXslId)
    const source = event.source as Window | null
    void (async () => {
      try {
        const pdf = await pitXslApi.previewPdf(xslId)
        const blob = pdf.type.toLowerCase().includes("pdf")
          ? pdf
          : new Blob([pdf], { type: "application/pdf" })
        const objectUrl = URL.createObjectURL(blob)
        const pdfWindow = window.open(objectUrl, "_blank", "noopener,noreferrer")
        if (pdfWindow) {
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
        } else {
          await downloadBlobFile(blob, `PIT_03-TNCN_${xslId}.pdf`)
          URL.revokeObjectURL(objectUrl)
        }
        source?.postMessage({ type: PREVIEW_EXPORT_DONE_MESSAGE }, window.location.origin)
      } catch (error) {
        const message = getApiErrorMessage(error, "Không xuất được PDF mẫu chứng từ TNCN")
        source?.postMessage(
          { type: PREVIEW_EXPORT_ERROR_MESSAGE, message },
          window.location.origin,
        )
        notify(message, "error", 5000)
      }
    })()
  })
}

export async function openPitXslPreview(xslId: number): Promise<boolean> {
  activeXslId = xslId
  ensureExportListener()

  const html = await pitXslApi.previewHtml(xslId)
  const previewHtml = injectHtmlPreviewToolbar(html, {
    exportMessageType: PIT_XSL_EXPORT_MESSAGE,
    exportPayload: { xslId },
  })
  const objectUrl = URL.createObjectURL(
    new Blob([previewHtml], { type: "text/html;charset=utf-8" }),
  )
  const previewWindow = window.open(objectUrl, "_blank")
  if (!previewWindow) {
    URL.revokeObjectURL(objectUrl)
    return false
  }

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 600_000)
  return true
}
