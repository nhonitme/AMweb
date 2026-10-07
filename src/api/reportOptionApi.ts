import type { AxiosResponse } from "axios"

import API_BASE_URL from "@/config/apiConfig"

import axios from "./axiosClient"

export type ReportOption = {
  OPTION_ID: number
  COMPANY_CD: string
  REPORT_GROUP_CODE: string
  OPTION_CODE: string
  OPTION_NAME: string
  LABEL_TEXT?: string | null
  CAPTION?: string | null
  REPORT_CODE: string
  IS_DEFAULT: string
  SORT_ORDER: number
}

export type ReportOptionRequest = {
  companyCd?: string
  reportGroupCode: string
}

type ApiEnvelope<T> = {
  Data?: T
  data?: T
}

const fieldMap: Record<keyof ReportOption, string[]> = {
  OPTION_ID: ["OPTION_ID", "optionId", "OptionId"],
  COMPANY_CD: ["COMPANY_CD", "companyCd", "CompanyCd"],
  REPORT_GROUP_CODE: ["REPORT_GROUP_CODE", "reportGroupCode", "ReportGroupCode"],
  OPTION_CODE: ["OPTION_CODE", "optionCode", "OptionCode"],
  OPTION_NAME: ["OPTION_NAME", "optionName", "OptionName"],
  LABEL_TEXT: ["LABEL_TEXT", "labelText", "LabelText"],
  CAPTION: ["CAPTION", "caption", "Caption"],
  REPORT_CODE: ["REPORT_CODE", "reportCode", "ReportCode"],
  IS_DEFAULT: ["IS_DEFAULT", "isDefault", "IsDefault"],
  SORT_ORDER: ["SORT_ORDER", "sortOrder", "SortOrder"],
}

function normalizeResponse<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const payload = response.data
  const envelope = payload as ApiEnvelope<T>
  return envelope.Data ?? envelope.data ?? (payload as T)
}

function getText(source: Record<string, unknown>, candidates: string[]): string {
  for (const candidate of candidates) {
    const value = source[candidate]
    if (value !== undefined && value !== null) {
      return String(value).trim()
    }
  }

  return ""
}

function getNumber(source: Record<string, unknown>, candidates: string[]): number {
  const value = getText(source, candidates)
  const numberValue = Number(value)
  return Number.isFinite(numberValue) ? numberValue : 0
}

function normalizeReportOption(row: unknown): ReportOption | null {
  if (!row || typeof row !== "object") {
    return null
  }

  const source = row as Record<string, unknown>
  const reportCode = getText(source, fieldMap.REPORT_CODE)
  const optionCode = getText(source, fieldMap.OPTION_CODE)

  if (!reportCode || !optionCode) {
    return null
  }

  return {
    OPTION_ID: getNumber(source, fieldMap.OPTION_ID),
    COMPANY_CD: getText(source, fieldMap.COMPANY_CD),
    REPORT_GROUP_CODE: getText(source, fieldMap.REPORT_GROUP_CODE),
    OPTION_CODE: optionCode,
    OPTION_NAME: getText(source, fieldMap.OPTION_NAME) || optionCode,
    LABEL_TEXT: getText(source, fieldMap.LABEL_TEXT) || null,
    CAPTION: getText(source, fieldMap.CAPTION) || getText(source, fieldMap.OPTION_NAME) || optionCode,
    REPORT_CODE: reportCode,
    IS_DEFAULT: getText(source, fieldMap.IS_DEFAULT),
    SORT_ORDER: getNumber(source, fieldMap.SORT_ORDER),
  }
}

const BASE_URL = `${API_BASE_URL}/reports/options`

export async function getReportOptions(params: ReportOptionRequest): Promise<ReportOption[]> {
  const response = await axios.get<ApiEnvelope<unknown[]> | unknown[]>(BASE_URL, {
    params: {
      companyCd: params.companyCd,
      reportGroupCode: params.reportGroupCode,
    },
  })

  const payload = normalizeResponse(response)
  return Array.isArray(payload) ? payload.map(normalizeReportOption).filter((option): option is ReportOption => option !== null) : []
}
