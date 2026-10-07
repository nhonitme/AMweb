import notify from "devextreme/ui/notify"
import { getApiErrorMessage } from "@/api/apiTypes"
import { downloadBlobFile } from "@/lib/fileUtils"
import {
  injectHtmlPreviewToolbar,
  PREVIEW_EXPORT_DONE_MESSAGE,
  PREVIEW_EXPORT_ERROR_MESSAGE,
} from "@/pages/EInvoice/einvoiceHtmlPreviewToolbar"
import { pitApi } from "./api"
import type { PitKind } from "./types"

const PIT_PRINT_EXPORT_MESSAGE = "amnote-pit-print-export-pdf"
let activePrint: { kind: PitKind; id: number } | null = null
let listenerRegistered = false

function ensureExportListener() {
  if (listenerRegistered) return
  listenerRegistered = true

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) return
    const data = event.data as { type?: string; kind?: PitKind; id?: number } | null
    if (data?.type !== PIT_PRINT_EXPORT_MESSAGE) return

    const kind = data.kind ?? activePrint?.kind
    const id = Number(data.id ?? activePrint?.id)
    if (!kind || !Number.isFinite(id) || id <= 0) return

    const source = event.source as Window | null
    void (async () => {
      try {
        const pdf = await pitApi.printPdf(kind, id)
        const blob = pdf.type.toLowerCase().includes("pdf")
          ? pdf
          : new Blob([pdf], { type: "application/pdf" })
        const objectUrl = URL.createObjectURL(blob)
        const pdfWindow = window.open(objectUrl, "_blank", "noopener,noreferrer")
        if (pdfWindow) {
          window.setTimeout(() => URL.revokeObjectURL(objectUrl), 120_000)
        } else {
          await downloadBlobFile(blob, `PIT_${kind}_${id}.pdf`)
          URL.revokeObjectURL(objectUrl)
        }
        source?.postMessage({ type: PREVIEW_EXPORT_DONE_MESSAGE }, window.location.origin)
      } catch (error) {
        const message = getApiErrorMessage(error, "Không xuất được PDF chứng từ")
        source?.postMessage(
          { type: PREVIEW_EXPORT_ERROR_MESSAGE, message },
          window.location.origin,
        )
        notify(message, "error", 5000)
      }
    })()
  })
}

export async function openPitPrintPreview(kind: PitKind, id: number): Promise<boolean> {
  activePrint = { kind, id }
  ensureExportListener()

  const html = await pitApi.print(kind, id)
  const previewHtml = injectHtmlPreviewToolbar(html, {
    exportMessageType: PIT_PRINT_EXPORT_MESSAGE,
    exportPayload: { kind, id },
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
