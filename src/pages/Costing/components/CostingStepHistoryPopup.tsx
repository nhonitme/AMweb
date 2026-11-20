/**
 * Popup lịch sử thực hiện / mở lại theo bước (FE-04).
 * Portal ra body — tránh widget DX chiếm chỗ flex .gk-page khi mở.
 * Chỉ hiển thị 5 cột nghiệp vụ: STT | Thời gian | Hành động | Người thực hiện | Lý do.
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

type HistoryRow = CostingStepHistoryItem & { stt: number };

function actionLabel(action: string, t: (key: string, fallback: string) => string): string {
  if (action === "EXECUTE") return t("GK_ACT_EXECUTE", "Thực hiện khóa sổ");
  if (action === "REOPEN") return t("GK_ACT_REOPEN", "Mở lại bước");
  if (action === "PREVIEW") return t("GK_ACT_PREVIEW", "Tính thử");
  if (action === "RECALCULATE") return t("GK_ACT_RECALCULATE", "Tính lại");
  if (action === "CONFIRM") return t("GK_ACT_CONFIRM", "Xác nhận");
  if (action === "ERROR") return t("GK_ACT_ERROR", "Thực hiện lỗi");
  return action || "—";
}

function formatActionAt(value: string): string {
  if (!value) return "—";
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const dd = String(parsed.getDate()).padStart(2, "0");
  const mm = String(parsed.getMonth() + 1).padStart(2, "0");
  const yyyy = parsed.getFullYear();
  const hh = String(parsed.getHours()).padStart(2, "0");
  const mi = String(parsed.getMinutes()).padStart(2, "0");
  const ss = String(parsed.getSeconds()).padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${mi}:${ss}`;
}

function displayReason(reason: string | null | undefined): string {
  const trimmed = (reason ?? "").trim();
  return trimmed ? trimmed : "—";
}

export function CostingStepHistoryPopup({
  visible,
  stepIndex,
  items,
  t,
  onClose,
}: CostingStepHistoryPopupProps) {
  const filtered = (stepIndex ? items.filter((x) => x.stepIndex === stepIndex) : items)
    .slice()
    .sort((a, b) => {
      const atDiff = (Date.parse(b.at) || 0) - (Date.parse(a.at) || 0);
      if (atDiff !== 0) return atDiff;
      return String(b.id).localeCompare(String(a.id));
    });

  const rows: HistoryRow[] = filtered.map((item, index) => ({
    ...item,
    stt: index + 1,
  }));

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
      width={820}
      height={480}
      container="body"
      position={{ my: "center", at: "center", of: window }}
    >
      <div style={{ display: "flex", flexDirection: "column", height: "100%", minHeight: 0 }}>
        <DataGrid
          dataSource={rows}
          keyExpr="id"
          showBorders
          columnAutoWidth
          height="100%"
          style={{ flex: 1, minHeight: 0 }}
        >
          <Paging pageSize={12} />
          <Scrolling mode="virtual" />
          <Column dataField="stt" caption={t("STT", "STT")} width={60} alignment="center" allowSorting={false} />
          <Column
            dataField="at"
            caption={t("TIME", "Thời gian")}
            width={170}
            calculateCellValue={(r: HistoryRow) => formatActionAt(r.at)}
          />
          <Column
            dataField="action"
            caption={t("GK_ACTION", "Hành động")}
            width={160}
            calculateCellValue={(r: HistoryRow) => actionLabel(r.action, t)}
          />
          <Column dataField="userName" caption={t("GK_STEP1_HIS_BY", "Người thực hiện")} width={140} />
          <Column
            dataField="reason"
            caption={t("Reason_gk", "Lý do")}
            calculateCellValue={(r: HistoryRow) => displayReason(r.reason)}
          />
        </DataGrid>
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8, flexShrink: 0 }}>
          <Button text={t("CLOSE", "Đóng")} onClick={onClose} />
        </div>
      </div>
    </Popup>,
    document.body,
  );
}
