import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import notify from "devextreme/ui/notify"

import { getCurrentCompanyCd } from "@/lib/login"

import {
  einvCompanyNotSelected,
  einvPreviewOpenFailed,
  einvXmlEmpty,
  einvXmlTitle,
} from "./einvoiceI18n"
import { openXmlTextPreviewWithNotify } from "./einvoiceXmlViewer"

async function fetchDocumentXml(controller: string, id: number): Promise<string> {
  const response = await axios.get<string>(`${API_BASE_URL}/${controller}/${id}/xml`, { responseType: "text" })
  if (!response.data?.trim()) throw new Error(einvXmlEmpty())
  return response.data
}
const fetchDeclarationXml = (id: number) => fetchDocumentXml("EInvoiceDeclaration", id)
const fetchErrorNoticeXml = (id: number) => fetchDocumentXml("EInvoiceErrorNotice", id)
const fetchMinuteXml = (id: number) => fetchDocumentXml("EInvoiceMinutes", id)

export type OpenEInvoiceDocumentXmlPreviewOptions = {
  title?: string
  notifyUnableToOpen?: (message: string) => void
}

export async function openEInvoiceDeclarationXmlPreviewWithNotify(
  tkhaiId: number,
  options: OpenEInvoiceDocumentXmlPreviewOptions = {},
): Promise<boolean> {
  if (!getCurrentCompanyCd().trim()) {
    notify(einvCompanyNotSelected(), "error", 4000)
    return false
  }

  const xml = await fetchDeclarationXml(tkhaiId)
  return openXmlTextPreviewWithNotify({
    xml,
    title: options.title?.trim() || einvXmlTitle(tkhaiId),
    emptyMessage: einvXmlEmpty(),
    unableToOpenMessage: einvPreviewOpenFailed(),
    notifyUnableToOpen: options.notifyUnableToOpen,
  })
}

export async function openEInvoiceErrorNoticeXmlPreviewWithNotify(
  tbaoId: number,
  options: OpenEInvoiceDocumentXmlPreviewOptions = {},
): Promise<boolean> {
  if (!getCurrentCompanyCd().trim()) {
    notify(einvCompanyNotSelected(), "error", 4000)
    return false
  }

  const xml = await fetchErrorNoticeXml(tbaoId)
  return openXmlTextPreviewWithNotify({
    xml,
    title: options.title?.trim() || einvXmlTitle(tbaoId),
    emptyMessage: einvXmlEmpty(),
    unableToOpenMessage: einvPreviewOpenFailed(),
    notifyUnableToOpen: options.notifyUnableToOpen,
  })
}

export async function openEInvoiceMinuteXmlPreviewWithNotify(
  bbanId: number,
  options: OpenEInvoiceDocumentXmlPreviewOptions = {},
): Promise<boolean> {
  if (!getCurrentCompanyCd().trim()) {
    notify(einvCompanyNotSelected(), "error", 4000)
    return false
  }

  const xml = await fetchMinuteXml(bbanId)
  return openXmlTextPreviewWithNotify({
    xml,
    title: options.title?.trim() || einvXmlTitle(bbanId),
    emptyMessage: einvXmlEmpty(),
    unableToOpenMessage: einvPreviewOpenFailed(),
    notifyUnableToOpen: options.notifyUnableToOpen,
  })
}
