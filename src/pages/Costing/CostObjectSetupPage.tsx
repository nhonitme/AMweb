import { useCallback, useContext, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Column, Summary, TotalItem } from "devextreme-react/data-grid";
import LoadPanel from "devextreme-react/load-panel";
import Button from "devextreme-react/button";
import TextBox from "devextreme-react/text-box";
import SelectBox from "devextreme-react/select-box";
import notify from "devextreme/ui/notify";
import { confirm } from "devextreme/ui/dialog";
import type dxDataGrid from "devextreme/ui/data_grid";
import { useNavigate } from "react-router-dom";

import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { SummaryCard, formatNumber, getStatusClass } from "@/utils/openingBalanceHelpers";
import { LanguageContext } from "@/lib/i18nLoader";
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login";
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


  const total = data?.TOTAL ?? 0;
  const registered = data?.REGISTERED ?? 0;
  const missing = data?.MISSING ?? 0;
  const completionRate = total > 0 ? String(Math.round(registered * 100 / total)) + "%" : "—";

  return (
    <div className="min-h-full bg-gray-50 p-0">
      <LoadPanel
        visible={busy || isLoading || isFetching}
        shading
        showPane
        hideOnOutsideClick={false}
        message={t("LOADING", "Đang tải dữ liệu...")}
      />

      <div className="space-y-4">
        <div className="rounded-2xl border border-red-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-end md:justify-between md:p-5">
            <div className="flex flex-wrap items-end gap-3">
              <div className="min-w-[130px]">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("COST_OBJECT_ACCOUNT", "TK thành phẩm")}
                </div>
                <TextBox
                  width={140}
                  value={divisionInput}
                  stylingMode="outlined"
                  onValueChanged={e => setDivisionInput(String(e.value ?? ""))}
                  onEnterKey={applyAccountFilter}
                />
              </div>
              <div className="min-w-[170px]">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("STATUS", "Trạng thái")}
                </div>
                <SelectBox
                  width={185}
                  dataSource={STATUS_OPTIONS}
                  valueExpr="value"
                  displayExpr="text"
                  value={filter}
                  stylingMode="outlined"
                  onValueChanged={e => {
                    setFilter(e.value as FilterStatus);
                    grid.current?.clearSelection();
                  }}
                />
              </div>
              <Button
                text={t("EXECUTE", "Thực hiện")}
                stylingMode="contained"
                type="default"
                onClick={applyAccountFilter}
                disabled={busy}
              />
              <Button
                text={t("RELOAD_PAGE", "Tải lại")}
                stylingMode="outlined"
                onClick={() => void refetch()}
                disabled={busy}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                icon="plus"
                text={t("PRODUCT_LIST", "Danh mục thành phẩm")}
                stylingMode="outlined"
                onClick={() => navigate(buildAppPath(companyCd, "/master/inventory"))}
              />
              <Button
                icon="check"
                text={t("COST_OBJECT_SYNC_SELECTED", "Tạo đối tượng đã chọn")}
                type="default"
                stylingMode="contained"
                onClick={() => void performSync(selectedMissingIds())}
                disabled={busy || isLoading}
              />
              <Button
                icon="repeat"
                text={t("COST_OBJECT_SYNC_ALL", "Đồng bộ tất cả còn thiếu")}
                type="success"
                stylingMode="contained"
                onClick={startAllMissing}
                disabled={busy || isLoading || !missing || missing > 200}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <SummaryCard title={t("TOTAL", "Tổng thành phẩm")} value={formatNumber(total)} subtitle="" tone="blue" />
          <SummaryCard title={t("COST_OBJECT_REGISTERED", "Đã khai báo")} value={formatNumber(registered)} subtitle="" tone="green" />
          <SummaryCard title={t("COST_OBJECT_MISSING", "Chưa khai báo")} value={formatNumber(missing)} subtitle="" tone="amber" />
          <SummaryCard
            title={t("COST_OBJECT_PROGRESS", "Tỷ lệ hoàn thành")}
            value={completionRate}
            subtitle=""
            tone={missing > 0 ? "amber" : "green"}
          />
        </div>

        <div className="rounded-2xl border border-red-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3 md:px-5">
            <div className="text-base font-semibold text-gray-900">
              {t("COST_OBJECT_SETUP", "Khai báo đối tượng tập hợp chi phí")}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {t("COST_OBJECT_RULE", "Một thành phẩm tương ứng một đối tượng; mã đối tượng = mã thành phẩm.")}
            </div>
          </div>

          {error && (
            <div className="mx-4 mt-3 rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">
              {getApiErrorMessage(error, t("LOAD_FAILED", "Không tải được dữ liệu."))}
            </div>
          )}

          <div className="p-3 md:p-4">
            <div style={{ height: "min(62vh, 620px)", minHeight: 360 }}>
              <BaseDataGrid<CostObjectRow>
                dataSource={rows}
                keyExpr="PRODUCT_ID"
                selectMode="multiple"
                enableModifierSelection
                enableDragSelection
                persistColumnSettings={false}
                showPager
                defaultPageSize={50}
                allowedPageSizes={[25, 50, 100]}
                onInitialized={e => { grid.current = e.component ?? null; }}
                onContextMenuPreparing={e => {
                  e.items = [];
                  e.event?.preventDefault();
                }}
              >
                <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CD", "Mã thành phẩm")} width={150} />
                <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM_VIET", "Tên thành phẩm")} minWidth={250} />
                <Column dataField="DIVISION" caption={t("DIVISION_CD", "Tài khoản")} alignment="center" width={110} />
                <Column dataField="DEPARTMENT_CD" caption={t("COST_OBJECT_CD", "Mã đối tượng THCP")} width={170} />
                <Column dataField="DEP_NAME_VIET" caption={t("COST_OBJECT_NAME", "Tên đối tượng THCP")} minWidth={220} />
                <Column
                  dataField="STATUS"
                  caption={t("STATUS", "Trạng thái")}
                  alignment="center"
                  width={155}
                  cellRender={({ data: row }: { data: CostObjectRow }) => (
                    <span className={"inline-flex rounded-full px-2.5 py-1 text-xs font-semibold " +
                      getStatusClass(row.STATUS === "REGISTERED" ? "BALANCED" : "EMPTY")}>
                      {row.STATUS === "REGISTERED"
                        ? t("COST_OBJECT_REGISTERED", "Đã khai báo")
                        : t("COST_OBJECT_MISSING", "Chưa khai báo")}
                    </span>
                  )}
                />
                <Column
                  caption={t("ACTION", "Thao tác")}
                  alignment="center"
                  width={135}
                  allowFiltering={false}
                  allowSorting={false}
                  cellRender={({ data: row }: { data: CostObjectRow }) => row.STATUS === "MISSING"
                    ? <Button
                        text={t("CREATE", "Tạo")}
                        type="default"
                        stylingMode="contained"
                        disabled={busy}
                        onClick={() => void performSync([row.PRODUCT_ID])}
                      />
                    : <span className="font-semibold text-emerald-700">✓</span>}
                />
                <Summary>
                  <TotalItem
                    column="PRODUCT_NM_VIET"
                    summaryType="count"
                    displayFormat={t("TOTAL", "Tổng") + ": {0} " + t("ITEM", "mục")}
                  />
                </Summary>
              </BaseDataGrid>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
