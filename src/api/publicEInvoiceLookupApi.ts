import axios from "axios"

import { getApiObjectPayload, type ApiResponseEnvelope } from "./apiTypes"
import API_BASE_URL from "../config/apiConfig"
import { API_REQUEST_TIMEOUT_MS } from "../config/httpConfig"

export interface PublicEInvoiceLookupDetail {
  STT?: number | null
  TCHAT?: number | null
  MHHDVU?: string | null
  THHDVU?: string | null
  DVTINH?: string | null
  SLUONG?: number | null
  DGIA?: number | null
  STCKHAU?: number | null
  THTIEN?: number | null
  TSUAT?: string | null
}

export interface PublicEInvoiceLookup {
  MTRACUU?: string | null
  THDON?: string | null
  KHMSHDON?: string | null
  KHHDON?: string | null
  SHDON?: string | null
  NLAP?: string | null
  DVTTE?: string | null
  SELLER_NM?: string | null
  SELLER_TAX_CD?: string | null
  NMUA_TEN?: string | null
  NMUA_MST?: string | null
  NMUA_DCHI?: string | null
  TGTCTHUE?: number | null
  TGTTTHUE?: number | null
  TTCKTMAI?: number | null
  TGTTTBSO?: number | null
  TGTTTBCHU?: string | null
  MCCQT?: string | null
  CAN_DOWNLOAD_PDF?: boolean
  CAN_DOWNLOAD_XML?: boolean
  HTML?: string | null
  DETAILS?: PublicEInvoiceLookupDetail[]
}

export type PublicEInvoiceDownloadFormat = "pdf" | "xml"

export interface PublicEInvoiceLookupParams {
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

export async function lookupPublicEInvoice(params: PublicEInvoiceLookupParams): Promise<PublicEInvoiceLookup> {
  const taxCode = normalizeRequiredText(params.taxCode, "taxCode")
  const mtracuu = normalizeRequiredText(params.mtracuu, "MTRACUU").toUpperCase()

  const response = await publicAxios.get<ApiResponseEnvelope<PublicEInvoiceLookup>>("public/einvoice/lookup", {
    params: { taxCode, mtracuu },
  })

  return getApiObjectPayload<PublicEInvoiceLookup>(response.data)
}

export function buildPublicEInvoiceDownloadUrl(
  params: PublicEInvoiceLookupParams & { format: PublicEInvoiceDownloadFormat },
): string {
  const endpoint = `${API_BASE_URL.replace(/\/+$/, "")}/public/einvoice/lookup`
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin
  const url = new URL(endpoint, origin)

  url.searchParams.set("taxCode", normalizeRequiredText(params.taxCode, "taxCode"))
  url.searchParams.set("mtracuu", normalizeRequiredText(params.mtracuu, "MTRACUU").toUpperCase())
  url.searchParams.set("format", params.format)

  return url.toString()
}
