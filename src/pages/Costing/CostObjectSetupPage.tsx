import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import DataGrid, { Column, FilterRow, HeaderFilter, Paging, Pager, Selection, Scrolling } from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import TextBox from "devextreme-react/text-box";
import SelectBox from "devextreme-react/select-box";
import notify from "devextreme/ui/notify";
import { confirm } from "devextreme/ui/dialog";
import type dxDataGrid from "devextreme/ui/data_grid";
import { useNavigate } from "react-router-dom";

import DxPage from "@/dx/DxPage";
import { LanguageContext } from "@/lib/i18nLoader";
import { getCurrentCompanyCd } from "@/lib/login";
import { getApiErrorMessage } from "@/api/apiTypes";
import { getCostObjectOverview, syncCostObjects, type CostObjectRow } from "@/api/costObjectApi";

type FilterStatus = "ALL" | "MISSING" | "REGISTERED";
const STATUS_OPTIONS = [
  { value: "ALL", text: "Tất cả" },
  { value: "MISSING", text: "Chưa khai báo" },
  { value: "REGISTERED", text: "Đã khai báo" },
];
const CODE_MAX_LENGTH = 20;

export default function CostObjectSetupPage() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string;
  };
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate]);
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const grid = useRef<dxDataGrid | null>(null);
  const companyCd = getCurrentCompanyCd();
  const [divisionInput, setDivisionInput] = useState("155");
  const [divisionPrefix, setDivisionPrefix] = useState("155");
  const [filter, setFilter] = useState<FilterStatus>("ALL");
  const [busy, setBusy] = useState(false);
  const queryKey = ["cost-objects", companyCd, divisionPrefix];

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => getCostObjectOverview(divisionPrefix),
    enabled: Boolean(companyCd),
  });

  const rows = useMemo(() => {
    const items = data?.ITEMS ?? [];
    return filter === "ALL" ? items : items.filter(item => item.STATUS === filter);
  }, [data, filter]);

  const selectedMissingIds = () => {
    const ids = new Set((grid.current?.getSelectedRowKeys() ?? []).map(Number));
    return rows.filter(row => ids.has(row.PRODUCT_ID) && row.STATUS === "MISSING").map(row => row.PRODUCT_ID);
  };

  const performSync = async (ids: number[]) => {
    if (!ids.length) {
      notify(t("COST_OBJECT_NO_MISSING", "Không có thành phẩm chưa khai báo được chọn."), "warning", 2500);
      return;
    }
    if (ids.length > 200) {
      notify(t("COST_OBJECT_MAX_200", "Mỗi lần đồng bộ tối đa 200 thành phẩm."), "warning", 3000);
      return;
    }
    const ok = await confirm(
      t("COST_OBJECT_SYNC_CONFIRM", "Tạo đối tượng tập hợp chi phí cho {0} thành phẩm?").replace("{0}", String(ids.length)),
      t("CONFIRM", "Xác nhận"),
    );
    if (!ok) return;
    setBusy(true);
    try {
      const result = await syncCostObjects(ids, divisionPrefix);
      await queryClient.invalidateQueries({ queryKey });
      grid.current?.clearSelection();
      notify(
        t("COST_OBJECT_SYNC_RESULT", "Đã tạo: {0}, đã tồn tại: {1}, lỗi: {2}")
          .replace("{0}", String(result.CREATED))
          .replace("{1}", String(result.EXISTS))
          .replace("{2}", String(result.FAILED)),
        result.FAILED ? "warning" : "success",
        5000,
      );
    } catch (e) {
      notify(getApiErrorMessage(e, t("COST_OBJECT_SYNC_ERROR", "Không đồng bộ được đối tượng tập hợp chi phí.")), "error", 5000);
    } finally {
      setBusy(false);
    }
  };

  const applyAccountFilter = () => {
    const value = divisionInput.trim();
    if (!/^\d{1,20}$/.test(value) || value.length > CODE_MAX_LENGTH) {
      notify(t("COST_OBJECT_ACCOUNT_INVALID", "Mã tài khoản phải có từ 1 đến 20 chữ số."), "warning", 3000);
      return;
    }
    setDivisionPrefix(value);
    grid.current?.clearSelection();
  };

  const startAllMissing = () => {
    const ids = (data?.ITEMS ?? []).filter(item => item.STATUS === "MISSING").map(item => item.PRODUCT_ID);
    void performSync(ids);
  };

  return (
    <DxPage>
      <div style={{ padding: 16, display: "flex", flexDirection: "column", gap: 12, width: "100%", minHeight: "100%" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 12 }}>
          <div>
            <h2 style={{ margin: "0 0 4px", fontSize: 20 }}>{t("COST_OBJECT_SETUP", "Khai báo đối tượng tập hợp chi phí")}</h2>
            <div style={{ opacity: 0.7, fontSize: 13 }}>{t("COST_OBJECT_RULE", "Một thành phẩm tương ứng một đối tượng; mã đối tượng = mã thành phẩm.")}</div>
          </div>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            <Button icon="plus" text={t("PRODUCT_LIST", "Danh mục thành phẩm")} onClick={() => navigate(`/app/${companyCd}/master/inventory`)} />
            <Button icon="refresh" text={t("REFRESH", "Làm mới")} onClick={() => void refetch()} disabled={busy} />
            <Button icon="check" type="default" stylingMode="contained" text={t("COST_OBJECT_SYNC_SELECTED", "Tạo đối tượng đã chọn")}
              onClick={() => void performSync(selectedMissingIds())} disabled={busy || isLoading} />
            <Button icon="repeat" type="success" stylingMode="contained" text={t("COST_OBJECT_SYNC_ALL", "Đồng bộ tất cả còn thiếu")}
              onClick={startAllMissing} disabled={busy || isLoading || !data?.MISSING || data.MISSING > 200} />
          </div>
        </div>
        <div style={{ display: "flex", gap: 20, flexWrap: "wrap", padding: "14px 16px", background: "var(--dx-color-surface, rgba(127,127,127,.06))", border: "1px solid var(--dx-color-border, #ddd)", borderRadius: 8 }}>
          <span>{t("TOTAL", "Tổng thành phẩm")}: <b>{data?.TOTAL ?? 0}</b></span>
          <span>{t("COST_OBJECT_REGISTERED", "Đã khai báo")}: <b>{data?.REGISTERED ?? 0}</b></span>
          <span>{t("COST_OBJECT_MISSING", "Chưa khai báo")}: <b>{data?.MISSING ?? 0}</b></span>
        </div>
        <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap" }}>
          <span>{t("COST_OBJECT_ACCOUNT", "TK thành phẩm")}:</span>
          <TextBox width={100} value={divisionInput} onValueChanged={e => setDivisionInput(String(e.value ?? ""))} onEnterKey={applyAccountFilter} />
          <Button icon="search" text={t("EXECUTE", "Thực hiện")} onClick={applyAccountFilter} />
          <span style={{ marginLeft: 12 }}>{t("STATUS", "Trạng thái")}:</span>
          <SelectBox width={175} dataSource={STATUS_OPTIONS} valueExpr="value" displayExpr="text" value={filter} onValueChanged={e => setFilter(e.value as FilterStatus)} />
          <span style={{ opacity: .65, fontSize: 12 }}>{t("COST_OBJECT_ACCOUNT_NOTE", "Lọc thành phẩm theo tiền tố tài khoản (mặc định 155).")}</span>
        </div>
        {error && <div style={{ color: "var(--dx-color-danger, #c33)" }}>{getApiErrorMessage(error, "Không tải được dữ liệu.")}</div>}
        <DataGrid<CostObjectRow, number>
          dataSource={rows}
          keyExpr="PRODUCT_ID"
          showBorders
          hoverStateEnabled
          allowColumnReordering
          columnAutoWidth
          width="100%"
          height="calc(100vh - 335px)"
          onInitialized={e => { grid.current = e.component ?? null; }}
        >
          <Selection mode="multiple" showCheckBoxesMode="always" />
          <FilterRow visible />
          <HeaderFilter visible />
          <Scrolling mode="standard" showScrollbar="always" />
          <Paging defaultPageSize={50} />
          <Pager visible showInfo showPageSizeSelector allowedPageSizes={[25, 50, 100]} />
          <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CD", "Mã thành phẩm")} width={160} />
          <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM_VIET", "Tên thành phẩm")} minWidth={260} />
          <Column dataField="DIVISION" caption={t("DIVISION_CD", "Tài khoản")} width={100} />
          <Column dataField="DEPARTMENT_CD" caption={t("COST_OBJECT_CD", "Mã đối tượng THCP")} width={180} />
          <Column dataField="DEP_NAME_VIET" caption={t("COST_OBJECT_NAME", "Tên đối tượng THCP")} minWidth={220} />
          <Column dataField="STATUS" caption={t("STATUS", "Trạng thái")} width={155}
            cellRender={e => <span style={{ color: e.data.STATUS === "REGISTERED" ? "#16803c" : "#ad7013", fontWeight: 600 }}>
              {e.data.STATUS === "REGISTERED" ? t("COST_OBJECT_REGISTERED", "Đã khai báo") : t("COST_OBJECT_MISSING", "Chưa khai báo")}
            </span>}
          />
          <Column caption={t("ACTION", "Thao tác")} width={100} allowFiltering={false} allowSorting={false}
            cellRender={e => e.data.STATUS === "MISSING"
              ? <Button text={t("CREATE", "Tạo")} type="default" stylingMode="text" disabled={busy}
                  onClick={() => void performSync([e.data.PRODUCT_ID])} />
              : <span style={{ opacity: .6 }}>✓</span>}
          />
        </DataGrid>
        {(busy || isFetching) && <div style={{ fontSize: 12, opacity: .7 }}>{t("LOADING", "Đang xử lý dữ liệu...")}</div>}
      </div>
    </DxPage>
  );
}
