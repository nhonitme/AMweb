/**
 * Header trang G-K: chọn kỳ, khởi tạo / đồng bộ, rồi Kiểm tra đầu vào và Lịch sử.
 */

import Button from "devextreme-react/button";
import SelectBox from "devextreme-react/select-box";

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
  busy: boolean;
  t: (key: string, fallback: string) => string;
  onChangePeriod: (periodYm: string) => void;
  onEnsurePeriod: () => void;
  onSyncObjects: () => void;
  onOpenPrerequisite: () => void;
  onOpenHistory: () => void;
};

export function CostingHeader({
  periodYm,
  busy,
  t,
  onChangePeriod,
  onEnsurePeriod,
  onSyncObjects,
  onOpenPrerequisite,
  onOpenHistory,
}: CostingHeaderProps) {
  return (
    <div className="gk-header">
      <div className="gk-header-lead">
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
          text={t("GK_PERIOD_ENSURE", "Khởi tạo kỳ")}
          stylingMode="outlined"
          disabled={busy}
          onClick={onEnsurePeriod}
        />
        <Button
          text={t("GK_SYNC_OBJECTS", "Đồng bộ đối tượng từ nhập kho")}
          stylingMode="outlined"
          disabled={busy}
          onClick={onSyncObjects}
        />
      </div>
      <div className="gk-header-actions">
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
