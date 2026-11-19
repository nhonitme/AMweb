/**
 * Bước 1 — Khóa TSCĐ/CPTT tại G-K, gọi engine PeriodLock B-I thật.
 */

import Button from "devextreme-react/button";
import { confirm } from "devextreme/ui/dialog";
import { reloadProductionCosting, runProductionCostingStep1 } from "@/api/productionCostingApi";
import { formatGkMessage, Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";

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

  const runLock = async () => {
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
      const next = await runProductionCostingStep1();
      onRefresh(next);
      onSuccess(t("GK_STEP1_OK", "PeriodLock đã ghi nhận bước 1."));
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
            disabled={busy || locked}
            onClick={() => {
              void (async () => {
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
              })();
            }}
          />
          <Button
            text={t("GK_STEP1_RUN", "Thực hiện khóa bước 1")}
            type="default"
            disabled={busy || locked}
            onClick={() => void runLock()}
          />
        </>
      }
    >
      <div className="gk-summary-band">
        <div className="big">B-I</div>
        <div className="explain">
          <div className="title">{t("GK_STEP1_BAND", "Dùng lại engine khóa sổ bước 1 của B-I")}</div>
          <div className="desc">
            {t(
              "GK_STEP1_BAND_DESC",
              "Bước này gọi PeriodLock FA_PREPAID_LOCK. Trạng thái DONE chỉ hiện khi DB trả về DONE.",
            )}
          </div>
        </div>
        <span className="gk-pill active">{t("GK_SHARED_BI", "Dùng chung B-I")}</span>
      </div>

      <Notice type="info">
        {t(
          "GK_STEP1_REAL_ENGINE",
          "Chứng từ khấu hao và phân bổ được kiểm tra, tính toán và ghi nhận bởi PeriodLock B-I khi thực hiện. " +
            "G-K không mô phỏng bút toán hoặc hiển thị số tiền xem trước chưa được xác nhận từ DB.",
        )}
      </Notice>

      <Notice type={locked ? "good" : runStatus === "REOPENED" ? "warn" : "info"}>
        {locked
          ? formatGkMessage(
              t("GK_STEP1_DONE_MSG", "B1 trên DB đang DONE. Chứng từ đã được PeriodLock ghi nhận."),
            )
          : runStatus === "REOPENED"
            ? t(
                "GK_STEP1_REOPENED",
                "Bước 1 đã mở lại. Chạy lại PeriodLock B-I để tính và ghi nhận chứng từ mới.",
              )
            : t(
                "GK_STEP1_HINT",
                "Kiểm tra trạng thái DB, sau đó thực hiện bằng PeriodLock B-I. Chỉ xác nhận thành công khi job và bước trên DB đều DONE.",
              )}
      </Notice>
    </StepShell>
  );
}
