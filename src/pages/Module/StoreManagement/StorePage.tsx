import { useContext, useEffect, useRef, useState } from "react";
import { LoadPanel } from "devextreme-react";
import { Editing, Popup as DxPopup } from "devextreme-react/data-grid";
import { ContextMenuPreparingEvent, RowInsertingEvent, RowUpdatingEvent, RowRemovingEvent } from "devextreme/ui/data_grid";
import type dxDataGrid from "devextreme/ui/data_grid";

import "./StorePage.scss";

import DxPage from "@/dx/DxPage";
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { GridToolbar } from "@/components/toolbar/GridToolbar";

import { StoreColumns } from "./Columns/StoreColumns";
import { StoreForm } from "./Forms/StoreForm";

import { getStoreInfos,createStoreInfo,updateStoreInfo,deleteStoreInfo, exportToExcel, importFromExcel, deleteStoreInfos } from "@/api/storeAPI";
import { LookupAsync } from '@/api/storeKindAPI';
import {StoreInfo } from "@/types/store";
import notify from "devextreme/ui/notify";
import { LanguageContext } from "@/lib/i18nLoader";
import ExcelImportModal from "@/components/modals/ExcelImportModal";
import { useStoreImportConfig } from "./Columns/StoreImportConfig";
import { confirm } from "devextreme/ui/dialog";
import { convertLangToCode } from "@/utils/language";
import { getCurrentUserId } from "@/lib/login";

type RowInsertingEventWithPromise = RowInsertingEvent & { promise?: Promise<void> };
type RowUpdatingEventWithPromise = RowUpdatingEvent & { promise?: Promise<void> };
type RowRemovingEventWithPromise = RowRemovingEvent & { promise?: Promise<void> };

export type StorePageMode = "page" | "lookup";

export type StorePageProps = {
  mode?: StorePageMode;
  hideToolbar?: boolean;
  onPickStore?: (row: StoreInfo) => void;
  onCloseLookup?: () => void;
};

export default function StoreList({
  mode = "page",
  hideToolbar = false,
  onPickStore,
  onCloseLookup,
}: StorePageProps) {
  const isLookup = mode === "lookup";
  const [loading, setLoading] = useState(true);
  const [gridData, setGridData] = useState<StoreInfo[]>([]);
  const gridRef = useRef<dxDataGrid | null>(null);
  const { lang, translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string; lang: string };
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
  const importConfig = useStoreImportConfig();
  const langCode = convertLangToCode(lang);
  const [storeKindData, setStoreKindData] = useState<
    { VALUE: string; TEXT: string }[]
  >([]);
  const [isUpdate, setIsUpdate] = useState(false);
  const popupTitle = translate ? translate(isUpdate ? "lblEdit" : "lblAddNew", "Store info") : "Store info";
  const lblKind = translate ? translate('STORE_KIND_CD', 'Store Kind') : 'Store Kind';
  const lblChoose = translate ? translate('lblChoose', 'Choose') : 'Choose';
  const [isEditPopupOpen, setIsEditPopupOpen] = useState(false);

  const loadStoreKindData = async () => {
  try {
    const res = await LookupAsync(undefined, langCode);
    setStoreKindData(res?.Data || res || []);
  } catch (error) {
    console.error(error);
    setStoreKindData([]);
  }
};

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

  const loadStoreInfos = async () => {
    try {
      setLoading(true);
      const response = await getStoreInfos();
      setGridData(response.data);

      gridRef.current?.clearSelection();
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
        newData.USERID = getCurrentUserId() || "unknown";

        // Gọi API để thêm sản phẩm mới
        // const result = await createStoreInfo(e.data);
        await createStoreInfo(newData);
       notify( translate ? translate("MSG_INSERT_SUCCESS", "success") : "Insert successful", "success", 1000);

        await loadStoreInfos(); // Reload lại danh sách
      } catch (error) {
        alert("Insert error:" + " " + error)
        // Xử lý lỗi, ví dụ show thông báo
        // setNotification({ isOpen: true, type: "error", title: "Thất bại!", message: "Thêm sản phẩm thất bại!" });
      } finally {
        // Đóng popup bằng cách hủy trạng thái edit
        if (e.component) {
          (e.component as dxDataGrid).cancelEditData();
        }
      }
    })();
  };

  const onRowUpdating = (e: RowUpdatingEventWithPromise) => {
    e.promise = (async () => {
      try {
        // e.key là id, e.newData là dữ liệu mới, e.oldData là dữ liệu cũ
        const payload = { ...e.oldData, ...e.newData }; // merge để có đủ dữ liệu
        if (payload.STORE_KIND_ID == null) {
          delete payload.STORE_KIND_ID;
        }
        await updateStoreInfo(payload);
        notify( translate ? translate("MSG_EDIT_SUCCESS", "success") : "Edit successful", "success", 1000);
        await loadStoreInfos();
      } catch (error) {
        alert("Update error: " + error);
      } finally {
        if (e.component) {
          (e.component as dxDataGrid).cancelEditData();
        }
      }
    })();
  };

const onRowRemoving = (e: RowRemovingEvent) => {
  e.cancel = (async () => {
    try {
      const row = e.data;
      const id = row.STORE_ID ?? e.key;

      const result = await deleteStoreInfo(id, langCode);

      notify(
        translate
          ? translate("MSG_DELETE_SUCCESS", "Delete successful")
          : "Delete successful",
        "success",
        3000
      );

      await loadStoreInfos();

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

    const handleExportExcel = async () => {
    try {
      const keys = gridRef.current?.getSelectedRowKeys() || [];
      const storeID = keys.length ? (keys[0] as number) : undefined;
      const blob = await exportToExcel(storeID, langCode);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${translate('TSStore','Warehouse management management')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export error', err);
      notify(
        translate ? translate('Export failed','Export failed') : 'Export failed',
        'error',
        3000
      );
    }
  };

  const handleImport = async (
      rows: any[],
      method: "add" | "update" | "overwrite",
      file?: File
    ) => {
      console.debug('handleImport called', { rows, method, file, lang });
      try {
        if (file) {
          // prefer server bulk upload when file available
          console.debug('calling importCustomerExtExcel with file', file.name, file.size, lang);
          const resp = await importFromExcel(file, langCode);
          console.debug('server import response', resp);
        } else {
          if (method === "overwrite" || method === "add") {
            for (const r of rows) {
              await createStoreInfo(r as Partial<StoreInfo>);
            }
          } else if (method === "update") {
            for (const r of rows) {
              if (r.STORE_ID) await updateStoreInfo(r as StoreInfo);
            }
          }
        }
      } catch (err: any) {
        console.error("Import error", err);
        let msg = translate ? translate('Import failed','Import failed') : 'Import failed';
        if (err?.response?.data) {
          // server might send { Message: '', Errors: [] } or simple string
          const data = err.response.data;
          if (typeof data === 'string') {
            msg += `: ${data}`;
          } else if (data.Message) {
            msg += `: ${data.Message}`;
          } else if (data.error) {
            msg += `: ${data.error}`;
          }
        }
        notify(msg, 'error', 5000);
      }
      await loadStoreInfos();
    };

const handleRowDblClick = (e: any) => {
    if (isLookup) {
      if (e?.data) {
        onPickStore?.(e.data as StoreInfo);
        onCloseLookup?.();
      }
      return;
    }

    if (!gridRef.current) {
      console.warn('gridRef not initialized when double-click occurred');
      return;
    }
    let idx: number | undefined | null = e?.rowIndex;
    if (idx === undefined && e?.row) {
      idx = e.row.rowIndex;
    }
    if ((idx === undefined || idx === null) && e?.key !== undefined) {
      idx = gridRef.current.getRowIndexByKey(e.key as any);
    }
    if (idx !== undefined && idx !== null && idx !== -1) {
      gridRef.current.editRow(idx);
    } else {
      console.warn('unable to determine row index from dblclick event', e);
    }
  };

  // Tải khi component khởi tạo
  useEffect(() => {
    loadStoreKindData();
    loadStoreInfos();
  }, []);

const handleToolbarDelete = async () => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as (number)[];
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
      await deleteStoreInfos(keys);
      notify( translate ? translate("MSG_DELETE_SUCCESS", "success") : "Delete successful", "success", 1000);
      await loadStoreInfos();
    } catch (error) {
      notify(translate ? translate("MSG_DELETE_ERROR", "error") :  "Delete failed", "error", 1000);
    }
};

  const content = (
    <>
      {!hideToolbar && (
        <GridToolbar
          title="Store List"
        titleKey="TSStore" //Quản lý kho bãi
        gridRef={gridRef}
        onRefresh={loadStoreInfos}
        onExportPdf={() => alert("Export To PDF clicked")}
        onExportXlsx={handleExportExcel}
        onImport={() => setIsExcelModalOpen(true)}
          onDelete={handleToolbarDelete}
        />
      )}

      <ExcelImportModal
        isOpen={isExcelModalOpen}
        onClose={() => setIsExcelModalOpen(false)}
        onImport={handleImport}
        existingData={gridData}
        config={importConfig}
        hideUpdateOverwrite={true}
      />

      <div className="data-grid-container">
        <BaseDataGrid<StoreInfo>
          dataSource={gridData}
          keyExpr="STORE_ID"
          screenCd={mode === "lookup" ? "/module/store-management/lookup" : "/module/store-management"}
          gridId={mode === "lookup" ? "store-lookup-grid" : "store-grid"}
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
          onEditingStart={() => setIsUpdate(true)}
          onInitNewRow={(e) => {
            setIsUpdate(false);

            e.data.ISUSE = true;
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
            {/* <Popup title={translate ? translate(isUpdate ? "lblEdit" : "lblAddNew", "Store info") : "Store info"} showTitle={true} width={800} /> */}
            <StoreForm isUpdate={isUpdate} data={storeKindData} lblKind={lblKind} lblChoose={lblChoose} />
          </Editing>

          <StoreColumns/>
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
