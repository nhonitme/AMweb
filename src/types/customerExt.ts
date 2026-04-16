export interface CustomerExtApi {
  CUSTOMER_ID?: number | null
  CUSTOMER_EXT_ID?: number | null
  COMPANY_CD?: string | null
  CUSTOMER_CD?: string | null
  CATEGORY_CD?: string | null
  CUSTOMER_TYPE?: string | null
  CUSTOMER_NM_VIET?: string | null
  CUSTOMER_NM_ENG?: string | null
  CUSTOMER_NM_KOR?: string | null
  CUSTOMER_NM_CHINA?: string | null
  ADDRESS?: string | null
  TEL?: string | null
  FAX?: string | null
  TAX_CD?: string | null
  BANK_CD?: string | null
  EMAIL?: string | null
  NOTE?: string | null
  IDNUMBER?: string | null
  ISDEL?: string | boolean | null
  CREATE_BY?: string | null
  UPDATE_BY?: string | null
}

export interface CustomerExt {
  CUSTOMER_ID: number | null
  CUSTOMER_EXT_ID: number | null
  COMPANY_CD: string
  CUSTOMER_CD: string
  CATEGORY_CD: string
  CUSTOMER_TYPE: string
  CUSTOMER_NM_VIET: string
  CUSTOMER_NM_ENG: string
  CUSTOMER_NM_KOR: string
  CUSTOMER_NM_CHINA: string
  ADDRESS: string
  TEL: string
  FAX: string
  TAX_CD: string
  BANK_CD: string
  EMAIL: string
  NOTE: string
  IDNUMBER: string
  ISDEL: boolean
  CREATE_BY: string
  UPDATE_BY: string
}

export interface DeleteCustomerInfosRequest {
  CustomerIds: number[]
}
