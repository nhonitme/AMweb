/**
 * Thành phần dùng chung cho các panel bước G-K (FE-01→FE-04).
 */

import type { ReactNode } from "react";
import Button from "devextreme-react/button";
import type { CostingStepRunStatus, ProductionCostingOverview } from "../types/productionCostingTypes";

export type PanelCommonProps = {
  overview: ProductionCostingOverview;
  busy: boolean;
  t: (key: string, fallback: string) => string;
  onRefresh: (next: ProductionCostingOverview) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
  onSuccess: (message: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
  /** FE-04: mở Popup mở lại bước (1–6). */
  onRequestReopen?: (stepIndex: 1 | 2 | 3 | 4 | 5 | 6) => void;
  /** FE-04: mở Popup lịch sử bước. */
  onRequestStepHistory?: (stepIndex: 1 | 2 | 3 | 4 | 5 | 6) => void;
};

const moneyFmt = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 });

export function formatMoney(value: number): string {
  return moneyFmt.format(Math.round(Number(value) || 0));
}

type StepShellProps = {
  stepNo: string;
  /** Bước 1–6; bỏ trống với bước 0 (kiểm tra đầu vào). */
  stepIndex?: 1 | 2 | 3 | 4 | 5 | 6;
  title: string;
  desc: string;
  /** Trạng thái chạy thật; bước 0 có thể truyền NOT_STARTED/DONE giả. */
  runStatus?: CostingStepRunStatus;
  /** Tương thích FE-03: done=true ↔ DONE. */
  done?: boolean;
  waiting?: boolean;
  t: (key: string, fallback: string) => string;
  children: ReactNode;
  leftActions?: ReactNode;
  rightActions?: ReactNode;
  onPrev?: () => void;
  onNext?: () => void;
  showNext?: boolean;
  onRequestReopen?: (stepIndex: 1 | 2 | 3 | 4 | 5 | 6) => void;
  onRequestStepHistory?: (stepIndex: 1 | 2 | 3 | 4 | 5 | 6) => void;
};

function statusPill(
  runStatus: CostingStepRunStatus,
  waiting: boolean | undefined,
  t: (key: string, fallback: string) => string,
) {
  if (runStatus === "DONE") {
    return <span className="gk-pill done">{t("GK_DONE", "✓ Đã hoàn thành")}</span>;
  }
  if (runStatus === "REOPENED") {
    return <span className="gk-pill warn">{t("GK_REOPENED", "↺ Đã mở lại")}</span>;
  }
  if (runStatus === "PROCESSING") {
    return <span className="gk-pill active">{t("GK_PROCESSING", "Đang xử lý")}</span>;
  }
  if (runStatus === "ERROR") {
    return <span className="gk-pill error">{t("GK_ERROR", "Lỗi")}</span>;
  }
  if (waiting) {
    return <span className="gk-pill">{t("GK_STATUS_WAIT", "Chờ bước trước")}</span>;
  }
  return <span className="gk-pill warn">{t("GK_NOT_DONE", "Chưa hoàn thành")}</span>;
}

/** Khung card chung: tiêu đề bước + body + chân nút + FE-04 Lịch sử/Mở lại. */
export function StepShell({
  stepNo,
  stepIndex,
  title,
  desc,
  runStatus,
  done,
  waiting,
  t,
  children,
  leftActions,
  rightActions,
  onPrev,
  onNext,
  showNext = true,
  onRequestReopen,
  onRequestStepHistory,
}: StepShellProps) {
  const resolvedStatus: CostingStepRunStatus =
    runStatus ?? (done ? "DONE" : "NOT_STARTED");
  const showReopenActions =
    Boolean(stepIndex) && (resolvedStatus === "DONE" || resolvedStatus === "REOPENED");

  return (
    <div className="gk-card">
      <div className="gk-cardhead">
        <div>
          <h2>
            {stepNo}. {title}
          </h2>
          <div className="desc">{desc}</div>
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          {showReopenActions && stepIndex ? (
            <>
              <Button
                text={t("GK_HISTORY", "Lịch sử")}
                stylingMode="outlined"
                onClick={() => onRequestStepHistory?.(stepIndex)}
              />
              {resolvedStatus === "DONE" ? (
                <Button
                  text={t("GK_REOPEN_STEP", "Mở lại bước")}
                  stylingMode="outlined"
                  type="danger"
                  onClick={() => onRequestReopen?.(stepIndex)}
                />
              ) : null}
            </>
          ) : null}
          {statusPill(resolvedStatus, waiting, t)}
        </div>
      </div>
      <div className="gk-cardbody">{children}</div>
      <div className="gk-cardfoot">
        <div>
          {leftActions}
          {onPrev ? (
            <Button text={t("GK_PREV", "← Bước trước")} stylingMode="outlined" onClick={onPrev} />
          ) : null}
        </div>
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center" }}>
          {rightActions}
          {showNext && onNext ? (
            <Button text={t("GK_NEXT", "Bước tiếp →")} stylingMode="outlined" onClick={onNext} />
          ) : null}
        </div>
      </div>
    </div>
  );
}

export function Notice({
  children,
  type = "info",
}: {
  children: ReactNode;
  type?: "info" | "good" | "warn" | "err";
}) {
  return <div className={`gk-notice${type === "info" ? "" : ` ${type}`}`}>{children}</div>;
}
