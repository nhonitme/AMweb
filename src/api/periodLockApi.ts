import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"
import { logApiError } from "./apiTypes"

/* =====================================================================================
   PERIOD LOCK API TYPES
   -------------------------------------------------------------------------------------
   Quy ước:
   - Backend DTO/API response dùng PascalCase: PeriodYm, JobId, CurrentStepName.
   - React page dùng camelCase cho state nội bộ nếu cần.
   - Không normalize nhiều kiểu tên như jobId/JobId/JOB_ID để tránh rối.
   ===================================================================================== */

/** Trạng thái tổng của một tháng khóa sổ. */
export type PeriodLockStatus = "LOCKED" | "OPEN" | "PARTIAL" | "PROCESSING" | "ERROR"

/** Trạng thái của job background dùng cho progress bar. */
export type PeriodLockJobStatus = "RUNNING" | "DONE" | "ERROR"

/** Trạng thái của từng bước xử lý trong tháng. */
export type PeriodLockStepStatus = "OPEN" | "PROCESSING" | "DONE" | "ERROR"

/** Mã 3 bước chính trong quy trình khóa sổ. */
export type PeriodLockStepCode =
  | "FA_PREPAID_LOCK"
  | "COGS_SUMMARY"
  | "PROFIT_LOSS_REPORT"

/** Mã các cách chuyển dữ liệu giá vốn ở bước tổng hợp giá vốn. */
export type CogsTransferRuleCode =
  | "154_TO_155"
  | "154_TO_155_TO_632"
  | "154_TO_632"

/** Cách tính bảng cân phục vụ báo cáo lãi lỗ. */
export type ProfitLossBalanceMethod =
  | "BALANCE_ACCOUNT"
  | "BALANCE_ACCOUNT_TWO_SIDE"

/** DTO một bước xử lý trong một kỳ. Backend trả về PascalCase. */
export type PeriodLockStep = {
  /** Mã bước, ví dụ FA_PREPAID_LOCK. */
  StepCode: PeriodLockStepCode

  /** Tên bước hiển thị, ví dụ Khóa TSCĐ / CP trả trước. */
  StepName: string

  /** Thứ tự bước trong quy trình, ví dụ 1, 2, 3. */
  StepOrder: number

  /** Trạng thái bước: OPEN, PROCESSING, DONE, ERROR. */
  Status: PeriodLockStepStatus

  /** Thời điểm bắt đầu xử lý bước, format yyyy-MM-dd HH:mm:ss nếu có. */
  StartedAt?: string | null

  /** Thời điểm hoàn tất hoặc lỗi của bước, format yyyy-MM-dd HH:mm:ss nếu có. */
  FinishedAt?: string | null

  /** Ghi chú hoặc thông báo lỗi của bước. */
  Message?: string | null
}

/** DTO một dòng tháng trên grid khóa sổ. Backend trả về PascalCase. */
export type PeriodLockRow = {
  /** Kỳ kế toán dạng yyyyMM, ví dụ 202606. Đây là keyExpr của DataGrid. */
  PeriodYm: string

  /** Nhãn kỳ hiển thị, ví dụ 06/2026. */
  PeriodLabel: string

  /** Ngày bắt đầu kỳ dạng yyyyMMdd. */
  FromYmd: string

  /** Ngày kết thúc kỳ dạng yyyyMMdd. */
  ToYmd: string

  /** Trạng thái tổng của tháng. */
  Status: PeriodLockStatus

  /** Thời điểm khóa hoặc xử lý gần nhất. */
  LockedAt?: string | null

  /** Người xử lý khóa sổ gần nhất. */
  LockedBy?: string | null

  /** Ghi chú hoặc thông báo lỗi cấp tháng. */
  Message?: string | null

  /** Danh sách 3 bước chính trong tháng. */
  Steps: PeriodLockStep[]
}

/** DTO overview cho toàn bộ màn hình khóa sổ. */
export type PeriodLockOverview = {
  /** Ngày đầu kỳ kế toán dạng yyyyMMdd, ví dụ 20230401. */
  FiscalStartYmd: number

  /** Kỳ đầu tiên được phép khóa sổ dạng yyyyMM, ví dụ 202304. */
  FiscalStartPeriodYm: string

  /** Danh sách năm hiển thị trên combobox. */
  YearList: number[]

  /** Kỳ đã khóa hiện tại của công ty dạng yyyyMM, ví dụ 202505. Rỗng nếu chưa khóa. */
  CurrentLockedPeriodYm: string

  /** Nhãn kỳ đã khóa hiện tại, ví dụ 05/2025 hoặc Chưa khóa kỳ nào. */
  CurrentLockedPeriodLabel: string

  /** Kỳ mới nhất đã DONE bước 1 - TSCĐ / CP trả trước. */
  FaPrepaidLockedPeriodYm?: string

  /** Kỳ mới nhất đã DONE bước 2 - Tổng hợp giá vốn. */
  CogsSummaryLockedPeriodYm?: string

  /** Kỳ mới nhất đã DONE bước 3 - Báo cáo lãi lỗ. */
  ProfitLossLockedPeriodYm?: string

  /** Kỳ mới nhất còn bất kỳ step DONE nào. */
  AnyStepLockedPeriodYm?: string

  /** Danh sách 12 tháng của năm đang xem. */
  Rows: PeriodLockRow[]
}

/** DTO progress job. */
export type PeriodLockProgress = {
  /** Mã job background. */
  JobId: string

  /** Phần trăm hoàn tất từ 0 đến 100. */
  Percent: number

  /** Tổng số task cần xử lý. */
  TotalSteps: number

  /** Số task đã xử lý xong. */
  DoneSteps: number

  /** Kỳ hiện tại đang xử lý dạng yyyyMM. */
  CurrentPeriodYm: string

  /** Nhãn kỳ hiện tại đang xử lý, ví dụ 06/2026. */
  CurrentPeriodLabel: string

  /** Mã bước hiện tại đang xử lý. */
  CurrentStepCode: PeriodLockStepCode | ""

  /** Tên bước hoặc task hiện tại đang xử lý. */
  CurrentStepName: string

  /** Mã bước đích user chọn khi tạo job. */
  TargetStepCode?: PeriodLockStepCode | ""

  /** Tên bước đích user chọn khi tạo job. */
  TargetStepName?: string

  /** Thông báo tiến độ hiện tại. */
  Message: string

  /** Trạng thái job: RUNNING, DONE, ERROR. */
  Status: PeriodLockJobStatus
}

/** Response khi tạo job khóa/mở sổ. */
export type StartPeriodJobResponse = {
  /** Mã job để frontend polling progress. */
  JobId: string

  /** Tổng task thực tế (chỉ bước chưa DONE). */
  TotalSteps?: number

  /** Kỳ bắt đầu thực tế backend resolve. */
  FromPeriodYm?: string

  /** Mã bước đích user chọn. */
  TargetStepCode?: PeriodLockStepCode | ""

  /** Tên bước đích hiển thị trên progress. */
  TargetStepName?: string
}

/** Payload tạo job khóa sổ. Backend tự tính lại FromPeriodYm thực tế. */
export type StartPeriodLockRequest = {
  /** Năm đang xem trên màn hình. */
  Year: number

  /** Kỳ bắt đầu dự kiến. Frontend truyền rỗng, backend tự tính lại. */
  FromPeriodYm: string

  /** Kỳ đích muốn khóa đến, dạng yyyyMM. */
  ToPeriodYm: string

  /** Danh sách bước chính cần chạy. */
  Steps: PeriodLockStepCode[]

  /** Bước đích muốn khóa tới khi thao tác từ popup từng bước. */
  TargetStepCode?: PeriodLockStepCode

  /** Danh sách bước tương thích popup. Backend sẽ hiểu là khóa tới bước lớn nhất trong danh sách. */
  TargetStepCodes?: PeriodLockStepCode[]

  /** Options chi tiết cho từng bước. */
  Options: {
    /** Options của bước tổng hợp giá vốn. */
    CogsSummary: {
      /** Danh sách cách chuyển dữ liệu giá vốn. */
      TransferRules: CogsTransferRuleCode
    }

    /** Options của bước báo cáo lãi lỗ. */
    ProfitLossReport: {
      /** Cách tính bảng cân. */
      BalanceMethod: ProfitLossBalanceMethod
    }
  }
}

/** Payload tạo job mở sổ. */
export type StartPeriodUnlockRequest = {
  /** Năm đang xem trên màn hình. */
  Year: number

  /** Kỳ bắt đầu mở sổ, dạng yyyyMM. */
  FromPeriodYm: string

  /** Kỳ kết thúc mở sổ, thường là kỳ đã khóa hiện tại, dạng yyyyMM. */
  ToPeriodYm: string

  /** Lý do mở sổ nếu có. */
  Reason?: string

  /** Bước đích muốn mở tới. Backend sẽ tự mở các bước phía sau trước. */
  TargetStepCode?: PeriodLockStepCode

  /** Danh sách bước tương thích popup cũ/mới. Backend sẽ hiểu là mở tới bước nhỏ nhất trong danh sách. */
  TargetStepCodes?: PeriodLockStepCode[]
}

/** Base URL của controller PeriodLock. */
const BASE_URL = `${API_BASE_URL}/period-lock`

/**
 * Lấy data thật từ response của BaseApiController.
 * Hỗ trợ wrapper: Data, data, Result, result, Payload, payload, Value, value.
 */
function getApiObjectPayload<T>(responseData: unknown): T {
  if (!responseData || typeof responseData !== "object") {
    return responseData as T
  }

  const obj = responseData as Record<string, unknown>

  return (
    obj.Data ??
    obj.Result ??
    obj.Payload ??
    obj.Value ??
    responseData
  ) as T
}

/** Kiểm tra HTTP status hợp lệ. */
function assertOkStatus(status: number, apiName: string) {
  if (status < 200 || status >= 300) {
    throw new Error(`${apiName} failed with HTTP status ${status}`)
  }
}

/** Lấy toàn bộ dữ liệu cần thiết để render màn hình theo năm đang xem. */
export async function getPeriodLockOverview(
  params: { year: number },
): Promise<{ data: PeriodLockOverview }> {
  try {
    const resp = await axios.get(`${BASE_URL}/overview`, {
      params: { ...params },
    })

    assertOkStatus(resp.status, "getPeriodLockOverview")

    const data = getApiObjectPayload<PeriodLockOverview>(resp.data)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in getPeriodLockOverview:", err)
    throw err
  }
}

/** Tạo job khóa sổ đến kỳ đích. Backend tự tính kỳ bắt đầu thực tế. */
export async function startPeriodLock(
  payload: StartPeriodLockRequest,
): Promise<{ data: StartPeriodJobResponse }> {
  try {
    const resp = await axios.post(`${BASE_URL}/start`, payload)

    assertOkStatus(resp.status, "startPeriodLock")

    const data = getApiObjectPayload<StartPeriodJobResponse>(resp.data)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in startPeriodLock:", err)
    throw err
  }
}

/** Tạo job mở sổ từ kỳ được chọn đến kỳ đang khóa hiện tại. */
export async function startPeriodUnlock(
  payload: StartPeriodUnlockRequest,
): Promise<{ data: StartPeriodJobResponse }> {
  try {
    const resp = await axios.post(`${BASE_URL}/unlock`, payload)

    assertOkStatus(resp.status, "startPeriodUnlock")

    const data = getApiObjectPayload<StartPeriodJobResponse>(resp.data)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in startPeriodUnlock:", err)
    throw err
  }
}

/** Lấy tiến độ job background. */
export async function getPeriodLockProgress(
  jobId: string,
): Promise<{ data: PeriodLockProgress }> {
  try {
    const resp = await axios.get(`${BASE_URL}/jobs/${jobId}/progress`)

    assertOkStatus(resp.status, "getPeriodLockProgress")

    const data = getApiObjectPayload<PeriodLockProgress>(resp.data)
    return { data }
  } catch (err: unknown) {
    logApiError("Error in getPeriodLockProgress:", err)
    throw err
  }
}
