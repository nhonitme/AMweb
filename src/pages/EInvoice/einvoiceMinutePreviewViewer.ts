import { fetchDocumentPdf, openDocumentPdf } from "./documentPdfViewer"
import notify from "devextreme/ui/notify"

import API_BASE_URL from "@/config/apiConfig"
import { getCurrentCompanyCd } from "@/lib/login"

import {
  EINV_KEY,
  einvCompanyNotSelected,
  einvPreviewOpenFailed,
  einvT,
} from "./einvoiceI18n"

const MINUTE_BASE_URL = `${API_BASE_URL}/EInvoiceMinutes`

export async function openEInvoiceMinutePdf(bbanId: number): Promise<"tab"> {
  return openDocumentPdf(() => fetchDocumentPdf(`${MINUTE_BASE_URL}/${bbanId}/preview/pdf`))
}

export type OpenEInvoiceMinutePreviewOptions = {
  bbanId: number
  notifyUnableToOpen?: (message: string) => void
  notifyInfo?: (message: string) => void
  notifySuccess?: (message: string) => void
}

export async function openEInvoiceMinutePreview({
  bbanId,
  notifyUnableToOpen,
  notifyInfo,
  notifySuccess,
}: OpenEInvoiceMinutePreviewOptions): Promise<boolean> {
  const normalizedBbanId = Number(bbanId)
  if (!Number.isFinite(normalizedBbanId) || normalizedBbanId <= 0) {
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
    await openEInvoiceMinutePdf(normalizedBbanId)
    showSuccess(einvT(EINV_KEY.PDF_OPENED_TAB, "Đã mở PDF"))
    return true
  } catch (error) {
    const message = error instanceof Error ? error.message : einvPreviewOpenFailed()
    notifyError(message)
    return false
  }
}
