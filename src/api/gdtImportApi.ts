import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { getApiArrayPayload, getApiErrorMessage, getApiObjectPayload } from "./apiTypes"
import type { ApiResponseEnvelope } from "./apiTypes"
import type { GdtInvoiceItem, GdtInvoiceSummary } from "@/lib/gdt"
import type { ChitApi, VatVoucherType } from "@/types/voucher"

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

export type GdtInvoiceVoucherLink = {
  Mhdon: string
  ChitCd: string
}

export type GdtInvoiceVoucherLinkResult = GdtInvoiceVoucherLink & {
  Status: "LINKED" | "ALREADY_LINKED" | "CONFLICT" | "NOT_FOUND" | "INVALID" | string
  Error?: string | null
}

export type GdtVoucherCreateBatchItem = {
  Mhdon: string[]
  Voucher: Partial<ChitApi>
}

export type GdtVoucherCreateBatchResult = {
  Index: number
  ChitId?: number | null
  ChitCd?: string | null
  ChitNo?: string | null
  Status: string
  Error?: string | null
  Links?: GdtInvoiceVoucherLinkResult[]
}

export type GdtInvoiceDetailPayload = Record<string, unknown> & {
  hdhhdvu?: unknown[]
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

export async function getGdtInvoiceDetail(
  type: "BUY" | "SELL",
  mhdon: string,
): Promise<GdtInvoiceDetailPayload> {
  try {
    const resp = await axios.get<ApiResponseEnvelope<GdtInvoiceDetailPayload>>(`${BASE_URL}/detail`, {
      params: { type, mhdon: mhdon.trim() },
      timeout: 30_000,
    })
    const payload = getApiObjectPayload<GdtInvoiceDetailPayload>(resp.data)
    return payload
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không tải được chi tiết hàng hóa/dịch vụ của hóa đơn"))
  }
}

export async function linkGdtInvoicesToVoucher(
  type: "BUY" | "SELL",
  items: GdtInvoiceVoucherLink[],
): Promise<GdtInvoiceVoucherLinkResult[]> {
  try {
    const resp = await axios.post<ApiResponseEnvelope<GdtInvoiceVoucherLinkResult[]>>(
      `${BASE_URL}/link-vouchers`,
      { Type: type, Items: items },
      { timeout: 60_000 },
    )
    return getApiArrayPayload<GdtInvoiceVoucherLinkResult>(resp.data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không liên kết được hóa đơn với chứng từ"))
  }
}

export async function createGdtVoucherBatch(
  type: "BUY" | "SELL",
  voucherType: VatVoucherType,
  items: GdtVoucherCreateBatchItem[],
): Promise<GdtVoucherCreateBatchResult[]> {
  try {
    const resp = await axios.post<ApiResponseEnvelope<GdtVoucherCreateBatchResult[]>>(
      `${BASE_URL}/create-vouchers`,
      { Type: type, VoucherType: voucherType, Items: items },
      { timeout: 180_000 },
    )
    return getApiArrayPayload<GdtVoucherCreateBatchResult>(resp.data)
  } catch (error) {
    throw new Error(getApiErrorMessage(error, "Không lưu được lô chứng từ hóa đơn VAT"))
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
