import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Popup from "devextreme-react/popup"
import Button from "devextreme-react/button"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import ProgressBar from "devextreme-react/progress-bar"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import { Eye, EyeOff, Globe } from "lucide-react"

import { getCompanyInfo } from "@/api/companyInfoApi"
import {
  listGdtSavedLogins,
  resolveInvoiceKey,
  saveGdtLogin,
  upsertGdtInvoiceJson,
  upsertGdtInvoiceList,
  type GdtSavedLogin,
} from "@/api/gdtImportApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import {
  clearGdtToken,
  clearGdtTokenIssuedHandler,
  createGdtDetailConnector,
  fetchInvoiceListFromGdt,
  isGdtExtensionAvailable,
  peekGdtToken,
  setGdtTokenIssuedHandler,
  toYmd,
  type FetchAllInvoicesResult,
  type GdtConnectorName,
  type GdtInvType,
  type GdtInvoiceItem,
  type GdtInvoiceSummary,
  type GdtProgress,
} from "@/lib/gdt"

import "./FetchGdtVatPopup.scss"

type FetchGdtVatPopupProps = {
  visible: boolean
  invoiceType: "BUY" | "SELL"
  fromDate: Date | null
  toDate: Date | null
  onClose: () => void
  onFetched?: (result: FetchAllInvoicesResult) => void | Promise<void>
}

type TranslationFn = (key: string, fallback: string) => string

/** 0=Kết nối API, 1=Lấy danh sách, 2=Lưu dữ liệu, 3=xong, -1=lỗi — giống frmGDTConnect.SetPhase */
type SyncPhase = -1 | 0 | 1 | 2 | 3

type SyncCounters = {
  found: number
  saved: number
  skipped: number
  errors: number
}

const LOG_MAX_LINES = 100
const MASKED_PASSWORD = "••••••••••"

function formatLogTime(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function progressPercent(progress: GdtProgress | null, phase: SyncPhase): number {
  if (!progress) {
    return 0
  }
  if (progress.status === "done" || progress.status === "partial" || phase === 3) {
    return 100
  }
  // Lưu list / lưu JSON / lấy detail — chạy theo done/total realtime (0→100%)
  if (
    (progress.phase === "save-list" ||
      progress.phase === "save-json" ||
      progress.phase === "detail") &&
    progress.detailTotal > 0
  ) {
    return Math.min(100, Math.round((progress.detailDone / progress.detailTotal) * 100))
  }
  if (progress.phase === "list" && progress.sourceTotal > 0) {
    const base = Math.max(progress.sourceIndex - 1, 0)
    return Math.min(35, Math.round((base / progress.sourceTotal) * 35))
  }
  if (progress.status === "logging_in" || progress.status === "starting") {
    return 5
  }
  return 0
}

function phaseClass(current: SyncPhase, target: 0 | 1 | 2): string {
  if (current < 0) {
    return "is-error"
  }
  if (current === target) {
    return "is-active"
  }
  if (current > target) {
    return "is-done"
  }
  return ""
}

function formatProgressLabel(done: number, total: number, percent: number): string {
  return `${done}/${total} - ${percent}%`
}

export default function FetchGdtVatPopup({
  visible,
  invoiceType,
  fromDate,
  toDate,
  onClose,
  onFetched,
}: FetchGdtVatPopupProps) {
  const { translate } = useContext(LanguageContext) as { translate?: TranslationFn }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [savedLogins, setSavedLogins] = useState<GdtSavedLogin[]>([])
  const [running, setRunning] = useState(false)
  const [progress, setProgress] = useState<GdtProgress | null>(null)
  const [syncPhase, setSyncPhase] = useState<SyncPhase>(0)
  const [statusText, setStatusText] = useState("")
  const [progressDone, setProgressDone] = useState(0)
  const [progressTotal, setProgressTotal] = useState(0)
  const [counters, setCounters] = useState<SyncCounters>({
    found: 0,
    saved: 0,
    skipped: 0,
    errors: 0,
  })
  const [logText, setLogText] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const logRef = useRef<HTMLDivElement | null>(null)
  const lastLoggedDetailDone = useRef(-1)
  /** Đồng bộ với running — tránh confirm “đang đồng bộ” khi đã xong nhưng state chưa kịp flush. */
  const runningRef = useRef(false)
  /** found/skipped cố định sau bước list; Đã lưu = số JSON detail đã lưu (jsonSavedRef). */
  const counterBaseRef = useRef({ found: 0, skipped: 0 })
  /** Số HĐ đã lưu chi tiết (JSON) trong lần đồng bộ này. */
  const jsonSavedRef = useRef(0)
  /** Timer giả lập progress khi đang upsert JSON (1 API call / batch). */
  const saveProgressTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)
  /** login | list | save — chặn progress cũ (list) đè lên bước sau */
  const flowStageRef = useRef<"login" | "list" | "save">("login")
  /** Label HĐ hiện tại: `{khmshdon}{khhdon} - số hóa đơn {shdon} ngày {tdlap}` */
  const [currentInvId, setCurrentInvId] = useState("")
  /** web = Tiêu chuẩn · extension = Tốc độ cao */
  const [connectorMode, setConnectorMode] = useState<GdtConnectorName>("web")

  const invType: GdtInvType = invoiceType === "SELL" ? 1 : 0
  const dateFromYmd = useMemo(() => toYmd(fromDate), [fromDate])
  const dateToYmd = useMemo(() => toYmd(toDate), [toDate])
  const periodLabel = useMemo(() => {
    if (!dateFromYmd || !dateToYmd) {
      return ""
    }
    return `${formatYmdForDisplay(dateFromYmd)} → ${formatYmdForDisplay(dateToYmd)}`
  }, [dateFromYmd, dateToYmd])

  /** Đã lưu = jsonSaved (lưu detail), không suy ra từ found − skipped − errors. */
  const setDetailCounters = useCallback(
    (found: number, skipped: number, errors: number, saved: number) => {
      const safeFound = Math.max(0, found)
      const safeSkipped = Math.max(0, Math.min(skipped, safeFound))
      const safeSaved = Math.max(0, Math.min(saved, safeFound - safeSkipped))
      const safeErrors = Math.max(0, Math.min(errors, safeFound - safeSkipped - safeSaved))
      counterBaseRef.current = { found: safeFound, skipped: safeSkipped }
      jsonSavedRef.current = safeSaved
      setCounters({
        found: safeFound,
        skipped: safeSkipped,
        errors: safeErrors,
        saved: safeSaved,
      })
    },
    [],
  )

  const appendLog = useCallback((message: string) => {
    const line = `${formatLogTime()} - ${message}`
    setLogText((prev) => {
      const lines = prev ? prev.split("\n") : []
      lines.push(line)
      const trimmed = lines.length > LOG_MAX_LINES ? lines.slice(lines.length - LOG_MAX_LINES) : lines
      return trimmed.join("\n")
    })
  }, [])

  const clearSaveProgressTimer = useCallback(() => {
    if (saveProgressTimerRef.current != null) {
      clearInterval(saveProgressTimerRef.current)
      saveProgressTimerRef.current = null
    }
  }, [])

  const resetUi = useCallback(() => {
    clearSaveProgressTimer()
    setProgress(null)
    setSyncPhase(0)
    flowStageRef.current = "login"
    setStatusText(t("msg_GDT_Ready", "Sẵn sàng đồng bộ"))
    setCurrentInvId("")
    setProgressDone(0)
    setProgressTotal(0)
    setCounters({ found: 0, saved: 0, skipped: 0, errors: 0 })
    setLogText("")
    lastLoggedDetailDone.current = -1
    counterBaseRef.current = { found: 0, skipped: 0 }
    jsonSavedRef.current = 0
  }, [clearSaveProgressTimer, t])

  /**
   * Progress khi lưu list/JSON (1 API call): 0 → ~90% trong lúc await → 100% khi xong.
   * API upsert không stream từng HĐ nên animate theo tổng số HĐ để thanh không đứng yên.
   */
  const runSavePhaseProgress = useCallback(
    async (
      phase: "save-list" | "save-json",
      total: number,
      message: string,
      work: () => Promise<void>,
      phaseLabel: string,
      options?: {
        onTick?: (done: number, total: number) => void
        onComplete?: (total: number) => void
      },
    ) => {
      const safeTotal = Math.max(1, total)
      clearSaveProgressTimer()
      setSyncPhase(2)
      setCurrentInvId("")
      setProgressDone(0)
      setProgressTotal(safeTotal)
      setStatusText(message)
      setProgress({
        status: "fetching",
        phase,
        phaseLabel,
        totalFound: counterBaseRef.current.found || safeTotal,
        detailDone: 0,
        detailTotal: safeTotal,
        detailFailed: 0,
        sourceIndex: 0,
        sourceTotal: 0,
        currentInv: "",
        message,
      })

      let fakeDone = 0
      const step = Math.max(1, Math.ceil(safeTotal / 20))
      const softCap = Math.max(1, Math.floor(safeTotal * 0.9))
      saveProgressTimerRef.current = setInterval(() => {
        if (fakeDone >= softCap) {
          return
        }
        fakeDone = Math.min(softCap, fakeDone + step)
        setProgressDone(fakeDone)
        options?.onTick?.(fakeDone, safeTotal)
        setProgress((prev) =>
          prev?.phase === phase
            ? { ...prev, detailDone: fakeDone, detailTotal: safeTotal, message }
            : prev,
        )
      }, 100)

      try {
        await work()
      } finally {
        clearSaveProgressTimer()
        setProgressDone(safeTotal)
        setProgressTotal(safeTotal)
        options?.onComplete?.(safeTotal)
        setProgress((prev) =>
          prev
            ? {
                ...prev,
                status: "fetching",
                phase,
                phaseLabel,
                detailDone: safeTotal,
                detailTotal: safeTotal,
                message,
              }
            : prev,
        )
      }
    },
    [clearSaveProgressTimer],
  )

  const runSaveJsonProgress = useCallback(
    (
      total: number,
      message: string,
      work: () => Promise<void>,
      options?: {
        onTick?: (done: number, total: number) => void
        onComplete?: (total: number) => void
      },
    ) => runSavePhaseProgress("save-json", total, message, work, "lưu chi tiết", options),
    [runSavePhaseProgress],
  )

  useEffect(() => {
    if (!visible) {
      abortRef.current?.abort()
      abortRef.current = null
      runningRef.current = false
      setRunning(false)
      setPassword("")
      setShowPassword(false)
      resetUi()
      return
    }

    let cancelled = false
    resetUi()
    setShowPassword(false)
    setSavedLogins([])
    setConnectorMode("web")

    void (async () => {
      let nextLogins: GdtSavedLogin[] = []
      try {
        nextLogins = await listGdtSavedLogins()
      } catch {
        // ignore — vẫn cho nhập tay
      }
      if (cancelled) {
        return
      }

      setSavedLogins(nextLogins)
      const preferred = nextLogins.find((item) => item.IsDefault === "1") ?? nextLogins[0]
      if (preferred?.Username) {
        setUsername(preferred.Username)
        setPassword(preferred.Password ?? "")
      } else {
        try {
          const response = await getCompanyInfo()
          const taxCd = String(response.data?.TAX_CD ?? "").trim()
          if (!cancelled && taxCd) {
            setUsername(taxCd)
          }
        } catch {
          // ignore
        }
      }

      try {
        const hasExt = await isGdtExtensionAvailable()
        if (!cancelled) {
          setConnectorMode(hasExt ? "extension" : "web")
        }
      } catch {
        if (!cancelled) {
          setConnectorMode("web")
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [visible, resetUi])

  const applySavedLogin = useCallback((nextUsername: string) => {
    const trimmed = nextUsername.trim()
    setUsername(trimmed)
    const match = savedLogins.find((item) => item.Username === trimmed)
    if (match) {
      setPassword(match.Password ?? "")
    }
  }, [savedLogins])

  const renderLoginItem = useCallback(
    (itemUsername: string) => {
      if (!itemUsername) {
        return null
      }
      return (
        <div className="gdt-connect-popup__login-item">
          <span className="gdt-connect-popup__login-icon" aria-hidden>
            <Globe size={16} strokeWidth={2} />
          </span>
          <span className="gdt-connect-popup__login-texts">
            <span className="gdt-connect-popup__login-user">{itemUsername}</span>
            <span className="gdt-connect-popup__login-pass">{MASKED_PASSWORD}</span>
          </span>
        </div>
      )
    },
    [],
  )

  const savedUsernames = useMemo(
    () => savedLogins.map((item) => item.Username).filter(Boolean),
    [savedLogins],
  )

  useEffect(() => {
    const el = logRef.current
    if (el) {
      el.scrollTop = el.scrollHeight
    }
  }, [logText])

  const handleProgress = useCallback(
    (next: GdtProgress) => {
      const stage = flowStageRef.current

      // Bỏ progress lệch giai đoạn (vd. list sau khi đã sang save)
      if (stage === "save" && (next.phase === "list" || next.phase === "login")) {
        return
      }
      if (stage === "list" && next.phase === "login") {
        // Giữ phase ② khi token đã có; không nhảy về ①
        if (next.message) {
          setStatusText(next.message)
        }
        return
      }

      setProgress(next)

      if (next.status === "error" || next.phase === "error") {
        setSyncPhase(-1)
      } else if (next.phase === "login" || next.status === "logging_in") {
        if (stage === "login") {
          setSyncPhase(0)
        }
      } else if (next.phase === "list") {
        if (stage === "login" || stage === "list") {
          flowStageRef.current = "list"
          setSyncPhase(1)
        }
      } else if (next.phase === "save-list" || next.phase === "save-json" || next.phase === "detail") {
        setSyncPhase(2)
      }

      if (next.message) {
        setStatusText(next.message)
      }

      if (next.phase === "list" && next.totalFound > 0) {
        setCounters((prev) => ({ ...prev, found: Math.max(prev.found, next.totalFound) }))
      }

      if (
        (next.phase === "save-json" || next.phase === "save-list") &&
        next.detailTotal > 0
      ) {
        setProgressDone(next.detailDone)
        setProgressTotal(next.detailTotal)
        setCurrentInvId("")
      } else if (next.phase === "detail" && next.detailTotal > 0) {
        setProgressDone(next.detailDone)
        setProgressTotal(next.detailTotal)
        // Chỉ cập nhật Lỗi từ progress; Đã lưu giữ theo jsonSavedRef (sau upsert JSON).
        const { found, skipped } = counterBaseRef.current
        const needDetail = found - skipped
        if (found > 0 && next.detailTotal === needDetail) {
          setDetailCounters(found, skipped, next.detailFailed, jsonSavedRef.current)
        }

        if (
          next.detailDone !== lastLoggedDetailDone.current &&
          (next.detailDone === 0 ||
            next.detailDone === next.detailTotal ||
            next.detailDone % 5 === 0)
        ) {
          lastLoggedDetailDone.current = next.detailDone
          appendLog(next.message || `Đang lấy chi tiết ${next.detailDone}/${next.detailTotal}`)
        }

        setCurrentInvId(next.currentInv?.trim() || "")
      } else if (next.phase === "list" && stage !== "save" && next.sourceTotal > 0) {
        setProgressDone(next.sourceIndex)
        setProgressTotal(next.sourceTotal)
        setCurrentInvId("")
      }
    },
    [appendLog, setDetailCounters],
  )

  const handleClose = useCallback(async () => {
    if (runningRef.current) {
      const result = await confirm(
        t("msg_GDT_Confirm_Close", "Đang đồng bộ. Bạn có chắc muốn dừng và đóng?"),
        t("TIT_NOTIFICATION", "Thông báo"),
      )
      if (!result) {
        return
      }
      abortRef.current?.abort()
      runningRef.current = false
      setRunning(false)
    }
    onClose()
  }, [onClose, t])

  const handleFetch = useCallback(async () => {
    const nextUsername = username.trim()
    if (!nextUsername || !password) {
      notify(t("GDT_MISSING_CRED", "Vui lòng nhập tài khoản và mật khẩu GDT"), "warning", 2500)
      return
    }
    if (!dateFromYmd || !dateToYmd) {
      notify(t("GDT_MISSING_DATE", "Vui lòng chọn khoảng ngày trên thanh lọc"), "warning", 2500)
      return
    }
    if (dateFromYmd > dateToYmd) {
      notify(t("GDT_DATE_RANGE", "Từ ngày không được lớn hơn đến ngày"), "warning", 2500)
      return
    }

    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    runningRef.current = true
    setRunning(true)
    clearSaveProgressTimer()
    setProgress(null)
    setSyncPhase(0)
    flowStageRef.current = "login"
    setCounters({ found: 0, saved: 0, skipped: 0, errors: 0 })
    setProgressDone(0)
    setProgressTotal(0)
    setLogText("")
    lastLoggedDetailDone.current = -1
    counterBaseRef.current = { found: 0, skipped: 0 }
    jsonSavedRef.current = 0
    setStatusText(t("msg_GDT_Connecting", "Đang kết nối API..."))
    setCurrentInvId("")
    appendLog(
      invoiceType === "BUY"
        ? t("msg_GDT_Start_Buy", "Bắt đầu đồng bộ hóa đơn mua vào")
        : t("msg_GDT_Start_Sell", "Bắt đầu đồng bộ hóa đơn bán ra"),
    )

    try {
      const matchedLogin = savedLogins.find((item) => item.Username === nextUsername)
      const persistedToken = String(matchedLogin?.Token ?? "").trim() || null

      // Mỗi khi login lấy token mới (hoặc sau 401) → ghi cột TOKEN
      setGdtTokenIssuedHandler(nextUsername, async (token) => {
        await saveGdtLogin(nextUsername, password, token)
        setSavedLogins((prev) => {
          const without = prev.filter((item) => item.Username !== nextUsername)
          return [
            {
              Username: nextUsername,
              Password: password,
              Token: token,
              IsDefault: "1",
            },
            ...without.map((item) => ({ ...item, IsDefault: "0" as const })),
          ]
        })
      })

      const baseParams = {
        username: nextUsername,
        password,
        dateFrom: dateFromYmd,
        dateTo: dateToYmd,
        invType,
        signal: controller.signal,
        onProgress: handleProgress,
        persistedToken,
      }

      // ① Kết nối (token đã lưu nếu có) + ② Lấy danh sách
      setSyncPhase(0)
      flowStageRef.current = "login"
      const listResult = await fetchInvoiceListFromGdt(baseParams)

      flowStageRef.current = "list"
      setSyncPhase(1)
      setCounters((prev) => ({ ...prev, found: listResult.count }))
      setStatusText(
        t("GDT_LIST_DONE", "Đã lấy danh sách: {0} hóa đơn").replace(
          "{0}",
          String(listResult.count),
        ),
      )
      appendLog(
        t("GDT_LIST_DONE", "Đã lấy danh sách: {0} hóa đơn").replace(
          "{0}",
          String(listResult.count),
        ),
      )
      setCurrentInvId("")

      // Lưu tài khoản + TOKEN hiện tại (IsDefault)
      try {
        const currentToken = peekGdtToken(nextUsername)
        await saveGdtLogin(nextUsername, password, currentToken)
        setSavedLogins((prev) => {
          const without = prev.filter((item) => item.Username !== nextUsername)
          return [
            {
              Username: nextUsername,
              Password: password,
              Token: currentToken ?? undefined,
              IsDefault: "1",
            },
            ...without.map((item) => ({ ...item, IsDefault: "0" as const })),
          ]
        })
      } catch (saveError) {
        appendLog(
          `${t("msg_GDT_Error_Prefix", "Lỗi: ")}${
            saveError instanceof Error ? saveError.message : String(saveError)
          }`,
        )
      }

      if (listResult.items.length === 0) {
        setSyncPhase(3)
        setProgressDone(0)
        setProgressTotal(0)
        setStatusText(t("GDT_LIST_EMPTY", "Không có hóa đơn trong khoảng ngày đã chọn."))
        const empty: FetchAllInvoicesResult = {
          success: true,
          partial: false,
          count: 0,
          detailErrorCount: 0,
          items: [],
        }
        runningRef.current = false
        setRunning(false)
        await onFetched?.(empty)
        notify(t("GDT_LIST_EMPTY", "Không có hóa đơn trong khoảng ngày đã chọn."), "info", 3000)
        return
      }

      // ③ Lưu dữ liệu — list trước (progress realtime theo số HĐ)
      flowStageRef.current = "save"
      setSyncPhase(2)
      const savingListMsg = t("GDT_SAVING_LIST", "Đang lưu danh sách vào hệ thống...")
      appendLog(savingListMsg)
      counterBaseRef.current = { found: listResult.count, skipped: 0 }

      let listSave!: Awaited<ReturnType<typeof upsertGdtInvoiceList>>
      await runSavePhaseProgress(
        "save-list",
        listResult.count,
        savingListMsg,
        async () => {
          listSave = await upsertGdtInvoiceList({
            Type: invoiceType,
            Items: listResult.items,
          })
        },
        "lưu danh sách",
      )

      const listSaved = Number(listSave.ListSaved ?? 0)
      // Sau lưu list: chưa đếm Đã lưu (chỉ đếm khi lưu detail JSON).
      const listErrors = Math.max(0, listResult.count - listSaved)
      setDetailCounters(listResult.count, 0, listErrors, 0)
      appendLog(
        t("GDT_LIST_SAVED", "Đã lưu danh sách: {0} HĐ").replace("{0}", String(listSaved)),
      )

      const needDetailKeys = new Set(
        (listSave.Items ?? [])
          .filter((item) => item.NeedDetail && item.mhdon)
          .map((item) => String(item.mhdon)),
      )

      const toFetchDetail: GdtInvoiceSummary[] = listResult.items.filter((item) => {
        const key = resolveInvoiceKey(item)
        return key && needDetailKeys.has(key)
      })

      const skippedDetail = listResult.count - toFetchDetail.length
      // HĐ đã có JSON → Bỏ qua; Đã lưu vẫn = 0 đến khi lưu detail.
      setDetailCounters(listResult.count, skippedDetail, 0, 0)

      const planMsg = t(
        "GDT_DETAIL_PLAN",
        "Cần lấy chi tiết {0}/{1} HĐ (bỏ qua {2} đã có JSON).",
      )
        .replace("{0}", String(toFetchDetail.length))
        .replace("{1}", String(listResult.count))
        .replace("{2}", String(skippedDetail))
      setStatusText(planMsg)
      appendLog(planMsg)

      let detailItems: GdtInvoiceItem[] = []
      let detailFailed = 0
      let jsonSaved = 0

      if (toFetchDetail.length > 0) {
        setProgressDone(0)
        setProgressTotal(toFetchDetail.length)
        setCurrentInvId("")
        setProgress({
          status: "fetching_detail",
          phase: "detail",
          phaseLabel: "chi tiết",
          totalFound: listResult.count,
          detailDone: 0,
          detailTotal: toFetchDetail.length,
          detailFailed: 0,
          sourceIndex: 0,
          sourceTotal: 0,
          currentInv: "",
          message: planMsg,
        })

        const token =
          peekGdtToken(nextUsername) ||
          String(matchedLogin?.Token ?? "").trim()
        if (!token) {
          throw new Error("Thiếu token GDT — đăng nhập lại trước khi lấy chi tiết")
        }

        const connector = await createGdtDetailConnector({
          username: nextUsername,
          password,
          dateFrom: dateFromYmd,
          dateTo: dateToYmd,
          invType,
          onGdtProgress: handleProgress,
        })
        setConnectorMode(connector.name)

        // Extension (batch 100) hoặc Web (batch 200) → lưu JSON ngay qua onBatchComplete
        const results = await connector.fetchDetails(token, toFetchDetail, {
          signal: controller.signal,
          onConnectorModeChange: (mode) => {
            setConnectorMode(mode)
          },
          onProgress: (done, total, currentInv) => {
            setProgressDone(done)
            setProgressTotal(total)
            setCurrentInvId(currentInv?.trim() || "")
            setProgress((prev) => {
              // Không đè progress lưu list/JSON đang chạy
              if (prev?.phase === "save-json" || prev?.phase === "save-list") {
                return prev
              }
              return {
                status: "fetching_detail",
                phase: "detail",
                phaseLabel: "chi tiết",
                totalFound: listResult.count,
                detailDone: done,
                detailTotal: total,
                detailFailed: prev?.detailFailed ?? 0,
                sourceIndex: 0,
                sourceTotal: 0,
                currentInv: currentInv?.trim() || "",
                message: `Đang lấy chi tiết ${done}/${total}`,
              }
            })
          },
          onBatchComplete: async (batchItems, meta) => {
            if (controller.signal.aborted) {
              throw new DOMException("Aborted", "AbortError")
            }
            const okItems = batchItems.filter((item) => item.detail && !item.detail_error)
            // Retry thành công → trừ Lỗi; Đã lưu chỉ tăng sau upsert JSON bên dưới.
            if (meta.isRetry && okItems.length > 0) {
              setCounters((prev) => ({
                ...prev,
                found: listResult.count,
                skipped: skippedDetail,
                errors: Math.max(0, prev.errors - okItems.length),
              }))
            }

            if (okItems.length === 0) {
              return
            }
            const saveMsg = meta.isRetry
              ? t(
                  "GDT_SAVING_JSON_RETRY",
                  "Đang lưu chi tiết đã lấy lại ({0} HĐ)...",
                ).replace("{0}", String(okItems.length))
              : t(
                  "GDT_SAVING_JSON_BATCH",
                  "Đang lưu chi tiết batch {0}/{1} ({2} HĐ)...",
                )
                  .replace("{0}", String(meta.batchIndex + 1))
                  .replace("{1}", String(meta.batchCount))
                  .replace("{2}", String(okItems.length))
            appendLog(saveMsg)
            // Progress riêng 0→100% cho bước lưu JSON (không giữ thanh lấy chi tiết).
            const batchBaseSaved = jsonSaved
            await runSaveJsonProgress(okItems.length, saveMsg, async () => {
              const jsonSave = await upsertGdtInvoiceJson({
                Type: invoiceType,
                Items: okItems,
              })
              jsonSaved += Number(jsonSave.JsonSaved ?? 0)
              jsonSavedRef.current = jsonSaved
              setCounters((prev) => ({
                found: listResult.count,
                skipped: skippedDetail,
                saved: jsonSaved,
                errors: Math.min(
                  prev.errors,
                  Math.max(0, listResult.count - skippedDetail - jsonSaved),
                ),
              }))
            }, {
              onTick: (done, total) => {
                const animatedSaved = Math.min(
                  listResult.count - skippedDetail,
                  batchBaseSaved + Math.min(done, total),
                )
                jsonSavedRef.current = animatedSaved
                setCounters((prev) => ({
                  ...prev,
                  found: listResult.count,
                  skipped: skippedDetail,
                  saved: animatedSaved,
                }))
              },
              onComplete: (total) => {
                const animatedSaved = Math.min(
                  listResult.count - skippedDetail,
                  batchBaseSaved + total,
                )
                jsonSavedRef.current = animatedSaved
                setCounters((prev) => ({
                  ...prev,
                  found: listResult.count,
                  skipped: skippedDetail,
                  saved: animatedSaved,
                }))
              },
            })
          },
        })

        detailItems = results
        detailFailed = results.filter(
          (item) => Boolean(item.detail_error) || !item.detail,
        ).length
        setDetailCounters(listResult.count, skippedDetail, detailFailed, jsonSaved)
        setCurrentInvId("")
      }

      const finalResult: FetchAllInvoicesResult = {
        success: detailFailed === 0,
        partial: detailFailed > 0,
        count: listResult.count,
        detailErrorCount: detailFailed,
        items: detailItems,
      }

      setSyncPhase(3)
      setProgressDone(toFetchDetail.length)
      setProgressTotal(toFetchDetail.length || listResult.count)
      setCurrentInvId("")
      setDetailCounters(listResult.count, skippedDetail, detailFailed, jsonSaved)

      const doneMsg = t(
        "GDT_SYNC_DONE",
        "List {0} HĐ · lưu list {1} · skip detail {2} · lưu JSON {3} · lỗi detail {4}.",
      )
        .replace("{0}", String(listResult.count))
        .replace("{1}", String(listSaved))
        .replace("{2}", String(skippedDetail))
        .replace("{3}", String(jsonSaved))
        .replace("{4}", String(detailFailed))

      setStatusText(
        detailFailed === 0
          ? t("msg_GDT_Completed", "Đồng bộ hoàn tất")
          : t("msg_GDT_Completed_Partial", "Đồng bộ hoàn tất (có lỗi)"),
      )
      appendLog(doneMsg)
      setProgress((prev) =>
        prev
          ? {
              ...prev,
              status: detailFailed > 0 ? "partial" : "done",
              detailDone: toFetchDetail.length,
              detailFailed,
              message: doneMsg,
            }
          : prev,
      )

      // Tắt running trước onFetched — tránh onHiding hiện confirm “đang đồng bộ”.
      runningRef.current = false
      setRunning(false)
      await onFetched?.(finalResult)
      notify(doneMsg, detailFailed > 0 ? "warning" : "success", 4500)
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        setSyncPhase(-1)
        setStatusText(t("msg_GDT_Stopped", "Đã dừng"))
        appendLog(t("msg_GDT_Process_Stopped", "Tiến trình đã dừng"))
        notify(t("GDT_CANCELLED", "Đã hủy lấy dữ liệu từ TCT"), "info", 2500)
      } else {
        clearGdtToken(nextUsername)
        const message = error instanceof Error ? error.message : String(error)
        setSyncPhase(-1)
        setStatusText(t("msg_GDT_Failed", "Đồng bộ thất bại"))
        appendLog(`${t("msg_GDT_Error_Prefix", "Lỗi: ")}${message}`)
        setProgress((prev) =>
          prev
            ? { ...prev, status: "error", phase: "error", message }
            : {
                status: "error",
                phase: "error",
                phaseLabel: "",
                totalFound: 0,
                detailDone: 0,
                detailTotal: 0,
                detailFailed: 0,
                sourceIndex: 0,
                sourceTotal: 0,
                currentInv: "",
                message,
              },
        )
        notify(message, "error", 4000)
      }
    } finally {
      clearGdtTokenIssuedHandler(nextUsername)
      clearSaveProgressTimer()
      runningRef.current = false
      setRunning(false)
      abortRef.current = null
    }
  }, [
    appendLog,
    clearSaveProgressTimer,
    dateFromYmd,
    dateToYmd,
    handleProgress,
    invType,
    invoiceType,
    onFetched,
    password,
    runSaveJsonProgress,
    runSavePhaseProgress,
    savedLogins,
    setDetailCounters,
    t,
    username,
  ])

  const percent = progressPercent(progress, syncPhase)
  const progressLabel = formatProgressLabel(progressDone, progressTotal, percent)
  const headerTitle = periodLabel
    ? `${t("msg_GDT_Header", "ĐỒNG BỘ HÓA ĐƠN TỪ TỔNG CỤC THUẾ")} — ${periodLabel}`
    : t("msg_GDT_Header", "ĐỒNG BỘ HÓA ĐƠN TỪ TỔNG CỤC THUẾ")

  return (
    <Popup
      visible={visible}
      onHiding={(event) => {
        if (runningRef.current) {
          // Chặn đóng ngay — hỏi xác nhận; nếu đồng ý mới onClose().
          event.cancel = true
          void (async () => {
            const result = await confirm(
              t("msg_GDT_Confirm_Close", "Đang đồng bộ. Bạn có chắc muốn dừng và đóng?"),
              t("TIT_NOTIFICATION", "Thông báo"),
            )
            if (!result) {
              return
            }
            abortRef.current?.abort()
            runningRef.current = false
            setRunning(false)
            onClose()
          })()
          return
        }
        onClose()
      }}
      dragEnabled
      showCloseButton={!running}
      title={t("GDT_FETCH_TITLE", "Đồng bộ hóa đơn từ TCT")}
      width={720}
      height="auto"
      maxHeight="92vh"
    >
      <div className="gdt-connect-popup">
        <h2 className="gdt-connect-popup__header">{headerTitle}</h2>

        <div className="gdt-connect-popup__meta">
          <span>
            {t("VAT_INOUT_TYPE", "Loại hóa đơn")}:{" "}
            <strong>{invoiceType === "SELL" ? t("SELL", "Bán ra") : t("BUY", "Mua vào")}</strong>
          </span>
          <span>
            {t("GDT_CONNECTION_MODE", "Chế độ kết nối")}:{" "}
            <strong>
              {connectorMode === "extension"
                ? t("GDT_MODE_FAST", "Tốc độ cao")
                : t("GDT_MODE_STANDARD", "Tiêu chuẩn")}
            </strong>
          </span>
        </div>

        <div className="gdt-connect-popup__creds">
          <SelectBox
            className="gdt-connect-popup__username"
            dataSource={savedUsernames}
            value={username}
            acceptCustomValue
            searchEnabled
            searchMode="contains"
            showDropDownButton
            openOnFieldClick={false}
            stylingMode="outlined"
            label={t("GDT_USERNAME", "Tài khoản GDT (MST)")}
            labelMode="floating"
            disabled={running}
            dropDownOptions={{
              width: "auto",
              minWidth: 280,
              maxHeight: 280,
              wrapperAttr: { class: "gdt-connect-popup__login-dropdown" },
            }}
            itemRender={renderLoginItem}
            onInput={(event) => {
              const target = event.event?.target as HTMLInputElement | undefined
              const text = String(target?.value ?? event.component.option("text") ?? "")
              setUsername(text)
            }}
            onValueChanged={(event) => {
              applySavedLogin(String(event.value ?? ""))
            }}
            onCustomItemCreating={(event) => {
              const text = String(event.text ?? "").trim()
              event.customItem = text || null
            }}
          />
          <div className="gdt-connect-popup__password-wrap">
            <TextBox
              className="gdt-connect-popup__password"
              value={password}
              mode={showPassword ? "text" : "password"}
              stylingMode="outlined"
              label={t("GDT_PASSWORD", "Mật khẩu GDT")}
              labelMode="floating"
              disabled={running}
              onValueChanged={(event) => setPassword(String(event.value ?? ""))}
              onEnterKey={() => {
                if (!running) {
                  void handleFetch()
                }
              }}
            />
            <button
              type="button"
              className="gdt-connect-popup__password-toggle"
              disabled={running}
              title={
                showPassword
                  ? t("GDT_HIDE_PASSWORD", "Ẩn mật khẩu")
                  : t("GDT_SHOW_PASSWORD", "Hiện mật khẩu")
              }
              aria-label={
                showPassword
                  ? t("GDT_HIDE_PASSWORD", "Ẩn mật khẩu")
                  : t("GDT_SHOW_PASSWORD", "Hiện mật khẩu")
              }
              onClick={() => setShowPassword((prev) => !prev)}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <div className="gdt-connect-popup__phases" aria-label="Các bước đồng bộ">
          <div className={`gdt-connect-popup__phase ${phaseClass(syncPhase, 0)}`}>
            <span className="gdt-connect-popup__phase-num">①</span>
            <span className="gdt-connect-popup__phase-label">
              {t("msg_GDT_Phase_Connect", "Kết nối API")}
            </span>
          </div>
          <span className="gdt-connect-popup__phase-arrow">→</span>
          <div className={`gdt-connect-popup__phase ${phaseClass(syncPhase, 1)}`}>
            <span className="gdt-connect-popup__phase-num">②</span>
            <span className="gdt-connect-popup__phase-label">
              {t("msg_GDT_Phase_Fetch", "Lấy danh sách")}
            </span>
          </div>
          <span className="gdt-connect-popup__phase-arrow">→</span>
          <div className={`gdt-connect-popup__phase ${phaseClass(syncPhase, 2)}`}>
            <span className="gdt-connect-popup__phase-num">③</span>
            <span className="gdt-connect-popup__phase-label">
              {t("msg_GDT_Phase_Save", "Lưu dữ liệu")}
            </span>
          </div>
        </div>

        <div className="gdt-connect-popup__status-row">
          <span className="gdt-connect-popup__status-caption">
            {t("msg_GDT_Status_Caption", "Trạng thái:")}
          </span>
          <span className="gdt-connect-popup__status-value">{statusText || "—"}</span>
        </div>

        <div className="gdt-connect-popup__progress-row">
          <ProgressBar value={percent} showStatus={false} min={0} max={100} />
          <span className="gdt-connect-popup__progress-text">{progressLabel}</span>
        </div>

        <div className="gdt-connect-popup__current">
          {t("msg_GDT_Current_Invoice", "Hóa đơn hiện tại: {0}").replace(
            "{0}",
            currentInvId || "--",
          )}
        </div>

        <div className="gdt-connect-popup__counters">
          <div className="gdt-connect-popup__counter">
            <span className="gdt-connect-popup__counter-caption">
              {t("msg_GDT_Found_Caption", "Tìm thấy:")}
            </span>
            <span className="gdt-connect-popup__counter-value is-found">{counters.found}</span>
          </div>
          <div className="gdt-connect-popup__counter">
            <span className="gdt-connect-popup__counter-caption">
              {t("msg_GDT_Saved_Caption", "Đã lưu:")}
            </span>
            <span className="gdt-connect-popup__counter-value is-saved">{counters.saved}</span>
          </div>
          <div className="gdt-connect-popup__counter">
            <span className="gdt-connect-popup__counter-caption">
              {t("msg_GDT_Skipped_Caption", "Bỏ qua:")}
            </span>
            <span className="gdt-connect-popup__counter-value is-skipped">{counters.skipped}</span>
          </div>
          <div className="gdt-connect-popup__counter">
            <span className="gdt-connect-popup__counter-caption">
              {t("msg_GDT_Error_Caption", "Lỗi:")}
            </span>
            <span className="gdt-connect-popup__counter-value is-error">{counters.errors}</span>
          </div>
        </div>

        <div className="gdt-connect-popup__log-caption">
          {t("msg_GDT_Log_Caption", "Nhật ký gần nhất")}
        </div>
        <div ref={logRef} className="gdt-connect-popup__log" role="log" aria-live="polite">
          {logText || " "}
        </div>

        <div className="gdt-connect-popup__actions">
          <Button
            text={t("TSClose", "Đóng")}
            stylingMode="outlined"
            onClick={() => {
              void handleClose()
            }}
          />
          <Button
            text={
              running
                ? t("msg_GDT_Syncing", "Đang đồng bộ...")
                : t("msg_GDT_Sync_Button", "Đồng bộ")
            }
            type="default"
            stylingMode="contained"
            disabled={running}
            onClick={() => void handleFetch()}
          />
        </div>
      </div>
    </Popup>
  )
}
