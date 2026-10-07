import { fetchInvoiceDetailsFromGdt } from "../fetchAllInvoices"
import { seedGdtToken } from "../gdtClient"
import type { GdtInvoiceItem, GdtInvoiceSummary } from "../types"
import type { GdtDetailConnector, GdtDetailFetchOptions, WebGdtConnectorConfig } from "./types"

/**
 * Web fallback — tái dùng fetchInvoiceDetailsFromGdt (concurrency=1, interval=1000ms).
 */
export class WebGdtConnector implements GdtDetailConnector {
  readonly name = "web" as const

  constructor(private readonly config: WebGdtConnectorConfig) {}

  async fetchDetails(
    token: string,
    invoices: GdtInvoiceSummary[],
    options?: GdtDetailFetchOptions,
  ): Promise<GdtInvoiceItem[]> {
    const nextToken = token.trim()
    if (nextToken) {
      await seedGdtToken(this.config.username, nextToken, this.config.password)
    }

    const { results } = await fetchInvoiceDetailsFromGdt(
      {
        username: this.config.username,
        password: this.config.password,
        dateFrom: this.config.dateFrom,
        dateTo: this.config.dateTo,
        invType: this.config.invType,
        signal: options?.signal,
        onProgress: (progress) => {
          this.config.onGdtProgress?.(progress)
          if (progress.phase === "detail" && progress.detailTotal > 0) {
            options?.onProgress?.(
              progress.detailDone,
              progress.detailTotal,
              progress.currentInv || undefined,
            )
          }
        },
        persistedToken: nextToken || null,
      },
      invoices,
      {
        onBatchComplete: options?.onBatchComplete,
      },
    )
    return results
  }
}
