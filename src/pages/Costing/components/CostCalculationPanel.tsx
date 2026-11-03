/**
 * Bước 4 — Tính giá thành / chi phí dở dang theo CONG_THUC_TINH_DO_DANG.md (mock).
 * FE-04: Mở lại → Điều chỉnh → Tính thử → Chênh lệch → Xác nhận ghi đè.
 */

import { useMemo, useState } from "react";
import DataGrid, {
  Column,
  Editing,
  Paging,
  Summary,
  TotalItem,
  type DataGridTypes,
} from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import RadioGroup from "devextreme-react/radio-group";
import SelectBox from "devextreme-react/select-box";
import { confirm } from "devextreme/ui/dialog";
import {
  patchWipRow,
  postCostingRun,
  previewCostingRun,
  setIncompleteCostPreset,
  setWipMethod,
} from "@/api/productionCostingApi";
import type { WipDetailRow, WipMethod } from "../types/productionCostingTypes";
import { formatMoney, Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";
import { CostingCompareTable } from "./CostingCompareTable";

type TabKey = "aggregate" | "wip" | "receipt" | "result";

const WIP_METHOD_OPTIONS: Array<{ value: WipMethod; text: string }> = [
  { value: "PERCENT_COMPLETED", text: "Theo NVL chính – Hoàn thành (%)" },
  { value: "CLOSING_WIP_QUANTITY", text: "Theo NVL chính – Số lượng dở dang cuối kỳ" },
];

const PRESET_OPTIONS = [
  { value: "standard", text: "Chuẩn (mặc định)" },
  { value: "sl_tp_sx_p08", text: "SL TP SX — p=0.8" },
  { value: "sl_tp_sx_p07", text: "SL TP SX — p=0.7" },
  { value: "id2720_p05", text: "ID2720 — tách 621/62N p=0.5" },
];

export function CostCalculationPanel({
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
  const runStatus = overview.stepStatuses[3];
  const locked = runStatus === "DONE";
  const waiting = overview.stepStatuses[2] !== "DONE";
  const [tab, setTab] = useState<TabKey>("wip");

  const method = overview.wipMethod;
  const enableReduce = overview.incompleteConfig.enableProductReduce;
  const isPercent = method === "PERCENT_COMPLETED";
  const isSpecial = overview.incompleteConfig.mode !== "STANDARD";

  const wipErrors = useMemo(
    () => overview.wipDetailRows.flatMap((r) => r.errors),
    [overview.wipDetailRows],
  );

  const run = async (action: "preview" | "post") => {
    try {
      onBusy(true);
      if (action === "post") {
        if (wipErrors.length) {
          onError(wipErrors[0]);
          return;
        }
        const ok = await confirm(
          t(
            "GK_STEP4_CONFIRM",
            `Xác nhận lưu snapshot giá thành của ${overview.receiptRows.length} phiếu INPUT_ID? Bước này chưa cập nhật kho.`,
          ),
          t("GK_STEP4_TITLE", "Tính & ghi nhận giá thành"),
        );
        if (!ok) return;
      }
      const next = action === "preview" ? await previewCostingRun() : await postCostingRun();
      onRefresh(next);
      onSuccess(
        action === "preview"
          ? t("GK_COST_PREVIEW_OK", "Đã tính thử giá thành theo công thức dở dang.")
          : t("GK_COST_POST_OK", "Backend đã lưu snapshot giá thành."),
      );
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const applyMethod = async (next: WipMethod) => {
    try {
      onBusy(true);
      onRefresh(await setWipMethod(next));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const applyPreset = async (presetKey: string) => {
    try {
      onBusy(true);
      onRefresh(await setIncompleteCostPreset(presetKey));
      onSuccess(t("GK_WIP_PRESET_OK", "Đã áp dụng cấu hình dở dang mẫu."));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const onWipUpdating = (e: DataGridTypes.RowUpdatingEvent<WipDetailRow>) => {
    const productId = e.oldData.productId;
    const patch: Record<string, number> = {};
    const n = e.newData;
    if (n.percentCompleted != null) patch.percentCompleted = Number(n.percentCompleted);
    if (n.closingIncompleteQty != null) patch.closingIncompleteQty = Number(n.closingIncompleteQty);
    if (n.closingIncompleteAmount154 != null) {
      patch.closingIncompleteAmount154 = Number(n.closingIncompleteAmount154);
    }
    if (n.amount154Direct != null) patch.amount154Direct = Number(n.amount154Direct);
    if (n.productReduce != null) patch.productReduce = Number(n.productReduce);
    if (n.beforeAmountResult621 != null) patch.beforeAmountResult621 = Number(n.beforeAmountResult621);
    if (n.beforeAmountResult62N != null) patch.beforeAmountResult62N = Number(n.beforeAmountResult62N);
    if (n.incompleteQtyOpening != null) patch.incompleteQtyOpening = Number(n.incompleteQtyOpening);

    e.cancel = true;
    if (Object.keys(patch).length === 0) return;

    void (async () => {
      try {
        onBusy(true);
        onRefresh(await patchWipRow(productId, patch));
      } catch (err) {
        onError(err instanceof Error ? err.message : String(err));
      } finally {
        onBusy(false);
      }
    })();
  };

  return (
    <StepShell
      stepNo="04"
      stepIndex={4}
      title={t("GK_STEP4_TITLE", "Tính & ghi nhận giá thành")}
      desc={t("GK_STEP4_SUB", "Dở dang → 155/154") + " · " + t("GK_ENGINE_GK", "Nghiệp vụ G-K")}
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
            disabled={busy || locked || waiting || wipErrors.length > 0}
            onClick={() => void run("preview")}
          />
          <Button
            text={t("GK_COST_POST", "Xác nhận & cập nhật NK TP")}
            type="default"
            disabled={busy || locked || waiting || !overview.costPreviewed || wipErrors.length > 0}
            onClick={() => void run("post")}
          />
        </>
      }
    >
      <div className="gk-summary-band">
        <div className="big">155</div>
        <div className="explain">
          <div className="title">{t("GK_STEP4_BAND", "Tính giá thành và ghi giá vào phiếu nhập thành phẩm")}</div>
          <div className="desc">
            {t(
              "GK_STEP4_BAND_DESC",
              "TOTAL_COST = ROUND(BEFORE_154 + TOTAL_INCURRED − CLOSING_154, 0). Nguồn 622/627 từ Bước 2 — không cộng trùng kết chuyển Bước 3.",
            )}
          </div>
        </div>
      </div>

      <div className="gk-toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="gk-toolleft" style={{ flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <RadioGroup
            items={WIP_METHOD_OPTIONS}
            value={method}
            valueExpr="value"
            displayExpr="text"
            layout="vertical"
            disabled={busy || locked || waiting}
            onValueChanged={(e) => {
              if (e.value === "PERCENT_COMPLETED" || e.value === "CLOSING_WIP_QUANTITY") {
                void applyMethod(e.value);
              }
            }}
          />
          <label className="gk-rate-field">
            {t("GK_WIP_PRESET", "Cấu hình đặc biệt (demo)")}
            <SelectBox
              items={PRESET_OPTIONS}
              value={overview.incompleteConfig.presetKey}
              valueExpr="value"
              displayExpr="text"
              width={220}
              disabled={busy || locked || waiting}
              onValueChanged={(e) => {
                if (typeof e.value === "string") void applyPreset(e.value);
              }}
            />
          </label>
          {isSpecial ? (
            <span className="gk-pill warn">
              p={overview.incompleteConfig.incompletePercent} · {overview.incompleteConfig.mode}
            </span>
          ) : (
            <span className="gk-pill">{t("GK_WIP_STANDARD", "Công thức chuẩn")}</span>
          )}
        </div>
      </div>

      <div className="gk-tab-bar">
        {(
          [
            ["aggregate", t("GK_TAB_AGG", "Tập hợp chi phí")],
            ["wip", t("GK_TAB_WIP", "Chi phí dở dang")],
            ["receipt", t("GK_TAB_RECEIPT", "Cập nhật giá NK TP")],
            ["result", t("GK_TAB_RESULT", "Kết quả & ghi nhận")],
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

      {tab === "aggregate" || tab === "result" ? (
        <DataGrid dataSource={overview.aggregateRows} keyExpr="productId" showBorders columnAutoWidth height={280}>
          <Paging enabled={false} />
          <Column dataField="productCd" caption={t("PRODUCT_CD", "Mã TP")} width={90} />
          <Column dataField="productName" caption={t("PRODUCT_NM", "Thành phẩm")} />
          <Column dataField="amount621" caption="621" dataType="number" format="#,##0" width={100} />
          <Column dataField="amount6212" caption="6212" dataType="number" format="#,##0" width={90} />
          <Column dataField="amount622" caption="622" dataType="number" format="#,##0" width={100} />
          <Column dataField="amount627" caption="627" dataType="number" format="#,##0" width={100} />
          <Column dataField="amount154Direct" caption="154 TT" dataType="number" format="#,##0" width={90} />
          <Column dataField="periodCost" caption={t("PERIOD_COST", "CP kỳ")} dataType="number" format="#,##0" width={110} />
          <Column dataField="openingWip" caption={t("OPEN_WIP", "DD đầu")} dataType="number" format="#,##0" width={110} />
          <Column dataField="closingWip" caption={t("CLOSE_WIP", "DD cuối")} dataType="number" format="#,##0" width={110} />
          <Column dataField="finishedCost" caption={t("FINISHED_COST", "Giá thành")} dataType="number" format="#,##0" width={120} />
          <Column dataField="unitCost" caption={t("UNIT_COST", "Đơn giá")} dataType="number" format="#,##0.##" width={110} />
          <Summary>
            <TotalItem column="finishedCost" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
          </Summary>
        </DataGrid>
      ) : null}

      {tab === "wip" ? (
        <DataGrid
          dataSource={overview.wipDetailRows}
          keyExpr="productId"
          showBorders
          columnAutoWidth
          height={360}
          onRowUpdating={onWipUpdating}
        >
          <Paging enabled={false} />
          {!locked && !waiting ? <Editing mode="cell" allowUpdating /> : null}
          <Column dataField="productCd" caption={t("PRODUCT_CD", "Mã TP")} width={90} allowEditing={false} />
          <Column dataField="productName" caption={t("PRODUCT_NM", "Thành phẩm")} width={120} allowEditing={false} />
          <Column dataField="departmentCd" caption={t("DEPARTMENT", "Đối tượng")} width={100} allowEditing={false} />
          <Column
            dataField="incompleteQtyOpening"
            caption={t("WIP_QTY_OPEN", "SL DD ĐK")}
            dataType="number"
            format="#,##0"
            width={90}
            allowEditing
          />
          <Column
            dataField="beforeAmountResult621"
            caption={t("BEFORE_621", "154 ĐK 621")}
            dataType="number"
            format="#,##0"
            width={110}
            allowEditing
          />
          <Column
            dataField="beforeAmountResult62N"
            caption={t("BEFORE_62N", "154 ĐK 62N")}
            dataType="number"
            format="#,##0"
            width={110}
            allowEditing
          />
          <Column
            dataField="beforeAmount154"
            caption={t("BEFORE_154", "Tổng ĐK 154")}
            dataType="number"
            format="#,##0"
            width={110}
            allowEditing={false}
          />
          <Column dataField="amount621" caption="621" dataType="number" format="#,##0" width={100} allowEditing={false} />
          <Column dataField="amount6212" caption="6212" dataType="number" format="#,##0" width={90} allowEditing={false} />
          <Column dataField="amount622" caption="622" dataType="number" format="#,##0" width={100} allowEditing={false} />
          <Column dataField="amount627" caption="627" dataType="number" format="#,##0" width={100} allowEditing={false} />
          <Column
            dataField="amount154Direct"
            caption={t("AMOUNT_154", "154 TT")}
            dataType="number"
            format="#,##0"
            width={90}
            allowEditing
          />
          <Column
            dataField="totalAmountIncurred"
            caption={t("TOTAL_INCURRED", "Tổng CP kỳ")}
            dataType="number"
            format="#,##0"
            width={110}
            allowEditing={false}
          />
          <Column
            dataField="quantity"
            caption={t("QTY_FINISHED", "SL HT")}
            dataType="number"
            format="#,##0"
            width={80}
            allowEditing={false}
          />
          <Column
            dataField="percentCompleted"
            caption={t("PERCENT_COMPLETED", "Hoàn thành %")}
            dataType="number"
            format="#,##0.##"
            width={110}
            allowEditing={isPercent && !isSpecial}
          />
          <Column
            dataField="closingIncompleteQty"
            caption={t("CLOSING_WIP_QTY", "SL DD CK")}
            dataType="number"
            format="#,##0"
            width={100}
            allowEditing={(!isPercent || isSpecial) && !locked}
          />
          <Column
            dataField="amountResult621"
            caption={t("RESULT_621", "DD CK 621")}
            dataType="number"
            format="#,##0"
            width={110}
            allowEditing={false}
          />
          <Column
            dataField="amountResult62N"
            caption={t("RESULT_62N", "DD CK 62N")}
            dataType="number"
            format="#,##0"
            width={110}
            allowEditing={false}
          />
          <Column
            dataField="closingIncompleteAmount154"
            caption={t("CLOSING_154", "Tổng DD CK 154")}
            dataType="number"
            format="#,##0"
            width={130}
            allowEditing={isPercent && !isSpecial}
          />
          <Column
            dataField="productReduce"
            caption={t("PRODUCT_REDUCE", "Điều chỉnh giảm")}
            dataType="number"
            format="#,##0"
            width={120}
            allowEditing={enableReduce}
          />
          <Column
            dataField="totalCostPrice"
            caption={t("TOTAL_COST", "Tổng giá thành")}
            dataType="number"
            format="#,##0"
            width={120}
            allowEditing={false}
          />
          <Column
            dataField="unitCost"
            caption={t("UNIT_COST", "Đơn giá")}
            dataType="number"
            format="#,##0.##"
            width={110}
            allowEditing={false}
          />
          {isSpecial ? (
            <Column dataField="qHt" caption="Q_ht" dataType="number" format="#,##0.##" width={80} allowEditing={false} />
          ) : null}
          <Summary>
            <TotalItem column="totalCostPrice" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
            <TotalItem column="closingIncompleteAmount154" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
          </Summary>
        </DataGrid>
      ) : null}

      {tab === "receipt" ? (
        <DataGrid dataSource={overview.receiptRows} keyExpr="inputId" showBorders columnAutoWidth height={320}>
          <Paging enabled={false} />
          <Column dataField="productCd" caption={t("PRODUCT_CD", "Mã TP")} width={90} />
          <Column dataField="finishedQty" caption={t("QTY_FINISHED", "SL HT")} dataType="number" width={80} />
          <Column
            dataField="finishedCost"
            caption={t("TOTAL_COST", "Giá thành HT")}
            dataType="number"
            format="#,##0"
            width={120}
          />
          <Column dataField="inventoryNo" caption={t("INVENTORY_NO", "Số phiếu NK")} width={140} />
          <Column dataField="qty" caption={t("QTY", "SL phiếu")} dataType="number" width={80} />
          <Column
            dataField="oldUnitPrice"
            caption={t("OLD_UNIT", "Đơn giá cũ")}
            dataType="number"
            format="#,##0.##"
            width={110}
          />
          <Column
            dataField="newUnitPrice"
            caption={t("NEW_UNIT", "Đơn giá mới")}
            dataType="number"
            format="#,##0.##"
            width={110}
          />
          <Column
            dataField="oldAmount"
            caption={t("OLD_AMT", "Thành tiền cũ")}
            dataType="number"
            format="#,##0"
            width={120}
          />
          <Column
            dataField="newAmount"
            caption={t("NEW_AMT", "Thành tiền mới")}
            dataType="number"
            format="#,##0"
            width={120}
          />
          <Column
            dataField="deltaAmount"
            caption={t("DELTA", "Chênh lệch")}
            dataType="number"
            format="#,##0"
            width={110}
          />
          <Column
            dataField="posted"
            caption={t("STATUS", "Trạng thái")}
            width={100}
            calculateCellValue={(r: { posted: boolean }) =>
              r.posted ? t("POSTED", "Đã ghi") : t("PENDING", "Chờ ghi")
            }
          />
          <Column dataField="inputId" caption="INPUT_ID" width={90} />
        </DataGrid>
      ) : null}

      {tab === "wip" ? (
        <Notice type="info">
          {isPercent
            ? t(
                "GK_WIP_HINT_PCT",
                "CLOSING_154 = (BEFORE_154 + 621) × (100 − %) / 100. Có thể sửa % hoặc điền tay DD CK để tính ngược %.",
              )
            : t(
                "GK_WIP_HINT_QTY",
                "CLOSING_154 = (BEFORE_154 + 621) / (Q + Qdd) × Qdd. Q lấy từ SL nhập thành phẩm. Qdd = 0 → DD CK = 0.",
              )}
        </Notice>
      ) : null}

      {wipErrors.length > 0 ? (
        <Notice type="warn">{wipErrors[0]}</Notice>
      ) : null}

      {(runStatus === "REOPENED" || overview.costPreviewed) && overview.compareRows.length > 0 ? (
        <CostingCompareTable rows={overview.compareRows} t={t} />
      ) : null}

      <Notice type={locked ? "good" : overview.costPreviewed ? "info" : "warn"}>
        {locked
          ? t(
              "GK_STEP4_DONE",
              `Snapshot giá thành ${formatMoney(overview.aggregateRows.reduce((s, r) => s + r.finishedCost, 0))} đ. Kho chưa đổi ở bước này.`,
            )
          : overview.costPreviewed
            ? t("GK_STEP4_PREVIEWED", "Đã tính thử — chưa ghi đè. Xác nhận mới cập nhật đơn giá chính thức.")
            : overview.hasPostedCosting && runStatus === "REOPENED"
              ? t("GK_STEP4_KEEP_OLD", "Đã mở lại: đơn giá cũ vẫn giữ. Sửa DD → Tính thử → Xác nhận ghi đè.")
              : t("GK_STEP4_NEED", "Chọn phương pháp dở dang, chỉnh % hoặc SL, bấm Tính thử rồi Xác nhận.")}
      </Notice>
    </StepShell>
  );
}
