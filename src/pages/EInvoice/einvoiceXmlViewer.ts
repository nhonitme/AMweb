import notify from "devextreme/ui/notify"

import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import { downloadFile } from "@/lib/fileUtils"
import { getCurrentCompanyCd } from "@/lib/login"

import {
  EINV_KEY,
  einvCompanyNotSelected,
  einvPreviewOpenFailed,
  einvT,
  einvXmlEmpty,
  einvXmlTitle,
} from "./einvoiceI18n"
import { einvoiceTranslate } from "./einvoiceTranslate"

const BASE_URL = `${API_BASE_URL}/EInvoice`

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
}

function buildXmlPreviewHtml(xml: string, title: string): string {
  return `<!DOCTYPE html>
<html lang="vi">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(title)}</title>
  <style>
    body { margin: 0; padding: 16px; background: #f8fafc; color: #0f172a; }
    pre { margin: 0; white-space: pre-wrap; word-break: break-word; font: 13px/1.5 Consolas, "Courier New", monospace; }
  </style>
</head>
<body><pre>${escapeHtml(xml)}</pre></body>
</html>`
}

export function openXmlTextPreviewInNewTab(xml: string, title: string): boolean {
  const normalizedXml = xml.trim()
  if (!normalizedXml) {
    return false
  }

  const pageTitle = title.trim() || einvT(EINV_KEY.XML_PREVIEW_TITLE, "XML Preview")
  const html = buildXmlPreviewHtml(normalizedXml, pageTitle)
  const blob = new Blob([html], { type: "text/html;charset=utf-8" })
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

export type OpenXmlTextPreviewOptions = {
  xml: string
  title?: string
  emptyMessage?: string
  unableToOpenMessage?: string
  notifyUnableToOpen?: (message: string) => void
}

export async function openXmlTextPreviewWithNotify({
  xml,
  title,
  emptyMessage = einvXmlEmpty(),
  unableToOpenMessage = einvPreviewOpenFailed(),
  notifyUnableToOpen,
}: OpenXmlTextPreviewOptions): Promise<boolean> {
  const notifyError = (message: string) => {
    if (notifyUnableToOpen) {
      notifyUnableToOpen(message)
    } else {
      notify(message, "error", 4000)
    }
  }

  try {
    const normalizedXml = xml.trim()
    if (!normalizedXml) {
      notifyError(emptyMessage)
      return false
    }

    const opened = openXmlTextPreviewInNewTab(
      normalizedXml,
      title?.trim() || einvT(EINV_KEY.XML_PREVIEW_TITLE, "XML Preview"),
    )
    if (!opened) {
      notifyError(unableToOpenMessage)
      return false
    }

    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : unableToOpenMessage
    notifyError(message)
    return false
  }
}

export async function fetchEInvoiceXml(invoiceId: number, signal?: AbortSignal): Promise<string> {
  const normalizedInvoiceId = Number(invoiceId)
  if (!Number.isFinite(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
    throw new Error("INVOICE_ID is required")
  }

  if (!getCurrentCompanyCd().trim()) {
    throw new Error(einvCompanyNotSelected())
  }

  const response = await axios.get<string>(`${BASE_URL}/${normalizedInvoiceId}/xml`, {
    responseType: "text",
    signal,
  })

  const xml = typeof response.data === "string" ? response.data : String(response.data ?? "")
  if (!xml.trim()) {
    throw new Error(einvXmlEmpty())
  }

  return xml
}

export async function downloadEInvoiceXml(invoiceId: number, fileName?: string, batchId?: string): Promise<boolean> {
  const normalizedInvoiceId = Number(invoiceId)
  const resolvedFileName = fileName?.trim() || `EInvoice_${normalizedInvoiceId}.xml`
  return downloadFile({ fileName: resolvedFileName, batchId, load: async signal => {
    const xml = await fetchEInvoiceXml(invoiceId, signal)
    return new Blob([xml], { type: "application/xml;charset=utf-8" })
  } })
}

export async function openEInvoiceXmlPreview(invoiceId: number, title?: string): Promise<boolean> {
  const normalizedInvoiceId = Number(invoiceId)
  if (!Number.isFinite(normalizedInvoiceId) || normalizedInvoiceId <= 0) {
    return false
  }

  if (!getCurrentCompanyCd().trim()) {
    notify(einvCompanyNotSelected(), "error", 4000)
    return false
  }

  const xml = await fetchEInvoiceXml(normalizedInvoiceId)
  const pageTitle = title?.trim() || einvXmlTitle(normalizedInvoiceId)
  return openXmlTextPreviewInNewTab(xml, pageTitle)
}

export type OpenEInvoiceXmlPreviewOptions = {
  invoiceId: number
  title?: string
  notifyUnableToOpen?: (message: string) => void
}

export async function openEInvoiceXmlPreviewWithNotify({
  invoiceId,
  title,
  notifyUnableToOpen,
}: OpenEInvoiceXmlPreviewOptions): Promise<boolean> {
  const unableToOpenMessage = einvPreviewOpenFailed()
  const notifyError = (message: string) => {
    if (notifyUnableToOpen) {
      notifyUnableToOpen(message)
    } else {
      notify(message, "error", 4000)
    }
  }

  try {
    const opened = await openEInvoiceXmlPreview(invoiceId, title)
    if (!opened) {
      notifyError(unableToOpenMessage)
      return false
    }

    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : unableToOpenMessage
    notifyError(message)
    return false
  }
}

// Re-export for modules that resolve labels outside React context.
export { einvoiceTranslate } from "./einvoiceTranslate"
