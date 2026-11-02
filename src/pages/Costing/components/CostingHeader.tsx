/**
 * Header trang G-K: tiêu đề, chọn kỳ, nút Kiểm tra đầu vào / Lịch sử / Đặt lại demo.
 */

import Button from "devextreme-react/button";
import SelectBox from "devextreme-react/select-box";
import { MOCK_PERIOD_OPTIONS } from "../mock/productionCostingMockData";
import type { PeriodMonthStatus } from "../types/productionCostingTypes";

type CostingHeaderProps = {
  periodYm: string;
  monthStatus: PeriodMonthStatus;
  busy: boolean;
  t: (key: string, fallback: string) => string;
  onChangePeriod: (periodYm: string) => void;
  onOpenPrerequisite: () => void;
  onOpenHistory: () => void;
  onResetDemo: () => void;
};

export function CostingHeader({
  periodYm,
  monthStatus,
  busy,
  t,
  onChangePeriod,
  onOpenPrerequisite,
  onOpenHistory,
  onResetDemo,
}: CostingHeaderProps) {
  return (
    <div className="gk-header">
      <div>
        <h1>{t("GK_PAGE_TITLE", "Quy trình tính giá thành giản đơn")}</h1>
        <div className="gk-muted">
          {t(
            "GK_PAGE_SUBTITLE",
            "Một màn hình từ khóa sổ bước 1 đến bước 3 · Dùng lại chức năng khóa sổ B-I, không chuyển trang",
          )}
          {" · "}
          {t("GK_PERIOD_STATUS", "Trạng thái kỳ")}: <strong>{monthStatus}</strong>
        </div>
      </div>
      <div className="gk-header-actions">
        <div className="gk-period-group">
          <span>{t("GK_PERIOD", "Kỳ kế toán")}</span>
          <SelectBox
            dataSource={MOCK_PERIOD_OPTIONS}
            displayExpr="text"
            valueExpr="value"
            value={periodYm}
            width={120}
            disabled={busy}
            onValueChanged={(e) => {
              if (typeof e.value === "string" && e.value !== periodYm) {
                onChangePeriod(e.value);
              }
            }}
          />
        </div>
        <Button
          text={t("GK_CHECK_INPUT", "Kiểm tra đầu vào")}
          stylingMode="outlined"
          disabled={busy}
          onClick={onOpenPrerequisite}
        />
        <Button
          text={t("GK_HISTORY", "Lịch sử")}
          stylingMode="outlined"
          disabled={busy}
          onClick={onOpenHistory}
        />
        <Button
          text={t("GK_RESET_DEMO", "Đặt lại demo")}
          stylingMode="outlined"
          type="danger"
          disabled={busy}
          onClick={onResetDemo}
        />
      </div>
    </div>
  );
}
