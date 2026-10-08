import type {
  ChitInfo,
  ChitApi,
  ChitDateValue,
  ChitDetail,
  ChitDetailApi,
  ChitFlag,
  ChitText,
  ChitType,
  InventoryInputApi,
  InventoryInputLine,
  InventoryOutputApi,
  InventoryOutputLine,
  InventoryVoucher,
} from "@/types/voucher"
import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"
import { normalizeDateTime } from "@/lib/dateParser"
export { normalizeDateTime }

const trimText = (value: ChitText): string => (typeof value === "string" ? value.trim() : "")

const normalizeDate = (value: ChitDateValue): ChitDateValue => {
  if (value == null || value === "") {
    return value
  }

  const formatDate = (date: Date): string => {
    const year = date.getFullYear()
    const month = String(date.getMonth() + 1).padStart(2, "0")
    const day = String(date.getDate()).padStart(2, "0")
    return `${year}${month}${day}`
  }

  if (value instanceof Date) {
    return formatDate(value)
  }

  if (typeof value === "number") {
    const text = String(value).trim()
    if (/^\d{8}$/.test(text)) {
      return text
    }

    const parsed = new Date(value)
    if (!isNaN(parsed.getTime())) {
      return formatDate(parsed)
    }

    return text
  }

  if (typeof value === "string") {
    const trimmed = value.trim()
    if (!trimmed) return trimmed
    if (/^\d{8}$/.test(trimmed)) return trimmed

    const cleaned = trimmed.replace(/[-/.:\s]/g, "")
    if (/^\d{8}$/.test(cleaned)) return cleaned

    const parsed = new Date(trimmed)
    if (!isNaN(parsed.getTime())) {
      return formatDate(parsed)
    }

    return trimmed
  }

  return value
}

const normalizeNumber = (value: number | string | null | undefined): number | null => {

  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const ensureArray = <T>(value: T[] | null | undefined): T[] => (Array.isArray(value) ? value : [])

const getInventoryLineProductLabel = (line: InventoryInputLine | InventoryOutputLine): string =>
  trimText(line.PRODUCT_NM_VIET) ||
  trimText(line.PRODUCT_NM_ENG) ||
  trimText(line.PRODUCT_NM_KOR) ||
  trimText(line.PRODUCT_NM_CHINA) ||
  trimText(line.PRODUCT_CD)

const getSourceProductDescription = (lines: Array<InventoryInputLine | InventoryOutputLine>): string =>
  Array.from(new Set(lines.map(getInventoryLineProductLabel).filter((label) => label.length > 0))).join(", ")

const flagText = (value: ChitFlag): string =>
  typeof value === "boolean" ? (value ? "true" : "false") : trimText(value)

const normalizeFlag = (value: ChitFlag): boolean =>
  value === true || flagText(value).toLowerCase() === "1" || flagText(value).toLowerCase() === "true"

const toFlag = (value: boolean): "1" | "0" => (value ? "1" : "0")

export const normalizeChitTypeValue = (
  value: ChitType | ChitText,
  fallbackType: ChitType = "DN",
): ChitType => {
  const normalized = trimText(value).toUpperCase()

  switch (normalized) {
    case "CREDIT_NOTE":
    case "CN":
      return "CN"
    case "DEBIT_NOTE":
      return "DN"
    case "PURCHASE_VOUCHER":
    case "PO":
      return "PO"
    case "INVENTORY_RECEIPT":
    case "INVENTORY_RECEIPT_VOUCHER":
    case "IR":
      return "IR"
    case "INVENTORY_ADJUST":
    case "INVENTORY_ADJUSTMENT":
    case "INVENTORY_ADJUSTMENT_VOUCHER":
    case "INVENTORY_TRANSFER":
    case "INVENTORY_TRANSFER_VOUCHER":
    case "TRANSFER":
    case "IA":
      return "IA"
    case "PAYMENT_VOUCHER":
      return "PM"
    case "PURCHASE_SERVICE_VOUCHER":
    case "PS":
      return "PS"
    case "PURCHASE_DISCOUNT":
    case "PURCHASE_DISCOUNT_VOUCHER":
    case "PD":
      return "PD"
    case "PURCHASE_RETURN":
    case "PURCHASE_RETURN_VOUCHER":
    case "PR":
      return "PR"
    case "RECEIPT_VOUCHER":
    case "RC":
      return "RC"
    case "SALES_VOUCHER":
    case "SO":
      return "SO"
    case "SALES_DISCOUNT":
    case "SALES_DISCOUNT_VOUCHER":
    case "SD":
      return "SD"
    case "SALES_RETURN":
    case "SALES_RETURN_VOUCHER":
    case "SR":
      return "SR"
    case "INVENTORY_ISSUE":
    case "INVENTORY_ISSUE_VOUCHER":
    case "IO":
      return "IO"
    case "OFFSET_VOUCHER":
    case "CO":
      return "CO"
    case "OTHER_VOUCHER":
    case "OT":
      return "OT"
    case "DN":
    case "PM":
      return normalized
    default:
      return fallbackType
  }
}
export const getChitTypeLabel = (
  noteType: ChitType,
  translate: (key: string, fallback: string) => string,
): string => {
  switch (noteType) {
    case "RC":
      return translate("RECEIPT_VOUCHER", "Phiếu thu")
    case "PM":
      return translate("PAYMENT_VOUCHER", "Phiếu chi")
    case "DN":
      return translate("DEBIT_NOTE", "Giấy báo nợ")
    case "CN":
      return translate("CREDIT_NOTE", "Giấy báo có")
    case "PO":
      return translate("PURCHASE_VOUCHER", "Phiếu mua hàng")
    case "IR":
      return translate("INVENTORY_RECEIPT_VOUCHER", "Phiếu nhập kho")
    case "IA":
      return translate("INVENTORY_ADJUSTMENT_VOUCHER", "Phiếu điều chỉnh kho")
    case "PS":
      return translate("PURCHASE_SERVICE_VOUCHER", "Phiếu mua dịch vụ")
    case "SO":
      return translate("SALES_VOUCHER", "Phiếu bán hàng")
    case "PD":
      return translate("PURCHASE_DISCOUNT", "Phiếu chiết khấu mua hàng")
    case "PR":
      return translate("PURCHASE_RETURN", "Phiếu trả hàng mua")
    case "SD":
      return translate("SALES_DISCOUNT", "Phiếu chiết khấu bán hàng")
    case "SR":
      return translate("SALES_RETURN", "Phiếu trả hàng bán")
    case "IO":
      return translate("INVENTORY_ISSUE_VOUCHER", "Phiếu xuất kho")
    case "CO":
      return translate("OFFSET_VOUCHER", "Phiếu bù trừ")
    case "OT":
      return translate("OTHER_VOUCHER", "Phiếu khác")
    default:
      return ""
  }
}

export function getVoucherMasterGridId(chitType: ChitType): string {
  return `voucher-master-grid-${chitType}`
}

export function getVoucherDetailGridId(chitType: ChitType): string {
  return `voucher-detail-grid-${chitType}`
}

export function getVoucherEditorDetailGridId(chitType: ChitType): string {
  return `voucher-editor-detail-grid-${chitType}`
}

export const createRowKey = (seed?: number | string | null): string => {
  if (seed !== null && seed !== undefined && `${seed}`.trim().length > 0) {
    return `${seed}`
  }

  return `row_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const createInventoryInputRowKey = (seed?: number | string | null): string => {
  if (seed !== null && seed !== undefined && `${seed}`.trim().length > 0) {
    return `input_${seed}`
  }
  return `input_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

const createInventoryOutputRowKey = (seed?: number | string | null): string => {
  if (seed !== null && seed !== undefined && `${seed}`.trim().length > 0) {
    return `output_${seed}`
  }
  return `output_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`
}

export const normalizeInventoryInput = (record: InventoryInputApi): InventoryInputLine => ({
  ROW_KEY: createInventoryInputRowKey(record.INPUT_ID ?? record.INPUT_CD),
  INPUT_ID: normalizeNumber(record.INPUT_ID),
  INPUT_CD: trimText(record.INPUT_CD),
  CHIT_ID: normalizeNumber(record.CHIT_ID),
  CHIT_CD: trimText(record.CHIT_CD),
  CHIT_TYPE: trimText(record.CHIT_TYPE),
  COMPANY_CD: trimText(record.COMPANY_CD),
  PRODUCT_ID: normalizeNumber(record.PRODUCT_ID),
  PRODUCT_CD: trimText(record.PRODUCT_CD),
  PRODUCT_NM_VIET: trimText(record.PRODUCT_NM_VIET),
  PRODUCT_NM_ENG: trimText(record.PRODUCT_NM_ENG),
  PRODUCT_NM_KOR: trimText(record.PRODUCT_NM_KOR),
  PRODUCT_NM_CHINA: trimText(record.PRODUCT_NM_CHINA),
  STORE_ID: normalizeNumber(record.STORE_ID),
  STORE_CD: trimText(record.STORE_CD),
  STORE_NM_VIET: trimText(record.STORE_NM_VIET),
  STORE_NM_ENG: trimText(record.STORE_NM_ENG),
  STORE_NM_KOR: trimText(record.STORE_NM_KOR),
  STORE_NM_CHINA: trimText(record.STORE_NM_CHINA),
  UNIT_ID: normalizeNumber(record.UNIT_ID),
  UNIT_CD: trimText(record.UNIT_CD),
  UNIT_NM_VIET: trimText(record.UNIT_NM_VIET),
  UNIT_NM_ENG: trimText(record.UNIT_NM_ENG),
  UNIT_NM_KOR: trimText(record.UNIT_NM_KOR),
  UNIT_NM_CHINA: trimText(record.UNIT_NM_CHINA),
  QUANTITY: normalizeNumber(record.QUANTITY),
  UNIT_PRICE_CC: normalizeNumber(record.UNIT_PRICE_CC),
  FC_TYPE: trimText(record.FC_TYPE) || DEFAULT_CURRENCY_CODE,
  UNIT_PRICE_FC: normalizeNumber(record.UNIT_PRICE_FC),
  EXCHANGE_RATES: normalizeNumber(record.EXCHANGE_RATES),
  AMOUNT_CC: normalizeNumber(record.AMOUNT_CC),
  AMOUNT_FC: normalizeNumber(record.AMOUNT_FC),
  SUMMARY: trimText(record.SUMMARY),
  INVENTORY_YMD: normalizeDateTime(record.INVENTORY_YMD),
  STATE: trimText(record.STATE) || "1",
  CHITDETAIL_ID: normalizeNumber(record.CHITDETAIL_ID),
  CHITDETAIL_CD: trimText(record.CHITDETAIL_CD),
  SORT: normalizeNumber(record.SORT),
  ISDEL: normalizeFlag(record.ISDEL),
})

export const normalizeInventoryOutput = (record: InventoryOutputApi): InventoryOutputLine => ({
  ROW_KEY: createInventoryOutputRowKey(record.OUTPUT_ID ?? record.OUTPUT_CD),
  OUTPUT_ID: normalizeNumber(record.OUTPUT_ID),
  OUTPUT_CD: trimText(record.OUTPUT_CD),
  CHIT_ID: normalizeNumber(record.CHIT_ID),
  CHIT_CD: trimText(record.CHIT_CD),
  CHIT_TYPE: trimText(record.CHIT_TYPE),
  COMPANY_CD: trimText(record.COMPANY_CD),
  PRODUCT_ID: normalizeNumber(record.PRODUCT_ID),
  PRODUCT_CD: trimText(record.PRODUCT_CD),
  PRODUCT_NM_VIET: trimText(record.PRODUCT_NM_VIET),
  PRODUCT_NM_ENG: trimText(record.PRODUCT_NM_ENG),
  PRODUCT_NM_KOR: trimText(record.PRODUCT_NM_KOR),
  PRODUCT_NM_CHINA: trimText(record.PRODUCT_NM_CHINA),
  STORE_ID: normalizeNumber(record.STORE_ID),
  STORE_CD: trimText(record.STORE_CD),
  STORE_NM_VIET: trimText(record.STORE_NM_VIET),
  STORE_NM_ENG: trimText(record.STORE_NM_ENG),
  STORE_NM_KOR: trimText(record.STORE_NM_KOR),
  STORE_NM_CHINA: trimText(record.STORE_NM_CHINA),
  TO_STORE_ID: normalizeNumber(record.TO_STORE_ID),
  TO_STORE_CD: trimText(record.TO_STORE_CD),
  TO_STORE_NM_VIET: trimText(record.TO_STORE_NM_VIET),
  TO_STORE_NM_ENG: trimText(record.TO_STORE_NM_ENG),
  TO_STORE_NM_KOR: trimText(record.TO_STORE_NM_KOR),
  TO_STORE_NM_CHINA: trimText(record.TO_STORE_NM_CHINA),
  UNIT_ID: normalizeNumber(record.UNIT_ID),
  UNIT_CD: trimText(record.UNIT_CD),
  UNIT_NM_VIET: trimText(record.UNIT_NM_VIET),
  UNIT_NM_ENG: trimText(record.UNIT_NM_ENG),
  UNIT_NM_KOR: trimText(record.UNIT_NM_KOR),
  UNIT_NM_CHINA: trimText(record.UNIT_NM_CHINA),
  QUANTITY: normalizeNumber(record.QUANTITY),
  UNIT_PRICE_CC: normalizeNumber(record.UNIT_PRICE_CC),
  FC_TYPE: trimText(record.FC_TYPE) || DEFAULT_CURRENCY_CODE,
  UNIT_PRICE_FC: normalizeNumber(record.UNIT_PRICE_FC),
  EXCHANGE_RATES: normalizeNumber(record.EXCHANGE_RATES),
  AMOUNT_CC: normalizeNumber(record.AMOUNT_CC),
  AMOUNT_FC: normalizeNumber(record.AMOUNT_FC),
  SUMMARY: trimText(record.SUMMARY),
  INVENTORY_YMD: normalizeDateTime(record.INVENTORY_YMD),
  INPUT_INVENTORY_YMD: normalizeDateTime(record.INPUT_INVENTORY_YMD),
  OUTPUT_INVENTORY_YMD: normalizeDateTime(record.OUTPUT_INVENTORY_YMD),
  STATE: trimText(record.STATE) || "1",
  CHITDETAIL_ID: normalizeNumber(record.CHITDETAIL_ID),
  CHITDETAIL_CD: trimText(record.CHITDETAIL_CD),
  SORT: normalizeNumber(record.SORT),
  ISDEL: normalizeFlag(record.ISDEL),
})

export const normalizeChitDetail = (record: ChitDetailApi): ChitDetail => {
  const inventoryInputs = ensureArray(record.INVENTORY_INPUTS).map(normalizeInventoryInput)
  const inventoryOutputs = ensureArray(record.INVENTORY_OUTPUTS).map(normalizeInventoryOutput)

  return {
    ROW_KEY: createRowKey(record.CHITDETAIL_ID),
    CHITDETAIL_ID: normalizeNumber(record.CHITDETAIL_ID),
    COMPANY_CD: trimText(record.COMPANY_CD),
    CHIT_ID: normalizeNumber(record.CHIT_ID),
    CHITDETAIL_CD: trimText(record.CHITDETAIL_CD),
    CHIT_YMD: normalizeDate(record.CHIT_YMD),
    CHIT_VMD: normalizeDate(record.CHIT_VMD),
    DEBIT: trimText(record.DEBIT),
    CREDIT: trimText(record.CREDIT),
    DEBIT_NM_VIET: trimText(record.DEBIT_NM_VIET),
    DEBIT_NM_ENG: trimText(record.DEBIT_NM_ENG),
    DEBIT_NM_KOR: trimText(record.DEBIT_NM_KOR),
    DEBIT_NM_CHINA: trimText(record.DEBIT_NM_CHINA),
    CREDIT_NM_VIET: trimText(record.CREDIT_NM_VIET),
    CREDIT_NM_ENG: trimText(record.CREDIT_NM_ENG),
    CREDIT_NM_KOR: trimText(record.CREDIT_NM_KOR),
    CREDIT_NM_CHINA: trimText(record.CREDIT_NM_CHINA),
    AMOUNT: normalizeNumber(record.AMOUNT),
    FC_AMOUNT: normalizeNumber(record.FC_AMOUNT),
    FC_TYPE: trimText(record.FC_TYPE) || DEFAULT_CURRENCY_CODE,
    FC_RATE: normalizeNumber(record.FC_RATE),
    FC_DATETIME: normalizeDateTime(record.FC_DATETIME),
    SORT: normalizeNumber(record.SORT),
    ISDEL: normalizeFlag(record.ISDEL),
    CHITDETAIL_VAT_CD: trimText(record.CHITDETAIL_VAT_CD),
    MG_CD: trimText(record.MG_CD),
    MG_CD_2: trimText(record.MG_CD_2),
    MR_CD: trimText(record.MR_CD),
    MR_CD2: trimText(record.MR_CD2),
    BANK_ID: normalizeNumber(record.BANK_ID),
    BANK_CD: trimText(record.BANK_CD),
    BANK_OWN_CD: trimText(record.BANK_OWN_CD),
    CUSTOMER_ID: normalizeNumber(record.CUSTOMER_ID),
    CUSTOMER_CD: trimText(record.CUSTOMER_CD),
    CUSTOMER_NM_VIET: trimText(record.CUSTOMER_NM_VIET),
    CUSTOMER_NM_ENG: trimText(record.CUSTOMER_NM_ENG),
    CUSTOMER_NM_KOR: trimText(record.CUSTOMER_NM_KOR),
    CUSTOMER_NM_CHINA: trimText(record.CUSTOMER_NM_CHINA),
    CUSTOMER_OWN_CD: trimText(record.CUSTOMER_OWN_CD),
    DEPARTMENT_ID: normalizeNumber(record.DEPARTMENT_ID),
    DEPARTMENT_CD: trimText(record.DEPARTMENT_CD),
    DEPARTMENT_CD_2: trimText(record.DEPARTMENT_CD_2),
    HASINVENTORY:
      inventoryInputs.length > 0 || inventoryOutputs.length > 0 || normalizeFlag(record.HASINVENTORY),
    INVENTORY_YMD: normalizeDateTime(record.INVENTORY_YMD),
    ISPAY: normalizeFlag(record.ISPAY),
    ISCOLLECT: normalizeFlag(record.ISCOLLECT),
    VAT_INPUT_CD: trimText(record.VAT_INPUT_CD),
    PRODUCT_NM_VIET: trimText(record.PRODUCT_NM_VIET),
    UNIT_NM: trimText(record.UNIT_NM),
    QUANTITY: normalizeNumber(record.QUANTITY),
    UNIT_PRICE: normalizeNumber(record.UNIT_PRICE),
    PRODUCT_AMOUNT: normalizeNumber(record.PRODUCT_AMOUNT),
    VAT_TYPE: trimText(record.VAT_TYPE),
    PERCENT: normalizeNumber(record.PERCENT),
    PRODUCT_VAT_AMOUNT: normalizeNumber(record.PRODUCT_VAT_AMOUNT),
    PRODUCT_NOTE: trimText(record.PRODUCT_NOTE),
    VAT_SERIAL_NO: trimText(record.VAT_SERIAL_NO),
    VAT_CHIT_NO: trimText(record.VAT_CHIT_NO),
    VAT_CHIT_NO_2: trimText(record.VAT_CHIT_NO_2),
    VAT_AMOUNT: normalizeNumber(record.VAT_AMOUNT),
    VAT_TAXABLE_AMOUNT: normalizeNumber(record.VAT_TAXABLE_AMOUNT),
    FO_VAT_AMOUNT: normalizeNumber(record.FO_VAT_AMOUNT),
    VAT_ISFREE: normalizeFlag(record.VAT_ISFREE),
    VAT_INVOICE_CD: trimText(record.VAT_INVOICE_CD),
    VAT_INVOICE_NM: trimText(record.VAT_INVOICE_NM),
    VAT_INFO_TYPE: trimText(record.VAT_INFO_TYPE),
    VAT_COMPANY_ISSUE: trimText(record.VAT_COMPANY_ISSUE),
    VAT_COMPANY_ISSUE_ADDRESS: trimText(record.VAT_COMPANY_ISSUE_ADDRESS),
    VAT_COMPANY_ISSUE_CD: trimText(record.VAT_COMPANY_ISSUE_CD),
    VAT_COMPANY_TAXCD: trimText(record.VAT_COMPANY_TAXCD),
    VAT_PRODUCT_NM: trimText(record.VAT_PRODUCT_NM),
    VAT_ETC: trimText(record.VAT_ETC),
    VAT_YMD: normalizeDate(record.VAT_YMD),
    VAT_YMD_2: normalizeDate(record.VAT_YMD_2),
    VAT_INQUIRY_IN: trimText(record.VAT_INQUIRY_IN),
    VAT_INQUIRY_CODE: trimText(record.VAT_INQUIRY_CODE),
    IS_NEXTVAT: normalizeFlag(record.IS_NEXTVAT),
    UNDEFINE: trimText(record.UNDEFINE),
    DETAIL_DESCRIPTION_VIET: trimText(record.DETAIL_DESCRIPTION_VIET),
    DETAIL_DESCRIPTION_ENG: trimText(record.DETAIL_DESCRIPTION_ENG),
    DETAIL_DESCRIPTION_KOR: trimText(record.DETAIL_DESCRIPTION_KOR),
    INVENTORY_INPUTS: inventoryInputs,
    INVENTORY_OUTPUTS: inventoryOutputs,
  }
}

export const normalizeChitDetailRows = (records: ChitDetailApi[]): ChitDetail[] =>
  ensureArray(records).map(normalizeChitDetail)

export const isPeriodLockVoucher = (record?: Pick<ChitInfo, "INPUT_TYPE"> | null): boolean =>
  trimText(record?.INPUT_TYPE).toUpperCase() === "LOCK"

export const normalizeChit = (
  record: ChitApi,
  fallbackType: ChitType = "DN",
): ChitInfo => ({
  CHIT_ID: normalizeNumber(record.CHIT_ID),
  COMPANY_CD: trimText(record.COMPANY_CD),
  CHIT_CD: trimText(record.CHIT_CD),
  CHIT_NO: trimText(record.CHIT_NO),
  CHIT_YMD: normalizeDate(record.CHIT_YMD),
  CHIT_TYPE: normalizeChitTypeValue(record.CHIT_TYPE, fallbackType),
  INPUT_TYPE: trimText(record.INPUT_TYPE),
  LOCK_STEP_CODE: trimText(record.LOCK_STEP_CODE),
  AMOUNT: normalizeNumber(record.AMOUNT),
  PAYER_INFO: trimText(record.PAYER_INFO),
  ISDEL: normalizeFlag(record.ISDEL),
  IS_LOCK: normalizeFlag(record.IS_LOCK),
  ISEXCEL: normalizeFlag(record.ISEXCEL),
  EMAIL_EPAY: trimText(record.EMAIL_EPAY),
  IS_CONFIRMED: normalizeFlag(record.IS_CONFIRMED),
  NOTE: trimText(record.NOTE),
  DAY_OF_PAYMENT: normalizeNumber(record.DAY_OF_PAYMENT),
  TIME_FOR_PAYMENT: trimText(record.TIME_FOR_PAYMENT),
  IS_PAYMENT: normalizeFlag(record.IS_PAYMENT),
  CHIT_CD_COGS: trimText(record.CHIT_CD_COGS),
  DESCRIPTION_VIET: trimText(record.DESCRIPTION_VIET),
  DESCRIPTION_ENG: trimText(record.DESCRIPTION_ENG),
  DESCRIPTION_KOR: trimText(record.DESCRIPTION_KOR),
  DETAIL_COUNT: normalizeNumber(record.DETAIL_COUNT) ?? 0,
  DETAILS: normalizeChitDetailRows(ensureArray(record.DETAILS)),
})

export const normalizeChitRows = (
  records: ChitApi[],
  fallbackType: ChitType = "DN",
): ChitInfo[] => records.map((record) => normalizeChit(record, fallbackType))

export const getActiveChitDetails = (details: ChitDetail[]): ChitDetail[] =>
  ensureArray(details).filter((item) => !item.ISDEL)

export const calculateChitAmount = (details: ChitDetail[]): number =>
  getActiveChitDetails(details).reduce((total, item) => total + (item.AMOUNT ?? 0), 0)

export const createDefaultChitDetail = (_index: number, companyCd = ""): ChitDetail => ({
  ROW_KEY: createRowKey(),
  CHITDETAIL_ID: -Date.now(),
  COMPANY_CD: companyCd,
  CHIT_ID: 0,
  CHITDETAIL_CD: "",
  CHIT_YMD: null,
  CHIT_VMD: null,
  DEBIT: "",
  CREDIT: "",
  DEBIT_NM_VIET: "",
  DEBIT_NM_ENG: "",
  DEBIT_NM_KOR: "",
  DEBIT_NM_CHINA: "",
  CREDIT_NM_VIET: "",
  CREDIT_NM_ENG: "",
  CREDIT_NM_KOR: "",
  CREDIT_NM_CHINA: "",
  AMOUNT: 0,
  FC_AMOUNT: 0,
  FC_TYPE: DEFAULT_CURRENCY_CODE,
  FC_RATE: 0,
  FC_DATETIME: null,
  SORT: 1,
  ISDEL: false,
  CHITDETAIL_VAT_CD: "",
  MG_CD: "",
  MG_CD_2: "",
  MR_CD: "",
  MR_CD2: "",
  BANK_ID: null,
  BANK_CD: "",
  BANK_OWN_CD: "",
  CUSTOMER_ID: null,
  CUSTOMER_CD: "",
  CUSTOMER_NM_VIET: "",
  CUSTOMER_NM_ENG: "",
  CUSTOMER_NM_KOR: "",
  CUSTOMER_NM_CHINA: "",
  CUSTOMER_OWN_CD: "",
  DEPARTMENT_ID: null,
  DEPARTMENT_CD: "",
  DEPARTMENT_CD_2: "",
  HASINVENTORY: false,
  INVENTORY_YMD: null,
  ISPAY: false,
  ISCOLLECT: false,
  VAT_INPUT_CD: "",
  PRODUCT_NM_VIET: "",
  UNIT_NM: "",
  QUANTITY: 0,
  UNIT_PRICE: 0,
  PRODUCT_AMOUNT: 0,
  VAT_TYPE: "",
  PERCENT: 0,
  PRODUCT_VAT_AMOUNT: 0,
  PRODUCT_NOTE: "",
  VAT_SERIAL_NO: "",
  VAT_CHIT_NO: "",
  VAT_CHIT_NO_2: "",
  VAT_AMOUNT: 0,
  VAT_TAXABLE_AMOUNT: 0,
  FO_VAT_AMOUNT: 0,
  VAT_ISFREE: false,
  VAT_INVOICE_CD: "",
  VAT_INVOICE_NM: "",
  VAT_INFO_TYPE: "",
  VAT_COMPANY_ISSUE: "",
  VAT_COMPANY_ISSUE_ADDRESS: "",
  VAT_COMPANY_ISSUE_CD: "",
  VAT_COMPANY_TAXCD: "",
  VAT_PRODUCT_NM: "",
  VAT_ETC: "",
  VAT_YMD: null,
  VAT_YMD_2: null,
  VAT_INQUIRY_IN: "",
  VAT_INQUIRY_CODE: "",
  IS_NEXTVAT: false,
  UNDEFINE: "",
  DETAIL_DESCRIPTION_VIET: "",
  DETAIL_DESCRIPTION_ENG: "",
  DETAIL_DESCRIPTION_KOR: "",
  INVENTORY_INPUTS: [],
  INVENTORY_OUTPUTS: [],
})

export const createDefaultChit = (noteType: ChitType, companyCd = "", _userId = ""): ChitInfo => ({
  CHIT_ID: null,
  COMPANY_CD: companyCd,
  CHIT_CD: "",
  CHIT_NO: "",
  CHIT_YMD: new Date(),
  CHIT_TYPE: noteType,
  AMOUNT: 0,
  PAYER_INFO: "",
  ISDEL: false,
  IS_LOCK: false,
  ISEXCEL: false,
  EMAIL_EPAY: "",
  IS_CONFIRMED: false,
  NOTE: "",
  DAY_OF_PAYMENT: null,
  TIME_FOR_PAYMENT: "",
  IS_PAYMENT: false,
  CHIT_CD_COGS: "",
  DESCRIPTION_VIET: "",
  DESCRIPTION_ENG: "",
  DESCRIPTION_KOR: "",
  DETAIL_COUNT: 1,
  DETAILS: [],
})

function getSourceInventoryEligibleDetails(source: ChitInfo): ChitDetail[] {
  return getActiveChitDetails(ensureArray(source.DETAILS)).filter((detail) => {
    const quantity = normalizeNumber(detail.QUANTITY) ?? 0
    const amount = normalizeNumber(detail.PRODUCT_AMOUNT) ?? normalizeNumber(detail.AMOUNT) ?? 0
    const hasProductInfo = trimText(detail.PRODUCT_NM_VIET).length > 0 || trimText(detail.UNIT_NM).length > 0

    return hasProductInfo || quantity > 0 || amount > 0
  })
}

function filterInventorySourceDetailsByLinkStatus(
  details: ChitDetail[],
  linkedChitDetailIds?: number[] | null,
): ChitDetail[] {
  const blockedIds = new Set((linkedChitDetailIds ?? []).map((item) => Number(item)).filter((item) => Number.isFinite(item) && item > 0))

  if (blockedIds.size === 0) {
    return details
  }

  return details.filter((detail) => {
    const detailId = Number(detail.CHITDETAIL_ID ?? 0)
    return detailId <= 0 || !blockedIds.has(detailId)
  })
}

export function buildInventorySourceInputLines(
  source: ChitInfo,
  sourceDetails: ChitDetail[],
  companyCd: string,
  inventoryYmd: ChitInfo["CHIT_YMD"],
  inventoryChitType: Extract<ChitType, "IR" | "IO">,
): InventoryInputLine[] {
  return sourceDetails.map((detail, index) => ({
    ROW_KEY: createRowKey(`source_input_${index + 1}`),
    INPUT_ID: null,
    INPUT_CD: "",
    CHIT_ID: null,
    CHIT_CD: "",
    CHIT_TYPE: inventoryChitType,
    COMPANY_CD: companyCd,
    PRODUCT_ID: null,
    PRODUCT_CD: "",
    PRODUCT_NM_VIET: trimText(detail.PRODUCT_NM_VIET),
    PRODUCT_NM_ENG: "",
    PRODUCT_NM_KOR: "",
    PRODUCT_NM_CHINA: "",
    STORE_ID: null,
    STORE_CD: "",
    STORE_NM_VIET: "",
    STORE_NM_ENG: "",
    STORE_NM_KOR: "",
    STORE_NM_CHINA: "",
    UNIT_ID: null,
    UNIT_CD: "",
    UNIT_NM_VIET: trimText(detail.UNIT_NM),
    UNIT_NM_ENG: "",
    UNIT_NM_KOR: "",
    UNIT_NM_CHINA: "",
    QUANTITY: normalizeNumber(detail.QUANTITY),
    UNIT_PRICE_CC: normalizeNumber(detail.UNIT_PRICE),
    FC_TYPE: trimText(detail.FC_TYPE) || DEFAULT_CURRENCY_CODE,
    UNIT_PRICE_FC: 0,
    EXCHANGE_RATES: 0,
    AMOUNT_CC: normalizeNumber(detail.PRODUCT_AMOUNT) ?? normalizeNumber(detail.AMOUNT) ?? 0,
    AMOUNT_FC: 0,
    SUMMARY:
      trimText(detail.DETAIL_DESCRIPTION_VIET) ||
      trimText(detail.PRODUCT_NOTE) ||
      trimText(detail.PRODUCT_NM_VIET),
    INVENTORY_YMD: detail.INVENTORY_YMD ?? inventoryYmd ?? source.CHIT_YMD ?? null,
    STATE: "1",
    CHITDETAIL_ID: detail.CHITDETAIL_ID ?? null,
    CHITDETAIL_CD: trimText(detail.CHITDETAIL_CD),
    SORT: index + 1,
    ISDEL: false,
  }))
}

export function buildInventorySourceOutputLines(
  source: ChitInfo,
  sourceDetails: ChitDetail[],
  companyCd: string,
  inventoryYmd: ChitInfo["CHIT_YMD"],
  inventoryChitType: Extract<ChitType, "IR" | "IO">,
): InventoryOutputLine[] {
  return sourceDetails.map((detail, index) => ({
    ROW_KEY: createRowKey(`source_output_${index + 1}`),
    OUTPUT_ID: null,
    OUTPUT_CD: "",
    CHIT_ID: null,
    CHIT_CD: "",
    CHIT_TYPE: inventoryChitType,
    COMPANY_CD: companyCd,
    PRODUCT_ID: null,
    PRODUCT_CD: "",
    PRODUCT_NM_VIET: trimText(detail.PRODUCT_NM_VIET),
    PRODUCT_NM_ENG: "",
    PRODUCT_NM_KOR: "",
    PRODUCT_NM_CHINA: "",
    STORE_ID: null,
    STORE_CD: "",
    STORE_NM_VIET: "",
    STORE_NM_ENG: "",
    STORE_NM_KOR: "",
    STORE_NM_CHINA: "",
    TO_STORE_ID: null,
    TO_STORE_CD: "",
    TO_STORE_NM_VIET: "",
    TO_STORE_NM_ENG: "",
    TO_STORE_NM_KOR: "",
    TO_STORE_NM_CHINA: "",
    UNIT_ID: null,
    UNIT_CD: "",
    UNIT_NM_VIET: trimText(detail.UNIT_NM),
    UNIT_NM_ENG: "",
    UNIT_NM_KOR: "",
    UNIT_NM_CHINA: "",
    QUANTITY: normalizeNumber(detail.QUANTITY),
    UNIT_PRICE_CC: normalizeNumber(detail.UNIT_PRICE),
    FC_TYPE: trimText(detail.FC_TYPE) || DEFAULT_CURRENCY_CODE,
    UNIT_PRICE_FC: 0,
    EXCHANGE_RATES: 0,
    AMOUNT_CC: normalizeNumber(detail.PRODUCT_AMOUNT) ?? normalizeNumber(detail.AMOUNT) ?? 0,
    AMOUNT_FC: 0,
    SUMMARY:
      trimText(detail.DETAIL_DESCRIPTION_VIET) ||
      trimText(detail.PRODUCT_NOTE) ||
      trimText(detail.PRODUCT_NM_VIET),
    INVENTORY_YMD: detail.INVENTORY_YMD ?? inventoryYmd ?? source.CHIT_YMD ?? null,
    STATE: "1",
    CHITDETAIL_ID: detail.CHITDETAIL_ID ?? null,
    CHITDETAIL_CD: trimText(detail.CHITDETAIL_CD),
    SORT: index + 1,
    ISDEL: false,
  }))
}

export function buildInventoryVoucherFromSource(
  source: ChitInfo,
  inventoryChitType: Extract<ChitType, "IR" | "IO">,
  companyCd: string,
  linkedChitDetailIds?: number[] | null,
): ChitInfo {
  const sourceDetails = filterInventorySourceDetailsByLinkStatus(
    getSourceInventoryEligibleDetails(source),
    linkedChitDetailIds,
  )
  const headerDate = source.CHIT_YMD ?? new Date()
  const baseDraft = createDefaultChit(inventoryChitType, companyCd)
  const baseDetail = createDefaultChitDetail(1, companyCd)
  const inventoryInputs =
    inventoryChitType === "IR"
      ? buildInventorySourceInputLines(source, sourceDetails, companyCd, headerDate, inventoryChitType)
      : []
  const inventoryOutputs =
    inventoryChitType === "IO"
      ? buildInventorySourceOutputLines(source, sourceDetails, companyCd, headerDate, inventoryChitType)
      : []
  const amount = inventoryChitType === "IR"
    ? inventoryInputs.reduce((total, line) => total + (normalizeNumber(line.AMOUNT_CC) ?? 0), 0)
    : inventoryOutputs.reduce((total, line) => total + (normalizeNumber(line.AMOUNT_CC) ?? 0), 0)
  const firstSourceDetail = sourceDetails[0] ?? null

  const detailRow: ChitDetail = {
    ...baseDetail,
    COMPANY_CD: companyCd,
    CHIT_YMD: headerDate,
    INVENTORY_YMD: headerDate,
    PRODUCT_NM_VIET: trimText(firstSourceDetail?.PRODUCT_NM_VIET),
    UNIT_NM: trimText(firstSourceDetail?.UNIT_NM),
    QUANTITY: normalizeNumber(firstSourceDetail?.QUANTITY) ?? 0,
    UNIT_PRICE: normalizeNumber(firstSourceDetail?.UNIT_PRICE) ?? 0,
    PRODUCT_AMOUNT: amount,
    AMOUNT: amount,
    PRODUCT_NOTE: trimText(firstSourceDetail?.PRODUCT_NOTE),
    DETAIL_DESCRIPTION_VIET: trimText(firstSourceDetail?.DETAIL_DESCRIPTION_VIET) || trimText(source.DESCRIPTION_VIET),
    DETAIL_DESCRIPTION_ENG: trimText(firstSourceDetail?.DETAIL_DESCRIPTION_ENG) || trimText(source.DESCRIPTION_ENG),
    DETAIL_DESCRIPTION_KOR: trimText(firstSourceDetail?.DETAIL_DESCRIPTION_KOR) || trimText(source.DESCRIPTION_KOR),
    HASINVENTORY: inventoryInputs.length > 0 || inventoryOutputs.length > 0,
    INVENTORY_INPUTS: inventoryInputs,
    INVENTORY_OUTPUTS: inventoryOutputs,
  }

  return {
    ...baseDraft,
    COMPANY_CD: companyCd,
    CHIT_YMD: headerDate,
    PAYER_INFO: trimText(source.PAYER_INFO),
    NOTE: trimText(source.NOTE),
    DESCRIPTION_VIET: trimText(source.DESCRIPTION_VIET),
    DESCRIPTION_ENG: trimText(source.DESCRIPTION_ENG),
    DESCRIPTION_KOR: trimText(source.DESCRIPTION_KOR),
    AMOUNT: amount,
    DETAIL_COUNT: 1,
    DETAILS: [detailRow],
  }
}

export function isInventoryInputLinkedAccountingVoucherType(chitType?: ChitType | string | null): boolean {
  const normalized = String(chitType ?? "").trim().toUpperCase()
  return normalized === "PO" || normalized === "PD" || normalized === "SR"
}

export function isInventoryOutputLinkedAccountingVoucherType(chitType?: ChitType | string | null): boolean {
  const normalized = String(chitType ?? "").trim().toUpperCase()
  return normalized === "SO" || normalized === "SD" || normalized === "PR"
}

export function isInventoryLinkedAccountingVoucherType(chitType?: ChitType | string | null): boolean {
  return isInventoryInputLinkedAccountingVoucherType(chitType) || isInventoryOutputLinkedAccountingVoucherType(chitType)
}

function hasSourceInventoryLineContent(line: InventoryInputLine | InventoryOutputLine): boolean {
  if (line.ISDEL) {
    return false
  }

  const quantity = normalizeNumber(line.QUANTITY) ?? 0
  const amount = normalizeNumber(line.AMOUNT_CC) ?? 0
  return quantity > 0 || amount > 0
}

function isLinkedSourceInventoryLine(
  line: InventoryInputLine | InventoryOutputLine,
  linkedChitDetailIds?: number[] | null,
): boolean {
  const linkedDetailId = normalizeNumber(line.CHITDETAIL_ID) ?? 0
  return linkedChitDetailIds?.some((item) => Number(item) === linkedDetailId) ?? false
}

export function mapInventoryVoucherToSourceChitInfo(source: InventoryVoucher): ChitInfo {
  const sourceChit = createDefaultChit(source.CHIT_TYPE, source.COMPANY_CD)

  return {
    ...sourceChit,
    CHIT_ID: source.CHIT_ID ?? null,
    CHIT_CD: source.CHIT_CD,
    CHIT_NO: source.CHIT_NO,
    CHIT_YMD: source.CHIT_YMD,
    AMOUNT: source.AMOUNT,
    PAYER_INFO: source.PAYER_INFO,
    NOTE: source.NOTE,
    DESCRIPTION_VIET: source.DESCRIPTION_VIET,
    DESCRIPTION_ENG: source.DESCRIPTION_ENG,
    DESCRIPTION_KOR: source.DESCRIPTION_KOR,
    DETAILS: [
      {
        ...createDefaultChitDetail(1, source.COMPANY_CD),
        CHIT_ID: source.CHIT_ID,
        CHIT_YMD: source.CHIT_YMD,
        CHITDETAIL_ID: null,
        CHITDETAIL_CD: "",
        AMOUNT: source.AMOUNT,
        PRODUCT_AMOUNT: source.AMOUNT,
        PRODUCT_NOTE: "",
        DETAIL_DESCRIPTION_VIET: source.DESCRIPTION_VIET,
        DETAIL_DESCRIPTION_ENG: source.DESCRIPTION_ENG,
        DETAIL_DESCRIPTION_KOR: source.DESCRIPTION_KOR,
        HASINVENTORY: true,
        INVENTORY_INPUTS: source.INPUTS,
        INVENTORY_OUTPUTS: source.OUTPUTS,
      },
    ],
  }
}

export function buildAccountingVoucherFromInventorySource(
  source: ChitInfo,
  targetChitType: ChitType,
  companyCd: string,
  linkedChitDetailIds?: number[] | null,
): ChitInfo {
  const headerDate = source.CHIT_YMD ?? new Date()
  const inputLinked = isInventoryInputLinkedAccountingVoucherType(targetChitType)
  const outputLinked = isInventoryOutputLinkedAccountingVoucherType(targetChitType)
  const inventoryInputs = inputLinked
    ? ensureArray(source.DETAILS).flatMap((detail) => ensureArray(detail.INVENTORY_INPUTS))
    : []
  const inventoryOutputs = outputLinked
    ? ensureArray(source.DETAILS).flatMap((detail) => ensureArray(detail.INVENTORY_OUTPUTS))
    : []
  const sourceInputs = inventoryInputs.filter((line) => {
    if (!hasSourceInventoryLineContent(line) || isLinkedSourceInventoryLine(line, linkedChitDetailIds)) {
      return false
    }

    return true
  })
  const sourceOutputs = inventoryOutputs.filter((line) => {
    if (!hasSourceInventoryLineContent(line) || isLinkedSourceInventoryLine(line, linkedChitDetailIds)) {
      return false
    }

    return true
  })
  const amountFromInputs = sourceInputs.reduce((sum, line) => sum + (normalizeNumber(line.AMOUNT_CC) ?? 0), 0)
  const amountFromOutputs = sourceOutputs.reduce((sum, line) => sum + (normalizeNumber(line.AMOUNT_CC) ?? 0), 0)
  const amountFromInventory = inputLinked ? amountFromInputs : amountFromOutputs
  const amount = amountFromInventory > 0 ? amountFromInventory : (normalizeNumber(source.AMOUNT) ?? 0)
  const chitNo = trimText(source.CHIT_NO)
  const payerInfo = trimText(source.PAYER_INFO)
  const description = [chitNo, payerInfo].filter((part) => part.length > 0).join(" - ")
  const productDescription = inputLinked
    ? getSourceProductDescription(inventoryInputs)
    : getSourceProductDescription(inventoryOutputs)
  const detailDescription = productDescription || description || trimText(source.DESCRIPTION_VIET)
  const primaryDetail = getActiveChitDetails(ensureArray(source.DETAILS) as ChitDetail[])[0] ?? null
  const singleDetail: ChitDetail = {
    ...createDefaultChitDetail(1, companyCd),
    ROW_KEY: createRowKey(),
    COMPANY_CD: companyCd,
    CHITDETAIL_ID: null,
    CHIT_ID: null,
    CHITDETAIL_CD: "",
    INVENTORY_YMD: headerDate,
    AMOUNT: amount,
    PRODUCT_AMOUNT: amount,
    PRODUCT_NOTE: detailDescription,
    DETAIL_DESCRIPTION_VIET:
      detailDescription ||
      trimText(source.DESCRIPTION_VIET) ||
      trimText(primaryDetail?.DETAIL_DESCRIPTION_VIET ?? ""),
    DETAIL_DESCRIPTION_ENG:
      detailDescription ||
      trimText(source.DESCRIPTION_ENG) ||
      trimText(primaryDetail?.DETAIL_DESCRIPTION_ENG ?? ""),
    DETAIL_DESCRIPTION_KOR:
      detailDescription ||
      trimText(source.DESCRIPTION_KOR) ||
      trimText(primaryDetail?.DETAIL_DESCRIPTION_KOR ?? ""),
    HASINVENTORY: sourceInputs.length > 0 || sourceOutputs.length > 0,
    INVENTORY_INPUTS: sourceInputs.map((line) => cloneInventoryInput(line)),
    INVENTORY_OUTPUTS: sourceOutputs.map((line) => cloneInventoryOutput(line)),
    SORT: 1,
    ISDEL: false,
  }

  return {
    ...createDefaultChit(targetChitType, companyCd),
    COMPANY_CD: companyCd,
    CHIT_YMD: headerDate,
    PAYER_INFO: trimText(source.PAYER_INFO),
    NOTE: trimText(source.NOTE),
    DESCRIPTION_VIET: trimText(source.DESCRIPTION_VIET),
    DESCRIPTION_ENG: trimText(source.DESCRIPTION_ENG),
    DESCRIPTION_KOR: trimText(source.DESCRIPTION_KOR),
    AMOUNT: amount,
    DETAIL_COUNT: 1,
    DETAILS: [singleDetail],
  }
}

export function buildSaleVoucherFromInventoryIssue(source: ChitInfo, companyCd: string): ChitInfo {
  return buildAccountingVoucherFromInventorySource(source, "SO", companyCd)
}

export function buildPurchaseVoucherFromInventoryReceipt(source: ChitInfo, companyCd: string): ChitInfo {
  return buildAccountingVoucherFromInventorySource(source, "PO", companyCd)
}

export const cloneInventoryInput = (record: InventoryInputLine): InventoryInputLine => ({
  ...record,
  ROW_KEY: record.ROW_KEY || createInventoryInputRowKey(record.INPUT_ID ?? record.INPUT_CD),
})

export const cloneInventoryOutput = (record: InventoryOutputLine): InventoryOutputLine => ({
  ...record,
  ROW_KEY: record.ROW_KEY || createInventoryOutputRowKey(record.OUTPUT_ID ?? record.OUTPUT_CD),
})

export const cloneChitDetail = (record: ChitDetail): ChitDetail => ({
  ...record,
  ROW_KEY: record.ROW_KEY || createRowKey(record.CHITDETAIL_ID),
  INVENTORY_INPUTS: ensureArray(record.INVENTORY_INPUTS).map(cloneInventoryInput),
  INVENTORY_OUTPUTS: ensureArray(record.INVENTORY_OUTPUTS).map(cloneInventoryOutput),
})

export const cloneChit = (record: ChitInfo): ChitInfo => ({
  ...record,
  DETAILS: ensureArray(record.DETAILS).map(cloneChitDetail),
})

export const prepareChitForEdit = (record: ChitInfo): ChitInfo => ({
  ...record,
  CHIT_NO: String(record.CHIT_NO ?? "").trim(),
  DETAIL_COUNT: getActiveChitDetails(ensureArray(record.DETAILS)).length,
  AMOUNT: record.AMOUNT ?? calculateChitAmount(ensureArray(record.DETAILS)),
  DETAILS: ensureArray(record.DETAILS).map((detail) => ({
    ...detail,
    ROW_KEY: detail.ROW_KEY || createRowKey(detail.CHITDETAIL_ID),
    SORT: detail.SORT ?? 1,
  })),
})

export const mapInventoryInputToApiPayload = (record: InventoryInputLine): InventoryInputApi => ({
  INPUT_ID: record.INPUT_ID,
  INPUT_CD: trimText(record.INPUT_CD),
  CHIT_ID: record.CHIT_ID,
  CHIT_CD: trimText(record.CHIT_CD),
  CHIT_TYPE: trimText(record.CHIT_TYPE),
  COMPANY_CD: trimText(record.COMPANY_CD),
  PRODUCT_ID: record.PRODUCT_ID ?? null,
  PRODUCT_CD: trimText(record.PRODUCT_CD),
  STORE_ID: record.STORE_ID ?? null,
  STORE_CD: trimText(record.STORE_CD),
  UNIT_ID: record.UNIT_ID ?? null,
  UNIT_CD: trimText(record.UNIT_CD),
  QUANTITY: record.QUANTITY ?? 0,
  UNIT_PRICE_CC: record.UNIT_PRICE_CC ?? 0,
  FC_TYPE: trimText(record.FC_TYPE) || DEFAULT_CURRENCY_CODE,
  UNIT_PRICE_FC: record.UNIT_PRICE_FC ?? 0,
  EXCHANGE_RATES: record.EXCHANGE_RATES ?? 0,
  AMOUNT_CC: record.AMOUNT_CC ?? 0,
  AMOUNT_FC: record.AMOUNT_FC ?? 0,
  SUMMARY: trimText(record.SUMMARY),
  INVENTORY_YMD: normalizeDate(record.INVENTORY_YMD),
  STATE: trimText(record.STATE) || "1",
  CHITDETAIL_ID: record.CHITDETAIL_ID ?? null,
  CHITDETAIL_CD: trimText(record.CHITDETAIL_CD),
  SORT: record.SORT ?? 0,
  ISDEL: toFlag(record.ISDEL),
})

export const mapInventoryOutputToApiPayload = (record: InventoryOutputLine): InventoryOutputApi => ({
  COGS_DEBIT: record.COGS_DEBIT,
  COGS_CREDIT: record.COGS_CREDIT,
  OUTPUT_ID: record.OUTPUT_ID,
  OUTPUT_CD: trimText(record.OUTPUT_CD),
  CHIT_ID: record.CHIT_ID,
  CHIT_CD: trimText(record.CHIT_CD),
  CHIT_TYPE: trimText(record.CHIT_TYPE),
  COMPANY_CD: trimText(record.COMPANY_CD),
  PRODUCT_ID: record.PRODUCT_ID ?? null,
  PRODUCT_CD: trimText(record.PRODUCT_CD),
  STORE_ID: record.STORE_ID ?? null,
  STORE_CD: trimText(record.STORE_CD),
  TO_STORE_ID: record.TO_STORE_ID ?? null,
  TO_STORE_CD: trimText(record.TO_STORE_CD),
  TO_STORE_NM_VIET: trimText(record.TO_STORE_NM_VIET),
  TO_STORE_NM_ENG: trimText(record.TO_STORE_NM_ENG),
  TO_STORE_NM_KOR: trimText(record.TO_STORE_NM_KOR),
  TO_STORE_NM_CHINA: trimText(record.TO_STORE_NM_CHINA),
  UNIT_ID: record.UNIT_ID ?? null,
  UNIT_CD: trimText(record.UNIT_CD),
  QUANTITY: record.QUANTITY ?? 0,
  UNIT_PRICE_CC: record.UNIT_PRICE_CC ?? 0,
  FC_TYPE: trimText(record.FC_TYPE) || DEFAULT_CURRENCY_CODE,
  UNIT_PRICE_FC: record.UNIT_PRICE_FC ?? 0,
  EXCHANGE_RATES: record.EXCHANGE_RATES ?? 0,
  AMOUNT_CC: record.AMOUNT_CC ?? 0,
  AMOUNT_FC: record.AMOUNT_FC ?? 0,
  SUMMARY: trimText(record.SUMMARY),
  INVENTORY_YMD: normalizeDate(record.INVENTORY_YMD),
  INPUT_INVENTORY_YMD: normalizeDate(record.INPUT_INVENTORY_YMD),
  OUTPUT_INVENTORY_YMD: normalizeDate(record.OUTPUT_INVENTORY_YMD),
  STATE: trimText(record.STATE) || "1",
  CHITDETAIL_ID: record.CHITDETAIL_ID ?? null,
  CHITDETAIL_CD: trimText(record.CHITDETAIL_CD),
  SORT: record.SORT ?? 0,
  ISDEL: toFlag(record.ISDEL),
})

export const mapChitDetailToApiPayload = (record: ChitDetail): ChitDetailApi => {
  return {
    CHITDETAIL_ID: record.CHITDETAIL_ID,
    COMPANY_CD: trimText(record.COMPANY_CD),
    CHIT_ID: record.CHIT_ID,
    CHITDETAIL_CD: trimText(record.CHITDETAIL_CD),
    CHIT_YMD: normalizeDate(record.CHIT_YMD),
    CHIT_VMD: normalizeDate(record.CHIT_VMD),
    DEBIT: trimText(record.DEBIT),
    CREDIT: trimText(record.CREDIT),
    DEBIT_NM_VIET: trimText(record.DEBIT_NM_VIET),
    DEBIT_NM_ENG: trimText(record.DEBIT_NM_ENG),
    DEBIT_NM_KOR: trimText(record.DEBIT_NM_KOR),
    DEBIT_NM_CHINA: trimText(record.DEBIT_NM_CHINA),
    CREDIT_NM_VIET: trimText(record.CREDIT_NM_VIET),
    CREDIT_NM_ENG: trimText(record.CREDIT_NM_ENG),
    CREDIT_NM_KOR: trimText(record.CREDIT_NM_KOR),
    CREDIT_NM_CHINA: trimText(record.CREDIT_NM_CHINA),
    AMOUNT: record.AMOUNT ?? 0,
    FC_AMOUNT: record.FC_AMOUNT ?? 0,
    FC_TYPE: trimText(record.FC_TYPE) || DEFAULT_CURRENCY_CODE,
    FC_RATE: record.FC_RATE ?? 0,
    FC_DATETIME: normalizeDateTime(record.FC_DATETIME),
    SORT: record.SORT ?? 0,
    ISDEL: toFlag(record.ISDEL),
    CHITDETAIL_VAT_CD: trimText(record.CHITDETAIL_VAT_CD),
    MG_CD: trimText(record.MG_CD),
    MG_CD_2: trimText(record.MG_CD_2),
    MR_CD: trimText(record.MR_CD),
    MR_CD2: trimText(record.MR_CD2),
    BANK_ID: record.BANK_ID ?? null,
    BANK_CD: trimText(record.BANK_CD),
    BANK_OWN_CD: trimText(record.BANK_OWN_CD),
    CUSTOMER_ID: record.CUSTOMER_ID ?? null,
    CUSTOMER_CD: trimText(record.CUSTOMER_CD),
    CUSTOMER_NM_VIET: trimText(record.CUSTOMER_NM_VIET),
    CUSTOMER_NM_ENG: trimText(record.CUSTOMER_NM_ENG),
    CUSTOMER_NM_KOR: trimText(record.CUSTOMER_NM_KOR),
    CUSTOMER_NM_CHINA: trimText(record.CUSTOMER_NM_CHINA),
    CUSTOMER_OWN_CD: trimText(record.CUSTOMER_OWN_CD),
    DEPARTMENT_ID: record.DEPARTMENT_ID ?? null,
    DEPARTMENT_CD: trimText(record.DEPARTMENT_CD),
    DEPARTMENT_CD_2: trimText(record.DEPARTMENT_CD_2),
    HASINVENTORY: toFlag(record.HASINVENTORY),
    INVENTORY_YMD: normalizeDate(record.INVENTORY_YMD),
    ISPAY: toFlag(record.ISPAY),
    ISCOLLECT: toFlag(record.ISCOLLECT),
    VAT_INPUT_CD: trimText(record.VAT_INPUT_CD),   
    PRODUCT_NM_VIET: trimText(record.PRODUCT_NM_VIET),
    UNIT_NM: trimText(record.UNIT_NM),
    QUANTITY: record.QUANTITY ?? 0,
    UNIT_PRICE: record.UNIT_PRICE ?? 0,
    PRODUCT_AMOUNT: record.PRODUCT_AMOUNT ?? record.AMOUNT ?? 0,
    VAT_TYPE: trimText(record.VAT_TYPE),
    PERCENT: record.PERCENT ?? 0,
    PRODUCT_VAT_AMOUNT: record.PRODUCT_VAT_AMOUNT ?? 0,
    PRODUCT_NOTE: trimText(record.PRODUCT_NOTE),
    VAT_SERIAL_NO: trimText(record.VAT_SERIAL_NO),
    VAT_CHIT_NO: trimText(record.VAT_CHIT_NO),
    VAT_CHIT_NO_2: trimText(record.VAT_CHIT_NO_2),
    VAT_AMOUNT: record.VAT_AMOUNT ?? 0,
    VAT_TAXABLE_AMOUNT: record.VAT_TAXABLE_AMOUNT ?? 0,
    FO_VAT_AMOUNT: record.FO_VAT_AMOUNT ?? 0,
    VAT_ISFREE: toFlag(record.VAT_ISFREE),
    VAT_INVOICE_CD: trimText(record.VAT_INVOICE_CD),
    VAT_INVOICE_NM: trimText(record.VAT_INVOICE_NM),
    VAT_INFO_TYPE: trimText(record.VAT_INFO_TYPE),
    VAT_COMPANY_ISSUE: trimText(record.VAT_COMPANY_ISSUE),
    VAT_COMPANY_ISSUE_ADDRESS: trimText(record.VAT_COMPANY_ISSUE_ADDRESS),
    VAT_COMPANY_ISSUE_CD: trimText(record.VAT_COMPANY_ISSUE_CD),
    VAT_COMPANY_TAXCD: trimText(record.VAT_COMPANY_TAXCD),
    VAT_PRODUCT_NM: trimText(record.VAT_PRODUCT_NM),
    VAT_ETC: trimText(record.VAT_ETC),
    VAT_YMD: normalizeDate(record.VAT_YMD),
    VAT_YMD_2: normalizeDate(record.VAT_YMD_2),
    VAT_INQUIRY_IN: trimText(record.VAT_INQUIRY_IN),
    VAT_INQUIRY_CODE: trimText(record.VAT_INQUIRY_CODE),
    IS_NEXTVAT: toFlag(record.IS_NEXTVAT),
    UNDEFINE: trimText(record.UNDEFINE),
    DETAIL_DESCRIPTION_VIET: trimText(record.DETAIL_DESCRIPTION_VIET),
    DETAIL_DESCRIPTION_ENG: trimText(record.DETAIL_DESCRIPTION_ENG),
    DETAIL_DESCRIPTION_KOR: trimText(record.DETAIL_DESCRIPTION_KOR),
    INVENTORY_INPUTS: ensureArray(record.INVENTORY_INPUTS)
      .filter((line) => !line.ISDEL)
      .map(mapInventoryInputToApiPayload),
    INVENTORY_OUTPUTS: ensureArray(record.INVENTORY_OUTPUTS)
      .filter((line) => !line.ISDEL)
      .map(mapInventoryOutputToApiPayload),
  }
}

export function normalizeInventoryInputApi(item: InventoryInputApi, detailKey?: string | null): InventoryInputLine {
  const normalized = normalizeInventoryInput(item)
  return {
    ...normalized,
    ROW_KEY: normalized.ROW_KEY || createInventoryInputRowKey(item.INPUT_ID ?? item.INPUT_CD ?? detailKey),
  }
}

export function normalizeInventoryOutputApi(item: InventoryOutputApi, detailKey?: string | null): InventoryOutputLine {
  const normalized = normalizeInventoryOutput(item)
  return {
    ...normalized,
    COGS_DEBIT: item.COGS_DEBIT,
    COGS_CREDIT: item.COGS_CREDIT,
    ROW_KEY: normalized.ROW_KEY || createInventoryOutputRowKey(item.OUTPUT_ID ?? item.OUTPUT_CD ?? detailKey),
  }
}

 function createInputRowKey(detailKey?: string | null) {
  return `input_${detailKey ?? "detail"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function createOutputRowKey(detailKey?: string | null) {
  return `output_${detailKey ?? "detail"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

export const mapChitToApiPayload = (record: ChitInfo): ChitApi => {
  const activeDetails = getActiveChitDetails(ensureArray(record.DETAILS))
  const details = activeDetails.map((item, index) => ({
    ...mapChitDetailToApiPayload({
      ...item,
      CHIT_YMD: item.CHIT_YMD ?? record.CHIT_YMD,
      SORT: item.SORT ?? index + 1,
    }),
  }))
  const totalAmount = calculateChitAmount(activeDetails)

  return {
    CHIT_ID: record.CHIT_ID,
    COMPANY_CD: trimText(record.COMPANY_CD),
    CHIT_CD: trimText(record.CHIT_CD),
    CHIT_NO: trimText(record.CHIT_NO),
    CHIT_YMD: normalizeDate(record.CHIT_YMD),
    CHIT_TYPE: normalizeChitTypeValue(record.CHIT_TYPE, record.CHIT_TYPE),
    AMOUNT: record.AMOUNT ?? totalAmount,
    PAYER_INFO: trimText(record.PAYER_INFO),
    ISDEL: toFlag(record.ISDEL),  
    IS_LOCK: toFlag(record.IS_LOCK),
    ISEXCEL: toFlag(record.ISEXCEL),
    EMAIL_EPAY: trimText(record.EMAIL_EPAY),
    IS_CONFIRMED: toFlag(record.IS_CONFIRMED),
    NOTE: trimText(record.NOTE),
    DAY_OF_PAYMENT: record.DAY_OF_PAYMENT,
    TIME_FOR_PAYMENT: trimText(record.TIME_FOR_PAYMENT),
    IS_PAYMENT: toFlag(record.IS_PAYMENT),
    CHIT_CD_COGS: trimText(record.CHIT_CD_COGS),
    DESCRIPTION_VIET: trimText(record.DESCRIPTION_VIET),
    DESCRIPTION_ENG: trimText(record.DESCRIPTION_ENG),
    DESCRIPTION_KOR: trimText(record.DESCRIPTION_KOR),
    DETAILS: details,
  }
}

const chitTypeRouteMap: Partial<Record<ChitType, string>> = {
  RC: "/gl/voucher/receipt",
  PM: "/gl/voucher/payment",
  DN: "/gl/voucher/debit-note",
  CN: "/gl/voucher/credit-note",
  PO: "/ap/purchase/goods",
  IR: "/inventory/receipt",
  IA: "/inventory/adjust",
  PS: "/gl/voucher/purchase-service",
  PD: "/ap/purchase/discount",
  PR: "/ap/purchase/return",
  SO: "/ar/sale",
  SD: "/ar/sale/discount",
  SR: "/ar/sale/return",
  IO: "/inventory/issue",
  CO: "/gl/voucher/offset",
  OT: "/gl/voucher/other",
}

export function getVoucherRouteByChitType(chitType?: string | null): string | null {
  const normalizedType = String(chitType ?? "").trim().toUpperCase() as ChitType
  return chitTypeRouteMap[normalizedType] ?? null
}
