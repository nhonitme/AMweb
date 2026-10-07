import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { getApiArrayPayload, getApiErrorMessage, getApiObjectPayload } from "./apiTypes"
import type { ApiResponseEnvelope } from "./apiTypes"
import type { GdtInvoiceItem, GdtInvoiceSummary } from "@/lib/gdt"

const BASE_URL = `${API_BASE_URL}/GdtImport`

export type GdtImportListItemState = {
  mhdon: string
  HasList: boolean
  HasJson: boolean
  StatusChanged: boolean
  ListSaved: boolean
  NeedDetail: boolean
  Error?: string | null
}

export type GdtImportUpsertResult = {
  Type: string
  Received: number
  Upserted: number
  Skipped: number
  JsonSaved: number
  ListSaved: number
  NeedDetailCount: number
  Items: GdtImportListItemState[]
  Errors: string[]
}

export type GdtImportUpsertRequest = {
  Type: "BUY" | "SELL"
  Items: Array<GdtInvoiceSummary | GdtInvoiceItem>
}

export type GdtSavedLogin = {
  Username: string
  Password: string
  /** Bearer token đã lưu (cột TOKEN) — dùng lại đến khi hết hạn. */
  Token?: string
  IsDefault?: string
}

export async function listGdtSavedLogins(): Promise<GdtSavedLogin[]> {
  try {
    const resp = await axios.get<ApiResponseEnvelope<GdtSavedLogin[]>>(`${BASE_URL}/logins`)
    return getApiArrayPayload<GdtSavedLogin>(resp.data).map((item) => ({
      Username: String(item.Username ?? "").trim(),
      Password: String(item.Password ?? ""),
      Token: String(item.Token ?? "").trim() || undefined,
      IsDefault: String(item.IsDefault ?? "0"),
    }))
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không tải được danh sách tài khoản GDT"))
  }
}

export async function saveGdtLogin(
  username: string,
  password: string,
  token?: string | null,
): Promise<void> {
  try {
    await axios.post(`${BASE_URL}/save-login`, {
      Username: username.trim(),
      Password: password,
      Token: token?.trim() || null,
    })
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không lưu được tài khoản GDT"))
  }
}

export async function upsertGdtInvoiceList(payload: GdtImportUpsertRequest): Promise<GdtImportUpsertResult> {
  try {
    const resp = await axios.post<ApiResponseEnvelope<GdtImportUpsertResult>>(
      `${BASE_URL}/upsert-list`,
      payload,
      { timeout: 120_000 },
    )
    return getApiObjectPayload<GdtImportUpsertResult>(resp.data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không lưu được danh sách HĐ từ TCT"))
  }
}

export async function upsertGdtInvoiceJson(payload: GdtImportUpsertRequest): Promise<GdtImportUpsertResult> {
  try {
    const resp = await axios.post<ApiResponseEnvelope<GdtImportUpsertResult>>(
      `${BASE_URL}/upsert-json`,
      payload,
      { timeout: 120_000 },
    )
    return getApiObjectPayload<GdtImportUpsertResult>(resp.data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không lưu được chi tiết HĐ từ TCT"))
  }
}

/** @deprecated Dùng upsertGdtInvoiceList / upsertGdtInvoiceJson */
export async function upsertGdtInvoices(payload: GdtImportUpsertRequest): Promise<GdtImportUpsertResult> {
  try {
    const resp = await axios.post<ApiResponseEnvelope<GdtImportUpsertResult>>(`${BASE_URL}/upsert`, payload, {
      timeout: 120_000,
    })
    return getApiObjectPayload<GdtImportUpsertResult>(resp.data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không lưu được dữ liệu TCT vào hệ thống"))
  }
}

export function resolveInvoiceKey(item: GdtInvoiceSummary): string {
  const mhdon = String(item.mhdon ?? "").trim()
  if (mhdon) {
    return mhdon
  }
  return String((item as { id?: unknown }).id ?? "").trim()
}
