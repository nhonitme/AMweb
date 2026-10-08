import type { EInvoiceSeller } from "./einvoice"

export type EInvoiceSettingText = string | null | undefined

export type EInvoiceDecimalApplyTarget = "TAX_XML" | "INTERNAL_REPORT" | "UI"
export type EInvoiceDecimalFieldScope = "HEADER" | "DETAIL"
export type EInvoiceDecimalCurrencyScope = "ANY" | "VND" | "FC"
export type EInvoiceDecimalRoundMode = "ROUND" | "TRUNCATE" | "CEIL" | "FLOOR"
export type EInvoiceUserSettingValueType = "STRING" | "NUMBER" | "BOOLEAN" | "JSON"

export interface EInvoiceSellerSetting extends EInvoiceSeller {
  ROW_KEY: number
}

export interface EInvoiceTemplateSetting extends EInvoiceSeller {
  ROW_KEY: number
}

export interface EInvoiceSellerPreview {
  SELLER_ID: number
  SELLER_NM: string
  KHMSHDON?: string | null
  KHHDON?: string | null
  XSL_TEMPLATE_NM?: string | null
  XML: string
  XSL: string
  HTML: string
}

export interface EInvoiceTemplateDesignerDraft {
  DESIGN_ID?: number
  CONTENT_ID: number
  XSL_ID: number
  VERSION_NO: number
  SOURCE_TYPE: string
  DESIGN_NM?: string | null
  XSL_CONTENT?: string | null
  LOGO_PATH?: string | null
  INVOICE_BACKGROUND_PATH?: string | null
  INVOICE_BORDER_PATH?: string | null
  BACKGROUND_PATH?: string | null
}

export interface EInvoiceDecimalSetting {
  SETTING_ID: number
  COMPANY_CD: string
  XSL_ID: number
  APPLY_TARGET: EInvoiceDecimalApplyTarget
  FIELD_SCOPE: EInvoiceDecimalFieldScope
  FIELD_NAME: string
  LABEL_TEXT?: EInvoiceSettingText
  CAPTION?: EInvoiceSettingText
  CURRENCY_SCOPE: EInvoiceDecimalCurrencyScope
  DECIMAL_SCALE: number
  ROUND_MODE: EInvoiceDecimalRoundMode
  IS_ACTIVE: number
  SORT_ORDER: number
  NOTE: string
}

export type EInvoiceSellerSettingSearchParams = import("./einvoice").EInvoiceSellerSearchParams

export interface EInvoiceDecimalSettingSearchParams {
  settingId?: number
  xslId?: number
  applyTarget?: EInvoiceDecimalApplyTarget | ""
  fieldScope?: EInvoiceDecimalFieldScope | ""
  keyword?: string
  includeInactive?: boolean
}

export interface EInvoiceUserSetting {
  SETTING_ID: number
  COMPANY_CD: string
  USER_ID: string
  SETTING_KEY: string
  SETTING_VALUE: string | null
  VALUE_TYPE: EInvoiceUserSettingValueType
  ISDEL: number
}

export interface EInvoiceUserSettingSearchParams {
  settingId?: number
  userId?: string
  keyword?: string
  includeDeleted?: boolean
}

export interface EInvoiceAdminSetting {
  SETTING_ID: number
  COMPANY_CD: string
  USER_ID: string
  SETTING_TYPE: string
  SETTING_KEY: string
  SETTING_VALUE: string | null
  VALUE_TYPE: EInvoiceUserSettingValueType
  ISDEL: number
}

export interface EInvoiceAdminSettingSearchParams {
  settingId?: number
  settingType?: string
  keyword?: string
  includeDeleted?: boolean
}

export type EInvoiceMailSecurityType = "NONE" | "SSL" | "STARTTLS"
export type EInvoiceMailAuthType = "NONE" | "PASSWORD" | "OAUTH2"

export interface EInvoiceMailSendOptions {
  Cc?: string | null
  Bcc?: string | null
  TimeoutMs?: number
  SendAll?: boolean
  AttachPdf?: boolean
  AttachXml?: boolean
}

export interface EInvoiceMailSetting {
  MAIL_ID: number
  COMPANY_CD: string
  MAIL_CD: string
  MAIL_NM: string
  SMTP_HOST: string
  SMTP_PORT: number
  SECURITY_TYPE: EInvoiceMailSecurityType | string
  AUTH_TYPE: EInvoiceMailAuthType | string
  USERNAME?: string | null
  HAS_PASSWORD: boolean
  FROM_EMAIL: string
  FROM_NAME?: string | null
  REPLY_TO_EMAIL?: string | null
  CONFIG: EInvoiceMailSendOptions
  IS_DEFAULT: number
  IS_ACTIVE: number
  HAS_COMPANY_SETTING: boolean
  IS_USING_SYSTEM_DEFAULT: boolean
  SYSTEM_SETTING?: EInvoiceMailSetting | null
}

export interface EInvoiceMailSettingSaveRequest {
  MAIL_ID?: number
  MAIL_NM?: string
  SMTP_HOST?: string
  SMTP_PORT?: number
  SECURITY_TYPE?: string
  AUTH_TYPE?: string
  USERNAME?: string
  PASSWORD?: string
  FROM_EMAIL?: string
  FROM_NAME?: string
  REPLY_TO_EMAIL?: string
  CONFIG?: EInvoiceMailSendOptions
  IS_DEFAULT?: number
  IS_ACTIVE?: number
  USE_SYSTEM_DEFAULT?: boolean
}
