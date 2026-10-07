import type { CustomerExt, CustomerExtApi } from "@/types/customerExt"
import { normalizeTaxCode } from "@/lib/taxCode"

const trimText = (value: string | undefined | null): string => (typeof value === "string" ? value.trim() : "")
const toFlag = (value: boolean): "1" | "0" => (value ? "1" : "0")
const toBool = (value: string | boolean | undefined | null): boolean => {
  if (typeof value === "boolean") return value
  const normalized = (value ?? "").toString().trim().toUpperCase()
  return normalized === "1" || normalized === "Y" || normalized === "TRUE" || normalized === "T"
}



export const normalizeCustomerExt = (record: CustomerExtApi): CustomerExt => ({
  CUSTOMER_ID: typeof record.CUSTOMER_ID === "number" ? record.CUSTOMER_ID : null,
  CUSTOMER_EXT_ID: typeof record.CUSTOMER_EXT_ID === "number" ? record.CUSTOMER_EXT_ID : null,
  COMPANY_CD: trimText(record.COMPANY_CD),
  CUSTOMER_CD: trimText(record.CUSTOMER_CD),
  CATEGORY_CD: trimText(record.CATEGORY_CD),
  CUSTOMER_TYPE: trimText(record.CUSTOMER_TYPE),
  CUSTOMER_NM_VIET: trimText(record.CUSTOMER_NM_VIET),
  CUSTOMER_NM_ENG: trimText(record.CUSTOMER_NM_ENG),
  CUSTOMER_NM_KOR: trimText(record.CUSTOMER_NM_KOR),
  CUSTOMER_NM_CHINA: trimText(record.CUSTOMER_NM_CHINA),
  ADDRESS: trimText(record.ADDRESS),
  TEL: trimText(record.TEL),
  FAX: trimText(record.FAX),
  TAX_CD: normalizeTaxCode(record.TAX_CD),
  BANK_ID: typeof record.BANK_ID === "number" ? record.BANK_ID : null,
  BANK_CD: trimText(record.BANK_CD),
  BANK_NM: trimText(record.BANK_NM),
  EMAIL: trimText(record.EMAIL),
  NOTE: trimText(record.NOTE),
  IDNUMBER: trimText(record.IDNUMBER),
  BUYER_NM: trimText(record.BUYER_NM),
  ISDEL: toBool(record.ISDEL),

  CREATE_BY: trimText(record.CREATE_BY),

  UPDATE_BY: trimText(record.UPDATE_BY),
})

export const normalizeCustomerExtRows = (records: CustomerExtApi[]): CustomerExt[] => records.map(normalizeCustomerExt)

export const mapCustomerExtToApiPayload = (record: CustomerExt): Partial<CustomerExtApi> => ({
  CUSTOMER_ID: record.CUSTOMER_ID,
  CUSTOMER_EXT_ID: record.CUSTOMER_EXT_ID,
  COMPANY_CD: trimText(record.COMPANY_CD),
  CUSTOMER_CD: trimText(record.CUSTOMER_CD),
  CATEGORY_CD: trimText(record.CATEGORY_CD),
  CUSTOMER_TYPE: trimText(record.CUSTOMER_TYPE),
  CUSTOMER_NM_VIET: trimText(record.CUSTOMER_NM_VIET),
  CUSTOMER_NM_ENG: trimText(record.CUSTOMER_NM_ENG),
  CUSTOMER_NM_KOR: trimText(record.CUSTOMER_NM_KOR),
  CUSTOMER_NM_CHINA: trimText(record.CUSTOMER_NM_CHINA),
  ADDRESS: trimText(record.ADDRESS),
  TEL: trimText(record.TEL),
  FAX: trimText(record.FAX),
  TAX_CD: normalizeTaxCode(record.TAX_CD),
  BANK_ID: record.BANK_ID ?? null,
  BANK_CD: trimText(record.BANK_CD),
  BANK_NM: trimText(record.BANK_NM),
  EMAIL: trimText(record.EMAIL),
  NOTE: trimText(record.NOTE),
  IDNUMBER: trimText(record.IDNUMBER),
  BUYER_NM: trimText(record.BUYER_NM),
  ISDEL: toFlag(record.ISDEL),
  CREATE_BY: trimText(record.CREATE_BY),
  UPDATE_BY: trimText(record.UPDATE_BY),
})

export const createDefaultCustomerExt = (companyCd: string, userId: string): CustomerExt => ({
  CUSTOMER_ID: null,
  CUSTOMER_EXT_ID: null,
  COMPANY_CD: companyCd,
  CUSTOMER_CD: "",
  CATEGORY_CD: "",
  CUSTOMER_TYPE: "",
  CUSTOMER_NM_VIET: "",
  CUSTOMER_NM_ENG: "",
  CUSTOMER_NM_KOR: "",
  CUSTOMER_NM_CHINA: "",
  ADDRESS: "",
  TEL: "",
  FAX: "",
  TAX_CD: "",
  BANK_ID: null,
  BANK_CD: "",
  BANK_NM: "",
  EMAIL: "",
  NOTE: "",
  IDNUMBER: "",
  BUYER_NM: "",
  ISDEL: false,
  CREATE_BY: userId,
  UPDATE_BY: userId,
})
