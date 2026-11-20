/**
 * Popup lịch sử thực hiện / mở lại theo bước (FE-04).
 * Portal ra body — tránh widget DX chiếm chỗ flex .gk-page khi mở.
 */

import { createPortal } from "react-dom";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import DataGrid, { Column, Paging, Scrolling } from "devextreme-react/data-grid";
import type { CostingStepHistoryItem } from "../types/productionCostingTypes";
import { formatGkMessage } from "./costingPanelShared";

type CostingStepHistoryPopupProps = {
  visible: boolean;
  stepIndex: number | null;
  items: CostingStepHistoryItem[];
  t: (key: string, fallback: string) => string;
  onClose: () => void;
};

function actionLabel(action: string, t: (key: string, fallback: string) => string): string {
  if (action === "EXECUTE") return t("GK_ACT_EXECUTE", "Thực hiện");
  if (action === "REOPEN") return t("GK_ACT_REOPEN", "Mở lại");
  if (action === "PREVIEW") return t("GK_ACT_PREVIEW", "Tính lại");
  if (action === "CONFIRM") return t("GK_ACT_CONFIRM", "Xác nhận");
  if (action === "ERROR") return t("GK_ACT_ERROR", "Lỗi");
  return action;
}

export function CostingStepHistoryPopup({
  visible,
  stepIndex,
  items,
  t,
  onClose,
}: CostingStepHistoryPopupProps) {
  const filtered = stepIndex ? items.filter((x) => x.stepIndex === stepIndex) : items;

  if (typeof document === "undefined") return null;

  return createPortal(
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled
      showCloseButton
      title={
        stepIndex
          ? formatGkMessage(t("GK_STEP_HISTORY_TITLE", "Lịch sử bước {0}"), stepIndex)
          : t("GK_ALL_HISTORY", "Lịch sử toàn bộ bước")
      }
      width={900}
      height={480}
      container="body"
      position={{ my: "center", at: "center", of: window }}
    >
      <DataGrid dataSource={filtered} keyExpr="id" showBorders columnAutoWidth height={360}>
        <Paging pageSize={12} />
        <Scrolling mode="virtual" />
        <Column dataField="runNo" caption={t("GK_RUN_NO", "Lần")} width={60} />
        <Column
          dataField="action"
          caption={t("GK_ACTION", "Hành động")}
          width={100}
          calculateCellValue={(r: CostingStepHistoryItem) => actionLabel(r.action, t)}
        />
        <Column dataField="status" caption={t("STATUS", "Trạng thái")} width={100} />
        <Column dataField="resultBefore" caption={t("GK_BEFORE", "Kết quả trước")} />
        <Column dataField="resultAfter" caption={t("GK_AFTER", "Kết quả sau")} />
        <Column dataField="difference" caption={t("GK_DELTA", "Chênh lệch")} width={110} />
        <Column dataField="userName" caption={t("USER", "Người")} width={100} />
        <Column dataField="at" caption={t("TIME", "Thời gian")} width={140} />
        <Column dataField="reason" caption={t("REASON", "Lý do")} />
        <Column dataField="runId" caption={t("RUN_ID", "Mã phiên")} width={140} />
        <Column dataField="voucherRefs" caption={t("VOUCHER", "Chứng từ")} width={140} />
      </DataGrid>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Button text={t("CLOSE", "Đóng")} onClick={onClose} />
      </div>
    </Popup>,
    document.body,
  );
}
