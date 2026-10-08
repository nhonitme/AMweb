import { captureMasterPopupError } from "@/components/datagrid/masterPopupValidation";
import { downloadFile } from "@/lib/fileUtils"
import { useCallback, useContext, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react";
import { Editing } from "devextreme-react/data-grid";
import notify from "devextreme/ui/notify";
import { RowDblClickEvent, RowInsertingEvent, RowRemovingEvent, RowUpdatingEvent } from "devextreme/ui/data_grid";
import type dxDataGrid from "devextreme/ui/data_grid";
import { confirm } from "devextreme/ui/dialog";

import DxPage from "@/dx/DxPage";
import { LanguageContext } from "@/lib/i18nLoader";
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { GridToolbar } from "@/components/toolbar/GridToolbar";
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout";
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup";
import { exportToExcel } from "@/api/productUnitApi";
import { getCurrentCompanyCd } from "@/lib/login";
import { assignSequencePreviewCode, getSequenceSubmitCode } from "@/lib/codeSequence";
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage";
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig";
import { normalizeMessageLanguageKey } from "@/utils/language";
import MasterDataEditPopup from "@/components/datagrid/MasterDataEditPopup";
import { getApiErrorMessage } from "@/api/apiTypes";
import { Unit } from "@/types/unit";
import { ProductUnitColumns } from "./Columns/ProductUnitColumns";
import { ProductUnitForm } from "./Forms/ProductUnitForm";
import { useProductUnitImportConfig } from "./Columns/ProductUnitImportConfig";
import {
  useProductUnitListQuery,
  useProductUnitMutations,
} from "@/hooks/queries/master/masterDataQueries";
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers";

export type ProductUnitPageMode = "page" | "lookup";

export type ProductUnitPageProps = {
  mode?: ProductUnitPageMode;
  onPickUnit?: (row: Unit) => void;
  onCloseLookup?: () => void;
};

export default function ProductUnitList({
  mode = "page",
  onPickUnit,
  onCloseLookup,
}: ProductUnitPageProps) {
  const isLookup = mode === "lookup";
  const screenCd = "/module/product-unit-management";
  const gridId = "product-unit-grid";
  const menuCode = "MD_UNIT";
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const [isUpdate, setIsUpdate] = useState(false);
  const gridRef = useRef<dxDataGrid | null>(null);

  const {
    data: gridData = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchProductUnits,
  } = useProductUnitListQuery();
  const { createMutation, updateMutation, deleteMutation } = useProductUnitMutations();
  const loading = isLoading || isFetching;

  const { translate, lang } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string;
    lang: string;
  };

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  );

  const importConfig = useProductUnitImportConfig();
  const langCode = normalizeMessageLanguageKey(lang);
  const popupTitle = t(isUpdate ? "lblEdit" : "lblAddNew", isUpdate ? "Sửa" : "Thêm mới");

  const reloadProductUnits = useMasterListReload(refetchProductUnits, gridRef);
  useMasterListLoadError(isError, loadError, t, "Failed to load product unit list");

  const handleRowInserting = useCallback((event: RowInsertingEvent) => {
    const reportSaveError = captureMasterPopupError(event.component)
    event.cancel = true;

    void (async () => {
      try {
        const payload = {
          ...event.data,
          UNIT_CD: getSequenceSubmitCode(event.data?.UNIT_CD),
          ISUSE: "1",
        };

        await createMutation.mutateAsync(payload);
        notify(t("MSG_INSERT_SUCCESS", "Created successfully"), "success", 3000);

        if (event.component) {
          (event.component as dxDataGrid).cancelEditData();
        }
      } catch (error: unknown) {
        reportSaveError(getApiErrorMessage(error, t("INSERT_FAILED", "Thêm mới thất bại")));
      }
    })();
  }, [createMutation, t]);

  const handleRowUpdating = useCallback((event: RowUpdatingEvent) => {
    const reportSaveError = captureMasterPopupError(event.component)
    event.cancel = true;

    void (async () => {
      try {
        const payload = { ...event.oldData, ...event.newData };
        await updateMutation.mutateAsync({ id: String(event.key), payload });
        notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000);

        if (event.component) {
          (event.component as dxDataGrid).cancelEditData();
        }
      } catch (error: unknown) {
        reportSaveError(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")));
      }
    })();
  }, [t, updateMutation]);

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
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as number[];
    const unitId = keys.length ? keys[0] : undefined;
    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      unitId: unitId ? String(unitId) : undefined,
      reportCode: "PRODUCT_UNIT_INFO",
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
      const productUnitId = keys.length ? keys[0] : undefined;
      const loadDownloadBlob = (signal: AbortSignal) => exportToExcel(productUnitId, langCode, undefined, signal);
      await downloadFile({ fileName: `product_unit_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
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
          onRefresh={() => void reloadProductUnits()}
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
            title={t('PRODUCT_UNIT_LIST','Import danh sách đơn vị')}
            moduleCd={importConfig.moduleCd}
            templateUrl="/System/DownloadTemplate"
            templateFileName={importConfig.templateName}
            params={{ lang: localStorage.getItem('lang') ?? undefined }}
            onImported={() => void reloadProductUnits()}
          />
      }
    >
        <BaseDataGrid<Unit>
          dataSource={gridData}
          keyExpr="UNIT_ID"
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
          onEditingStart={(event) => {
            const rowId = Number(event.key);
            setIsUpdate(Number.isFinite(rowId) && rowId > 0);
          }}
          onInitNewRow={(event) => {
            setIsUpdate(false);
            event.data.ISUSE = "1";
            event.promise = assignSequencePreviewCode(event.data, menuCode, "UNIT_CD").then(() => undefined);
          }}
        >
          <Editing
            mode="popup"
            allowUpdating={true}
            allowAdding={true}
            allowDeleting={true}
            confirmDelete={true}
          >
            <MasterDataEditPopup
              key={lang}
              title={popupTitle}
              width="90%"
              maxWidth={800}
            />
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
    </MasterDataPageLayout>
  );

  return isLookup ? content : <DxPage>{content}</DxPage>;
}
