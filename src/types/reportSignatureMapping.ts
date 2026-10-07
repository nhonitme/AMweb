export type ReportSignatureText = string | null | undefined

export interface ReportSignatureMappingSignatureApi {
  ID?: number | null
  COMPANY_CD?: ReportSignatureText
  SIGN_CODE?: ReportSignatureText
  DISPLAY_LABEL?: ReportSignatureText
  SIGN_NAME?: ReportSignatureText
  SIGN_TITLE?: ReportSignatureText
  SIGN_IMAGE_URL?: ReportSignatureText
  SORT_ORDER?: number | null
  IS_ACTIVE?: ReportSignatureText | boolean
  IS_SELECTED?: boolean | null
  SELECTED_ORDER?: number | null
}

export interface ReportSignatureMappingApi {
  MAPPING_ID?: number | null
  COMPANY_CD?: ReportSignatureText
  REPORT_KEY?: ReportSignatureText
  REPORT_CODE?: ReportSignatureText
  REPORT_NAME?: ReportSignatureText
  REPORT_ID?: number | null
  SIGN_IDS?: ReportSignatureText
  SIGNATURES?: ReportSignatureMappingSignatureApi[] | null
}

export interface ReportSignatureMappingSignature {
  ID: number | null
  COMPANY_CD: string
  SIGN_CODE: string
  DISPLAY_LABEL: string
  SIGN_NAME: string
  SIGN_TITLE: string
  SIGN_IMAGE_URL: string
  SORT_ORDER: number | null
  IS_ACTIVE: boolean
  IS_SELECTED: boolean
  SELECTED_ORDER: number | null
}

export interface ReportSignatureMapping {
  MAPPING_ID: number | null
  COMPANY_CD: string
  REPORT_KEY: string
  REPORT_CODE: string
  REPORT_NAME: string
  REPORT_ID: number | null
  SIGN_IDS: string | null
  SIGNATURES: ReportSignatureMappingSignature[]
}

export interface SaveReportSignatureMappingRequest {
  REPORT_CODE?: string | null
  SIGN_CODES: string[]
}
