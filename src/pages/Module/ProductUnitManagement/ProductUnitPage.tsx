import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react";
import { Editing, Popup } from "devextreme-react/data-grid";
import notify from "devextreme/ui/notify";
import { RowDblClickEvent, RowInsertingEvent, RowRemovingEvent, RowUpdatingEvent } from "devextreme/ui/data_grid";
import type dxDataGrid from "devextreme/ui/data_grid";
import { confirm } from "devextreme/ui/dialog";

import DxPage from "@/dx/DxPage";
import { LanguageContext } from "@/lib/i18nLoader";
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { GridToolbar } from "@/components/toolbar/GridToolbar";
import { getProductUnits, createProductUnit, updateProductUnit, deleteProductUnit, deleteProductUnits } from "@/api/productUnitApi";
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login";
import { Unit } from "@/types/unit";
import { ProductUnitColumns } from "./Columns/ProductUnitColumns";
import { ProductUnitForm } from "./Forms/ProductUnitForm";

export type ProductUnitPageMode = "page" | "lookup";

export type ProductUnitPageProps = {
  mode?: ProductUnitPageMode;
  hideToolbar?: boolean;
  onPickUnit?: (row: Unit) => void;
  onCloseLookup?: () => void;
};

export default function ProductUnitList({
  mode = "page",
  hideToolbar = false,
  onPickUnit,
  onCloseLookup,
}: ProductUnitPageProps) {
  const isLookup = mode === "lookup";
  const [loading, setLoading] = useState(true);
  const [gridData, setGridData] = useState<Unit[]>([]);
  const gridRef = useRef<dxDataGrid | null>(null);

  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string;
  };

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  );

  const loadProductUnits = useCallback(async () => {
    try {
      setLoading(true);
      const productUnits = await getProductUnits();
      setGridData(productUnits as Unit[]);
      gridRef.current?.clearSelection();
    } catch (error) {
      console.error("Failed to load product list", error);
    } finally {
      setLoading(false);
    }
  }, []);

  const handleRowInserting = useCallback((event: RowInsertingEvent) => {
    event.cancel = true;

    void (async () => {
      try {
        const payload = {
          ...event.data,
          USERID: getCurrentUserId() || "unknown",
          ISUSE: "1",
        };

        await createProductUnit(payload);
        await loadProductUnits();

        if (event.component) {
          (event.component as dxDataGrid).cancelEditData();
        }
      } catch (error: unknown) {
        alert(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [loadProductUnits]);

  const handleRowUpdating = useCallback((event: RowUpdatingEvent) => {
    event.cancel = true;

    void (async () => {
      try {
        const payload = { ...event.oldData, ...event.newData };
        await updateProductUnit(event.key, payload);
        await loadProductUnits();

        if (event.component) {
          (event.component as dxDataGrid).cancelEditData();
        }
      } catch (error: unknown) {
        alert(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [loadProductUnits]);

  const handleRowRemoving = useCallback((event: RowRemovingEvent) => {
    event.cancel = true;

    void (async () => {
      try {
        await deleteProductUnit(event.key);
        await loadProductUnits();

        notify(
          translate ? translate("MSG_DELETE_SUCCESS", "Delete successful") : "Delete successful", "success", 3000
        );
      } catch (error: unknown) {
        const axiosError = error as { response?: { data?: { Message?: string } } };
        notify(
          axiosError.response?.data?.Message ?? (translate ? translate("MSG_DELETE_ERROR", "Delete failed") : "Delete failed"),
          "error",
          3000
        );
      }
    })();
  }, [loadProductUnits, translate]);

  const handleToolbarDelete = async () => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as (number)[];
    if (!keys.length) {
      notify(
        translate ? translate("MSG_CONFIRM_DELETE_SELECTED_ROWS", "Please select rows to delete") : "Please select rows to delete", "warning", 1000
      );

      return;
    }

    const result = await confirm(
      translate ? translate("MSG_CONFIRM_DELETE_RECORD", "Are you sure you want to delete {0} record?").replace("{0}", String(keys.length)) : "Are you sure you want to delete this record?", 
      translate ? translate("MSG_CONFIRM_DELETE", "Confirm delete") : "Confirm delete"
    );

    if (!result) return;

    try {
      await deleteProductUnits(keys);
      notify( translate ? translate("MSG_DELETE_SUCCESS", "success") : "Delete successful", "success", 1000);
      await loadProductUnits();
    } catch  {
      notify(translate ? translate("MSG_DELETE_ERROR", "error") :  "Delete failed", "error", 1000);
    }
  };

  const handleRowDblClick = useCallback((event: RowDblClickEvent) => {
    if (isLookup) {
      if (event.data) {
        onPickUnit?.(event.data as Unit);
        onCloseLookup?.();
      }
      return;
    }

    if (!gridRef.current) {
      return;
    }

    let rowIndex = event.rowIndex;
    if ((rowIndex === undefined || rowIndex === null) && event.key !== undefined) {
      rowIndex = gridRef.current.getRowIndexByKey(event.key);
    }

    if (typeof rowIndex === "number" && rowIndex !== -1) {
      gridRef.current.editRow(rowIndex);
    }
  }, [isLookup, onCloseLookup, onPickUnit]);

  const handleExportPdf = useCallback(() => {
    const companyCd = getCurrentCompanyCd();
    const params = new URLSearchParams();

    if (companyCd) {
      params.set("companyCd", companyCd);
    }

    params.set("reportCode", "PRODUCT_INFO");

    const targetUrl = `${window.location.origin}/report-viewer${params.toString() ? `?${params.toString()}` : ""}`;
    const viewerWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");

    if (!viewerWindow) {
      notify(t("Unable to open report viewer", "Unable to open report viewer"), "error", 3000);
    }
  }, [t]);

  useEffect(() => {
    void loadProductUnits();
  }, [loadProductUnits]);

  const content = (
    <>
      {!hideToolbar && (
        <GridToolbar
          title={t("TSProductUnit", "Unit Code")}
          titleKey="TSProductUnit"
          gridRef={gridRef}
          onRefresh={loadProductUnits}
          onExportPdf={handleExportPdf}
          onDelete={handleToolbarDelete}
          onExportXlsx={() => alert("Export To XLSX clicked")}
          onImport={() => alert("Import clicked")}
        />
      )}

      <div className="data-grid-container">
        <BaseDataGrid<Unit>
          dataSource={gridData}
          keyExpr="UNIT_ID"
          screenCd={mode === "lookup" ? "/module/product-unit-management/lookup" : "/module/product-unit-management"}
          gridId={mode === "lookup" ? "product-unit-lookup-grid" : "product-unit-grid"}
          actionButtons
          actionButtonsPosition="start"
          onInitialized={(event) => {
            gridRef.current = event.component ?? null;
          }}
          onRowInserting={handleRowInserting}
          onRowUpdating={handleRowUpdating}
          onRowRemoving={handleRowRemoving}
          onRowDblClick={handleRowDblClick}
          onInitNewRow={(event) => {
            event.data.ISUSE = "1";
          }}
        >
          <Editing
            mode="popup"
            allowUpdating={true}
            allowAdding={true}
            allowDeleting={true}
            confirmDelete={true}
          >
            <Popup title={t("Unit", "Unit code")} showTitle={true} width={800} />
            <ProductUnitForm />
          </Editing>

          <ProductUnitColumns />
        </BaseDataGrid>

        <LoadPanel
          shadingColor="rgba(0, 0, 0, 0.4)"
          visible={loading}
          showIndicator={true}
          shading={true}
          showPane={true}
        />
      </div>
    </>
  );

  return isLookup ? content : <DxPage>{content}</DxPage>;
}
