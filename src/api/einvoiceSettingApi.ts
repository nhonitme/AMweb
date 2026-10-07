import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { deleteMasterRecords } from "@/lib/masterDelete"
import type {
  EInvoiceAdminSetting,
  EInvoiceAdminSettingSearchParams,
  EInvoiceDecimalSetting,
  EInvoiceDecimalSettingSearchParams,
  EInvoiceMailSetting,
  EInvoiceMailSettingSaveRequest,
  EInvoiceSellerSetting,
  EInvoiceTemplateDesignerDraft,
  EInvoiceUserSetting,
  EInvoiceUserSettingSearchParams,
} from "@/types/einvoiceSetting"

const BASE_URL = `${API_BASE_URL}/EInvoiceSetting`

type ApiEnvelope<T> = {
  Data?: T
  data?: T
  Message?: string
  message?: string
  Success?: boolean
  success?: boolean
}

export type EInvoiceTemplateDesignerDesign = {
  DESIGN_ID: number
  XSL_ID: number
  CONTENT_ID: number
  DESIGN_NM: string
  IS_EDITABLE: boolean
  TEMPLATE_IS_ACTIVE?: number
  XSL_CONTENT?: string | null
  LOGO_PATH?: string | null
  INVOICE_BACKGROUND_PATH?: string | null
  INVOICE_BORDER_PATH?: string | null
  BACKGROUND_PATH?: string | null
  CREATE_AT?: string
  UPDATE_AT?: string
}

export async function getEInvoiceTemplateDesignerDesigns(xslId: number): Promise<{ data: EInvoiceTemplateDesignerDesign[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceTemplateDesignerDesign[]> | EInvoiceTemplateDesignerDesign[]>(`${BASE_URL}/templates/${xslId}/designer/designs`)
  const normalized = normalizeResponse<EInvoiceTemplateDesignerDesign[]>(response)
  return { data: Array.isArray(normalized.data) ? normalized.data : [] }
}

export async function cloneEInvoiceTemplateDesigner(xslId: number, designId: number): Promise<{ data: EInvoiceTemplateDesignerDesign; message?: string }> {
  const response = await axios.post<ApiEnvelope<EInvoiceTemplateDesignerDesign> | EInvoiceTemplateDesignerDesign>(`${BASE_URL}/templates/${xslId}/designer/designs/${designId}/clone`)
  return normalizeResponse<EInvoiceTemplateDesignerDesign>(response)
}

export async function saveEInvoiceTemplateDesignerDraft(
  xslId: number,
  designId: number,
  xslContent: string,
  images?: {
    LOGO_PATH?: string | null
    BACKGROUND_PATH?: string | null
    INVOICE_BACKGROUND_PATH?: string | null
    INVOICE_BORDER_PATH?: string | null
  },
): Promise<{ data: EInvoiceTemplateDesignerDraft; message?: string }> {
  const response = await axios.put<ApiEnvelope<EInvoiceTemplateDesignerDraft> | EInvoiceTemplateDesignerDraft>(`${BASE_URL}/templates/${xslId}/designer/draft`, {
    DESIGN_ID: designId,
    XSL_CONTENT: xslContent,
    LOGO_PATH: images?.LOGO_PATH || null,
    BACKGROUND_PATH: images?.BACKGROUND_PATH || null,
    INVOICE_BACKGROUND_PATH: images?.INVOICE_BACKGROUND_PATH || null,
    INVOICE_BORDER_PATH: images?.INVOICE_BORDER_PATH || null,
  })
  return normalizeResponse<EInvoiceTemplateDesignerDraft>(response)
}

export async function publishEInvoiceTemplateDesigner(xslId: number, designId: number): Promise<void> {
  await axios.post(`${BASE_URL}/templates/${xslId}/designer/designs/${designId}/publish`)
}

export async function previewEInvoiceTemplateDesignerLiveHtml(params: {
  sellerId: number
  xslId: number
  designId?: number
  xslContent: string
  columnParams?: Record<string, string>
}): Promise<string> {
  const response = await axios.post<string>(
    `${BASE_URL}/sellers/${params.sellerId}/designer-preview/html`,
    {
      XslContent: params.xslContent,
      XslId: params.xslId,
      DesignId: params.designId || undefined,
      ColumnParams: params.columnParams || undefined,
    },
    {
      responseType: "text",
      // Keep raw body; default axios JSON transform can break HTML previews.
      transformResponse: [(data) => data],
      validateStatus: (status) => status >= 200 && status < 300,
    },
  )
  const raw = typeof response.data === "string" ? response.data : String(response.data ?? "")
  const trimmed = raw.trim()
  if (trimmed.startsWith("{")) {
    try {
      const parsed = JSON.parse(trimmed) as { Message?: string; message?: string; Success?: boolean; Status?: number }
      if (parsed.Success === false || (typeof parsed.Status === "number" && parsed.Status >= 400)) {
        throw new Error(parsed.Message || parsed.message || "Preview failed")
      }
    } catch (error) {
      if (error instanceof SyntaxError) {
        // Not JSON — treat as HTML/text.
      } else {
        throw error
      }
    }
  }
  return raw
}

export async function exportEInvoiceTemplateDesignerPdf(params: {
  sellerId: number
  xslId: number
  designId?: number
  xslContent?: string
  columnParams?: Record<string, string>
}): Promise<Blob> {
  const hasLiveXsl = Boolean(params.xslContent?.trim())
  const response = hasLiveXsl
    ? await axios.post(
        `${BASE_URL}/sellers/${params.sellerId}/designer-preview/pdf`,
        {
          XslContent: params.xslContent,
          XslId: params.xslId,
          DesignId: params.designId || undefined,
          ColumnParams: params.columnParams || undefined,
        },
        { responseType: "blob", validateStatus: (status) => status >= 200 && status < 300 },
      )
    : await axios.get(`${BASE_URL}/sellers/${params.sellerId}/designer-preview/pdf`, {
        responseType: "blob",
        params: {
          xslId: params.xslId > 0 ? params.xslId : undefined,
          designId: params.designId && params.designId > 0 ? params.designId : undefined,
        },
        validateStatus: (status) => status >= 200 && status < 300,
      })

  const blob = response.data instanceof Blob ? response.data : new Blob([response.data])
  const contentType = String(response.headers["content-type"] ?? blob.type).toLowerCase()
  if (contentType.includes("json") || blob.type.toLowerCase().includes("json")) {
    try {
      const text = await blob.text()
      const parsed = JSON.parse(text) as { Message?: string; message?: string }
      throw new Error(parsed.Message || parsed.message || "Không xuất được PDF")
    } catch (error) {
      if (error instanceof Error && !(error instanceof SyntaxError)) throw error
      throw new Error("Không xuất được PDF")
    }
  }

  return blob.type.toLowerCase().includes("pdf") ? blob : new Blob([blob], { type: "application/pdf" })
}

export type EInvoiceDesignerImageKind = "logo" | "background" | "invoice-background" | "border"

export type EInvoiceFtpImageFile = {
  FILE_NAME: string
  PATH: string
  SIZE?: number
  UPDATE_AT?: string
  SOURCE?: "library" | "company" | string
}

export type EInvoiceFtpXslFile = {
  FILE_NAME: string
  PATH: string
}

export type EInvoiceSellerInfoSaveRequest = {
  SELLER_NM: string
  SELLER_ADDRESS: string
  MDDKDOANH?: string | null
  TDDKDOANH?: string | null
  DCDDKDOANH?: string | null
  MCHANG?: string | null
  TCHANG?: string | null
  SDTHOAI?: string | null
  DCTDTU?: string | null
  STKNHANG?: string | null
  TNHANG?: string | null
  FAX?: string | null
  WEBSITE?: string | null
}

export async function saveEInvoiceSellerInfo(
  sellerId: number,
  payload: EInvoiceSellerInfoSaveRequest,
): Promise<{ data: EInvoiceSellerSetting; message?: string }> {
  const response = await axios.put<ApiEnvelope<EInvoiceSellerSetting> | EInvoiceSellerSetting>(
    `${BASE_URL}/sellers/${sellerId}`,
    payload,
  )
  return normalizeResponse<EInvoiceSellerSetting>(response)
}

export type EInvoiceSellerXslTemplateMetaSaveRequest = {
  XSL_ID?: number
  TEMPLATE_NM?: string | null
  THDON?: string | null
  KHMSHDON?: string | null
  KHHDON?: string | null
  FROM_SHDON?: string | null
  TO_SHDON?: string | null
  USE_MULTI_TAX_RATE?: number
  XSL_FILE_NAME?: string | null
  XSL_CONTENT?: string | null
}

export type EInvoiceSellerXslTemplateMetaResult = {
  XSL_ID: number
  COMPANY_CD: string
  TEMPLATE_CD: string
  TEMPLATE_NM?: string | null
  THDON?: string | null
  KHMSHDON?: string | null
  KHHDON?: string | null
  FROM_SHDON?: string | null
  TO_SHDON?: string | null
  USE_MULTI_TAX_RATE: number
  VERSION_NO: number
  IS_DEFAULT: number
  IS_ACTIVE: number
}

export async function listEInvoiceDesignerImages(imageKind: EInvoiceDesignerImageKind): Promise<{ data: EInvoiceFtpImageFile[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceFtpImageFile[]> | EInvoiceFtpImageFile[]>(`${BASE_URL}/designer/images/${imageKind}`)
  const normalized = normalizeResponse<EInvoiceFtpImageFile[]>(response)
  return { data: Array.isArray(normalized.data) ? normalized.data : [] }
}

export async function listEInvoiceDesignerXslSamples(): Promise<{ data: EInvoiceFtpXslFile[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceFtpXslFile[]> | EInvoiceFtpXslFile[]>(`${BASE_URL}/designer/xsl-samples`)
  const normalized = normalizeResponse<EInvoiceFtpXslFile[]>(response)
  return { data: Array.isArray(normalized.data) ? normalized.data : [] }
}

export async function fetchEInvoiceDesignerXslSample(fileName: string): Promise<{ FILE_NAME: string; PATH: string; XSL_CONTENT: string }> {
  const response = await axios.get<
    ApiEnvelope<{ FILE_NAME: string; PATH: string; XSL_CONTENT: string }> | { FILE_NAME: string; PATH: string; XSL_CONTENT: string }
  >(`${BASE_URL}/designer/xsl-samples/file`, { params: { fileName } })
  return normalizeResponse<{ FILE_NAME: string; PATH: string; XSL_CONTENT: string }>(response).data
}

export async function saveEInvoiceSellerXslTemplateMeta(
  payload: EInvoiceSellerXslTemplateMetaSaveRequest,
): Promise<{ data: EInvoiceSellerXslTemplateMetaResult; message?: string }> {
  const xslId = Number(payload.XSL_ID ?? 0)
  const body = {
    ...payload,
    XSL_ID: xslId > 0 ? xslId : 0,
    USE_MULTI_TAX_RATE: Number(payload.USE_MULTI_TAX_RATE ?? 0) === 1 ? 1 : 0,
  }
  const response =
    xslId > 0
      ? await axios.put<ApiEnvelope<EInvoiceSellerXslTemplateMetaResult> | EInvoiceSellerXslTemplateMetaResult>(
          `${BASE_URL}/templates/${xslId}`,
          body,
        )
      : await axios.post<ApiEnvelope<EInvoiceSellerXslTemplateMetaResult> | EInvoiceSellerXslTemplateMetaResult>(`${BASE_URL}/templates`, body)
  return normalizeResponse<EInvoiceSellerXslTemplateMetaResult>(response)
}

export async function deleteEInvoiceSellerXslTemplates(xslIds: number[]): Promise<{ success: boolean; message?: string }> {
  return deleteMasterRecords(BASE_URL, xslIds, "XslIds", "templates/bulk-delete")
}

export async function fetchEInvoiceDesignerImageFile(imageKind: EInvoiceDesignerImageKind, fileName: string, path?: string): Promise<Blob> {
  const response = await axios.get<Blob>(`${BASE_URL}/designer/images/${imageKind}/file`, {
    params: { fileName, path },
    responseType: "blob",
    validateStatus: () => true,
  })
  const blob = response.data
  if (response.status >= 400 || blob.type === "application/json") {
    let message = `Không tải được ảnh (${response.status})`
    if (blob?.type === "application/json") {
      try {
        const parsed = JSON.parse(await blob.text()) as { Message?: string; message?: string }
        message = parsed.Message || parsed.message || message
      } catch {
        /* keep fallback */
      }
    }
    throw new Error(message)
  }
  return blob
}

export async function selectEInvoiceDesignerImage(
  xslId: number,
  designId: number,
  imageKind: EInvoiceDesignerImageKind,
  fileName: string,
  path?: string,
): Promise<{ PATH: string; FILE_NAME: string }> {
  const response = await axios.put<ApiEnvelope<{ PATH: string; FILE_NAME: string }> | { PATH: string; FILE_NAME: string }>(
    `${BASE_URL}/templates/${xslId}/designer/images/${imageKind}`,
    { FILE_NAME: fileName, PATH: path || undefined },
    { params: { designId } },
  )
  return normalizeResponse<{ PATH: string; FILE_NAME: string }>(response).data
}

function normalizeResponse<T>(
  response: AxiosResponse<ApiEnvelope<T> | T>,
): { data: T; message?: string; success?: boolean } {
  const payload = response.data
  const envelope = (payload as ApiEnvelope<T>).Data ?? (payload as ApiEnvelope<T>).data

  return {
    data: (envelope ?? payload) as T,
    message: (payload as ApiEnvelope<T>).Message ?? (payload as ApiEnvelope<T>).message ?? "",
    success: (payload as ApiEnvelope<T>).Success ?? (payload as ApiEnvelope<T>).success ?? true,
  }
}

function buildDecimalParams(params: EInvoiceDecimalSettingSearchParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}
  if (typeof params.settingId === "number" && Number.isFinite(params.settingId) && params.settingId > 0) {
    query.settingId = params.settingId
  }
  if (typeof params.xslId === "number" && Number.isFinite(params.xslId) && params.xslId >= 0) {
    query.xslId = params.xslId
  }
  if (params.applyTarget) {
    query.applyTarget = params.applyTarget
  }
  if (params.fieldScope) {
    query.fieldScope = params.fieldScope
  }
  if (params.keyword) {
    query.keyword = params.keyword
  }
  if (typeof params.includeInactive === "boolean") {
    query.includeInactive = params.includeInactive
  }
  return query
}

export async function getEInvoiceDecimalSettings(params: EInvoiceDecimalSettingSearchParams = {}): Promise<{ data: EInvoiceDecimalSetting[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceDecimalSetting[]> | EInvoiceDecimalSetting[]>(`${BASE_URL}/decimal-settings`, {
    params: buildDecimalParams(params),
  })
  const normalized = normalizeResponse<EInvoiceDecimalSetting[]>(response)
  return { data: Array.isArray(normalized.data) ? normalized.data : [] }
}

export async function saveEInvoiceDecimalSetting(payload: EInvoiceDecimalSetting): Promise<{ data: EInvoiceDecimalSetting; message?: string }> {
  const settingId = Number(payload.SETTING_ID ?? 0)
  const body: EInvoiceDecimalSetting = {
    ...payload,
    XSL_ID: Number.isFinite(Number(payload.XSL_ID)) ? Math.max(0, Math.trunc(Number(payload.XSL_ID))) : 0,
  }
  const response =
    settingId > 0
      ? await axios.put<ApiEnvelope<EInvoiceDecimalSetting> | EInvoiceDecimalSetting>(`${BASE_URL}/decimal-settings/${settingId}`, body)
      : await axios.post<ApiEnvelope<EInvoiceDecimalSetting> | EInvoiceDecimalSetting>(`${BASE_URL}/decimal-settings`, body)
  return normalizeResponse<EInvoiceDecimalSetting>(response)
}

function buildUserSettingParams(params: EInvoiceUserSettingSearchParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}
  if (typeof params.settingId === "number" && Number.isFinite(params.settingId) && params.settingId > 0) {
    query.settingId = params.settingId
  }
  if (params.userId) {
    query.userId = params.userId
  }
  if (params.keyword) {
    query.keyword = params.keyword
  }
  if (typeof params.includeDeleted === "boolean") {
    query.includeDeleted = params.includeDeleted
  }
  return query
}

export async function getEInvoiceUserSettings(params: EInvoiceUserSettingSearchParams = {}): Promise<{ data: EInvoiceUserSetting[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceUserSetting[]> | EInvoiceUserSetting[]>(`${BASE_URL}/user-settings`, {
    params: buildUserSettingParams(params),
  })
  const normalized = normalizeResponse<EInvoiceUserSetting[]>(response)
  return { data: Array.isArray(normalized.data) ? normalized.data : [] }
}

export async function saveEInvoiceUserSetting(payload: EInvoiceUserSetting): Promise<{ data: EInvoiceUserSetting; message?: string }> {
  const settingId = Number(payload.SETTING_ID ?? 0)
  const response =
    settingId > 0
      ? await axios.put<ApiEnvelope<EInvoiceUserSetting> | EInvoiceUserSetting>(`${BASE_URL}/user-settings/${settingId}`, payload)
      : await axios.post<ApiEnvelope<EInvoiceUserSetting> | EInvoiceUserSetting>(`${BASE_URL}/user-settings`, payload)
  return normalizeResponse<EInvoiceUserSetting>(response)
}

function buildAdminSettingParams(params: EInvoiceAdminSettingSearchParams): Record<string, string | number | boolean> {
  const query: Record<string, string | number | boolean> = {}
  if (typeof params.settingId === "number" && Number.isFinite(params.settingId) && params.settingId > 0) {
    query.settingId = params.settingId
  }
  if (params.settingType) {
    query.settingType = params.settingType
  }
  if (params.keyword) {
    query.keyword = params.keyword
  }
  if (typeof params.includeDeleted === "boolean") {
    query.includeDeleted = params.includeDeleted
  }
  return query
}

export async function getEInvoiceAdminSettings(params: EInvoiceAdminSettingSearchParams = {}): Promise<{ data: EInvoiceAdminSetting[] }> {
  const response = await axios.get<ApiEnvelope<EInvoiceAdminSetting[]> | EInvoiceAdminSetting[]>(`${BASE_URL}/admin-settings`, {
    params: buildAdminSettingParams(params),
  })
  const normalized = normalizeResponse<EInvoiceAdminSetting[]>(response)
  return { data: Array.isArray(normalized.data) ? normalized.data : [] }
}

export async function getEInvoiceMailSetting(): Promise<{ data: EInvoiceMailSetting }> {
  const response = await axios.get<ApiEnvelope<EInvoiceMailSetting> | EInvoiceMailSetting>(`${BASE_URL}/mail-settings`)
  const normalized = normalizeResponse<EInvoiceMailSetting>(response)
  return { data: normalized.data }
}

export async function saveEInvoiceMailSetting(payload: EInvoiceMailSettingSaveRequest): Promise<{ data: EInvoiceMailSetting; message?: string }> {
  const mailId = Number(payload.MAIL_ID ?? 0)
  const response =
    mailId > 0
      ? await axios.put<ApiEnvelope<EInvoiceMailSetting> | EInvoiceMailSetting>(`${BASE_URL}/mail-settings`, payload)
      : await axios.post<ApiEnvelope<EInvoiceMailSetting> | EInvoiceMailSetting>(`${BASE_URL}/mail-settings`, payload)
  return normalizeResponse<EInvoiceMailSetting>(response)
}

export async function sendTestEInvoiceMailSetting(payload: EInvoiceMailSettingSaveRequest & { TO_EMAIL: string }): Promise<{ message?: string }> {
  const response = await axios.post<ApiEnvelope<boolean> | boolean>(`${BASE_URL}/mail-settings/test`, payload)
  return normalizeResponse<boolean>(response)
}
