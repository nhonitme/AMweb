import axios from "axios"

import { getApiObjectPayload, type ApiResponseEnvelope } from "./apiTypes"
import API_BASE_URL from "../config/apiConfig"
import { API_REQUEST_TIMEOUT_MS } from "../config/httpConfig"
import type { EInvoiceMinuteLineApi, EInvoiceMinuteReasonApi, EInvoiceMinuteSignaturePayload } from "@/types/einvoiceMinute"

export interface PublicEInvoiceMinuteLookup {
  BBAN_ID?: number | null
  MTRACUU?: string | null
  TBBAN?: string | null
  SBBAN?: string | null
  NBBAN?: string | null
  TCHDON?: number | null
  NBAN?: string | null
  MSTNBAN?: string | null
  DCNBAN?: string | null
  NMUA?: string | null
  MSTNMUA?: string | null
  DCNMUA?: string | null
  KHMSHDON?: string | null
  KHHDON?: string | null
  SHDON?: string | null
  NLAP?: string | null
  IS_SIGNED?: number | null
  NMUA_IS_SIGNED?: number | null
  NMUA_SIGN_DT?: string | null
  CAN_SIGN?: boolean
  CAN_DOWNLOAD_PDF?: boolean
  CAN_DOWNLOAD_XML?: boolean
  CAN_DOWNLOAD_XSL?: boolean
  CAN_DOWNLOAD_HTML?: boolean
  XML?: string | null
  XSL?: string | null
  HTML?: string | null
  REASONS?: EInvoiceMinuteReasonApi[]
  LINES_BEFORE?: EInvoiceMinuteLineApi[]
  LINES_AFTER?: EInvoiceMinuteLineApi[]
  TOTAL_BEFORE?: EInvoiceMinuteLineApi | null
  TOTAL_AFTER?: EInvoiceMinuteLineApi | null
}

export type PublicEInvoiceMinuteDownloadFormat = "pdf" | "xml" | "xsl" | "html"

export interface PublicEInvoiceMinuteLookupParams {
  taxCode: string
  mtracuu: string
}

const publicAxios = axios.create({
  baseURL: API_BASE_URL,
  timeout: API_REQUEST_TIMEOUT_MS,
  withCredentials: false,
})

function normalizeRequiredText(value: string, fieldName: string): string {
  const text = String(value ?? "").trim()
  if (!text) {
    throw new Error(`${fieldName} is required`)
  }
  return text
}

export async function lookupPublicEInvoiceMinute(
  params: PublicEInvoiceMinuteLookupParams,
): Promise<PublicEInvoiceMinuteLookup> {
  const taxCode = normalizeRequiredText(params.taxCode, "taxCode")
  const mtracuu = normalizeRequiredText(params.mtracuu, "MTRACUU").toUpperCase()

  const response = await publicAxios.get<ApiResponseEnvelope<PublicEInvoiceMinuteLookup>>(
    "public/einvoice/minutes/lookup",
    {
      params: { taxCode, mtracuu },
    },
  )

  return getApiObjectPayload<PublicEInvoiceMinuteLookup>(response.data)
}

export async function savePublicEInvoiceMinuteBuyerSignature(
  params: PublicEInvoiceMinuteLookupParams,
  payload: EInvoiceMinuteSignaturePayload,
): Promise<PublicEInvoiceMinuteLookup> {
  const taxCode = normalizeRequiredText(params.taxCode, "taxCode")
  const mtracuu = normalizeRequiredText(params.mtracuu, "MTRACUU").toUpperCase()

  const response = await publicAxios.post<ApiResponseEnvelope<PublicEInvoiceMinuteLookup>>(
    "public/einvoice/minutes/lookup/signature",
    payload,
    {
      params: { taxCode, mtracuu },
    },
  )

  return getApiObjectPayload<PublicEInvoiceMinuteLookup>(response.data)
}

export function buildPublicEInvoiceMinuteDownloadUrl(
  params: PublicEInvoiceMinuteLookupParams & { format: PublicEInvoiceMinuteDownloadFormat },
): string {
  const endpoint = `${API_BASE_URL.replace(/\/+$/, "")}/public/einvoice/minutes/lookup`
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin
  const url = new URL(endpoint, origin)

  url.searchParams.set("taxCode", normalizeRequiredText(params.taxCode, "taxCode"))
  url.searchParams.set("mtracuu", normalizeRequiredText(params.mtracuu, "MTRACUU").toUpperCase())
  url.searchParams.set("format", params.format)

  return url.toString()
}
