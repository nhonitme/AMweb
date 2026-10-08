export type PitKind = "declaration" | "certificate" | "error-notice"
export interface PitCertificate { TTCHUC: string; SERI: string; TNGAY: string; DNGAY: string; HTHUC: number }
export interface PitNoticeItem { REF_CTU_ID?: number; KHMSCTU: string; KHCTU: string; SCTU: string; NLAP: string; LCTDT: string; LDO: string }
export interface PitData { Fields: Record<string,string>; Certificates: PitCertificate[]; Items: PitNoticeItem[] }
export interface PitDocument {
  DOCUMENT_ID: number; KIND: PitKind; DOC_VERSION: number; DOC_DATE?: string | null; TAX_CD: string; DISPLAY_NAME: string
  SERIES?: string; XSL_ID?: number; DOC_NO?: number; DATA: PitData; IS_SIGNED: number; CQT_STATUS: number; ERROR_MESSAGE?: string
  MTDIEP?: string; MGDDTU?: string; QUEUED: number;  
}
export interface PitSearchParams {
  fromYmd?: string
  toYmd?: string
  keyword?: string
  signed?: number
  cqtStatus?: number
  pageNumber?: number
  pageSize?: number
}
export interface PitTransmissionMessage {
  RECEIVE_ID: number
  MLTDIEP: string
  MLTDIEP_NAME?: string
  MTDIEP?: string
  MTDTCHIEU?: string
  MST?: string
  ERROR_MESSAGE?: string
  CREATE_AT: string
  RESPONSE_XML: string
}
export interface PitField { Key: string; Label: string; Group: string; Type: string; Required: boolean; MaxLength: number; Options?: { Value: string; Label: string }[]; Default?: string }
export interface PitSchema { Title: string; Form: string; Fields: PitField[] }
export const pitStatus = (row: PitDocument) => !row.IS_SIGNED ? "Chưa ký" : row.CQT_STATUS === 2 ? "CQT chấp nhận" : row.CQT_STATUS === 3 ? "CQT không chấp nhận" : row.QUEUED ? "Đã ký · Chờ phản hồi" : "Đã ký · Chờ gửi"
