import { captureMasterPopupError } from "@/components/datagrid/masterPopupValidation";
import { downloadFile } from "@/lib/fileUtils"
import { useCallback, useContext, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react";
import { Editing } from 'devextreme-react/data-grid';
import { ContextMenuPreparingEvent, RowDblClickEvent, RowInsertingEvent, RowRemovingEvent, RowUpdatingEvent } from "devextreme/ui/data_grid";
import type dxDataGrid from "devextreme/ui/data_grid";

import DxPage from "@/dx/DxPage";
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { GridToolbar } from "@/components/toolbar/GridToolbar";
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout";

import { StoreKindColumns } from "./Columns/StoreKindColumns";
import { StoreKindForm } from "./Forms/StoreKindForm";

import { exportToExcel } from "@/api/storeKindAPI";
import notify from "devextreme/ui/notify";
import { LanguageContext } from "@/lib/i18nLoader";
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup";
import { useStoreImportConfig } from "./Columns/StoreKindImportConfig";
import { confirm } from "devextreme/ui/dialog";
import { StoreKindInfo } from "@/types/storeKind";
import { getCurrentCompanyCd } from "@/lib/login";
import { normalizeMessageLanguageKey } from "@/utils/language";
import MasterDataEditPopup from "@/components/datagrid/MasterDataEditPopup";
import { getApiErrorMessage } from "@/api/apiTypes";
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage";
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig";
import { assignSequencePreviewCode, getSequenceSubmitCode } from "@/lib/codeSequence";
import {
  useStoreKindListQuery,
  useStoreKindMutations,
} from "@/hooks/queries/master/masterDataQueries";
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers";

type RowInsertingEventWithPromise = RowInsertingEvent & { promise?: Promise<void> };
type RowUpdatingEventWithPromise = RowUpdatingEvent & { promise?: Promise<void> };

export type StoreKindPageMode = "page" | "lookup";

export type StoreKindPageProps = {
  mode?: StoreKindPageMode;
  onPickStoreKind?: (row: StoreKindInfo) => void;
  onCloseLookup?: () => void;
};

export default function StoreKindList({
  mode = "page",
  onPickStoreKind,
  onCloseLookup,
}: StoreKindPageProps) {
  const isLookup = mode === "lookup";
  const gridRef = useRef<dxDataGrid | null>(null);
  const { lang, translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string; lang: string };
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const importConfig = useStoreImportConfig();
  const [isUpdate, setIsUpdate] = useState(false);
  const popupTitle = translate ? translate(isUpdate ? "lblEdit" : "lblAddNew", "Store Kind info") : "Store Kind info";
  const langCode = normalizeMessageLanguageKey(lang);
  const screenCd = "/module/store-kind-management";
  const gridId = "store-kind-grid";
  const menuCode = "MD_WAREHOUSE_TYPE";

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  );

  const {
    data: gridData = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchStoreKinds,
  } = useStoreKindListQuery();
  const { createMutation, updateMutation, deleteMutation } = useStoreKindMutations();
  const loading = isLoading || isFetching;
  const reloadStoreKinds = useMasterListReload(refetchStoreKinds, gridRef);
  useMasterListLoadError(isError, loadError, t, "Failed to load store kind list");
  
  const onContextMenuPreparing = (e: ContextMenuPreparingEvent) => {
    if (e.row && e.row.rowType === "data") {
      e.items = [
        {
          text: "Update",
          onItemClick: () => {
            gridRef.current?.editRow(e.row!.rowIndex);
          },
        },
        {
          text: "Delete",
          onItemClick: () => {
            gridRef.current?.deleteRow(e.row!.rowIndex);
          },
        },
      ];
    }
  };

  const onRowInserting = (e: RowInsertingEventWithPromise) => {
    const reportSaveError = captureMasterPopupError(e.component)
    e.promise = (async () => {
      try {
        const newData = {
          ...e.data,
          STORE_KIND_CD: getSequenceSubmitCode(e.data?.STORE_KIND_CD),
        };

        await createMutation.mutateAsync(newData);
        notify(t("MSG_INSERT_SUCCESS", "Insert successful"), "success", 1000);

        if (e.component) {
          (e.component as dxDataGrid).cancelEditData();
        }
      } catch (error: unknown) {
        reportSaveError(getApiErrorMessage(error, t("INSERT_FAILED", "Thêm mới thất bại")));
      }
    })();
  };

  const onRowUpdating = (e: RowUpdatingEventWithPromise) => {
    const reportSaveError = captureMasterPopupError(e.component)
    e.promise = (async () => {
      try {
        const payload = { ...e.oldData, ...e.newData };
        await updateMutation.mutateAsync(payload);
        notify(t("MSG_EDIT_SUCCESS", "Edit successful"), "success", 1000);
        if (e.component) {
          (e.component as dxDataGrid).cancelEditData();
        }
      } catch (error: unknown) {
        reportSaveError(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")));
      }
    })();
  };

  const onRowRemoving = (e: RowRemovingEvent) => {
  e.cancel = (async () => {
    try {
      const row = e.data;
      const id = row.STORE_KIND_ID ?? e.key;

      await deleteMutation.mutateAsync([id]);

      notify(t("MSG_DELETE_SUCCESS", "Delete successful"), "success", 3000);

      return false;
    } catch (error: unknown) {
      notify(getApiErrorMessage(error, t("MSG_DELETE_ERROR", "Delete failed")), "error", 3000);

      return true;
    }
  })();
};

  const handleExportExcel = async () => {
    try {
      const keys = gridRef.current?.getSelectedRowKeys() || [];
      const storeID = keys.length ? (keys[0] as number) : undefined;
      const loadDownloadBlob = (signal: AbortSignal) => exportToExcel(storeID, langCode, signal);
      await downloadFile({ fileName: `${translate('Menu_StoreKindInfo', 'Warehouse Classification Management')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`, load: loadDownloadBlob })
    } catch (err) {
      console.error('Export error', err);
      notify(
        getApiErrorMessage(err, translate ? translate('EXPORT_FAILED', 'Xuất thất bại') : 'Export failed'),
        'error',
        3000
      );
    }
  };

  const handleExportPdf = () => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as number[];
    const storeKindId = keys.length ? keys[0] : undefined;
    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      storeKindId: storeKindId ? String(storeKindId) : undefined,
      reportCode: "WAREHOUSE_TYPE_INFO",
      menuCode,
      screenCd,
      gridId,
    });
    if (!openReportViewerPage(targetUrl)) {
      notify(translate("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000);
    }
  };

  const handleRowDblClick = (e: RowDblClickEvent<StoreKindInfo, number>) => {
    if (isLookup) {
      if (e?.data) {
        onPickStoreKind?.(e.data as StoreKindInfo);
        onCloseLookup?.();
      }
      return;
    }

    if (!gridRef.current) {
      console.warn('gridRef not initialized when double-click occurred');
      return;
    }
    let idx: number | undefined | null =
      typeof (e as { rowIndex?: number }).rowIndex === "number"
        ? (e as { rowIndex?: number }).rowIndex
        : undefined;
    if (idx === undefined && e?.row) {
      idx = e.row.rowIndex;
    }
    if ((idx === undefined || idx === null) && e?.key !== undefined) {
      idx = gridRef.current.getRowIndexByKey(e.key as string | number);
    }
    if (idx !== undefined && idx !== null && idx !== -1) {
      gridRef.current.editRow(idx);
    } else {
      console.warn('unable to determine row index from dblclick event', e);
    }
  };

const handleToolbarDelete = async () => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as (number)[];
    if (!keys.length) {
        notify(
          translate
            ? translate('MSG_PLEASE_SELECT_ROWS_TO_DELETE', 'Please select rows to delete')
            : "Please select rows to delete",
          "warning",
          1000
        );
        return;
      }

    const result = await confirm(
      translate ? translate("MSG_CONFIRM_DELETE_RECORD", "Are you sure you want to delete {0} record?").replace("{0}", String(keys.length)) : "Are you sure you want to delete this record?",
      translate ? translate("MSG_CONFIRM_DELETE", "Confirm delete") : "Confirm delete"
    );

    if (!result) return;

    try {
      await deleteMutation.mutateAsync(keys);
      notify(t("MSG_DELETE_SUCCESS", "Delete successful"), "success", 1000);
    } catch (error) {
      notify(getApiErrorMessage(error, t("MSG_DELETE_ERROR", "Delete failed")), "error", 1000);
    }
};

  const content = (
    <MasterDataPageLayout
      toolbar={
        <GridToolbar
          gridRef={gridRef}
          onRefresh={() => void reloadStoreKinds()}
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
        title={translate ? translate('STORE_KIND_LIST','Import danh mục loại kho') : 'Import'}
        moduleCd={importConfig.moduleCd}
        templateUrl="/System/DownloadTemplate"
        templateFileName={importConfig.templateName}
        params={{ lang: localStorage.getItem('lang') ?? undefined }}
        onImported={() => void reloadStoreKinds()}
      />
      }

    >
        <BaseDataGrid<StoreKindInfo>
          dataSource={gridData}
          keyExpr="STORE_KIND_ID"
          menuCode={menuCode}
          screenCd={screenCd}
          gridId={gridId}
          actionButtons
          actionButtonsPosition="start"
          onInitialized={(e) => {
            gridRef.current = e.component ?? null;
          }}
          onRowInserting={onRowInserting}
          onRowUpdating={onRowUpdating}
          onRowRemoving={onRowRemoving}

          onContextMenuPreparing={onContextMenuPreparing}
          onRowDblClick={handleRowDblClick}
          onEditingStart={(event) => {
            const rowId = Number(event.key)
            setIsUpdate(Number.isFinite(rowId) && rowId > 0)
          }}
          onInitNewRow={(e) => {
            setIsUpdate(false);

            e.data.ISUSE = true;
            e.promise = assignSequencePreviewCode(e.data, menuCode, "STORE_KIND_CD").then(() => undefined);
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
            <StoreKindForm isUpdate={isUpdate}/>
          </Editing>

          <StoreKindColumns />
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
