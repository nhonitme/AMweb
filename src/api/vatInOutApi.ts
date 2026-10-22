import API_BASE_URL from "@/config/apiConfig"
import { normalizePagedResult } from "@/lib/paging"
import type { PagedResult } from "@/types/paging"
import axios from "./axiosClient"

export type VatInOutQuery = {
  TYPE: "BUY" | "SELL"
  FROM_YMD: string
  TO_YMD: string
  STATUS: string
  SEARCH_TEXT: string
  LANGUAGE: string
}

// Matches the explicit SQL aliases and C# DTO; no report preview wrapper.
export type VatInOutInvoice = {
  COMPANY_CD: string
  mhdon: string
  tthai: string | null
  tthai_ten: string | null
  khmshdon: string | null
  khmshdon_ten: string | null
  khhdon: string | null
  tdlap: string | null
  tdlap_ten: string | null
  shdon: string | null
  CHIT_NO: string | null
  dvtte: string | null
  TGia: number | null
  mtdtchieu: string | null
  ten: string | null
  dchi: string | null
  mst: string | null
  nbten: string | null
  nbdchi: string | null
  nbmst: string | null
  nmten: string | null
  nmdchi: string | null
  nmmst: string | null
  tgtcthue: number | null
  tgtthue: number | null
  tgtttbso: number | null
  ttcktmai: number | null
  GChu: string | null
  AUTO_CHIT_CD: string | null
  CHIT_YMD: string | null
  CHIT_TYPE: string | null
  __CHIT_TYPE: string | null
  __CHIT_ID: number
}

type VatInOutResponse = {
  Data: VatInOutInvoice[]
  PageNumber: number
  PageSize: number
  TotalRecords: number
  TotalPages: number
  HasPrevious: boolean
  HasNext: boolean
  Success: boolean
  Message: string
}
const BASE_URL = `${API_BASE_URL}/VatInOut`

export async function getVatInOutPage(params: VatInOutQuery, pageNumber: number, pageSize: number, signal?: AbortSignal): Promise<PagedResult<VatInOutInvoice>> {
  const response = await axios.get<VatInOutResponse>(`${BASE_URL}/Get`, {
    params: { ...params, PAGE_NUMBER: pageNumber, PAGE_SIZE: pageSize }, signal,
  })
  const payload = response.data
  const data = payload.Data
  if (!Array.isArray(data)) throw new Error("Invalid VAT list response")
  return normalizePagedResult(payload, data, pageNumber, pageSize)
}

export async function getVatInOutExportData(params: VatInOutQuery): Promise<VatInOutInvoice[]> {
  const response = await axios.get<{ Data: VatInOutInvoice[] }>(`${BASE_URL}/ExportData`, { params })
  if (!Array.isArray(response.data.Data)) throw new Error("Invalid VAT export response")
  return response.data.Data
}
