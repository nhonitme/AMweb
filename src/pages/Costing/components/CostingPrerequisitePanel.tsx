/**
 * Bước 00 — Kiểm tra dữ liệu đầu vào trước khi chạy các bước khóa/tính.
 * Tick checkbox: chỉ Draft trên frontend (0 API). Lưu DB một lần khi nhấn Bước tiếp.
 */

import { useMemo } from "react";
import DataGrid, { Column, Paging } from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import CheckBox from "devextreme-react/check-box";
import {
  applyDraftProductionCostObjectSelection,
  saveProductionCostObjectSelectionIfDirty,
} from "@/api/productionCostingApi";
import { formatGkMessage, StepShell, type PanelCommonProps } from "./costingPanelShared";
import type {
  CostObjectCandidate,
  PrerequisiteValidationStatus,
} from "../types/productionCostingTypes";

function statusPill(
  status: PrerequisiteValidationStatus,
  t: (key: string, fallback: string) => string,
): { className: string; label: string } {
  if (status === "SUCCESS") {
    return { className: "gk-pill done", label: t("GK_PREREQ_STATUS_SUCCESS", "✓ Đạt") };
  }
  if (status === "WARNING") {
    return { className: "gk-pill warn", label: t("GK_PREREQ_STATUS_WARNING", "⚠ Cảnh báo") };
  }
  if (status === "ERROR") {
    return { className: "gk-pill error", label: t("GK_PREREQ_STATUS_ERROR", "✕ Lỗi chặn") };
  }
  return {
    className: "gk-pill",
    label: t("GK_PREREQ_STATUS_NOT_CHECKED", "○ Chưa kiểm tra"),
  };
}

function isSelectableObject(row: CostObjectCandidate): boolean {
  return (
    row.departmentId > 0 &&
    Number(row.productId) > 0 &&
    !row.hasWarning
  );
}

export function CostingPrerequisitePanel({
  overview,
  busy,
  t,
  onRefresh,
  onBusy,
  onError,
  onNext,
  onSyncObjects,
}: PanelCommonProps) {
  const validation = overview.prerequisiteValidation;
  const pill = statusPill(validation.status, t);
  const canProceed =
    validation.status === "SUCCESS" || validation.status === "WARNING";

  const selectableRows = useMemo(
    () => overview.objects.filter(isSelectableObject),
    [overview.objects],
  );

  const headerCheckValue = useMemo((): boolean | null => {
    if (selectableRows.length === 0) return false;
    const selectedCount = selectableRows.filter((row) => row.selected).length;
    if (selectedCount === 0) return false;
    if (selectedCount === selectableRows.length) return true;
    return null;
  }, [selectableRows]);

  const applyDraft = (
    updates: Array<{ departmentId: number; productId: number; selected: boolean }>,
  ) => {
    if (updates.length === 0) return;
    try {
      onRefresh(applyDraftProductionCostObjectSelection(updates));
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    }
  };

  const handleToggle = (departmentId: number, productId: number, selected: boolean) => {
    if (departmentId <= 0 || productId <= 0) {
      onError(t("GK_CANNOT_SELECT_ORPHAN", "Không chọn được TP thiếu đối tượng."));
      return;
    }
    applyDraft([{ departmentId, productId, selected }]);
  };

  const handleHeaderToggle = (selected: boolean) => {
    const updates = selectableRows
      .filter((row) => row.selected !== selected)
      .map((row) => ({
        departmentId: row.departmentId,
        productId: Number(row.productId),
        selected,
      }));
    applyDraft(updates);
  };

  const handleNext = async () => {
    if (!canProceed) {
      onError(
        t(
          "GK_PREREQ_BLOCKED",
          "Còn lỗi chặn trên Bước 00. Kiểm tra danh sách đối tượng trước khi sang bước tiếp.",
        ),
      );
      return;
    }
    try {
      onBusy(true);
      const next = await saveProductionCostObjectSelectionIfDirty();
      onRefresh(next);
      onNext?.();
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  return (
    <StepShell
      stepNo="00"
      title={t("GK_PREREQ_TITLE", "Kiểm tra dữ liệu đầu vào")}
      desc={t("GK_STEP0_SUB", "Đối tượng · Thành phẩm · Phiếu nhập")}
      done={canProceed}
      waiting={validation.status === "NOT_CHECKED"}
      fillBody
      t={t}
      onNext={canProceed ? () => void handleNext() : undefined}
      rightActions={
        onSyncObjects ? (
          <Button
            text={t("GK_SYNC_OBJECTS", "Đồng bộ đối tượng từ nhập kho")}
            stylingMode="outlined"
            disabled={busy}
            onClick={onSyncObjects}
          />
        ) : null
      }
    >
      <div className="gk-summary-band">
        <div className="big"></div>
        <div className="explain">
          <div className="title">{t("GK_PREREQ_BAND", "Chuẩn bị trước khi chạy 6 bước")}</div>
          <div className="desc">
            {t(
              "GK_PREREQ_BAND_DESC",
              "Chọn đối tượng hợp lệ. TP thiếu DEPARTMENT_ID chỉ cảnh báo, không cho ghi giá thành.",
            )}
          </div>
        </div>
        <span className={pill.className}>
          {validation.status === "ERROR"
            ? t("GK_PREREQ_ERROR_COUNT", "lỗi chặn")
            : validation.status === "WARNING"
              ? formatGkMessage(t("GK_WARN_COUNT", "{0} cảnh báo"), validation.warningCount)
              : pill.label}
        </span>
      </div>

      <div className="gk-columns">
        <div className="gk-mini tinted">
          <div className="title">{t("GK_STAT_OBJECTS", "Đối tượng")}</div>
          <div className="num">{overview.stats.objectCount}</div>
        </div>
        <div className="gk-mini tinted">
          <div className="title">{t("GK_STAT_RECEIPTS_FG", "Phiếu nhập TP")}</div>
          <div className="num">{overview.stats.receiptCount}</div>
        </div>
      </div>

      <div className="gk-object-grid-block">
        <div className="gk-sectiontitle">{t("GK_OBJECT_GRID", "Danh sách đối tượng / thành phẩm")}</div>
        <div className="gk-object-grid-container">
          <DataGrid
            dataSource={overview.objects}
            keyExpr="objectSelId"
            showBorders
            columnAutoWidth
            hoverStateEnabled
            focusedRowEnabled={false}
            height="100%"
            className="gk-object-grid"
          >
            <Paging enabled={false} />
            <Column
              caption=""
              width={50}
              alignment="center"
              allowSorting={false}
              allowFiltering={false}
              allowReordering={false}
              // Tránh DataGrid gắn focus overlay (gạch dưới Fluent) khi tick checkbox trong cell.
              cssClass="dx-cell-focus-disabled gk-object-select-col"
              headerCellRender={() => (
                <div
                  className="gk-object-select-cell gk-object-select-header"
                  onMouseDown={(event) => event.stopPropagation()}
                  onClick={(event) => event.stopPropagation()}
                >
                  <CheckBox
                    value={headerCheckValue}
                    disabled={busy || selectableRows.length === 0}
                    enableThreeStateBehavior={false}
                    onValueChanged={(e) => {
                      if (!e.event) return;
                      if (typeof e.value !== "boolean") return;
                      handleHeaderToggle(e.value);
                    }}
                  />
                </div>
              )}
              cellRender={(cell) => {
                const row = cell.data as CostObjectCandidate;
                const cannotSelect = busy || !isSelectableObject(row);
                return (
                  <div
                    className="gk-object-select-cell"
                    onMouseDown={(event) => event.stopPropagation()}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <CheckBox
                      value={row.selected}
                      disabled={cannotSelect}
                      onValueChanged={(e) => {
                        if (!e.event) return;
                        if (typeof e.value === "boolean" && e.value !== row.selected) {
                          handleToggle(row.departmentId, Number(row.productId), e.value);
                        }
                      }}
                    />
                  </div>
                );
              }}
            />
            <Column dataField="departmentCd" caption={t("DEPARTMENT_CD", "Mã ĐT")} width={200} />
            <Column dataField="departmentName" caption={t("DEPARTMENT_NM", "Đối tượng")} />
            <Column dataField="productCd" caption={t("PRODUCT_CD", "Mã TP")} width={100} />
            <Column dataField="productName" caption={t("PRODUCT_NM", "Thành phẩm")} />
            <Column dataField="finishedQty" caption={t("QTY", "SL")} width={80} dataType="number" />
            <Column dataField="receiptCount" caption={t("RECEIPT_COUNT", "Phiếu NK")} width={90} />
            <Column dataField="warningText" caption={t("WARNING", "Cảnh báo")} />
          </DataGrid>
        </div>
      </div>
    </StepShell>
  );
}
