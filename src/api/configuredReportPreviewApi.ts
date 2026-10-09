import type { AxiosResponse } from "axios"

import API_BASE_URL from "@/config/apiConfig"
import { scheduleReportPreview } from "@/lib/reportPreviewScheduler"

import axios from "./axiosClient"

export type ReportPreviewCellValue = string | number | boolean | null

export type ReportPreviewColumnDataType = "string" | "number" | "date" | "boolean"

export type ReportPreviewColumnAlign = "left" | "center" | "right"

export type ReportPreviewMode = "FLAT_REPORT" | "OUTLINE_GRID"

export type ReportViewType = "DATA_GRID" | "TREE_LIST"

export type ReportPreviewColumn = {
  COLUMN_KEY: string
  FIELD_NAME: string
  LABEL_TEXT?: string | null
  CAPTION: string
  DATA_TYPE: ReportPreviewColumnDataType
  FORMAT?: string | null
  ALIGN: ReportPreviewColumnAlign
  WIDTH: number
  SORT_ORDER: number
}

export type ReportPreviewRow = {
  ROW_KEY: string
  VALUES: Record<string, ReportPreviewCellValue>
}

export type ConfiguredReportPreview = {
  COMPANY_CD: string
  REPORT_CODE: string
  REPORT_NAME: string
  PREVIEW_MODE: ReportPreviewMode
  VIEW_TYPE?: ReportViewType | null
  COLUMNS: ReportPreviewColumn[]
  ROWS: ReportPreviewRow[]
}

export type ConfiguredReportPreviewRequest = {
  [key: string]: string | undefined
  companyCd?: string
  reportCode: string
  menuCode?: string
  reportGroupCode?: string
  reportOptionCode?: string
  fromYmd?: string
  toYmd?: string
  useStartYmd?: string
  moduleCd?: string
  accountCd?: string
  accCd?: string
  assetStatus?: string
  customerCd?: string
  bankCd?: string
  fcType?: string
  storeCd?: string
  productCd?: string
  keyword?: string
  searchText?: string
  type?: string
  status?: string
  reportVersion?: string
  unitDivisor?: string
  language?: string
  gridId?: string
  templateId?: string
  printLayout?: string
  printGridId?: string
  printTemplateId?: string
}

export type ConfiguredReportPreviewOptions = {
  signal?: AbortSignal
}

type ApiEnvelope<T> = {
  Data?: T
  data?: T
  Message?: string
  message?: string
  Success?: boolean
  success?: boolean
}

function normalizeResponse<T>(response: AxiosResponse<ApiEnvelope<T> | T>): T {
  const payload = response.data
  const envelope = payload as ApiEnvelope<T>
  return envelope.Data ?? envelope.data ?? (payload as T)
}

function buildQuery(params: ConfiguredReportPreviewRequest): Record<string, string> {
  const query: Record<string, string> = {}

  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined) {
      query[key] = String(value).trim()
    }
  })

  return query
}

const BASE_URL = `${API_BASE_URL}/reports`

export async function getConfiguredReportPreview(
  params: ConfiguredReportPreviewRequest,
  options: ConfiguredReportPreviewOptions = {},
): Promise<ConfiguredReportPreview> {
  return scheduleReportPreview(
    async () => {
      const response = await axios.get<ApiEnvelope<ConfiguredReportPreview> | ConfiguredReportPreview>(
        `${BASE_URL}/preview`,
        {
          params: buildQuery(params),
          signal: options.signal,
        },
      )

      return normalizeResponse(response)
    },
    options.signal,
  )
}
