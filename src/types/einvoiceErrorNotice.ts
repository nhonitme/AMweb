export type EInvoiceErrorNoticeText = string | null | undefined

export interface EInvoiceErrorNoticeDetailApi {
  DETAIL_ID?: number | null
  TBAO_ID?: number | null
  COMPANY_CD?: EInvoiceErrorNoticeText
  STT?: number | null
  MCCQT?: EInvoiceErrorNoticeText
  KHMSHDON?: EInvoiceErrorNoticeText
  KHHDON?: EInvoiceErrorNoticeText
  SHDON?: EInvoiceErrorNoticeText
  NGAY?: EInvoiceErrorNoticeText
  LADHDDT?: number | null
  LDO?: EInvoiceErrorNoticeText
  CREATE_BY?: EInvoiceErrorNoticeText
  CREATE_AT?: EInvoiceErrorNoticeText
  UPDATE_BY?: EInvoiceErrorNoticeText
  UPDATE_AT?: EInvoiceErrorNoticeText
  ISDEL?: number | null
}

export interface EInvoiceErrorNoticeApi {
  TBAO_ID?: number | null
  COMPANY_CD?: EInvoiceErrorNoticeText
  PBAN?: EInvoiceErrorNoticeText
  MSO?: EInvoiceErrorNoticeText
  TEN?: EInvoiceErrorNoticeText
  LOAI?: number | null
  MCQT?: EInvoiceErrorNoticeText
  TCQT?: EInvoiceErrorNoticeText
  SO?: EInvoiceErrorNoticeText
  NTBCCQT?: EInvoiceErrorNoticeText
  MST?: EInvoiceErrorNoticeText
  TNNT?: EInvoiceErrorNoticeText
  DDANH?: EInvoiceErrorNoticeText
  NTBAO?: EInvoiceErrorNoticeText
  XML?: EInvoiceErrorNoticeText
  IS_SIGNED?: number | null
  IS_MAIL?: number | null
  MGDDTU?: EInvoiceErrorNoticeText
  MTDIEP?: EInvoiceErrorNoticeText
  ERROR_MESSAGE?: EInvoiceErrorNoticeText
  CREATE_BY?: EInvoiceErrorNoticeText
  CREATE_AT?: EInvoiceErrorNoticeText
  UPDATE_BY?: EInvoiceErrorNoticeText
  UPDATE_AT?: EInvoiceErrorNoticeText
  ISDEL?: number | null
  DETAILS?: EInvoiceErrorNoticeDetailApi[]
}

export interface EInvoiceErrorNoticeDetail {
  ROW_KEY: string
  SOURCE_INVOICE_ID: number
  DETAIL_ID: number
  TBAO_ID: number
  COMPANY_CD: string
  STT: number
  MCCQT: string
  KHMSHDON: string
  KHHDON: string
  SHDON: string
  NGAY: string
  LADHDDT: number
  LDO: string
  CREATE_BY: string
  CREATE_AT: string
  UPDATE_BY: string
  UPDATE_AT: string
  ISDEL: number
}

export interface EInvoiceErrorNotice {
  TBAO_ID: number
  COMPANY_CD: string
  PBAN: string
  MSO: string
  TEN: string
  LOAI: number
  MCQT: string
  TCQT: string
  SO: string
  NTBCCQT: string
  MST: string
  TNNT: string
  DDANH: string
  NTBAO: string
  XML: string
  IS_SIGNED: number
  IS_MAIL: number
  MGDDTU: string
  MTDIEP: string
  ERROR_MESSAGE: string
  CREATE_BY: string
  CREATE_AT: string
  UPDATE_BY: string
  UPDATE_AT: string
  ISDEL: number
  DETAILS: EInvoiceErrorNoticeDetail[]
}

export interface EInvoiceErrorNoticeSearchParams {
  tbaoId?: number
  fromYmd?: string
  toYmd?: string
  keyword?: string
  isSigned?: number
  includeDetails?: boolean
}

export interface EInvoiceErrorNoticeSigningPayload {
  TBAO_ID: number
  RAW_XML: string
  IS_SIGNED: boolean
}

export interface EInvoiceErrorNoticeSignaturePayload {
  XML: string
  CERTIFICATE_SUBJECT?: string | null
  CERTIFICATE_THUMBPRINT?: string | null
  CERTIFICATE_SERIAL_NUMBER?: string | null
  SIGNED_AT?: string | null
}
