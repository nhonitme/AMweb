/**
 * Sidebar 6 bước G-K: chọn bước chỉ đổi panel phải, không navigate sang B-I/G-J.
 * FE-04: hiển thị trạng thái REOPENED.
 */

import {
  COSTING_STEPS,
  type CostingStepIndex,
  type CostingStepRunStatus,
  type PeriodMonthStatus,
} from "../types/productionCostingTypes";

type CostingStepNavigatorProps = {
  activeStep: CostingStepIndex;
  doneFlags: boolean[];
  stepStatuses: CostingStepRunStatus[];
  monthStatus: PeriodMonthStatus;
  t: (key: string, fallback: string) => string;
  onSelectStep: (step: CostingStepIndex) => void;
};

function statusLabel(
  index0: number,
  activeStep: CostingStepIndex,
  stepStatuses: CostingStepRunStatus[],
  t: (key: string, fallback: string) => string,
): string {
  const st = stepStatuses[index0];
  if (st === "DONE") return t("GK_STATUS_DONE", "✓ Đã hoàn thành");
  if (st === "REOPENED") return t("GK_STATUS_REOPENED", "↺ Đã mở lại — chờ tính lại");
  if (st === "PROCESSING") return t("GK_STATUS_PROCESSING", "… Đang xử lý");
  if (st === "ERROR") return t("GK_STATUS_ERROR", "✕ Lỗi");
  if (index0 > 0 && stepStatuses[index0 - 1] !== "DONE") {
    return t("GK_STATUS_WAIT", "◷ Chờ bước trước");
  }
  if (activeStep === ((index0 + 1) as CostingStepIndex)) return t("GK_STATUS_VIEWING", "● Đang xem");
  return t("GK_STATUS_READY", "○ Chưa thực hiện");
}

export function CostingStepNavigator({
  activeStep,
  doneFlags,
  stepStatuses,
  monthStatus,
  t,
  onSelectStep,
}: CostingStepNavigatorProps) {
  const doneCount = doneFlags.filter(Boolean).length;
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
        {COSTING_STEPS.map((step, index0) => {
          const stepIndex = step.index as CostingStepIndex;
          const focus = activeStep === stepIndex;
          const completed = stepStatuses[index0] === "DONE";
          const reopened = stepStatuses[index0] === "REOPENED";
          return (
            <button
              key={step.code}
              type="button"
              className={`gk-stage${focus ? " focus" : ""}${completed ? " completed" : ""}${reopened ? " reopened" : ""}`}
              onClick={() => onSelectStep(stepIndex)}
            >
              <span className="gk-step-circle">
                {completed ? "✓" : reopened ? "↺" : step.index}
              </span>
              <span className="gk-stage-body">
                <div className="stepname">{t(step.titleKey, step.titleFallback)}</div>
                <div className="subtext">{t(step.subKey, step.subFallback)}</div>
                <div className="smallstatus">{statusLabel(index0, activeStep, stepStatuses, t)}</div>
              </span>
            </button>
          );
        })}
      </div>

      <div className="gk-side-tip">
        <strong>{t("GK_SIDE_TIP_TITLE", "Làm việc hoàn toàn trong G-K")}</strong>
        <br />
        {t(
          "GK_SIDE_TIP_BODY",
          "Bước 1 và 6 dùng PeriodLock. Các bước còn lại gọi /api/production-cost.",
        )}
      </div>

      <div className="gk-sidenav-foot">
        <b>{t("GK_MODE", "Chế độ")}:</b> {t("GK_MODE_SIMPLE", "Giá thành giản đơn")}
        <br />
        <b>{t("GK_RULE_STEP2", "Rule khóa bước 2")}:</b> EXP_TO_154_ONLY
        <br />
        <b>{t("GK_PERIOD_STATUS", "Trạng thái kỳ")}:</b> {monthStatus}
      </div>
    </aside>
  );
}
