/**
 * Popup xác nhận mở lại bước (FE-04).
 * Hủy → không đổi trạng thái. Xác nhận → REOPENED, giữ số liệu cũ.
 */

import { useEffect, useState } from "react";
import Popup from "devextreme-react/popup";
import Button from "devextreme-react/button";
import TextArea from "devextreme-react/text-area";
import type { CostingReopenInfo } from "../types/productionCostingTypes";
import { formatGkMessage, Notice } from "./costingPanelShared";

type CostingReopenPopupProps = {
  visible: boolean;
  info: CostingReopenInfo | null;
  busy: boolean;
  t: (key: string, fallback: string) => string;
  onClose: () => void;
  onConfirm: (reason: string) => void;
};

export function CostingReopenPopup({
  visible,
  info,
  busy,
  t,
  onClose,
  onConfirm,
}: CostingReopenPopupProps) {
  const [reason, setReason] = useState("");
  const [showImpact, setShowImpact] = useState(false);

  useEffect(() => {
    if (visible) {
      setReason("");
      setShowImpact(false);
    }
  }, [visible, info?.stepIndex]);

  if (!info) return null;

  const canSubmit = info.canReopen && reason.trim().length >= 3 && !busy;

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled
      showCloseButton
      title={formatGkMessage(t("GK_REOPEN_TITLE", "Mở lại bước {0}"), info.stepIndex)}
      width={640}
      height="auto"
      maxHeight="90vh"
    >
      <div style={{ padding: "4px 2px 12px", display: "flex", flexDirection: "column", gap: 10 }}>
        <div className="gk-columns">
          <div className="gk-mini">
            <div className="title">{t("GK_STEP", "Bước")}</div>
            <div className="num" style={{ fontSize: 14 }}>
              {info.stepIndex}. {info.stepTitle}
            </div>
            <div className="small">{info.stepCode}</div>
          </div>
          <div className="gk-mini">
            <div className="title">{t("GK_PERIOD_COMPANY", "Kỳ / Công ty")}</div>
            <div className="num" style={{ fontSize: 14 }}>
              {info.periodYm} / {info.companyCd}
            </div>
            <div className="small">
              {t("STATUS", "Trạng thái")}: {info.currentStatus}
            </div>
          </div>
        </div>

        <div className="gk-mini">
          <div className="title">{t("GK_LAST_COMPLETE", "Lần hoàn thành trước")}</div>
          <div className="small">
            {info.completedBy} · {info.completedAt}
          </div>
        </div>

        <div className="gk-sectiontitle">{t("GK_RELATED", "Kết quả / chứng từ liên quan")}</div>
        <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12 }}>
          {info.relatedResults.map((r) => (
            <li key={r}>{r}</li>
          ))}
        </ul>

        {info.blockingDependents.length > 0 ? (
          <Notice type="info">
            {info.blockReason}
            <div style={{ marginTop: 6 }}>
              {t("GK_BLOCKING_LIST", "Các bước DONE phía sau sẽ được mở tự động theo thứ tự ngược")}:{" "}
              {info.blockingDependents.map((b) => `${b.stepIndex} (${b.status})`).join(", ")}
            </div>
          </Notice>
        ) : (
          <Notice type="warn">
            {info.warnings.map((w) => (
              <div key={w}>{w}</div>
            ))}
          </Notice>
        )}

        {showImpact ? (
          <Notice type="info">
            {t(
              "GK_IMPACT_TEXT",
              "Ảnh hưởng: backend tự hoàn nguyên các bước DONE phụ thuộc trong cùng transaction (bao gồm B-I khi cần), sau đó đưa G-K về REOPENED. Lịch sử phiên cũ được giữ để đối chiếu.",
            )}
          </Notice>
        ) : null}

        <div className="gk-sectiontitle">{t("GK_REOPEN_REASON", "Lý do mở lại (bắt buộc)")}</div>
        <TextArea
          value={reason}
          height={80}
          disabled={!info.canReopen || busy}
          onValueChanged={(e) => setReason(String(e.value ?? ""))}
          placeholder={t("GK_REOPEN_REASON_PH", "Nhập lý do điều chỉnh / tính lại…")}
        />

        <div style={{ display: "flex", justifyContent: "flex-end", gap: 8, flexWrap: "wrap" }}>
          <Button
            text={t("GK_VIEW_IMPACT", "Xem ảnh hưởng")}
            stylingMode="outlined"
            disabled={busy}
            onClick={() => setShowImpact(true)}
          />
          <Button text={t("CANCEL", "Hủy")} stylingMode="outlined" disabled={busy} onClick={onClose} />
          <Button
            text={t("GK_CONFIRM_REOPEN", "Xác nhận mở lại")}
            type="default"
            disabled={!canSubmit}
            onClick={() => onConfirm(reason.trim())}
          />
        </div>
      </div>
    </Popup>
  );
}
