import { useCallback, useContext, useEffect, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react";
import { Editing, Popup as DxPopup } from 'devextreme-react/tree-list';

import { ContextMenuPreparingEvent, RowInsertingEvent, RowUpdatingEvent, RowRemovingEvent } from "devextreme/ui/tree_list";
import type dxTreeList  from "devextreme/ui/tree_list";

import "./AcclistPage.scss";

import BaseTreeList from "@/components/datagrid/BaseTreeList";
import { TreeListToolbar } from "@/components/toolbar/TreeListToolbar";

import { AcclistColumns} from "./Columns/AcclistColumns";
import { AcclistForm } from "./Forms/AcclistForm";

import { getAcclistInfos,createAcclistInfo,updateAcclistInfo, exportToExcel, deleteAcclistInfos, deleteAcclistInfo } from "@/api/acclistAPI";
import notify from "devextreme/ui/notify";
import { LanguageContext } from "@/lib/i18nLoader";
import { confirm } from "devextreme/ui/dialog";
import { AcclistInfo } from "@/types/acclist";
import { SysCode } from "@/api/sysCodeService";
import { useSysCodes } from "@/lib/sysCodeContext";
import { downloadBlobFile } from "@/lib/fileUtils";
import { getCurrentCompanyCd } from "@/lib/login";
import { convertLangToCode } from "@/utils/language";

type RowInsertingEventWithPromise = RowInsertingEvent & { promise?: Promise<void> };
type RowUpdatingEventWithPromise = RowUpdatingEvent & { promise?: Promise<void> };
type RowRemovingEventWithPromise = RowRemovingEvent & { promise?: Promise<void> };

export type AcclistManagerMode = "page" | "lookup"

export type AcclistManagerProps = {
  mode?: AcclistManagerMode
  hideToolbar?: boolean
  onPickAcclist?: (row: AcclistInfo) => void
  onCloseLookup?: () => void
}

export default function AcclistPage({
  mode = "page",
  hideToolbar = false,
  onPickAcclist,
  onCloseLookup,
}: AcclistManagerProps) {
  const isLookup = mode === "lookup"
  const [loading, setLoading] = useState(true);
  const [gridData, setGridData] = useState<AcclistInfo[]>([]);
  const treeListRef = useRef<dxTreeList | null>(null);
  const { lang, translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string; lang: string };
  const [isUpdate, setIsUpdate] = useState(false);
  const popupTitle = translate ? translate(isUpdate ? "lblEdit" : "lblAddNew", "Acclist info") : "Acclist info";
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);
  const [accTypeData, setAccTypeData] = useState<{ VALUE: number; TEXT: string }[]
  >([]);
  const lblChoose = translate ? translate('lblChoose', 'Choose') : 'Choose';
  const lblAccType = translate ? translate('ACC_TYPE', 'Account Type') : 'Account Type';
  const [selectedParentRow, setSelectedParentRow] = useState<any>(null);
  const { getCodesByType } = useSysCodes();

  const handleAddChild = (rowData: any) => {
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

  const onContextMenuPreparing = (e: ContextMenuPreparingEvent) => {
    if (e.row && e.row.rowType === "data") {
      e.items = [
        {
          text: "Update",
          onItemClick: () => {
            treeListRef.current?.editRow(e.row!.rowIndex);
          },
        },
        {
          text: "Delete",
          onItemClick: () => {
            treeListRef.current?.deleteRow(e.row!.rowIndex);
          },
        },
      ];
    }
  };

  const loadAcclistInfos = async () => {
    try {
      setLoading(true);
      const response = await getAcclistInfos();
      setGridData(response.data);

      treeListRef.current?.clearSelection();
    } catch (error) {
      console.error("Tải danh sách hàng tồn kho thất bại", error);
    } finally {
      setLoading(false);
    }
  };

  const onRowInserting = (e: RowInsertingEventWithPromise) => {
    e.promise = (async () => {
      try {
        const newData = e.data;
        await createAcclistInfo(newData);
        notify( translate ? translate("MSG_INSERT_SUCCESS", "success") : "Insert successful", "success", 3000);

        // Đóng popup bằng cách hủy trạng thái edit
        if (e.component) {
          (e.component as dxTreeList).cancelEditData();
        }

        await loadAcclistInfos(); // Reload lại danh sách
      } catch (error: any) {
          notify(translate ? translate("MSG_INSERT_ERROR", "error") :  "Insert failed", "error", 3000);
      } finally {
        
      }
    })();
  };

  const onRowUpdating = (e: RowUpdatingEventWithPromise) => {
    e.promise = (async () => {
      try {
        // e.key là id, e.newData là dữ liệu mới, e.oldData là dữ liệu cũ
        const payload = { ...e.oldData, ...e.newData }; // merge để có đủ dữ liệu
        await updateAcclistInfo(payload);
        notify( translate ? translate("MSG_EDIT_SUCCESS", "success") : "Edit successful", "success", 3000);

        // Đóng popup bằng cách hủy trạng thái edit
        if (e.component) {
          (e.component as dxTreeList).cancelEditData();
        }

        await loadAcclistInfos();
      } catch (error: any) {
        notify(translate ? translate("MSG_EDIT_ERROR", "error")  :  "Edit failed", "error", 3000);
      } finally {

      }
    })();
  };

  const onRowRemoving = (e: RowRemovingEventWithPromise) => {
  e.cancel = (async () => {
    try {
      const row = e.data;
      const id = row.ACC_ID ?? e.key;

      const result = await deleteAcclistInfo(id, convertLangToCode(lang));

      notify(
        translate
          ? translate("MSG_DELETE_SUCCESS", "Delete successful")
          : "Delete successful",
        "success",
        3000
      );

      await loadAcclistInfos();

      return false; // cho phép xóa
    } catch (error: any) {
      notify(
        error?.response?.data?.Message ??
          (translate
            ? translate("MSG_DELETE_ERROR", "Delete failed")
            : "Delete failed"),
        "error",
        3000
      );

      return true; // chặn xóa
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
      const blob = await exportToExcel(accId, lang);
      downloadBlobFile(
        blob,
        `${translate('TSAccitemAdd','Acc list')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`
      );
    } catch (error: any) {
      console.error('Export error', error);
      notify(
        translate ? translate('Export failed','Export failed') : 'Export failed',
        'error',
        3000
      );
    }
  };

  const handleExportPdf = useCallback(() => {
    const companyCd = getCurrentCompanyCd();
    const accId = getSelectedAccId();
    const params = new URLSearchParams();

    if (companyCd) {
      params.set("companyCd", companyCd);
    }

    if (accId) {
      params.set("accId", String(accId));
    }

    params.set("reportCode", "ACCOUNT_INFO");

    const targetUrl = `${window.location.origin}/report-viewer${params.toString() ? `?${params.toString()}` : ""}`;
    const viewerWindow = window.open(targetUrl, "_blank", "noopener,noreferrer");

    if (!viewerWindow) {
      notify(
        translate ? translate("Unable to open report viewer", "Unable to open report viewer") : "Unable to open report viewer",
        "error",
        3000
      );
    }
  }, [getSelectedAccId, translate]);

  const handleRowDblClick = useCallback((e: any) => {
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

    let idx: number | undefined | null = e?.rowIndex

    if (idx === undefined && e?.row) {
        idx = e.row.rowIndex
    }

    if ((idx === undefined || idx === null) && e?.key !== undefined) {
        idx = tree.getRowIndexByKey(e.key as any)
    }

    if (idx !== undefined && idx !== null && idx !== -1) {
        tree.editRow(idx)
    } else {
        console.warn("unable to determine row index from dblclick event", e)
    }
}, [isLookup, onCloseLookup, onPickAcclist])

  const hasLoadedAcclistRef = useRef(false);

  // Tải khi component khởi tạo
  useEffect(() => {
    if (hasLoadedAcclistRef.current) return;
    hasLoadedAcclistRef.current = true;
    loadAcclistInfos();
  }, []);

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
      await deleteAcclistInfos(keys);
      notify( translate ? translate("MSG_DELETE_SUCCESS", "success") : "Delete successful", "success", 1000);
      await loadAcclistInfos();
    } catch (error) {
      notify(translate ? translate("MSG_DELETE_ERROR", "error") :  "Delete failed", "error", 1000);
    }
};

  return (
    <>
    {!hideToolbar && (
      <TreeListToolbar
        title="acc List"
        titleKey="TSAccitemAdd" //Quản lý kho bãi
        treeListRef={treeListRef}
        onRefresh={loadAcclistInfos}
        onExportPdf={handleExportPdf}
        onExportXlsx={handleExportExcel}
        showImport={false}
        onDelete={handleToolbarDelete}
        showAdd={false}
        showDelete={false}
      />
     )}
      <div className="data-tree-list-container">
        <BaseTreeList<AcclistInfo>
            dataSource={gridData}
            keyExpr="ACC_ID"
            parentIdExpr="ACC_PARENT_ID"
            rootValue={0}
            screenCd={mode === "lookup" ? "/module/acclist-management/lookup" : "/module/acclist-management"}
            gridId={mode === "lookup" ? "acclist-lookup-grid" : "acclist-grid"}
            onInitialized={(e) => {
            treeListRef.current = e.component ?? null;
          }}
            onRowDblClick={handleRowDblClick}
            wordWrapEnabled={true}
            onRowInserting={onRowInserting}
            onRowUpdating={onRowUpdating}
            onRowRemoving={onRowRemoving}
            onEditingStart={() => setIsUpdate(true)}
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
              <DxPopup
                  key={lang}
                  title={popupTitle}
                  showTitle={true}
                  width="90%"
                  maxWidth={800}
                  deferRendering={true}
                  onShown={() => setIsEditPopupOpen(true)}
                  onHidden={() => setIsEditPopupOpen(false)}
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
      </div>
    </>
  );
}
