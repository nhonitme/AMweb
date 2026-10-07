import type { DetailBatchCompleteMeta } from "../fetchAllInvoices"
import type { GdtInvoiceItem, GdtInvoiceSummary } from "../types"
import {
  fetchDetailsViaExtensionPort,
  sendExtensionMessage,
} from "./chromeRuntime"
import {
  EXTENSION_MESSAGE_BATCH_SIZE,
  GDT_EXTENSION_ID,
} from "./extensionConfig"
import type { GdtDetailConnector, GdtDetailFetchOptions } from "./types"
import type { WebGdtConnector } from "./webGdtConnector"

function invoiceKey(item: GdtInvoiceSummary): string {
  return [
    String(item.khhdon ?? ""),
    String(item.shdon ?? ""),
    String(item.nbmst ?? ""),
    String(item.khmshdon ?? ""),
    String(item.mhdon ?? ""),
  ].join("|")
}

function isDetailFailed(item: GdtInvoiceItem): boolean {
  return Boolean(item.detail_error) || !item.detail
}

function isAbortError(error: unknown): boolean {
  return error instanceof DOMException && error.name === "AbortError"
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }
}

function chunkArray<T>(items: T[], size: number): T[][] {
  const chunks: T[][] = []
  const step = Math.max(1, size)
  for (let i = 0; i < items.length; i += step) {
    chunks.push(items.slice(i, i + step))
  }
  return chunks
}

/**
 * Extension fast-path — batch 100, concurrency trong extension (=2).
 * Progress realtime qua Port (mỗi HĐ xong → PROGRESS).
 * Lỗi giữa chừng → fallback Web chỉ cho HĐ chưa xử lý.
 */
export class ExtensionGdtConnector implements GdtDetailConnector {
  readonly name = "extension" as const

  constructor(private readonly webFallback: WebGdtConnector) {}

  async fetchDetails(
    token: string,
    invoices: GdtInvoiceSummary[],
    options?: GdtDetailFetchOptions,
  ): Promise<GdtInvoiceItem[]> {
    const nextToken = token.trim()
    if (!nextToken) {
      throw new Error("Thiếu token GDT cho Extension connector")
    }
    if (invoices.length === 0) {
      return []
    }

    const jobId = `gdt-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
    const onAbort = () => {
      void sendExtensionMessage(GDT_EXTENSION_ID, {
        type: "CANCEL_JOB",
        jobId,
      }).catch(() => {
        // ignore — extension có thể đã tắt
      })
    }
    options?.signal?.addEventListener("abort", onAbort, { once: true })

    const allResults = new Array<GdtInvoiceItem | undefined>(invoices.length)
    const completedKeys = new Set<string>()
    const total = invoices.length

    const batches = chunkArray(invoices, EXTENSION_MESSAGE_BATCH_SIZE)
    const batchCount = batches.length

    try {
      for (let batchIndex = 0; batchIndex < batches.length; batchIndex += 1) {
        assertNotAborted(options?.signal)
        const batch = batches[batchIndex]
        const batchStart = batchIndex * EXTENSION_MESSAGE_BATCH_SIZE

        let batchResults: GdtInvoiceItem[]
        try {
          batchResults = await this.fetchOneBatch(
            nextToken,
            batch,
            `${jobId}-b${batchIndex}`,
            {
              signal: options?.signal,
              progressOffset: batchStart,
              progressTotal: total,
              onProgress: (absoluteDone, absoluteTotal, currentInv) => {
                options?.onProgress?.(absoluteDone, absoluteTotal, currentInv)
              },
            },
          )
        } catch (error) {
          if (isAbortError(error)) {
            throw error
          }
          return this.fallbackRemaining(
            nextToken,
            invoices,
            allResults,
            completedKeys,
            options,
            error,
          )
        }

        for (let i = 0; i < batchResults.length; i += 1) {
          const item = batchResults[i]
          const absoluteIndex = batchStart + i
          allResults[absoluteIndex] = item
          completedKeys.add(invoiceKey(invoices[absoluteIndex] ?? item))
        }

        options?.onProgress?.(
          Math.min(batchStart + batchResults.length, total),
          total,
        )

        const meta: DetailBatchCompleteMeta = {
          batchStart,
          batchIndex,
          batchCount,
          total,
          isRetry: false,
        }
        await options?.onBatchComplete?.(batchResults, meta)
      }

      const failedIndices: number[] = []
      for (let i = 0; i < allResults.length; i += 1) {
        const item = allResults[i]
        if (!item || isDetailFailed(item)) {
          failedIndices.push(i)
        }
      }

      if (failedIndices.length > 0) {
        assertNotAborted(options?.signal)
        const toRetry = failedIndices.map((index) => invoices[index])
        let retryResults: GdtInvoiceItem[]
        try {
          retryResults = await this.fetchOneBatch(
            nextToken,
            toRetry,
            `${jobId}-retry`,
            {
              signal: options?.signal,
              progressOffset: total - failedIndices.length,
              progressTotal: total,
              onProgress: (absoluteDone, absoluteTotal, currentInv) => {
                options?.onProgress?.(absoluteDone, absoluteTotal, currentInv)
              },
            },
          )
        } catch (error) {
          if (isAbortError(error)) {
            throw error
          }
          const pending = failedIndices.map((index) => invoices[index])
          options?.onConnectorModeChange?.("web")
          const webResults = await this.webFallback.fetchDetails(nextToken, pending, {
            signal: options?.signal,
            onProgress: (done, _total, currentInv) => {
              options?.onProgress?.(
                total - failedIndices.length + done,
                total,
                currentInv,
              )
            },
            onBatchComplete: async (items, meta) => {
              await options?.onBatchComplete?.(items, {
                ...meta,
                isRetry: true,
                total,
              })
            },
          })
          for (let j = 0; j < failedIndices.length; j += 1) {
            allResults[failedIndices[j]] = webResults[j]
          }
          return allResults.map(
            (item, index) =>
              item ?? {
                ...invoices[index],
                detail: null,
                detail_error: "missing",
              },
          )
        }

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
            batchIndex: batchCount,
            batchCount: batchCount + 1,
            total,
            isRetry: true,
          })
        }
        options?.onProgress?.(total, total)
      }

      return allResults.map(
        (item, index) =>
          item ?? {
            ...invoices[index],
            detail: null,
            detail_error: "missing",
          },
      )
    } finally {
      options?.signal?.removeEventListener("abort", onAbort)
      if (options?.signal?.aborted) {
        onAbort()
      }
    }
  }

  private async fetchOneBatch(
    token: string,
    items: GdtInvoiceSummary[],
    jobId: string,
    opts: {
      signal?: AbortSignal
      progressOffset: number
      progressTotal: number
      onProgress?: (
        absoluteDone: number,
        absoluteTotal: number,
        currentInv?: string,
      ) => void
    },
  ): Promise<GdtInvoiceItem[]> {
    assertNotAborted(opts.signal)

    const response = await fetchDetailsViaExtensionPort({
      extensionId: GDT_EXTENSION_ID,
      signal: opts.signal,
      timeoutMs: 30 * 60_000,
      message: {
        type: "FETCH_DETAILS",
        jobId,
        token,
        items,
        progressOffset: opts.progressOffset,
        progressTotal: opts.progressTotal,
      },
      onProgress: (progress) => {
        const absoluteDone =
          progress.absoluteDone ?? opts.progressOffset + progress.done
        const absoluteTotal = progress.absoluteTotal ?? opts.progressTotal
        opts.onProgress?.(absoluteDone, absoluteTotal, progress.currentInv)
      },
    })

    if (opts.signal?.aborted || response.cancelled) {
      throw new DOMException("Aborted", "AbortError")
    }
    if (!response.success || !Array.isArray(response.results)) {
      throw new Error(response.error || "Extension FETCH_DETAILS thất bại")
    }
    const results = response.results as GdtInvoiceItem[]
    if (results.length !== items.length) {
      throw new Error(
        `Extension trả ${results.length}/${items.length} HĐ — không khớp batch`,
      )
    }
    return results
  }

  private async fallbackRemaining(
    token: string,
    invoices: GdtInvoiceSummary[],
    allResults: Array<GdtInvoiceItem | undefined>,
    completedKeys: Set<string>,
    options: GdtDetailFetchOptions | undefined,
    _cause: unknown,
  ): Promise<GdtInvoiceItem[]> {
    const pendingIndices: number[] = []
    const pending: GdtInvoiceSummary[] = []
    for (let i = 0; i < invoices.length; i += 1) {
      const key = invoiceKey(invoices[i])
      if (!completedKeys.has(key) || !allResults[i]) {
        pendingIndices.push(i)
        pending.push(invoices[i])
      }
    }

    if (pending.length === 0) {
      return allResults.map(
        (item, index) =>
          item ?? {
            ...invoices[index],
            detail: null,
            detail_error: "missing",
          },
      )
    }

    const alreadyDone = invoices.length - pending.length
    options?.onConnectorModeChange?.("web")
    const webResults = await this.webFallback.fetchDetails(token, pending, {
      signal: options?.signal,
      onProgress: (done, _total, currentInv) => {
        options?.onProgress?.(alreadyDone + done, invoices.length, currentInv)
      },
      onBatchComplete: options?.onBatchComplete,
    })

    for (let j = 0; j < pendingIndices.length; j += 1) {
      allResults[pendingIndices[j]] = webResults[j]
    }

    return allResults.map(
      (item, index) =>
        item ?? {
          ...invoices[index],
          detail: null,
          detail_error: "missing",
        },
    )
  }
}
