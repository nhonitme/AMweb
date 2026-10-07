import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import DataGrid, { Column, Paging } from "devextreme-react/data-grid"
import SelectBox from "devextreme-react/select-box"
import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import RadioGroup from "devextreme-react/radio-group"
import Popup from "devextreme-react/popup"
import ProgressBar from "devextreme-react/progress-bar"
import LoadPanel from "devextreme-react/load-panel"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import { LanguageContext } from "@/lib/i18nLoader"
import {
  startPeriodLock,
  startPeriodUnlock,
  type CogsTransferRuleCode,
  type PeriodLockProgress,
  type PeriodLockRow,
  type PeriodLockStepCode,
  type PeriodLockStepStatus,
  type ProfitLossBalanceMethod,
} from "@/api/periodLockApi"
import { pollPeriodLockProgress } from "@/hooks/periodLock/usePeriodLockProgressPolling"
import { buildSafeYearList } from "@/hooks/periodLock/periodLockQueryHelpers"
import { usePeriodLockOverview } from "@/hooks/periodLock/usePeriodLockOverview"
import { usePeriodLockOptions } from "@/hooks/periodLock/usePeriodLockUserSettings"

/* =====================================================================================
   1. PAGE-LOCAL TYPES
   -------------------------------------------------------------------------------------
   Các DTO/API type đã được tách sang src/api/periodLockApi.ts.
   File page chỉ giữ lại các type phục vụ riêng cho render UI.
   ===================================================================================== */

/** Object truyền vào cellRender của DevExtreme DataGrid. */
type PeriodLockCellInfo = {
  /** Dữ liệu dòng hiện tại. */
  data: PeriodLockRow
}

/** Loại hành động user chọn trong popup thao tác kỳ. */
type PeriodActionType = "LOCK" | "UNLOCK"

/** Một hành động hợp lệ theo trạng thái hiện tại của kỳ. */
type PeriodActionOption = {
  /** Key duy nhất để RadioGroup chọn hành động. */
  Key: string

  /** Nhóm hành động: khóa lại hoặc mở sổ. */
  ActionType: PeriodActionType

  /** Tiêu đề hiển thị cho user. */
  Title: string

  /** Diễn giải ngắn cho popup. */
  Description: string

  /** Danh sách step sẽ chạy theo đúng thứ tự nghiệp vụ. */
  StepCodes: PeriodLockStepCode[]
}

/** Props cho panel chọn bước xử lý. */
type PeriodLockOptionPanelProps = {
  /** Danh sách bước chính đang được chọn. */
  selectedStepCodes: PeriodLockStepCode[]

  /** Danh sách rule giá vốn đang được chọn. */
  selectedCogsTransferRules: CogsTransferRuleCode

  /** Cách tính báo cáo lãi lỗ đang được chọn. */
  profitLossBalanceMethod: ProfitLossBalanceMethod

  /** Danh sách năm hiển thị trên combobox. */
  periodLockYearList: number[]

  /** Năm đang xem hiện tại. */
  periodLockYear: number

  /** Kỳ đã khóa hiện tại của công ty. */
  currentLockedPeriodLabel: string

  /** Sự kiện đổi năm đang xem. */
  onChangeYear: (year: number) => void

  /** Sự kiện tải lại dữ liệu năm đang xem. */
  onReload: () => void

  /** Sự kiện chọn/bỏ chọn bước chính. */
  onToggleStep: (stepCode: PeriodLockStepCode, checked: boolean) => void

  /** Sự kiện chọn/bỏ chọn rule giá vốn. */
  onToggleCogsTransferRule: (ruleCode: CogsTransferRuleCode) => void

  /** Sự kiện đổi cách tính báo cáo lãi lỗ. */
  onChangeProfitLossBalanceMethod: (method: ProfitLossBalanceMethod) => void

  /** Hàm dịch ngôn ngữ. */
  t: (key: string, fallback?: string) => string
}

/* =====================================================================================
   2. CONSTANTS
   ===================================================================================== */

/** Danh sách 3 bước chính, dùng để tạo dữ liệu mặc định và sort theo thứ tự. */
const PERIOD_LOCK_STEP_DEFINITIONS: Array<{
  StepCode: PeriodLockStepCode
  StepName: string
  StepOrder: number
}> = [
  {
    StepCode: "FA_PREPAID_LOCK",
    StepName: "Khóa TSCĐ / CP trả trước",
    StepOrder: 1,
  },
  {
    StepCode: "COGS_SUMMARY",
    StepName: "Báo cáo về tổng hợp giá vốn",
    StepOrder: 2,
  },
  {
    StepCode: "PROFIT_LOSS_REPORT",
    StepName: "Báo cáo lãi lỗ",
    StepOrder: 3,
  },
]

/** Danh sách rule con của bước tổng hợp giá vốn. */
const COGS_TRANSFER_RULE_DEFINITIONS: Array<{
  MethodCode: CogsTransferRuleCode
  MethodNameKey: string
  MethodName: string
}> = [
  {
    MethodCode: "154_TO_155",
    MethodNameKey: "PERIOD_LOCK_COGS_154_TO_155",
    MethodName: "154 >> 155 Tự động chuyển dữ liệu",
  },
  {
    MethodCode: "154_TO_155_TO_632",
    MethodNameKey: "PERIOD_LOCK_COGS_154_TO_155_TO_632",
    MethodName: "154 >> 155 >> 632 Tự động chuyển dữ liệu",
  },
  {
    MethodCode: "154_TO_632",
    MethodNameKey: "PERIOD_LOCK_COGS_154_TO_632",
    MethodName: "154 >> 632 Tự động chuyển dữ liệu",
  },
]

/** Danh sách phương pháp tính báo cáo lãi lỗ. */
const PROFIT_LOSS_BALANCE_METHOD_DEFINITIONS: Array<{
  MethodCode: ProfitLossBalanceMethod
  MethodNameKey: string
  MethodName: string
}> = [
  {
    MethodCode: "BALANCE_ACCOUNT",
    MethodNameKey: "PERIOD_LOCK_PL_BALANCE_ACCOUNT",
    MethodName: "Bảng cân đối tài khoản",
  },
  {
    MethodCode: "BALANCE_ACCOUNT_TWO_SIDE",
    MethodNameKey: "PERIOD_LOCK_PL_BALANCE_TWO_SIDE",
    MethodName: "Bảng cân đối tài khoản (Mẫu số dư 02 bên)",
  },
]

/* =====================================================================================
   3. COMMON HELPERS
   ===================================================================================== */

/** Pad số tháng/ngày thành 2 chữ số. Ví dụ 1 => 01. */
function pad2(value: number) {
  return value.toString().padStart(2, "0")
}

/** Chuyển kỳ yyyyMM thành MM/yyyy. */
function getPeriodLabel(periodYm: string) {
  if (!periodYm || periodYm.length !== 6) return periodYm
  return `${periodYm.substring(4, 6)}/${periodYm.substring(0, 4)}`
}



/** Chuyển kỳ yyyyMM thành index để so sánh thứ tự tháng. */
function getPeriodMonthIndex(periodYm: string) {
  if (!periodYm || periodYm.length !== 6) return 0

  const year = Number(periodYm.substring(0, 4))
  const month = Number(periodYm.substring(4, 6))

  return year * 12 + month
}

/** Tính số tháng từ kỳ bắt đầu đến kỳ kết thúc, tính cả 2 đầu. */
function getPeriodMonthCountInclusive(fromPeriodYm: string, toPeriodYm: string) {
  const fromIndex = getPeriodMonthIndex(fromPeriodYm)
  const toIndex = getPeriodMonthIndex(toPeriodYm)

  return Math.max(toIndex - fromIndex + 1, 1)
}

/** Lấy kỳ tháng kế tiếp sau yyyyMM. */
function getNextPeriodYm(periodYm: string) {
  if (!periodYm || periodYm.length !== 6) return ""

  const year = Number(periodYm.substring(0, 4))
  const month = Number(periodYm.substring(4, 6))
  const nextMonth = new Date(year, month, 1)

  return `${nextMonth.getFullYear()}${pad2(nextMonth.getMonth() + 1)}`
}

/** Lấy message lỗi thân thiện để hiển thị notify. */
function getErrorMessage(error: unknown, fallback: string) {
  if (error instanceof Error && error.message) {
    return error.message
  }

  if (error && typeof error === "object") {
    const obj = error as Record<string, unknown>
    return String(obj.Message ?? obj.message ?? obj.Error ?? obj.error ?? fallback)
  }

  return fallback
}

/* =====================================================================================
   4. DATA NORMALIZATION HELPERS
   -------------------------------------------------------------------------------------
   Dùng để đảm bảo grid luôn có đủ 12 tháng, kể cả backend chưa có dữ liệu.
   ===================================================================================== */

// Removed client-side default month/step generation and normalization helpers.
// The page now trusts API-provided rows and step data directly.

// Previously we merged API rows into 12 client-generated months.
// Now the page relies on API-provided rows directly, so no merge helper is needed.

/** Tìm step trong dòng tháng theo stepCode. */
function getStepByCode(row: PeriodLockRow, stepCode: PeriodLockStepCode) {
  return row.Steps.find((step) => step.StepCode === stepCode)
}

/** Kiểm tra các bước đang chọn của một dòng đã DONE hết chưa. */
function isRowDoneForSelectedSteps(row: PeriodLockRow, selectedStepCodes: PeriodLockStepCode[]) {
  if (selectedStepCodes.length === 0) return false

  return selectedStepCodes.every((stepCode) => {
    const step = getStepByCode(row, stepCode)
    return step?.Status === "DONE"
  })
}

/** Số đơn vị progress thực tế cho từng bước khóa sổ (khớp backend). */
function getProgressUnitCountForStep(stepCode: PeriodLockStepCode) {
  if (stepCode === "FA_PREPAID_LOCK") return 3
  if (stepCode === "COGS_SUMMARY") return 3
  if (stepCode === "PROFIT_LOSS_REPORT") return 3
  return 1
}

/** Tính tổng số đơn vị progress cho 1 tháng dựa trên các bước sẽ chạy. */
function getProgressUnitCountPerMonth(selectedStepCodes: PeriodLockStepCode[]) {
  const count = selectedStepCodes.reduce((sum, stepCode) => sum + getProgressUnitCountForStep(stepCode), 0)
  return Math.max(count, 1)
}

/** Lấy bước đích (order cao nhất) để hiển thị progress ban đầu. */
function getTargetLockStepCode(stepCodes: PeriodLockStepCode[]) {
  const ordered = [...stepCodes].sort((a, b) => {
    const aOrder = getStepDefinition(a)?.StepOrder ?? 0
    const bOrder = getStepDefinition(b)?.StepOrder ?? 0
    return bOrder - aOrder
  })

  return ordered[0] ?? "FA_PREPAID_LOCK"
}

/** Tính totalSteps FE fallback: chỉ bước chưa DONE trong phạm vi kỳ. */
function calculatePendingLockTotalSteps(
  rows: PeriodLockRow[],
  fromPeriodYm: string,
  toPeriodYm: string,
  stepCodes: PeriodLockStepCode[],
) {
  if (!fromPeriodYm || !toPeriodYm) {
    return getProgressUnitCountPerMonth(stepCodes)
  }

  let total = 0

  for (const row of rows) {
    if (getPeriodMonthIndex(row.PeriodYm) < getPeriodMonthIndex(fromPeriodYm)) continue
    if (getPeriodMonthIndex(row.PeriodYm) > getPeriodMonthIndex(toPeriodYm)) continue

    for (const stepCode of stepCodes) {
      if (getStepStatusFromRow(row, stepCode) !== "DONE") {
        total += getProgressUnitCountForStep(stepCode)
      }
    }
  }

  return Math.max(total, 1)
}

/** Tính kỳ bắt đầu dự kiến ở frontend để hiển thị progress ban đầu. Backend vẫn là nguồn quyết định cuối cùng. */
function getEstimatedLockFromPeriodYm(currentLockedPeriodYm: string, fiscalStartPeriodYm: string) {
  if (currentLockedPeriodYm) {
    return getNextPeriodYm(currentLockedPeriodYm)
  }

  return fiscalStartPeriodYm || ""
}

/** Kiểm tra có thể mở sổ từ dòng này không. */
function canUnlockFromRow(row: PeriodLockRow, currentLockedPeriodYm: string) {
  if (!currentLockedPeriodYm) return false
  if (row.Status === "PROCESSING") return false

  return getPeriodMonthIndex(row.PeriodYm) <= getPeriodMonthIndex(currentLockedPeriodYm)
}

/** Lấy định nghĩa step theo mã. */
function getStepDefinition(stepCode: PeriodLockStepCode) {
  return PERIOD_LOCK_STEP_DEFINITIONS.find((step) => step.StepCode === stepCode)
}

/** Lấy tên step để hiển thị trong confirm/popup. */
function getStepDisplayName(stepCode: PeriodLockStepCode) {
  return getStepDefinition(stepCode)?.StepName ?? stepCode
}

/** Lấy trạng thái step của dòng, mặc định OPEN nếu backend chưa trả step. */
function getStepStatusFromRow(row: PeriodLockRow, stepCode: PeriodLockStepCode): PeriodLockStepStatus {
  return getStepByCode(row, stepCode)?.Status ?? "OPEN"
}

/**
 * Key theo dõi khả năng thao tác của một dòng (dùng cho calculateCellValue cột Thao tác).
 * buildPeriodActionOptions chỉ dùng t cho text hiển thị, không ảnh hưởng logic sinh action.
 */
function getPeriodActionAvailabilityKey(
  row: PeriodLockRow,
  selectedLockStepCodes: PeriodLockStepCode[],
) {
  const stepKey = PERIOD_LOCK_STEP_DEFINITIONS.map((step) =>
    getStepStatusFromRow(row, step.StepCode),
  ).join(",")

  const actionCount = buildPeriodActionOptions(
    row,
    (_key, fallback) => fallback ?? "",
    selectedLockStepCodes,
  ).length

  return `${row.Status}|${stepKey}|${actionCount}`
}

/** Text trạng thái step trong popup thao tác. */
function getStepStatusText(status: PeriodLockStepStatus, t: (key: string, fallback?: string) => string) {
  if (status === "DONE") return t("PERIOD_LOCK_STEP_DONE", "Hoàn tất")
  if (status === "PROCESSING") return t("PERIOD_LOCK_STEP_PROCESSING", "Đang chạy")
  if (status === "ERROR") return t("PERIOD_LOCK_STEP_ERROR", "Lỗi")
  return t("PERIOD_LOCK_STEP_OPEN", "Chưa chạy")
}

/** Class badge trạng thái step trong popup thao tác. */
function getStepStatusBadgeClass(status: PeriodLockStepStatus) {
  if (status === "DONE") return "bg-green-100 text-green-700"
  if (status === "PROCESSING") return "bg-blue-100 text-blue-700"
  if (status === "ERROR") return "bg-red-100 text-red-700"
  return "bg-gray-100 text-gray-700"
}

/**
 * Sinh danh sách hành động hợp lệ cho popup thao tác kỳ.
 * Khóa sổ chạy xuôi: bước 1 -> 2 -> 3.
 * Mở sổ chạy ngược: bước 3 -> 2 -> 1.
 */
function buildPeriodActionOptions(
  row: PeriodLockRow,
  t: (key: string, fallback?: string) => string,
  selectedLockStepCodes: PeriodLockStepCode[] = PERIOD_LOCK_STEP_DEFINITIONS.map((step) => step.StepCode),
): PeriodActionOption[] {
  if (row.Status === "PROCESSING") return []

  const isStepSelectedForLock = (stepCode: PeriodLockStepCode) =>
    selectedLockStepCodes.includes(stepCode)

  const step1 = getStepStatusFromRow(row, "FA_PREPAID_LOCK")
  const step2 = getStepStatusFromRow(row, "COGS_SUMMARY")
  const step3 = getStepStatusFromRow(row, "PROFIT_LOSS_REPORT")

  const actions: PeriodActionOption[] = []

  const isStep1Done = step1 === "DONE"
  const isStep2Done = step2 === "DONE"
  const isStep3Done = step3 === "DONE"

  /*
    Khóa sổ từng bước chạy theo khái niệm "khóa tới bước".
    Backend sẽ tự expand đúng thứ tự 1 -> 2 -> 3 và bỏ qua step đã DONE.
    Ví dụ chọn khóa tới bước 3 thì backend tự khóa bước 1, bước 2 nếu cần, rồi bước 3.
  */
  if (!isStep1Done && isStepSelectedForLock("FA_PREPAID_LOCK")) {
    actions.push({
      Key: "LOCK_TO_STEP_1",
      ActionType: "LOCK",
      Title: t("PERIOD_ACTION_LOCK_TO_STEP_1", "Khóa tới bước 1 - TSCĐ / CP trả trước"),
      Description: t("PERIOD_ACTION_LOCK_TO_STEP_1_DESC", "Chạy bước 1 cho kỳ được chọn. Không ảnh hưởng logic mở sổ."),
      StepCodes: ["FA_PREPAID_LOCK"],
    })
  }

  if (!isStep2Done && isStepSelectedForLock("COGS_SUMMARY")) {
    actions.push({
      Key: "LOCK_TO_STEP_2",
      ActionType: "LOCK",
      Title: t("PERIOD_ACTION_LOCK_TO_STEP_2", "Khóa tới bước 2 - Tổng hợp giá vốn"),
      Description: t(
        "PERIOD_ACTION_LOCK_TO_STEP_2_DESC",
        "Backend tự khóa các bước đang được chọn trước đó nếu cần, sau đó khóa bước 2.",
      ),
      StepCodes: ["COGS_SUMMARY"],
    })
  }

  if (!isStep3Done && isStepSelectedForLock("PROFIT_LOSS_REPORT")) {
    actions.push({
      Key: "LOCK_TO_STEP_3",
      ActionType: "LOCK",
      Title: t("PERIOD_ACTION_LOCK_TO_STEP_3", "Khóa tới bước 3 - Báo cáo lãi lỗ"),
      Description: t(
        "PERIOD_ACTION_LOCK_TO_STEP_3_DESC",
        "Backend tự khóa các bước đang được chọn trước đó nếu cần, sau đó khóa bước 3.",
      ),
      StepCodes: ["PROFIT_LOSS_REPORT"],
    })
  }

  /*
    Mở sổ vẫn chạy ngược 3 -> 2 -> 1.
    Chỉ hiển thị các lựa chọn mở tương ứng với những step còn DONE.
  */
  if (isStep3Done) {
    actions.push({
      Key: "UNLOCK_STEP_3",
      ActionType: "UNLOCK",
      Title: t("PERIOD_ACTION_UNLOCK_STEP_3", "Mở tới bước 3 - Báo cáo lãi lỗ"),
      Description: t("PERIOD_ACTION_UNLOCK_STEP_3_DESC", "Mở tới bước báo cáo lãi lỗ, các bước 1 và 2 vẫn giữ trạng thái đã khóa."),
      StepCodes: ["PROFIT_LOSS_REPORT"],
    })
  }

  if (isStep2Done) {
    actions.push({
      Key: "UNLOCK_STEP_2",
      ActionType: "UNLOCK",
      Title: t("PERIOD_ACTION_UNLOCK_STEP_2", "Mở tới bước 2 - Tổng hợp giá vốn"),
      Description: t("PERIOD_ACTION_UNLOCK_STEP_2_DESC", "Backend tự mở bước 3 trước nếu cần, sau đó mở tới bước 2."),
      StepCodes: ["COGS_SUMMARY"],
    })
  }

  if (isStep1Done) {
    actions.push({
      Key: "UNLOCK_ALL",
      ActionType: "UNLOCK",
      Title: t("PERIOD_ACTION_UNLOCK_ALL", "Mở toàn bộ tới bước 1"),
      Description: t("PERIOD_ACTION_UNLOCK_ALL_DESC", "Tự mở theo thứ tự ngược: bước 3, bước 2, rồi bước 1."),
      StepCodes: ["FA_PREPAID_LOCK"],
    })
  }

  return actions
}

/**
 * Mở sổ theo khái niệm "mở tới bước".
 * Chọn bước 2 thì hệ thống tự mở bước 3 trước rồi mới mở bước 2.
 */
/**
 * Khóa sổ theo khái niệm "khóa tới bước".
 * Chọn bước 2 thì hệ thống tự khóa bước 1 nếu cần rồi mới khóa bước 2.
 */
function expandLockStepCodesToTarget(stepCodes: PeriodLockStepCode[]) {
  const targetStepCode = [...stepCodes].sort((a, b) => {
    const aOrder = getStepDefinition(a)?.StepOrder ?? 0
    const bOrder = getStepDefinition(b)?.StepOrder ?? 0
    return bOrder - aOrder
  })[0]

  if (targetStepCode === "FA_PREPAID_LOCK") {
    return ["FA_PREPAID_LOCK"] as PeriodLockStepCode[]
  }

  if (targetStepCode === "COGS_SUMMARY") {
    return ["FA_PREPAID_LOCK", "COGS_SUMMARY"] as PeriodLockStepCode[]
  }

  if (targetStepCode === "PROFIT_LOSS_REPORT") {
    return ["FA_PREPAID_LOCK", "COGS_SUMMARY", "PROFIT_LOSS_REPORT"] as PeriodLockStepCode[]
  }

  return stepCodes
}

function expandUnlockStepCodesToTarget(stepCodes: PeriodLockStepCode[]) {
  const targetStepCode = [...stepCodes].sort((a, b) => {
    const aOrder = getStepDefinition(a)?.StepOrder ?? 0
    const bOrder = getStepDefinition(b)?.StepOrder ?? 0
    return aOrder - bOrder
  })[0]

  if (targetStepCode === "PROFIT_LOSS_REPORT") {
    return ["PROFIT_LOSS_REPORT"] as PeriodLockStepCode[]
  }

  if (targetStepCode === "COGS_SUMMARY") {
    return ["PROFIT_LOSS_REPORT", "COGS_SUMMARY"] as PeriodLockStepCode[]
  }

  if (targetStepCode === "FA_PREPAID_LOCK") {
    return ["PROFIT_LOSS_REPORT", "COGS_SUMMARY", "FA_PREPAID_LOCK"] as PeriodLockStepCode[]
  }

  return stepCodes
}

/**
 * Kiểm tra một action mở sổ có áp dụng được cho dòng tháng hay không.
 * Khác với check theo action key, hàm này mô phỏng mở lần lượt từng step.
 * Nếu step đã OPEN thì bỏ qua, để các tháng trước đã mở bước 3 vẫn mở tiếp được bước 2.
 */
function canApplyUnlockStepCodesToRow(
  row: PeriodLockRow,
  stepCodes: PeriodLockStepCode[],
) {
  if (row.Status === "PROCESSING") return false

  const state: Record<PeriodLockStepCode, PeriodLockStepStatus> = {
    FA_PREPAID_LOCK: getStepStatusFromRow(row, "FA_PREPAID_LOCK"),
    COGS_SUMMARY: getStepStatusFromRow(row, "COGS_SUMMARY"),
    PROFIT_LOSS_REPORT: getStepStatusFromRow(row, "PROFIT_LOSS_REPORT"),
  }

  const orderedStepCodes = expandUnlockStepCodesToTarget(stepCodes).sort((a, b) => {
    const aOrder = getStepDefinition(a)?.StepOrder ?? 0
    const bOrder = getStepDefinition(b)?.StepOrder ?? 0
    return bOrder - aOrder
  })

  for (const stepCode of orderedStepCodes) {
    const stepDef = getStepDefinition(stepCode)
    if (!stepDef) return false

    const currentStatus = state[stepCode]

    // Step đã OPEN thì coi như đã mở xong, tiếp tục xét step kế tiếp.
    if (currentStatus === "OPEN") {
      continue
    }

    // Muốn mở thì step hiện tại phải đang DONE.
    if (currentStatus !== "DONE") {
      return false
    }

    // Backend sẽ tự mở các bước phía sau trước, frontend chỉ mô phỏng lần lượt 3 -> 2 -> 1.
    state[stepCode] = "OPEN"
  }

  return true
}

/** Một dòng tháng còn ít nhất một step DONE thì vẫn được xem là đang còn khóa để mở sổ. */
function hasAnyLockedStep(row: PeriodLockRow) {
  return PERIOD_LOCK_STEP_DEFINITIONS.some(
    (step) => getStepStatusFromRow(row, step.StepCode) === "DONE",
  )
}

/**
 * Lấy tháng khóa gần nhất dùng làm kỳ kết thúc khi mở sổ.
 * Không lấy tháng OPEN/chưa khóa để tránh gọi mở sổ dư qua các tháng tương lai.
 */
function getLatestUnlockablePeriodYm(rows: PeriodLockRow[]) {
  return (
    rows
      .filter((row) => hasAnyLockedStep(row))
      .map((row) => row.PeriodYm)
      .sort((a, b) => b.localeCompare(a))[0] ?? ""
  )
}

/**
 * Tính kỳ kết thúc cho hành động trong popup.
 * Với mở sổ từng bước hoặc khóa lại step đã mở một phần, lấy toàn bộ dải tháng liên tiếp
 * có cùng hành động hợp lệ, để user có thể mở/khóa lại theo batch chứ không chỉ 1 tháng.
 */
function getPeriodActionRangeToPeriodYm(
  rows: PeriodLockRow[],
  targetRow: PeriodLockRow,
  action: PeriodActionOption,
  t: (key: string, fallback?: string) => string,
  latestUnlockablePeriodYm?: string,
) {
  // Khóa sổ: click dòng nào thì ToPeriodYm là đúng dòng đó.
  // Frontend không tự kéo dài range để tránh khóa vượt kỳ user chọn.
  if (action.ActionType === "LOCK") {
    return targetRow.PeriodYm
  }

  const latestUnlockableIndex = latestUnlockablePeriodYm
    ? getPeriodMonthIndex(latestUnlockablePeriodYm)
    : 0

  if (action.ActionType === "UNLOCK") {
    if (!latestUnlockableIndex) {
      return targetRow.PeriodYm
    }

    if (getPeriodMonthIndex(targetRow.PeriodYm) > latestUnlockableIndex) {
      return latestUnlockablePeriodYm || targetRow.PeriodYm
    }

    /*
      Mở sổ phải chạy từ kỳ khóa gần nhất đi ngược về kỳ user chọn.
      Ví dụ đang khóa tới 08/2026, user chọn mở từ 12/2025
      thì API phải gửi FromPeriodYm = 202512, ToPeriodYm = 202608.
      Không được chỉ quét các dòng đang hiển thị trong năm 2025.
    */
    return latestUnlockablePeriodYm || targetRow.PeriodYm
  }

  const sortedRows = [...rows]
    .filter((row) => {
      const rowIndex = getPeriodMonthIndex(row.PeriodYm)
      if (rowIndex < getPeriodMonthIndex(targetRow.PeriodYm)) return false
      if (action.ActionType === "UNLOCK" && latestUnlockableIndex > 0) {
        return rowIndex <= latestUnlockableIndex
      }
      return true
    })
    .sort((a, b) => getPeriodMonthIndex(a.PeriodYm) - getPeriodMonthIndex(b.PeriodYm))

  let expectedIndex = getPeriodMonthIndex(targetRow.PeriodYm)
  let toPeriodYm = targetRow.PeriodYm

  for (const row of sortedRows) {
    const rowIndex = getPeriodMonthIndex(row.PeriodYm)

    if (rowIndex !== expectedIndex) {
      break
    }

    const canApplyAction =
      action.ActionType === "UNLOCK"
        ? canApplyUnlockStepCodesToRow(row, action.StepCodes)
        : buildPeriodActionOptions(row, t).some((item) => item.Key === action.Key)

    if (!canApplyAction) {
      break
    }

    toPeriodYm = row.PeriodYm
    expectedIndex += 1
  }

  return toPeriodYm
}

/* =====================================================================================
   5. OPTION PANEL COMPONENT
   ===================================================================================== */

function PeriodLockOptionPanel({
  selectedStepCodes,
  selectedCogsTransferRules,
  profitLossBalanceMethod,
  periodLockYearList,
  periodLockYear,
  currentLockedPeriodLabel,
  onChangeYear,
  onReload,
  onToggleStep,
  onToggleCogsTransferRule,
  onChangeProfitLossBalanceMethod,
  t,
}: PeriodLockOptionPanelProps) {
  /** Có chọn bước khóa TSCĐ/CP trả trước hay không. */
  const isFaPrepaidSelected = selectedStepCodes.includes("FA_PREPAID_LOCK")

  /** Có chọn bước tổng hợp giá vốn hay không. */
  const isCogsSummarySelected = selectedStepCodes.includes("COGS_SUMMARY")

  /** Có chọn bước báo cáo lãi lỗ hay không. */
  const isProfitLossSelected = selectedStepCodes.includes("PROFIT_LOSS_REPORT")

  /** Ngôn ngữ hiện tại, dùng để RadioGroup vẽ lại nhãn khi đổi ngôn ngữ. */
  const { lang } = useContext(LanguageContext)

  /** Nhãn radio giá vốn theo ngôn ngữ hiện tại. */
  const cogsTransferRuleItems = useMemo(
    () =>
      COGS_TRANSFER_RULE_DEFINITIONS.map((rule) => ({
        ...rule,
        MethodName: t(rule.MethodNameKey, rule.MethodName),
      })),
    [t],
  )

  /** Nhãn radio cách tính bảng cân theo ngôn ngữ hiện tại. */
  const profitLossBalanceMethodItems = useMemo(
    () =>
      PROFIT_LOSS_BALANCE_METHOD_DEFINITIONS.map((method) => ({
        ...method,
        MethodName: t(method.MethodNameKey, method.MethodName),
      })),
    [t],
  )

  /** Text nhỏ hiển thị số bước chính đang được chọn. */
  const selectedStepCountText = useMemo(() => {
    if (selectedStepCodes.length === 0) return t("PERIOD_LOCK_NO_STEP_SELECTED", "Chưa chọn bước")
    return `${selectedStepCodes.length} ${t("PERIOD_LOCK_STEPS_SELECTED", "bước được chọn")}`
  }, [selectedStepCodes.length, t])

  return (
    <div className="mb-4 rounded-2xl border border-red-100 bg-white p-4 shadow-sm">
      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center">
        <div>
          <div className="text-base font-semibold text-gray-900">
            {t("PERIOD_LOCK_OPTION_TITLE", "Thiết lập bước xử lý")}
          </div>
        </div>

        <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600 lg:ml-5">
          {selectedStepCountText}
        </div>

        <div className="rounded-full bg-red-50 px-3 py-1 text-xs font-semibold text-red-600">
          {t("PERIOD_LOCK_CURRENT_LOCKED_PERIOD", "Kỳ đã khóa hiện tại")}: {currentLockedPeriodLabel}
        </div>

        <div className="flex items-center gap-2 lg:ml-auto">
          <SelectBox
            width={140}
            items={periodLockYearList}
            value={periodLockYear}
            onValueChanged={(e) => {
              const nextYear = Number(e.value)
              if (!nextYear || nextYear === periodLockYear) return
              onChangeYear(nextYear)
            }}
          />

          <Button
            text={t("RELOAD_PAGE", "Tải lại")}
            icon="refresh"
            type="default"
            stylingMode="contained"
            onClick={onReload}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 xl:grid-cols-3">
        <div
          className={`rounded-2xl border p-4 transition ${
            isFaPrepaidSelected
              ? "border-red-300 bg-red-50/50 shadow-sm"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <CheckBox
              value={isFaPrepaidSelected}
              onValueChanged={(e) => onToggleStep("FA_PREPAID_LOCK", Boolean(e.value))}
            />

            <div>
              <div className="text-sm font-semibold text-gray-900">
                {t("PERIOD_LOCK_FA_PREPAID_TITLE", "1. Khóa TSCĐ / CP trả trước")}
              </div>

              <div className="mt-1 text-xs leading-5 text-gray-500">
                {t(
                  "PERIOD_LOCK_FA_PREPAID_DESC",
                  "Khóa khấu hao tài sản cố định và phân bổ chi phí trả trước trong kỳ.",
                )}
              </div>

              {/* <div className="mt-3 inline-flex rounded-full bg-white px-2.5 py-1 text-xs font-medium text-gray-600 ring-1 ring-gray-200">
                
              </div> */}
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 transition ${
            isCogsSummarySelected
              ? "border-red-300 bg-red-50/50 shadow-sm"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <CheckBox
              value={isCogsSummarySelected}
              onValueChanged={(e) => onToggleStep("COGS_SUMMARY", Boolean(e.value))}
            />

            <div className="w-full">
              <div className="text-sm font-semibold text-gray-900">
                {t("PERIOD_LOCK_COGS_TITLE", "2. Báo cáo tổng hợp giá vốn")}
              </div>

              <div className="mt-1 text-xs leading-5 text-gray-500">
                {t(
                  "PERIOD_LOCK_COGS_DESC",
                  "Tự động chuyển dữ liệu giá vốn theo luồng tài khoản đã chọn.",
                )}
              </div>

              <div className="mt-3 space-y-2">
                {/* {COGS_TRANSFER_RULE_DEFINITIONS.map((rule) => {
                  const checked = selectedCogsTransferRules.includes(rule.RuleCode)

                  return (
                    <div
                      key={rule.RuleCode}
                      className={`rounded-xl border px-3 py-2 transition ${
                        checked && isCogsSummarySelected
                          ? "border-red-300 bg-white"
                          : "border-gray-200 bg-white/70"
                      }`}
                    >
                      <CheckBox
                        text={rule.RuleName}
                        value={checked}
                        disabled={!isCogsSummarySelected}
                        onValueChanged={(e) => {
                          onToggleCogsTransferRule(rule.RuleCode, Boolean(e.value))
                        }}

                      />
                    </div>
                  )
                })} */}

               <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                  {/* <div className="mb-2 text-xs font-medium text-gray-500">
                    
                  </div> */}

                  <RadioGroup
                    key={`cogs-rule-${lang}`}
                    dataSource={cogsTransferRuleItems}
                    valueExpr="MethodCode"
                    displayExpr="MethodName"
                    layout="vertical"
                    value={selectedCogsTransferRules}
                    disabled={!isCogsSummarySelected}
                    onValueChanged={(e) => {
                      onToggleCogsTransferRule(e.value as CogsTransferRuleCode)
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        <div
          className={`rounded-2xl border p-4 transition ${
            isProfitLossSelected
              ? "border-red-300 bg-red-50/50 shadow-sm"
              : "border-gray-200 bg-gray-50"
          }`}
        >
          <div className="flex items-start gap-3">
            <CheckBox
              value={isProfitLossSelected}
              onValueChanged={(e) => onToggleStep("PROFIT_LOSS_REPORT", Boolean(e.value))}
            />

            <div className="w-full">
              <div className="text-sm font-semibold text-gray-900">
                {t("PERIOD_LOCK_PROFIT_LOSS_TITLE", "3. Báo cáo lãi lỗ")}
              </div>

              <div className="mt-1 text-xs leading-5 text-gray-500">
                {t(
                  "PERIOD_LOCK_PROFIT_LOSS_DESC",
                  "Chọn cách tính bảng cân trước khi tổng hợp báo cáo lãi lỗ.",
                )}
              </div>

              <div className="mt-3 rounded-xl border border-gray-200 bg-white p-3">
                {/* <div className="mb-2 text-xs font-medium text-gray-500">
                  {t("PERIOD_LOCK_BALANCE_METHOD", "Cách tính cho bảng cân")}
                </div> */}

                <RadioGroup
                  key={`pl-method-${lang}`}
                  dataSource={profitLossBalanceMethodItems}
                  valueExpr="MethodCode"
                  displayExpr="MethodName"
                  layout="vertical"
                  value={profitLossBalanceMethod}
                  disabled={!isProfitLossSelected}
                  onValueChanged={(e) => {
                    onChangeProfitLossBalanceMethod(e.value as ProfitLossBalanceMethod)
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {selectedStepCodes.length === 0 && (
        <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {t("PERIOD_LOCK_SELECT_AT_LEAST_ONE_STEP", "Vui lòng chọn ít nhất 1 bước trước khi xử lý.")}
        </div>
      )}

      {/* {isCogsSummarySelected && selectedCogsTransferRules.length === 0 && (
        <div className="mt-4 rounded-xl bg-red-50 px-3 py-2 text-sm text-red-600">
          {t(
            "PERIOD_LOCK_SELECT_AT_LEAST_ONE_COGS_RULE",
            "Vui lòng chọn ít nhất 1 cách tự động chuyển dữ liệu giá vốn.",
          )}
        </div>
      )} */}
    </div>
  )
}

/* =====================================================================================
   6. MAIN PAGE COMPONENT
   ===================================================================================== */

export default function PeriodLockPage(): React.JSX.Element {
  /** Năm hiện tại của máy client. Dùng làm năm mặc định khi mở màn hình. */
  const currentYear = new Date().getFullYear()

  /** Hàm dịch ngôn ngữ từ LanguageContext. */
  const { translate, lang } = useContext(LanguageContext)

  /** Alias ngắn cho hàm dịch. */
  const t = translate

  /**
   * Năm đang được chọn trên combobox.
   * Logic quan trọng: khi user chọn năm, state này phải giữ nguyên năm đó,
   * không bị reset về năm hiện tại hoặc năm đầu kỳ sau khi API load xong.
   */
  const [periodLockYear, setPeriodLockYear] = useState<number>(currentYear)

  const {
    data: overview,
    isLoading: isOverviewLoading,
    isFetching: isOverviewFetching,
    isError: isOverviewError,
    error: overviewError,
    refetch: refetchOverview,
  } = usePeriodLockOverview(periodLockYear)

  const periodLockRows = overview?.Rows ?? []
  const periodLockYearList = useMemo(
    () => buildSafeYearList(overview, periodLockYear),
    [overview, periodLockYear],
  )
  const fiscalStartYmd = overview?.FiscalStartYmd ?? 19000101
  const fiscalStartPeriodYm = overview?.FiscalStartPeriodYm ?? `${periodLockYear}01`
  const currentLockedPeriodYm = overview?.CurrentLockedPeriodYm ?? ""
  const currentLockedPeriodLabel =
    overview?.CurrentLockedPeriodLabel || t("PERIOD_LOCK_NONE", "Chưa khóa kỳ nào1")

  const periodLockLoading = isOverviewLoading || isOverviewFetching

  const overviewErrorNotifiedRef = useRef(false)
  useEffect(() => {
    if (isOverviewError && overviewError && !overviewErrorNotifiedRef.current) {
      overviewErrorNotifiedRef.current = true
      notify(
        getErrorMessage(
          overviewError,
          t("PERIOD_LOCK_LOAD_ERROR", "Không tải được dữ liệu khóa sổ"),
        ),
        "warning",
        3000,
      )
    }

    if (!isOverviewError) {
      overviewErrorNotifiedRef.current = false
    }
  }, [isOverviewError, overviewError, t])

  const handleSettingsSaveError = useCallback(
    (error: unknown) => {
      notify(
        getErrorMessage(
          error,
          t("PERIOD_LOCK_SETTING_SAVE_ERROR", "Không lưu được cài đặt khóa sổ"),
        ),
        "warning",
        2500,
      )
    },
    [t],
  )

  const {
    selectedStepCodes,
    selectedCogsTransferRules,
    profitLossBalanceMethod,
    setSelectedCogsTransferRules,
    setProfitLossBalanceMethod,
    toggleSelectedStep,
    settingsQueryError,
  } = usePeriodLockOptions(handleSettingsSaveError)

  const settingsErrorNotifiedRef = useRef(false)
  useEffect(() => {
    if (settingsQueryError && !settingsErrorNotifiedRef.current) {
      settingsErrorNotifiedRef.current = true
      notify(
        getErrorMessage(
          settingsQueryError,
          t("PERIOD_LOCK_SETTING_LOAD_ERROR", "Không tải được cài đặt khóa sổ đã lưu"),
        ),
        "warning",
        2500,
      )
    }

    if (!settingsQueryError) {
      settingsErrorNotifiedRef.current = false
    }
  }, [settingsQueryError, t])

  /** Có hiển thị popup progress hay không. */
  const [periodLockProgressVisible, setPeriodLockProgressVisible] = useState<boolean>(false)

  /** Dữ liệu progress hiện tại của job khóa/mở sổ. */
  const [periodLockProgress, setPeriodLockProgress] = useState<PeriodLockProgress | null>(null)

  /** Có hiển thị popup chọn thao tác kỳ hay không. */
  const [periodActionPopupVisible, setPeriodActionPopupVisible] = useState<boolean>(false)

  /** Dòng kỳ user đang thao tác. */
  const [periodActionTargetRow, setPeriodActionTargetRow] = useState<PeriodLockRow | null>(null)

  /** Key hành động đang được chọn trong popup thao tác kỳ. */
  const [selectedPeriodActionKey, setSelectedPeriodActionKey] = useState<string>("")

  /** Có chọn bước TSCĐ / CP trả trước hay không. */
  const isFaPrepaidSelected = selectedStepCodes.includes("FA_PREPAID_LOCK")

  /** Có chọn bước tổng hợp giá vốn hay không. */
  const isCogsSummarySelected = selectedStepCodes.includes("COGS_SUMMARY")

  /** Có chọn bước báo cáo lãi lỗ hay không. */
  const isProfitLossSelected = selectedStepCodes.includes("PROFIT_LOSS_REPORT")

  /** Text tóm tắt các option đang chọn để hiển thị trong confirm. */
  const selectedOptionSummary = useMemo(() => {
    const parts: string[] = []

    if (isFaPrepaidSelected) {
      parts.push(t("PERIOD_LOCK_FA_PREPAID", "Khóa TSCĐ / CP trả trước"))
    }

    if (isCogsSummarySelected) {
      const ruleNames = COGS_TRANSFER_RULE_DEFINITIONS
        .filter((rule) => rule.MethodCode === selectedCogsTransferRules)
        .map((rule) => t(rule.MethodNameKey, rule.MethodName))

      parts.push(
        `${t("PERIOD_LOCK_COGS_SUMMARY_SHORT", "Tổng hợp giá vốn")}: ${
          ruleNames.join(", ") || t("PERIOD_LOCK_NO_TRANSFER_RULE", "chưa chọn cách chuyển")
        }`,
      )
    }

    if (isProfitLossSelected) {
      const method = PROFIT_LOSS_BALANCE_METHOD_DEFINITIONS.find(
        (item) => item.MethodCode === profitLossBalanceMethod,
      )
      const methodName = method ? t(method.MethodNameKey, method.MethodName) : ""

      parts.push(`${t("PERIOD_LOCK_PROFIT_LOSS_SHORT", "Báo cáo lãi lỗ")}: ${methodName}`)
    }

    return parts.join("; ")
  }, [
    isCogsSummarySelected,
    isFaPrepaidSelected,
    isProfitLossSelected,
    profitLossBalanceMethod,
    selectedCogsTransferRules,
    t,
  ])

  /**
   * Kỳ có dữ liệu khóa gần nhất.
   * Ưu tiên lấy max giữa:
   * - CurrentLockedPeriodYm backend trả về, ví dụ đã khóa tới 08/2026.
   * - Kỳ mới nhất trong grid còn step DONE, dùng cho trường hợp mở một phần làm month status thành PARTIAL.
   */
  const latestUnlockablePeriodYm = useMemo(() => {
    const latestRowPeriodYm = getLatestUnlockablePeriodYm(periodLockRows)

    if (!currentLockedPeriodYm) return latestRowPeriodYm
    if (!latestRowPeriodYm) return currentLockedPeriodYm

    return getPeriodMonthIndex(currentLockedPeriodYm) >= getPeriodMonthIndex(latestRowPeriodYm)
      ? currentLockedPeriodYm
      : latestRowPeriodYm
  }, [currentLockedPeriodYm, periodLockRows])

  /** Đổi năm xem dữ liệu — hook tự gọi API theo năm mới. */
  const handleChangeYear = useCallback((nextYear: number) => {
    setPeriodLockYear(nextYear)
  }, [])

  /** Tải lại overview năm hiện tại. */
  const handleReload = useCallback(() => {
    void refetchOverview()
  }, [refetchOverview])

  /** Chọn/bỏ chọn một rule giá vốn. */
  // const toggleSelectedCogsTransferRule = useCallback(
  //   (ruleCode: CogsTransferRuleCode, checked: boolean) => {
  //     setSelectedCogsTransferRules((prev) => {
  //       if (checked) {
  //         if (prev.includes(ruleCode)) return prev

  //         return [...prev, ruleCode].sort((a, b) => {
  //           const ruleA = COGS_TRANSFER_RULE_DEFINITIONS.find((rule) => rule.MethodCode === a)
  //           const ruleB = COGS_TRANSFER_RULE_DEFINITIONS.find((rule) => rule.MethodCode === b)

  //           return Number(ruleA?.SortOrder ?? 0) - Number(ruleB?.SortOrder ?? 0)
  //         })
  //       }

  //       return prev.filter((item) => item !== ruleCode)
  //     })
  //   },
  //   [],
  // )

  /** Kiểm tra dòng có thể khóa đến đây không. Backend vẫn quyết định kỳ bắt đầu thật. */
  const canStartLockToRow = useCallback(
    (row: PeriodLockRow, stepCodes: PeriodLockStepCode[] = selectedStepCodes) => {
      if (stepCodes.length === 0) return false
      if (row.Status === "PROCESSING") return false
      if (isRowDoneForSelectedSteps(row, stepCodes)) return false

      // Nếu đã có kỳ khóa hiện tại, chỉ cho khóa những kỳ sau kỳ khóa hiện tại.
      // Trường hợp mở một phần rồi khóa lại, currentLockedPeriodYm thường đã lùi về kỳ trước,
      // nên kỳ PARTIAL vẫn được phép khóa tiếp theo đúng stepCodes trong popup thao tác.
      if (currentLockedPeriodYm) {
        return getPeriodMonthIndex(row.PeriodYm) > getPeriodMonthIndex(currentLockedPeriodYm)
      }

      // Nếu chưa khóa kỳ nào, cho khóa từ kỳ đầu kỳ kế toán trở đi.
      return getPeriodMonthIndex(row.PeriodYm) >= getPeriodMonthIndex(fiscalStartPeriodYm)
    },
    [currentLockedPeriodYm, fiscalStartPeriodYm, selectedStepCodes],
  )

  const watchPeriodLockProgressByPolling = useCallback(
    async (jobId: string) => {
      const progress = await pollPeriodLockProgress(
        jobId,
        setPeriodLockProgress,
        t("PERIOD_LOCK_PROGRESS_TIMEOUT", "Quá thời gian theo dõi tiến độ job"),
      )

      if (progress.Status === "ERROR") {
        throw new Error(progress.Message || t("PERIOD_LOCK_FAILED", "Xử lý khóa sổ thất bại"))
      }

      return progress
    },
    [t],
  )

  /** Đóng popup tiến độ khi job không còn RUNNING; tải lại grid sau khi đóng. */
  const handlePeriodLockProgressHiding = useCallback(() => {
    if (periodLockProgress?.Status === "RUNNING") return
    setPeriodLockProgressVisible(false)
    void refetchOverview()
  }, [periodLockProgress?.Status, refetchOverview])

  /** Bắt đầu khóa sổ đến dòng kỳ được chọn. Có thể truyền stepCodes riêng từ popup thao tác kỳ. */
  const handleStartLock = useCallback(
    async (
      targetRow: PeriodLockRow,
      overrideStepCodes?: PeriodLockStepCode[],
      overrideFromPeriodYm?: string,
      overrideToPeriodYm?: string,
    ) => {
      const isPopupStepAction = Boolean(overrideStepCodes && overrideStepCodes.length > 0)
      const requestedLockStepCodes = overrideStepCodes && overrideStepCodes.length > 0 ? overrideStepCodes : selectedStepCodes
      const expandedLockStepCodes = isPopupStepAction
        ? expandLockStepCodesToTarget(requestedLockStepCodes)
        : requestedLockStepCodes
      const stepsToRun = isPopupStepAction
        ? expandedLockStepCodes.filter((stepCode) => selectedStepCodes.includes(stepCode))
        : expandedLockStepCodes
      const requestFromPeriodYm = overrideFromPeriodYm ?? ""
      const requestToPeriodYm = overrideToPeriodYm ?? targetRow.PeriodYm

      if (stepsToRun.length === 0) {
        notify(t("PERIOD_LOCK_SELECT_STEP_WARNING", "Vui lòng chọn ít nhất 1 bước cần thực hiện"), "warning", 2500)
        return
      }

      if (stepsToRun.includes("COGS_SUMMARY") && !selectedCogsTransferRules) {
        notify(
          t(
            "PERIOD_LOCK_SELECT_COGS_RULE_WARNING",
            "Vui lòng chọn ít nhất 1 cách tự động chuyển dữ liệu giá vốn",
          ),
          "warning",
          2500,
        )
        return
      }

      if (stepsToRun.includes("PROFIT_LOSS_REPORT") && !profitLossBalanceMethod) {
        notify(t("PERIOD_LOCK_SELECT_PL_METHOD_WARNING", "Vui lòng chọn cách tính cho báo cáo lãi lỗ"), "warning", 2500)
        return
      }

      if (targetRow.Status === "PROCESSING" || (!isPopupStepAction && !canStartLockToRow(targetRow, stepsToRun))) {
        notify(t("PERIOD_LOCK_TARGET_NOT_VALID", "Kỳ được chọn không hợp lệ để khóa sổ"), "warning", 2500)
        return
      }

      const targetStepCode = isPopupStepAction
        ? (requestedLockStepCodes[0] as PeriodLockStepCode)
        : getTargetLockStepCode(stepsToRun)
      const targetStepName = getStepDisplayName(targetStepCode)
      const stepNames = stepsToRun.map(getStepDisplayName).join(", ")
      const confirmMessage =
        `${t("PERIOD_LOCK_CONFIRM_TO_TARGET", "Bạn có muốn khóa sổ đến tháng")} ${getPeriodLabel(requestToPeriodYm)}?\n\n` +
        `${t("PERIOD_LOCK_SELECTED_STEPS", "Bước xử lý")}: ${stepNames}`

      const confirmResult = await confirm(confirmMessage, t("PERIOD_LOCK_CONFIRM_TITLE", "Xác nhận xử lý khóa sổ"))
      if (!confirmResult) return

      const estimatedFromPeriodYm =
        requestFromPeriodYm ||
        (isPopupStepAction && targetRow.Status === "PARTIAL"
          ? targetRow.PeriodYm
          : getEstimatedLockFromPeriodYm(currentLockedPeriodYm, fiscalStartPeriodYm))
      const totalSteps = calculatePendingLockTotalSteps(
        periodLockRows,
        estimatedFromPeriodYm,
        requestToPeriodYm,
        stepsToRun,
      )

      setPeriodLockProgressVisible(true)
      setPeriodLockProgress({
        JobId: "",
        Percent: 0,
        TotalSteps: totalSteps,
        DoneSteps: 0,
        CurrentPeriodYm: estimatedFromPeriodYm,
        CurrentPeriodLabel: getPeriodLabel(estimatedFromPeriodYm),
        CurrentStepCode: targetStepCode,
        CurrentStepName: targetStepName,
        TargetStepCode: targetStepCode,
        TargetStepName: targetStepName,
        Message: t("PERIOD_LOCK_PREPARING", "Đang chuẩn bị xử lý..."),
        Status: "RUNNING",
      })

      try {
        const startResponse = await startPeriodLock({
          Year: periodLockYear,
          FromPeriodYm: requestFromPeriodYm, // Rỗng: backend tự tính. Có giá trị: dùng cho thao tác khóa lại một phần.
          ToPeriodYm: requestToPeriodYm,
          Steps: stepsToRun,
          TargetStepCode: isPopupStepAction ? requestedLockStepCodes[0] : undefined,
          TargetStepCodes: isPopupStepAction ? requestedLockStepCodes : undefined,
          Options: {
            CogsSummary: {
              TransferRules: selectedCogsTransferRules,
            },
            ProfitLossReport: {
              BalanceMethod: profitLossBalanceMethod,
            },
          },
        })

        const jobId = startResponse.data.JobId

        if (!jobId) {
          throw new Error(t("PERIOD_LOCK_JOB_ID_EMPTY", "API không trả về JobId"))
        }

        setPeriodLockProgress((prev) =>
          prev
            ? {
                ...prev,
                JobId: jobId,
                TotalSteps: startResponse.data.TotalSteps ?? prev.TotalSteps,
                CurrentPeriodYm: startResponse.data.FromPeriodYm ?? prev.CurrentPeriodYm,
                CurrentPeriodLabel: getPeriodLabel(startResponse.data.FromPeriodYm ?? prev.CurrentPeriodYm),
                TargetStepCode: (startResponse.data.TargetStepCode as PeriodLockStepCode) || prev.TargetStepCode,
                TargetStepName: startResponse.data.TargetStepName || prev.TargetStepName,
                CurrentStepCode: (startResponse.data.TargetStepCode as PeriodLockStepCode) || prev.CurrentStepCode,
                CurrentStepName: startResponse.data.TargetStepName || prev.CurrentStepName,
                Message: t("PERIOD_LOCK_STARTING", "Đang bắt đầu xử lý..."),
              }
            : prev,
        )

        await watchPeriodLockProgressByPolling(jobId)

        setPeriodLockProgress((prev) =>
          prev
            ? {
                ...prev,
                Percent: 100,
                DoneSteps: prev.TotalSteps,
                Message: t("PERIOD_LOCK_DONE_MESSAGE", "Xử lý hoàn tất"),
                Status: "DONE",
              }
            : prev,
        )

        notify(t("PERIOD_LOCK_DONE_MESSAGE", "Xử lý hoàn tất"), "success", 2500)
      } catch (error) {
        const errorMessage = getErrorMessage(error, t("PERIOD_LOCK_FAILED", "Xử lý khóa sổ thất bại"))

        setPeriodLockProgress((prev) =>
          prev
            ? {
                ...prev,
                Status: "ERROR",
                Message: errorMessage,
              }
            : {
                JobId: "",
                Percent: 0,
                TotalSteps: 0,
                DoneSteps: 0,
                CurrentPeriodYm: "",
                CurrentPeriodLabel: "-",
                CurrentStepCode: "",
                CurrentStepName: "-",
                Message: errorMessage,
                Status: "ERROR",
              },
        )

        notify(errorMessage, "error", 3000)
      }
    },
    [
      canStartLockToRow,
      currentLockedPeriodYm,
      fiscalStartPeriodYm,
      periodLockRows,
      periodLockYear,
      profitLossBalanceMethod,
      selectedCogsTransferRules,
      selectedOptionSummary,
      selectedStepCodes,
      t,
      watchPeriodLockProgressByPolling,
    ],
  )

  /** Bắt đầu mở sổ từ kỳ được chọn đến kỳ đang khóa hiện tại. */
  const handleStartUnlock = useCallback(
    async (targetRow: PeriodLockRow, targetStepCodes: PeriodLockStepCode[], overrideToPeriodYm?: string) => {
      const requestToPeriodYm = overrideToPeriodYm || latestUnlockablePeriodYm || currentLockedPeriodYm || targetRow.PeriodYm

      if (!latestUnlockablePeriodYm) {
        notify(t("PERIOD_UNLOCK_NO_LOCKED_PERIOD", "Chưa có kỳ nào được khóa để mở sổ"), "warning", 2500)
        return
      }

      if (getPeriodMonthIndex(targetRow.PeriodYm) > getPeriodMonthIndex(latestUnlockablePeriodYm)) {
        notify(
          `${t("PERIOD_UNLOCK_ONLY_TO_LATEST_LOCKED", "Chỉ được mở sổ từ kỳ khóa gần nhất")} ${getPeriodLabel(latestUnlockablePeriodYm)} ${t("PERIOD_UNLOCK_BACKWARD_SUFFIX", "trở về trước")}.`,
          "warning",
          3000,
        )
        return
      }

      if (targetRow.Status !== "PARTIAL" && !canUnlockFromRow(targetRow, latestUnlockablePeriodYm)) {
        notify(t("PERIOD_UNLOCK_TARGET_NOT_VALID", "Kỳ được chọn không hợp lệ để mở sổ"), "warning", 2500)
        return
      }

      if (!targetStepCodes || targetStepCodes.length === 0) {
        notify(t("PERIOD_UNLOCK_SELECT_STEP_WARNING", "Vui lòng chọn bước cần mở sổ"), "warning", 2500)
        return
      }

      const requestedStepCode = targetStepCodes[0] as PeriodLockStepCode
      const expandedTargetStepCodes = expandUnlockStepCodesToTarget(targetStepCodes)
      const firstUnlockStepCode = expandedTargetStepCodes[0] as PeriodLockStepCode
      const stepNames = expandedTargetStepCodes.map(getStepDisplayName).join(", ")
      const confirmMessage =
        `${t("PERIOD_UNLOCK_CONFIRM_FROM", "Bạn có muốn mở sổ từ tháng")} ${targetRow.PeriodLabel} ${t(
          "PERIOD_UNLOCK_CONFIRM_TO_CURRENT_LOCKED",
          "đến kỳ đã khóa hiện tại",
        )} ${getPeriodLabel(requestToPeriodYm)}?\n\n` +
        `${t("PERIOD_UNLOCK_SELECTED_STEPS", "Bước mở")}: ${stepNames}`

      const confirmResult = await confirm(confirmMessage, t("PERIOD_UNLOCK_CONFIRM_TITLE", "Xác nhận mở sổ"))
      if (!confirmResult) return

      const totalMonths = getPeriodMonthCountInclusive(targetRow.PeriodYm, requestToPeriodYm)
      const totalSteps = totalMonths * Math.max(expandedTargetStepCodes.length, 1)

      setPeriodLockProgressVisible(true)
      setPeriodLockProgress({
        JobId: "",
        Percent: 0,
        TotalSteps: totalSteps,
        DoneSteps: 0,
        CurrentPeriodYm: requestToPeriodYm,
        CurrentPeriodLabel: getPeriodLabel(requestToPeriodYm),
        CurrentStepCode: firstUnlockStepCode,
        CurrentStepName: getStepDisplayName(firstUnlockStepCode),
        Message: t("PERIOD_UNLOCK_PREPARING", "Đang chuẩn bị mở sổ..."),
        Status: "RUNNING",
      })

      try {
        const unlockResponse = await startPeriodUnlock({
          Year: periodLockYear,
          FromPeriodYm: targetRow.PeriodYm,
          ToPeriodYm: requestToPeriodYm,
          // Chỉ gửi bước user chọn; backend tự expand 3 -> 2 -> 1.
          TargetStepCode: requestedStepCode,
          Reason: "",
        })

        const jobId = unlockResponse.data.JobId

        if (!jobId) {
          throw new Error(t("PERIOD_LOCK_JOB_ID_EMPTY", "API không trả về JobId"))
        }

        setPeriodLockProgress((prev) =>
          prev
            ? {
                ...prev,
                JobId: jobId,
                Message: t("PERIOD_UNLOCK_STARTING", "Đang bắt đầu mở sổ..."),
              }
            : prev,
        )

        await watchPeriodLockProgressByPolling(jobId)

        setPeriodLockProgress((prev) =>
          prev
            ? {
                ...prev,
                Percent: 100,
                DoneSteps: prev.TotalSteps,
                Message: t("PERIOD_UNLOCK_DONE_MESSAGE", "Mở sổ hoàn tất"),
                Status: "DONE",
              }
            : prev,
        )

        notify(t("PERIOD_UNLOCK_DONE_MESSAGE", "Mở sổ hoàn tất"), "success", 2500)
      } catch (error) {
        const errorMessage = getErrorMessage(error, t("PERIOD_UNLOCK_FAILED", "Mở sổ thất bại"))

        setPeriodLockProgress((prev) =>
          prev
            ? {
                ...prev,
                Status: "ERROR",
                Message: errorMessage,
              }
            : {
                JobId: "",
                Percent: 0,
                TotalSteps: 0,
                DoneSteps: 0,
                CurrentPeriodYm: "",
                CurrentPeriodLabel: "-",
                CurrentStepCode: "",
                CurrentStepName: "-",
                Message: errorMessage,
                Status: "ERROR",
              },
        )

        notify(errorMessage, "error", 3000)
      }
    },
    [
      currentLockedPeriodYm,
      latestUnlockablePeriodYm,
      periodLockYear,
      t,
      watchPeriodLockProgressByPolling,
    ],
  )

  /** Danh sách hành động hợp lệ trong popup thao tác kỳ. */
  const periodActionOptions = useMemo(
    () => (periodActionTargetRow ? buildPeriodActionOptions(periodActionTargetRow, t, selectedStepCodes) : []),
    [periodActionTargetRow, selectedStepCodes, t],
  )

  /** Hành động đang chọn trong popup thao tác kỳ. */
  const selectedPeriodAction = useMemo(
    () => periodActionOptions.find((action) => action.Key === selectedPeriodActionKey) ?? null,
    [periodActionOptions, selectedPeriodActionKey],
  )

  /** Phạm vi xử lý dự kiến của hành động đang chọn. */
  const selectedPeriodActionRangeText = useMemo(() => {
    if (!periodActionTargetRow || !selectedPeriodAction) return "-"

    const toPeriodYm = getPeriodActionRangeToPeriodYm(
      periodLockRows,
      periodActionTargetRow,
      selectedPeriodAction,
      t,
      latestUnlockablePeriodYm,
    )

    return `${periodActionTargetRow.PeriodLabel} → ${getPeriodLabel(toPeriodYm)}`
  }, [latestUnlockablePeriodYm, periodActionTargetRow, periodLockRows, selectedPeriodAction, t])

  /** Mở popup thao tác kỳ cho dòng được chọn. */
  const openPeriodActionPopup = useCallback(
    (targetRow: PeriodLockRow) => {
      const freshRow = periodLockRows.find((row) => row.PeriodYm === targetRow.PeriodYm) ?? targetRow
      const actions = buildPeriodActionOptions(freshRow, t, selectedStepCodes)

      if (actions.length === 0) {
        notify(t("PERIOD_ACTION_NO_AVAILABLE", "Kỳ này chưa có thao tác phù hợp"), "warning", 2500)
        return
      }

      setPeriodActionTargetRow(freshRow)
      setSelectedPeriodActionKey(actions[0].Key)
      setPeriodActionPopupVisible(true)
    },
    [periodLockRows, selectedStepCodes, t],
  )

  /** Thực hiện hành động user đã chọn trong popup thao tác kỳ. */
  const handleExecutePeriodAction = useCallback(() => {
    if (!periodActionTargetRow) return

    const selectedAction = selectedPeriodAction

    if (!selectedAction) {
      notify(t("PERIOD_ACTION_SELECT_REQUIRED", "Vui lòng chọn thao tác cần thực hiện"), "warning", 2500)
      return
    }

    const rangeToPeriodYm = getPeriodActionRangeToPeriodYm(
      periodLockRows,
      periodActionTargetRow,
      selectedAction,
      t,
      latestUnlockablePeriodYm,
    )

    if (selectedAction.ActionType === "UNLOCK") {
      if (!latestUnlockablePeriodYm) {
        notify(t("PERIOD_UNLOCK_NO_LOCKED_PERIOD", "Chưa có kỳ nào được khóa để mở sổ"), "warning", 2500)
        return
      }

      if (getPeriodMonthIndex(periodActionTargetRow.PeriodYm) > getPeriodMonthIndex(latestUnlockablePeriodYm)) {
        notify(
          `${t("PERIOD_UNLOCK_ONLY_TO_LATEST_LOCKED", "Chỉ được mở sổ từ kỳ khóa gần nhất")} ${getPeriodLabel(latestUnlockablePeriodYm)} ${t("PERIOD_UNLOCK_BACKWARD_SUFFIX", "trở về trước")}.`,
          "warning",
          3000,
        )
        return
      }
    }

    setPeriodActionPopupVisible(false)

    if (selectedAction.ActionType === "LOCK") {
      /*
        Không gửi FromPeriodYm cố định cho khóa từng bước.
        Backend sẽ tự tính kỳ bắt đầu thật sự theo từng step trong DB.

        Ví dụ:
        - Bước 1 đã khóa tới 08/2026
        - Bước 2 mới khóa tới 05/2026
        - User chọn khóa tới bước 2
        => Backend phải chạy từ 06/2026 -> 08/2026, không chạy riêng kỳ đang bấm.
      */
      void handleStartLock(
        periodActionTargetRow,
        selectedAction.StepCodes,
        undefined,
        rangeToPeriodYm,
      )
      return
    }

    void handleStartUnlock(periodActionTargetRow, selectedAction.StepCodes, rangeToPeriodYm)
  }, [
    handleStartLock,
    handleStartUnlock,
    latestUnlockablePeriodYm,
    periodActionTargetRow,
    periodLockRows,
    selectedPeriodAction,
    t,
  ])

  /** Render cột thao tác. Một nút chung mở popup sinh hành động hợp lệ theo trạng thái 3 bước. */
  const renderPeriodLockActionCell = useCallback(
    (cell: PeriodLockCellInfo) => {
      if (fiscalStartYmd === 19000101) {
        return ""
      }

      const freshRow = periodLockRows.find((row) => row.PeriodYm === cell.data.PeriodYm) ?? cell.data
      const isBeforeFiscalStart = freshRow.PeriodYm < fiscalStartYmd.toString().substring(0, 6)
      const actions = buildPeriodActionOptions(freshRow, t, selectedStepCodes)

      return (
        <Button
          text={t("ACTION", "Thao tác")}
          type="default"
          stylingMode="contained"
          elementAttr={{ class: "am-grid-row-btn" }}
          disabled={isBeforeFiscalStart || actions.length === 0}
          onClick={() => {
            openPeriodActionPopup(freshRow)
          }}
        />
      )
    },
    [fiscalStartYmd, openPeriodActionPopup, periodLockRows, selectedStepCodes, t],
  )

  /** Render trạng thái tổng tháng. */
  const renderPeriodLockStatusCell = useCallback(
    (cell: PeriodLockCellInfo) => {
      const status = cell.data.Status

      if (status === "LOCKED") {
        return (
          <span className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
            {t("PERIOD_LOCK_STATUS_LOCKED", "Đã khóa")}
          </span>
        )
      }

      if (status === "PARTIAL") {
        return (
          <span className="rounded bg-yellow-100 px-2 py-1 text-xs font-semibold text-yellow-700">
            {t("PERIOD_LOCK_STATUS_PARTIAL", "Một phần")}
          </span>
        )
      }

      if (status === "PROCESSING") {
        return (
          <span className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            {t("PERIOD_LOCK_STATUS_PROCESSING", "Đang xử lý")}
          </span>
        )
      }

      if (status === "ERROR") {
        return (
          <span className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
            {t("PERIOD_LOCK_STATUS_ERROR", "Lỗi")}
          </span>
        )
      }

      return (
        <span className="rounded bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-700">
          {t("PERIOD_LOCK_STATUS_OPEN", "Chưa xử lý")}
        </span>
      )
    },
    [t],
  )

  /** Format various date inputs to dd/MM/yyyy HH:mm:ss for display */
  function formatDateTimeToDDMMYYYYHHMMSS(value: unknown) {
    if (!value) return ""

    // yyyyMMdd -> treat as midnight
    if (typeof value === "string" && /^\d{8}$/.test(value)) {
      const year = value.substring(0, 4)
      const month = value.substring(4, 6)
      const day = value.substring(6, 8)
      return `${day}/${month}/${year} 00:00:00`
    }

    // timestamp or ISO string
    const date = typeof value === "number" ? new Date(value) : new Date(String(value))
    if (Number.isNaN(date.getTime())) return String(value)

    const hh = pad2(date.getHours())
    const mm = pad2(date.getMinutes())
    const ss = pad2(date.getSeconds())

    return `${pad2(date.getDate())}/${pad2(date.getMonth() + 1)}/${date.getFullYear()} ${hh}:${mm}:${ss}`
  }

  /** Render LockedAt as dd/MM/yyyy HH:mm:ss */
  const renderLockedAtCell = useCallback((cell: PeriodLockCellInfo) => {
    const val = cell.data.LockedAt
    if (!val) return <span className="text-sm text-gray-500">-</span>

    return (
      <span className="text-sm text-gray-700">{formatDateTimeToDDMMYYYYHHMMSS(val)}</span>
    )
  }, [])

  /** Render trạng thái từng bước trong grid. */
  const renderPeriodLockStepCell = useCallback(
    (cell: PeriodLockCellInfo, stepCode: PeriodLockStepCode) => {
      const step = getStepByCode(cell.data, stepCode)

      if (!step) {
        return <span className="text-xs text-gray-400">-</span>
      }

      if (step.Status === "DONE") {
        return (
          <span title={step.Message ?? ""} className="rounded bg-green-100 px-2 py-1 text-xs font-semibold text-green-700">
            {t("PERIOD_LOCK_STEP_DONE", "Hoàn tất")}
          </span>
        )
      }

      if (step.Status === "PROCESSING") {
        return (
          <span title={step.Message ?? ""} className="rounded bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-700">
            {t("PERIOD_LOCK_STEP_PROCESSING", "Đang chạy")}
          </span>
        )
      }

      if (step.Status === "ERROR") {
        return (
          <span title={step.Message ?? ""} className="rounded bg-red-100 px-2 py-1 text-xs font-semibold text-red-700">
            {t("PERIOD_LOCK_STEP_ERROR", "Lỗi")}
          </span>
        )
      }

      return (
        <span title={step.Message ?? ""} className="">
          -{/* {t("PERIOD_LOCK_STEP_OPEN", "Chưa chạy")} */}
        </span>
      )
    },
    [t],
  )

  /** Cell render cho bước 1. */
  const renderFaPrepaidStepCell = useCallback(
    (cell: PeriodLockCellInfo) => renderPeriodLockStepCell(cell, "FA_PREPAID_LOCK"),
    [renderPeriodLockStepCell],
  )

  /** Cell render cho bước 2. */
  const renderCogsSummaryStepCell = useCallback(
    (cell: PeriodLockCellInfo) => renderPeriodLockStepCell(cell, "COGS_SUMMARY"),
    [renderPeriodLockStepCell],
  )

  /** Cell render cho bước 3. */
  const renderProfitLossStepCell = useCallback(
    (cell: PeriodLockCellInfo) => renderPeriodLockStepCell(cell, "PROFIT_LOSS_REPORT"),
    [renderPeriodLockStepCell],
  )

  return (
    <div className="p-0">
      <LoadPanel
                shadingColor="rgba(0, 0, 0, 0.4)"
                visible={periodLockLoading}
                showIndicator={true}
                shading={true}
                showPane={true}
              />
              
      <PeriodLockOptionPanel
        selectedStepCodes={selectedStepCodes}
        selectedCogsTransferRules={selectedCogsTransferRules}
        profitLossBalanceMethod={profitLossBalanceMethod}
        periodLockYearList={periodLockYearList}
        periodLockYear={periodLockYear}
        currentLockedPeriodLabel={currentLockedPeriodLabel}
        onChangeYear={handleChangeYear}
        onReload={handleReload}
        onToggleStep={toggleSelectedStep}
        onToggleCogsTransferRule={setSelectedCogsTransferRules}
        onChangeProfitLossBalanceMethod={setProfitLossBalanceMethod}
        t={t}
      />

      <div className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm">
        <div className="mb-3 flex items-center">
          <div>
            <div className="text-base font-semibold text-gray-900">
              {t("PERIOD_LOCK_LIST_TITLE", "Danh sách kỳ kế toán")}
            </div>
          </div>
        </div>

        <DataGrid
          key={periodLockYear}
          dataSource={periodLockRows}
          keyExpr="PeriodYm"
          showBorders={true}
          repaintChangesOnly={true}
          // height={490}
          hoverStateEnabled={true}
          focusedRowEnabled={false}
          columnAutoWidth={false}
          rowAlternationEnabled={true}
          noDataText={t("NO_DATA", "Không có dữ liệu")}
        >
          <Paging enabled={false} />

          <Column
            dataField="PeriodLabel"
            caption={t("PERIOD_MONTH", "Tháng")}
            width={110}
            alignment="center"
          />

          <Column
            caption={t("PERIOD_LOCK_FA_PREPAID_SHORT", "TSCĐ / CP trả trước")}
            width={170}
            alignment="center"
            allowSorting={false}
            calculateCellValue={(row: PeriodLockRow) => getStepStatusFromRow(row, "FA_PREPAID_LOCK")}
            cellRender={renderFaPrepaidStepCell}
          />

          <Column
            caption={t("PERIOD_LOCK_COGS_SUMMARY_SHORT", "Tổng hợp giá vốn")}
            width={170}
            alignment="center"
            allowSorting={false}
            calculateCellValue={(row: PeriodLockRow) => getStepStatusFromRow(row, "COGS_SUMMARY")}
            cellRender={renderCogsSummaryStepCell}
          />

          <Column
            caption={t("PERIOD_LOCK_PROFIT_LOSS_SHORT", "Báo cáo lãi lỗ")}
            width={150}
            alignment="center"
            allowSorting={false}
            calculateCellValue={(row: PeriodLockRow) => getStepStatusFromRow(row, "PROFIT_LOSS_REPORT")}
            cellRender={renderProfitLossStepCell}
          />

          <Column
            dataField="Status"
            caption={t("PERIOD_LOCK_MONTH_STATUS", "Trạng thái tháng")}
            width={150}
            alignment="center"
            cellRender={renderPeriodLockStatusCell}
          />

          <Column
            dataField="LockedAt"
            caption={t("PERIOD_LOCK_PROCESSED_AT", "Ngày xử lý")}
            width={170}
            alignment="center"
            cellRender={renderLockedAtCell}
          />

          <Column
            dataField="LockedBy"
            caption={t("PERIOD_LOCK_PROCESSED_BY", "Người xử lý")}
            width={130}
          />

          <Column
            dataField="Message"
            caption={t("NOTE", "Ghi chú")}
            minWidth={220}
          />

          <Column
            caption={t("ACTION", "Thao tác")}
            width={150}
            alignment="center"
            fixed={true}
            fixedPosition="right"
            allowSorting={false}
            allowFiltering={false}
            calculateCellValue={(row: PeriodLockRow) =>
              getPeriodActionAvailabilityKey(row, selectedStepCodes)
            }
            cellRender={renderPeriodLockActionCell}
          />
        </DataGrid>
      </div>

      <Popup
        visible={periodActionPopupVisible}
        title={
          periodActionTargetRow
            ? `${t("PERIOD_ACTION_POPUP_TITLE", "Thao tác kỳ")} ${periodActionTargetRow.PeriodLabel}`
            : t("PERIOD_ACTION_POPUP_TITLE", "Thao tác kỳ")
        }
        width={660}
        height="auto"
        showCloseButton={true}
        dragEnabled={false}
        hideOnOutsideClick={false}
        onHiding={() => {
          setPeriodActionPopupVisible(false)
        }}
      >
        <div className="p-4">
          <div className="mb-3 rounded bg-blue-50 p-3 text-sm text-blue-700">
            {t(
              "PERIOD_ACTION_NOTICE",
              "Khóa sổ chạy theo thứ tự bước 1 → bước 2 → bước 3. Mở sổ chạy ngược lại: bước 3 → bước 2 → bước 1.",
            )}
          </div>

          {periodActionTargetRow && (
            <div className="mb-4 rounded-xl border border-gray-200 bg-gray-50 p-3">
              <div className="mb-2 text-sm font-semibold text-gray-800">
                {t("PERIOD_ACTION_CURRENT_STATUS", "Trạng thái hiện tại")}
              </div>

              <div className="space-y-2">
                {PERIOD_LOCK_STEP_DEFINITIONS.map((step) => {
                  const status = getStepStatusFromRow(periodActionTargetRow, step.StepCode)

                  return (
                    <div key={step.StepCode} className="flex items-center justify-between gap-3 text-sm">
                      <span className="text-gray-700">
                        {step.StepOrder}. {t(step.StepCode, step.StepName)}
                      </span>
                      <span
                        className={`rounded px-2 py-1 text-xs font-semibold ${getStepStatusBadgeClass(status)}`}
                      >
                        {getStepStatusText(status, t)}
                      </span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          <div className="mb-2 text-sm font-semibold text-gray-800">
            {t("PERIOD_ACTION_SELECT_TITLE", "Bạn muốn thực hiện")}
          </div>

          <RadioGroup
            key={`period-action-${lang}`}
            dataSource={periodActionOptions}
            valueExpr="Key"
            displayExpr="Title"
            layout="vertical"
            value={selectedPeriodActionKey}
            onValueChanged={(e) => {
              setSelectedPeriodActionKey(String(e.value ?? ""))
            }}
          />

          {periodActionOptions.length > 0 && (
            <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-600">
              <div>
                {t("PERIOD_ACTION_RANGE", "Phạm vi xử lý")}: {selectedPeriodActionRangeText}
              </div>
              <div className="mt-1">{selectedPeriodAction?.Description ?? ""}</div>
            </div>
          )}

          <div className="mt-4 flex justify-end gap-2">
            <Button
              text={t("CANCEL", "Hủy")}
              stylingMode="outlined"
              onClick={() => {
                setPeriodActionPopupVisible(false)
              }}
            />

            <Button
              text={t("PERIOD_ACTION_CONFIRM_BUTTON", "Thực hiện")}
              type="default"
              stylingMode="contained"
              disabled={!selectedPeriodActionKey}
              onClick={handleExecutePeriodAction}
            />
          </div>
        </div>
      </Popup>

      <Popup
        visible={periodLockProgressVisible}
        // title={t("PERIOD_LOCK_PROGRESS_TITLE", "Tiến độ xử lý khóa/mở sổ")}
        title="Tiến độ xử lý khóa/mở sổ"
        width={560}
        height={300}
        showCloseButton={periodLockProgress?.Status !== "RUNNING"}
        dragEnabled={false}
        hideOnOutsideClick={false}
        onHiding={handlePeriodLockProgressHiding}
      >
        <div className="p-4">
          <div className="mb-2 text-sm font-medium text-gray-700">
            {periodLockProgress?.Message || t("PROCESSING", "Đang xử lý...")}
          </div>

          <ProgressBar
            min={0}
            max={100}
            value={periodLockProgress?.Percent ?? 0}
            showStatus={false}
          />

          <div className="mt-2 text-right text-sm font-semibold text-gray-700">
            {Math.round(periodLockProgress?.Percent ?? 0)}%
          </div>

          <div className="mt-3 rounded bg-gray-50 p-3 text-sm text-gray-600">
            {periodLockProgress?.TargetStepName ? (
              <div>
                {t("PERIOD_LOCK_TARGET_ACTION", "Thao tác")}: {" "}
                <span className="font-semibold text-gray-800">
                  {periodLockProgress.TargetStepName}
                </span>
              </div>
            ) : null}

            <div className={periodLockProgress?.TargetStepName ? "mt-1" : ""}>
              {t("PERIOD_LOCK_CURRENT_PERIOD", "Tháng đang xử lý")}: {" "}
              <span className="font-semibold text-gray-800">
                {periodLockProgress?.CurrentPeriodLabel || "-"}
              </span>
            </div>

            <div className="mt-1">
              {t("PERIOD_LOCK_CURRENT_STEP", "Bước đang xử lý")}: {" "}
              <span className="font-semibold text-gray-800">
                {periodLockProgress?.CurrentStepName || "-"}
              </span>
            </div>

            <div className="mt-1">
              {t("PERIOD_LOCK_STEP_PROGRESS", "Tiến độ bước")}: {" "}
              <span className="font-semibold text-gray-800">
                {periodLockProgress?.DoneSteps ?? 0} / {periodLockProgress?.TotalSteps ?? 0}
              </span>
            </div>
          </div>

          {periodLockProgress?.Status !== "RUNNING" && (
            <div className="mt-1 flex justify-end">
              <Button
                text={t("CLOSE", "Đóng")}
                type="default"
                onClick={() => setPeriodLockProgressVisible(false)}
              />
            </div>
          )}
        </div>
      </Popup>
    </div>
  )
}
