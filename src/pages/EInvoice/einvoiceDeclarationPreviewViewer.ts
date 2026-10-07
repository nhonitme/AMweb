import notify from "devextreme/ui/notify"

import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import { downloadBlobFile } from "@/lib/fileUtils"
import { getCurrentCompanyCd } from "@/lib/login"

import {
  injectHtmlPreviewToolbar,
  PREVIEW_EXPORT_DONE_MESSAGE,
  PREVIEW_EXPORT_ERROR_MESSAGE,
} from "./einvoiceHtmlPreviewToolbar"
import {
  EINV_KEY,
  einvCompanyNotSelected,
  einvPdfExportFailed,
  einvPreviewOpenFailed,
  einvPreviewOpenedHint,
  einvT,
} from "./einvoiceI18n"

const DECLARATION_BASE_URL = `${API_BASE_URL}/EInvoiceDeclaration`
export const DECLARATION_PREVIEW_EXPORT_MESSAGE = "amnote-einvoice-declaration-export-pdf"

type PreviewExportHandlers = {
  onInfo?: (message: string) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

declare global {
  interface Window {
    __amnoteEInvoiceDeclarationPreviewExportListener?: boolean
  }
}

let activeDeclarationPreviewExportHandlers: PreviewExportHandlers = {}

async function parseApiBlobError(blob: Blob): Promise<string> {
  try {
    const text = await blob.text()
    const payload = JSON.parse(text) as { message?: string; Message?: string }
    return payload.message ?? payload.Message ?? text
  } catch {
    return einvPdfExportFailed()
  }
}

function ensureDeclarationPreviewExportListener(): void {
  if (window.__amnoteEInvoiceDeclarationPreviewExportListener) {
    return
  }

  window.__amnoteEInvoiceDeclarationPreviewExportListener = true

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return
    }

    const data = event.data as { type?: string; tkhaiId?: number; message?: string } | null
    if (!data || data.type !== DECLARATION_PREVIEW_EXPORT_MESSAGE) {
      return
    }

    const tkhaiId = Number(data.tkhaiId)
    if (!Number.isFinite(tkhaiId) || tkhaiId <= 0) {
      return
    }

    const source = event.source as Window | null
    const handlers = activeDeclarationPreviewExportHandlers

    void (async () => {
      handlers.onInfo?.(einvT(EINV_KEY.PDF_GENERATING, "Generating PDF..."))

      try {
        const result = await openEInvoiceDeclarationPdf(tkhaiId)
        source?.postMessage({ type: PREVIEW_EXPORT_DONE_MESSAGE }, window.location.origin)
        handlers.onSuccess?.(
          result === "tab"
            ? einvT(EINV_KEY.PDF_OPENED_TAB, "PDF opened in a new browser tab")
            : einvT(EINV_KEY.PDF_DOWNLOADED, "PDF downloaded to your Downloads folder"),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : einvPdfExportFailed()
        source?.postMessage({ type: PREVIEW_EXPORT_ERROR_MESSAGE, message }, window.location.origin)
        handlers.onError?.(message)
      }
    })()
  })
}

export async function openEInvoiceDeclarationHtmlPreview(
  tkhaiId: number,
  handlers: PreviewExportHandlers = {},
): Promise<boolean> {
  activeDeclarationPreviewExportHandlers = handlers
  ensureDeclarationPreviewExportListener()

  const response = await axios.get<string>(`${DECLARATION_BASE_URL}/${tkhaiId}/preview/html`, {
    responseType: "text",
  })

  const html = typeof response.data === "string" ? response.data : String(response.data ?? "")
  const htmlWithToolbar = injectHtmlPreviewToolbar(html, {
    exportMessageType: DECLARATION_PREVIEW_EXPORT_MESSAGE,
    exportPayload: { tkhaiId },
  })
  const blob = new Blob([htmlWithToolbar], { type: "text/html;charset=utf-8" })
  const objectUrl = URL.createObjectURL(blob)
  const previewWindow = window.open(objectUrl, "_blank")

  if (!previewWindow) {
    URL.revokeObjectURL(objectUrl)
    return false
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(objectUrl)
  }, 600_000)

  return true
}

export async function openEInvoiceDeclarationPdf(tkhaiId: number): Promise<"tab" | "download"> {
  const response = await axios.get(`${DECLARATION_BASE_URL}/${tkhaiId}/preview/pdf`, {
    responseType: "blob",
  })

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
  const contentType = String(response.headers["content-type"] ?? blob.type).toLowerCase()

  if (contentType.includes("json") || blob.type.toLowerCase().includes("json")) {
    throw new Error(await parseApiBlobError(blob))
  }

  const pdfBlob = blob.type.toLowerCase().includes("pdf")
    ? blob
    : new Blob([blob], { type: "application/pdf" })

  const objectUrl = URL.createObjectURL(pdfBlob)
  const pdfWindow = window.open(objectUrl, "_blank", "noopener,noreferrer")

  if (pdfWindow) {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, 120_000)
    return "tab"
  }

  await downloadBlobFile(pdfBlob, `EInvoiceDeclaration_${tkhaiId}.pdf`)
  URL.revokeObjectURL(objectUrl)
  return "download"
}

export type OpenEInvoiceDeclarationPreviewOptions = {
  tkhaiId: number
  notifyUnableToOpen?: (message: string) => void
  notifyInfo?: (message: string) => void
  notifySuccess?: (message: string) => void
}

export async function openEInvoiceDeclarationPreview({
  tkhaiId,
  notifyUnableToOpen,
  notifyInfo,
  notifySuccess,
}: OpenEInvoiceDeclarationPreviewOptions): Promise<boolean> {
  const normalizedTkhaiId = Number(tkhaiId)
  if (!Number.isFinite(normalizedTkhaiId) || normalizedTkhaiId <= 0) {
    return false
  }

  const notifyError = (message: string) => {
    if (notifyUnableToOpen) {
      notifyUnableToOpen(message)
    } else {
      notify(message, "error", 4000)
    }
  }

  const showInfo = (message: string) => {
    if (notifyInfo) {
      notifyInfo(message)
    } else {
      notify(message, "info", 8000)
    }
  }

  const showSuccess = (message: string) => {
    if (notifySuccess) {
      notifySuccess(message)
    } else {
      notify(message, "success", 4000)
    }
  }

  if (!getCurrentCompanyCd().trim()) {
    notifyError(einvCompanyNotSelected())
    return false
  }

  try {
    const previewOpened = await openEInvoiceDeclarationHtmlPreview(normalizedTkhaiId, {
      onInfo: showInfo,
      onSuccess: showSuccess,
      onError: notifyError,
    })

    if (!previewOpened) {
      notifyError(einvPreviewOpenFailed())
      return false
    }

    showSuccess(einvPreviewOpenedHint())
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : einvPreviewOpenFailed()
    notifyError(message)
    return false
  }
}
