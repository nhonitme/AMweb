/**
 * Bước 0 — Kiểm tra dữ liệu đầu vào trước khi chạy các bước khóa/tính.
 */

import { useMemo } from "react";
import DataGrid, { Column, Paging } from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import CheckBox from "devextreme-react/check-box";
import notify from "devextreme/ui/notify";
import { toggleProductionCostObject } from "@/api/productionCostingApi";
import { Notice, StepShell, type PanelCommonProps } from "./costingPanelShared";

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
  const errorCount = useMemo(
    () => overview.warnings.filter((w) => w.level === "error").length,
    [overview.warnings],
  );

  const handleToggle = async (departmentId: number, selected: boolean) => {
    if (departmentId <= 0) {
      onError(t("GK_CANNOT_SELECT_ORPHAN", "Không chọn được TP thiếu đối tượng."));
      return;
    }
    try {
      onBusy(true);
      const next = await toggleProductionCostObject(departmentId, selected);
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
        if (row.departmentId > 0 && !row.selected) {
          next = await toggleProductionCostObject(row.departmentId, true);
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

  const handleValidate = () => {
    if (errorCount > 0) {
      notify(
        t(
          "GK_PREREQ_HAS_ERROR",
          `Có ${errorCount} cảnh báo lỗi. Không ghi nhận giá thành cho TP thiếu đối tượng.`,
        ),
        "warning",
        3500,
      );
      return;
    }
    onSuccess(t("GK_PREREQ_OK", "Dữ liệu đầu vào hợp lệ cho các đối tượng đã chọn."));
  };

  return (
    <StepShell
      stepNo="00"
      title={t("GK_PREREQ_TITLE", "Kiểm tra dữ liệu đầu vào")}
      desc={t("GK_PREREQ_DESC", "Đối tượng · thành phẩm · phiếu nhập · cảnh báo")}
      done={errorCount === 0}
      waiting={false}
      t={t}
      onNext={onNext}
      rightActions={
        <>
          <Button
            text={t("GK_SELECT_ALL_VALID", "Chọn tất cả hợp lệ")}
            stylingMode="outlined"
            disabled={busy}
            onClick={() => void handleSelectAllValid()}
          />
          <Button
            text={t("GK_VALIDATE", "Kiểm tra dữ liệu")}
            type="default"
            disabled={busy}
            onClick={handleValidate}
          />
        </>
      }
    >
      <div className="gk-summary-band">
        <div className="big">0</div>
        <div className="explain">
          <div className="title">{t("GK_PREREQ_BAND", "Chuẩn bị trước khi chạy 6 bước")}</div>
          <div className="desc">
            {t(
              "GK_PREREQ_BAND_DESC",
              "Chọn đối tượng hợp lệ. TP thiếu DEPARTMENT_ID chỉ cảnh báo, không cho ghi giá thành.",
            )}
          </div>
        </div>
        <span className={`gk-pill ${errorCount ? "error" : "done"}`}>
          {errorCount
            ? t("GK_WARN_COUNT", `${errorCount} cảnh báo`)
            : t("GK_NO_ERROR", "Không lỗi chặn")}
        </span>
      </div>

      <div className="gk-columns">
        <div className="gk-mini tinted">
          <div className="title">{t("GK_STAT_OBJECTS", "Đối tượng")}</div>
          <div className="num">{overview.stats.objectCount}</div>
        </div>
        <div className="gk-mini tinted">
          <div className="title">{t("GK_STAT_RECEIPTS", "Phiếu nhập TP")}</div>
          <div className="num">{overview.stats.receiptCount}</div>
        </div>
      </div>

      <div className="gk-sectiontitle">{t("GK_OBJECT_GRID", "Danh sách đối tượng / thành phẩm")}</div>
      <DataGrid
        dataSource={overview.objects}
        keyExpr="productId"
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
              selected: boolean;
              hasWarning: boolean;
            };
            return (
              <CheckBox
                value={row.selected}
                disabled={busy || row.departmentId <= 0 || row.hasWarning}
                onValueChanged={(e) => {
                  if (typeof e.value === "boolean" && e.value !== row.selected) {
                    void handleToggle(row.departmentId, e.value);
                  }
                }}
              />
            );
          }}
        />
        <Column dataField="departmentCd" caption={t("DEPARTMENT_CD", "Mã ĐT")} width={100} />
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
