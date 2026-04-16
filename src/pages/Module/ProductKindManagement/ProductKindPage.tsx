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
import { createProductKind, getProductKinds, updateProductKind, deleteProductKind, deleteProductKinds } from "@/api/productKindApi";
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login";
import { ProductKind } from "@/types/productKind";
import { ProductKindColumns } from "./Columns/ProductKindColumns";
import { ProductKindForm } from "./Forms/ProductKindForm";

export type ProductKindPageMode = "page" | "lookup";

export type ProductKindPageProps = {
  mode?: ProductKindPageMode;
  hideToolbar?: boolean;
  onPickProductKind?: (row: ProductKind) => void;
  onCloseLookup?: () => void;
};

export default function ProductKindList({
  mode = "page",
  hideToolbar = false,
  onPickProductKind,
  onCloseLookup,
}: ProductKindPageProps) {
  const isLookup = mode === "lookup";
  const [loading, setLoading] = useState(true);
  const [gridData, setGridData] = useState<ProductKind[]>([]);
  const gridRef = useRef<dxDataGrid | null>(null);

  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string;
  };

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  );

  const loadProductKinds = useCallback(async () => {
    try {
      setLoading(true);
      const productKinds = await getProductKinds();
      setGridData(productKinds as ProductKind[]);
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

        await createProductKind(payload);
        await loadProductKinds();

        if (event.component) {
          (event.component as dxDataGrid).cancelEditData();
        }
      } catch (error: unknown) {
        alert(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [loadProductKinds]);

  const handleRowUpdating = useCallback((event: RowUpdatingEvent) => {
    event.cancel = true;

    void (async () => {
      try {
        const payload = { ...event.oldData, ...event.newData };
        await updateProductKind(event.key, payload);
        await loadProductKinds();

        if (event.component) {
          (event.component as dxDataGrid).cancelEditData();
        }
      } catch (error: unknown) {
        alert(error instanceof Error ? error.message : String(error));
      }
    })();
  }, [loadProductKinds]);

  const handleRowRemoving = useCallback((event: RowRemovingEvent) => {
    event.cancel = true;

    void (async () => {
      try {
        await deleteProductKind(event.key);
        await loadProductKinds();

        notify(
          translate ? translate("MSG_DELETE_SUCCESS", "Delete successful") : "Delete successful", "success", 3000
        );
      } catch (error: unknown) {
        // alert(error instanceof Error ? error.message : String(error));
        const axiosError = error as { response?: { data?: { Message?: string } } };
        notify(
          axiosError.response?.data?.Message ?? (translate ? translate("MSG_DELETE_ERROR", "Delete failed") : "Delete failed"),
          "error",
          3000
        );
      }
    })();
  }, [loadProductKinds, translate]);

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
      await deleteProductKinds(keys);
      notify( translate ? translate("MSG_DELETE_SUCCESS", "success") : "Delete successful", "success", 1000);
      await loadProductKinds();
    } catch  {
      notify(translate ? translate("MSG_DELETE_ERROR", "error") :  "Delete failed", "error", 1000);
    }
  };

  const handleRowDblClick = useCallback((event: RowDblClickEvent) => {
    if (isLookup) {
      if (event.data) {
        onPickProductKind?.(event.data as ProductKind);
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
  }, [isLookup, onCloseLookup, onPickProductKind]);

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
    void loadProductKinds();
  }, [loadProductKinds]);

  const content = (
    <>
      {!hideToolbar && (
        <GridToolbar
          title={t("TSProductKind", "Material Code")}
          titleKey="TSProductKind"
          gridRef={gridRef}
          onRefresh={loadProductKinds}
          onExportPdf={handleExportPdf}
          onDelete={handleToolbarDelete}
          onExportXlsx={() => alert("Export To XLSX clicked")}
          onImport={() => alert("Import clicked")}
        />
      )}

      <div className="data-grid-container">
        <BaseDataGrid<ProductKind>
          dataSource={gridData}
          keyExpr="PRODUCT_KIND_ID"
          screenCd={mode === "lookup" ? "/module/product-kind-management/lookup" : "/module/product-kind-management"}
          gridId={mode === "lookup" ? "product-kind-lookup-grid" : "product-kind-grid"}
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
            <Popup title={t("Material code", "Material code")} showTitle={true} width={800} />
            <ProductKindForm />
          </Editing>

          <ProductKindColumns />
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
