export type ExchangeRevaluationModule = "ALL" | "AR" | "AP" | "CA"

export type ExchangeRevaluationFilterPayload = {
  MODULE_CD?: ExchangeRevaluationModule
  RATE_DATE?: string | null
  FC_TYPE?: string | null
  CHIT_YMD_FROM?: string | null
  CHIT_YMD_TO?: string | null
  RATE_METHOD?: "WEIGHTED_AVERAGE" | null
}

export type ExchangeRevaluationHistoryQuery = {
  MODULE_CD?: ExchangeRevaluationModule | null
  RATE_DATE_FROM?: string | null
  RATE_DATE_TO?: string | null
  FC_TYPE?: string | null
}

export interface ExchangeRevaluationSummary {
  TOTAL_ROWS: number
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
}

export interface ExchangeRevaluationHistoryItem {
  RESULT_ID: number
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
  savedCount: number
  data: ExchangeRevaluationHistoryItem[]
  summary: ExchangeRevaluationSummary
}

export type CashExchangeRevaluationJobStatus = "QUEUED" | "PROCESSING" | "DONE" | "ERROR"

export type CashExchangeRevaluationStartJobResult = {
  jobId: string
  status: CashExchangeRevaluationJobStatus
  message?: string
}

export type CashExchangeRevaluationJobProgress = {
  jobId: string
  status: CashExchangeRevaluationJobStatus
  percent: number
  savedCount: number
  message?: string
  createdAt?: string
  updatedAt?: string
}

export type ExchangeRevaluationJobStatus = "QUEUED" | "PROCESSING" | "DONE" | "ERROR"

export type ExchangeRevaluationStartJobResult = {
  jobId: string
  status: ExchangeRevaluationJobStatus
  message?: string
}

export type ExchangeRevaluationJobProgress = {
  jobId: string
  status: ExchangeRevaluationJobStatus
  percent: number
  savedCount: number
  message?: string
  createdAt?: string
  updatedAt?: string
}
