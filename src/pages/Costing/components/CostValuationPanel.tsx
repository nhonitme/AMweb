/**
 * Bước 5 — Tính lại & đối chiếu giá xuất TP.
 * Demo dùng bình quân gia quyền (tồn đầu + nhập kỳ), không nhân thẳng SL × đơn giá TP kỳ này.
 */

import { useState } from "react";
import DataGrid, { Column, Paging, Summary, TotalItem } from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import { confirm } from "devextreme/ui/dialog";
import { confirmValuation, previewValuation } from "@/api/productionCostingApi";
import { formatMoney, Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";
import { CostingCompareTable } from "./CostingCompareTable";

type TabKey = "export" | "diff" | "reconcile";

export function CostValuationPanel({
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
  const runStatus = overview.stepStatuses[4];
  const locked = runStatus === "DONE";
  const waiting = overview.stepStatuses[3] !== "DONE";
  const [tab, setTab] = useState<TabKey>("export");
  const [previewed, setPreviewed] = useState(false);

  const proposedTotal = overview.valuationRows.reduce((s, r) => s + r.proposedCogs, 0);
  const naiveTotal = overview.valuationRows.reduce(
    (s, r) => s + r.soldQty * r.periodInUnitCost,
    0,
  );

  const runPreview = async () => {
    try {
      onBusy(true);
      const next = await previewValuation();
      onRefresh(next);
      setPreviewed(true);
      onSuccess(t("GK_STEP5_PREVIEW_OK", "Đã tính thử giá xuất — chưa ghi đè."));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const runConfirm = async () => {
    const ok = await confirm(
      t(
        "GK_STEP5_CONFIRM",
        "Ghi đè giá vốn theo bình quân gia quyền. Không tạo bút toán trùng. DEMO không ghi DB. Tiếp tục?",
      ),
      t("GK_STEP5_TITLE", "Tính lại & đối chiếu giá xuất"),
    );
    if (!ok) return;
    try {
      onBusy(true);
      const next = await confirmValuation();
      onRefresh(next);
      setPreviewed(false);
      onSuccess(t("GK_STEP5_OK", "Đã mô phỏng đối chiếu / ghi đè giá vốn thành phẩm."));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  return (
    <StepShell
      stepNo="05"
      stepIndex={5}
      title={t("GK_STEP5_TITLE", "Tính lại & đối chiếu giá xuất")}
      desc={t("GK_STEP5_SUB", "Xuất bán → 632/155") + " · " + t("GK_ENGINE_GK", "Nghiệp vụ G-K")}
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
            text={t("GK_COST_PREVIEW", "Tính thử")}
            stylingMode="outlined"
            disabled={busy || locked || waiting}
            onClick={() => void runPreview()}
          />
          <Button
            text={t("GK_RECONCILE", "Xác nhận cập nhật / đối chiếu")}
            type="default"
            disabled={busy || locked || waiting || (runStatus === "REOPENED" && !previewed && overview.compareRows.length === 0)}
            onClick={() => void runConfirm()}
          />
        </>
      }
    >
      <div className="gk-summary-band">
        <div className="big">632</div>
        <div className="explain">
          <div className="title">{t("GK_STEP5_BAND", "Tính lại giá xuất theo phương pháp kho (mock)")}</div>
          <div className="desc">
            {t(
              "GK_STEP5_BAND_DESC",
              "Không dùng SL xuất × đơn giá TP kỳ này cho mọi trường hợp. Demo áp dụng bình quân gia quyền tồn đầu + nhập kỳ.",
            )}
          </div>
        </div>
      </div>

      <div className="gk-columns">
        <div className="gk-mini tinted">
          <div className="title">{t("GK_SOLD_QTY", "Tổng SL xuất bán")}</div>
          <div className="num">
            {formatMoney(overview.valuationRows.reduce((s, r) => s + r.soldQty, 0))} TP
          </div>
        </div>
        <div className="gk-mini tinted">
          <div className="title">{t("GK_PROPOSED_COGS", "Giá vốn đề xuất (BQGQ)")}</div>
          <div className="num">{overview.doneFlags[3] ? `${formatMoney(proposedTotal)} đ` : "—"}</div>
          <div className="small">
            {overview.doneFlags[3]
              ? t(
                  "GK_VS_NAIVE",
                  `Nếu nhân đơn giá kỳ: ${formatMoney(naiveTotal)} đ (chênh ${formatMoney(naiveTotal - proposedTotal)})`,
                )
              : t("GK_NEED_STEP4", "Cần hoàn tất bước 4")}
          </div>
        </div>
      </div>

      <div className="gk-tab-bar">
        {(
          [
            ["export", t("GK_TAB_EXPORT", "Giá xuất kho")],
            ["diff", t("GK_TAB_DIFF", "Chênh lệch")],
            ["reconcile", t("GK_TAB_RECON", "Đối chiếu")],
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

      <DataGrid dataSource={overview.valuationRows} keyExpr="saleNo" showBorders columnAutoWidth height={280}>
        <Paging enabled={false} />
        <Column dataField="saleNo" caption={t("SALE_NO", "Chứng từ")} width={120} />
        <Column dataField="productCd" caption={t("PRODUCT_CD", "Mã TP")} width={90} />
        <Column dataField="productName" caption={t("PRODUCT_NM", "Thành phẩm")} />
        {tab === "export" ? (
          <>
            <Column dataField="openingQty" caption={t("OPEN_QTY", "Tồn đầu SL")} dataType="number" width={90} />
            <Column dataField="openingUnitCost" caption={t("OPEN_PRICE", "ĐG tồn đầu")} dataType="number" format="#,##0" width={100} />
            <Column dataField="periodInQty" caption={t("IN_QTY", "Nhập SL")} dataType="number" width={80} />
            <Column dataField="periodInUnitCost" caption={t("IN_PRICE", "ĐG nhập")} dataType="number" format="#,##0.##" width={100} />
            <Column dataField="soldQty" caption={t("SOLD_QTY", "Xuất SL")} dataType="number" width={80} />
            <Column dataField="method" caption={t("METHOD", "Phương pháp")} />
          </>
        ) : null}
        {tab === "diff" || tab === "reconcile" ? (
          <>
            <Column dataField="soldQty" caption={t("SOLD_QTY", "Xuất SL")} dataType="number" width={80} />
            <Column dataField="proposedCogs" caption={t("PROPOSED", "GV đề xuất")} dataType="number" format="#,##0" width={120} />
            <Column dataField="currentCogs" caption={t("CURRENT", "GV hiện tại")} dataType="number" format="#,##0" width={120} />
            <Column dataField="status" caption={t("STATUS", "Trạng thái")} />
          </>
        ) : null}
        <Summary>
          <TotalItem column="proposedCogs" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
        </Summary>
      </DataGrid>

      {tab === "reconcile" ? (
        <div>
          <div className="gk-sectiontitle">{t("GK_ENTRY_COGS", "Bút toán xuất bán thành phẩm")}</div>
          <div className="gk-workflow">
            <span className="mark">Nợ 632</span>
            <span className="mark">Có 155</span>
            <span>{t("GK_NO_NEW_SALE", "Không tạo phiếu bán mới")}</span>
          </div>
        </div>
      ) : null}

      {overview.compareRows.length > 0 ? <CostingCompareTable rows={overview.compareRows} t={t} /> : null}

      <Notice type={locked ? "good" : "warn"}>
        {locked
          ? t("GK_STEP5_DONE", "Giá vốn đã đối chiếu (mock). Chạy lại sau mở lại sẽ ghi đè cùng chứng từ C-A.")
          : t(
              "GK_STEP5_HINT",
              "Tính thử để xem chênh lệch; xác nhận mới ghi đè. DEMO mô phỏng BQGQ, không tạo bút toán trùng.",
            )}
      </Notice>
    </StepShell>
  );
}
