import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import {
  getApiArrayPayload,
  logApiError,
  type ApiResponseEnvelope,
} from "./apiTypes"
import { BeforeState, OpeningBalanceSummaryModel } from "@/types/openingBalance"
import type { etcData } from "@/types/etcData"


export type BeforeStateBank = {
  ID?: number
  COMPANY_CD?: string
  OPEN_YMD: string
  BANK_ID?: number | null
  BANK_NM?: string
  BANK_ACCOUNT_NO?: string
  ACC_ID?: number | null
  ACC_CD: string
  FC_TYPE?: string
  DEBIT?: number
  CREDIT?: number
  DEBIT_FC?: number
  CREDIT_FC?: number
  EXCHANGE_RATE?: number
  SUMMARY?: string
  NOTE?: string
  ISDEL?: string
}

export type BeforeStateCustomer = {
  ID?: number
  COMPANY_CD?: string
  OPEN_YMD: string
  CUSTOMER_ID?: number | null
  CUSTOMER_CD?: string| null
  CUSTOMER_NM?: string
  ACC_CD: string
  FC_TYPE?: string
  DEBIT?: number
  CREDIT?: number
  DEBIT_FC?: number
  CREDIT_FC?: number
  EXCHANGE_RATE?: number
  SUMMARY?: string
  NOTE?: string
  ISDEL?: string
}

export type BeforeStateDepartment = {
  ID?: number
  COMPANY_CD?: string
  OPEN_YMD: string
  DEPARTMENT_ID?: number | null
  DEPARTMENT_NM?: string
  ACC_ID?: number | null
  ACC_CD: string
  FC_TYPE?: string
  DEBIT?: number
  CREDIT?: number
  DEBIT_FC?: number
  CREDIT_FC?: number
  EXCHANGE_RATE?: number
  SUMMARY?: string
  NOTE?: string
  ISDEL?: string
}


const BASE_URL = `${API_BASE_URL}/OpeningBalance`

export async function getOpeningBalanceAccountOptions(lang?: string): Promise<etcData[]> {
  const resp = await axios.get(`${BASE_URL}/account-options`, {
    params: lang ? { lang } : undefined,
  })
  return getApiArrayPayload<etcData>(resp.data)
}

export async function getOpeningBalanceCustomerAccountOptions(lang?: string): Promise<etcData[]> {
  const resp = await axios.get(`${BASE_URL}/customer-account-options`, {
    params: lang ? { lang } : undefined,
  })
  return getApiArrayPayload<etcData>(resp.data)
}

export async function getOpeningBalanceBankAccountOptions(lang?: string): Promise<etcData[]> {
  const resp = await axios.get(`${BASE_URL}/bank-account-options`, {
    params: lang ? { lang } : undefined,
  })
  return getApiArrayPayload<etcData>(resp.data)
}

export async function getOpeningBalanceDepartmentAccountOptions(lang?: string): Promise<etcData[]> {
  const resp = await axios.get(`${BASE_URL}/department-account-options`, {
    params: lang ? { lang } : undefined,
  })
  return getApiArrayPayload<etcData>(resp.data)
}

export async function getOpeningBalanceSummary(
  params: { openYmd?: string; }
): Promise<{ data: OpeningBalanceSummaryModel[] }> {
  try {
    const resp = await axios.get(`${BASE_URL}/summary`, {
      params: { ...params },
    })

    if (resp.status !== 200) {
      throw new Error(`Unexpected HTTP status ${resp.status}`)
    }

    const payload = resp.data
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid response format from getBeforeStates")
    }

    const data = getApiArrayPayload<OpeningBalanceSummaryModel>(payload)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in getBeforeStates:", err)
    throw err
  }
}

/* =========================
   BEFORE STATES
   ========================= */

export async function getBeforeStates(
  params: {
    openYmd?: string,
    keyWORD?: string | null
  }
): Promise<{ data: BeforeState[] }> {
  try {
    const resp = await axios.get(`${BASE_URL}`, {
    params: { ...params },
    })

    if (resp.status !== 200) {
      throw new Error(`Unexpected HTTP status ${resp.status}`)
    }

    const payload = resp.data
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid response format from getBeforeStates")
    }

    const data = getApiArrayPayload<BeforeState>(payload)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in getBeforeStates:", err)
    throw err
  }
}

export async function SaveBeforeState(
  payload: BeforeState[]
): Promise<ApiResponseEnvelope<BeforeState>> {
  const resp = await axios.post<ApiResponseEnvelope<BeforeState>>(
    `${BASE_URL}`,
    payload
  )
  return resp.data
}


/* =========================
   BEFORE STATES BANK
   ========================= */

export async function getBeforeStateBanks(
params: {
    openYmd?: string,
    keyWORD?: string | null
  }
): Promise<{ data: BeforeStateBank[] }> {
  try {
    const resp = await axios.get(`${BASE_URL}/banks`, {
      params: { ...params },
    })

    if (resp.status !== 200) {
      throw new Error(`Unexpected HTTP status ${resp.status}`)
    }

    const payload = resp.data
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid response format from getBeforeStateBanks")
    }

    const data = getApiArrayPayload<BeforeStateBank>(payload)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in getBeforeStateBanks:", err)
    throw err
  }
}

export async function SaveBeforeStateBank(
  payload: BeforeStateBank[]
): Promise<ApiResponseEnvelope<BeforeStateBank>> {
  const resp = await axios.post<ApiResponseEnvelope<BeforeStateBank>>(
    `${BASE_URL}/banks`,
    payload
  )
  return resp.data
}

/* =========================
   BEFORE STATES CUSTOMER
   ========================= */

export async function getBeforeStateCustomers(
  params: {
    openYmd?: string,
    keyWORD?: string | null
  }
): Promise<{ data: BeforeStateCustomer[] }> {
  try {
    const resp = await axios.get(`${BASE_URL}/customers`, {
      params: { ...params },
    })

    if (resp.status !== 200) {
      throw new Error(`Unexpected HTTP status ${resp.status}`)
    }

    const payload = resp.data
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid response format from getBeforeStateCustomers")
    }

    const data = getApiArrayPayload<BeforeStateCustomer>(payload)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in getBeforeStateCustomers:", err)
    throw err
  }
}

export async function SaveBeforeStateCustomer(
  payload: BeforeStateCustomer[]
): Promise<ApiResponseEnvelope<BeforeStateCustomer>> {
  const resp = await axios.post<ApiResponseEnvelope<BeforeStateCustomer>>(
    `${BASE_URL}/customers`,
    payload
  )
  return resp.data
}

/* =========================
   BEFORE STATES DEPARTMENT
   ========================= */

export async function getBeforeStateDepartments(
  params: {
    openYmd?: string,
    keyWORD?: string | null
  }
): Promise<{ data: BeforeStateDepartment[] }> {
  try {
    const resp = await axios.get(`${BASE_URL}/departments`, {
      params: { ...params },
    })

    if (resp.status !== 200) {
      throw new Error(`Unexpected HTTP status ${resp.status}`)
    }

    const payload = resp.data
    if (!payload || typeof payload !== "object") {
      throw new Error("Invalid response format from getBeforeStateDepartments")
    }

    const data = getApiArrayPayload<BeforeStateDepartment>(payload)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in getBeforeStateDepartments:", err)
    throw err
  }
}

export async function SaveBeforeStateDepartment(
  payload: BeforeStateDepartment[]
): Promise<ApiResponseEnvelope<BeforeStateDepartment>> {
  const resp = await axios.post<ApiResponseEnvelope<BeforeStateDepartment>>(
    `${BASE_URL}/departments`,
    payload
  )
  return resp.data
}

// Export to Excel
export async function exportToExcel(
  ID?: number,
  lang?: string,
  openYmd?: string, abortSignal?: AbortSignal
): Promise<Blob> {
  const params: Record<string, string | number> = {};
  if (ID) params.ID = ID;
  if (lang) params.lang = lang;
  if (openYmd) params.openYmd = openYmd;

  const resp = await axios.get(`${BASE_URL}/export`, {
    params,
    signal: abortSignal, responseType: 'blob',
  });
  return resp.data;
}

export async function exportCustomersToExcel(
  ID?: number,
  lang?: string,
  openYmd?: string, abortSignal?: AbortSignal
): Promise<Blob> {
  const params: Record<string, string | number> = {};
  if (ID) params.ID = ID;
  if (lang) params.lang = lang;
  if (openYmd) params.openYmd = openYmd;

  const resp = await axios.get(`${BASE_URL}/customers/export`, {
    params,
    signal: abortSignal, responseType: 'blob',
  });
  return resp.data;
}

export async function exportBanksToExcel(
  ID?: number,
  lang?: string,
  openYmd?: string, abortSignal?: AbortSignal
): Promise<Blob> {
  const params: Record<string, string | number> = {};
  if (ID) params.ID = ID;
  if (lang) params.lang = lang;
  if (openYmd) params.openYmd = openYmd;

  const resp = await axios.get(`${BASE_URL}/banks/export`, {
    params,
    signal: abortSignal, responseType: 'blob',
  });
  return resp.data;
}

export async function exportDepartmentsToExcel(
  ID?: number,
  lang?: string,
  openYmd?: string, abortSignal?: AbortSignal
): Promise<Blob> {
  const params: Record<string, string | number> = {};
  if (ID) params.ID = ID;
  if (lang) params.lang = lang;
  if (openYmd) params.openYmd = openYmd;

  const resp = await axios.get(`${BASE_URL}/departments/export`, {
    params,
    signal: abortSignal, responseType: 'blob',
  });
  return resp.data;
}

export async function GetFiscalStartYear(){
  try {
    const resp = await axios.get(`${BASE_URL}/FiscalStartYear`)
    return resp.data
  } catch (err: unknown) {
    logApiError("Error in GetFiscalStartYear:", err)
    throw err
  }
}
