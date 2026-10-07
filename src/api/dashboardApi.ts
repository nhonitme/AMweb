import type { AxiosResponse } from "axios"

import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { getCurrentCompanyCd, getCurrentSession } from "@/lib/login"
import { clearGlobalStorageNamespace, readGlobalStorageItem, writeGlobalStorageItem } from "@/lib/globalStorageCache"
import type {
  DashboardFilter,
  DashboardKpi,
  DashboardChartItem,
  DashboardTaskItem,
  DashboardReceivable,
  DashboardPayable,
  DashboardTaxDeadline,
  DashboardPeriodLock,
  DashboardOverviewData,
  DashboardRecentVoucher,
} from "@/types/dashboard"

const BASE_URL = `${API_BASE_URL}/Dashboard`
const DASHBOARD_CACHE_NAMESPACE = "dashboard-overview-v2"
const DASHBOARD_SECTION_TIMEOUT_MS = 6000
const dashboardOverviewCache = new Map<string, DashboardOverviewData>()
const dashboardOverviewRequestCache = new Map<string, Promise<DashboardOverviewData>>()

type ApiEnvelope<T> = {
  Data?: T
  Message?: string
  Success?: boolean
  data?: T
  message?: string
  success?: boolean
}

function unwrap<T>(res: AxiosResponse<ApiEnvelope<T>>): T {
  const d = res.data
  return ((d.Data ?? d.data) ?? d) as T
}

type LoadResult<T> = {
  ok: boolean
  value: T
}

async function loadOrFallback<T>(factory: (signal: AbortSignal) => Promise<T>, fallback: T): Promise<LoadResult<T>> {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  const controller = new AbortController()
  const request = factory(controller.signal)
    .then((value): LoadResult<T> => ({ ok: true, value }))
    .catch((): LoadResult<T> => ({ ok: false, value: fallback }))
  const timeout = new Promise<LoadResult<T>>((resolve) => {
    timeoutId = setTimeout(() => {
      controller.abort()
      resolve({ ok: false, value: fallback })
    }, DASHBOARD_SECTION_TIMEOUT_MS)
  })

  try {
    return await Promise.race([request, timeout])
  } finally {
    if (timeoutId !== null) {
      clearTimeout(timeoutId)
    }
  }
}

function normalizeCachePart(value?: string | null): string {
  return String(value ?? "").trim().toUpperCase()
}

function buildDashboardOverviewCacheKey(filter: DashboardFilter): string {
  const session = getCurrentSession()
  const companyCd = normalizeCachePart(getCurrentCompanyCd()) || "DEFAULT"
  const userId = normalizeCachePart(session?.userId) || "DEFAULT"

  return [
    `company=${companyCd}`,
    `user=${userId}`,
    `from=${normalizeCachePart(filter.fromYmd)}`,
    `to=${normalizeCachePart(filter.toYmd)}`,
    `year=${normalizeCachePart(filter.year)}`,
    `period=${normalizeCachePart(filter.periodYm)}`,
    "receivableTop=10",
    "payableTop=10",
    "voucherStatus=ALL",
    "voucherLimit=20",
  ].join("|")
}

function readDashboardOverviewCache(cacheKey: string): DashboardOverviewData | null {
  const memoryData = dashboardOverviewCache.get(cacheKey)
  if (memoryData) {
    return memoryData
  }

  const storageData = readGlobalStorageItem<DashboardOverviewData>(DASHBOARD_CACHE_NAMESPACE, cacheKey, "session")
  if (storageData) {
    dashboardOverviewCache.set(cacheKey, storageData)
  }

  return storageData
}

function writeDashboardOverviewCache(cacheKey: string, data: DashboardOverviewData): void {
  dashboardOverviewCache.set(cacheKey, data)
  writeGlobalStorageItem(DASHBOARD_CACHE_NAMESPACE, cacheKey, data, "session")
}

export function clearDashboardCache(): void {
  dashboardOverviewCache.clear()
  dashboardOverviewRequestCache.clear()
  clearGlobalStorageNamespace(DASHBOARD_CACHE_NAMESPACE, "session")
  clearGlobalStorageNamespace("dashboard-overview-v1", "session")
}

export async function getDashboardKpi(fromYmd: string, toYmd: string, signal?: AbortSignal): Promise<DashboardKpi> {
  const res = await axios.get<ApiEnvelope<DashboardKpi>>(`${BASE_URL}/kpi`, {
    params: { fromYmd, toYmd },
    signal,
  })
  return unwrap(res)
}

export async function getDashboardChart(year: string, signal?: AbortSignal): Promise<DashboardChartItem[]> {
  const res = await axios.get<ApiEnvelope<DashboardChartItem[]>>(`${BASE_URL}/chart`, {
    params: { year },
    signal,
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getDashboardTasks(fromYmd: string, toYmd: string, signal?: AbortSignal): Promise<DashboardTaskItem[]> {
  const res = await axios.get<ApiEnvelope<DashboardTaskItem[]>>(`${BASE_URL}/tasks`, {
    params: { fromYmd, toYmd },
    signal,
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getDashboardReceivables(toYmd: string, top = 10, signal?: AbortSignal): Promise<DashboardReceivable[]> {
  const res = await axios.get<ApiEnvelope<DashboardReceivable[]>>(`${BASE_URL}/receivables`, {
    params: { toYmd, top },
    signal,
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getDashboardPayables(toYmd: string, top = 10, signal?: AbortSignal): Promise<DashboardPayable[]> {
  const res = await axios.get<ApiEnvelope<DashboardPayable[]>>(`${BASE_URL}/payables`, {
    params: { toYmd, top },
    signal,
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getDashboardTaxDeadlines(periodYm: string, signal?: AbortSignal): Promise<DashboardTaxDeadline[]> {
  const res = await axios.get<ApiEnvelope<DashboardTaxDeadline[]>>(`${BASE_URL}/tax-deadlines`, {
    params: { periodYm },
    signal,
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getDashboardPeriodLock(periodYm: string, signal?: AbortSignal): Promise<DashboardPeriodLock> {
  const res = await axios.get<ApiEnvelope<DashboardPeriodLock>>(`${BASE_URL}/period-lock`, {
    params: { periodYm },
    signal,
  })
  return unwrap(res)
}

export async function getDashboardRecentVouchers(
  fromYmd: string,
  toYmd: string,
  status?: string,
  limit = 20,
  signal?: AbortSignal
): Promise<DashboardRecentVoucher[]> {
  const res = await axios.get<ApiEnvelope<DashboardRecentVoucher[]>>(`${BASE_URL}/recent-vouchers`, {
    params: { fromYmd, toYmd, status, limit },
    signal,
  })
  const data = unwrap(res)
  return Array.isArray(data) ? data : []
}

export async function getDashboardOverview(filter: DashboardFilter, forceRefresh = false): Promise<DashboardOverviewData> {
  const cacheKey = buildDashboardOverviewCacheKey(filter)

  if (!forceRefresh) {
    const cachedData = readDashboardOverviewCache(cacheKey)
    if (cachedData) {
      return cachedData
    }

    const pendingRequest = dashboardOverviewRequestCache.get(cacheKey)
    if (pendingRequest) {
      return pendingRequest
    }
  }

  if (forceRefresh) {
    dashboardOverviewRequestCache.delete(cacheKey)
  }

  const request = (async (): Promise<DashboardOverviewData> => {
    const [
      kpi,
      chartData,
      tasks,
      receivables,
      payables,
      taxDeadlines,
      periodLock,
      recentVouchers,
    ] = await Promise.all([
      loadOrFallback((signal) => getDashboardKpi(filter.fromYmd, filter.toYmd, signal), null as DashboardKpi | null),
      loadOrFallback((signal) => getDashboardChart(filter.year, signal), [] as DashboardChartItem[]),
      loadOrFallback((signal) => getDashboardTasks(filter.fromYmd, filter.toYmd, signal), [] as DashboardTaskItem[]),
      loadOrFallback((signal) => getDashboardReceivables(filter.toYmd, 10, signal), [] as DashboardReceivable[]),
      loadOrFallback((signal) => getDashboardPayables(filter.toYmd, 10, signal), [] as DashboardPayable[]),
      loadOrFallback((signal) => getDashboardTaxDeadlines(filter.periodYm, signal), [] as DashboardTaxDeadline[]),
      loadOrFallback((signal) => getDashboardPeriodLock(filter.periodYm, signal), null as DashboardPeriodLock | null),
      loadOrFallback((signal) => getDashboardRecentVouchers(filter.fromYmd, filter.toYmd, "ALL", 20, signal), [] as DashboardRecentVoucher[]),
    ])

    const data: DashboardOverviewData = {
      kpi: kpi.value,
      chartData: chartData.value,
      tasks: tasks.value,
      receivables: receivables.value,
      payables: payables.value,
      taxDeadlines: taxDeadlines.value,
      periodLock: periodLock.value,
      recentVouchers: recentVouchers.value,
    }

    const shouldCache = [
      kpi,
      chartData,
      tasks,
      receivables,
      payables,
      taxDeadlines,
      periodLock,
      recentVouchers,
    ].every((result) => result.ok)

    if (shouldCache) {
      writeDashboardOverviewCache(cacheKey, data)
    }

    return data
  })().finally(() => {
    if (dashboardOverviewRequestCache.get(cacheKey) === request) {
      dashboardOverviewRequestCache.delete(cacheKey)
    }
  })

  dashboardOverviewRequestCache.set(cacheKey, request)
  return request
}
