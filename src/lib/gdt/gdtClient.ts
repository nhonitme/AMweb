import { solveSvgCaptcha } from "./svgCaptcha"

export const GDT_BASE = "https://hoadondientu.gdt.gov.vn/api"

/** Khoảng cách tối thiểu giữa mỗi GET tới GDT (giảm 429 từ browser + CORS). */
export const GDT_MIN_REQUEST_INTERVAL_MS = 1000

/**
 * Số request `/invoices/detail` được phép bắt đầu trong một lượt (wave).
 * Đổi 2 → 3 → 4 khi Network sạch 429/CORS — không cần sửa thuật toán.
 */
export const GDT_DETAIL_CONCURRENT = 1

/** Khoảng cách tối thiểu giữa thời điểm bắt đầu hai lượt detail liên tiếp. */
export const GDT_DETAIL_BATCH_INTERVAL_MS = 1000

const GDT_HEADERS: Record<string, string> = {
  Accept: "application/json, text/plain, */*",
  "Accept-Language": "vi",
}

type TokenCacheEntry = {
  token: string
  cachedAt: number
  fingerprint: string
  /** Token từ DB — dùng đến khi 401/forceRefresh, không áp TTL memory. */
  fromPersisted?: boolean
}

const tokenCache = new Map<string, TokenCacheEntry>()
const TOKEN_TTL_MS = 22 * 60 * 60 * 1000

/** Persist TOKEN vào DB sau khi login GDT lấy token mới. */
const tokenIssuedHandlers = new Map<
  string,
  (token: string) => void | Promise<void>
>()

export function setGdtTokenIssuedHandler(
  username: string,
  handler: (token: string) => void | Promise<void>,
) {
  const key = username.trim()
  if (!key) {
    return
  }
  tokenIssuedHandlers.set(key, handler)
}

export function clearGdtTokenIssuedHandler(username?: string) {
  if (username) {
    tokenIssuedHandlers.delete(username.trim())
    return
  }
  tokenIssuedHandlers.clear()
}

async function notifyTokenIssued(username: string, token: string) {
  const handler = tokenIssuedHandlers.get(username.trim())
  if (!handler) {
    return
  }
  try {
    await handler(token)
  } catch {
    // Không chặn sync nếu lưu TOKEN DB thất bại
  }
}

/**
 * Nạp token đã lưu (cột TOKEN) vào cache — không login.
 * Chỉ login lại khi không có token hoặc request bị 401.
 */
export async function seedGdtToken(
  username: string,
  token: string,
  password: string,
): Promise<boolean> {
  const nextUsername = username.trim()
  const nextToken = token.trim()
  if (!nextUsername || !nextToken || !password) {
    return false
  }
  const fingerprint = await credentialFingerprint(nextUsername, password)
  tokenCache.set(nextUsername, {
    token: nextToken,
    cachedAt: Date.now(),
    fingerprint,
    fromPersisted: true,
  })
  return true
}

export function peekGdtToken(username: string): string | null {
  const cached = tokenCache.get(username.trim())
  return cached?.token ?? null
}

/** Cool-down chung: mọi worker phải chờ khi bất kỳ request nào bị 429. */
let rateLimitCooldownUntil = 0
let lastRequestStartedAt = 0
let requestGate: Promise<void> = Promise.resolve()

/** Wave gate riêng cho `/invoices/detail` — N request/lượt, cách nhau GDT_DETAIL_BATCH_INTERVAL_MS. */
let detailWaveStartedAt = 0
let detailWaveSlotsUsed = 0
let detailRequestGate: Promise<void> = Promise.resolve()

export class GdtRateLimitError extends Error {
  readonly status = 429

  constructor(message = "TCT đang giới hạn tốc độ (HTTP 429). Vui lòng thử lại sau.") {
    super(message)
    this.name = "GdtRateLimitError"
  }
}

export function isGdtRateLimitError(error: unknown): error is GdtRateLimitError {
  return error instanceof GdtRateLimitError
}

async function sha256Hex(value: string): Promise<string> {
  const data = new TextEncoder().encode(value)
  const digest = await crypto.subtle.digest("SHA-256", data)
  return Array.from(new Uint8Array(digest))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("")
}

export async function credentialFingerprint(username: string, password: string): Promise<string> {
  return sha256Hex(`${username}\0${password}`)
}

function assertNotAborted(signal?: AbortSignal) {
  if (signal?.aborted) {
    throw new DOMException("Aborted", "AbortError")
  }
}

export async function gdtSleep(ms: number, signal?: AbortSignal) {
  if (ms <= 0) {
    return
  }
  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal?.removeEventListener("abort", onAbort)
      resolve()
    }, ms)
    const onAbort = () => {
      window.clearTimeout(timer)
      reject(new DOMException("Aborted", "AbortError"))
    }
    if (signal) {
      if (signal.aborted) {
        window.clearTimeout(timer)
        reject(new DOMException("Aborted", "AbortError"))
        return
      }
      signal.addEventListener("abort", onAbort, { once: true })
    }
  })
}

function jitterMs(ms: number): number {
  const spread = Math.max(250, Math.floor(ms * 0.2))
  return Math.max(500, ms + Math.floor(Math.random() * (spread * 2 + 1)) - spread)
}

function parseRetryAfterMs(response: Response, attempt: number): number {
  const header = response.headers.get("Retry-After")
  if (header) {
    const asSeconds = Number.parseInt(header, 10)
    if (Number.isFinite(asSeconds) && asSeconds >= 0) {
      return Math.min(asSeconds * 1000, 120_000)
    }
    const asDate = Date.parse(header)
    if (Number.isFinite(asDate)) {
      return Math.min(Math.max(0, asDate - Date.now()), 120_000)
    }
  }
  return Math.min(5 * 2 ** attempt * 1000, 60_000)
}

function applyGlobalCooldown(waitMs: number) {
  const until = Date.now() + jitterMs(waitMs)
  rateLimitCooldownUntil = Math.max(rateLimitCooldownUntil, until)
  return Math.max(0, rateLimitCooldownUntil - Date.now())
}

/**
 * Hàng đợi toàn cục: đảm bảo khoảng cách tối thiểu giữa các request
 * và tôn trọng cool-down khi bất kỳ worker nào gặp 429.
 * Dùng cho captcha / login / list — không dùng cho detail.
 */
async function acquireRequestSlot(signal?: AbortSignal): Promise<void> {
  const previous = requestGate
  let release!: () => void
  requestGate = new Promise<void>((resolve) => {
    release = resolve
  })

  try {
    await previous
    assertNotAborted(signal)

    while (true) {
      const now = Date.now()
      const waitCooldown = Math.max(0, rateLimitCooldownUntil - now)
      const waitInterval = Math.max(0, GDT_MIN_REQUEST_INTERVAL_MS - (now - lastRequestStartedAt))
      const wait = Math.max(waitCooldown, waitInterval)
      if (wait <= 0) {
        break
      }
      await gdtSleep(wait, signal)
    }

    lastRequestStartedAt = Date.now()
  } finally {
    release()
  }
}

function isInvoiceDetailUrl(url: string): boolean {
  return url.includes("/invoices/detail")
}

/**
 * Slot riêng cho GET `/invoices/detail`:
 * - Tối đa `GDT_DETAIL_CONCURRENT` request bắt đầu trong một lượt
 * - Lượt tiếp theo cách ít nhất `GDT_DETAIL_BATCH_INTERVAL_MS` kể từ lúc lượt trước bắt đầu
 * - Vẫn tôn trọng `rateLimitCooldownUntil` khi bất kỳ request nào gặp 429
 *
 * Ví dụ CONCURRENT=2, INTERVAL=1000:
 *   0s → A,B | 1s → C,D | 2s → E,F
 */
async function acquireDetailRequestSlot(signal?: AbortSignal): Promise<void> {
  const previous = detailRequestGate
  let release!: () => void
  detailRequestGate = new Promise<void>((resolve) => {
    release = resolve
  })

  try {
    await previous
    assertNotAborted(signal)

    while (true) {
      const now = Date.now()
      const waitCooldown = Math.max(0, rateLimitCooldownUntil - now)

      let waitWave = 0
      if (detailWaveSlotsUsed >= GDT_DETAIL_CONCURRENT) {
        // Lượt đã đủ N slot → chờ mốc interval rồi mở lượt mới
        waitWave = Math.max(0, detailWaveStartedAt + GDT_DETAIL_BATCH_INTERVAL_MS - now)
      }

      const wait = Math.max(waitCooldown, waitWave)
      if (wait <= 0) {
        break
      }
      await gdtSleep(wait, signal)
    }

    if (detailWaveSlotsUsed >= GDT_DETAIL_CONCURRENT) {
      detailWaveSlotsUsed = 0
    }
    if (detailWaveSlotsUsed === 0) {
      detailWaveStartedAt = Date.now()
    }
    detailWaveSlotsUsed += 1
  } finally {
    release()
  }
}

async function readJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text()
  if (!text) {
    return null
  }
  try {
    return JSON.parse(text) as unknown
  } catch {
    throw new Error("GDT response không phải JSON hợp lệ")
  }
}

export async function getCaptcha(signal?: AbortSignal): Promise<{ key: string; value: string }> {
  for (let attempt = 0; attempt < 10; attempt += 1) {
    assertNotAborted(signal)
    await acquireRequestSlot(signal)
    const response = await fetch(`${GDT_BASE}/captcha`, {
      method: "GET",
      headers: GDT_HEADERS,
      signal,
      credentials: "omit",
    })
    if (response.status === 429) {
      const waitMs = applyGlobalCooldown(parseRetryAfterMs(response, attempt))
      await gdtSleep(waitMs, signal)
      continue
    }
    if (!response.ok) {
      throw new Error(`Lấy captcha thất bại (HTTP ${response.status})`)
    }
    const data = (await readJsonResponse(response)) as { key?: string; content?: string }
    const key = String(data?.key ?? "")
    const captchaText = solveSvgCaptcha(String(data?.content ?? ""))
    if (key && captchaText && !captchaText.includes("-")) {
      return { key, value: captchaText }
    }
  }
  return { key: "", value: "" }
}

export async function gdtLogin(
  username: string,
  password: string,
  options?: {
    signal?: AbortSignal
    onAttempt?: (attempt: number) => void
  },
): Promise<string | null> {
  for (let attempt = 1; attempt <= 5; attempt += 1) {
    assertNotAborted(options?.signal)
    options?.onAttempt?.(attempt)
    const { key, value } = await getCaptcha(options?.signal)
    if (!key || !value) {
      continue
    }
    await acquireRequestSlot(options?.signal)
    const response = await fetch(`${GDT_BASE}/security-taxpayer/authenticate`, {
      method: "POST",
      headers: {
        ...GDT_HEADERS,
        "Content-Type": "application/json;charset=UTF-8",
        "End-Point": "/lien-he",
      },
      body: JSON.stringify({
        username,
        password,
        cvalue: value,
        ckey: key,
      }),
      signal: options?.signal,
      credentials: "omit",
    })
    if (response.status === 429) {
      const waitMs = applyGlobalCooldown(parseRetryAfterMs(response, attempt - 1))
      await gdtSleep(waitMs, options?.signal)
      continue
    }
    const data = (await readJsonResponse(response)) as { token?: string; message?: string }
    if (data?.token) {
      return data.token
    }
    const message = String(data?.message ?? "")
    if (!message.toLowerCase().includes("captcha")) {
      return null
    }
  }
  return null
}

export async function getToken(
  username: string,
  password: string,
  options?: {
    signal?: AbortSignal
    forceRefresh?: boolean
    onLoginAttempt?: (attempt: number) => void
    /** Có cache/token DB — gọi trước khi return, không login. */
    onUsingCachedToken?: () => void
  },
): Promise<string | null> {
  const nextUsername = username.trim()
  const fingerprint = await credentialFingerprint(nextUsername, password)
  if (!options?.forceRefresh) {
    const cached = tokenCache.get(nextUsername)
    if (cached && cached.fingerprint === fingerprint) {
      const stillValid =
        cached.fromPersisted || Date.now() - cached.cachedAt < TOKEN_TTL_MS
      if (stillValid && cached.token) {
        options?.onUsingCachedToken?.()
        return cached.token
      }
    }
  } else {
    tokenCache.delete(nextUsername)
  }

  const token = await gdtLogin(nextUsername, password, {
    signal: options?.signal,
    onAttempt: options?.onLoginAttempt,
  })
  if (token) {
    tokenCache.set(nextUsername, {
      token,
      cachedAt: Date.now(),
      fingerprint,
      fromPersisted: false,
    })
    await notifyTokenIssued(nextUsername, token)
  }
  return token
}

export function clearGdtToken(username?: string) {
  if (username) {
    tokenCache.delete(username.trim())
    return
  }
  tokenCache.clear()
}

export async function gdtGetJson(
  url: string,
  username: string,
  password: string,
  options?: {
    signal?: AbortSignal
    maxAttempts?: number
    endPoint?: string
  },
): Promise<Record<string, unknown>> {
  const maxAttempts = options?.maxAttempts ?? 5
  const endPoint = options?.endPoint ?? "/tra-cuu/tra-cuu-hoa-don"
  const useDetailWave = isInvoiceDetailUrl(url)
  let sawRateLimit = false

  for (let loginRound = 0; loginRound < 2; loginRound += 1) {
    const token = await getToken(username, password, {
      signal: options?.signal,
      forceRefresh: loginRound > 0,
    })
    if (!token) {
      throw new Error("Đăng nhập thuế thất bại sau 5 lần thử captcha")
    }

    for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
      assertNotAborted(options?.signal)
      try {
        if (useDetailWave) {
          await acquireDetailRequestSlot(options?.signal)
        } else {
          await acquireRequestSlot(options?.signal)
        }
        const response = await fetch(url, {
          method: "GET",
          headers: {
            ...GDT_HEADERS,
            Authorization: `Bearer ${token}`,
            "End-Point": endPoint,
          },
          signal: options?.signal,
          credentials: "omit",
        })

        if (response.status === 429) {
          sawRateLimit = true
          // Math.max trong applyGlobalCooldown — nhiều worker 429 cùng lúc không ghi đè cooldown ngắn hơn
          const waitMs = applyGlobalCooldown(parseRetryAfterMs(response, attempt))
          if (attempt === maxAttempts - 1) {
            throw new GdtRateLimitError(
              `TCT giới hạn tốc độ (HTTP 429). Đã thử ${maxAttempts} lần — tạm dừng ~${Math.ceil(waitMs / 1000)}s rồi thử lại.`,
            )
          }
          await gdtSleep(waitMs, options?.signal)
          continue
        }

        if (response.status === 401) {
          // Token hết hạn / không hợp lệ → xóa cache, login lại ở vòng sau
          tokenCache.delete(username.trim())
          break
        }

        if (!response.ok) {
          throw new Error(`GDT HTTP ${response.status}`)
        }

        const data = await readJsonResponse(response)
        if (!data || typeof data !== "object" || Array.isArray(data)) {
          throw new Error("GDT response không phải JSON object")
        }
        return data as Record<string, unknown>
      } catch (error) {
        if (error instanceof DOMException && error.name === "AbortError") {
          throw error
        }
        if (isGdtRateLimitError(error)) {
          throw error
        }
        if (attempt === maxAttempts - 1) {
          if (sawRateLimit) {
            throw new GdtRateLimitError(
              `TCT giới hạn tốc độ (HTTP 429). Kết nối thất bại sau ${maxAttempts} lần thử.`,
            )
          }
          throw new Error(
            `Kết nối thuế thất bại sau ${maxAttempts} lần thử: ${
              error instanceof Error ? error.message : String(error)
            }`,
          )
        }
        await gdtSleep(Math.min(2 ** attempt, 8) * 1000, options?.signal)
      }
    }
  }

  if (sawRateLimit) {
    throw new GdtRateLimitError(
      "TCT giới hạn tốc độ (HTTP 429). Token vẫn hợp lệ nhưng không lấy được dữ liệu — hãy thử lại sau.",
    )
  }
  throw new Error("Token vẫn hết hạn sau khi đăng nhập lại")
}

export function formatGdtDate(value: string, endOfDay = false): string {
  const normalized = value.replace(/-/g, "").trim()
  if (!/^\d{8}$/.test(normalized)) {
    throw new Error("Ngày phải có định dạng YYYYMMDD hoặc YYYY-MM-DD")
  }
  const year = normalized.slice(0, 4)
  const month = normalized.slice(4, 6)
  const day = normalized.slice(6, 8)
  const time = endOfDay ? "23:59:59" : "00:00:00"
  return `${day}/${month}/${year}T${time}`
}

export function buildDetailUrl(khhdon: string, nbmst: string, shdon: string, khmshdon: string): string {
  const prefix = khhdon.length > 3 && khhdon[3] === "M" ? "sco-query" : "query"
  const query = new URLSearchParams({
    nbmst,
    khhdon,
    shdon,
    khmshdon,
  })
  return `${GDT_BASE}/${prefix}/invoices/detail?${query.toString()}`
}

export type ListSourceConfig = {
  prefix: "query" | "sco-query"
  endpoint: "sold" | "purchase"
  typeSearch: number | null
  label: string
}

export function listSourceConfigs(invType: 0 | 1): ListSourceConfig[] {
  if (invType === 1) {
    return [
      { prefix: "query", endpoint: "sold", typeSearch: null, label: "bán ra" },
      { prefix: "sco-query", endpoint: "sold", typeSearch: null, label: "bán ra - máy tính tiền" },
    ]
  }
  return [
    { prefix: "query", endpoint: "purchase", typeSearch: 5, label: "mua vào - hóa đơn có mã" },
    { prefix: "query", endpoint: "purchase", typeSearch: 6, label: "mua vào - hóa đơn không mã" },
    { prefix: "sco-query", endpoint: "purchase", typeSearch: 8, label: "mua vào - máy tính tiền" },
  ]
}

export function toYmd(value: Date | string | null | undefined): string {
  if (!value) {
    return ""
  }
  if (typeof value === "string") {
    const digits = value.replace(/\D/g, "")
    if (digits.length >= 8) {
      return digits.slice(0, 8)
    }
    return ""
  }
  const year = value.getFullYear()
  const month = String(value.getMonth() + 1).padStart(2, "0")
  const day = String(value.getDate()).padStart(2, "0")
  return `${year}${month}${day}`
}
