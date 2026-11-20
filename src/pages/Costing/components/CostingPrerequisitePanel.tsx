/**
 * Bước 00 — Kiểm tra dữ liệu đầu vào trước khi chạy các bước khóa/tính.
 * Trạng thái lấy từ backend PrerequisiteValidation; không có nút kiểm tra thủ công.
 */

import DataGrid, { Column, Paging } from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import CheckBox from "devextreme-react/check-box";
import { toggleProductionCostObject } from "@/api/productionCostingApi";
import { formatGkMessage, Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";
import type { PrerequisiteValidationStatus } from "../types/productionCostingTypes";

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

export function CostingPrerequisitePanel({
  overview,
  busy,
  t,
  onRefresh,
  onBusy,
  onError,
  onSuccess,
  onNext,
}: PanelCommonProps) {
  const validation = overview.prerequisiteValidation;
  const pill = statusPill(validation.status, t);
  const canProceed =
    validation.status === "SUCCESS" || validation.status === "WARNING";

  const handleToggle = async (departmentId: number, productId: number, selected: boolean) => {
    if (departmentId <= 0 || productId <= 0) {
      onError(t("GK_CANNOT_SELECT_ORPHAN", "Không chọn được TP thiếu đối tượng."));
      return;
    }
    try {
      onBusy(true);
      const next = await toggleProductionCostObject(departmentId, productId, selected);
      onRefresh(next);
    } catch (err) {
      onError(err instanceof Error ? err.message : String(err));
    } finally {
      onBusy(false);
    }
  };

  const handleSelectAllValid = async () => {
    try {
      onBusy(true);
      let next = overview;
      for (const row of overview.objects) {
        if (row.departmentId > 0 && Number(row.productId) > 0 && !row.selected && !row.hasWarning) {
          next = await toggleProductionCostObject(row.departmentId, Number(row.productId), true);
        }
      }
      onRefresh(next);
      onSuccess(t("GK_SELECT_ALL_OK", "Đã chọn tất cả đối tượng hợp lệ."));
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
      t={t}
      onNext={canProceed ? onNext : undefined}
      rightActions={
        <Button
          text={t("GK_SELECT_ALL_VALID", "Chọn tất cả hợp lệ")}
          stylingMode="outlined"
          disabled={busy}
          onClick={() => void handleSelectAllValid()}
        />
      }
    >
      <div className="gk-summary-band">
        <div className="big">00</div>
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
            ? formatGkMessage(t("GK_PREREQ_ERROR_COUNT", "{0} lỗi chặn"), validation.errorCount)
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

      <div className="gk-sectiontitle">{t("GK_OBJECT_GRID", "Danh sách đối tượng / thành phẩm")}</div>
      <DataGrid
        dataSource={overview.objects}
        keyExpr="objectSelId"
        showBorders
        columnAutoWidth
        hoverStateEnabled
        height={280}
      >
        <Paging pageSize={10} />
        <Column
          caption={t("SELECT", "Chọn")}
          width={70}
          cellRender={(cell) => {
            const row = cell.data as {
              departmentId: number;
              productId: number;
              selected: boolean;
              hasWarning: boolean;
            };
            return (
              <CheckBox
                value={row.selected}
                disabled={busy || row.departmentId <= 0 || row.hasWarning}
                onValueChanged={(e) => {
                  if (typeof e.value === "boolean" && e.value !== row.selected) {
                    void handleToggle(row.departmentId, row.productId, e.value);
                  }
                }}
              />
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

      {overview.warnings.map((w) => (
        <Notice key={w.id} type={w.level === "error" ? "err" : w.level === "warn" ? "warn" : "info"}>
          {w.message}
        </Notice>
      ))}
    </StepShell>
  );
}
