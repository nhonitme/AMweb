/**
 * Bước 6 — Khóa lãi/lỗ tại G-K, tái sử dụng engine B-I PROFIT_LOSS_REPORT (mô phỏng).
 */

import { useState } from "react";
import Button from "devextreme-react/button";
import { confirm } from "devextreme/ui/dialog";
import { checkProfitLossPreconditions, lockProfitLoss } from "@/api/productionCostingApi";
import { formatMoney, Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";

type TabKey = "check" | "entries" | "result";

export function ProfitLossLockPanel({
  overview,
  busy,
  t,
  onRefresh,
  onBusy,
  onError,
  onSuccess,
  onPrev,
  onRequestReopen,
  onRequestStepHistory,
}: PanelCommonProps) {
  const runStatus = overview.stepStatuses[5];
  const locked = runStatus === "DONE";
  const waiting = overview.stepStatuses[4] !== "DONE";
  const [tab, setTab] = useState<TabKey>("check");

  const finishedTotal = overview.aggregateRows.reduce((s, r) => s + r.finishedCost, 0);
  const cogsTotal = overview.valuationRows.reduce((s, r) => s + r.currentCogs, 0);

  const runCheck = async () => {
    try {
      onBusy(true);
      const next = await checkProfitLossPreconditions();
      onRefresh(next);
      onSuccess(t("GK_STEP6_CHECK_OK", "Điều kiện khóa sổ bước 3 hợp lệ."));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const runLock = async () => {
    const ok = await confirm(
      t(
        "GK_STEP6_CONFIRM",
        "Gọi engine B-I PROFIT_LOSS_REPORT (mô phỏng). Kỳ sẽ LOCKED chỉ trong mock store. Tiếp tục?",
      ),
      t("GK_STEP6_TITLE", "Khóa sổ bước 3"),
    );
    if (!ok) return;
    try {
      onBusy(true);
      const next = await lockProfitLoss();
      onRefresh(next);
      onSuccess(t("GK_STEP6_OK", "Đã hoàn tất toàn bộ 6 bước (DEMO)!"));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  return (
    <StepShell
      stepNo="06"
      stepIndex={6}
      title={t("GK_STEP6_TITLE", "Khóa sổ bước 3")}
      desc={t("GK_STEP6_SUB", "Lãi/lỗ, chốt tháng") + " · " + t("GK_ENGINE_BI", "Dùng engine B-I")}
      runStatus={runStatus}
      waiting={waiting}
      t={t}
      onPrev={onPrev}
      showNext={false}
      onRequestReopen={onRequestReopen}
      onRequestStepHistory={onRequestStepHistory}
      rightActions={
        <>
          <Button
            text={t("GK_CHECK", "Kiểm tra điều kiện")}
            stylingMode="outlined"
            disabled={busy || locked || waiting}
            onClick={() => void runCheck()}
          />
          <Button
            text={t("GK_LOCK_PL", "Khóa sổ cuối kỳ")}
            type="default"
            disabled={busy || locked || waiting || !overview.step6Checked}
            onClick={() => void runLock()}
          />
        </>
      }
    >
      <div className="gk-summary-band">
        <div className="big">B-I</div>
        <div className="explain">
          <div className="title">{t("GK_STEP6_BAND", "Gọi lại engine khóa sổ bước 3 của B-I")}</div>
          <div className="desc">
            {t(
              "GK_STEP6_BAND_DESC",
              "Thực hiện trực tiếp trong G-K. Kiểm tra hoàn tất giá thành & giá vốn trước khi chạy PROFIT_LOSS_REPORT.",
            )}
          </div>
        </div>
        <span className="gk-pill active">{t("GK_SHARED_BI", "Dùng chung B-I")}</span>
      </div>

      <div className="gk-columns">
        <div className="gk-mini tinted">
          <div className="title">{t("GK_FINISHED_POSTED", "Giá thành đã ghi nhận")}</div>
          <div className="num">{overview.doneFlags[3] ? `${formatMoney(finishedTotal)} đ` : "—"}</div>
        </div>
        <div className="gk-mini tinted">
          <div className="title">{t("GK_COGS_RECON", "Giá vốn đã đối chiếu")}</div>
          <div className="num">{overview.doneFlags[4] ? `${formatMoney(cogsTotal)} đ` : "—"}</div>
        </div>
      </div>

      <div className="gk-tab-bar">
        {(
          [
            ["check", t("GK_TAB_CHECK", "Điều kiện")],
            ["entries", t("GK_TAB_ENTRIES", "Bút toán")],
            ["result", t("GK_TAB_RESULT", "Kết quả")],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            type="button"
            className={`gk-tab-btn${tab === key ? " active" : ""}`}
            onClick={() => setTab(key)}
          >
            {label}
          </button>
        ))}
      </div>

      {tab === "check" ? (
        <div className="gk-listchecks">
          {overview.profitLossConditions.map((c) => (
            <div key={c.id} className={`gk-check ${c.ok ? "" : "missing"}`}>
              <span className="symbol">{c.ok ? "✓" : "!"}</span>
              {c.label}
            </div>
          ))}
        </div>
      ) : null}

      {tab === "entries" ? (
        <div>
          <div className="gk-sectiontitle">{t("GK_PL_WORKFLOW", "Nghiệp vụ kết chuyển dùng chung")}</div>
          <div className="gk-workflow">
            <span className="mark">Doanh thu 511 → 911</span>
            <span className="mark">Giá vốn 632 → 911</span>
            <span className="mark">Chi phí khác → 911</span>
            <span className="mark">911 → 4212</span>
          </div>
        </div>
      ) : null}

      {tab === "result" ? (
        <div className="gk-workflow">
          <span className={overview.doneFlags[0] ? "mark" : ""}>
            Bước 1: {overview.faPrepaidStatus}
          </span>
          <span className={overview.doneFlags[2] ? "mark" : ""}>
            Bước 2: {overview.cogsSummaryStatus}
          </span>
          <span className={overview.doneFlags[5] ? "mark" : ""}>
            Bước 3: {overview.profitLossStatus}
          </span>
          <span>
            {t("GK_MONTH", "Tháng")}: {overview.monthStatus}
          </span>
        </div>
      ) : null}

      <Notice type={locked ? "good" : overview.step6Checked ? "good" : "warn"}>
        {locked
          ? t(
              "GK_STEP6_DONE",
              "Hoàn tất 6/6 bước. Trạng thái LOCKED chỉ trong mock — B-I thật không bị đổi.",
            )
          : overview.step6Checked
            ? t("GK_STEP6_READY", "Đã kiểm tra đủ điều kiện. Có thể khóa sổ cuối kỳ.")
            : t(
                "GK_STEP6_NEED",
                "Không khóa được nếu còn bước REOPENED. Mở lại bước 6 không đổi kết quả bước trước.",
              )}
      </Notice>
    </StepShell>
  );
}
