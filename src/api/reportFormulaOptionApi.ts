import type { AxiosResponse } from "axios"

import API_BASE_URL from "@/config/apiConfig"

import axios from "./axiosClient"

export type CashflowFormulaOptionRow = {
  ID?: number | null
  ITEM_KEY: string
  ITEM_CODE: string
  CAPTION: string
  LABEL_TEXT?: string | null
  /** @deprecated Legacy alias; API accepts on save only. */
  ITEM_NAME?: string | null
  ELEMENT_TYPE: string
  LEVEL_NO: number
  DATA_SOURCE_TYPE: string
  FORMULA_EXPR?: string | null
  FORMULA_DISPLAY?: string | null
  CODE_NO1?: string | null
  CODE_NO2?: string | null
  FORMULA_NO1?: string | null
  FORMULA_NO2?: string | null
  CALC_METHOD_NO1?: string | null
  CALC_METHOD_NO2?: string | null
  ACCOUNT_RULE?: string | null
  CALC_METHOD?: string | null
  DIRECT_RULE_FLOW_SIGN?: number | null
  DIRECT_RULE_ACC_PREFIX?: string | null
  DIRECT_RULE_PRIORITY?: number | null
  DIRECT_RULE_FLOW_SIGN_2?: number | null
  DIRECT_RULE_ACC_PREFIX_2?: string | null
  DIRECT_RULE_PRIORITY_2?: number | null
  SORT_ORDER: number
  FONT_BOLD: string
  FONT_ITALIC: string
  IS_VISIBLE: string
}

export type CashflowFormulaOptions = {
  COMPANY_CD: string
  REPORT_CODE: string
  REPORT_VERSION: string
  SOURCE_COMPANY_CD?: string | null
  CASH_ACCOUNT_PREFIXES: string
  ROWS: CashflowFormulaOptionRow[]
}

export type CashflowFormulaOptionsSaveRequest = {
  REPORT_CODE: string
  REPORT_VERSION: string
  CASH_ACCOUNT_PREFIXES?: string | null
  ROWS: CashflowFormulaOptionRow[]
}

export type FormulaOptionPreviewParams = {
  previewReportCode: string
  fromYmd: string
  toYmd: string
  unitDivisor?: string
  menuCode?: string
}

export type FormulaOptionPreviewColumn = {
  FIELD_NAME: string
  CAPTION: string
}

export type FormulaOptionPreviewRow = {
  ITEM_CODE?: string | null
  VALUES: Record<string, string | number | boolean | null>
}

export type FormulaOptionPreview = {
  COLUMNS: FormulaOptionPreviewColumn[]
  ROWS: FormulaOptionPreviewRow[]
}

export type CashflowFormulaOptionsPreviewRequest = CashflowFormulaOptionsSaveRequest & {
  PreviewReportCode: string
  FromYmd: string
  ToYmd: string
  UnitDivisor?: string | null
  MenuCode?: string | null
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

const BASE_URL = `${API_BASE_URL}/reports/formula-options`

export async function getCashflowFormulaOptions(
  reportCode: string,
  reportVersion?: string | null,
): Promise<CashflowFormulaOptions> {
  const response = await axios.get<ApiEnvelope<CashflowFormulaOptions> | CashflowFormulaOptions>(BASE_URL, {
    params: {
      reportCode,
      reportVersion: reportVersion?.trim() || undefined,
    },
  })

  return normalizeResponse(response)
}

export async function saveCashflowFormulaOptions(
  payload: CashflowFormulaOptionsSaveRequest,
): Promise<CashflowFormulaOptions> {
  const response = await axios.put<ApiEnvelope<CashflowFormulaOptions> | CashflowFormulaOptions>(BASE_URL, payload)
  return normalizeResponse(response)
}

export async function resetCashflowFormulaOptions(
  reportCode: string,
  reportVersion?: string | null,
): Promise<CashflowFormulaOptions> {
  const response = await axios.post<ApiEnvelope<CashflowFormulaOptions> | CashflowFormulaOptions>(
    `${BASE_URL}/reset`,
    null,
    {
      params: {
        reportCode,
        reportVersion: reportVersion?.trim() || undefined,
      },
    },
  )
  return normalizeResponse(response)
}

export async function previewCashflowFormulaOptions(
  payload: CashflowFormulaOptionsPreviewRequest,
): Promise<FormulaOptionPreview> {
  const response = await axios.post<ApiEnvelope<FormulaOptionPreview> | FormulaOptionPreview>(
    `${BASE_URL}/preview`,
    payload,
  )
  return normalizeResponse(response)
}
