/**
 * Bước 1 — Khóa TSCĐ/CPTT tại G-K, tái sử dụng engine B-I (mô phỏng DEMO).
 */

import { useState } from "react";
import DataGrid, { Column, Paging } from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import { confirm } from "devextreme/ui/dialog";
import { reloadProductionCosting, runProductionCostingStep1 } from "@/api/productionCostingApi";
import { formatMoney, Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";

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
  const [checked, setChecked] = useState(false);
  const [previewed, setPreviewed] = useState(false);
  const faTotal = overview.faRows.reduce((s, r) => s + r.amount, 0);

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
      desc={t("GK_STEP1_SUB", "TSCĐ / CP trả trước") + " · " + t("GK_ENGINE_BI", "Dùng engine B-I")}
      runStatus={runStatus}
      t={t}
      onPrev={onPrev}
      onNext={onNext}
      onRequestReopen={onRequestReopen}
      onRequestStepHistory={onRequestStepHistory}
      rightActions={
        <>
          <Button
            text={t("GK_CHECK", "Kiểm tra")}
            stylingMode="outlined"
            disabled={busy || locked}
            onClick={() => {
              void (async () => {
                try {
                  onBusy(true);
                  const next = await reloadProductionCosting();
                  onRefresh(next);
                  setChecked(true);
                  onSuccess(t("GK_STEP1_CHECK_OK", `Trạng thái B1 trên DB: ${next.stepStatuses[0]}.`));
                } catch (err) {
                  onError(err instanceof Error ? err.message : String(err));
                } finally {
                  onBusy(false);
                }
              })();
            }}
          />
          <Button
            text={t("GK_PREVIEW", "Xem trước bút toán")}
            stylingMode="outlined"
            disabled={busy || locked || !checked}
            onClick={() => {
              setPreviewed(true);
              onSuccess(t("GK_STEP1_PREVIEW_OK", "Đã xem trước Nợ 627 / Có 214, 242."));
            }}
          />
          <Button
            text={t("GK_STEP1_RUN", "Thực hiện khóa bước 1")}
            type="default"
            disabled={busy || locked || !previewed}
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

      <div className="gk-columns">
        <div className="gk-mini tinted">
          <div className="title">{t("GK_FA_DEPR", "Khấu hao TSCĐ")}</div>
          <div className="num">{formatMoney(overview.faRows[0]?.amount ?? 0)} đ</div>
          <div className="small">Nợ 627 / Có 214</div>
        </div>
        <div className="gk-mini tinted">
          <div className="title">{t("GK_PREPAID", "Phân bổ CPTT")}</div>
          <div className="num">{formatMoney(overview.faRows[1]?.amount ?? 0)} đ</div>
          <div className="small">Nợ 627 / Có 242</div>
        </div>
      </div>

      <div className="gk-sectiontitle">{t("GK_FA_GRID", "Chi tiết TSCĐ / CPTT trong kỳ")}</div>
      <DataGrid dataSource={overview.faRows} keyExpr="id" showBorders columnAutoWidth height={200}>
        <Paging enabled={false} />
        <Column dataField="assetCd" caption={t("CODE", "Mã")} width={110} />
        <Column dataField="assetName" caption={t("NAME", "Tên")} />
        <Column dataField="debitAccount" caption={t("DEBIT", "Nợ")} width={70} />
        <Column dataField="creditAccount" caption={t("CREDIT", "Có")} width={70} />
        <Column
          dataField="amount"
          caption={t("AMOUNT", "Số tiền")}
          dataType="number"
          format="#,##0"
          width={120}
        />
        <Column dataField="note" caption={t("NOTE", "Ghi chú")} />
      </DataGrid>

      <div className="gk-listchecks">
        <div className="gk-check">
          <span className="symbol">✓</span>
          {t("GK_FA_CHECK1", "Danh mục TSCĐ hợp lệ")}
        </div>
        <div className="gk-check">
          <span className="symbol">✓</span>
          {t("GK_FA_CHECK2", "Chi phí trả trước đủ kỳ")}
        </div>
        <div className="gk-check">
          <span className="symbol">✓</span>
          {t("GK_FA_CHECK3", "Kỳ chưa khóa bước 3")}
        </div>
        <div className="gk-check">
          <span className="symbol">✓</span>
          {t("GK_FA_CHECK4", "Có quyền khóa sổ trên menu PeriodLock")}
        </div>
      </div>

      <Notice type={locked ? "good" : runStatus === "REOPENED" ? "warn" : "info"}>
        {locked
          ? t(
              "GK_STEP1_DONE_MSG",
              `B1 trên DB đang DONE. Tổng xem trước ${formatMoney(faTotal)} đ.`,
            )
          : runStatus === "REOPENED"
            ? t(
                "GK_STEP1_REOPENED",
                "Bước 1 đã mở lại — kết quả cũ được giữ. Kiểm tra → Xem trước → Thực hiện lại để ghi đè.",
              )
            : t(
                "GK_STEP1_HINT",
                "Thứ tự: Kiểm tra → Xem trước → Thực hiện. DONE chỉ khi PeriodLock và DB báo xong.",
              )}
      </Notice>
    </StepShell>
  );
}
