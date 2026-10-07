import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react";
import { Editing } from 'devextreme-react/tree-list';

import { RowDblClickEvent, RowInsertingEvent, RowRemovingEvent, RowUpdatingEvent } from "devextreme/ui/tree_list";
import type dxTreeList  from "devextreme/ui/tree_list";

import { MasterDataTreeListEditPopup } from "@/components/datagrid/MasterDataEditPopup";
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout";
import BaseTreeList from "@/components/datagrid/BaseTreeList";
import { GridToolbar } from "@/components/toolbar/GridToolbar";

import { AcclistColumns} from "./Columns/AcclistColumns";
import { AcclistForm } from "./Forms/AcclistForm";

import { exportToExcel } from "@/api/acclistAPI";
import notify from "devextreme/ui/notify";
import { LanguageContext } from "@/lib/i18nLoader";
import { confirm } from "devextreme/ui/dialog";
import { AcclistInfo } from "@/types/acclist";
import { SysCode } from "@/api/sysCodeService";
import { useSysCodes } from "@/lib/sysCodeContext";
import { downloadFile } from "@/lib/fileUtils";
import { getCurrentCompanyCd } from "@/lib/login";
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage";
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig";
import { normalizeMessageLanguageKey } from "@/utils/language";
import { getApiErrorMessage } from "@/api/apiTypes";
import {
  useAcclistListQuery,
  useAcclistMutations,
} from "@/hooks/queries/master/masterDataQueries";
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers";

type RowInsertingEventWithPromise = RowInsertingEvent & { promise?: Promise<void> };
type RowUpdatingEventWithPromise = RowUpdatingEvent & { promise?: Promise<void> };
type RowRemovingEventWithPromise = RowRemovingEvent & { promise?: Promise<void> };

export type AcclistManagerMode = "page" | "lookup"

export type AcclistManagerProps = {
  mode?: AcclistManagerMode
  onPickAcclist?: (row: AcclistInfo) => void
  onCloseLookup?: () => void
}

export default function AcclistPage({
  mode = "page",
  onPickAcclist,
  onCloseLookup,
}: AcclistManagerProps) {
  const isLookup = mode === "lookup"
  const screenCd = "/module/acclist-management";
  const gridId = "acclist-grid";
  const menuCode = "MD_ACCOUNT";
  const treeListRef = useRef<dxTreeList | null>(null);
  const { lang, translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string; lang: string };
  const [isUpdate, setIsUpdate] = useState(false);
  const popupTitle = translate ? translate(isUpdate ? "lblEdit" : "lblAddNew", "Acclist info") : "Acclist info";

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
    refetch: refetchAcclists,
  } = useAcclistListQuery();
  const { createMutation, updateMutation, deleteMutation } = useAcclistMutations();
  const loading = isLoading || isFetching;
  const reloadAcclists = useMasterListReload(refetchAcclists, treeListRef);
  useMasterListLoadError(isError, loadError, t, "Failed to load acclist");
  const [accTypeData, setAccTypeData] = useState<{ VALUE: number; TEXT: string }[]
  >([]);
  const lblChoose = translate ? translate('lblChoose', 'Choose') : 'Choose';
  const lblAccType = translate ? translate('ACC_TYPE', 'Account Type') : 'Account Type';
  const [selectedParentRow, setSelectedParentRow] = useState<AcclistInfo | null>(null);
  const { getCodesByType } = useSysCodes();

  const handleAddChild = (rowData: AcclistInfo) => {
    setSelectedParentRow(rowData);
    setTimeout(() => {
      treeListRef.current?.instance().addRow()
    }, 0);
  };

  useEffect(() => {
    try {
      const sysCodes = getCodesByType('ACC_ISABLETYPE');
      const mappedData: { VALUE: number; TEXT: string }[] = sysCodes.map((item: SysCode) => ({
        VALUE: Number(item.CODE_CD ?? 1),
        TEXT: String(translate ? translate(item.CODE_NAME ?? "") : item.CODE_NAME ?? ""),
      }));
      setAccTypeData(mappedData);
    } catch (error) {
      console.error(error);
      setAccTypeData([]);
    }
  }, [getCodesByType, translate]);

  const onRowInserting = (e: RowInsertingEventWithPromise) => {
    e.promise = (async () => {
      try {
        const newData = e.data;
        await createMutation.mutateAsync(newData);
        notify(t("MSG_INSERT_SUCCESS", "Insert successful"), "success", 3000);

        if (e.component) {
          (e.component as dxTreeList).cancelEditData();
        }
      } catch (error) {
          notify(getApiErrorMessage(error, t("MSG_INSERT_ERROR", "Insert failed")), "error", 3000);
      }
    })();
  };

  const onRowUpdating = (e: RowUpdatingEventWithPromise) => {
    e.promise = (async () => {
      try {
        const payload = { ...e.oldData, ...e.newData };
        await updateMutation.mutateAsync(payload);
        notify(t("MSG_EDIT_SUCCESS", "Edit successful"), "success", 3000);

        if (e.component) {
          (e.component as dxTreeList).cancelEditData();
        }
      } catch (error) {
        notify(getApiErrorMessage(error, t("MSG_EDIT_ERROR", "Edit failed")), "error", 3000);
      }
    })();
  };

  const onRowRemoving = (e: RowRemovingEventWithPromise) => {
  e.cancel = (async () => {
    try {
      const row = e.data;
      const id = row.ACC_ID ?? e.key;

      await deleteMutation.mutateAsync([id]);

      notify(t("MSG_DELETE_SUCCESS", "Delete successful"), "success", 3000);

      return false;
    } catch (error: unknown) {
      notify(getApiErrorMessage(error, t("MSG_DELETE_ERROR", "Delete failed")), "error", 3000);

      return true;
    }
  })();
};

  const getSelectedAccId = useCallback(() => {
    const selectedKeys = (treeListRef.current?.getSelectedRowKeys?.() ?? []) as unknown[];
    const firstKey = selectedKeys[0];
    const accId = typeof firstKey === "number" ? firstKey : Number(firstKey);

    return Number.isFinite(accId) && accId > 0 ? accId : undefined;
  }, []);

  const handleExportExcel = async () => {
    try {
      const accId = getSelectedAccId();
      const loadDownloadBlob = (signal: AbortSignal) => exportToExcel(accId, lang, signal);
      await downloadFile({ fileName: `${translate('TSAccitemAdd','Acc list')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`, load: loadDownloadBlob });
    } catch (error: unknown) {
      console.error('Export error', error);
      notify(
        getApiErrorMessage(error, translate ? translate('EXPORT_FAILED', 'Xuất thất bại') : 'Export failed'),
        'error',
        3000
      );
    }
  };

  const handleExportPdf = useCallback(() => {
    const accId = getSelectedAccId();
    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      accId: accId ? String(accId) : undefined,
      reportCode: "ACCOUNT_INFO",
      menuCode,
      screenCd,
      gridId,
    });
    if (!openReportViewerPage(targetUrl)) {
      notify(
        translate ? translate("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo") : "Unable to open report viewer",
        "error",
        3000
      );
    }
  }, [getSelectedAccId, gridId, menuCode, screenCd, translate]);

  const handleRowDblClick = useCallback((e: RowDblClickEvent<AcclistInfo, number>) => {
    if (isLookup) {
        if (e.data && e.data.ISABLEINPUT === '1') {
        onPickAcclist?.(e.data)
        onCloseLookup?.()
        }
        return
    }

    const tree = treeListRef.current
    if (!tree) {
        console.warn("treeListRef not initialized when double-click occurred")
        return
    }

    let idx: number | undefined | null =
      typeof (e as { rowIndex?: number }).rowIndex === "number"
        ? (e as { rowIndex?: number }).rowIndex
        : undefined

    if (idx === undefined && e?.row) {
        idx = e.row.rowIndex
    }

    if ((idx === undefined || idx === null) && e?.key !== undefined) {
        idx = tree.getRowIndexByKey(e.key as string | number)
    }

    if (idx !== undefined && idx !== null && idx !== -1) {
        tree.editRow(idx)
    } else {
        console.warn("unable to determine row index from dblclick event", e)
    }
}, [isLookup, onCloseLookup, onPickAcclist])

  const handleToolbarDelete = async () => {
    const keys = (treeListRef.current?.getSelectedRowKeys() || []) as (number)[];
    if (!keys.length) {
        notify(
          translate
            ? translate("MSG_CONFIRM_DELETE_SELECTED_ROWS", "Please select rows to delete")
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

  return (
    <MasterDataPageLayout
      toolbar={
        <GridToolbar
          gridRef={treeListRef}
          onRefresh={() => void reloadAcclists()}
          onExportPdf={handleExportPdf}
          onExportXlsx={handleExportExcel}
          showImport={false}
          onDelete={handleToolbarDelete}
          showAdd={false}
          showDelete={false}
        />
      }
    >
      <BaseTreeList<AcclistInfo>
        dataSource={gridData}
        keyExpr="ACC_ID"
        parentIdExpr="ACC_PARENT_ID"
        rootValue={0}
        menuCode={menuCode}
        screenCd={screenCd}
        gridId={gridId}
        onInitialized={(e) => {
          treeListRef.current = e.component ?? null;
        }}
        onRowDblClick={handleRowDblClick}
        wordWrapEnabled={true}
        onRowInserting={onRowInserting}
        onRowUpdating={onRowUpdating}
        onRowRemoving={onRowRemoving}
        onEditingStart={(event) => {
          const rowId = Number(event.key)
          setIsUpdate(Number.isFinite(rowId) && rowId > 0)
        }}
        onInitNewRow={(e) => {
          setIsUpdate(false);
          const parent = selectedParentRow;
          e.data.ACC_PARENT_ID = parent?.ACC_ID ?? null;
          e.data.ACC_CD = parent?.ACC_CD ?? "";
        }}
        onEditorPreparing={(e) => {
          if (!isUpdate && e.dataField === "ACC_CD" && e.parentType === "dataRow") {
            const prefix = selectedParentRow?.ACC_CD ?? "";

            e.editorOptions.mask = `${prefix}A`;
            e.editorOptions.maskChar = "_";
            e.editorOptions.useMaskedValue = true;
            e.editorOptions.showMaskMode = "always";
          }
        }}
      >
        <Editing
          mode="popup"
          allowUpdating={true}
          allowAdding={true}
          allowDeleting={true}
          confirmDelete={true}
        >
          <MasterDataTreeListEditPopup
            key={lang}
            title={popupTitle}
            width="90%"
            maxWidth={800}
          />
          <AcclistForm isUpdate={isUpdate} lblChoose={lblChoose} lblAccType={lblAccType} data={accTypeData} />
        </Editing>
        <AcclistColumns onAddChild={handleAddChild} />
      </BaseTreeList>

      <LoadPanel
        shadingColor="rgba(0, 0, 0, 0.4)"
        visible={loading}
        showIndicator={true}
        shading={true}
        showPane={true}
      />
    </MasterDataPageLayout>
  );
}
