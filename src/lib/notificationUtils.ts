import type { NotificationDisplayType, NotificationPriority, SysNotificationItem } from '@/types/notification'

export function mapNotificationDisplayType(
  priority: NotificationPriority | null | undefined,
  notificationType: string | null | undefined,
): NotificationDisplayType {
  const normalizedType = String(notificationType ?? '').toUpperCase()
  if (normalizedType.endsWith('_DONE') || normalizedType.includes('SUCCESS')) {
    return 'success'
  }

  const normalizedPriority = String(priority ?? 'MEDIUM').toUpperCase()
  if (normalizedPriority === 'CRITICAL' || normalizedPriority === 'HIGH') {
    return 'error'
  }

  if (normalizedPriority === 'MEDIUM') {
    return 'warning'
  }

  return 'info'
}

export function isNotificationUnread(item: SysNotificationItem): boolean {
  return String(item.IS_READ ?? 'N').toUpperCase() !== 'Y'
}

export function formatNotificationTime(value: string | null | undefined): string {
  if (!value) {
    return ''
  }

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) {
    return value
  }

  const diffMs = Date.now() - date.getTime()
  const diffMinutes = Math.floor(diffMs / 60000)

  if (diffMinutes < 1) {
    return 'Vừa xong'
  }

  if (diffMinutes < 60) {
    return `${diffMinutes} phút trước`
  }

  const diffHours = Math.floor(diffMinutes / 60)
  if (diffHours < 24) {
    return `${diffHours} giờ trước`
  }

  const diffDays = Math.floor(diffHours / 24)
  if (diffDays < 7) {
    return `${diffDays} ngày trước`
  }

  return date.toLocaleString()
}
