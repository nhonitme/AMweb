export interface CompanyInfo {
  COMPANY_CD: string;
  COMPANY_NM: string | null;
  COMPANY_NM_EN: string | null;
  COMPANY_NM_KOR: string | null;
  COMPANY_TYPE: number | null;
  COMPANY_KIND: number | null;
  DE_COMPANY_CD: string | null;
  COMPANY_LV: string | null;
  ACCDATE_CD: string | null;
  TAX_CD: string | null;
  CCCDan: string | null;
  TCQTQLy: string | null;
  MCQTQLy: string | null;
  BRN: string | null;
  CRN: string | null;
  OWNER_NM: string | null;
  ZIP_CODE: string | null;
  ADDRESS_DO: string | null;
  ADDRESS: string | null;
  ADDRESS_ENG: string | null;
  ADDRESS_KOR: string | null;
  CARRYFORWARD_YMD: string | null;
  SIDO: string | null;
  GUMYUN: string | null;
  BUSINESS_TYPE: string | null;
  KIND_BUSINESS: string | null;
  TEL: string | null;
  EMAIL: string | null;
  WEBSITE: string | null;
  FAX: string | null;
  STOCKCALC_TYPE: string | null;
  OPEN_YMD: string | null;
  DECISION: string | null;
  NOTE: string | null;
}

export type CompanyInfoUpdateRequest = Partial<CompanyInfo>;

export interface CompanyInfoApiResponse {
  data: CompanyInfo;
  exists: boolean;
}
