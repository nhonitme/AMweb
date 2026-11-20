/**
 * Bước 1 — Khóa TSCĐ/CPTT tại G-K, gọi engine PeriodLock B-I thật.
 * Bố cục: Tổng quan → Nội dung khóa sổ → Tiến trình → Kết quả gần nhất.
 */

import { useMemo } from "react";
import Button from "devextreme-react/button";
import { confirm } from "devextreme/ui/dialog";
import { reloadProductionCosting, runProductionCostingStep1 } from "@/api/productionCostingApi";
import type {
  CostingStepHistoryItem,
  CostingStepRunStatus,
  PrerequisiteValidationStatus,
} from "../types/productionCostingTypes";
import { formatGkMessage, StepShell, type PanelCommonProps } from "./costingPanelShared";

type TimelineTone = "pending" | "active" | "done" | "error" | "warn";

function formatPeriodDisplay(periodYm: string): string {
  if (/^\d{6}$/.test(periodYm)) {
    return `${periodYm.slice(4, 6)}/${periodYm.slice(0, 4)}`;
  }
  return periodYm || "—";
}

function formatDisplayAt(value: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mi = String(parsed.getMinutes()).padStart(2, "0");
  const ss = String(parsed.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function isSuccessfulLockAction(action: string): boolean {
  const code = (action || "").toUpperCase();
  return code === "EXECUTE" || code === "CONFIRM";
}

function pickLatestSuccessfulLock(
  items: CostingStepHistoryItem[],
  stepIndex: 1,
): CostingStepHistoryItem | null {
  const rows = items.filter(
    (row) => row.stepIndex === stepIndex && isSuccessfulLockAction(row.action),
  );
  if (rows.length === 0) return null;
  return rows.reduce((best, row) => {
    const bestAt = Date.parse(best.at) || 0;
    const rowAt = Date.parse(row.at) || 0;
    return rowAt >= bestAt ? row : best;
  });
}

function prereqPill(
  status: PrerequisiteValidationStatus,
  t: (key: string, fallback: string) => string,
): { className: string; label: string } {
  if (status === "SUCCESS") {
    return { className: "gk-pill done", label: t("GK_PREREQ_STATUS_SUCCESS", "✓ Đạt") };
  }
  if (status === "WARNING") {
    return { className: "gk-pill warn", label: t("GK_PREREQ_STATUS_WARNING", "⚠ Cảnh báo") };
  }
  if (status === "ERROR") {
    return { className: "gk-pill error", label: t("GK_PREREQ_STATUS_ERROR", "✕ Lỗi chặn") };
  }
  return {
    className: "gk-pill",
    label: t("GK_PREREQ_STATUS_NOT_CHECKED", "○ Chưa kiểm tra"),
  };
}

function biLockPill(
  runStatus: CostingStepRunStatus,
  processing: boolean,
  t: (key: string, fallback: string) => string,
): { className: string; label: string } {
  if (processing || runStatus === "PROCESSING") {
    return { className: "gk-pill active", label: t("GK_BI_STATUS_PROCESSING", "Đang xử lý") };
  }
  if (runStatus === "DONE") {
    return { className: "gk-pill done", label: t("GK_BI_STATUS_DONE", "Hoàn thành") };
  }
  if (runStatus === "ERROR") {
    return { className: "gk-pill error", label: t("GK_BI_STATUS_ERROR", "Lỗi") };
  }
  if (runStatus === "REOPENED") {
    return { className: "gk-pill warn", label: t("GK_BI_STATUS_REOPENED", "Đã mở lại") };
  }
  return { className: "gk-pill", label: t("GK_BI_STATUS_NOT_STARTED", "Chưa thực hiện") };
}

export function FaPrepaidLockPanel({
  overview,
  busy,
  t,
  onRefresh,
  onBusy,
  onError,
  onSuccess,
  onPrev,
  onNext,
  onRequestReopen,
  onRequestStepHistory,
}: PanelCommonProps) {
  const runStatus = overview.stepStatuses[0];
  const locked = runStatus === "DONE";
  const processing = busy || runStatus === "PROCESSING" || overview.job.running;
  const prereq = overview.prerequisiteValidation;
  const prereqView = prereqPill(prereq.status, t);
  const biView = biLockPill(runStatus, processing, t);
  const latestSuccessfulLock = useMemo(
    () => pickLatestSuccessfulLock(overview.stepHistory, 1),
    [overview.stepHistory],
  );
  const hasExecuteHistory = latestSuccessfulLock != null;
  /** Cho phép retry ghi history khi B-I đã DONE nhưng chưa có EXECUTE (lỗi ghi nhật ký trước đó). */
  const lockButtonDisabled = busy || (locked && hasExecuteHistory);

  const conditionTone: TimelineTone = (() => {
    if (!overview.periodExists) return "error";
    if (prereq.status === "ERROR") return "error";
    if (prereq.status === "WARNING") return "warn";
    if (prereq.status === "SUCCESS" && overview.periodExists) return "done";
    if (overview.periodExists) return "active";
    return "pending";
  })();

  const lockTone: TimelineTone = (() => {
    if (runStatus === "ERROR") return "error";
    if (runStatus === "DONE") return "done";
    if (processing) return "active";
    if (runStatus === "REOPENED") return "warn";
    return "pending";
  })();

  const confirmTone: TimelineTone = (() => {
    if (runStatus === "DONE") return "done";
    if (runStatus === "ERROR") return "error";
    if (processing) return "active";
    return "pending";
  })();

  const conditionDetail = (() => {
    if (!overview.periodExists) {
      return t(
        "GK_STEP1_COND_NO_PERIOD",
        "Kỳ chưa có RUN G-K. Khởi tạo kỳ trước khi khóa sổ.",
      );
    }
    if (prereq.status === "ERROR") {
      return formatGkMessage(
        t("GK_STEP1_COND_PREREQ_ERR", "Bước 00 còn {0} lỗi chặn."),
        prereq.errorCount,
      );
    }
    if (prereq.status === "WARNING") {
      return formatGkMessage(
        t("GK_STEP1_COND_PREREQ_WARN", "Bước 00 đạt có cảnh báo ({0})."),
        prereq.warningCount,
      );
    }
    if (prereq.status === "SUCCESS") {
      return t("GK_STEP1_COND_PREREQ_OK", "Kỳ hợp lệ và kiểm tra đầu vào đạt.");
    }
    return t(
      "GK_STEP1_COND_PREREQ_PENDING",
      "Kỳ đã có RUN. Chưa có kết quả kiểm tra đầu vào từ Bước 00.",
    );
  })();

  const lockDetail = (() => {
    if (processing) {
      return (
        overview.job.message ||
        t("GK_STEP1_LOCK_RUNNING", "Đang chạy PeriodLock FA_PREPAID_LOCK…")
      );
    }
    if (runStatus === "DONE") {
      return t("GK_STEP1_LOCK_DONE", "PeriodLock đã ghi nhận FA_PREPAID_LOCK = DONE.");
    }
    if (runStatus === "ERROR") {
      return (
        overview.job.message ||
        overview.statusMessage ||
        t("GK_STEP1_LOCK_ERROR", "PeriodLock báo lỗi. Kiểm tra thông báo trước khi chạy lại.")
      );
    }
    if (runStatus === "REOPENED") {
      return t(
        "GK_STEP1_LOCK_REOPENED",
        "Bước đã mở lại. Chạy lại PeriodLock để ghi nhận chứng từ mới.",
      );
    }
    return t(
      "GK_STEP1_LOCK_IDLE",
      "Chưa chạy PeriodLock. Nhấn Thực hiện khóa bước 1 để bắt đầu.",
    );
  })();

  const confirmDetail = (() => {
    if (runStatus === "DONE") {
      return t(
        "GK_STEP1_CONFIRM_DONE",
        "Trạng thái bước trên DB đã xác nhận DONE.",
      );
    }
    if (runStatus === "ERROR") {
      return t(
        "GK_STEP1_CONFIRM_ERROR",
        "DB chưa DONE. Không chuyển bước sang hoàn thành.",
      );
    }
    if (processing) {
      return t(
        "GK_STEP1_CONFIRM_WAIT",
        "Đợi job PeriodLock xác nhận DONE — không coi Percent=100 là hoàn thành.",
      );
    }
    return t(
      "GK_STEP1_CONFIRM_IDLE",
      "Chỉ đánh dấu hoàn thành khi backend xác nhận trạng thái hợp lệ.",
    );
  })();

  const lockStatusLabel = (() => {
    if (processing || runStatus === "PROCESSING") {
      return t("GK_BI_STATUS_PROCESSING", "Đang xử lý");
    }
    if (runStatus === "DONE") return t("GK_BI_STATUS_DONE", "Hoàn thành");
    if (runStatus === "ERROR") return t("GK_BI_STATUS_ERROR", "Lỗi");
    if (runStatus === "REOPENED") return t("GK_BI_STATUS_REOPENED", "Đã mở lại");
    return t("GK_BI_STATUS_NOT_STARTED", "Chưa thực hiện");
  })();

  const resultBlock = (() => {
    const lockAt = latestSuccessfulLock
      ? formatDisplayAt(latestSuccessfulLock.at)
      : "—";
    const lockUser = latestSuccessfulLock?.userName?.trim() || "—";

    if (processing || runStatus === "PROCESSING") {
      return {
        tone: "info" as const,
        statusLabel: lockStatusLabel,
        at: lockAt,
        user: lockUser,
      };
    }
    if (runStatus === "DONE") {
      return {
        tone: "good" as const,
        statusLabel: lockStatusLabel,
        at: lockAt,
        user: lockUser,
      };
    }
    if (runStatus === "ERROR") {
      return {
        tone: "err" as const,
        statusLabel: lockStatusLabel,
        at: lockAt,
        user: lockUser,
      };
    }
    if (runStatus === "REOPENED") {
      return {
        tone: "warn" as const,
        statusLabel: lockStatusLabel,
        at: lockAt,
        user: lockUser,
      };
    }
    return {
      tone: "info" as const,
      statusLabel: lockStatusLabel,
      at: lockAt,
      user: lockUser,
    };
  })();

  const runLock = async () => {
    if (lockButtonDisabled || processing) return;
    const ok = await confirm(
      t(
        "GK_STEP1_CONFIRM",
        "Chạy PeriodLock FA_PREPAID_LOCK trên kỳ đang chọn. Tiếp tục?",
      ),
      t("GK_STEP1_TITLE", "Khóa sổ bước 1"),
    );
    if (!ok) return;
    try {
      onBusy(true);
      const next = await runProductionCostingStep1((partial) => {
        onRefresh(partial);
      });
      onRefresh(next);
      onSuccess(t("GK_STEP1_OK", "PeriodLock đã ghi nhận bước 1."));
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      onError(message);
      try {
        onRefresh(await reloadProductionCosting());
      } catch {
        onRefresh({
          ...overview,
          job: { running: false, percent: overview.job.percent, message },
        });
      }
    } finally {
      onBusy(false);
    }
  };

  const reloadBiStatus = async () => {
    try {
      onBusy(true);
      const next = await reloadProductionCosting();
      onRefresh(next);
      onSuccess(
        formatGkMessage(
          t("GK_STEP1_CHECK_OK", "Trạng thái B1 trên DB: {0}."),
          next.stepStatuses[0],
        ),
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  return (
    <StepShell
      stepNo="01"
      stepIndex={1}
      title={t("GK_STEP1_TITLE", "Khóa sổ bước 1")}
      desc={t("GK_STEP1_SUB", "TSCĐ / CP trả trước")}
      runStatus={runStatus}
      t={t}
      onPrev={onPrev}
      onNext={onNext}
      onRequestReopen={onRequestReopen}
      onRequestStepHistory={onRequestStepHistory}
      rightActions={
        <>
          <Button
            text={t("GK_REFRESH_BI_STATUS", "Tải trạng thái B-I")}
            stylingMode="outlined"
            disabled={busy}
            onClick={() => void reloadBiStatus()}
          />
          <Button
            text={t("GK_STEP1_RUN", "Thực hiện khóa bước 1")}
            type="default"
            disabled={lockButtonDisabled}
            onClick={() => void runLock()}
          />
        </>
      }
    >
      {/* Khu vực A — Tổng quan */}
      <section className="gk-step1-overview" aria-label={t("GK_STEP1_OVERVIEW", "Thông tin tổng quan")}>
        <div className="gk-stat gk-step1-stat">
          <div className="lbl">{t("GK_STEP1_PERIOD", "Kỳ kế toán")}</div>
          <div className="val">{formatPeriodDisplay(overview.periodYm)}</div>
          {/* <div className="descr">PERIOD_YM</div> */}
        </div>
        <div className="gk-stat gk-step1-stat">
          <div className="lbl">{t("GK_STEP1_PREREQ", "Kiểm tra đầu vào")}</div>
          <div className="val gk-step1-stat-pill">
            <span className={prereqView.className}>{prereqView.label}</span>
          </div>
          {/* <div className="descr">{t("GK_PREREQ_TITLE", "Kiểm tra dữ liệu đầu vào")}</div> */}
        </div>
        <div className="gk-stat gk-step1-stat">
          <div className="lbl">{t("GK_STEP1_BI_STATUS", "Trạng thái khóa sổ B-I")}</div>
          <div className="val gk-step1-stat-pill">
            <span className={biView.className}>{biView.label}</span>
          </div>
          {/* <div className="descr">FA_PREPAID_LOCK</div> */}
        </div>
      </section>

      {/* Khu vực B + C */}
      <div className="gk-step1-main">
        <section className="gk-step1-panel" aria-label={t("GK_STEP1_SCOPE", "Nội dung khóa sổ")}>
          <div className="gk-step1-panel-head">
            <i className="dx-icon dx-icon-folder" aria-hidden />
            <h3>{t("GK_STEP1_SCOPE", "Nội dung khóa sổ")}</h3>
          </div>
          <div className="gk-step1-scope-list">
            <article className="gk-step1-scope-item">
              <div className="gk-step1-scope-icon" aria-hidden>
                <i className="dx-icon dx-icon-product" />
              </div>
              <div>
                <div className="title">
                  {t("GK_STEP1_FA_TITLE", "Khấu hao tài sản cố định")}
                </div>
                <div className="desc">
                  {t(
                    "GK_STEP1_FA_DESC",
                    "Kiểm tra, tính toán và ghi nhận khấu hao tài sản cố định trong kỳ.",
                  )}
                </div>
              </div>
            </article>
            <article className="gk-step1-scope-item">
              <div className="gk-step1-scope-icon" aria-hidden>
                <i className="dx-icon dx-icon-money" />
              </div>
              <div>
                <div className="title">
                  {t("GK_STEP1_PREPAID_TITLE", "Phân bổ chi phí trả trước")}
                </div>
                <div className="desc">
                  {t(
                    "GK_STEP1_PREPAID_DESC",
                    "Kiểm tra, tính toán và ghi nhận chi phí trả trước cần phân bổ trong kỳ.",
                  )}
                </div>
              </div>
            </article>
          </div>
          <p className="gk-step1-scope-note">
            {t(
              "GK_STEP1_SCOPE_NOTE",
              "Hai nghiệp vụ được PeriodLock B-I xử lý trong một lần khóa FA_PREPAID_LOCK. Không tách thao tác riêng trên G-K.",
            )}
          </p>
        </section>

        <section className="gk-step1-panel" aria-label={t("GK_STEP1_TIMELINE", "Tiến trình xử lý")}>
          <div className="gk-step1-panel-head">
            <i className="dx-icon dx-icon-clock" aria-hidden />
            <h3>{t("GK_STEP1_TIMELINE", "Tiến trình xử lý")}</h3>
          </div>
          <ol className="gk-step1-timeline">
            <li className={`gk-step1-timeline-item ${conditionTone}`}>
              <span className="gk-step1-timeline-index" aria-hidden>
                1
              </span>
              <div>
                <div className="title">
                  {t("GK_STEP1_TL_COND", "Kiểm tra điều kiện")}
                </div>
                <div className="desc">{conditionDetail}</div>
              </div>
            </li>
            <li className={`gk-step1-timeline-item ${lockTone}`}>
              <span className="gk-step1-timeline-index" aria-hidden>
                2
              </span>
              <div>
                <div className="title">
                  {t("GK_STEP1_TL_LOCK", "Thực hiện PeriodLock")}
                </div>
                <div className="desc">{lockDetail}</div>
              </div>
            </li>
            <li className={`gk-step1-timeline-item ${confirmTone}`}>
              <span className="gk-step1-timeline-index" aria-hidden>
                3
              </span>
              <div>
                <div className="title">
                  {t("GK_STEP1_TL_CONFIRM", "Xác nhận kết quả")}
                </div>
                <div className="desc">{confirmDetail}</div>
              </div>
            </li>
          </ol>
        </section>
      </div>

      {/* Khu vực D — Trạng thái khóa sổ bước 1 (không hiển thị chuỗi kỹ thuật) */}
      <section
        className={`gk-step1-result gk-notice${resultBlock.tone === "info" ? "" : ` ${resultBlock.tone}`}`}
        aria-label={t("GK_STEP1_LOCK_STATUS_TITLE", "Trạng thái khóa sổ bước 1")}
      >
        <div className="gk-step1-result-head">
          <strong>{t("GK_STEP1_LOCK_STATUS_TITLE", "Trạng thái khóa sổ bước 1")}</strong>
          <span className={biView.className}>{resultBlock.statusLabel}</span>
        </div>
        <div className="gk-step1-result-meta">
          <span>
            {t("GK_STEP1_RESULT_AT", "Thời gian khóa sổ thành công gần nhất")}: {resultBlock.at}
          </span>
          <span>
            {t("GK_STEP1_RESULT_BY", "Người thực hiện khóa sổ thành công gần nhất")}:{" "}
            {resultBlock.user}
          </span>
        </div>
      </section>
    </StepShell>
  );
}
