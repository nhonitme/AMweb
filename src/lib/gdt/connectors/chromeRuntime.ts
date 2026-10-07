type ChromePort = {
  postMessage: (message: unknown) => void
  disconnect: () => void
  onMessage: {
    addListener: (callback: (message: unknown) => void) => void
    removeListener: (callback: (message: unknown) => void) => void
  }
  onDisconnect: {
    addListener: (callback: () => void) => void
  }
}

type ChromeRuntime = {
  sendMessage: (
    extensionId: string,
    message: unknown,
    responseCallback?: (response: unknown) => void,
  ) => void
  connect?: (extensionId: string, connectInfo?: { name?: string }) => ChromePort
  lastError?: { message?: string }
}

function getChromeRuntime(): ChromeRuntime | null {
  if (typeof window === "undefined") {
    return null
  }
  const chromeApi = (
    window as Window & {
      chrome?: { runtime?: ChromeRuntime }
    }
  ).chrome
  return chromeApi?.runtime ?? null
}

/**
 * chrome.runtime.sendMessage dạng Promise — không throw khi extension thiếu.
 */
export function sendExtensionMessage<TResponse>(
  extensionId: string,
  message: unknown,
  timeoutMs = 60_000,
): Promise<TResponse> {
  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime()
    if (!runtime?.sendMessage) {
      reject(new Error("Trình duyệt không hỗ trợ chrome.runtime"))
      return
    }

    let settled = false
    const timer = window.setTimeout(() => {
      if (settled) {
        return
      }
      settled = true
      reject(new Error("Timeout chờ phản hồi extension"))
    }, timeoutMs)

    try {
      runtime.sendMessage(extensionId, message, (response: unknown) => {
        if (settled) {
          return
        }
        settled = true
        window.clearTimeout(timer)
        const lastError = runtime.lastError
        if (lastError?.message) {
          reject(new Error(lastError.message))
          return
        }
        resolve(response as TResponse)
      })
    } catch (error) {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(timer)
      reject(error instanceof Error ? error : new Error(String(error)))
    }
  })
}

export type ExtensionPortProgress = {
  done: number
  total: number
  absoluteDone?: number
  absoluteTotal?: number
  currentInv?: string
}

export type ExtensionPortFetchResult = {
  success: boolean
  results?: unknown[]
  error?: string
  cancelled?: boolean
}

/**
 * FETCH_DETAILS qua Port — nhận PROGRESS realtime từng HĐ.
 */
export function fetchDetailsViaExtensionPort(options: {
  extensionId: string
  message: unknown
  signal?: AbortSignal
  timeoutMs?: number
  onProgress?: (progress: ExtensionPortProgress) => void
}): Promise<ExtensionPortFetchResult> {
  const { extensionId, message, signal, onProgress } = options
  const timeoutMs = options.timeoutMs ?? 30 * 60_000

  return new Promise((resolve, reject) => {
    const runtime = getChromeRuntime()
    if (!runtime?.connect) {
      reject(new Error("Trình duyệt không hỗ trợ chrome.runtime.connect"))
      return
    }

    let settled = false
    let port: ChromePort
    try {
      port = runtime.connect(extensionId, { name: "amnote-gdt-details" })
    } catch (error) {
      reject(error instanceof Error ? error : new Error(String(error)))
      return
    }

    const finish = (fn: () => void) => {
      if (settled) {
        return
      }
      settled = true
      window.clearTimeout(timer)
      signal?.removeEventListener("abort", onAbort)
      try {
        port.disconnect()
      } catch {
        // ignore
      }
      fn()
    }

    const timer = window.setTimeout(() => {
      finish(() => reject(new Error("Timeout chờ phản hồi extension (port)")))
    }, timeoutMs)

    const onAbort = () => {
      try {
        port.postMessage({
          type: "CANCEL_JOB",
          jobId: (message as { jobId?: string })?.jobId,
        })
      } catch {
        // ignore
      }
      finish(() => reject(new DOMException("Aborted", "AbortError")))
    }

    if (signal) {
      if (signal.aborted) {
        onAbort()
        return
      }
      signal.addEventListener("abort", onAbort, { once: true })
    }

    port.onDisconnect.addListener(() => {
      const errMsg = runtime.lastError?.message
      finish(() => {
        if (errMsg) {
          reject(new Error(errMsg))
        } else {
          reject(new Error("Extension port đã đóng"))
        }
      })
    })

    port.onMessage.addListener((raw: unknown) => {
      const msg = raw as {
        type?: string
        done?: number
        total?: number
        absoluteDone?: number
        absoluteTotal?: number
        currentInv?: string
        success?: boolean
        results?: unknown[]
        error?: string
        cancelled?: boolean
      }

      if (msg?.type === "PROGRESS") {
        onProgress?.({
          done: Number(msg.done ?? 0),
          total: Number(msg.total ?? 0),
          absoluteDone:
            msg.absoluteDone != null ? Number(msg.absoluteDone) : undefined,
          absoluteTotal:
            msg.absoluteTotal != null ? Number(msg.absoluteTotal) : undefined,
          currentInv: msg.currentInv,
        })
        return
      }

      if (msg?.type === "RESULT") {
        finish(() =>
          resolve({
            success: true,
            results: Array.isArray(msg.results) ? msg.results : [],
          }),
        )
        return
      }

      if (msg?.type === "ERROR") {
        finish(() =>
          resolve({
            success: false,
            error: msg.error || "Extension ERROR",
            cancelled: Boolean(msg.cancelled),
          }),
        )
        return
      }
    })

    try {
      port.postMessage(message)
    } catch (error) {
      finish(() =>
        reject(error instanceof Error ? error : new Error(String(error))),
      )
    }
  })
}

export function hasChromeRuntime(): boolean {
  const runtime = getChromeRuntime()
  return runtime?.sendMessage != null
}

export function hasChromeRuntimeConnect(): boolean {
  return getChromeRuntime()?.connect != null
}
