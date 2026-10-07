import {
  GDT_BASE,
  GDT_DETAIL_CONCURRENT,
  buildDetailUrl,
  formatGdtDate,
  gdtGetJson,
  gdtSleep,
  getToken,
  isGdtRateLimitError,
  listSourceConfigs,
  peekGdtToken,
  seedGdtToken,
} from "./gdtClient"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import type {
  FetchAllInvoicesParams,
  FetchAllInvoicesResult,
  GdtInvoiceItem,
  GdtInvoiceSummary,
  GdtProgress,
} from "./types"

const DEFAULT_PAGE_SIZE = 30
/**
 * Số worker mapPool cho detail — phải ≥ GDT_DETAIL_CONCURRENT để lấp đủ mỗi wave.
 * Giới hạn HTTP thật sự nằm ở acquireDetailRequestSlot (gdtClient).
 */
const DEFAULT_MAX_CONCURRENT = GDT_DETAIL_CONCURRENT
/** Giống C99 GdtInvoiceSyncService.DetailBatchSize */
export const GDT_DETAIL_BATCH_SIZE = 200
/** Nghỉ giữa các batch detail — giảm 429. */
export const GDT_BATCH_PAUSE_MS = 2500

export type DetailBatchCompleteMeta = {
  batchStart: number
  batchIndex: number
  batchCount: number
  total: number
  isRetry: boolean
}

export type FetchInvoiceDetailsOptions = {
  batchSize?: number
  batchPauseMs?: number
  /** false = không retry HĐ lỗi ở cuối (mặc định true). */
  retryFailedOnce?: boolean
  /** Gọi sau mỗi batch (và sau vòng retry) — dùng để lưu JSON ngay như C99. */
  onBatchComplete?: (
    batchItems: GdtInvoiceItem[],
    meta: DetailBatchCompleteMeta,
  ) => void | Promise<void>
}

function createIdleProgress(partial?: Partial<GdtProgress>): GdtProgress {
  return {
    status: "idle",
    phase: "",
    phaseLabel: "",
    totalFound: 0,
    detailDone: 0,
    detailTotal: 0,
    detailFailed: 0,
    sourceIndex: 0,
    sourceTotal: 0,
    currentInv: "",
    message: "",
    ...partial,
  }
}

function invoiceKey(item: GdtInvoiceSummary): string {
  return [
    String(item.khhdon ?? ""),
    String(item.shdon ?? ""),
    String(item.nbmst ?? ""),
    String(item.khmshdon ?? ""),
  ].join("|")
}

/** Giống C99 DisplayValueOrQuestion — trống thì "?" */
function displayOrQuestion(value: unknown): string {
  const text = String(value ?? "").trim()
  return text || "?"
}

/** Hiển thị ngày lập dạng dd/MM/yyyy (tdlap YYYYMMDD / ISO). */
function formatInvoiceIssueDate(tdlap: unknown): string {
  const raw = String(tdlap ?? "").trim()
  if (!raw) {
    return "?"
  }
  const digits = raw.replace(/\D/g, "")
  const display = formatYmdForDisplay(digits.length >= 8 ? digits.slice(0, 8) : raw)
  return display || displayOrQuestion(raw)
}

/**
 * Label HĐ hiện tại — giống C99 FormatInvoiceDisplayLabel / msg_GDT_Invoice_Label:
 * `{0}{1} - số hóa đơn {2} ngày {3}`
 * {0}=khmshdon, {1}=khhdon, {2}=shdon, {3}=tdlap
 */
function formatInvoiceDisplayLabel(inv: GdtInvoiceSummary): string {
  const khmshdon = displayOrQuestion(inv.khmshdon)
  const khhdon = displayOrQuestion(inv.khhdon)
  const shdon = displayOrQuestion(inv.shdon)
  const displayDate = formatInvoiceIssueDate(inv.tdlap)
  return `${khmshdon}${khhdon} - số hóa đơn ${shdon} ngày ${displayDate}`
}

function isDetailFailed(item: GdtInvoiceItem): boolean {
  return Boolean(item.detail_error) || !item.detail
}

async function mapPool<T, R>(
  items: T[],
  concurrency: number,
  mapper: (item: T, index: number) => Promise<R>,
  signal?: AbortSignal,
): Promise<R[]> {
  const results = new Array<R>(items.length)
  let nextIndex = 0

  async function worker() {
    while (true) {
      if (signal?.aborted) {
        throw new DOMException("Aborted", "AbortError")
      }
      const current = nextIndex
      nextIndex += 1
      if (current >= items.length) {
        return
      }
      results[current] = await mapper(items[current], current)
    }
  }

  const workers = Array.from({ length: Math.max(1, Math.min(concurrency, items.length || 1)) }, () =>
    worker(),
  )
  await Promise.all(workers)
  return results
}

async function fetchAllPages(params: {
  baseUrl: string
  query: string
  username: string
  password: string
  phaseLabel: string
  uniqueSoFar: number
  sourceIndex: number
  sourceTotal: number
  pageSize: number
  onProgress?: (progress: GdtProgress) => void
  signal?: AbortSignal
}): Promise<GdtInvoiceSummary[]> {
  const results: GdtInvoiceSummary[] = []
  let state = ""
  let page = 0

  while (true) {
    page += 1
    params.onProgress?.(
      createIdleProgress({
        status: "fetching",
        phase: "list",
        phaseLabel: params.phaseLabel,
        totalFound: params.uniqueSoFar,
        sourceIndex: params.sourceIndex,
        sourceTotal: params.sourceTotal,
        message: `Nguồn ${params.sourceIndex}/${params.sourceTotal} [${params.phaseLabel}] trang ${page} — đang tìm...`,
      }),
    )

    const url = `${params.baseUrl}${params.query}${state ? `&state=${state}` : ""}`
    const resp = await gdtGetJson(url, params.username, params.password, {
      signal: params.signal,
      maxAttempts: 3,
    })

    if ("path" in resp && "timestamp" in resp) {
      break
    }

    const datas = Array.isArray(resp.datas) ? (resp.datas as GdtInvoiceSummary[]) : []
    results.push(...datas)
    state = String(resp.state ?? "")
    if (!state) {
      break
    }
  }

  return results
}

async function fetchInvoiceList(params: FetchAllInvoicesParams): Promise<GdtInvoiceSummary[]> {
  const dateFrom = formatGdtDate(params.dateFrom, false)
  const dateTo = formatGdtDate(params.dateTo, true)
  const pageSize = params.pageSize ?? DEFAULT_PAGE_SIZE
  const configs = listSourceConfigs(params.invType)
  const allItems: GdtInvoiceSummary[] = []
  const seen = new Set<string>()

  params.onProgress?.(
    createIdleProgress({
      status: "starting",
      phase: "list",
      sourceTotal: configs.length,
      message: "Đang khởi động lấy danh sách hóa đơn...",
    }),
  )

  for (let index = 0; index < configs.length; index += 1) {
    const config = configs[index]
    const sourceIndex = index + 1
    const search =
      config.typeSearch != null
        ? `tdlap=ge=${dateFrom};tdlap=le=${dateTo};ttxly==${config.typeSearch}`
        : `tdlap=ge=${dateFrom};tdlap=le=${dateTo}`
    const query = `?sort=tdlap:desc&size=${pageSize}&search=${search}`

    let pageItems: GdtInvoiceSummary[] = []
    try {
      pageItems = await fetchAllPages({
        baseUrl: `${GDT_BASE}/${config.prefix}/invoices/${config.endpoint}`,
        query,
        username: params.username,
        password: params.password,
        phaseLabel: config.label,
        uniqueSoFar: allItems.length,
        sourceIndex,
        sourceTotal: configs.length,
        pageSize,
        onProgress: params.onProgress,
        signal: params.signal,
      })
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw error
      }
      // Bỏ qua nguồn lỗi, tiếp tục nguồn khác (giống agent).
      pageItems = []
    }

    for (const item of pageItems) {
      const key = invoiceKey(item)
      if (!seen.has(key)) {
        seen.add(key)
        allItems.push(item)
      }
    }

    params.onProgress?.(
      createIdleProgress({
        status: "fetching",
        phase: "list",
        phaseLabel: config.label,
        totalFound: allItems.length,
        sourceIndex,
        sourceTotal: configs.length,
        message: `Nguồn ${sourceIndex}/${configs.length} [${config.label}] xong — đang tìm...`,
      }),
    )
  }

  return allItems
}

async function fetchInvoiceDetails(
  params: FetchAllInvoicesParams,
  items: GdtInvoiceSummary[],
  options?: {
    progressOffset?: number
    progressTotal?: number
    failedBase?: number
    progressLabel?: string
  },
): Promise<{ results: GdtInvoiceItem[]; failedCount: number }> {
  const chunkTotal = items.length
  const progressTotal = options?.progressTotal ?? chunkTotal
  const progressOffset = options?.progressOffset ?? 0
  const failedBase = options?.failedBase ?? 0
  let doneInChunk = 0
  let failedInChunk = 0
  const concurrency = params.maxConcurrent ?? DEFAULT_MAX_CONCURRENT

  params.onProgress?.(
    createIdleProgress({
      status: "fetching_detail",
      phase: "detail",
      totalFound: progressTotal,
      detailDone: progressOffset,
      detailTotal: progressTotal,
      detailFailed: failedBase,
      message:
        options?.progressLabel ??
        `Đang lấy chi tiết ${progressOffset}/${progressTotal}`,
    }),
  )

  const results = await mapPool(
    items,
    concurrency,
    async (inv) => {
      const khhdon = String(inv.khhdon ?? "")
      const nbmst = String(inv.nbmst ?? "")
      const shdon = String(inv.shdon ?? "")
      const khmshdon = String(inv.khmshdon ?? "")
      const current = formatInvoiceDisplayLabel(inv)
      const url = buildDetailUrl(khhdon, nbmst, shdon, khmshdon)

      try {
        const data = await gdtGetJson(url, params.username, params.password, {
          signal: params.signal,
          maxAttempts: 5,
        })

        if ("path" in data) {
          throw new Error("invalid detail")
        }

        doneInChunk += 1
        const detailDone = progressOffset + doneInChunk
        params.onProgress?.(
          createIdleProgress({
            status: "fetching_detail",
            phase: "detail",
            phaseLabel: "chi tiết",
            totalFound: progressTotal,
            detailDone,
            detailTotal: progressTotal,
            detailFailed: failedBase + failedInChunk,
            currentInv: current,
            message:
              options?.progressLabel ??
              `Đang lấy chi tiết ${detailDone}/${progressTotal}`,
          }),
        )
        return { ...inv, detail: data, detail_error: null }
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error
        }
        doneInChunk += 1
        failedInChunk += 1
        const detailDone = progressOffset + doneInChunk
        const detailFailed = failedBase + failedInChunk
        const rateLimited = isGdtRateLimitError(error)
        params.onProgress?.(
          createIdleProgress({
            status: "fetching_detail",
            phase: "detail",
            phaseLabel: "chi tiết",
            totalFound: progressTotal,
            detailDone,
            detailTotal: progressTotal,
            detailFailed,
            currentInv: current,
            message: rateLimited
              ? `TCT giới hạn tốc độ — chi tiết ${detailDone}/${progressTotal} (lỗi ${detailFailed})`
              : `Đang lấy chi tiết ${detailDone}/${progressTotal} (lỗi ${detailFailed})`,
          }),
        )
        return {
          ...inv,
          detail: null,
          detail_error: rateLimited
            ? "TCT giới hạn tốc độ (HTTP 429) — không lấy được chi tiết"
            : "Không lấy được chi tiết từ TCT",
        }
      }
    },
    params.signal,
  )

  return { results, failedCount: failedInChunk }
}

async function ensureLoggedIn(
  params: FetchAllInvoicesParams,
  options?: { quiet?: boolean },
): Promise<{ username: string; password: string }> {
  const username = params.username.trim()
  const password = params.password
  if (!username || !password) {
    throw new Error("Thiếu username hoặc password GDT")
  }
  if (!params.dateFrom || !params.dateTo) {
    throw new Error("Thiếu khoảng ngày")
  }

  // Ưu tiên token đã lưu DB / cache — không login lại nếu còn dùng được.
  const persisted = String(params.persistedToken ?? "").trim()
  if (persisted && !peekGdtToken(username)) {
    await seedGdtToken(username, persisted, password)
  }

  let usedCachedToken = false
  if (!options?.quiet) {
    params.onProgress?.(
      createIdleProgress({
        status: "logging_in",
        phase: "login",
        message: peekGdtToken(username)
          ? "Đang kết nối bằng token đã lưu..."
          : "Đang đăng nhập GDT...",
      }),
    )
  }

  const token = await getToken(username, password, {
    signal: params.signal,
    onUsingCachedToken: () => {
      usedCachedToken = true
    },
    onLoginAttempt: options?.quiet
      ? undefined
      : (attempt) => {
          params.onProgress?.(
            createIdleProgress({
              status: "logging_in",
              phase: "login",
              message: `Đang đăng nhập (lần ${attempt}/5)...`,
            }),
          )
        },
  })
  if (!token) {
    throw new Error("GDT từ chối đăng nhập (sai tài khoản/mật khẩu hoặc captcha)")
  }

  if (!options?.quiet) {
    params.onProgress?.(
      createIdleProgress({
        status: "logging_in",
        phase: "login",
        message: usedCachedToken
          ? "Đã kết nối bằng token đã lưu"
          : "Đăng nhập GDT thành công",
      }),
    )
  }

  return { username, password }
}

/** Tương đương POST /fetch-invoice-list của agent. */
export async function fetchInvoiceListFromGdt(
  params: FetchAllInvoicesParams,
): Promise<{ count: number; items: GdtInvoiceSummary[] }> {
  const { username, password } = await ensureLoggedIn(params)
  const list = await fetchInvoiceList({ ...params, username, password })
  params.onProgress?.(
    createIdleProgress({
      status: "done",
      phase: "list",
      totalFound: list.length,
      message: `Hoàn thành danh sách: ${list.length} hóa đơn.`,
    }),
  )
  return { count: list.length, items: list }
}

/**
 * Tương đương POST /fetch-invoice-details — xử lý theo batch 200 (C99).
 * Trong mỗi batch gọi song song có giới hạn concurrency; nghỉ giữa batch;
 * retry một lần các HĐ lỗi ở cuối.
 */
export async function fetchInvoiceDetailsFromGdt(
  params: FetchAllInvoicesParams,
  items: GdtInvoiceSummary[],
  options?: FetchInvoiceDetailsOptions,
): Promise<{ results: GdtInvoiceItem[]; failedCount: number }> {
  const { username, password } = await ensureLoggedIn(
    {
      ...params,
      dateFrom: params.dateFrom || "20000101",
      dateTo: params.dateTo || "20991231",
    },
    { quiet: true },
  )

  const batchSize = options?.batchSize ?? GDT_DETAIL_BATCH_SIZE
  const batchPauseMs = options?.batchPauseMs ?? GDT_BATCH_PAUSE_MS
  const retryFailedOnce = options?.retryFailedOnce !== false
  const total = items.length
  const allResults: GdtInvoiceItem[] = new Array(total)

  if (total === 0) {
    return { results: [], failedCount: 0 }
  }

  const boundParams: FetchAllInvoicesParams = {
    ...params,
    username,
    password,
  }

  let batchIndex = 0
  for (let start = 0; start < items.length; start += batchSize) {
    if (params.signal?.aborted) {
      throw new DOMException("Aborted", "AbortError")
    }
    const batch = items.slice(start, start + batchSize)
    const failedSoFar = allResults
      .slice(0, start)
      .filter((item) => item && isDetailFailed(item)).length

    const { results } = await fetchInvoiceDetails(boundParams, batch, {
      progressOffset: start,
      progressTotal: total,
      failedBase: failedSoFar,
    })

    for (let i = 0; i < results.length; i += 1) {
      allResults[start + i] = results[i]
    }

    await options?.onBatchComplete?.(results, {
      batchStart: start,
      batchIndex,
      batchCount: Math.ceil(total / batchSize),
      total,
      isRetry: false,
    })

    batchIndex += 1
    if (start + batchSize < items.length && batchPauseMs > 0) {
      params.onProgress?.(
        createIdleProgress({
          status: "fetching_detail",
          phase: "detail",
          phaseLabel: "chi tiết",
          totalFound: total,
          detailDone: start + results.length,
          detailTotal: total,
          detailFailed: allResults
            .slice(0, start + results.length)
            .filter((item) => item && isDetailFailed(item)).length,
          message: `Tạm nghỉ ${Math.round(batchPauseMs / 1000)}s trước batch tiếp theo...`,
        }),
      )
      await gdtSleep(batchPauseMs, params.signal)
    }
  }

  if (retryFailedOnce) {
    const failedIndices: number[] = []
    for (let i = 0; i < allResults.length; i += 1) {
      if (isDetailFailed(allResults[i])) {
        failedIndices.push(i)
      }
    }

    if (failedIndices.length > 0) {
      params.onProgress?.(
        createIdleProgress({
          status: "fetching_detail",
          phase: "detail",
          phaseLabel: "chi tiết",
          totalFound: total,
          detailDone: total - failedIndices.length,
          detailTotal: total,
          detailFailed: failedIndices.length,
          message: `Đang lấy lại ${failedIndices.length} hóa đơn lỗi chi tiết...`,
        }),
      )

      if (batchPauseMs > 0) {
        await gdtSleep(batchPauseMs, params.signal)
      }

      const toRetry = failedIndices.map((index) => items[index])
      const { results: retryResults } = await fetchInvoiceDetails(
        {
          ...boundParams,
          onProgress: (progress) => {
            if (progress.phase !== "detail") {
              return
            }
            params.onProgress?.(
              createIdleProgress({
                status: "fetching_detail",
                phase: "detail",
                phaseLabel: "chi tiết",
                totalFound: total,
                detailDone: total - failedIndices.length + progress.detailDone,
                detailTotal: total,
                detailFailed: progress.detailFailed,
                currentInv: progress.currentInv,
                message: `Đang lấy lại chi tiết lỗi ${progress.detailDone}/${failedIndices.length}`,
              }),
            )
          },
        },
        toRetry,
        {
          progressOffset: 0,
          progressTotal: failedIndices.length,
          failedBase: 0,
          progressLabel: `Đang lấy lại chi tiết lỗi 0/${failedIndices.length}`,
        },
      )

      const recovered: GdtInvoiceItem[] = []
      for (let j = 0; j < failedIndices.length; j += 1) {
        const index = failedIndices[j]
        allResults[index] = retryResults[j]
        if (!isDetailFailed(retryResults[j])) {
          recovered.push(retryResults[j])
        }
      }

      if (recovered.length > 0) {
        await options?.onBatchComplete?.(recovered, {
          batchStart: 0,
          batchIndex,
          batchCount: batchIndex + 1,
          total,
          isRetry: true,
        })
      }
    }
  }

  const failedCount = allResults.filter((item) => isDetailFailed(item)).length
  return { results: allResults, failedCount }
}

/** Lấy toàn bộ HĐ (list + detail) — giữ lại cho tương thích. */
export async function fetchAllInvoicesFromGdt(
  params: FetchAllInvoicesParams,
): Promise<FetchAllInvoicesResult> {
  const listResult = await fetchInvoiceListFromGdt(params)
  if (listResult.items.length === 0) {
    return {
      success: true,
      partial: false,
      count: 0,
      detailErrorCount: 0,
      items: [],
    }
  }

  const { results, failedCount } = await fetchInvoiceDetailsFromGdt(params, listResult.items)
  const isPartial = failedCount > 0

  params.onProgress?.(
    createIdleProgress({
      status: isPartial ? "partial" : "done",
      phase: "done",
      totalFound: results.length,
      detailDone: results.length,
      detailTotal: results.length,
      detailFailed: failedCount,
      message: isPartial
        ? `Hoàn thành một phần: ${failedCount}/${results.length} hóa đơn lỗi chi tiết.`
        : `Hoàn thành: ${results.length} hóa đơn.`,
    }),
  )

  return {
    success: !isPartial,
    partial: isPartial,
    count: results.length,
    detailErrorCount: failedCount,
    items: results,
  }
}
