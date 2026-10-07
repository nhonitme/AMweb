export type CompanySignatureText = string | null | undefined

export interface CompanySignatureInfoApi {
  ID?: number | null
  COMPANY_CD?: CompanySignatureText
  SIGN_CODE?: CompanySignatureText
  DISPLAY_LABEL?: CompanySignatureText
  SIGN_NAME?: CompanySignatureText
  SIGN_TITLE?: CompanySignatureText
  SIGN_IMAGE_URL?: CompanySignatureText
  SORT_ORDER?: number | null
  IS_ACTIVE?: CompanySignatureText | boolean
  ISDEL?: CompanySignatureText | boolean
  CREATE_BY?: CompanySignatureText
  UPDATE_BY?: CompanySignatureText
}

export interface CompanySignatureInfo {
  ID: number | null
  COMPANY_CD: string
  SIGN_CODE: string
  DISPLAY_LABEL: string
  SIGN_NAME: string
  SIGN_TITLE: string
  SIGN_IMAGE_URL: string
  SORT_ORDER: number
  IS_ACTIVE: boolean
  ISDEL: boolean
  CREATE_BY: string
  UPDATE_BY: string
}

export interface DeleteCompanySignaturesRequest {
  SignatureIds: number[]
}
