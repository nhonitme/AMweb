import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import notify from "devextreme/ui/notify"
import { getApiErrorMessage } from "@/api/apiTypes"
import {
  getAiLicenseStatus,
  initAiSystem,
  type AiInitStepResult,
  type AiLicenseStatus,
} from "@/api/aiSystemApi"
import { useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import AiPostingRulePopup from "./AiPostingRulePopup"
import "./companyAiInit.css"

const STEP_LABELS: Record<string, string> = {
  ConnectDB: "Kết nối dữ liệu",
  AnalystData: "Phân tích dữ liệu",
  voucher: "Nạp lịch sử hạch toán",
  product: "Nạp danh mục hàng hóa",
  customer: "Nạp danh mục khách hàng",
  Success: "Hoàn tất",
}

const DEFAULT_STEPS = ["ConnectDB", "AnalystData", "voucher", "product", "customer", "Success"]

type StepVisual = "idle" | "run" | "done" | "fail"

function formatDate(value?: string | null): string {
  if (!value) return ""
  return String(value).slice(0, 10)
}

export default function CompanyAiInitSection() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  useCompanyLangRevision()
  const [status, setStatus] = useState<AiLicenseStatus | null>(null)
  const [loadError, setLoadError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [initing, setIniting] = useState(false)
  const [activeStepIndex, setActiveStepIndex] = useState(-1)
  const [steps, setSteps] = useState<AiInitStepResult[]>([])
  const [rulesVisible, setRulesVisible] = useState(false)

  const loadStatus = useCallback(async () => {
    setLoading(true)
    setLoadError(null)
    try {
      const next = await getAiLicenseStatus()
      setStatus(next)
    } catch (error) {
      const message = getApiErrorMessage(error, "Không tải được trạng thái license AI.")
      setLoadError(message)
      notify(message, "error", 4500)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadStatus()
  }, [loadStatus])

  const licenseTone = useMemo(() => {
    if (loading && !status) return "load"
    if (loadError || (status && !status.hasLicense) || status?.stopMsg) return "block"
    if (status?.isInited) return "ready"
    if (status?.canInit) return "wait"
    return "load"
  }, [loadError, loading, status])

  const statusTitle = useMemo(() => {
    if (loading && !status) return t("LOADING", "Đang kiểm tra license…")
    if (loadError) return loadError
    if (!status) return t("LOADING", "Đang tải...")
    if (!status.hasLicense) return status.stopMsg || t("MSG_AI_System7_AI_License", "Công ty chưa được cấp license AI.")
    if (status.stopMsg) return status.stopMsg
    if (status.isInited) return t("MSG_AI_System8_Ready", "Hệ thống AI đã được khởi tạo.")
    return t("AI_LICENSE_READY", "License AI còn hiệu lực — có thể khởi tạo.")
  }, [loadError, loading, status, t])

  const badgeLabel = useMemo(() => {
    if (licenseTone === "load") return t("AI_BADGE_CHECKING", "Đang kiểm tra")
    if (licenseTone === "ready") return t("AI_BADGE_READY", "Sẵn sàng")
    if (licenseTone === "wait") return t("AI_BADGE_PENDING_INIT", "Chờ khởi tạo")
    return t("AI_BADGE_BLOCKED", "Chưa dùng được")
  }, [licenseTone, t])

  const progressPercent = useMemo(() => {
    if (!initing && steps.length === 0) return status?.isInited ? 100 : 0
    const doneCount = steps.filter((step) => step.success).length
    if (doneCount > 0) return Math.round((doneCount / DEFAULT_STEPS.length) * 100)
    if (activeStepIndex < 0) return 0
    return Math.min(95, Math.round(((activeStepIndex + 1) / DEFAULT_STEPS.length) * 100))
  }, [activeStepIndex, initing, status?.isInited, steps])

  const handleInit = async () => {
    if (!status?.canInit || initing) return
    setIniting(true)
    setSteps([])
    setActiveStepIndex(0)

    let tick = 0
    const timer = window.setInterval(() => {
      tick = Math.min(tick + 1, DEFAULT_STEPS.length - 2)
      setActiveStepIndex(tick)
    }, 900)

    try {
      const result = await initAiSystem()
      window.clearInterval(timer)
      if (result.steps?.length) {
        setSteps(result.steps)
        setActiveStepIndex(result.steps.findIndex((step) => !step.success))
      }
      if (result.status) {
        setStatus(result.status)
      } else {
        await loadStatus()
      }
      if (result.success) {
        setActiveStepIndex(DEFAULT_STEPS.length)
        notify(result.message || "Khởi tạo hệ thống AI thành công.", "success", 4000)
      } else {
        notify(result.message || "Khởi tạo AI thất bại.", "error", 5000)
      }
    } catch (error) {
      window.clearInterval(timer)
      notify(getApiErrorMessage(error, "Khởi tạo AI thất bại."), "error", 5000)
      await loadStatus()
    } finally {
      setIniting(false)
    }
  }

  const stepMap = useMemo(() => {
    const map = new Map<string, AiInitStepResult>()
    steps.forEach((step) => map.set(step.step, step))
    return map
  }, [steps])

  const resolveStepVisual = (index: number, stepKey: string): StepVisual => {
    const step = stepMap.get(stepKey)
    if (step?.success === true) return "done"
    if (step && step.success === false && step.message && step.message !== "OK") return "fail"
    if (status?.isInited && !initing) return "done"
    if (initing && index === activeStepIndex) return "run"
    if (initing && index < activeStepIndex) return "done"
    return "idle"
  }

  return (
    <div className="company-ai-init space-y-4 p-1 sm:p-2">
      <section className="company-ai-init__hero px-5 py-5 sm:px-6 sm:py-6">
        <div className="company-ai-init__orbit" aria-hidden />
        <div className="relative flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <div className="company-ai-init__mark shrink-0" aria-hidden>
              <span className="dx-icon dx-icon-chatsparkleoutline text-lg leading-none" />
            </div>
            <div className="min-w-0">
              <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-500">
                {t("TSInit_AI_System", "Khởi tạo AI")}
              </div>
              <h2 className="mt-1.5 text-xl font-semibold tracking-tight text-slate-900 sm:text-2xl">
                {t("AI_INIT_HEADLINE", "Nạp dữ liệu để AI gợi ý hạch toán")}
              </h2>
              <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-600">
                {t(
                  "AI_INIT_SUBCOPY",
                  "Khởi tạo một lần theo license công ty: lịch sử chứng từ, hàng hóa và khách hàng. Sau đó AI chỉ đề xuất tài khoản nợ / có.",
                )}
              </p>
            </div>
          </div>

          <div className="relative z-[1] flex shrink-0 flex-col items-stretch gap-2 sm:items-end">
            <div
              className={`company-ai-init__badge company-ai-init__badge--${licenseTone} self-start sm:self-end`}
            >
              <span className="company-ai-init__pulse" aria-hidden />
              {badgeLabel}
            </div>
            <div className="company-ai-init__actions company-ai-init__actions--top">
              <Button
                icon="refresh"
                stylingMode="outlined"
                text={t("btnRefresh", "Làm mới")}
                disabled={loading || initing}
                onClick={() => void loadStatus()}
              />
              <Button
                icon="preferences"
                stylingMode="outlined"
                text={t("AI_RULES", "Quy tắc AI")}
                disabled={!status?.canUseAi || initing}
                onClick={() => setRulesVisible(true)}
              />
            </div>
          </div>
        </div>

        <div className="relative mt-5 grid gap-3 sm:grid-cols-[1fr_auto] sm:items-end">
          <div>
            <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
              {t("AI_LICENSE_STATUS", "Trạng thái license AI")}
            </div>
            <p className="mt-1.5 text-[15px] font-medium leading-snug text-slate-800">{statusTitle}</p>
            {status?.beginDate || status?.endDate ? (
              <p className="mt-1 text-xs text-slate-500">
                {status.beginDate ? `${t("FROM", "Từ")} ${formatDate(status.beginDate)}` : ""}
                {status.beginDate && status.endDate ? " — " : ""}
                {status.endDate ? `${t("TO", "đến")} ${formatDate(status.endDate)}` : ""}
              </p>
            ) : null}
          </div>
          <div className="min-w-[7.5rem]">
            <div className="mb-1 flex items-center justify-between text-[11px] font-semibold uppercase tracking-[0.12em] text-slate-500">
              <span>{t("PROGRESS", "Tiến độ")}</span>
              <span>{progressPercent}%</span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-slate-200">
              <div
                className="h-full rounded-full bg-teal-700 transition-[width] duration-500 ease-out"
                style={{ width: `${progressPercent}%` }}
              />
            </div>
          </div>
        </div>
      </section>

      <section className="company-ai-init__panel px-4 py-4 sm:px-5">
        <div className="mb-3 flex flex-col items-center gap-3 text-center">
          <div className="text-[11px] font-semibold uppercase tracking-[0.14em] text-slate-500">
            {t("Initialization_Progress", "Tiến trình khởi tạo")}
          </div>
          <div className="company-ai-init__start">
            <Button
              icon="runner"
              type="default"
              stylingMode="contained"
              width={260}
              text={initing ? t("PROCESSING", "Đang khởi tạo...") : t("Start_Initialization", "Bắt đầu khởi tạo")}
              disabled={!status?.canInit || initing || loading}
              onClick={() => void handleInit()}
            />
          </div>
          {initing ? (
            <span className="company-ai-init__loading inline-flex items-center gap-1.5 text-xs font-medium text-teal-700">
              <span className="dx-icon dx-icon-refresh animate-spin text-sm leading-none" aria-hidden="true" />
              {t("PROCESSING", "Đang khởi tạo...")}
            </span>
          ) : null}
        </div>

        <ol className="company-ai-init__steps mt-1">
          {DEFAULT_STEPS.map((stepKey, index) => {
            const visual = resolveStepVisual(index, stepKey)
            const step = stepMap.get(stepKey)
            const label = STEP_LABELS[stepKey] || stepKey
            const isLast = index === DEFAULT_STEPS.length - 1
            return (
              <li key={stepKey} className="company-ai-init__step">
                <div className="company-ai-init__step-rail">
                  <span
                    className={[
                      "company-ai-init__step-dot",
                      visual === "done" ? "company-ai-init__step-dot--done" : "",
                      visual === "run" ? "company-ai-init__step-dot--run" : "",
                      visual === "fail" ? "company-ai-init__step-dot--fail" : "",
                    ]
                      .filter(Boolean)
                      .join(" ")}
                  >
                    {visual === "done" ? (
                      <span className="dx-icon dx-icon-check" aria-hidden="true" />
                    ) : visual === "fail" ? (
                      <span className="dx-icon dx-icon-close" aria-hidden="true" />
                    ) : visual === "run" ? (
                      <span className="dx-icon dx-icon-refresh animate-spin" aria-hidden="true" />
                    ) : (
                      index + 1
                    )}
                  </span>
                  {!isLast ? (
                    <span
                      className={[
                        "company-ai-init__step-line",
                        visual === "done" ? "company-ai-init__step-line--done" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                    />
                  ) : null}
                </div>
                <div className="company-ai-init__step-body">
                  <div className="text-sm font-medium text-slate-800">
                    {t(`MSG_AI_System_${stepKey}`, label)}
                  </div>
                  {visual === "fail" && step?.message ? (
                    <div className="mt-0.5 text-xs text-rose-600">{step.message}</div>
                  ) : null}
                </div>
                <div className="company-ai-init__step-status text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-400">
                  {visual === "done"
                    ? "OK"
                    : visual === "run"
                      ? t("RUNNING", "Chạy")
                      : visual === "fail"
                        ? t("FAILED", "Lỗi")
                        : "—"}
                </div>
              </li>
            )
          })}
        </ol>
      </section>

      <AiPostingRulePopup visible={rulesVisible} onClose={() => setRulesVisible(false)} />
    </div>
  )
}
