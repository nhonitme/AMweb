/**
 * Popup lịch sử thực hiện / mở lại theo bước (FE-04).
 */

import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import DataGrid, { Column, Paging, Scrolling } from "devextreme-react/data-grid";
import type { CostingStepHistoryItem } from "../types/productionCostingTypes";

type CostingStepHistoryPopupProps = {
  visible: boolean;
  stepIndex: number | null;
  items: CostingStepHistoryItem[];
  t: (key: string, fallback: string) => string;
  onClose: () => void;
};

const ACTION_LABEL: Record<string, string> = {
  EXECUTE: "Thực hiện",
  REOPEN: "Mở lại",
  PREVIEW: "Tính lại",
  CONFIRM: "Xác nhận",
  ERROR: "Lỗi",
};

export function CostingStepHistoryPopup({
  visible,
  stepIndex,
  items,
  t,
  onClose,
}: CostingStepHistoryPopupProps) {
  const filtered = stepIndex ? items.filter((x) => x.stepIndex === stepIndex) : items;

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled
      showCloseButton
      title={
        stepIndex
          ? t("GK_STEP_HISTORY_TITLE", `Lịch sử bước ${stepIndex}`)
          : t("GK_ALL_HISTORY", "Lịch sử toàn bộ bước")
      }
      width={900}
      height={480}
    >
      <DataGrid dataSource={filtered} keyExpr="id" showBorders columnAutoWidth height={360}>
        <Paging pageSize={12} />
        <Scrolling mode="virtual" />
        <Column dataField="runNo" caption={t("GK_RUN_NO", "Lần")} width={60} />
        <Column
          dataField="action"
          caption={t("GK_ACTION", "Hành động")}
          width={100}
          calculateCellValue={(r: CostingStepHistoryItem) => ACTION_LABEL[r.action] ?? r.action}
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
    </Popup>
  );
}
