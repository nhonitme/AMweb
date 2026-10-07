import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import type { ApiResponseEnvelope } from "./apiTypes"
import type {
  ReportSignatureMapping,
  ReportSignatureMappingApi,
  ReportSignatureMappingSignature,
  ReportSignatureMappingSignatureApi,
  SaveReportSignatureMappingRequest,
} from "@/types/reportSignatureMapping"

const BASE_URL = `${API_BASE_URL}/ReportSignatureMapping`

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim()
}

function normalizeNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : null
}

function normalizeBoolean(value: unknown, fallback = false): boolean {
  if (value === null || value === undefined || value === "") {
    return fallback
  }

  if (typeof value === "boolean") {
    return value
  }

  const normalized = String(value).trim().toLowerCase()
  return normalized === "1" || normalized === "true" || normalized === "y"
}

function unwrapPayload<T>(response: AxiosResponse<ApiResponseEnvelope<T> | T>): T {
  const payload = response.data
  const envelope = (payload as ApiResponseEnvelope<T>).Data ?? (payload as ApiResponseEnvelope<T>).data ?? payload
  return envelope as T
}

function normalizeSignature(item: ReportSignatureMappingSignatureApi): ReportSignatureMappingSignature {
  return {
    ID: normalizeNumber(item.ID),
    COMPANY_CD: normalizeText(item.COMPANY_CD),
    SIGN_CODE: normalizeText(item.SIGN_CODE),
    DISPLAY_LABEL: normalizeText(item.DISPLAY_LABEL),
    SIGN_NAME: normalizeText(item.SIGN_NAME),
    SIGN_TITLE: normalizeText(item.SIGN_TITLE),
    SIGN_IMAGE_URL: normalizeText(item.SIGN_IMAGE_URL),
    SORT_ORDER: normalizeNumber(item.SORT_ORDER),
    IS_ACTIVE: normalizeBoolean(item.IS_ACTIVE, true),
    IS_SELECTED: normalizeBoolean(item.IS_SELECTED, false),
    SELECTED_ORDER: normalizeNumber(item.SELECTED_ORDER),
  }
}

function normalizeMapping(payload: ReportSignatureMappingApi): ReportSignatureMapping {
  return {
    MAPPING_ID: normalizeNumber(payload.MAPPING_ID),
    COMPANY_CD: normalizeText(payload.COMPANY_CD),
    REPORT_KEY: normalizeText(payload.REPORT_KEY),
    REPORT_CODE: normalizeText(payload.REPORT_CODE),
    REPORT_NAME: normalizeText(payload.REPORT_NAME),
    REPORT_ID: normalizeNumber(payload.REPORT_ID),
    SIGN_IDS: normalizeText(payload.SIGN_IDS) || null,
    SIGNATURES: Array.isArray(payload.SIGNATURES) ? payload.SIGNATURES.map(normalizeSignature) : [],
  }
}

export async function getReportSignatureMapping(
  reportKey: string,
  reportCode?: string,
): Promise<ReportSignatureMapping> {
  const normalizedReportKey = reportKey.trim()
  if (!normalizedReportKey) {
    throw new Error("REPORT_KEY is required")
  }

  const response = await axios.get<ApiResponseEnvelope<ReportSignatureMappingApi> | ReportSignatureMappingApi>(
    `${BASE_URL}/${encodeURIComponent(normalizedReportKey)}`,
    {
      params: reportCode?.trim() ? { reportCode: reportCode.trim() } : undefined,
    },
  )

  return normalizeMapping(unwrapPayload<ReportSignatureMappingApi>(response))
}

export async function updateReportSignatureMapping(
  reportKey: string,
  payload: SaveReportSignatureMappingRequest,
): Promise<ReportSignatureMapping> {
  const normalizedReportKey = reportKey.trim()
  if (!normalizedReportKey) {
    throw new Error("REPORT_KEY is required")
  }

  const response = await axios.put<ApiResponseEnvelope<ReportSignatureMappingApi> | ReportSignatureMappingApi>(
    `${BASE_URL}/${encodeURIComponent(normalizedReportKey)}`,
    payload,
  )

  return normalizeMapping(unwrapPayload<ReportSignatureMappingApi>(response))
}
