export interface CompanyDecimalSettingItem {
  ID: number | null;
  COMPANY_CD: string;
  SETTING_TYPE: string;
  DECIMAL_PLACES: number;
  ROUNDING_MODE: string;
  USE_THOUSAND_SEPARATOR: string;
  IS_ACTIVE: string;
  NOTE: string | null;
  APPLY_SCOPE?: string | null;
}

export interface CompanyDecimalFieldSettingItem extends CompanyDecimalSettingItem {
  FIELD_NAME: string;
  LABEL_TEXT?: string | null;
  CAPTION?: string | null;
}

export interface CompanyDecimalSettingUpdateRequest {
  COMPANY_CD: string;
  DECIMAL_PLACES: number;
  ROUNDING_MODE: string;
  USE_THOUSAND_SEPARATOR: string;
  IS_ACTIVE: string;
  NOTE: string;
}
