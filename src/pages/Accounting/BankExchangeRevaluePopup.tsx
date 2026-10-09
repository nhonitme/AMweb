import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Button from "devextreme-react/button"
import ProgressBar from "devextreme-react/progress-bar"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import {
  getExchangeRevaluationJobProgress,
  startExchangeRevaluationJob,
} from "@/api/exchangeRevaluationJobApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { isBackgroundJobFinished, waitAsync } from "@/api/jobApi"
import MultiLookupCellEditor from "@/components/lookup/MultiLookupCellEditor"
import { currencyLookupStore } from "@/components/lookup/currencyLookupStore"
import type { CurrencyLookupItem } from "@/components/lookup/currencyLookupStore"
import { trimLookupText } from "@/components/lookup/lookupHelpers"
import { DateRangeBox } from "@/components/toolbar/DateRangeBox"
import { LanguageContext } from "@/lib/i18nLoader"
import { createCurrentMonthDateRange } from "@/lib/dateRangeDefaults"
import { queryKeys } from "@/lib/query/queryKeys"
import { normalizeCurrencyCodes } from "@/lib/currency"
import { buildChitYmdPayload, formatRateDateForApi } from "@/pages/Accounting/exchangeRevaluationUtils"

type RevaluationPhase = "IDLE" | "RUNNING" | "DONE" | "ERROR"

type TranslationFn = (key: string, fallback: string) => string

const PROGRESS_POLL_INTERVAL_MS = 500

export default function BankExchangeRevaluePopup() {
  const queryClient = useQueryClient()
  const dateRange = useMemo(createCurrentMonthDateRange, [])
  const [fromDate, setFromDate] = useState<Date | null>(dateRange.fromDate)
  const [toDate, setToDate] = useState<Date | null>(dateRange.toDate)
  const [currencyCodes, setCurrencyCodes] = useState<string[]>([])
  const [phase, setPhase] = useState<RevaluationPhase>("IDLE")
  const [progressValue, setProgressValue] = useState(0)
  const [savedCount, setSavedCount] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const isPollingRef = useRef(false)

  const { translate } = useContext(LanguageContext) as { translate?: TranslationFn }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const selectedCurrencyType = useMemo(() => {
    const normalized = normalizeCurrencyCodes(currencyCodes)
    return normalized.length > 0 ? normalized.join(",") : null
  }, [currencyCodes])

  useEffect(() => () => {
    isPollingRef.current = false
  }, [])

  const validateFilters = useCallback(() => {
    const fromYmd = buildChitYmdPayload(fromDate)
    const toYmd = buildChitYmdPayload(toDate)
    const rateDate = formatRateDateForApi(toDate)

    if (!fromYmd || !toYmd || !rateDate) {
      notify(t("DATE_RANGE_REQUIRED", "Vui lòng chọn đầy đủ Từ ngày và Đến ngày"), "warning", 3000)
      return null
    }

    if (fromYmd > toYmd) {
      notify(t("INVALID_DATE_RANGE", "Từ ngày phải nhỏ hơn hoặc bằng Đến ngày"), "warning", 3000)
      return null
    }

    if (!selectedCurrencyType) {
      notify(t("CURRENCY_REQUIRED", "Vui lòng chọn ít nhất một loại tiền tệ"), "warning", 3000)
      return null
    }

    return {
      fromYmd,
      toYmd,
      rateDate,
      fcType: selectedCurrencyType,
    }
  }, [fromDate, selectedCurrencyType, t, toDate])

  const pollJobProgress = useCallback(async (jobId: string) => {
    isPollingRef.current = true

    while (isPollingRef.current) {
      const progress = await queryClient.fetchQuery({
        queryKey: queryKeys.jobs.progress("bank-exchange-revalue", jobId),
        queryFn: () => getExchangeRevaluationJobProgress(jobId),
        staleTime: 0,
      })

      setProgressValue(Math.max(0, Math.min(100, progress.percent)))
      setSavedCount(progress.savedCount)
      setStatusMessage(progress.message || t("RECALCULATING", "Đang tính lại tỷ giá ngân hàng..."))

      if (isBackgroundJobFinished(progress.status)) {
        isPollingRef.current = false

        if (progress.status === "DONE") {
          setPhase("DONE")
          setProgressValue(100)
          const summary = progress.savedCount > 0
            ? `${t("REVALUATION_SUCCESS", "Tính lại tỷ giá hoàn tất")} · ${progress.savedCount} ${t("ROWS", "dòng")}`
            : t("REVALUATION_NO_ROWS", "Không có dòng nào được lưu")
          setStatusMessage(summary)
          notify(summary, "success", 3000)
          return
        }

        setPhase("ERROR")
        setProgressValue(0)
        const message = progress.message || t("REVALUATION_FAILED", "Tính lại tỷ giá thất bại")
        setStatusMessage(message)
        notify(message, "error", 4000)
        return
      }

      await waitAsync(PROGRESS_POLL_INTERVAL_MS)
    }
  }, [queryClient, t])

  const handleRecalculate = useCallback(async () => {
    const filters = validateFilters()
    if (!filters) {
      return
    }

    const confirmed = await confirm(
      t("CONFIRM_REVALUATION", "Bạn có muốn tính lại tỷ giá ngân hàng cho khoảng thời gian đã chọn?"),
      t("CONFIRM", "Xác nhận"),
    )

    if (!confirmed) {
      return
    }

    setPhase("RUNNING")
    setProgressValue(0)
    setSavedCount(0)
    setStatusMessage(t("RECALCULATING", "Đang tính lại tỷ giá ngân hàng..."))

    try {
      const startResult = await startExchangeRevaluationJob({
        RATE_DATE: filters.rateDate,
        FC_TYPE: filters.fcType,
        CHIT_YMD_FROM: filters.fromYmd,
        CHIT_YMD_TO: filters.toYmd,
      })

      if (!startResult.jobId) {
        throw new Error(startResult.message || t("JOB_ID_MISSING", "Không nhận được jobId từ server."))
      }

      setStatusMessage(startResult.message || t("JOB_CREATED", "Đã tạo job. Đang chờ server xử lý..."))
      await pollJobProgress(startResult.jobId)
    } catch (error) {
      isPollingRef.current = false
      setPhase("ERROR")
      setProgressValue(0)
      const message = getApiErrorMessage(error, t("REVALUATION_FAILED", "Tính lại tỷ giá thất bại"))
      setStatusMessage(message)
      notify(message, "error", 4000)
    }
  }, [pollJobProgress, t, validateFilters])

  const isRunning = phase === "RUNNING"

  return (
    <div className="flex h-full min-h-0 flex-col overflow-auto bg-white p-4">
      <div className="w-full max-w-3xl space-y-4">
        <p className="text-sm text-slate-600">
          {t(
            "BANK_EXCHANGE_REVALUE_DESC",
            "Chọn kỳ, loại tiền tệ và thực hiện tính lại tỷ giá ngân hàng.",
          )}
        </p>

        <DateRangeBox
          fromDate={fromDate}
          toDate={toDate}
          fromPlaceholder={t("FROM_DATE", "Từ ngày")}
          toPlaceholder={t("TO_DATE", "Đến ngày")}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          width="100%"
          className="grid grid-cols-1 gap-3 sm:grid-cols-2"
        />

        <MultiLookupCellEditor<CurrencyLookupItem>
          dataSource={currencyLookupStore}
          values={currencyCodes}
          valueExpr="CODE_CD"
          searchExpr={["CODE_CD", "CODE_NM_VIET", "CODE_NM_ENG", "CODE_NM_KOR", "CODE_NM_CHINA"]}
          placeholder={t("CURRENCY", "Loại tiền tệ")}
          buttonHint={t("OPEN_CURRENCY_LOOKUP", "Chọn loại tiền tệ")}
          onApply={(values) => setCurrencyCodes(values.map((value) => trimLookupText(value) || ""))}
          onClear={() => setCurrencyCodes([])}
          width="100%"
          columns={[
            { dataField: "CODE_CD", caption: t("CURRENCY_CODE", "Mã tiền tệ"), width: 120 },
            { dataField: "CODE_NM_VIET", caption: t("CURRENCY_NAME", "Tên tiền tệ"), minWidth: 220 },
          ]}
        />

        {(phase === "RUNNING" || phase === "DONE" || phase === "ERROR") && (
          <div className="space-y-2 rounded-xl border border-slate-200 bg-slate-50 p-3">
            <ProgressBar
              min={0}
              max={100}
              value={progressValue}
              showStatus
              statusFormat={(ratio) => `${Math.round((ratio ?? 0) * 100)}%`}
            />
            {savedCount > 0 && phase === "DONE" && (
              <p className="text-sm text-slate-600">
                {t("SAVED_ROWS", "Số dòng đã lưu")}: {savedCount}
              </p>
            )}
            {statusMessage && (
              <p className={`text-sm ${phase === "ERROR" ? "text-rose-600" : "text-slate-600"}`}>
                {statusMessage}
              </p>
            )}
          </div>
        )}

        <div className="flex justify-end gap-2 border-t border-slate-100 pt-3">
          <Button
            text={t("RECALCULATE", "Tính lại")}
            stylingMode="contained"
            type="default"
            disabled={isRunning}
            onClick={() => void handleRecalculate()}
          />
        </div>
      </div>
    </div>
  )
}
