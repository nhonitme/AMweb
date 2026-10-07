export type NotificationPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' | string

export type SysNotificationItem = {
  ID: number
  COMPANY_CD: string
  USER_ID: string | null
  ROLE_CD: string | null
  NOTIFICATION_TYPE: string
  SOURCE_MODULE: string | null
  SOURCE_ID: string | null
  TITLE: string
  MESSAGE: string | null
  PRIORITY: NotificationPriority
  ACTION_URL: string | null
  IS_READ: string
  READ_AT: string | null
  CREATED_BY: string | null
  CREATED_AT: string | null
  EXPIRED_AT: string | null
}

export type SysNotificationSummary = {
  TOTAL_COUNT: number
  UNREAD_COUNT: number
}

export type NotificationDisplayType = 'error' | 'info' | 'success' | 'warning'

export type NotificationListQuery = {
  isRead?: 'Y' | 'N'
  notificationType?: string
  sourceModule?: string
  keyword?: string
  pageNumber?: number
  pageSize?: number
}

export type NotificationListResult = {
  items: SysNotificationItem[]
  pageNumber: number
  pageSize: number
  totalRecords: number
}
