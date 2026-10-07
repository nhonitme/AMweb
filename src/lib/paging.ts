import CustomStore from "devextreme/data/custom_store"

import type { PagedResult } from "@/types/paging"

/** Single default page size for server-paged list screens (chit, e-invoice, …). */
export const DEFAULT_PAGE_SIZE = 20

export function readPagedNumber(...values: unknown[]): number | undefined {
  for (const value of values) {
    if (value == null || value === "") {
      continue
    }

    const parsed = Number(value)
    if (Number.isFinite(parsed) && parsed >= 0) {
      return parsed
    }
  }

  return undefined
}

export function resolvePageNumber(value: unknown, fallback = 1): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function resolvePageSize(value: unknown, fallback = DEFAULT_PAGE_SIZE): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

export function normalizePagedResult<T>(
  payload: Record<string, unknown> | null | undefined,
  data: T[],
  fallbackPageNumber = 1,
  fallbackPageSize = DEFAULT_PAGE_SIZE,
): PagedResult<T> {
  const source = payload ?? {}
  const pageSize = readPagedNumber(source.PageSize, source.pageSize) ?? fallbackPageSize
  const totalRecords = readPagedNumber(source.TotalRecords, source.totalRecords) ?? data.length
  const totalPages =
    readPagedNumber(source.TotalPages, source.totalPages) ??
    Math.max(1, Math.ceil(totalRecords / Math.max(pageSize, 1)))
  const pageNumber = readPagedNumber(source.PageNumber, source.pageNumber) ?? fallbackPageNumber

  return {
    data,
    pageNumber,
    pageSize,
    totalRecords,
    totalPages,
    hasPrevious: Boolean(source.HasPrevious ?? source.hasPrevious ?? pageNumber > 1),
    hasNext: Boolean(source.HasNext ?? source.hasNext ?? pageNumber < totalPages),
    message: String(source.Message ?? source.message ?? ""),
    success: Boolean(source.Success ?? source.success ?? true),
  }
}

/**
 * CustomStore that only mirrors React Query page data + server totalCount.
 * Does not fetch — callers reload the store after each query success.
 */
export function createMirrorPagedStore<T>(
  key: string,
  getRows: () => T[],
  getTotalRecords: () => number,
): CustomStore {
  return new CustomStore({
    key,
    load: () => {
      // DevExtreme CustomStore.load must return a Promise (or an array).
      // A sync `{ data, totalCount }` object throws E4012.
      const data = getRows()
      return Promise.resolve({
        data,
        totalCount: Math.max(getTotalRecords(), data.length),
      })
    },
  })
}

export function reloadGridDataSource(grid: { getDataSource?: () => { reload: () => Promise<unknown> } | null } | null): void {
  const dataSource = grid?.getDataSource?.()
  if (dataSource) {
    void dataSource.reload()
  }
}

/** Sync DX pager to React pageNumber after mirrored store reload; suppresses paging.* feedback. */
export function syncMirroredGridPage(
  grid: {
    getDataSource?: () => { reload: () => Promise<unknown> } | null
    pageIndex: (value?: number) => number
  } | null,
  pageNumber: number,
  suppressRef: { current: boolean },
): void {
  suppressRef.current = true
  reloadGridDataSource(grid)
  const targetPageIndex = Math.max(pageNumber - 1, 0)
  if (grid && grid.pageIndex() !== targetPageIndex) {
    grid.pageIndex(targetPageIndex)
  }
  window.setTimeout(() => {
    suppressRef.current = false
  }, 0)
}

export const SERVER_PAGING_REMOTE_OPERATIONS = {
  paging: true,
  grouping: false,
  filtering: false,
  sorting: false,
} as const
