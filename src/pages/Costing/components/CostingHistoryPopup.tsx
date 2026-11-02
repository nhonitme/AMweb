/**
 * Popup nhật ký thao tác demo / lịch sử phiên (mock).
 */

import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import type { CostingLogItem } from "../types/productionCostingTypes";

type CostingHistoryPopupProps = {
  visible: boolean;
  logs: CostingLogItem[];
  t: (key: string, fallback: string) => string;
  onClose: () => void;
};

export function CostingHistoryPopup({ visible, logs, t, onClose }: CostingHistoryPopupProps) {
  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled
      showCloseButton
      title={t("GK_HISTORY_TITLE", "Nhật ký thao tác demo")}
      width={560}
      height={420}
    >
      <div style={{ padding: "8px 4px", maxHeight: 320, overflow: "auto" }}>
        {logs.length === 0 ? (
          <div className="gk-muted">{t("GK_HISTORY_EMPTY", "Chưa có thao tác.")}</div>
        ) : (
          logs.map((item, idx) => (
            <div className="gk-log-line" key={`${item.at}-${idx}`}>
              <span className="gk-log-time">{item.at}</span>
              <span>{item.message}</span>
            </div>
          ))
        )}
      </div>
      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 8 }}>
        <Button text={t("CLOSE", "Đóng")} onClick={onClose} />
      </div>
    </Popup>
  );
}
