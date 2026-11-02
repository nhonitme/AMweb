/**
 * Bước 2 — Phân bổ chi phí 622/627 theo công thức frmAllocateCosts (mock).
 * allocate_type 0 = NVL chính (N621/C152); 1 = SL TP nhập kho (N155/C154).
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
import CheckBox from "devextreme-react/check-box";
import RadioGroup from "devextreme-react/radio-group";
import {
  confirmAllocation,
  previewAllocation,
  setAllocateType,
  setAllocationByDepartment,
  setAllocationInclude6212,
  setPoolReduction,
} from "@/api/productionCostingApi";
import type { AllocateType, AllocationPoolRow } from "../types/productionCostingTypes";
import { formatMoney, Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";
import { CostingCompareTable } from "./CostingCompareTable";

type TabKey = "pool" | "products";

const ALLOCATE_OPTIONS: Array<{ value: AllocateType; text: string }> = [
  { value: 0, text: "Theo NVL chính (Nợ 621 / Có 152)" },
  { value: 1, text: "Theo SL thành phẩm nhập kho (Nợ 155 / Có 154)" },
];

export function CostAllocationPanel({
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
  const runStatus = overview.stepStatuses[1];
  const locked = runStatus === "DONE";
  const waiting = overview.stepStatuses[0] !== "DONE";
  const [tab, setTab] = useState<TabKey>("pool");

  const accountColumns = useMemo(
    () => overview.allocationPoolRows.map((r) => r.accountCd),
    [overview.allocationPoolRows],
  );

  const productGridRows = useMemo(() => {
    return overview.allocationProductRows.map((row) => {
      const flat: Record<string, string | number> = {
        productId: row.productId,
        productCd: row.productCd,
        productName: row.productName,
        departmentCd: row.departmentCd,
        amountQuantity: row.amountQuantity,
        quantity: row.quantity,
        amount6211: row.amount6211,
        amount6212: row.amount6212,
        amount622: row.amount622,
        amount627: row.amount627,
      };
      for (const acc of accountColumns) {
        flat[`acc_${acc}`] = row.allocatedByAccount[acc] ?? 0;
      }
      return flat;
    });
  }, [overview.allocationProductRows, accountColumns]);

  const run = async (
    action:
      | "preview"
      | "confirm"
      | "type"
      | "reduction"
      | "byDept"
      | "include6212",
    payload?: { allocateType?: AllocateType; poolRowId?: string; reduction?: number; enabled?: boolean },
  ) => {
    try {
      onBusy(true);
      let next = overview;
      if (action === "type" && payload?.allocateType != null) {
        next = await setAllocateType(payload.allocateType);
      }
      if (action === "reduction" && payload?.poolRowId != null && payload.reduction != null) {
        next = await setPoolReduction(payload.poolRowId, payload.reduction);
      }
      if (action === "byDept" && payload?.enabled != null) {
        next = await setAllocationByDepartment(payload.enabled);
      }
      if (action === "include6212" && payload?.enabled != null) {
        next = await setAllocationInclude6212(payload.enabled);
      }
      if (action === "preview") next = await previewAllocation();
      if (action === "confirm") next = await confirmAllocation();
      onRefresh(next);
      if (action === "preview") onSuccess(t("GK_ALLOC_PREVIEW_OK", "Đã tính lại phân bổ theo công thức tài liệu."));
      if (action === "confirm") onSuccess(t("GK_ALLOC_CONFIRM_OK", "Đã xác nhận phân bổ (ghi đè kết quả cũ)."));
      if (action === "reduction") onSuccess(t("GK_ALLOC_REDUCTION_OK", "Đã cập nhật điều chỉnh giảm và tính lại pool."));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const onPoolSaving = (e: DataGridTypes.RowUpdatingEvent<AllocationPoolRow>) => {
    const id = e.oldData.id;
    const nextReduction = e.newData.reduction;
    if (typeof nextReduction === "number" && nextReduction !== e.oldData.reduction) {
      e.cancel = true;
      void run("reduction", { poolRowId: id, reduction: nextReduction });
    }
  };

  const basisCaption =
    overview.allocateType === 0
      ? t("GK_BASIS_NVL", "Chi phí 621 (N621/C152)")
      : t("GK_BASIS_QTY", "SL TP nhập kho (N155/C154)");

  return (
    <StepShell
      stepNo="02"
      stepIndex={2}
      title={t("GK_STEP2_TITLE", "Phân bổ 622 / 627")}
      desc={t("GK_STEP2_SUB", "Theo đối tượng giá thành") + " · " + t("GK_ENGINE_GK", "Nghiệp vụ G-K")}
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
            text={t("GK_PREVIEW_ALLOC", "Tính lại phân bổ")}
            stylingMode="outlined"
            disabled={busy || locked || waiting}
            onClick={() => void run("preview")}
          />
          <Button
            text={t("GK_CONFIRM_ALLOC", "Xác nhận phân bổ")}
            type="default"
            disabled={busy || locked || waiting || !overview.allocationPreviewed}
            onClick={() => void run("confirm")}
          />
        </>
      }
    >
      <div className="gk-summary-band">
        <div className="big">622/627</div>
        <div className="explain">
          <div className="title">{t("GK_ALLOC_BAND", "Phân bổ chi phí dùng chung theo công thức frmAllocateCosts")}</div>
          <div className="desc">
            {t(
              "GK_ALLOC_BAND_DESC",
              "P_A = total − reduction; chia theo tỷ trọng tiêu thức; dòng cuối nhận phần dư làm tròn.",
            )}
          </div>
        </div>
      </div>

      <div className="gk-columns">
        <div className="gk-mini">
          <div className="title">{t("GK_SHARED_622", "Pool P_A 622*")}</div>
          <div className="num">{formatMoney(overview.sharedLabor)} đ</div>
        </div>
        <div className="gk-mini">
          <div className="title">{t("GK_SHARED_627", "Pool P_A 627*")}</div>
          <div className="num">{formatMoney(overview.sharedOverhead)} đ</div>
        </div>
      </div>

      <div className="gk-toolbar" style={{ flexWrap: "wrap", gap: 12 }}>
        <div className="gk-toolleft" style={{ flexWrap: "wrap", gap: 16, alignItems: "center" }}>
          <RadioGroup
            items={ALLOCATE_OPTIONS}
            value={overview.allocateType}
            valueExpr="value"
            displayExpr="text"
            layout="horizontal"
            disabled={busy || locked || waiting}
            onValueChanged={(e) => {
              if (e.value === 0 || e.value === 1) void run("type", { allocateType: e.value });
            }}
          />
          <CheckBox
            text={t("GK_BY_DEPT", "Theo DEPARTMENT_CD")}
            value={overview.is622_627_byDepartment}
            disabled={busy || locked || waiting}
            onValueChanged={(e) => {
              if (typeof e.value === "boolean") void run("byDept", { enabled: e.value });
            }}
          />
          <CheckBox
            text={t("GK_INCLUDE_6212", "Gồm TK 6212")}
            value={overview.is6212}
            disabled={busy || locked || waiting}
            onValueChanged={(e) => {
              if (typeof e.value === "boolean") void run("include6212", { enabled: e.value });
            }}
          />
          <span className="gk-pill">
            NUMBER_DIGIT = {overview.allocationNumberDigit}
          </span>
        </div>
      </div>

      <Notice type="info">
        {overview.allocateType === 0
          ? t(
              "GK_HINT_NVL",
              "Tiêu thức NVL chính lấy từ giá trị xuất N621/C152 theo mã TP — không dùng tỷ lệ BOM lý thuyết.",
            )
          : t(
              "GK_HINT_QTY",
              "Tiêu thức TPNK lấy từ số lượng nhập N155/C154 theo mã TP.",
            )}
      </Notice>

      <div className="gk-tab-bar">
        {(
          [
            ["pool", t("GK_TAB_POOL", "Tổng hợp chi phí nguồn")],
            ["products", t("GK_TAB_PRODUCTS", "Phân bổ theo mã TP")],
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

      {tab === "pool" ? (
        <DataGrid
          dataSource={overview.allocationPoolRows}
          keyExpr="id"
          showBorders
          columnAutoWidth
          height={300}
          onRowUpdating={onPoolSaving}
        >
          <Paging enabled={false} />
          <Editing mode="cell" allowUpdating={!locked && !waiting && !busy} />
          <Column dataField="accountCd" caption={t("ACCOUNT", "TK")} width={80} allowEditing={false} />
          <Column dataField="credit" caption={t("CREDIT", "Có")} width={70} allowEditing={false} />
          <Column
            dataField="totalAmount"
            caption={t("TOTAL_AMOUNT", "Số phát sinh nợ")}
            dataType="number"
            format="#,##0"
            width={140}
            allowEditing={false}
          />
          <Column
            dataField="fcAmount"
            caption={t("FC_AMOUNT", "FC")}
            dataType="number"
            format="#,##0.##"
            width={90}
            allowEditing={false}
          />
          <Column
            dataField="reduction"
            caption={t("REDUCTION", "Điều chỉnh giảm")}
            dataType="number"
            format="#,##0"
            width={140}
            allowEditing
          />
          <Column
            dataField="allocationCosts"
            caption={t("ALLOC_COSTS", "Chi phí phân bổ P_A")}
            dataType="number"
            format="#,##0"
            width={150}
            allowEditing={false}
          />
          <Column
            dataField="departmentCd"
            caption={t("DEPARTMENT", "Đối tượng")}
            width={100}
            allowEditing={false}
          />
          <Summary>
            <TotalItem column="totalAmount" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
            <TotalItem column="allocationCosts" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
          </Summary>
        </DataGrid>
      ) : null}

      {tab === "products" ? (
        <DataGrid dataSource={productGridRows} keyExpr="productId" showBorders columnAutoWidth height={340}>
          <Paging enabled={false} />
          <Column dataField="productCd" caption={t("PRODUCT_CD", "Mã TP")} width={90} />
          <Column dataField="productName" caption={t("PRODUCT_NM", "Thành phẩm")} width={140} />
          <Column dataField="departmentCd" caption={t("DEPARTMENT", "Đối tượng")} width={100} />
          <Column
            dataField={overview.allocateType === 0 ? "amountQuantity" : "quantity"}
            caption={basisCaption}
            dataType="number"
            format="#,##0"
            width={160}
          />
          {accountColumns.map((acc) => (
            <Column
              key={acc}
              dataField={`acc_${acc}`}
              caption={`PB ${acc}`}
              dataType="number"
              format="#,##0"
              width={120}
            />
          ))}
          <Column dataField="amount622" caption="Σ 622*" dataType="number" format="#,##0" width={110} />
          <Column dataField="amount627" caption="Σ 627*" dataType="number" format="#,##0" width={110} />
          <Summary>
            {accountColumns.map((acc) => (
              <TotalItem
                key={`sum-${acc}`}
                column={`acc_${acc}`}
                summaryType="sum"
                valueFormat="#,##0"
                displayFormat="{0}"
              />
            ))}
            <TotalItem column="amount622" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
            <TotalItem column="amount627" summaryType="sum" valueFormat="#,##0" displayFormat="{0}" />
          </Summary>
        </DataGrid>
      ) : null}

      {runStatus === "REOPENED" && overview.allocationPreviewed ? (
        <CostingCompareTable rows={overview.compareRows} t={t} />
      ) : null}

      <Notice type={locked ? "good" : overview.allocationPreviewed ? "info" : "warn"}>
        {locked
          ? t("GK_ALLOC_DONE", "Đã xác nhận phân bổ. Bước 3/4 đọc kết quả chi tiết theo từng TK và mã TP.")
          : overview.allocationPreviewed
            ? t(
                "GK_ALLOC_PREVIEWED",
                "Đã tính thử. Kiểm tra 2 lưới rồi nhấn Xác nhận (ghi đè nếu đang mở lại — FE-04).",
              )
            : t(
                "GK_ALLOC_NEED_PREVIEW",
                "Chọn phương pháp / chỉnh reduction rồi nhấn Tính lại phân bổ.",
              )}
      </Notice>
    </StepShell>
  );
}
