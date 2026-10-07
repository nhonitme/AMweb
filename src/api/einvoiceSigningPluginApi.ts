import { downloadUrlFile } from "@/lib/fileUtils"
import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { getApiObjectPayload } from "./apiTypes"

const PLUGIN_BASE_URL = "http://127.0.0.1:18188"
export const SIGNING_PLUGIN_LAUNCH_URL = "amnotesigning://launch"

type PluginFetchInit = RequestInit & {
  targetAddressSpace?: "loopback" | "local" | "private" | "public"
}

function pluginFetch(path: string, init: PluginFetchInit = {}): Promise<Response> {
  return fetch(`${PLUGIN_BASE_URL}${path}`, {
    ...init,
    mode: "cors",
    targetAddressSpace: "loopback",
  })
}

export interface EInvoicePluginSetupInfo {
  version: string
  fileName: string
  fileSize: number
  available: boolean
  downloadPath: string
}

export interface EInvoicePluginHealth {
  status: string
  version: string
  machineName: string
  pluginName: string
}

export interface EInvoicePluginCertificate {
  thumbprint: string
  subject: string
  issuer: string
  serialNumber: string
  notBefore: string
  notAfter: string
  taxCode: string
  organizationName: string
  countryCode: string
  hasPrivateKey: boolean
  isExpired: boolean
  isUsbToken: boolean
  providerName: string
}

export interface EInvoicePluginSignRequest {
  requestId: string
  invoiceId?: number
  companyCd: string
  xml: string
  certificateThumbprint: string
  signType: "SELLER" | "BUYER" | "TAX_AUTHORITY" | "OTHER" | "NNT" | "TKHAI" | "PIT"
}

export interface EInvoicePluginSignResponse {
  success: boolean
  signedXml: string
  certificateSubject: string
  certificateThumbprint: string
  certificateSerialNumber: string
  signedAt: string
  message?: string
}

interface PluginErrorResponse {
  success?: boolean
  errorCode?: string
  message?: string
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function readString(source: Record<string, unknown>, key: string): string {
  const value = source[key]
  return typeof value === "string" ? value : ""
}

function readBoolean(source: Record<string, unknown>, key: string): boolean {
  const value = source[key]
  return typeof value === "boolean" ? value : false
}

function isPluginSignResponse(value: unknown): value is EInvoicePluginSignResponse {
  const item = value as Partial<EInvoicePluginSignResponse>
  return item.success === true && typeof item.signedXml === "string" && item.signedXml.length > 0
}

function readPluginMessage(value: unknown): string {
  if (!isRecord(value)) {
    return "AMNOTE Signing Plugin is not running"
  }

  const item = value as PluginErrorResponse
  const message = typeof item.message === "string" && item.message.trim().length > 0 ? item.message.trim() : "Digital signing plugin failed"
  return typeof item.errorCode === "string" && item.errorCode.trim().length > 0 ? `${item.errorCode}: ${message}` : message
}

function normalizeCertificate(value: unknown): EInvoicePluginCertificate | null {
  if (!isRecord(value)) {
    return null
  }

  const thumbprint = readString(value, "thumbprint")
  if (!thumbprint) {
    return null
  }

  return {
    thumbprint,
    subject: readString(value, "subject"),
    issuer: readString(value, "issuer"),
    serialNumber: readString(value, "serialNumber"),
    notBefore: readString(value, "notBefore"),
    notAfter: readString(value, "notAfter"),
    taxCode: readString(value, "taxCode"),
    organizationName: readString(value, "organizationName"),
    countryCode: readString(value, "countryCode"),
    hasPrivateKey: readBoolean(value, "hasPrivateKey"),
    isExpired: readBoolean(value, "isExpired"),
    isUsbToken: readBoolean(value, "isUsbToken"),
    providerName: readString(value, "providerName"),
  }
}

async function readPluginPayload(response: Response): Promise<unknown> {
  return response.json().catch(() => null)
}

function readNumber(source: Record<string, unknown>, key: string): number {
  const value = source[key]
  return typeof value === "number" && Number.isFinite(value) ? value : 0
}

function normalizeSetupInfo(value: unknown): EInvoicePluginSetupInfo {
  const source = (getApiObjectPayload(value) ?? {}) as Record<string, unknown>
  return {
    version: readString(source, "Version") || readString(source, "version"),
    fileName: readString(source, "FileName") || readString(source, "fileName"),
    fileSize: readNumber(source, "FileSize") || readNumber(source, "fileSize"),
    available: readBoolean(source, "Available") || readBoolean(source, "available"),
    downloadPath: readString(source, "DownloadPath") || readString(source, "downloadPath") || "/api/EInvoiceSigningPlugin/setup",
  }
}

export function formatSigningPluginSetupFileSize(size: number): string {
  if (!Number.isFinite(size) || size <= 0) {
    return "0 B"
  }

  if (size >= 1024 * 1024) {
    return `${(size / (1024 * 1024)).toFixed(1)} MB`
  }

  if (size >= 1024) {
    return `${Math.round(size / 1024)} KB`
  }

  return `${size} B`
}

function normalizeVersionText(value: string): string {
  const trimmed = value.trim()
  const plusIndex = trimmed.indexOf("+")
  return plusIndex >= 0 ? trimmed.slice(0, plusIndex) : trimmed
}

export function isSigningPluginOutdated(runningVersion: string, latestVersion: string): boolean {
  const current = normalizeVersionText(runningVersion)
  const latest = normalizeVersionText(latestVersion)
  if (!current || !latest) {
    return false
  }

  const currentParts = current.split(".").map((part) => Number.parseInt(part, 10) || 0)
  const latestParts = latest.split(".").map((part) => Number.parseInt(part, 10) || 0)
  const length = Math.max(currentParts.length, latestParts.length)

  for (let index = 0; index < length; index += 1) {
    const left = currentParts[index] ?? 0
    const right = latestParts[index] ?? 0
    if (right > left) {
      return true
    }
    if (right < left) {
      return false
    }
  }

  return false
}

export function isSigningPluginNotRunningError(error: unknown): boolean {
  const message = error instanceof Error ? error.message : String(error ?? "")
  const normalized = message.toUpperCase()
  return normalized.includes("PLUGIN_NOT_RUNNING") || normalized.includes("SIGNING PLUGIN IS NOT RUNNING")
}

export async function tryAutoLaunchSigningPlugin(): Promise<boolean> {
  try {
    await getSigningPluginHealth()
    return true
  } catch (error) {
    if (!isSigningPluginNotRunningError(error)) {
      throw error
    }
  }

  launchSigningPlugin()

  try {
    await waitForSigningPluginHealth({ timeoutMs: 15_000, intervalMs: 1_000 })
    return true
  } catch {
    return false
  }
}

export async function getSigningPluginSetupInfo(): Promise<EInvoicePluginSetupInfo> {
  const response = await axios.get(`${API_BASE_URL}/EInvoiceSigningPlugin/setup-info`)
  return normalizeSetupInfo(response.data)
}

/** Absolute URL for the setup installer (AllowAnonymous; no axios blob — avoids Network Error on ~50MB). */
export function resolveSigningPluginSetupDownloadUrl(downloadPath?: string): string {
  const path = (downloadPath || "/api/EInvoiceSigningPlugin/setup").trim()
  if (/^https?:\/\//i.test(path)) {
    return path
  }

  const apiBase = API_BASE_URL.replace(/\/+$/, "")
  const origin = typeof window === "undefined"
    ? apiBase.replace(/\/api$/i, "")
    : new URL(apiBase, window.location.origin).origin

  if (path.toLowerCase().startsWith("/api/")) {
    return `${origin}${path.startsWith("/") ? path : `/${path}`}`
  }

  return `${apiBase}/${path.replace(/^\/+/, "")}`
}

export async function downloadSigningPluginSetup(): Promise<void> {
  const setupInfo = await getSigningPluginSetupInfo()
  if (!setupInfo.available) {
    throw new Error("Signing plugin setup file is not available on the server.")
  }

  const downloadUrl = resolveSigningPluginSetupDownloadUrl(setupInfo.downloadPath)
  const fileName = setupInfo.fileName || "AMNOTE-SigningPlugin-Setup.exe"
  await downloadUrlFile(downloadUrl, fileName)
}

export function launchSigningPlugin(): void {
  const iframe = document.createElement("iframe")
  iframe.style.display = "none"
  iframe.src = SIGNING_PLUGIN_LAUNCH_URL
  document.body.appendChild(iframe)
  window.setTimeout(() => {
    iframe.remove()
  }, 5_000)
}

export async function waitForSigningPluginHealth(options?: {
  timeoutMs?: number
  intervalMs?: number
}): Promise<EInvoicePluginHealth> {
  const timeoutMs = options?.timeoutMs ?? 30_000
  const intervalMs = options?.intervalMs ?? 1_500
  const startedAt = Date.now()

  while (Date.now() - startedAt < timeoutMs) {
    try {
      return await getSigningPluginHealth()
    } catch {
      await new Promise((resolve) => window.setTimeout(resolve, intervalMs))
    }
  }

  throw new Error("PLUGIN_NOT_RUNNING: AMNOTE Signing Plugin is not running")
}

export function resolveCertificateCountryCode(subject: string): string {
  const match = subject.match(/(?:^|[,\n]\s*)C=([^,\n]+)/i)
  return match ? match[1].trim().toUpperCase() : ""
}

export function isVietnamDigitalCertificate(
  certificate: Pick<EInvoicePluginCertificate, "subject" | "countryCode">,
): boolean {
  const countryCode = certificate.countryCode?.trim().toUpperCase() || resolveCertificateCountryCode(certificate.subject)
  return countryCode === "VN"
}

export function filterVietnamDigitalCertificates(certificates: EInvoicePluginCertificate[]): EInvoicePluginCertificate[] {
  return certificates.filter(isVietnamDigitalCertificate)
}

export function formatCertificateIssuerName(issuer: string): string {
  const match = issuer.match(/(?:^|[,\n]\s*)CN=([^,\n]+)/i)
  return match ? match[1].trim() : issuer.trim()
}

export function resolveCertificateOrganizationName(certificate: EInvoicePluginCertificate): string {
  const organizationName = certificate.organizationName.trim()
  if (organizationName.length > 0) {
    return organizationName
  }

  const issuerName = formatCertificateIssuerName(certificate.issuer)
  if (issuerName.length > 0) {
    return issuerName
  }

  return certificate.providerName.trim()
}

export function toCertificateDateText(value: string): string {
  const text = String(value ?? "").trim()
  return text.length >= 10 ? text.slice(0, 10) : text
}

export async function getSigningPluginHealth(): Promise<EInvoicePluginHealth> {
  let response: Response
  try {
    response = await pluginFetch("/health", { method: "GET" })
  } catch {
    throw new Error("PLUGIN_NOT_RUNNING: AMNOTE Signing Plugin is not running")
  }

  const payload = await readPluginPayload(response)
  if (!response.ok || !isRecord(payload)) {
    throw new Error(readPluginMessage(payload))
  }

  return {
    status: readString(payload, "status"),
    version: readString(payload, "version"),
    machineName: readString(payload, "machineName"),
    pluginName: readString(payload, "pluginName"),
  }
}

export async function getSigningPluginCertificates(): Promise<EInvoicePluginCertificate[]> {
  let response: Response
  try {
    response = await pluginFetch("/certificates", { method: "GET" })
  } catch {
    throw new Error("PLUGIN_NOT_RUNNING: AMNOTE Signing Plugin is not running")
  }

  const payload = await readPluginPayload(response)
  if (!response.ok || !isRecord(payload)) {
    throw new Error(readPluginMessage(payload))
  }

  const data = payload.data
  const certificates = Array.isArray(data) ? data.map(normalizeCertificate).filter((item): item is EInvoicePluginCertificate => item !== null) : []
  return filterVietnamDigitalCertificates(certificates)
}

export async function signXmlWithPlugin(request: EInvoicePluginSignRequest): Promise<EInvoicePluginSignResponse> {
  let response: Response
  try {
    response = await pluginFetch("/sign-xml", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(request),
    })
  } catch {
    throw new Error("PLUGIN_NOT_RUNNING: AMNOTE Signing Plugin is not running")
  }

  const payload = await readPluginPayload(response)
  if (!response.ok || !isPluginSignResponse(payload)) {
    throw new Error(readPluginMessage(payload))
  }

  return payload
}
