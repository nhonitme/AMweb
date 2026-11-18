import { fetchDocumentPdf, openDocumentPdf } from "./documentPdfViewer"
import notify from "devextreme/ui/notify"

import API_BASE_URL from "@/config/apiConfig"
import { downloadFile, downloadQueue } from "@/lib/fileUtils"
import { getCurrentCompanyCd } from "@/lib/login"

import {
  EINV_KEY,
  einvCompanyNotSelected,
  einvPdfExportFailed,
  einvPreviewOpenFailed,
  einvT,
  einvXmlExportFailed,
} from "./einvoiceI18n"
import { formatEinvoiceText } from "./einvoiceTranslate"
import { downloadEInvoiceXml } from "./einvoiceXmlViewer"

const BASE_URL = `${API_BASE_URL}/EInvoice`

export type EInvoicePrintMode = "normal" | "converted"
export type EInvoiceDownloadFormat = "pdf" | "xml"

export type EInvoicePrintRequest = {
  mode: EInvoicePrintMode
  convertedByNm?: string
}

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

function normalizeInvoiceIds(invoiceIds: readonly number[]): number[] {
  return invoiceIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)
}

function resolveInvoiceId(invoiceIds: readonly number[]): number | null {
  return normalizeInvoiceIds(invoiceIds)[0] ?? null
}

function normalizePrintRequest(printRequest?: EInvoicePrintRequest): EInvoicePrintRequest {
  if (!printRequest) {
    return { mode: "normal" }
  }


  if (printRequest.mode === "converted") {
    return {
      mode: "converted",
      convertedByNm: printRequest.convertedByNm?.trim() || undefined,
    }
  }

  return {
    mode: "normal",
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

  return params
}

async function fetchEInvoicePdfBlob(invoiceId: number, printRequest?: EInvoicePrintRequest, signal?: AbortSignal): Promise<Blob> {
  return fetchDocumentPdf(`${BASE_URL}/${invoiceId}/print/pdf`, buildPrintQueryParams(printRequest), signal)
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

export async function openEInvoicePdf(invoiceId: number, printRequest?: EInvoicePrintRequest): Promise<"tab"> {
  return openDocumentPdf(() => fetchEInvoicePdfBlob(invoiceId, printRequest))
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
    showInfo(einvT(EINV_KEY.PDF_GENERATING, "Đang tải PDF..."))
    const blob = await fetchEInvoicePdfBlob(invoiceId, printRequest)
    await openDocumentPdf(async () => blob)
    showSuccess(einvT(EINV_KEY.PDF_OPENED_TAB, "Đã mở PDF"))
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : einvPreviewOpenFailed()
    notifyError(message)
    return false
  }
}
