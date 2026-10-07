import axios from "@/api/axiosClient"
import API_BASE_URL from "@/config/apiConfig"

const base = `${API_BASE_URL}/pit-withholding/income-payer`

function unwrap<T>(value: T | { Data: T }): T {
  if (value && typeof value === "object" && "Data" in value) {
    return (value as { Data: T }).Data
  }
  return value as T
}

export type PitIncomePayer = {
  COMPANY_CD: string
  PAYER_NM: string
  TAX_CD: string
  ADDRESS: string
  PHONE?: string | null
  EMAIL?: string | null
  UPDATE_BY?: string | null
  UPDATE_AT?: string | null
}

export type PitIncomePayerSaveRequest = {
  PAYER_NM: string
  TAX_CD: string
  ADDRESS: string
  PHONE?: string | null
  EMAIL?: string | null
}

export const pitIncomePayerApi = {
  get: async () => unwrap<PitIncomePayer | null>((await axios.get(base)).data),
  save: async (body: PitIncomePayerSaveRequest) =>
    unwrap<PitIncomePayer>((await axios.put(base, body)).data),
}
