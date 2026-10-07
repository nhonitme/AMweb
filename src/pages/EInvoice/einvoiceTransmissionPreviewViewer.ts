import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"
import { shouldPassInvoiceIdForTransmissionPreview } from "./einvoiceTransmissionMessageUtils"

const TRANSMISSION_BASE_URL = `${API_BASE_URL}/EInvoiceTransmission`

export async function openEInvoiceTransmissionHtmlPreview(
  message: EInvoiceTransmissionMessage,
  options?: { invoiceId?: number | null },
): Promise<boolean> {
  const receiveId = Number(message.RECEIVE_ID ?? 0)
  if (!Number.isFinite(receiveId) || receiveId <= 0) {
    throw new Error("RECEIVE_ID is required")
  }

  const messageInvoiceId = Number(message.INVOICE_ID ?? 0)
  const fallbackInvoiceId = Number(options?.invoiceId ?? 0)
  const invoiceId = Number.isFinite(messageInvoiceId) && messageInvoiceId > 0
    ? messageInvoiceId
    : Number.isFinite(fallbackInvoiceId) && fallbackInvoiceId > 0
      ? fallbackInvoiceId
      : 0
  const invoiceIdQuery =
    shouldPassInvoiceIdForTransmissionPreview(message) && invoiceId > 0 ? `?invoiceId=${invoiceId}` : ""

  const response = await axios.get<string>(
    `${TRANSMISSION_BASE_URL}/receive/${receiveId}/preview/html${invoiceIdQuery}`,
    {
      responseType: "text",
    },
  )

  const html = typeof response.data === "string" ? response.data : String(response.data ?? "")
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
