/**
 * Header trang G-K: tiêu đề, chọn kỳ, nút Kiểm tra đầu vào / Lịch sử / Đặt lại demo.
 */

import Button from "devextreme-react/button";
import SelectBox from "devextreme-react/select-box";
import type { PeriodMonthStatus } from "../types/productionCostingTypes";

function periodOptions(selected: string): Array<{ value: string; text: string }> {
  const now = new Date();
  const values = new Set<string>();
  if (/^\d{6}$/.test(selected)) values.add(selected);
  for (let offset = 0; offset < 18; offset += 1) {
    const date = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    const month = String(date.getMonth() + 1).padStart(2, "0");
    values.add(`${date.getFullYear()}${month}`);
  }
  return [...values]
    .sort()
    .reverse()
    .map((value) => ({ value, text: `${value.slice(4, 6)}/${value.slice(0, 4)}` }));
}

type CostingHeaderProps = {
  periodYm: string;
  monthStatus: PeriodMonthStatus;
  busy: boolean;
  t: (key: string, fallback: string) => string;
  onChangePeriod: (periodYm: string) => void;
  onOpenPrerequisite: () => void;
  onOpenHistory: () => void;
};

export function CostingHeader({
  periodYm,
  monthStatus,
  busy,
  t,
  onChangePeriod,
  onOpenPrerequisite,
  onOpenHistory,
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
            dataSource={periodOptions(periodYm)}
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
      </div>
    </div>
  );
}
