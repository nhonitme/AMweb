import notify from "devextreme/ui/notify"

import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import { downloadBlobFile, downloadFile, downloadQueue } from "@/lib/fileUtils"
import { getCurrentCompanyCd } from "@/lib/login"

import {
  injectHtmlPreviewToolbar,
  PREVIEW_EXPORT_DONE_MESSAGE,
  PREVIEW_EXPORT_ERROR_MESSAGE,
} from "./einvoiceHtmlPreviewToolbar"
import type { EInvoice } from "@/types/einvoice"
import {
  EINV_KEY,
  einvCompanyNotSelected,
  einvPdfExportFailed,
  einvPreviewOpenFailed,
  einvPreviewOpenedHint,
  einvT,
  einvXmlExportFailed,
} from "./einvoiceI18n"
import { formatEinvoiceText } from "./einvoiceTranslate"
import { downloadEInvoiceXml } from "./einvoiceXmlViewer"

const BASE_URL = `${API_BASE_URL}/EInvoice`
const PREVIEW_EXPORT_MESSAGE = "amnote-einvoice-export-pdf"

export type EInvoicePrintMode = "normal" | "converted"
export type EInvoiceDownloadFormat = "pdf" | "xml"

export type EInvoicePrintHints = {
  xmlFtpPath?: string
  sellerId?: number
  xslId?: number
  khhdon?: string
  shdon?: string
  mtracuu?: string
  isSigned?: number
}

export type EInvoicePrintRequest = {
  mode: EInvoicePrintMode
  convertedByNm?: string
} & EInvoicePrintHints

export type EInvoicePrintConfirmPayload = {
  format: EInvoiceDownloadFormat
  printRequest: EInvoicePrintRequest
}

export type EInvoiceBatchPrintItem = {
  invoiceId: number
  printRequest?: EInvoicePrintRequest
}

export type OpenEInvoiceReportViewerOptions = {
  invoiceIds: readonly number[]
  companyCd?: string
  printRequest?: EInvoicePrintRequest
  notifyUnableToOpen?: (message: string) => void
  notifyInfo?: (message: string) => void
  notifySuccess?: (message: string) => void
}

type PreviewExportHandlers = {
  onInfo?: (message: string) => void
  onSuccess?: (message: string) => void
  onError?: (message: string) => void
}

declare global {
  interface Window {
    __amnoteEInvoicePreviewExportListener?: boolean
  }
}


function normalizeInvoiceIds(invoiceIds: readonly number[]): number[] {
  return invoiceIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
}

function resolveInvoiceId(invoiceIds: readonly number[]): number | null {
  return normalizeInvoiceIds(invoiceIds)[0] ?? null
}

async function parseApiBlobError(blob: Blob): Promise<string> {
  try {
    const text = await blob.text()
    const payload = JSON.parse(text) as { message?: string; Message?: string }
    return payload.message ?? payload.Message ?? text
  } catch {
    return einvPdfExportFailed()
  }
}

function injectPreviewToolbar(html: string, invoiceId: number, printRequest: EInvoicePrintRequest): string {
  const isConvertedPrint = printRequest.mode === "converted"
  const convertedByNm = printRequest.convertedByNm?.trim() ?? ""

  return injectHtmlPreviewToolbar(html, {
    exportMessageType: PREVIEW_EXPORT_MESSAGE,
    exportPayload: {
      invoiceId,
      convertedPrint: isConvertedPrint,
      convertedByNm,
    },
  })
}

let activePreviewExportHandlers: PreviewExportHandlers = {}
let activePrintRequest: EInvoicePrintRequest = { mode: "normal" }

function extractPrintHints(printRequest?: EInvoicePrintRequest): EInvoicePrintHints {
  if (!printRequest) {
    return {}
  }

  const hints: EInvoicePrintHints = {}
  const xmlFtpPath = printRequest.xmlFtpPath?.trim()
  if (xmlFtpPath) {
    hints.xmlFtpPath = xmlFtpPath
  }

  if (printRequest.sellerId && printRequest.sellerId > 0) {
    hints.sellerId = printRequest.sellerId
  }

  if (printRequest.xslId && printRequest.xslId > 0) {
    hints.xslId = printRequest.xslId
  }

  const khhdon = printRequest.khhdon?.trim()
  if (khhdon) {
    hints.khhdon = khhdon
  }

  const shdon = printRequest.shdon?.trim()
  if (shdon) {
    hints.shdon = shdon
  }

  const mtracuu = printRequest.mtracuu?.trim()
  if (mtracuu) {
    hints.mtracuu = mtracuu
  }

  if (printRequest.isSigned === 0 || printRequest.isSigned === 1) {
    hints.isSigned = printRequest.isSigned
  }

  return hints
}

function normalizePrintRequest(printRequest?: EInvoicePrintRequest): EInvoicePrintRequest {
  if (!printRequest) {
    return activePrintRequest
  }

  const hints = extractPrintHints(printRequest)

  if (printRequest.mode === "converted") {
    return {
      mode: "converted",
      convertedByNm: printRequest.convertedByNm?.trim() || undefined,
      ...hints,
    }
  }

  return {
    mode: "normal",
    ...hints,
  }
}

function buildPrintQueryParams(printRequest?: EInvoicePrintRequest): Record<string, string | boolean | number> {
  const request = normalizePrintRequest(printRequest)
  const params: Record<string, string | boolean | number> = {}

  if (request.mode === "converted") {
    params.convertedPrint = "true"

    const convertedByNm = request.convertedByNm?.trim()
    if (convertedByNm) {
      params.convertedByNm = convertedByNm
    }
  }

  const xmlFtpPath = request.xmlFtpPath?.trim()
  if (xmlFtpPath) {
    params.xmlFtpPath = xmlFtpPath
  }

  if (request.sellerId && request.sellerId > 0) {
    params.sellerId = request.sellerId
  }

  if (request.xslId && request.xslId > 0) {
    params.xslId = request.xslId
  }

  const khhdon = request.khhdon?.trim()
  if (khhdon) {
    params.khhdon = khhdon
  }

  const shdon = request.shdon?.trim()
  if (shdon) {
    params.shdon = shdon
  }

  const mtracuu = request.mtracuu?.trim()
  if (mtracuu) {
    params.mtracuu = mtracuu
  }

  if (request.isSigned === 0 || request.isSigned === 1) {
    params.isSigned = request.isSigned
  }

  return params
}

function ensurePreviewExportListener(): void {
  if (window.__amnoteEInvoicePreviewExportListener) {
    return
  }

  window.__amnoteEInvoicePreviewExportListener = true

  window.addEventListener("message", (event) => {
    if (event.origin !== window.location.origin) {
      return
    }

    const data = event.data as {
      type?: string
      invoiceId?: number
      message?: string
      convertedPrint?: boolean
      convertedByNm?: string
    } | null
    if (!data || data.type !== PREVIEW_EXPORT_MESSAGE) {
      return
    }

    const invoiceId = Number(data.invoiceId)
    if (!Number.isFinite(invoiceId) || invoiceId <= 0) {
      return
    }

    const source = event.source as Window | null
    const handlers = activePreviewExportHandlers
    const printRequest: EInvoicePrintRequest = data.convertedPrint
      ? {
          mode: "converted",
          convertedByNm: String(data.convertedByNm ?? "").trim() || undefined,
        }
      : { mode: "normal" }

    void (async () => {
      handlers.onInfo?.(einvT(EINV_KEY.PDF_GENERATING, "Generating PDF..."))

      try {
        const result = await openEInvoicePdf(invoiceId, printRequest)
        source?.postMessage({ type: PREVIEW_EXPORT_DONE_MESSAGE }, window.location.origin)
        handlers.onSuccess?.(
          result === "tab"
            ? einvT(EINV_KEY.PDF_OPENED_TAB, "PDF opened in a new browser tab")
            : einvT(EINV_KEY.PDF_DOWNLOADED, "PDF downloaded to your Downloads folder"),
        )
      } catch (error) {
        const message = error instanceof Error ? error.message : einvPdfExportFailed()
        source?.postMessage(
          { type: PREVIEW_EXPORT_ERROR_MESSAGE, message },
          window.location.origin,
        )
        handlers.onError?.(message)
      }
    })()
  })
}

export async function openEInvoiceHtmlPreview(
  invoiceId: number,
  handlers: PreviewExportHandlers = {},
  printRequest: EInvoicePrintRequest = { mode: "normal" },
): Promise<boolean> {
  activePreviewExportHandlers = handlers
  activePrintRequest = normalizePrintRequest(printRequest)
  ensurePreviewExportListener()

  const response = await axios.get<string>(`${BASE_URL}/${invoiceId}/print/html`, {
    responseType: "text",
    params: buildPrintQueryParams(activePrintRequest),
  })

  const html = typeof response.data === "string" ? response.data : String(response.data ?? "")
  const htmlWithToolbar = injectPreviewToolbar(html, invoiceId, activePrintRequest)
  const blob = new Blob([htmlWithToolbar], { type: "text/html;charset=utf-8" })
  const objectUrl = URL.createObjectURL(blob)

  // Keep window.opener so preview can request PDF export via postMessage.
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

async function fetchEInvoicePdfBlob(invoiceId: number, printRequest?: EInvoicePrintRequest, signal?: AbortSignal): Promise<Blob> {
  const response = await axios.get(`${BASE_URL}/${invoiceId}/print/pdf`, {
    responseType: "blob",
    signal,
    params: buildPrintQueryParams(printRequest),
    validateStatus: (status) => status >= 200 && status < 300,
  })

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
  const contentType = String(response.headers["content-type"] ?? blob.type).toLowerCase()

  if (contentType.includes("json") || blob.type.toLowerCase().includes("json")) {
    throw new Error(await parseApiBlobError(blob))
  }

  if (blob.size <= 512) {
    throw new Error(einvPdfExportFailed())
  }

  const pdfBlob = blob.type.toLowerCase().includes("pdf")
    ? blob
    : new Blob([blob], { type: "application/pdf" })

  const header = await pdfBlob.slice(0, 4).text()
  if (!header.startsWith("%PDF")) {
    throw new Error(einvPdfExportFailed())
  }

  return pdfBlob
}

export async function downloadEInvoicePdf(
  invoiceId: number,
  printRequest?: EInvoicePrintRequest,
  fileName?: string,
  batchId?: string,
): Promise<boolean> {
  return downloadFile({ fileName: fileName?.trim() || `EInvoice_${invoiceId}.pdf`, batchId,
    load: signal => fetchEInvoicePdfBlob(invoiceId, printRequest, signal) })
}

export async function openEInvoicePdf(
  invoiceId: number,
  printRequest?: EInvoicePrintRequest,
): Promise<"tab" | "download"> {
  const pdfBlob = await fetchEInvoicePdfBlob(invoiceId, printRequest)

  const objectUrl = URL.createObjectURL(pdfBlob)
  const pdfWindow = window.open(objectUrl, "_blank", "noopener,noreferrer")

  if (pdfWindow) {
    window.setTimeout(() => {
      URL.revokeObjectURL(objectUrl)
    }, 120_000)
    return "tab"
  }

  await downloadBlobFile(pdfBlob, `EInvoice_${invoiceId}.pdf`)
  URL.revokeObjectURL(objectUrl)
  return "download"
}

export function buildPrintRequestFromInvoice(
  invoice: Pick<EInvoice, "XML_FTP_PATH" | "SELLER_ID" | "XSL_ID" | "KHHDON" | "SHDON" | "MTRACUU" | "IS_SIGNED">,
  base: EInvoicePrintRequest,
): EInvoicePrintRequest {
  const xmlFtpPath = String(invoice.XML_FTP_PATH ?? "").trim()
  const sellerId = Number(invoice.SELLER_ID ?? 0)
  const xslId = Number(invoice.XSL_ID ?? 0)
  const khhdon = String(invoice.KHHDON ?? "").trim()
  const shdon = String(invoice.SHDON ?? "").trim()
  const mtracuu = String(invoice.MTRACUU ?? "").trim()
  const isSigned = Number(invoice.IS_SIGNED ?? 0) === 1 ? 1 : 0

  return {
    ...base,
    ...(xmlFtpPath ? { xmlFtpPath } : {}),
    ...(sellerId > 0 ? { sellerId } : {}),
    ...(xslId > 0 ? { xslId } : {}),
    ...(khhdon ? { khhdon } : {}),
    ...(shdon ? { shdon } : {}),
    ...(mtracuu ? { mtracuu } : {}),
    isSigned,
  }
}

export type DownloadEInvoicesBatchOptions = {
  invoiceIds?: readonly number[]
  items?: readonly EInvoiceBatchPrintItem[]
  printRequest?: EInvoicePrintRequest
  format?: EInvoiceDownloadFormat
  notifyUnableToOpen?: (message: string) => void
  notifyInfo?: (message: string) => void
  notifySuccess?: (message: string) => void
}

function resolveBatchPrintItems(options: DownloadEInvoicesBatchOptions): EInvoiceBatchPrintItem[] {
  if (options.items && options.items.length > 0) {
    return options.items
      .map((item) => ({
        invoiceId: Number(item.invoiceId),
        printRequest: item.printRequest ? normalizePrintRequest(item.printRequest) : undefined,
      }))
      .filter((item) => Number.isFinite(item.invoiceId) && item.invoiceId > 0)
  }

  const baseRequest = options.printRequest ? normalizePrintRequest(options.printRequest) : { mode: "normal" as const }
  return normalizeInvoiceIds(options.invoiceIds ?? []).map((invoiceId) => ({
    invoiceId,
    printRequest: baseRequest,
  }))

}

export async function downloadEInvoicesBatch({
  invoiceIds,
  items,
  printRequest = { mode: "normal" },
  format = "pdf",
  notifyUnableToOpen,
  notifyInfo,
  notifySuccess,
}: DownloadEInvoicesBatchOptions): Promise<{ successCount: number; failCount: number }> {
  const batchItems = resolveBatchPrintItems({ invoiceIds, items, printRequest })
  if (batchItems.length === 0) {
    return { successCount: 0, failCount: 0 }
  }

  const downloadFormat: EInvoiceDownloadFormat = format === "xml" ? "xml" : "pdf"
  const isXmlDownload = downloadFormat === "xml"

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
    return { successCount: 0, failCount: batchItems.length }
  }

  let successCount = 0
  let failCount = 0

  showInfo(
    formatEinvoiceText(
      isXmlDownload
        ? einvT(EINV_KEY.BATCH_DOWNLOAD_XML_STARTED, "Downloading XML for {0} invoice(s)...")
        : einvT(EINV_KEY.BATCH_DOWNLOAD_STARTED, "Downloading PDF for {0} invoice(s)..."),
      [batchItems.length],
    ),
  )

  const batchId = crypto.randomUUID()
  await Promise.all(batchItems.map(async item => {
    try {
      if (isXmlDownload) {
        if (!await downloadEInvoiceXml(item.invoiceId, undefined, batchId)) return
      } else {
        if (!await downloadEInvoicePdf(item.invoiceId, item.printRequest, undefined, batchId)) return
      }
      successCount += 1
    } catch (error) {
      failCount += 1
      const message = error instanceof Error ? error.message : isXmlDownload ? einvXmlExportFailed() : einvPdfExportFailed()
      notifyError(
        formatEinvoiceText(
          einvT(EINV_KEY.BATCH_DOWNLOAD_ITEM_FAILED, "Invoice #{0}: {1}"),
          [item.invoiceId, message],
        ),
      )
    }
  }))

  failCount += downloadQueue.getSnapshot().filter(job => job.batchId === batchId && job.status === "failed").length
  if (successCount > 0) {
    showSuccess(
      formatEinvoiceText(
        isXmlDownload
          ? einvT(EINV_KEY.BATCH_DOWNLOAD_XML_SUCCESS, "Downloaded XML for {0} invoice(s).")
          : einvT(EINV_KEY.BATCH_DOWNLOAD_SUCCESS, "Downloaded PDF for {0} invoice(s)."),
        [successCount],
      ),
    )
  }

  return { successCount, failCount }
}

export async function openEInvoiceReportViewer({
  invoiceIds,
  printRequest = { mode: "normal" },
  notifyUnableToOpen,
  notifyInfo,
  notifySuccess,
}: OpenEInvoiceReportViewerOptions): Promise<boolean> {
  const invoiceId = resolveInvoiceId(invoiceIds)
  if (!invoiceId) {
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
    const previewOpened = await openEInvoiceHtmlPreview(
      invoiceId,
      {
        onInfo: showInfo,
        onSuccess: showSuccess,
        onError: notifyError,
      },
      printRequest,
    )

    if (!previewOpened) {
      notifyError(einvPreviewOpenFailed())
      return false
    }

    const exportPdfLabel = einvT(EINV_KEY.PRINT_PDF, "Print PDF")
    const successMessage =
      printRequest.mode === "converted"
        ? formatEinvoiceText(
            einvT(
              EINV_KEY.PREVIEW_OPENED_CONVERTED_HINT,
              "Preview opened in converted print mode. Click {0} on preview to export.",
            ),
            [exportPdfLabel],
          )
        : einvPreviewOpenedHint(exportPdfLabel)
    showSuccess(successMessage)
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : einvPreviewOpenFailed()
    notifyError(message)
    return false
  }
}
