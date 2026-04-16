export type BankDepositBookModule = "ALL" | "AR" | "AP"
export type BankDepositBookRowType = "OPENING" | "DETAIL" | "TOTAL_RECEIPT" | "TOTAL_PAYMENT" | "CLOSING"

export interface BankDepositBookReportRequest {
  fromDate: string | null
  toDate: string | null
  moduleCd?: BankDepositBookModule | null
  bankCd?: string | null
  fcType?: string | null
}

export interface BankDepositBookRow {
  ROW_KEY: string
  ROW_TYPE: BankDepositBookRowType | string
  MODULE_CD: string
  COMPANY_CD: string
  CHIT_ID: number
  CHITDETAIL_ID: number
  CHIT_CD: string
  CHIT_NO: string
  CHIT_YMD?: string | null
  CHIT_TYPE: string
  CHITDETAIL_CD: string
  DEBIT: string
  CREDIT: string
  AMOUNT: number
  FC_AMOUNT: number
  FC_TYPE: string
  FC_RATE: number
  FC_DATETIME?: string | null
  BANK_CD: string
  BANK_OWN_CD: string
  CUSTOMER_CD: string
  CUSTOMER_ID?: number | null
  ISPAY: string
  ISCOLLECT: string
  BANK_FLOW_TYPE: string
  RECEIPT_AMOUNT: number
  PAYMENT_AMOUNT: number
  RECEIPT_FC_AMOUNT: number
  PAYMENT_FC_AMOUNT: number
  HEADER_DESCRIPTION: string
  DETAIL_DESCRIPTION: string
  DESCRIPTION: string
  RUNNING_AMOUNT: number
  RUNNING_FC_AMOUNT: number
}
