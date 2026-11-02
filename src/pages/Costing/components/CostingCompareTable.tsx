/**
 * Bảng so sánh kết quả cũ / mới / chênh lệch sau tính thử (FE-04).
 */

import DataGrid, { Column, Paging } from "devextreme-react/data-grid";
import type { CostingCompareRow } from "../types/productionCostingTypes";
import { formatMoney } from "./costingPanelShared";

type CostingCompareTableProps = {
  rows: CostingCompareRow[];
  t: (key: string, fallback: string) => string;
};

export function CostingCompareTable({ rows, t }: CostingCompareTableProps) {
  if (!rows.length) return null;

  return (
    <div style={{ marginTop: 12 }}>
      <div className="gk-sectiontitle">{t("GK_COMPARE_TITLE", "So sánh kết quả cũ / mới (tính thử — chưa ghi đè)")}</div>
      <DataGrid dataSource={rows} keyExpr="id" showBorders columnAutoWidth height={220}>
        <Paging enabled={false} />
        <Column dataField="indicator" caption={t("GK_INDICATOR", "Chỉ tiêu")} />
        <Column
          dataField="oldValue"
          caption={t("GK_OLD_VALUE", "Kết quả cũ")}
          dataType="number"
          customizeText={(e) => formatMoney(Number(e.value))}
          width={130}
        />
        <Column
          dataField="newValue"
          caption={t("GK_NEW_VALUE", "Kết quả mới")}
          dataType="number"
          customizeText={(e) => formatMoney(Number(e.value))}
          width={130}
        />
        <Column
          dataField="delta"
          caption={t("GK_DELTA", "Chênh lệch")}
          dataType="number"
          customizeText={(e) => {
            const v = Number(e.value) || 0;
            const sign = v > 0 ? "+" : "";
            return `${sign}${formatMoney(v)}`;
          }}
          width={120}
        />
      </DataGrid>
    </div>
  );
}
