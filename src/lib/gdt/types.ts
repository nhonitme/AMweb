export type GdtInvType = 0 | 1

export type GdtProgressStatus =
  | "idle"
  | "starting"
  | "logging_in"
  | "fetching"
  | "fetching_detail"
  | "done"
  | "partial"
  | "error"

export type GdtProgress = {
  status: GdtProgressStatus
  phase: string
  phaseLabel: string
  totalFound: number
  detailDone: number
  detailTotal: number
  detailFailed: number
  sourceIndex: number
  sourceTotal: number
  currentInv: string
  message: string
}

export type GdtInvoiceSummary = Record<string, unknown> & {
  khhdon?: string | number
  nbmst?: string | number
  shdon?: string | number
  khmshdon?: string | number
  /** Ngày lập hóa đơn (YYYYMMDD hoặc ISO) */
  tdlap?: string | number
  mhdon?: string
}

export type GdtInvoiceItem = GdtInvoiceSummary & {
  detail?: Record<string, unknown> | null
  detail_error?: string | null
}

export type FetchAllInvoicesParams = {
  username: string
  password: string
  dateFrom: string
  dateTo: string
  invType: GdtInvType
  pageSize?: number
  maxConcurrent?: number
  onProgress?: (progress: GdtProgress) => void
  signal?: AbortSignal
  /** Token đã lưu DB — seed trước, chỉ login khi thiếu hoặc 401. */
  persistedToken?: string | null
}

export type FetchAllInvoicesResult = {
  success: boolean
  partial: boolean
  count: number
  detailErrorCount: number
  items: GdtInvoiceItem[]
}
