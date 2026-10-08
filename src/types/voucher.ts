export type ChitType =
  | "RC"
  | "PM"
  | "DN"
  | "CN"
  | "PO"
  | "IR"
  | "IA"
  | "PS"
  | "PD"
  | "PR"
  | "SO"
  | "SD"
  | "SR"
  | "IO"
  | "CO"
  | "OT"

export type ChitLedger = "AP" | "AR"
export type InventoryInputType = ChitLedger | "INV"
export type ChitText = string | null | undefined
export type ChitFlag = "0" | "1" | boolean | null | undefined
export type ChitDateValue = string | number | Date | null | undefined

export type InventoryText = string | null | undefined
export type InventoryFlag = "0" | "1" | boolean | null | undefined
export type InventoryDateValue = string | number | Date | null | undefined

export interface InventoryInputApi {
  INPUT_ID?: number | null
  INPUT_CD?: InventoryText
  INVENTORY_ID?: number | null
  INVENTORY_CD?: InventoryText
  CHIT_TYPE?: InventoryText
  COMPANY_CD?: InventoryText
  PRODUCT_ID?: number | null
  PRODUCT_CD?: InventoryText
  PRODUCT_NM_VIET?: InventoryText
  PRODUCT_NM_ENG?: InventoryText
  PRODUCT_NM_KOR?: InventoryText
  PRODUCT_NM_CHINA?: InventoryText
  STORE_ID?: number | null
  STORE_CD?: InventoryText
  STORE_NM_VIET?: InventoryText
  STORE_NM_ENG?: InventoryText
  STORE_NM_KOR?: InventoryText
  STORE_NM_CHINA?: InventoryText
  UNIT_ID?: number | null
  UNIT_CD?: InventoryText
  UNIT_NM_VIET?: InventoryText
  UNIT_NM_ENG?: InventoryText
  UNIT_NM_KOR?: InventoryText
  UNIT_NM_CHINA?: InventoryText
  QUANTITY?: number | null
  UNIT_PRICE_CC?: number | null
  FC_TYPE?: InventoryText
  UNIT_PRICE_FC?: number | null
  EXCHANGE_RATES?: number | null
  AMOUNT_CC?: number | null
  AMOUNT_FC?: number | null
  SUMMARY?: InventoryText
  INVENTORY_YMD?: InventoryDateValue
  STATE?: InventoryText
  CHITDETAIL_ID?: number | null
  CHITDETAIL_CD?: InventoryText
  SORT?: number | null
  ISDEL?: InventoryFlag
}

export interface InventoryOutputApi {
  COGS_DEBIT?: string | null
  COGS_CREDIT?: string | null
  OUTPUT_ID?: number | null
  OUTPUT_CD?: InventoryText
  INVENTORY_ID?: number | null
  INVENTORY_CD?: InventoryText
  CHIT_TYPE?: InventoryText
  COMPANY_CD?: InventoryText
  PRODUCT_ID?: number | null
  PRODUCT_CD?: InventoryText
  PRODUCT_NM_VIET?: InventoryText
  PRODUCT_NM_ENG?: InventoryText
  PRODUCT_NM_KOR?: InventoryText
  PRODUCT_NM_CHINA?: InventoryText
  STORE_ID?: number | null
  STORE_CD?: InventoryText
  STORE_NM_VIET?: InventoryText
  STORE_NM_ENG?: InventoryText
  STORE_NM_KOR?: InventoryText
  STORE_NM_CHINA?: InventoryText
  TO_STORE_ID?: number | null
  TO_STORE_CD?: InventoryText
  TO_STORE_NM_VIET?: InventoryText
  TO_STORE_NM_ENG?: InventoryText
  TO_STORE_NM_KOR?: InventoryText
  TO_STORE_NM_CHINA?: InventoryText
  UNIT_ID?: number | null
  UNIT_CD?: InventoryText
  UNIT_NM_VIET?: InventoryText
  UNIT_NM_ENG?: InventoryText
  UNIT_NM_KOR?: InventoryText
  UNIT_NM_CHINA?: InventoryText
  QUANTITY?: number | null
  UNIT_PRICE_CC?: number | null
  FC_TYPE?: InventoryText
  UNIT_PRICE_FC?: number | null
  EXCHANGE_RATES?: number | null
  AMOUNT_CC?: number | null
  AMOUNT_FC?: number | null
  SUMMARY?: InventoryText
  INVENTORY_YMD?: InventoryDateValue
  INPUT_INVENTORY_YMD?: InventoryDateValue
  OUTPUT_INVENTORY_YMD?: InventoryDateValue
  STATE?: InventoryText
  CHITDETAIL_ID?: number | null
  CHITDETAIL_CD?: InventoryText
  SORT?: number | null
  ISDEL?: InventoryFlag
}

export interface InventoryInputLine {
  ROW_KEY: string
  INPUT_ID: number | null
  INPUT_CD: string
  INVENTORY_ID: number | null
  INVENTORY_CD: string
  CHIT_TYPE: string
  COMPANY_CD: string
  PRODUCT_ID: number | null
  PRODUCT_CD: string
  PRODUCT_NM_VIET: string
  PRODUCT_NM_ENG: string
  PRODUCT_NM_KOR: string
  PRODUCT_NM_CHINA: string
  STORE_ID: number | null
  STORE_CD: string
  STORE_NM_VIET: string
  STORE_NM_ENG: string
  STORE_NM_KOR: string
  STORE_NM_CHINA: string
  UNIT_ID: number | null
  UNIT_CD: string
  UNIT_NM_VIET: string
  UNIT_NM_ENG: string
  UNIT_NM_KOR: string
  UNIT_NM_CHINA: string
  QUANTITY: number | null
  UNIT_PRICE_CC: number | null
  FC_TYPE: string
  UNIT_PRICE_FC: number | null
  EXCHANGE_RATES: number | null
  AMOUNT_CC: number | null
  AMOUNT_FC: number | null
  SUMMARY: string
  INVENTORY_YMD: InventoryDateValue
  STATE: string
  CHITDETAIL_ID: number | null
  CHITDETAIL_CD: string
  SORT: number | null
  ISDEL: boolean
}

export interface InventoryOutputLine {
  COGS_DEBIT?: string | null
  COGS_CREDIT?: string | null
  ROW_KEY: string
  OUTPUT_ID: number | null
  OUTPUT_CD: string
  INVENTORY_ID: number | null
  INVENTORY_CD: string
  CHIT_TYPE: string
  COMPANY_CD: string
  PRODUCT_ID: number | null
  PRODUCT_CD: string
  PRODUCT_NM_VIET: string
  PRODUCT_NM_ENG: string
  PRODUCT_NM_KOR: string
  PRODUCT_NM_CHINA: string
  STORE_ID: number | null
  STORE_CD: string
  STORE_NM_VIET: string
  STORE_NM_ENG: string
  STORE_NM_KOR: string
  STORE_NM_CHINA: string
  TO_STORE_ID: number | null
  TO_STORE_CD: string
  TO_STORE_NM_VIET: string
  TO_STORE_NM_ENG: string
  TO_STORE_NM_KOR: string
  TO_STORE_NM_CHINA: string
  UNIT_ID: number | null
  UNIT_CD: string
  UNIT_NM_VIET: string
  UNIT_NM_ENG: string
  UNIT_NM_KOR: string
  UNIT_NM_CHINA: string
  QUANTITY: number | null
  UNIT_PRICE_CC: number | null
  FC_TYPE: string
  UNIT_PRICE_FC: number | null
  EXCHANGE_RATES: number | null
  AMOUNT_CC: number | null
  AMOUNT_FC: number | null
  SUMMARY: string
  INVENTORY_YMD: InventoryDateValue
  INPUT_INVENTORY_YMD?: InventoryDateValue
  OUTPUT_INVENTORY_YMD?: InventoryDateValue
  STATE: string
  CHITDETAIL_ID: number | null
  CHITDETAIL_CD: string
  SORT: number | null
  ISDEL: boolean
}

export interface ChitDetailApi {
  CHITDETAIL_ID?: number | null
  COMPANY_CD?: ChitText
  CHIT_ID?: number | null
  CHITDETAIL_CD?: ChitText
  CHIT_YMD?: ChitDateValue
  CHIT_VMD?: ChitDateValue
  DEBIT?: ChitText
  CREDIT?: ChitText
  DEBIT_NM_VIET?: ChitText
  DEBIT_NM_ENG?: ChitText
  DEBIT_NM_KOR?: ChitText
  DEBIT_NM_CHINA?: ChitText
  CREDIT_NM_VIET?: ChitText
  CREDIT_NM_ENG?: ChitText
  CREDIT_NM_KOR?: ChitText
  CREDIT_NM_CHINA?: ChitText
  AMOUNT?: number | null
  FC_AMOUNT?: number | null
  FC_TYPE?: ChitText
  FC_RATE?: number | null
  FC_DATETIME?: ChitDateValue
  SORT?: number | null
  ISDEL?: ChitFlag
  CHITDETAIL_VAT_CD?: ChitText
  MG_CD?: ChitText
  MG_CD_2?: ChitText
  MR_CD?: ChitText
  MR_CD2?: ChitText
  BANK_ID?: number | null
  BANK_CD?: ChitText
  BANK_OWN_CD?: ChitText
  CUSTOMER_ID?: number | null
  CUSTOMER_CD?: ChitText
  CUSTOMER_NM_VIET?: ChitText
  CUSTOMER_NM_ENG?: ChitText
  CUSTOMER_NM_KOR?: ChitText
  CUSTOMER_NM_CHINA?: ChitText
  CUSTOMER_OWN_CD?: ChitText
  DEPARTMENT_ID?: number | null
  DEPARTMENT_CD?: ChitText
  DEPARTMENT_CD_2?: ChitText
  HASINVENTORY?: ChitFlag
  INVENTORY_YMD?: ChitDateValue
  ISPAY?: ChitFlag
  ISCOLLECT?: ChitFlag
  VAT_INPUT_CD?: ChitText
  PRODUCT_NM_VIET?: ChitText
  UNIT_NM?: ChitText
  QUANTITY?: number | null
  UNIT_PRICE?: number | null
  PRODUCT_AMOUNT?: number | null
  VAT_TYPE?: ChitText
  PERCENT?: number | null
  PRODUCT_VAT_AMOUNT?: number | null
  PRODUCT_NOTE?: ChitText
  VAT_SERIAL_NO?: ChitText
  VAT_CHIT_NO?: ChitText
  VAT_CHIT_NO_2?: ChitText
  VAT_AMOUNT?: number | null
  VAT_TAXABLE_AMOUNT?: number | null
  FO_VAT_AMOUNT?: number | null
  VAT_ISFREE?: ChitFlag
  VAT_INVOICE_CD?: ChitText
  VAT_INVOICE_NM?: ChitText
  VAT_INFO_TYPE?: ChitText
  VAT_COMPANY_ISSUE?: ChitText
  VAT_COMPANY_ISSUE_ADDRESS?: ChitText
  VAT_COMPANY_ISSUE_CD?: ChitText
  VAT_COMPANY_TAXCD?: ChitText
  VAT_PRODUCT_NM?: ChitText
  VAT_ETC?: ChitText
  VAT_YMD?: ChitDateValue
  VAT_YMD_2?: ChitDateValue
  VAT_INQUIRY_IN?: ChitText
  VAT_INQUIRY_CODE?: ChitText
  IS_NEXTVAT?: ChitFlag
  UNDEFINE?: ChitText
  DETAIL_DESCRIPTION_VIET?: ChitText
  DETAIL_DESCRIPTION_ENG?: ChitText
  DETAIL_DESCRIPTION_KOR?: ChitText
  INVENTORY_INPUTS?: InventoryInputApi[] | null
  INVENTORY_OUTPUTS?: InventoryOutputApi[] | null
}

export interface ChitApi {
  CHIT_ID?: number | null
  COMPANY_CD?: ChitText
  CHIT_CD?: ChitText
  CHIT_NO?: ChitText
  CHIT_YMD?: ChitDateValue
  CHIT_TYPE?: ChitType | ChitText
  INPUT_TYPE?: ChitText
  LOCK_STEP_CODE?: ChitText
  AMOUNT?: number | null
  PAYER_INFO?: ChitText
  ISDEL?: ChitFlag
  IS_LOCK?: ChitFlag
  ISEXCEL?: ChitFlag
  EMAIL_EPAY?: ChitText
  IS_CONFIRMED?: ChitFlag
  NOTE?: ChitText
  DAY_OF_PAYMENT?: number | null
  TIME_FOR_PAYMENT?: ChitText
  IS_PAYMENT?: ChitFlag
  CHIT_CD_COGS?: ChitText
  DESCRIPTION_VIET?: ChitText
  DESCRIPTION_ENG?: ChitText
  DESCRIPTION_KOR?: ChitText
  DETAIL_COUNT?: number | null
  DETAILS?: ChitDetailApi[] | null
}

export interface InventoryCogs {
  CHIT_ID: number
  CHIT_CD: string
  CHIT_NO: string
  CHIT_YMD: string
  AMOUNT: number
  IS_LOCK: string
  DETAILS: Array<{
    OUTPUT_ID: number
    CHITDETAIL_ID: number
    CHITDETAIL_CD: string
    DEBIT: string
    CREDIT: string
    AMOUNT: number
  }>
}

export interface InventoryVoucherApi {
  COGS?: InventoryCogs | null
  CHIT_ID?: number | null
  COMPANY_CD?: ChitText
  INPUT_TYPE?: InventoryInputType | ChitText
  CHIT_CD?: ChitText
  CHIT_NO?: ChitText
  CHIT_YMD?: ChitDateValue
  CHIT_TYPE?: ChitType | ChitText
  AMOUNT?: number | null
  TOTAL_QTY?: number | null
  REMARK?: ChitText
  PAYER_INFO?: ChitText
  ISDEL?: ChitFlag
  IS_LOCK?: ChitFlag
  ISEXCEL?: ChitFlag
  EMAIL_EPAY?: ChitText
  IS_CONFIRMED?: ChitFlag
  NOTE?: ChitText
  DAY_OF_PAYMENT?: number | null
  TIME_FOR_PAYMENT?: ChitText
  IS_PAYMENT?: ChitFlag
  CHIT_CD_COGS?: ChitText
  DESCRIPTION_VIET?: ChitText
  DESCRIPTION_ENG?: ChitText
  DESCRIPTION_KOR?: ChitText
  INPUTS?: InventoryInputApi[] | null
  OUTPUTS?: InventoryOutputApi[] | null
}

export interface ChitDetail {
  ROW_KEY: string
  CHITDETAIL_ID: number | null
  COMPANY_CD: string
  CHIT_ID: number | null
  CHITDETAIL_CD: string
  CHIT_YMD: ChitDateValue
  CHIT_VMD: ChitDateValue
  DEBIT: string
  CREDIT: string
  DEBIT_NM_VIET: string
  DEBIT_NM_ENG: string
  DEBIT_NM_KOR: string
  DEBIT_NM_CHINA: string
  CREDIT_NM_VIET: string
  CREDIT_NM_ENG: string
  CREDIT_NM_KOR: string
  CREDIT_NM_CHINA: string
  AMOUNT: number | null
  FC_AMOUNT: number | null
  FC_TYPE: string
  FC_RATE: number | null
  FC_DATETIME: ChitDateValue
  SORT: number | null
  ISDEL: boolean
  CHITDETAIL_VAT_CD: string
  MG_CD: string
  MG_CD_2: string
  MR_CD: string
  MR_CD2: string
  BANK_ID: number | null
  BANK_CD: string
  BANK_OWN_CD: string
  CUSTOMER_ID: number | null
  CUSTOMER_CD: string
  CUSTOMER_NM_VIET: string
  CUSTOMER_NM_ENG: string
  CUSTOMER_NM_KOR: string
  CUSTOMER_NM_CHINA: string
  CUSTOMER_OWN_CD: string
  DEPARTMENT_ID: number | null
  DEPARTMENT_CD: string
  DEPARTMENT_CD_2: string
  HASINVENTORY: boolean
  INVENTORY_YMD: ChitDateValue
  ISPAY: boolean
  ISCOLLECT: boolean
  VAT_INPUT_CD: string
  PRODUCT_NM_VIET: string
  UNIT_NM: string
  QUANTITY: number | null
  UNIT_PRICE: number | null
  PRODUCT_AMOUNT: number | null
  VAT_TYPE: string
  PERCENT: number | null
  PRODUCT_VAT_AMOUNT: number | null
  PRODUCT_NOTE: string
  VAT_SERIAL_NO: string
  VAT_CHIT_NO: string
  VAT_CHIT_NO_2: string
  VAT_AMOUNT: number | null
  VAT_TAXABLE_AMOUNT: number | null
  FO_VAT_AMOUNT: number | null
  VAT_ISFREE: boolean
  VAT_INVOICE_CD: string
  VAT_INVOICE_NM: string
  VAT_INFO_TYPE: string
  VAT_COMPANY_ISSUE: string
  VAT_COMPANY_ISSUE_ADDRESS: string
  VAT_COMPANY_ISSUE_CD: string
  VAT_COMPANY_TAXCD: string
  VAT_PRODUCT_NM: string
  VAT_ETC: string
  VAT_YMD: ChitDateValue
  VAT_YMD_2: ChitDateValue
  VAT_INQUIRY_IN: string
  VAT_INQUIRY_CODE: string
  IS_NEXTVAT: boolean
  UNDEFINE: string
  DETAIL_DESCRIPTION_VIET: string
  DETAIL_DESCRIPTION_ENG: string
  DETAIL_DESCRIPTION_KOR: string
  INVENTORY_INPUTS: InventoryInputLine[]
  INVENTORY_OUTPUTS: InventoryOutputLine[]
}

export interface ChitInfo {
  CHIT_ID: number | null
  COMPANY_CD: string
  CHIT_CD: string
  CHIT_NO: string
  CHIT_YMD: ChitDateValue
  CHIT_TYPE: ChitType
  INPUT_TYPE?: string
  LOCK_STEP_CODE?: string
  AMOUNT: number | null
  PAYER_INFO: string
  ISDEL: boolean
  IS_LOCK: boolean
  ISEXCEL: boolean
  EMAIL_EPAY: string
  IS_CONFIRMED: boolean
  NOTE: string
  DAY_OF_PAYMENT: number | null
  TIME_FOR_PAYMENT: string
  IS_PAYMENT: boolean
  CHIT_CD_COGS: string
  DESCRIPTION_VIET: string
  DESCRIPTION_ENG: string
  DESCRIPTION_KOR: string
  DETAIL_COUNT: number
  DETAILS: ChitDetail[]
}

export interface InventoryVoucher {
  COGS?: InventoryCogs | null
  CHIT_ID: number | null
  COMPANY_CD: string
  INPUT_TYPE: InventoryInputType
  CHIT_CD: string
  CHIT_NO: string
  CHIT_YMD: ChitDateValue
  CHIT_TYPE: Extract<ChitType, "IR" | "IO" | "IA">
  AMOUNT: number | null
  TOTAL_QTY: number | null
  REMARK: string
  PAYER_INFO: string
  ISDEL: boolean
  IS_LOCK: boolean
  ISEXCEL: boolean
  EMAIL_EPAY: string
  IS_CONFIRMED: boolean
  NOTE: string
  DAY_OF_PAYMENT: number | null
  TIME_FOR_PAYMENT: string
  IS_PAYMENT: boolean
  CHIT_CD_COGS: string
  DESCRIPTION_VIET: string
  DESCRIPTION_ENG: string
  DESCRIPTION_KOR: string
  INPUTS: InventoryInputLine[]
  OUTPUTS: InventoryOutputLine[]
}

export interface InventoryLinkedVoucherSummary {
  INVENTORY_CHIT_ID: number
  INVENTORY_CHIT_CD: string
  INVENTORY_CHIT_NO: string | null
  INVENTORY_CHIT_YMD: string | null
  INVENTORY_CHIT_TYPE: string
  LINKED_QUANTITY: number
  LINKED_LINE_COUNT: number
}

export interface InventoryLinkStatus {
  CHIT_ID: number
  CHIT_CD: string
  CHIT_TYPE: string
  SOURCE_TOTAL_QUANTITY: number
  LINKED_TOTAL_QUANTITY: number
  REMAINING_QUANTITY: number
  INVENTORY_VOUCHER_COUNT: number
  INVENTORY_STATUS: "NONE" | "PARTIAL" | "FULL" | string
  INVENTORY_VOUCHERS: InventoryLinkedVoucherSummary[]
  LINKED_CHITDETAIL_IDS: number[]
}

export interface InventorySourceVoucher {
  CHIT_ID: number
  CHIT_CD: string
  CHIT_TYPE: string
  CHITDETAIL_ID: number
  CHITDETAIL_CD: string
}

export type VoucherSourceInventoryAction =
  | "inventory_input"
  | "inventory_output"
  | "create_sales_voucher"
  | "create_purchase_voucher"
  | "create_sales_discount_voucher"
  | "create_sales_return_voucher"
  | "create_purchase_discount_voucher"
  | "create_purchase_return_voucher"

export interface VoucherCreateFromSourceState {
  sourceVoucher: ChitInfo
  sourceLedger: ChitLedger
  sourceChitType: ChitType
  sourceAction: VoucherSourceInventoryAction
}

export interface VoucherOpenLocationState {
  openChitId?: number
  openMode?: "edit"
  createFromSource?: VoucherCreateFromSourceState | null
}
