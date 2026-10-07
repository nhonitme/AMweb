export type ApiResponseEnvelope<T = unknown> = {
  Data?: T
  data?: T
  result?: T
  Success?: boolean | string | number
  success?: boolean | string | number
  status?: string
  Status?: string | number
  message?: string
  messages?: string[]
  Message?: string
} & Record<string, unknown>

type ErrorResponse = {
  data?: unknown
  status?: number
}

type ErrorWithResponse = {
  message?: string
  response?: ErrorResponse
}

function normalizeMessage(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null
}

function collectApiMessages(responseData: unknown): string[] {
  if (typeof responseData === "string") {
    const message = normalizeMessage(responseData)
    return message ? [message] : []
  }

  if (!isApiRecord(responseData)) {
    return []
  }

  const messages: string[] = []
  const messageKeys = ["message", "Message", "error", "Error", "title", "Title", "detail", "Detail"] as const

  messageKeys.forEach((key) => {
    const message = normalizeMessage(responseData[key])
    if (message && !messages.includes(message)) {
      messages.push(message)
    }
  })

  if (Array.isArray(responseData.messages)) {
    responseData.messages.forEach((item) => {
      const message = normalizeMessage(item)
      if (message && !messages.includes(message)) {
        messages.push(message)
      }
    })
  }

  const nestedErrors = responseData.errors ?? responseData.Errors
  if (Array.isArray(nestedErrors)) {
    nestedErrors.forEach((item) => {
      const message = normalizeMessage(item)
      if (message && !messages.includes(message)) {
        messages.push(message)
      }
    })
  }

  if (isApiRecord(nestedErrors)) {
    Object.values(nestedErrors).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((item) => {
          const message = normalizeMessage(item)
          if (message && !messages.includes(message)) {
            messages.push(message)
          }
        })
        return
      }

      const message = normalizeMessage(value)
      if (message && !messages.includes(message)) {
        messages.push(message)
      }
    })
  }

  return messages
}

function joinUniqueMessages(messages: string[]): string {
  return messages.reduce<string[]>((result, message) => {
    const existingIndex = result.findIndex((item) => item === message || item.includes(message) || message.includes(item))
    if (existingIndex < 0) {
      return [...result, message]
    }

    if (message.length > result[existingIndex].length && message.includes(result[existingIndex])) {
      return result.map((item, index) => (index === existingIndex ? message : item))
    }

    return result
  }, []).join(": ")
}

function getErrorMessage(error: unknown): string | null {
  if (isApiRecord(error)) {
    const message = normalizeMessage((error as ErrorWithResponse).message)
    if (message) {
      return message
    }
  }

  if (error instanceof Error) {
    return normalizeMessage(error.message)
  }

  return null
}

function getApiResponseMessage(error: unknown): string | null {
  if (!isApiRecord(error)) {
    return null
  }

  const messages = collectApiMessages((error as ErrorWithResponse).response?.data)
  return messages.length > 0 ? joinUniqueMessages(messages) : null
}

export function isApiRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

export function getApiArrayPayload<T>(payload: unknown): T[] {
  if (!isApiRecord(payload)) {
    return []
  }

  const inner = (payload.Data ?? payload.data ?? payload) as unknown
  if (Array.isArray(inner)) {
    return inner as T[]
  }

  if (!isApiRecord(inner)) {
    return []
  }

  const list = inner.data ?? inner
  return Array.isArray(list) ? (list as T[]) : []
}

export function getApiBooleanPayload(payload: ApiResponseEnvelope<boolean>): boolean {
  return Boolean(payload.Data ?? payload.data ?? payload.result)
}

export function isApiSuccessPayload(payload: unknown): boolean {
  if (!isApiRecord(payload)) {
    return false
  }

  const value = payload.Success ?? payload.success
  if (typeof value === "boolean") {
    return value
  }

  if (typeof value === "number") {
    return value === 1
  }

  if (typeof value === "string") {
    const normalized = value.trim().toLowerCase()
    return normalized === "true" || normalized === "1" || normalized === "success" || normalized === "ok"
  }

  return false
}

export function getApiEnvelopeMessage(payload: unknown, fallback: string): string {
  if (!isApiRecord(payload)) {
    return fallback
  }

  const message = normalizeMessage(payload.Message) ?? normalizeMessage(payload.message)
  return message ?? fallback
}

export function getApiObjectPayload<T>(payload: unknown): T {
  if (!isApiRecord(payload)) {
    return payload as T
  }

  const inner = payload.Data ?? payload.data ?? payload.result ?? payload.Result
  return (inner !== undefined && inner !== null ? inner : payload) as T
}

export type BackgroundJobStatus = "QUEUED" | "PROCESSING" | "DONE" | "ERROR" | "CANCELLED"

export function readApiNumber(source: Record<string, unknown>, camelKey: string, pascalKey: string): number {
  const value = source[camelKey] ?? source[pascalKey]
  return typeof value === "number" ? value : Number(value ?? 0)
}

export function readApiString(
  source: Record<string, unknown>,
  camelKey: string,
  pascalKey: string,
  fallback = "",
): string {
  const value = source[camelKey] ?? source[pascalKey]
  return typeof value === "string" ? value : fallback
}

export function normalizeBackgroundJobStatus(value: unknown): BackgroundJobStatus {
  const status = String(value ?? "QUEUED").toUpperCase()
  if (status === "PROCESSING" || status === "DONE" || status === "ERROR" || status === "QUEUED" || status === "CANCELLED") {
    return status
  }
  return "QUEUED"
}

export function isBackgroundJobFinished(status: BackgroundJobStatus): boolean {
  return status === "DONE" || status === "ERROR" || status === "CANCELLED"
}

export function waitAsync(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms)
  })
}

export function getApiErrorMessage(error: unknown, fallback: string): string {
  const fallbackMessage = normalizeMessage(fallback) ?? "Error"
  const errorMessage = getErrorMessage(error)
  const apiMessage = getApiResponseMessage(error)

  if (errorMessage || apiMessage) {
    return joinUniqueMessages([errorMessage, apiMessage].filter((message): message is string => Boolean(message)))
  }

  return fallbackMessage
}

export function normalizeApiError(error: unknown): unknown {
  if (!(error instanceof Error)) {
    return error
  }

  const apiMessage = getApiResponseMessage(error)
  if (!apiMessage) {
    return error
  }

  error.message = joinUniqueMessages([error.message, apiMessage].filter((message): message is string => Boolean(normalizeMessage(message))))
  return error
}

export function logApiError(context: string, error: unknown) {
  console.error(context, error)

  if (!isApiRecord(error)) {
    return
  }

  const response = (error as ErrorWithResponse).response
  if (response?.data !== undefined) {
    console.error("Response data:", response.data)
  }
  if (response?.status !== undefined) {
    console.error("Response status:", response.status)
  }
}
