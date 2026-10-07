import axios from './axiosClient'
import API_BASE_URL from '../config/apiConfig'
import { getApiObjectPayload, logApiError } from './apiTypes'
import type {
  NotificationListQuery,
  NotificationListResult,
  SysNotificationItem,
  SysNotificationSummary,
} from '@/types/notification'

const BASE_URL = `${API_BASE_URL}/notifications`

type PagedEnvelope<T> = {
  Data?: T[]
  data?: T[]
  TotalRecords?: number
  totalRecords?: number
  PageNumber?: number
  pageNumber?: number
  PageSize?: number
  pageSize?: number
}

function normalizePagedNotifications(
  payload: unknown,
  fallbackPageNumber: number,
  fallbackPageSize: number,
): NotificationListResult {
  const envelope = (payload && typeof payload === 'object' ? payload : {}) as PagedEnvelope<SysNotificationItem>
  const items = Array.isArray(envelope.Data)
    ? envelope.Data
    : Array.isArray(envelope.data)
      ? envelope.data
      : []
  const totalRecords = envelope.TotalRecords ?? envelope.totalRecords ?? items.length
  const pageNumber = envelope.PageNumber ?? envelope.pageNumber ?? fallbackPageNumber
  const pageSize = envelope.PageSize ?? envelope.pageSize ?? fallbackPageSize

  return {
    items,
    pageNumber,
    pageSize,
    totalRecords,
  }
}

const SUMMARY_CACHE_STORAGE_KEY = 'amnote_notification_summary'

let summaryCache: SysNotificationSummary | null = null
let summaryInFlight: Promise<SysNotificationSummary> | null = null

function readStoredSummary(): SysNotificationSummary | null {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    const raw = window.localStorage.getItem(SUMMARY_CACHE_STORAGE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<SysNotificationSummary>
    return {
      TOTAL_COUNT: Number(parsed.TOTAL_COUNT ?? 0),
      UNREAD_COUNT: Number(parsed.UNREAD_COUNT ?? 0),
    }
  } catch {
    return null
  }
}

function writeStoredSummary(summary: SysNotificationSummary): void {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(SUMMARY_CACHE_STORAGE_KEY, JSON.stringify(summary))
  } catch {
  }
}

export function clearNotificationSummaryCache(): void {
  summaryCache = null
  summaryInFlight = null

  if (typeof window !== 'undefined') {
    try {
      window.localStorage.removeItem(SUMMARY_CACHE_STORAGE_KEY)
    } catch {
    }
  }
}

export async function getNotificationSummary(options: { force?: boolean } = {}): Promise<SysNotificationSummary> {
  if (!options.force) {
    if (summaryCache) {
      return summaryCache
    }

    const stored = readStoredSummary()
    if (stored) {
      summaryCache = stored
      return stored
    }

    if (summaryInFlight) {
      return summaryInFlight
    }
  }

  const request = (async () => {
    try {
      const resp = await axios.get(`${BASE_URL}/summary`)
      const payload = getApiObjectPayload<SysNotificationSummary>(resp.data)
      const summary: SysNotificationSummary = {
        TOTAL_COUNT: Number(payload.TOTAL_COUNT ?? 0),
        UNREAD_COUNT: Number(payload.UNREAD_COUNT ?? 0),
      }
      summaryCache = summary
      writeStoredSummary(summary)
      return summary
    } catch (error) {
      logApiError('Error in getNotificationSummary:', error)
      throw error
    } finally {
      summaryInFlight = null
    }
  })()

  summaryInFlight = request
  return request
}

export async function getNotifications(query: NotificationListQuery = {}): Promise<NotificationListResult> {
  const pageNumber = query.pageNumber && query.pageNumber > 0 ? query.pageNumber : 1
  const pageSize = query.pageSize && query.pageSize > 0 ? query.pageSize : 20

  try {
    const resp = await axios.get(BASE_URL, {
      params: {
        isRead: query.isRead,
        notificationType: query.notificationType,
        sourceModule: query.sourceModule,
        keyword: query.keyword,
        pageNumber,
        pageSize,
      },
    })

    return normalizePagedNotifications(resp.data, pageNumber, pageSize)
  } catch (error) {
    logApiError('Error in getNotifications:', error)
    throw error
  }
}

export async function syncNotifications(fromYmd?: string, toYmd?: string): Promise<number> {
  try {
    const resp = await axios.post(`${BASE_URL}/sync`, { fromYmd, toYmd })
    const payload = getApiObjectPayload<{ SyncedCount?: number }>(resp.data)
    return Number(payload.SyncedCount ?? 0)
  } catch (error) {
    logApiError('Error in syncNotifications:', error)
    throw error
  }
}

export async function markNotificationRead(id: number): Promise<void> {
  try {
    await axios.put(`${BASE_URL}/${id}/read`)
  } catch (error) {
    logApiError('Error in markNotificationRead:', error)
    throw error
  }
}

export async function markAllNotificationsRead(): Promise<number> {
  try {
    const resp = await axios.put(`${BASE_URL}/read-all`)
    const payload = getApiObjectPayload<{ AffectedRows?: number }>(resp.data)
    return Number(payload.AffectedRows ?? 0)
  } catch (error) {
    logApiError('Error in markAllNotificationsRead:', error)
    throw error
  }
}
