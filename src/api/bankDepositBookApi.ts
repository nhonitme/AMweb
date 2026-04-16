import type { AxiosResponse } from "axios"

import API_BASE_URL from "@/config/apiConfig"
import type { BankDepositBookReportRequest, BankDepositBookRow } from "@/types/bankDepositBook"

import axios from "./axiosClient"

type ApiEnvelope<T> = {
  Data?: T
  Message?: string
  Success?: boolean
  data?: T
  message?: string
  success?: boolean
}

function normalizeResponse<T>(
  response: AxiosResponse<ApiEnvelope<T> | T>,
): { data: T; message?: string; success?: boolean } {
  const payload = response.data
  const envelope = (payload as ApiEnvelope<T>).Data ?? (payload as ApiEnvelope<T>).data

  return {
    data: (envelope ?? payload) as T,
    message: (payload as ApiEnvelope<T>).Message ?? (payload as ApiEnvelope<T>).message ?? "",
    success: (payload as ApiEnvelope<T>).Success ?? (payload as ApiEnvelope<T>).success ?? true,
  }
}

const BASE_URL = `${API_BASE_URL}/BankDepositBook`

export async function getBankDepositBookReport(
  payload: BankDepositBookReportRequest,
): Promise<{ data: BankDepositBookRow[]; message?: string }> {
  const response = await axios.post<ApiEnvelope<BankDepositBookRow[]> | BankDepositBookRow[]>(
    `${BASE_URL}/report`,
    payload,
  )

  return normalizeResponse(response)
}
