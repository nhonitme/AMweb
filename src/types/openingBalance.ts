
//OpeningBalanceSummary

export type OpeningBalanceSummaryStatus =
  | "EMPTY"
  | "BALANCED"
  | "UNBALANCED"

export type OpeningBalanceSummaryModel = {
  ID:number
  ITEM_CD: string
  ITEM_NAME_VIET: string
  ITEM_NAME_ENG: string
  ITEM_NAME_KOR: string
  ITEM_NAME_CHINA: string
  RECORD_COUNT: number
  TOTAL_DEBIT: number
  TOTAL_CREDIT: number
  TOTAL_DEBIT_FC: number
  TOTAL_CREDIT_FC: number
  DIFF_AMOUNT: number
  DIFF_AMOUNT_FC: number
  STATUS: OpeningBalanceSummaryStatus
  ROUTE: string
  NOTE: string
}

//OpeningBalanceCustomer
export type ROW_STATE =
 "INSERT" | "UPDATE" | "DELETE" | "UNCHANGED"

export type BeforeStateCustomer = {
  ROW_ID: string
  ID?: number
  COMPANY_CD?: string
  OPEN_YMD: string
  ACC_CD: string
  ACC_NM_VIET: string
  ACC_NM_ENG: string
  ACC_NM_KOR: string
  ACC_NM_CHINA: string
  CUSTOMER_ID: number
  CUSTOMER_CD: string
  CUSTOMER_NM_VIET: string
  CUSTOMER_NM_ENG: string
  CUSTOMER_NM_KOR: string
  CUSTOMER_NM_CHINA: string
  FC_TYPE?: string
  DEBIT?: number
  CREDIT?: number
  DEBIT_FC?: number
  CREDIT_FC?: number
  EXCHANGE_RATE?: number
  SUMMARY?: string
  NOTE?: string
  ISDEL?: string
  ROW_STATE?: ROW_STATE
}


export function createEmptyRowCustomer(): BeforeStateCustomer {
  return {
    OPEN_YMD: "",
    ROW_ID: `NEW_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ID: 0,
    ACC_CD: "",
    ACC_NM_VIET: "",
    ACC_NM_ENG: "",
    ACC_NM_KOR: "",
    ACC_NM_CHINA: "",
    CUSTOMER_ID: 0,
    CUSTOMER_CD: "",
    CUSTOMER_NM_VIET: "",
    CUSTOMER_NM_ENG: "",
    CUSTOMER_NM_KOR: "",
    CUSTOMER_NM_CHINA: "",
    FC_TYPE: "VND",
    DEBIT: 0,
    CREDIT: 0,
    DEBIT_FC: 0,
    CREDIT_FC: 0,
    EXCHANGE_RATE: 1,
    SUMMARY: "",
    NOTE: "",
    ISDEL: "0",
    ROW_STATE: "INSERT"
  }
}

export const buildBeforeStateCustomerPayload = (
  rows: BeforeStateCustomer[],
  openingYmd: string
): BeforeStateCustomer[] => {
  return rows.map((row) => ({
    OPEN_YMD: openingYmd.toString(),
    ROW_ID: row.ROW_ID,
    ID: row.ID,

    ACC_CD: toText(row.ACC_CD),
    ACC_NM_VIET: toText(row.ACC_NM_VIET),
    ACC_NM_ENG: toText(row.ACC_NM_ENG),
    ACC_NM_KOR: toText(row.ACC_NM_KOR),
    ACC_NM_CHINA: toText(row.ACC_NM_CHINA),

    CUSTOMER_ID: row.CUSTOMER_ID,
    CUSTOMER_CD: toText(row.CUSTOMER_CD),
    CUSTOMER_NM_VIET: toText(row.CUSTOMER_NM_VIET),
    CUSTOMER_NM_ENG: toText(row.CUSTOMER_NM_ENG),
    CUSTOMER_NM_KOR: toText(row.CUSTOMER_NM_KOR),
    CUSTOMER_NM_CHINA: toText(row.CUSTOMER_NM_CHINA),

    FC_TYPE: row.FC_TYPE || "VND",

    DEBIT: Number(row.DEBIT || 0),
    CREDIT: Number(row.CREDIT || 0),
    DEBIT_FC: Number(row.DEBIT_FC || 0),
    CREDIT_FC: Number(row.CREDIT_FC || 0),
    EXCHANGE_RATE: Number(row.EXCHANGE_RATE || 0),

    SUMMARY: row.SUMMARY ?? "",
    NOTE: row.NOTE ?? "",

    ROW_STATE: row.ROW_STATE,
  }))
}

//OpeningBalanceBank
export type BeforeStateBank = {
  ROW_ID: string
  ID?: number
  COMPANY_CD?: string
  OPEN_YMD: string
  ACC_ID?: number | null
  ACC_CD: string
  ACC_NM_VIET: string
  ACC_NM_ENG: string
  ACC_NM_KOR: string
  ACC_NM_CHINA: string
  BANK_ID: number
  BANK_CD: string
  BANK_NM?: string
  BANK_ACCOUNT_NO?: string
  BANK_NM_VIET: string
  BANK_NM_ENG: string
  BANK_NM_KOR: string
  BANK_NM_CHINA: string
  FC_TYPE?: string
  DEBIT?: number
  CREDIT?: number
  DEBIT_FC?: number
  CREDIT_FC?: number
  EXCHANGE_RATE?: number
  SUMMARY?: string
  NOTE?: string
  ISDEL?: string
  ROW_STATE?: ROW_STATE
}


export function createEmptyRowBank(): BeforeStateBank {
  return {
    OPEN_YMD: "",
    ROW_ID: `NEW_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ID: 0,
    ACC_ID: 0,
    ACC_CD: "",
    ACC_NM_VIET: "",
    ACC_NM_ENG: "",
    ACC_NM_KOR: "",
    ACC_NM_CHINA: "",
    BANK_ID: 0,
    BANK_CD: "",
    BANK_NM: "",
    BANK_ACCOUNT_NO: "",
    BANK_NM_VIET: "",
    BANK_NM_ENG: "",
    BANK_NM_KOR: "",
    BANK_NM_CHINA: "",
    FC_TYPE: "VND",
    DEBIT: 0,
    CREDIT: 0,
    DEBIT_FC: 0,
    CREDIT_FC: 0,
    EXCHANGE_RATE: 1,
    SUMMARY: "",
    NOTE: "",
    ISDEL: "0",
    ROW_STATE: "INSERT"
  }
}

export const buildBeforeStateBankPayload = (
  rows: BeforeStateBank[],
  openingYmd: string
): BeforeStateBank[] => {
  return rows.map((row) => {
    const bankNm =
      toText(row.BANK_NM) ||
      toText(row.BANK_NM_VIET) ||
      toText(row.BANK_NM_ENG) ||
      toText(row.BANK_NM_KOR) ||
      toText(row.BANK_NM_CHINA)

    return {
      OPEN_YMD: openingYmd.toString(),
      ROW_ID: row.ROW_ID,
      ID: row.ID,

      ACC_ID: Number(row.ACC_ID || 0),
      ACC_CD: toText(row.ACC_CD),
      ACC_NM_VIET: toText(row.ACC_NM_VIET),
      ACC_NM_ENG: toText(row.ACC_NM_ENG),
      ACC_NM_KOR: toText(row.ACC_NM_KOR),
      ACC_NM_CHINA: toText(row.ACC_NM_CHINA),

      BANK_ID: row.BANK_ID,
      BANK_CD: toText(row.BANK_CD),
      BANK_NM: bankNm,
      BANK_ACCOUNT_NO: toText(row.BANK_ACCOUNT_NO),
      BANK_NM_VIET: toText(row.BANK_NM_VIET) || bankNm,
      BANK_NM_ENG: toText(row.BANK_NM_ENG) || bankNm,
      BANK_NM_KOR: toText(row.BANK_NM_KOR) || bankNm,
      BANK_NM_CHINA: toText(row.BANK_NM_CHINA) || bankNm,

      FC_TYPE: row.FC_TYPE || "VND",

      DEBIT: Number(row.DEBIT || 0),
      CREDIT: Number(row.CREDIT || 0),
      DEBIT_FC: Number(row.DEBIT_FC || 0),
      CREDIT_FC: Number(row.CREDIT_FC || 0),
      EXCHANGE_RATE: Number(row.EXCHANGE_RATE || 0),

      SUMMARY: row.SUMMARY ?? "",
      NOTE: row.NOTE ?? "",

      ROW_STATE: row.ROW_STATE,
    }
  })
}

//OpeningBalanceDepartment
export type BeforeStateDepartment = {
  ROW_ID: string
  ID?: number
  COMPANY_CD?: string
  OPEN_YMD: string
  ACC_ID?: number | null
  ACC_CD: string
  ACC_NM_VIET: string
  ACC_NM_ENG: string
  ACC_NM_KOR: string
  ACC_NM_CHINA: string
  DEPARTMENT_ID: number
  DEPARTMENT_CD: string
  DEPARTMENT_NM?: string
  DEP_NM_VIET: string
  DEP_NM_ENG: string
  DEP_NM_KOR: string
  DEP_NM_CHINA: string
  FC_TYPE?: string
  DEBIT?: number
  CREDIT?: number
  DEBIT_FC?: number
  CREDIT_FC?: number
  EXCHANGE_RATE?: number
  SUMMARY?: string
  NOTE?: string
  ISDEL?: string
  ROW_STATE?: ROW_STATE
}


export function createEmptyRowDepartment(): BeforeStateDepartment {
  return {
    OPEN_YMD: "",
    ROW_ID: `NEW_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ID: 0,
    ACC_ID: 0,
    ACC_CD: "",
    ACC_NM_VIET: "",
    ACC_NM_ENG: "",
    ACC_NM_KOR: "",
    ACC_NM_CHINA: "",
    DEPARTMENT_ID: 0,
    DEPARTMENT_CD: "",
    DEPARTMENT_NM: "",
    DEP_NM_VIET: "",
    DEP_NM_ENG: "",
    DEP_NM_KOR: "",
    DEP_NM_CHINA: "",
    FC_TYPE: "VND",
    DEBIT: 0,
    CREDIT: 0,
    DEBIT_FC: 0,
    CREDIT_FC: 0,
    EXCHANGE_RATE: 1,
    SUMMARY: "",
    NOTE: "",
    ISDEL: "0",
    ROW_STATE: "INSERT"
  }
}

export const buildBeforeStateDepartmentPayload = (
  rows: BeforeStateDepartment[],
  openingYmd: string
): BeforeStateDepartment[] => {
  return rows.map((row) => {
    const departmentNm =
      toText(row.DEPARTMENT_NM) ||
      toText(row.DEP_NM_VIET) ||
      toText(row.DEP_NM_ENG) ||
      toText(row.DEP_NM_KOR) ||
      toText(row.DEP_NM_CHINA)

    return {
      OPEN_YMD: openingYmd.toString(),
      ROW_ID: row.ROW_ID,
      ID: row.ID,

      ACC_ID: Number(row.ACC_ID || 0),
      ACC_CD: toText(row.ACC_CD),
      ACC_NM_VIET: toText(row.ACC_NM_VIET),
      ACC_NM_ENG: toText(row.ACC_NM_ENG),
      ACC_NM_KOR: toText(row.ACC_NM_KOR),
      ACC_NM_CHINA: toText(row.ACC_NM_CHINA),

      DEPARTMENT_ID: row.DEPARTMENT_ID,
      DEPARTMENT_CD: toText(row.DEPARTMENT_CD),
      DEPARTMENT_NM: departmentNm,
      DEP_NM_VIET: toText(row.DEP_NM_VIET) || departmentNm,
      DEP_NM_ENG: toText(row.DEP_NM_ENG) || departmentNm,
      DEP_NM_KOR: toText(row.DEP_NM_KOR) || departmentNm,
      DEP_NM_CHINA: toText(row.DEP_NM_CHINA) || departmentNm,

      FC_TYPE: row.FC_TYPE || "VND",

      DEBIT: Number(row.DEBIT || 0),
      CREDIT: Number(row.CREDIT || 0),
      DEBIT_FC: Number(row.DEBIT_FC || 0),
      CREDIT_FC: Number(row.CREDIT_FC || 0),
      EXCHANGE_RATE: Number(row.EXCHANGE_RATE || 0),

      SUMMARY: row.SUMMARY ?? "",
      NOTE: row.NOTE ?? "",

      ROW_STATE: row.ROW_STATE,
    }
  })
}

//OpeningBalance
export type BeforeState = {
  ROW_ID: string
  ID?: number
  COMPANY_CD?: string
  OPEN_YMD: string
  ACC_CD: string
  ACC_NM_VIET: string
  ACC_NM_ENG: string
  ACC_NM_KOR: string
  ACC_NM_CHINA: string
  FC_TYPE?: string
  DEBIT?: number
  CREDIT?: number
  DEBIT_FC?: number
  CREDIT_FC?: number
  EXCHANGE_RATE?: number
  SUMMARY?: string
  NOTE?: string
  ISDEL?: string
  ROW_STATE?: ROW_STATE
}


export function createEmptyRow(): BeforeState {
  return {
    OPEN_YMD: "",
    ROW_ID: `NEW_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ID: 0,
    ACC_CD: "",
    ACC_NM_VIET: "",
    ACC_NM_ENG: "",
    ACC_NM_KOR: "",
    ACC_NM_CHINA: "",
    FC_TYPE: "VND",
    DEBIT: 0,
    CREDIT: 0,
    DEBIT_FC: 0,
    CREDIT_FC: 0,
    EXCHANGE_RATE: 1,
    SUMMARY: "",
    NOTE: "",
    ISDEL: "0",
    ROW_STATE: "INSERT"
  }
}

const toText = (value?: string | null): string => value?.trim() ?? ""

export const buildBeforeStatePayload = (
  rows: BeforeState[],
  openingYmd: string
): BeforeState[] => {
  return rows.map((row) => ({
    OPEN_YMD: openingYmd.toString(),
    ROW_ID: row.ROW_ID,
    ID: row.ID,

    ACC_CD: toText(row.ACC_CD),
    ACC_NM_VIET: toText(row.ACC_NM_VIET),
    ACC_NM_ENG: toText(row.ACC_NM_ENG),
    ACC_NM_KOR: toText(row.ACC_NM_KOR),
    ACC_NM_CHINA: toText(row.ACC_NM_CHINA),

    FC_TYPE: row.FC_TYPE || "VND",

    DEBIT: Number(row.DEBIT || 0),
    CREDIT: Number(row.CREDIT || 0),
    DEBIT_FC: Number(row.DEBIT_FC || 0),
    CREDIT_FC: Number(row.CREDIT_FC || 0),
    EXCHANGE_RATE: Number(row.EXCHANGE_RATE || 0),

    SUMMARY: row.SUMMARY ?? "",
    NOTE: row.NOTE ?? "",

    ROW_STATE: row.ROW_STATE,
  }))
}