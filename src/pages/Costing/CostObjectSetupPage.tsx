import { useCallback, useContext, useId, useMemo, useRef, useState, type ComponentType } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Column, Summary, TotalItem } from "devextreme-react/data-grid";
import Button from "devextreme-react/button";
import LoadPanel from "devextreme-react/load-panel";
import Popup from "devextreme-react/popup";
import SelectBox from "devextreme-react/select-box";
import notify from "devextreme/ui/notify";
import { confirm } from "devextreme/ui/dialog";
import type dxDataGrid from "devextreme/ui/data_grid";

import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { formatNumber, getStatusClass } from "@/utils/openingBalanceHelpers";
import { LanguageContext } from "@/lib/i18nLoader";
import { getCurrentCompanyCd } from "@/lib/login";
import { getApiErrorMessage } from "@/api/apiTypes";
import { getCostObjectOverview, syncCostObjects, type CostObjectRow } from "@/api/costObjectApi";

type FilterStatus = "ALL" | "MISSING" | "REGISTERED";
const FINISHED_GOODS_ACCOUNT = "155";

type CatalogType = "cost-center" | "inventory";
type CatalogPopup = CatalogType | null;

function CatalogContent({ component: Component }: { component: ComponentType }) {
  return <Component />;
}

export default function CostObjectSetupPage() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string;
  };
  const t = useCallback((key: string, fallback: string) => translate?.(key, fallback) ?? fallback, [translate]);
  const statusOptions = useMemo(() => [
    { value: "ALL", text: t("ALL", "Tất cả") },
    { value: "MISSING", text: t("COST_OBJECT_MISSING", "Chưa khai báo") },
    { value: "REGISTERED", text: t("COST_OBJECT_REGISTERED", "Đã khai báo") },
  ], [t]);
  const queryClient = useQueryClient();
  const grid = useRef<dxDataGrid | null>(null);
  const gridOverlayTargetId = `cost-object-grid-${useId().replace(/:/g, "")}`;
  const companyCd = getCurrentCompanyCd();
  const [selectedStatus, setSelectedStatus] = useState<FilterStatus>("ALL");
  const [appliedStatus, setAppliedStatus] = useState<FilterStatus>("ALL");
  const [activeCatalog, setActiveCatalog] = useState<CatalogPopup>(null);
  const [catalogComponent, setCatalogComponent] = useState<ComponentType | null>(null);
  const [loadingCatalog, setLoadingCatalog] = useState<CatalogPopup>(null);
  const catalogOpenInProgress = useRef(false);
  const [busy, setBusy] = useState(false);
  const queryKey = ["cost-objects", companyCd, FINISHED_GOODS_ACCOUNT];

  const { data, isLoading, isFetching, error, refetch } = useQuery({
    queryKey,
    queryFn: () => getCostObjectOverview(FINISHED_GOODS_ACCOUNT),
    enabled: Boolean(companyCd),
    refetchOnWindowFocus: false,
  });

  const rows = useMemo(() => {
    const items = data?.ITEMS ?? [];
    return appliedStatus === "ALL" ? items : items.filter(item => item.STATUS === appliedStatus);
  }, [data, appliedStatus]);

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
      const result = await syncCostObjects(ids, FINISHED_GOODS_ACCOUNT);
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

  const applyStatusFilter = async () => {
    // Keep the current rows in place during the request; apply the new
    // filter only after the API has finished to avoid two grid redraws.
    grid.current?.clearSelection();
    const result = await refetch();
    if (!result.isError) {
      setAppliedStatus(selectedStatus);
    }
  };

  const startAllMissing = () => {
    const ids = (data?.ITEMS ?? []).filter(item => item.STATUS === "MISSING").map(item => item.PRODUCT_ID);
    void performSync(ids);
  };

  const openCatalog = async (catalog: CatalogType) => {
    if (catalogOpenInProgress.current || activeCatalog !== null) return;
    catalogOpenInProgress.current = true;
    setLoadingCatalog(catalog);
    try {
      // Resolve first-time JS chunk before showing popup to avoid Suspense fallback swap.
      const module = catalog === "cost-center"
        ? await import("@/pages/Module/DepartmentManagement")
        : await import("@/pages/Module/ProductManagement/ProductPage");
      setCatalogComponent(() => module.default);
      setActiveCatalog(catalog);
    } catch (error) {
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Không mở được danh mục.")), "error", 3500);
    } finally {
      catalogOpenInProgress.current = false;
      setLoadingCatalog(null);
    }
  };


  const total = data?.TOTAL ?? 0;
  const registered = data?.REGISTERED ?? 0;
  const missing = data?.MISSING ?? 0;
  const completionRate = total > 0 ? String(Math.round(registered * 100 / total)) + "%" : "—";

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden bg-gray-50 p-1 sm:p-2">
      <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
        <div className="shrink-0 rounded-xl border border-red-100 bg-white shadow-sm">
          <div className="flex flex-wrap items-end justify-between gap-x-4 gap-y-2 px-3 py-2">
            <div className="flex flex-wrap items-end gap-2">
              <div className="min-w-[145px]">
                <div className="mb-1 text-xs font-medium text-gray-500">
                  {t("STATUS", "Trạng thái")}
                </div>
                <SelectBox
                  width={155}
                  dataSource={statusOptions}
                  valueExpr="value"
                  displayExpr="text"
                  value={selectedStatus}
                  stylingMode="outlined"
                  onValueChanged={e => setSelectedStatus(e.value as FilterStatus)}
                />
              </div>
              <Button
                text={t("EXECUTE", "Thực hiện")}
                stylingMode="contained"
                type="default"
                onClick={() => void applyStatusFilter()}
                disabled={busy || isFetching}
              />
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <Button
                icon="folder"
                text={t("COST_OBJECT_MASTER_CATALOG", "Đối tượng tập hợp chi phí")}
                hint="/master/cost-center"
                stylingMode="outlined"
                disabled={loadingCatalog !== null}
                onClick={() => void openCatalog("cost-center")}
              />
              <Button
                icon="box"
                text={t("INVENTORY_ITEM_SETUP", "Khai báo hàng tồn kho")}
                hint="/master/inventory"
                stylingMode="outlined"
                disabled={loadingCatalog !== null}
                onClick={() => void openCatalog("inventory")}
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

        <div className="grid shrink-0 grid-cols-2 gap-2 xl:grid-cols-4">
          <div className="flex min-h-[42px] items-center justify-between gap-2 rounded-lg border border-blue-100 bg-blue-50 px-3 py-1.5 text-blue-700">
            <span className="truncate text-xs font-medium">{t("COST_OBJECT_TOTAL_PRODUCTS", "Tổng thành phẩm")}</span>
            <strong className="shrink-0 text-base tabular-nums">{formatNumber(total)}</strong>
          </div>
          <div className="flex min-h-[42px] items-center justify-between gap-2 rounded-lg border border-emerald-100 bg-emerald-50 px-3 py-1.5 text-emerald-700">
            <span className="truncate text-xs font-medium">{t("COST_OBJECT_REGISTERED", "Đã khai báo")}</span>
            <strong className="shrink-0 text-base tabular-nums">{formatNumber(registered)}</strong>
          </div>
          <div className="flex min-h-[42px] items-center justify-between gap-2 rounded-lg border border-amber-100 bg-amber-50 px-3 py-1.5 text-amber-700">
            <span className="truncate text-xs font-medium">{t("COST_OBJECT_MISSING", "Chưa khai báo")}</span>
            <strong className="shrink-0 text-base tabular-nums">{formatNumber(missing)}</strong>
          </div>
          <div className="flex min-h-[42px] items-center justify-between gap-2 rounded-lg border border-gray-200 bg-white px-3 py-1.5 text-gray-700">
            <span className="truncate text-xs font-medium">{t("COST_OBJECT_PROGRESS", "Tỷ lệ hoàn thành")}</span>
            <strong className="shrink-0 text-base tabular-nums">{completionRate}</strong>
          </div>
        </div>

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-xl border border-red-100 bg-white shadow-sm">
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-2 border-b border-gray-100 px-3 py-2">
            <div className="text-sm font-semibold text-gray-900">
              {t("COST_OBJECT_SETUP", "Khai báo đối tượng tập hợp chi phí")}
            </div>
            {/* <div className="hidden text-xs text-gray-500 lg:inline">
              {t("COST_OBJECT_RULE", "Một thành phẩm tương ứng một đối tượng; mã đối tượng = mã thành phẩm.")}
            </div> */}
          </div>

          {error && (
            <div className="mx-2 mt-2 shrink-0 rounded-lg border border-red-200 bg-red-50 px-3 py-1.5 text-sm text-red-700">
              {getApiErrorMessage(error, t("LOAD_FAILED", "Không tải được dữ liệu."))}
            </div>
          )}

          <div id={gridOverlayTargetId} className="relative min-h-0 flex-1 overflow-hidden p-1.5 sm:p-2">
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
                <Column dataField="PRODUCT_CD" caption={t("COST_OBJECT_PRODUCT_CODE", "Mã thành phẩm")} width={150} />
                <Column dataField="PRODUCT_NM_VIET" caption={t("COST_OBJECT_PRODUCT_NAME", "Tên thành phẩm")} minWidth={250} />
                <Column dataField="DIVISION" caption={t("COST_OBJECT_ACCOUNT", "Tài khoản")} alignment="center" width={110} />
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
              {/* Portal the overlay into the fixed-height grid container; never add a flex row. */}
              <LoadPanel
                visible={busy || isLoading || isFetching}
                showIndicator
                showPane
                shading
                shadingColor="rgba(0, 0, 0, 0.12)"
                hideOnOutsideClick={false}
                message={t("LOADING", "Đang tải dữ liệu...")}
                container={`#${gridOverlayTargetId}`}
                position={{ of: `#${gridOverlayTargetId}` }}
              />
          </div>
        </div>
      </div>

      <Popup
        visible={activeCatalog !== null}
        title={activeCatalog === "cost-center"
          ? t("COST_OBJECT_MASTER_CATALOG", "Đối tượng tập hợp chi phí")
          : t("INVENTORY_ITEM_SETUP", "Khai báo hàng tồn kho")}
        showTitle
        showCloseButton
        dragEnabled={false}
        resizeEnabled
        hideOnOutsideClick={false}
        animation={{ show: { type: "fade", duration: 0 }, hide: { type: "fade", duration: 0 } }}
        width="min(1400px, 96vw)"
        height="min(820px, 92vh)"
        onHiding={() => setActiveCatalog(null)}
        onHidden={() => {
          grid.current?.clearSelection();
          void queryClient.invalidateQueries({ queryKey });
        }}
      >
        <div className="h-full min-h-0 w-full overflow-hidden p-1">
          {activeCatalog !== null && catalogComponent !== null && (
            <CatalogContent component={catalogComponent} />
          )}
        </div>
      </Popup>
    </div>
  );
}
