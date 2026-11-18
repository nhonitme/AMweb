import API_BASE_URL from "@/config/apiConfig"
import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"
import { fetchDocumentPdf, openDocumentPdf } from "./documentPdfViewer"

export async function openEInvoiceTransmissionPdfPreview(message: EInvoiceTransmissionMessage): Promise<boolean> {
  const id = Number(message.RECEIVE_ID)
  if (!Number.isFinite(id) || id <= 0) throw new Error("RECEIVE_ID is required")
  await openDocumentPdf(() => fetchDocumentPdf(`${API_BASE_URL}/EInvoiceTransmission/receive/${id}/preview/pdf`))
  return true
}
