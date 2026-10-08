import { captureMasterPopupError } from "@/components/datagrid/masterPopupValidation";
import {
  clearMasterFormDraft,
  getMasterFormDraftChanges,
  mergeMasterFormDraft,
  seedMasterFormDraft,
} from "@/components/lookup/masterFormDraft";
import { downloadFile } from "@/lib/fileUtils"
import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react";
import { Editing } from "devextreme-react/data-grid";
import notify from "devextreme/ui/notify";
import { RowDblClickEvent, RowInsertingEvent, RowRemovingEvent, RowUpdatingEvent } from "devextreme/ui/data_grid";
import type dxDataGrid from "devextreme/ui/data_grid";
import { confirm } from "devextreme/ui/dialog";

import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { GridToolbar } from "@/components/toolbar/GridToolbar";
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout";
import { exportToExcel } from "@/api/productApi";
import DxPage from "@/dx/DxPage";
import { LanguageContext } from "@/lib/i18nLoader";
import { getCurrentCompanyCd } from "@/lib/login";
import { assignSequencePreviewCode, getSequenceSubmitCode } from "@/lib/codeSequence";
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage";
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig";
import { normalizeMessageLanguageKey } from "@/utils/language";
import MasterDataEditPopup from "@/components/datagrid/MasterDataEditPopup";
import { getApiErrorMessage } from "@/api/apiTypes";
import { Product } from "@/types/product";
import { ProductColumns } from "./Columns/ProductColumns";
import { ProductForm } from "./Forms/ProductForm";
import { useProductImportConfig } from "./Columns/ProductImportConfig";
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup";
import {
  useProductListQuery,
  useProductMutations,
} from "@/hooks/queries/master/useProductListQuery";

export type ProductPageMode = "page" | "lookup";

export type ProductPageProps = {
  mode?: ProductPageMode;
  onPickProduct?: (row: Product) => void;
  onCloseLookup?: () => void;
};

export default function ProductList({
  mode = "page",
  onPickProduct,
  onCloseLookup,
}: ProductPageProps) {
  const isLookup = mode === "lookup";
  const screenCd = "/module/product-management";
  const gridId = "product-grid";
  const menuCode = "MD_INVENTORY";
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const gridRef = useRef<dxDataGrid | null>(null);

  const {
    data: gridData = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchProducts,
  } = useProductListQuery();
  const { createMutation, updateProductAsync, deleteMutation, invalidateProducts } = useProductMutations();
  const loading = isLoading || isFetching;

  const { translate, lang } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string;
    lang: string;
  };

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  );

  const importConfig = useProductImportConfig();
  const langCode = normalizeMessageLanguageKey(lang);
  const popupTitle = t(isUpdate ? "lblEdit" : "lblAddNew", isUpdate ? "Sửa" : "Thêm mới");

  const reloadProducts = useCallback(async () => {
    await refetchProducts();
    gridRef.current?.clearSelection();
  }, [refetchProducts]);

  useEffect(() => {
    if (isError && loadError) {
      console.error("Failed to load product list", loadError);
      notify(getApiErrorMessage(loadError, t("LOAD_FAILED", "Tải thất bại")), "error", 3000);
    }
  }, [isError, loadError, t]);


  const handleRowInserting = useCallback((event: RowInsertingEvent & { promise?: Promise<void> }) => {
    const reportSaveError = captureMasterPopupError(event.component)
    event.promise = (async () => {
      try {
        const payload = mergeMasterFormDraft({
          ...event.data,
          PRODUCT_CD: getSequenceSubmitCode(event.data?.PRODUCT_CD),
          PRODUCT_KIND_ID: event.data?.PRODUCT_KIND_ID || null,
          UNIT_ID: event.data?.UNIT_ID,
          STORE_ID: event.data?.STORE_ID || null,
          ISUSE: "1",
        });

        const result = await createMutation.mutateAsync(payload);
        if (result?.Success === false) {
          throw new Error(result.Message || t("INSERT_FAILED", "Thêm mới thất bại"));
        }
        notify(t("MSG_INSERT_SUCCESS", "Created successfully"), "success", 3000);
        clearMasterFormDraft();
      } catch (error: unknown) {
        reportSaveError(getApiErrorMessage(error, t("INSERT_FAILED", "Thêm mới thất bại")));
        throw error;
      }
    })();
  }, [createMutation, t]);

  const handleRowUpdating = useCallback((event: RowUpdatingEvent & { promise?: Promise<void> }) => {
    const reportSaveError = captureMasterPopupError(event.component)
    event.promise = (async () => {
      try {
        const payload = mergeMasterFormDraft({ ...event.oldData, ...event.newData });
        const result = await updateProductAsync({ id: String(event.key), payload });
        if (result?.Success === false) {
          throw new Error(result.Message || t("UPDATE_FAILED", "Cập nhật thất bại"));
        }
        const updatedProduct = result?.Data;
        if (event.oldData && updatedProduct && typeof updatedProduct.PRODUCT_ID === "number") {
          Object.assign(event.oldData, updatedProduct);
        } else {
          void invalidateProducts();
        }
        notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000);
        clearMasterFormDraft();
      } catch (error: unknown) {
        reportSaveError(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")));
        throw error;
      }
    })();
  }, [invalidateProducts, t, updateProductAsync]);

  const handleRowRemoving = useCallback((event: RowRemovingEvent) => {
    event.cancel = true;

    void (async () => {
      try {
        await deleteMutation.mutateAsync([Number(event.key)]);
        notify(t("MSG_DELETE_SUCCESS", "Delete successful"), "success", 3000);
      } catch (error: unknown) {
        notify(getApiErrorMessage(error, t("MSG_DELETE_ERROR", "Delete failed")), "error", 3000);
      }
    })();
  }, [deleteMutation, t]);

  const handleToolbarDelete = async () => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as (number)[];
    if (!keys.length) {
      notify(t("MSG_CONFIRM_DELETE_SELECTED_ROWS", "Please select rows to delete"), "warning", 1000);
      return;
    }

    const result = await confirm(
      t("MSG_CONFIRM_DELETE_RECORD", "Are you sure you want to delete {0} record?").replace("{0}", String(keys.length)),
      t("MSG_CONFIRM_DELETE", "Confirm delete")
    );

    if (!result) return;

    try {
      await deleteMutation.mutateAsync(keys);
      notify(t("MSG_DELETE_SUCCESS", "Delete successful"), "success", 1000);
    } catch (error) {
      notify(getApiErrorMessage(error, t("MSG_DELETE_ERROR", "Delete failed")), "error", 1000);
    }
  };

  const handleRowDblClick = useCallback((event: RowDblClickEvent) => {
    if (isLookup) {
      if (event.data) {
        onPickProduct?.(event.data as Product);
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
  }, [isLookup, onCloseLookup, onPickProduct]);

  const handleExportPdf = useCallback(() => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as number[];
    const productId = keys.length ? keys[0] : undefined;
    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      productId: productId ? String(productId) : undefined,
      reportCode: "PRODUCT_INFO",
      menuCode,
      screenCd,
      gridId,
    });
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000);
    }
  }, [gridId, menuCode, screenCd, t]);

  const handleExportExcel = useCallback(async () => {
    try {
      const keys = (gridRef.current?.getSelectedRowKeys() || []) as number[];
      const productId = keys.length ? keys[0] : undefined;
      const loadDownloadBlob = (signal: AbortSignal) => exportToExcel(productId, undefined, langCode, signal);
      await downloadFile({ fileName: `product_inventory_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
    } catch (error) {
      console.error("Export error", error);
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Xuất thất bại")), "error", 3000);
    }
  }, [langCode, t]);

  const content = (
    <MasterDataPageLayout
      toolbar={
        <GridToolbar
          gridRef={gridRef}
          onRefresh={() => void reloadProducts()}
          onExportPdf={handleExportPdf}
          onExportXlsx={handleExportExcel}
          onImport={() => setIsExcelModalOpen(true)}
          onDelete={handleToolbarDelete}
        />
      }
      overlays={
        <BaseExcelImportPopup
            visible={isExcelModalOpen}
            onClose={() => setIsExcelModalOpen(false)}
            title={t('PRODUCT_LIST','Import danh sách sản phẩm')}
            moduleCd={importConfig.moduleCd}
            templateUrl="/System/DownloadTemplate"
            templateFileName={importConfig.templateName}
            params={{ lang: localStorage.getItem('lang') ?? undefined }}
            onImported={() => void reloadProducts()}
          />
      }
    >
        <BaseDataGrid<Product>
          dataSource={gridData}
          keyExpr="PRODUCT_ID"
          menuCode={menuCode}
          screenCd={screenCd}
          gridId={gridId}
          actionButtons
          actionButtonsPosition="start"
          onInitialized={(event) => {
            gridRef.current = event.component ?? null;
          }}
          onRowInserting={handleRowInserting}
          onRowUpdating={handleRowUpdating}
          onRowRemoving={handleRowRemoving}
          onRowDblClick={handleRowDblClick}
          onSaving={(event) => {
              const lookupChanges = isLookup ? {} : getMasterFormDraftChanges();
            const lookupFields = Object.keys(lookupChanges);
            if (lookupFields.length > 0) {
              const changes = event.changes ?? [];
              const target = changes.find((change) => change.type === "update" || change.type === "insert");
              if (target) {
                target.data = { ...target.data, ...lookupChanges } as Partial<Product>;
              } else {
                const editingKey = event.component?.option("editing.editRowKey");
                const newRow = event.component?.getVisibleRows().find((row) => row.isNewRow)?.data;
                const change = editingKey !== null && editingKey !== undefined
                  ? { type: "update" as const, key: editingKey as number, data: lookupChanges as Partial<Product> }
                  : { type: "insert" as const, data: { ...(newRow as Product | undefined), ...lookupChanges } as Product };
                event.changes = [...changes, change];
              }
            }
          }}
          onEditingStart={(event) => {
            const rowId = Number(event.key);
            setIsUpdate(Number.isFinite(rowId) && rowId > 0);
            seedMasterFormDraft(event.data as unknown as Record<string, unknown>);
          }}
          onEditCanceled={() => {
            clearMasterFormDraft();
          }}
          onInitNewRow={(event) => {
            setIsUpdate(false);
            seedMasterFormDraft(event.data as unknown as Record<string, unknown>);
            event.data.ISUSE = "1";
            event.promise = assignSequencePreviewCode(event.data, menuCode, "PRODUCT_CD").then(() => undefined);
          }}
        >
          <Editing
            mode="popup"
            allowUpdating={true}
            allowAdding={true}
            allowDeleting={true}
            confirmDelete={true}
            startEditAction="dblClick"
          >
            <MasterDataEditPopup
              key={lang}
              scrollable
              title={popupTitle}
              width="90%"
              maxWidth={800}
            />
            <ProductForm />
          </Editing>

          <ProductColumns />
        </BaseDataGrid>

        <LoadPanel
          shadingColor="rgba(0, 0, 0, 0.4)"
          visible={loading}
          showIndicator={true}
          shading={true}
          showPane={true}
        />
    </MasterDataPageLayout>
  );

  return isLookup ? content : <DxPage>{content}</DxPage>;
}
