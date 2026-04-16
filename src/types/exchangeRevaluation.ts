export type ExchangeRevaluationModule = "ALL" | "AR" | "AP"

export type ExchangeRevaluationFilterPayload = {
  COMPANY_CD?: string
  MODULE_CD?: ExchangeRevaluationModule
  RATE_DATE?: string | null
  FC_TYPE?: string | null
  CHIT_YMD_FROM?: string | null
  CHIT_YMD_TO?: string | null
}

export type ExchangeRevaluationHistoryQuery = {
  COMPANY_CD?: string
  MODULE_CD?: ExchangeRevaluationModule | null
  RATE_DATE_FROM?: string | null
  RATE_DATE_TO?: string | null
  FC_TYPE?: string | null
  BATCH_ID?: number | null
}

export interface ExchangeRevaluationSummary {
  TOTAL_ROWS: number
  FOUND_RATE_ROWS: number
  MISSING_RATE_ROWS: number
  TOTAL_OLD_AMOUNT: number
  TOTAL_NEW_AMOUNT: number
  TOTAL_EXCHANGE_DIFF: number
  TOTAL_GAIN: number
  TOTAL_LOSS: number
}

export interface ExchangeRevaluationPreviewItem {
  MODULE_CD: string
  COMPANY_CD: string
  CHIT_ID: number
  CHITDETAIL_ID: number
  CHIT_CD?: string | null
  CHIT_NO?: string | null
  CHIT_YMD?: string | null
  CHIT_TYPE?: string | null
  CHITDETAIL_CD?: string | null
  DEBIT?: string | null
  CREDIT?: string | null
  FC_TYPE?: string | null
  FC_AMOUNT: number
  OLD_RATE: number
  OLD_AMOUNT: number
  NEW_RATE?: number | null
  NEW_AMOUNT?: number | null
  EXCHANGE_DIFF?: number | null
  DIFF_TYPE: string
  RATE_STATUS: string
}

export interface ExchangeRevaluationHistoryItem {
  RESULT_ID: number
  BATCH_ID: number
  COMPANY_CD: string
  MODULE_CD: string
  CHIT_ID: number
  CHITDETAIL_ID: number
  CHIT_CD?: string | null
  CHIT_NO?: string | null
  CHIT_YMD?: string | null
  CHIT_TYPE?: string | null
  CHITDETAIL_CD?: string | null
  DEBIT?: string | null
  CREDIT?: string | null
  FC_TYPE?: string | null
  RATE_DATE?: string | null
  FC_AMOUNT: number
  OLD_RATE: number
  NEW_RATE: number
  OLD_AMOUNT: number
  NEW_AMOUNT: number
  EXCHANGE_DIFF: number
  DIFF_TYPE: string
  RATE_STATUS: string
  CREATED_BY?: string | null
}

export interface ExchangeRevaluationCurrencyItem {
  FC_TYPE: string
}

export type ExchangeRevaluationPreviewResponse = {
  data: ExchangeRevaluationPreviewItem[]
  summary: ExchangeRevaluationSummary
}

export type ExchangeRevaluationHistoryResponse = {
  data: ExchangeRevaluationHistoryItem[]
  summary: ExchangeRevaluationSummary
}

export type ExchangeRevaluationSaveResponse = {
  batchId: number
  savedCount: number
  data: ExchangeRevaluationHistoryItem[]
  summary: ExchangeRevaluationSummary
}
