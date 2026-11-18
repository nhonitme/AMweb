import axios from "axios"

import { getApiObjectPayload, type ApiResponseEnvelope } from "./apiTypes"
import API_BASE_URL from "../config/apiConfig"
import { API_REQUEST_TIMEOUT_MS } from "../config/httpConfig"

export interface PublicPitCertificateLookup {
  MTRACUU?: string | null
  TCTU?: string | null
  MSCTU?: string | null
  KHCTU?: string | null
  SCTU?: number | null
  NLAP?: string | null
  TCTTNHAP_TEN?: string | null
  TCTTNHAP_MST?: string | null
  TCTTNHAP_DCHI?: string | null
  NNT_TEN?: string | null
  NNT_MST?: string | null
  NNT_DCHI?: string | null
  KTNHAP?: number | null
  TTHANG?: number | null
  DTHANG?: number | null
  NAM?: number | null
  BHIEM?: number | null
  TTHIEN?: number | null
  TTNCTHUE?: number | null
  TTNTTHUE?: number | null
  STHUE?: number | null
  CAN_DOWNLOAD_PDF?: boolean
  CAN_DOWNLOAD_XML?: boolean
}

export type PublicPitCertificateDownloadFormat = "pdf" | "xml"

export interface PublicPitCertificateLookupParams {
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

export async function lookupPublicPitCertificate(
  params: PublicPitCertificateLookupParams,
): Promise<PublicPitCertificateLookup> {
  const taxCode = normalizeRequiredText(params.taxCode, "taxCode")
  const mtracuu = normalizeRequiredText(params.mtracuu, "MTRACUU").toUpperCase()

  const response = await publicAxios.get<ApiResponseEnvelope<PublicPitCertificateLookup>>(
    "public/pit/certificate/lookup",
    { params: { taxCode, mtracuu } },
  )

  return getApiObjectPayload<PublicPitCertificateLookup>(response.data)
}

export function buildPublicPitCertificateDownloadUrl(
  params: PublicPitCertificateLookupParams & { format: PublicPitCertificateDownloadFormat },
): string {
  const endpoint = `${API_BASE_URL.replace(/\/+$/, "")}/public/pit/certificate/lookup`
  const origin = typeof window === "undefined" ? "http://localhost" : window.location.origin
  const url = new URL(endpoint, origin)

  url.searchParams.set("taxCode", normalizeRequiredText(params.taxCode, "taxCode"))
  url.searchParams.set("mtracuu", normalizeRequiredText(params.mtracuu, "MTRACUU").toUpperCase())
  url.searchParams.set("format", params.format)

  return url.toString()
}
