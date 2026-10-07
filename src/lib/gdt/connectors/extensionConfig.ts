/** Extension ID từ chrome://extensions / edge://extensions sau Load unpacked. */
export const GDT_EXTENSION_ID = String(
  import.meta.env.VITE_GDT_EXTENSION_ID ?? "",
).trim()

/** Mỗi message FETCH_DETAILS tối đa ~100 HĐ. */
export const EXTENSION_MESSAGE_BATCH_SIZE = 100

export const EXTENSION_PING_TIMEOUT_MS = 800

export const CONNECTOR_PING_NAME = "AMNOTE_GDT" as const
