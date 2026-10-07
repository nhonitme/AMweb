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

const SELLER_BASE_URL = `${API_BASE_URL}/EInvoiceSetting/sellers`
export const SELLER_PREVIEW_EXPORT_MESSAGE = "amnote-einvoice-seller-export-pdf"

type PreviewExportHandlers = {
  onInfo?: (message: string) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

declare global {
  interface Window {
    __amnoteEInvoiceSellerPreviewExportListener?: boolean
  }
}

let activeSellerPreviewExportHandlers: PreviewExportHandlers = {}
let activeSellerPreviewXslId = 0

async function parseApiBlobError(blob: Blob): Promise<string> {
  try {
    const text = await blob.text()
    const payload = JSON.parse(text) as { message?: string; Message?: string }
    return payload.message ?? payload.Message ?? text
  } catch {
    return einvPdfExportFailed()
  }
}

function ensureSellerPreviewExportListener(): void {
  if (window.__amnoteEInvoiceSellerPreviewExportListener) {
    return
  }

  window.__amnoteEInvoiceSellerPreviewExportListener = true

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return
    }

    const data = event.data as { type?: string; sellerId?: number; xslId?: number; message?: string } | null
    if (!data || data.type !== SELLER_PREVIEW_EXPORT_MESSAGE) {
      return
    }

    const sellerId = Number(data.sellerId)
    if (!Number.isFinite(sellerId) || sellerId <= 0) {
      return
    }

    const source = event.source as Window | null
    const handlers = activeSellerPreviewExportHandlers
    const xslId = Number(data.xslId ?? activeSellerPreviewXslId)

    void (async () => {
      handlers.onInfo?.(einvT(EINV_KEY.PDF_GENERATING, "Generating PDF..."))

      try {
        const result = await openEInvoiceSellerPdf(sellerId, Number.isFinite(xslId) && xslId > 0 ? xslId : undefined)
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

export async function openEInvoiceSellerHtmlPreview(
  sellerId: number,
  xslId?: number,
  handlers: PreviewExportHandlers = {},
): Promise<boolean> {
  activeSellerPreviewExportHandlers = handlers
  activeSellerPreviewXslId = Number.isFinite(Number(xslId)) && Number(xslId) > 0 ? Number(xslId) : 0
  ensureSellerPreviewExportListener()

  const html = await fetchEInvoiceSellerPreviewHtml(sellerId, activeSellerPreviewXslId || undefined)
  const htmlWithToolbar = injectHtmlPreviewToolbar(html, {
    exportMessageType: SELLER_PREVIEW_EXPORT_MESSAGE,
    exportPayload: {
      sellerId,
      ...(activeSellerPreviewXslId > 0 ? { xslId: activeSellerPreviewXslId } : {}),
    },
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

export async function fetchEInvoiceSellerPreviewHtml(sellerId: number, xslId?: number): Promise<string> {
  const normalizedSellerId = Number(sellerId)
  if (!Number.isFinite(normalizedSellerId) || normalizedSellerId <= 0) {
    return ""
  }

  const normalizedXslId = Number(xslId)
  const response = await axios.get<string>(`${SELLER_BASE_URL}/${normalizedSellerId}/preview/html`, {
    responseType: "text",
    params: Number.isFinite(normalizedXslId) && normalizedXslId > 0 ? { xslId: normalizedXslId } : undefined,
  })

  return typeof response.data === "string" ? response.data : String(response.data ?? "")
}

export type EInvoiceDecimalPreviewRequest = {
  xslId?: number
  currencyCode?: string
  decimalSettings?: Array<{
    SETTING_ID?: number
    COMPANY_CD?: string
    XSL_ID?: number
    APPLY_TARGET?: string
    FIELD_SCOPE?: string
    FIELD_NAME?: string
    LABEL_TEXT?: string | null
    CAPTION?: string | null
    CURRENCY_SCOPE?: string
    DECIMAL_SCALE?: number
    ROUND_MODE?: string
    IS_ACTIVE?: number
    SORT_ORDER?: number
    NOTE?: string
  }>
}

export async function fetchEInvoiceDecimalDemoPreviewHtml(
  sellerId: number,
  request: EInvoiceDecimalPreviewRequest,
): Promise<string> {
  const normalizedSellerId = Number(sellerId)
  if (!Number.isFinite(normalizedSellerId) || normalizedSellerId <= 0) {
    return ""
  }

  const response = await axios.post<string>(
    `${SELLER_BASE_URL}/${normalizedSellerId}/decimal-preview/html`,
    {
      XslId: request.xslId && request.xslId > 0 ? request.xslId : undefined,
      CurrencyCode: request.currencyCode || "VND",
      DecimalSettings: request.decimalSettings ?? [],
    },
    { responseType: "text" },
  )

  return typeof response.data === "string" ? response.data : String(response.data ?? "")
}

export async function openEInvoiceSellerPdf(sellerId: number, xslId?: number): Promise<"tab" | "download"> {
  const normalizedXslId = Number(xslId)
  const response = await axios.get(`${SELLER_BASE_URL}/${sellerId}/preview/pdf`, {
    responseType: "blob",
    params: Number.isFinite(normalizedXslId) && normalizedXslId > 0 ? { xslId: normalizedXslId } : undefined,
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

  await downloadBlobFile(pdfBlob, `EInvoiceSeller_${sellerId}.pdf`)
  URL.revokeObjectURL(objectUrl)
  return "download"
}

export type OpenEInvoiceSellerPreviewOptions = {
  sellerId: number
  xslId?: number
  notifyUnableToOpen?: (message: string) => void
  notifyInfo?: (message: string) => void
  notifySuccess?: (message: string) => void
}

export async function openEInvoiceSellerPreview({
  sellerId,
  xslId,
  notifyUnableToOpen,
  notifyInfo,
  notifySuccess,
}: OpenEInvoiceSellerPreviewOptions): Promise<boolean> {
  const normalizedSellerId = Number(sellerId)
  if (!Number.isFinite(normalizedSellerId) || normalizedSellerId <= 0) {
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
    const previewOpened = await openEInvoiceSellerHtmlPreview(normalizedSellerId, xslId, {
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
