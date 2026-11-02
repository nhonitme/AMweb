/**
 * Bước 3 — Khóa chi phí sản xuất: 621/622/627 → 154 (rule EXP_TO_154_ONLY).
 */

import { useState } from "react";
import DataGrid, { Column, Paging, Summary, TotalItem } from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import { confirm } from "devextreme/ui/dialog";
import { checkCostTransferPreconditions, lockCostTransferTo154 } from "@/api/productionCostingApi";
import { formatMoney, Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";
import { CostingCompareTable } from "./CostingCompareTable";

type TabKey = "check" | "ledger" | "entries";

export function CostTransferPanel({
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
  const runStatus = overview.stepStatuses[2];
  const locked = runStatus === "DONE";
  const waiting = overview.stepStatuses[1] !== "DONE";
  const [tab, setTab] = useState<TabKey>("ledger");

  const runCheck = async () => {
    try {
      onBusy(true);
      const next = await checkCostTransferPreconditions();
      onRefresh(next);
      onSuccess(t("GK_STEP3_CHECK_OK", "Điều kiện khóa chi phí hợp lệ."));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const runLock = async () => {
    const ok = await confirm(
      t(
        "GK_STEP3_CONFIRM",
        "Kết chuyển 621/622/627 → 154 theo EXP_TO_154_ONLY. Không sinh 154→155/632. DEMO không ghi DB. Tiếp tục?",
      ),
      t("GK_STEP3_TITLE", "Khóa chi phí sản xuất"),
    );
    if (!ok) return;
    try {
      onBusy(true);
      const next = await lockCostTransferTo154();
      onRefresh(next);
      onSuccess(t("GK_STEP3_OK", "Đã mô phỏng khóa chi phí sản xuất."));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  return (
    <StepShell
      stepNo="03"
      stepIndex={3}
      title={t("GK_STEP3_TITLE", "Khóa chi phí sản xuất")}
      desc={t("GK_STEP3_SUB", "621, 622, 627 → 154") + " · EXP_TO_154_ONLY"}
      runStatus={runStatus}
      waiting={waiting}
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
            disabled={busy || locked || waiting}
            onClick={() => void runCheck()}
          />
          <Button
            text={t("GK_LOCK_TO_154", "Khóa chi phí → 154")}
            type="default"
            disabled={busy || locked || waiting || !overview.step3Checked}
            onClick={() => void runLock()}
          />
        </>
      }
    >
      <div className="gk-summary-band">
        <div className="big">154</div>
        <div className="explain">
          <div className="title">{t("GK_STEP3_BAND", "Khóa bước 2 theo rule sản xuất EXP_TO_154_ONLY")}</div>
          <div className="desc">
            {t(
              "GK_STEP3_BAND_DESC",
              "Thực hiện trong G-K, ghi trạng thái chung COGS_SUMMARY = DONE (mock). Không tự kết chuyển 154 sang 155 hoặc 632.",
            )}
          </div>
        </div>
        <span className="gk-pill active">{t("GK_RULE_GK", "Rule dành cho G-K")}</span>
      </div>

      <div className="gk-toolbar">
        <div className="gk-toolleft">
          <span className={`gk-pill ${overview.doneFlags[0] ? "done" : "warn"}`}>
            Bước 1: {overview.faPrepaidStatus}
          </span>
          <span className={`gk-pill ${overview.doneFlags[1] ? "done" : "warn"}`}>
            Phân bổ: {overview.allocationStatus}
          </span>
        </div>
      </div>

      <div className="gk-tab-bar">
        {(
          [
            ["check", t("GK_TAB_CHECK", "Điều kiện")],
            ["ledger", t("GK_TAB_COST", "Bảng kê chi phí")],
            ["entries", t("GK_TAB_ENTRIES", "Bút toán dự kiến")],
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
          <div className={`gk-check ${overview.doneFlags[0] ? "" : "missing"}`}>
            <span className="symbol">{overview.doneFlags[0] ? "✓" : "!"}</span>
            FA_PREPAID_LOCK DONE
          </div>
          <div className={`gk-check ${overview.doneFlags[1] ? "" : "missing"}`}>
            <span className="symbol">{overview.doneFlags[1] ? "✓" : "!"}</span>
            Phân bổ 622/627 CONFIRMED
          </div>
          <div className="gk-check">
            <span className="symbol">✓</span>
            {t("GK_NO_PARALLEL", "Không có job song song (giả lập)")}
          </div>
          <div className="gk-check">
            <span className="symbol">✓</span>
            {t("GK_ALLOC_READY", "Nguồn phân bổ sẵn sàng kết chuyển")}
          </div>
        </div>
      ) : null}

      {tab === "ledger" ? (
        <DataGrid dataSource={overview.aggregateRows} keyExpr="productId" showBorders columnAutoWidth height={260}>
          <Paging enabled={false} />
          <Column dataField="productCd" caption={t("PRODUCT_CD", "Mã TP")} width={90} />
          <Column dataField="productName" caption={t("PRODUCT_NM", "Thành phẩm")} />
          <Column dataField="amount621" caption="621" dataType="number" format="#,##0" width={110} />
          <Column dataField="amount622" caption="622" dataType="number" format="#,##0" width={110} />
          <Column dataField="amount627" caption="627" dataType="number" format="#,##0" width={110} />
          <Column dataField="periodCost" caption={t("TO_154", "→ 154")} dataType="number" format="#,##0" width={120} />
          <Summary>
            <TotalItem column="periodCost" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
          </Summary>
        </DataGrid>
      ) : null}

      {tab === "entries" ? (
        <div>
          <div className="gk-sectiontitle">{t("GK_ENTRIES_WILL_CREATE", "Các bút toán sẽ tạo khi khóa")}</div>
          <div className="gk-workflow">
            <span className="mark">154 / 621</span>
            <span className="mark">154 / 622</span>
            <span className="mark">154 / 627</span>
            <span>{t("GK_NO_154_155", "Không sinh 154 → 155")}</span>
            <span>{t("GK_NO_154_632", "Không sinh 154 → 632")}</span>
          </div>
          <Notice type="info">
            {t(
              "GK_STEP3_TOTAL",
              `Tổng kết chuyển dự kiến: ${formatMoney(overview.aggregateRows.reduce((s, r) => s + r.periodCost, 0))} đ`,
            )}
          </Notice>
        </div>
      ) : null}

      {runStatus === "REOPENED" ? <CostingCompareTable rows={overview.compareRows} t={t} /> : null}

      <Notice type={locked ? "good" : overview.step3Checked ? "good" : "warn"}>
        {locked
          ? t("GK_STEP3_DONE", "Đã khóa chi phí sản xuất (mock). Chứng từ XFER-154-DEMO-001 — chạy lại sẽ ghi đè, không trùng.")
          : overview.step3Checked
            ? t("GK_STEP3_READY", "Đã kiểm tra điều kiện: hợp lệ. Có thể khóa chi phí → 154.")
            : t("GK_STEP3_NEED_CHECK", "Chạy kiểm tra điều kiện trước khi ghi nhận kết chuyển.")}
      </Notice>
    </StepShell>
  );
}
