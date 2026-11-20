/**
 * Sidebar tiến trình G-K: mục 00 (tiền kiểm) + 6 bước xử lý.
 * Chọn bước chỉ đổi panel phải. Tiến độ vẫn 0/6 (không đếm Bước 00).
 */

import {
  COSTING_SIDEBAR_STEPS,
  type CostingStepIndex,
  type CostingStepRunStatus,
  type PeriodMonthStatus,
  type PrerequisiteValidationStatus,
} from "../types/productionCostingTypes";

type CostingStepNavigatorProps = {
  activeStep: CostingStepIndex;
  doneFlags: boolean[];
  stepStatuses: CostingStepRunStatus[];
  prerequisiteStatus: PrerequisiteValidationStatus;
  monthStatus: PeriodMonthStatus;
  t: (key: string, fallback: string) => string;
  onSelectStep: (step: CostingStepIndex) => void;
};

function stepStatusLabel(
  stepIndex: CostingStepIndex,
  activeStep: CostingStepIndex,
  stepStatuses: CostingStepRunStatus[],
  t: (key: string, fallback: string) => string,
): string {
  const statusIndex = stepIndex - 1;
  const st = stepStatuses[statusIndex];
  if (st === "DONE") return t("GK_STATUS_DONE", "✓ Đã hoàn thành");
  if (st === "REOPENED") return t("GK_STATUS_REOPENED", "↺ Đã mở lại — chờ tính lại");
  if (st === "PROCESSING") return t("GK_STATUS_PROCESSING", "… Đang xử lý");
  if (st === "ERROR") return t("GK_STATUS_ERROR", "✕ Lỗi");
  if (statusIndex > 0 && stepStatuses[statusIndex - 1] !== "DONE") {
    return t("GK_STATUS_WAIT_MARK", "◷ Chờ bước trước");
  }
  if (activeStep === stepIndex) return t("GK_STATUS_VIEWING", "● Đang xem");
  return t("GK_STATUS_READY", "○ Chưa thực hiện");
}

function prerequisiteStatusLabel(
  status: PrerequisiteValidationStatus,
  activeStep: CostingStepIndex,
  t: (key: string, fallback: string) => string,
): string {
  if (status === "SUCCESS") return t("GK_PREREQ_STATUS_SUCCESS", "✓ Đạt");
  if (status === "WARNING") return t("GK_PREREQ_STATUS_WARNING", "⚠ Cảnh báo");
  if (status === "ERROR") return t("GK_PREREQ_STATUS_ERROR", "✕ Lỗi chặn");
  if (activeStep === 0) return t("GK_STATUS_VIEWING", "● Đang xem");
  return t("GK_PREREQ_STATUS_NOT_CHECKED", "○ Chưa kiểm tra");
}

function prerequisiteCircle(status: PrerequisiteValidationStatus): string {
  if (status === "SUCCESS") return "✓";
  if (status === "WARNING") return "!";
  if (status === "ERROR") return "✕";
  return "00";
}

export function CostingStepNavigator({
  activeStep,
  doneFlags,
  stepStatuses,
  prerequisiteStatus,
  monthStatus,
  t,
  onSelectStep,
}: CostingStepNavigatorProps) {
  // Bước 00 không thuộc 6 bước khóa/tính — doneFlags[0] luôn false.
  const doneCount = doneFlags.slice(1).filter(Boolean).length;
  const pct = (doneCount / 6) * 100;

  return (
    <aside className="gk-sidebar">
      <div className="gk-sidetop">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <strong>{t("GK_PROGRESS_TITLE", "Tiến trình xử lý tháng")}</strong>
          <span className="gk-pill">{doneCount}/6</span>
        </div>
        <div className="bar">
          <i style={{ width: `${pct}%` }} />
        </div>
      </div>

      <div className="gk-stage-list">
        {COSTING_SIDEBAR_STEPS.map((step) => {
          const stepIndex = step.index as CostingStepIndex;
          const focus = activeStep === stepIndex;
          const isPrereq = stepIndex === 0;
          const completed = !isPrereq && stepStatuses[stepIndex - 1] === "DONE";
          const reopened = !isPrereq && stepStatuses[stepIndex - 1] === "REOPENED";
          const prereqClass =
            isPrereq && prerequisiteStatus === "SUCCESS"
              ? " prereq-ok"
              : isPrereq && prerequisiteStatus === "WARNING"
                ? " prereq-warn"
                : isPrereq && prerequisiteStatus === "ERROR"
                  ? " prereq-error"
                  : "";

          return (
            <button
              key={step.code}
              type="button"
              className={`gk-stage${focus ? " focus" : ""}${completed ? " completed" : ""}${reopened ? " reopened" : ""}${prereqClass}`}
              onClick={() => onSelectStep(stepIndex)}
            >
              <span className="gk-step-circle">
                {isPrereq
                  ? prerequisiteCircle(prerequisiteStatus)
                  : completed
                    ? "✓"
                    : reopened
                      ? "↺"
                      : step.index}
              </span>
              <span className="gk-stage-body">
                <div className="stepname">
                  {isPrereq ? "00. " : `${String(step.index).padStart(2, "0")}. `}
                  {t(step.titleKey, step.titleFallback)}
                </div>
                <div className="subtext">{t(step.subKey, step.subFallback)}</div>
                <div className="smallstatus">
                  {isPrereq
                    ? prerequisiteStatusLabel(prerequisiteStatus, activeStep, t)
                    : stepStatusLabel(stepIndex, activeStep, stepStatuses, t)}
                </div>
              </span>
            </button>
          );
        })}
      </div>

      {/* <div className="gk-sidenav-foot">
        <b>{t("GK_MODE", "Chế độ")}:</b> {t("GK_MODE_SIMPLE", "Giá thành giản đơn")}
        <br />
        <b>{t("GK_RULE_STEP2", "Rule khóa bước 2")}:</b> EXP_TO_154_ONLY
        <br />
        <b>{t("GK_PERIOD_STATUS", "Trạng thái kỳ")}:</b> {monthStatus}
      </div> */}
    </aside>
  );
}
