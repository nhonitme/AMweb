export type EInvoiceEmailHistoryText = string | null | undefined

export interface EInvoiceEmailHistory {
  MAIL_ID: number
  COMPANY_CD?: EInvoiceEmailHistoryText
  DB_NAME?: EInvoiceEmailHistoryText
  REF_TYPE?: EInvoiceEmailHistoryText
  REF_ID?: number | null
  SEND_TYPE?: EInvoiceEmailHistoryText
  SEND_STATUS?: EInvoiceEmailHistoryText
  FROM_EMAIL?: EInvoiceEmailHistoryText
  TO_EMAIL?: EInvoiceEmailHistoryText
  CC_EMAIL?: EInvoiceEmailHistoryText
  BCC_EMAIL?: EInvoiceEmailHistoryText
  MAIL_SUBJECT?: EInvoiceEmailHistoryText
  RETRY_COUNT?: number | null
  ERROR_MESSAGE?: EInvoiceEmailHistoryText
  SEND_DT?: EInvoiceEmailHistoryText
  CREATE_AT?: EInvoiceEmailHistoryText
}
