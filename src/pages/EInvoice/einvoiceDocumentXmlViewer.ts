import notify from "devextreme/ui/notify"

import { getEInvoiceDeclaration, getEInvoiceDeclarationSigningPayload } from "@/api/einvoiceDeclarationApi"
import { getEInvoiceErrorNotice, getEInvoiceErrorNoticeSigningPayload } from "@/api/einvoiceErrorNoticeApi"
import { getEInvoiceMinute, getEInvoiceMinuteSigningPayload } from "@/api/einvoiceMinuteApi"
import { getCurrentCompanyCd } from "@/lib/login"

import {
  einvCompanyNotSelected,
  einvPreviewOpenFailed,
  einvXmlEmpty,
  einvXmlTitle,
} from "./einvoiceI18n"
import { isMinuteSigned } from "./einvoiceMinuteModel"
import { openXmlTextPreviewWithNotify } from "./einvoiceXmlViewer"

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

async function fetchDeclarationXml(tkhaiId: number): Promise<string> {
  const detailResponse = await getEInvoiceDeclaration(tkhaiId)
  const storedXml = trimText(detailResponse.data.XML)
  if (storedXml) {
    return storedXml
  }

  const payloadResponse = await getEInvoiceDeclarationSigningPayload(tkhaiId)
  const rawXml = trimText(payloadResponse.data.RAW_XML)
  if (!rawXml) {
    throw new Error(einvXmlEmpty())
  }

  return rawXml
}

async function fetchErrorNoticeXml(tbaoId: number): Promise<string> {
  const detailResponse = await getEInvoiceErrorNotice(tbaoId)
  const storedXml = trimText(detailResponse.data.XML)
  if (storedXml) {
    return storedXml
  }

  const payloadResponse = await getEInvoiceErrorNoticeSigningPayload(tbaoId)
  const rawXml = trimText(payloadResponse.data.RAW_XML)
  if (!rawXml) {
    throw new Error(einvXmlEmpty())
  }

  return rawXml
}

async function fetchMinuteXml(bbanId: number): Promise<string> {
  const detailResponse = await getEInvoiceMinute(bbanId)
  const detail = detailResponse.data

  if (isMinuteSigned(detail)) {
    const signedXml = trimText(detail.SIGNED_XML) || trimText(detail.NDBBAN_XML)
    if (!signedXml) {
      throw new Error(einvXmlEmpty())
    }

    return signedXml
  }

  const payloadResponse = await getEInvoiceMinuteSigningPayload(bbanId)
  const rawXml = trimText(payloadResponse.data.RAW_XML)
  if (!rawXml) {
    throw new Error(einvXmlEmpty())
  }

  return rawXml
}

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
