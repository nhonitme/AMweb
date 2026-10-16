import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"
import { getApiObjectPayload } from "@/api/apiTypes"

const URL = `${API_BASE_URL}/ap/utility/offset`

export type OffsetKind = "PAYMENT" | "COLLECT" | "CLEARING"
export type OffsetCurrency = "VND" | "USD" | "EUR" | "JPY" | "KRW" | "CNY"
export type OffsetFilters = {
  kind: OffsetKind
  fromYmd: string
  toYmd: string
  customerIds: string
  currencyFilter: string
  accCd: string
  accCd1: string
  accCd2: string
}
export type OffsetVoucher = {
  CUSTOMER_ID: number
  CUSTOMER_NM_VIET?: string
  CUSTOMER_NM_ENG?: string
  CHIT_ID: number
  CHIT_TYPE?: string
  CHIT_NO?: string
  CHIT_YMD?: string
  VAT_CHIT_NO?: string
  DESCRIPTION_VIET?: string
  AMOUNT: number
  FC_AMOUNT: number
  REMAINAMOUNT: number
  REMAINAMOUNT_FC: number
  ROW_KEY?: string
}
export type OffsetAvailable = { SOURCES: OffsetVoucher[]; DEBTS: OffsetVoucher[] }
export type OffsetHistory = {
  CUSTOMER_ID: number
  CUSTOMER_NM_VIET?: string
  CHITPAYMENT_ID?: number
  CHITCOLLECT_ID?: number
  CHIT_ID_PAY: number
  CHIT_ID_DEBT: number
  CHIT_NO_PAY?: string
  CHIT_NO_DEBT?: string
  CHIT_YMD_PAY?: string
  CHIT_YMD_DEBT?: string
  PAYAMOUNT: number
  PAYAMOUNT_FC: number
}
export type OffsetPairRequest = {
  kind: OffsetKind
  sourceChitId: number
  debtChitId: number
  customerId: number
  amount: number
  amountFc: number
  currency: OffsetCurrency
}

export async function loadOffsetAvailable(filters: OffsetFilters): Promise<OffsetAvailable> {
  const result = await axios.get(`${URL}/available`, { params: filters })
  const data = getApiObjectPayload<OffsetAvailable>(result.data)
  return { SOURCES: data?.SOURCES ?? [], DEBTS: data?.DEBTS ?? [] }
}
export async function loadOffsetHistory(filters: OffsetFilters): Promise<OffsetHistory[]> {
  const result = await axios.get(`${URL}/history`, { params: filters })
  const data = getApiObjectPayload<OffsetHistory[]>(result.data)
  return Array.isArray(data) ? data : []
}
export async function saveOffsetPair(payload: OffsetPairRequest): Promise<void> {
  // The API uses case-sensitive JSON binding to its PascalCase request models.
  await axios.post(`${URL}/save`, {
    Kind: payload.kind,
    SourceChitId: payload.sourceChitId,
    DebtChitId: payload.debtChitId,
    CustomerId: payload.customerId,
    Amount: payload.amount,
    AmountFc: payload.amountFc,
    Currency: payload.currency,
  })
}
export async function deleteOffsetPair(kind: OffsetKind, recordId: number): Promise<void> {
  await axios.post(`${URL}/delete`, { Kind: kind, RecordId: recordId })
}
