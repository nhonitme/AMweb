export type EInvoiceMinuteText = string | null | undefined

export interface EInvoiceMinuteReasonApi {
  REASON_ID?: number | null
  BBAN_ID?: number | null
  SORT_ORDER?: number | null
  LDO?: EInvoiceMinuteText
  CREATE_DT?: EInvoiceMinuteText
  ISDEL?: number | null
}

export interface EInvoiceMinuteLineApi {
  REASON_ID?: number | null
  BBAN_ID?: number | null
  DETAIL_ID?: number | null
  LINE_SIDE?: number | null
  SORT_ORDER?: number | null
  LDO?: EInvoiceMinuteText
  TCHAT?: number | null
  STT?: number | null
  MHHDVU?: EInvoiceMinuteText
  THHDVU?: EInvoiceMinuteText
  DVTINH?: EInvoiceMinuteText
  SLUONG?: number | null
  DGIA?: number | null
  TLCKHAU?: number | null
  STCKHAU?: number | null
  THTIEN?: number | null
  TSUAT?: EInvoiceMinuteText
  TTHUE?: number | null
  TSAUTHUE?: number | null
  EXTRA_JSON?: EInvoiceMinuteText
  CREATE_DT?: EInvoiceMinuteText
  ISDEL?: number | null
}

export type EInvoiceMinuteLineTotals = {
  THTIEN: number | null
  TTHUE: number | null
  TSAUTHUE: number | null
}

export interface EInvoiceMinuteApi {
  BBAN_ID?: number | null
  COMPANY_CD?: EInvoiceMinuteText
  SELLER_ID?: number | null
  INVOICE_ID?: number | null
  REF_INVOICE_ID?: number | null
  PBAN?: EInvoiceMinuteText
  TBBAN?: EInvoiceMinuteText
  SBBAN?: EInvoiceMinuteText
  NBBAN?: EInvoiceMinuteText
  TCHDON?: number | null
  NBAN?: EInvoiceMinuteText
  MSTNBAN?: EInvoiceMinuteText
  DCNBAN?: EInvoiceMinuteText
  NMUA?: EInvoiceMinuteText
  MSTNMUA?: EInvoiceMinuteText
  DCNMUA?: EInvoiceMinuteText
  KHMSHDON?: EInvoiceMinuteText
  KHHDON?: EInvoiceMinuteText
  SHDON?: EInvoiceMinuteText
  NLAP?: EInvoiceMinuteText
  DVTTE?: EInvoiceMinuteText
  TGIA?: number | null
  MTRACUU?: EInvoiceMinuteText
  TTKHAC_XML?: EInvoiceMinuteText
  NDBBAN_XML?: EInvoiceMinuteText
  SIGNED_XML?: EInvoiceMinuteText
  IS_SIGNED?: number | null
  NMUA_IS_SIGNED?: number | null
  NMUA_SIGN_DT?: EInvoiceMinuteText
  IS_MAIL?: number | null
  CHECKSUM?: EInvoiceMinuteText
  CREATE_BY?: EInvoiceMinuteText
  CREATE_DT?: EInvoiceMinuteText
  UPDATE_BY?: EInvoiceMinuteText
  UPDATE_DT?: EInvoiceMinuteText
  ISDEL?: number | null
  REASONS?: EInvoiceMinuteReasonApi[]
  LINES_BEFORE?: EInvoiceMinuteLineApi[]
  LINES_AFTER?: EInvoiceMinuteLineApi[]
  TOTAL_BEFORE?: EInvoiceMinuteLineApi | null
  TOTAL_AFTER?: EInvoiceMinuteLineApi | null
  TOTAL_AFTER_TTHUE?: number | null
}

export interface EInvoiceMinuteReason {
  ROW_KEY: string
  REASON_ID: number
  BBAN_ID: number
  SORT_ORDER: number
  LDO: string
  CREATE_DT: string
  ISDEL: number
}

export interface EInvoiceMinuteLine {
  ROW_KEY: string
  REASON_ID: number
  BBAN_ID: number
  DETAIL_ID: number
  LINE_SIDE: number
  SORT_ORDER: number
  LDO: string
  TCHAT: number
  STT: number
  MHHDVU: string
  THHDVU: string
  DVTINH: string
  SLUONG: number | null
  DGIA: number | null
  TLCKHAU: number | null
  STCKHAU: number | null
  THTIEN: number | null
  TSUAT: string
  TTHUE: number | null
  TSAUTHUE: number | null
  EXTRA_JSON: string
  CREATE_DT: string
  ISDEL: number
}

export interface EInvoiceMinute {
  BBAN_ID: number
  COMPANY_CD: string
  SELLER_ID: number
  INVOICE_ID: number
  REF_INVOICE_ID: number
  PBAN: string
  TBBAN: string
  SBBAN: string
  NBBAN: string
  TCHDON: number
  NBAN: string
  MSTNBAN: string
  DCNBAN: string
  NMUA: string
  MSTNMUA: string
  DCNMUA: string
  KHMSHDON: string
  KHHDON: string
  SHDON: string
  NLAP: string
  DVTTE: string
  TGIA: number | null
  MTRACUU: string
  TTKHAC_XML: string
  NDBBAN_XML: string
  SIGNED_XML: string
  IS_SIGNED: number
  NMUA_IS_SIGNED: number
  NMUA_SIGN_DT: string
  IS_MAIL: number
  CHECKSUM: string
  CREATE_BY: string
  CREATE_DT: string
  UPDATE_BY: string
  UPDATE_DT: string
  ISDEL: number
  REASONS: EInvoiceMinuteReason[]
  LINES_BEFORE: EInvoiceMinuteLine[]
  LINES_AFTER: EInvoiceMinuteLine[]
  TOTAL_BEFORE: EInvoiceMinuteLine
  TOTAL_AFTER: EInvoiceMinuteLine
}

export interface EInvoiceMinuteSearchParams {
  bbanId?: number
  fromYmd?: string
  toYmd?: string
  keyword?: string
  isSigned?: number
  includeReasons?: boolean
}

export interface EInvoiceMinuteSigningPayload {
  BBAN_ID: number
  RAW_XML: string
  IS_SIGNED: boolean
}

export interface EInvoiceMinuteSignaturePayload {
  XML: string
  CERTIFICATE_SUBJECT?: string | null
  CERTIFICATE_THUMBPRINT?: string | null
  CERTIFICATE_SERIAL_NUMBER?: string | null
  SIGNED_AT?: string | null
}

export const EINVOICE_MINUTE_LINE_SIDE_REASON = 0
export const EINVOICE_MINUTE_LINE_SIDE_BEFORE = 1
export const EINVOICE_MINUTE_LINE_SIDE_AFTER = 2
export const EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL = 3
export const EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL = 4
