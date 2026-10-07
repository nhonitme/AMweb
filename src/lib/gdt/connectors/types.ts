import type { DetailBatchCompleteMeta } from "../fetchAllInvoices"
import type {
  FetchAllInvoicesParams,
  GdtInvoiceItem,
  GdtInvoiceSummary,
  GdtProgress,
} from "../types"

export type GdtConnectorName = "web" | "extension"

export type GdtDetailFetchOptions = {
  signal?: AbortSignal
  /** Báo mode hiện tại để UI cập nhật nếu extension fallback sang web. */
  onConnectorModeChange?: (mode: GdtConnectorName) => void
  /** done/total + label HĐ hiện tại (nếu có). */
  onProgress?: (done: number, total: number, currentInv?: string) => void
  onBatchComplete?: (
    items: GdtInvoiceItem[],
    meta: DetailBatchCompleteMeta,
  ) => void | Promise<void>
}

/** Credentials + progress GDT — Web connector tái dùng fetchInvoiceDetailsFromGdt. */
export type WebGdtConnectorConfig = {
  username: string
  password: string
  dateFrom: string
  dateTo: string
  invType: FetchAllInvoicesParams["invType"]
  onGdtProgress?: (progress: GdtProgress) => void
}

export interface GdtDetailConnector {
  name: GdtConnectorName
  fetchDetails(
    token: string,
    invoices: GdtInvoiceSummary[],
    options?: GdtDetailFetchOptions,
  ): Promise<GdtInvoiceItem[]>
}
