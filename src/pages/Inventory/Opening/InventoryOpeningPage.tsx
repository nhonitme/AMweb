import { captureMasterPopupError } from "@/components/datagrid/masterPopupValidation";
import {
  clearMasterFormDraft,
  mergeMasterFormDraft,
  seedMasterFormDraft,
} from "@/components/lookup/masterFormDraft";
import { downloadFile } from "@/lib/fileUtils"
import { useCallback, useContext, useRef, useState } from "react"
import { LoadPanel } from "devextreme-react"
import { Editing } from "devextreme-react/data-grid"
import type {
  ContextMenuPreparingEvent,
  EditorPreparingEvent,
  RowDblClickEvent,
  RowInsertingEvent,
  RowRemovingEvent,
  RowUpdatingEvent,
} from "devextreme/ui/data_grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import type dxForm from "devextreme/ui/form"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"

import DxPage from "@/dx/DxPage"
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout"
import MasterDataEditPopup from "@/components/datagrid/MasterDataEditPopup"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { getApiErrorMessage } from "@/api/apiTypes"
import { exportInventoryOpeningExcel } from "@/api/inventoryOpeningApi"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import { normalizeMessageLanguageKey } from "@/utils/language"
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers"
import {
  useInventoryOpeningListQuery,
  useInventoryOpeningMutations,
} from "@/hooks/queries/useInventoryOpeningQueries"
import type { InventoryOpening } from "@/types/inventoryOpening"
import type { Product } from "@/types/product"
import type { StoreInfo } from "@/types/store"
import type { Unit } from "@/types/unit"
import { InventoryOpeningColumns, applyProductLookup, applyStoreLookup, applyUnitLookup } from "./Columns/InventoryOpeningColumns"
import { InventoryOpeningForm } from "./Forms/InventoryOpeningForm"
import { useInventoryOpeningImportConfig } from "./Columns/InventoryOpeningImportConfig"

type RowInsertingEventWithPromise = RowInsertingEvent & { promise?: Promise<void> }
type RowUpdatingEventWithPromise = RowUpdatingEvent & { promise?: Promise<void> }

type EditorValueChangedEvent = {
  value?: unknown
  component?: {
    option?: (name: string) => unknown
  }
}

export default function InventoryOpeningPage() {
  const gridRef = useRef<dxDataGrid | null>(null)
  const editFormRef = useRef<dxForm | null>(null)
  const { lang, translate } = useContext(LanguageContext) as {
    translate: (k: string, f?: string) => string
    lang: string
  }
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [isUpdate, setIsUpdate] = useState(false)
  const importConfig = useInventoryOpeningImportConfig()
  const langCode = normalizeMessageLanguageKey(lang)
  const screenCd = "/inventory/opening"
  const gridId = "inventory-opening-grid"
  const menuCode = "INV_OPENING"
  const popupTitle = translate ? translate(isUpdate ? "lblEdit" : "lblAddNew", "Inventory opening") : "Inventory opening"

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  )

  const {
    data: gridData = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch,
  } = useInventoryOpeningListQuery()
  const { createMutation, updateMutation, deleteMutation } = useInventoryOpeningMutations()
  const loading = isLoading || isFetching
  const reload = useMasterListReload(refetch, gridRef)
  useMasterListLoadError(isError, loadError, t, "Failed to load inventory opening list")

  const onContextMenuPreparing = (e: ContextMenuPreparingEvent) => {
    if (e.row && e.row.rowType === "data") {
      e.items = [
        {
          text: t("lblEdit", "Update"),
          onItemClick: () => {
            gridRef.current?.editRow(e.row!.rowIndex)
          },
        },
        {
          text: t("lblDelete", "Delete"),
          onItemClick: () => {
            gridRef.current?.deleteRow(e.row!.rowIndex)
          },
        },
      ]
    }
  }

  const onEditorPreparing = (e: EditorPreparingEvent<InventoryOpening, number>) => {
    if (e.parentType !== "dataRow") return

    const dataField = e.dataField
    if (!dataField) return

    if (dataField === "PRODUCT_ID" || dataField === "STORE_ID" || dataField === "UNIT_ID") {
      const previous = e.editorOptions?.onValueChanged as ((args: EditorValueChangedEvent) => void) | undefined
      e.editorOptions = {
        ...e.editorOptions,
        onValueChanged: (args: EditorValueChangedEvent) => {
          previous?.(args)
          const row = e.row?.data
          if (!row) return

          const selectedItem = args.component?.option?.("selectedItem") as Product | StoreInfo | Unit | null | undefined
          if (dataField === "PRODUCT_ID") {
            applyProductLookup(row, selectedItem as Product | null | undefined)
            e.setValue?.(args.value, row)
          } else if (dataField === "STORE_ID") {
            applyStoreLookup(row, selectedItem as StoreInfo | null | undefined)
            e.setValue?.(args.value, row)
          } else if (dataField === "UNIT_ID") {
            applyUnitLookup(row, selectedItem as Unit | null | undefined)
            e.setValue?.(args.value, row)
          }

          const form = e.component
          form?.cellValue(e.row!.rowIndex, "PRODUCT_CD", row.PRODUCT_CD)
          form?.cellValue(e.row!.rowIndex, "PRODUCT_NM_VIET", row.PRODUCT_NM_VIET)
          form?.cellValue(e.row!.rowIndex, "PRODUCT_NM_ENG", row.PRODUCT_NM_ENG)
          form?.cellValue(e.row!.rowIndex, "PRODUCT_NM_KOR", row.PRODUCT_NM_KOR)
          form?.cellValue(e.row!.rowIndex, "PRODUCT_NM_CHINA", row.PRODUCT_NM_CHINA)
          form?.cellValue(e.row!.rowIndex, "STORE_CD", row.STORE_CD)
          form?.cellValue(e.row!.rowIndex, "STORE_NM_VIET", row.STORE_NM_VIET)
          form?.cellValue(e.row!.rowIndex, "STORE_NM_ENG", row.STORE_NM_ENG)
          form?.cellValue(e.row!.rowIndex, "STORE_NM_KOR", row.STORE_NM_KOR)
          form?.cellValue(e.row!.rowIndex, "STORE_NM_CHINA", row.STORE_NM_CHINA)
          form?.cellValue(e.row!.rowIndex, "UNIT_ID", row.UNIT_ID)
          form?.cellValue(e.row!.rowIndex, "UNIT_CD", row.UNIT_CD)
          form?.cellValue(e.row!.rowIndex, "UNIT_NM", row.UNIT_NM)
          form?.cellValue(e.row!.rowIndex, "AMOUNT_CC", row.AMOUNT_CC)
        },
      }
    }

    if (dataField === "QUANTITY" || dataField === "UNIT_PRICE_CC" || dataField === "AMOUNT_CC") {
      const previous = e.editorOptions?.onValueChanged as ((args: EditorValueChangedEvent) => void) | undefined
      e.editorOptions = {
        ...e.editorOptions,
        onValueChanged: (args: EditorValueChangedEvent) => {
          previous?.(args)
          const row = e.row?.data
          if (!row) return
          const nextValue = Number(args.value)
          const safeValue = Number.isFinite(nextValue) ? nextValue : 0

          if (dataField === "AMOUNT_CC") {
            // Manual amount — keep qty/price unchanged.
            row.AMOUNT_CC = safeValue
            e.setValue?.(args.value)
            return
          }

          if (dataField === "QUANTITY") row.QUANTITY = safeValue
          if (dataField === "UNIT_PRICE_CC") row.UNIT_PRICE_CC = safeValue
          row.AMOUNT_CC = Number(row.QUANTITY ?? 0) * Number(row.UNIT_PRICE_CC ?? 0)
          e.setValue?.(args.value)
          e.component?.cellValue(e.row!.rowIndex, "AMOUNT_CC", row.AMOUNT_CC)
        },
      }
    }
  }

  const onRowInserting = (e: RowInsertingEventWithPromise) => {
    const reportSaveError = captureMasterPopupError(e.component)
    e.promise = (async () => {
      try {
        const popupFormData = editFormRef.current?.option("formData") as Partial<InventoryOpening> | undefined
        const payload = mergeMasterFormDraft({
          PRODUCT_ID: e.data?.PRODUCT_ID ?? popupFormData?.PRODUCT_ID,
          PRODUCT_CD: e.data?.PRODUCT_CD ?? popupFormData?.PRODUCT_CD,
          STORE_ID: e.data?.STORE_ID ?? popupFormData?.STORE_ID,
          STORE_CD: e.data?.STORE_CD ?? popupFormData?.STORE_CD,
          UNIT_ID: e.data?.UNIT_ID ?? popupFormData?.UNIT_ID,
          UNIT_CD: e.data?.UNIT_CD ?? popupFormData?.UNIT_CD,
          QUANTITY: Number(e.data?.QUANTITY ?? popupFormData?.QUANTITY ?? 0),
          UNIT_PRICE_CC: Number(e.data?.UNIT_PRICE_CC ?? popupFormData?.UNIT_PRICE_CC ?? 0),
          AMOUNT_CC: Number(e.data?.AMOUNT_CC ?? popupFormData?.AMOUNT_CC ?? 0),
          SUMMARY: e.data?.SUMMARY ?? popupFormData?.SUMMARY ?? "",
        })
        await createMutation.mutateAsync(payload)
        notify(t("MSG_INSERT_SUCCESS", "Created successfully"), "success", 1000)
        if (e.component) {
          ;(e.component as dxDataGrid).cancelEditData()
        }
      } catch (error: unknown) {
        reportSaveError(getApiErrorMessage(error, t("INSERT_FAILED", "Thêm mới thất bại")))
        throw error
      }
    })()
  }

  const onRowUpdating = (e: RowUpdatingEventWithPromise) => {
    const reportSaveError = captureMasterPopupError(e.component)
    e.promise = (async () => {
      try {
        const popupFormData = editFormRef.current?.option("formData") as Partial<InventoryOpening> | undefined
        const definedNewData = Object.fromEntries(
          Object.entries(e.newData ?? {}).filter(([, value]) => value !== undefined),
        ) as Partial<InventoryOpening>
        const merged = mergeMasterFormDraft({ ...e.oldData, ...popupFormData, ...definedNewData })
        const payload = {
          INPUT_ID: merged.INPUT_ID,
          TRANSFER_ID: merged.TRANSFER_ID,
          PRODUCT_ID: merged.PRODUCT_ID,
          PRODUCT_CD: merged.PRODUCT_CD,
          STORE_ID: merged.STORE_ID,
          STORE_CD: merged.STORE_CD,
          UNIT_ID: merged.UNIT_ID,
          UNIT_CD: merged.UNIT_CD,
          QUANTITY: Number(merged.QUANTITY ?? 0),
          UNIT_PRICE_CC: Number(merged.UNIT_PRICE_CC ?? 0),
          AMOUNT_CC: Number(merged.AMOUNT_CC ?? 0),
          SUMMARY: merged.SUMMARY ?? "",
        }
        await updateMutation.mutateAsync(payload)
        notify(t("MSG_EDIT_SUCCESS", "Edit successful"), "success", 1000)
        if (e.component) {
          ;(e.component as dxDataGrid).cancelEditData()
        }
      } catch (error: unknown) {
        reportSaveError(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")))
        throw error
      }
    })()
  }

  const onRowRemoving = (e: RowRemovingEvent) => {
    e.cancel = (async () => {
      try {
        const id = (e.data as InventoryOpening)?.INPUT_ID ?? (e.key as number)
        await deleteMutation.mutateAsync([Number(id)])
        notify(t("MSG_DELETE_SUCCESS", "Delete successful"), "success", 3000)
        return false
      } catch (error: unknown) {
        notify(getApiErrorMessage(error, t("MSG_DELETE_ERROR", "Delete failed")), "error", 3000)
        return true
      }
    })()
  }

  const handleExportExcel = async () => {
    try {
      const keys = gridRef.current?.getSelectedRowKeys() || []
      const inputId = keys.length ? (keys[0] as number) : undefined
      const loadDownloadBlob = (signal: AbortSignal) => exportInventoryOpeningExcel(inputId, langCode, signal)
      await downloadFile({ fileName: `${t("INVENTORY_OPENING", "Inventory opening")}_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
    } catch (err) {
      notify(getApiErrorMessage(err, t("EXPORT_FAILED", "Xuất thất bại")), "error", 3000)
    }
  }

  const handleExportPdf = () => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as number[]
    const inputId = keys.length ? keys[0] : undefined
    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      inputId: inputId ? String(inputId) : undefined,
      reportCode: "INVENTORY_OPENING_INFO",
      menuCode,
      screenCd,
      gridId,
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }

  const handleRowDblClick = (e: RowDblClickEvent<InventoryOpening, number>) => {
    if (!gridRef.current) return
    let idx: number | undefined | null =
      typeof (e as { rowIndex?: number }).rowIndex === "number" ? (e as { rowIndex?: number }).rowIndex : undefined
    if (idx === undefined && e?.row) idx = e.row.rowIndex
    if ((idx === undefined || idx === null) && e?.key !== undefined) {
      idx = gridRef.current.getRowIndexByKey(e.key as string | number)
    }
    if (idx !== undefined && idx !== null && idx !== -1) {
      gridRef.current.editRow(idx)
    }
  }

  const handleToolbarDelete = async () => {
    const keys = (gridRef.current?.getSelectedRowKeys() || []) as number[]
    if (!keys.length) {
      notify(t("MSG_PLEASE_SELECT_ROWS_TO_DELETE", "Please select rows to delete"), "warning", 1000)
      return
    }

    const result = await confirm(
      t("MSG_CONFIRM_DELETE_RECORD", "Are you sure you want to delete {0} record?").replace("{0}", String(keys.length)),
      t("MSG_CONFIRM_DELETE", "Confirm delete"),
    )
    if (!result) return

    try {
      await deleteMutation.mutateAsync(keys)
      notify(t("MSG_DELETE_SUCCESS", "Delete successful"), "success", 1000)
    } catch (error) {
      notify(getApiErrorMessage(error, t("MSG_DELETE_ERROR", "Delete failed")), "error", 1000)
    }
  }

  return (
    <DxPage>
      <MasterDataPageLayout
        toolbar={
          <GridToolbar
            gridRef={gridRef}
            onRefresh={() => void reload()}
            onExportPdf={handleExportPdf}
            onExportXlsx={undefined}
            showExportXlsx={false}
            onImport={() => setIsExcelModalOpen(true)}
            onDelete={() => void handleToolbarDelete()}
          />
        }
        overlays={
          <BaseExcelImportPopup
            visible={isExcelModalOpen}
            onClose={() => setIsExcelModalOpen(false)}
            title={t("INVENTORY_OPENING", "Import inventory opening")}
            moduleCd={importConfig.moduleCd}
            templateUrl="/System/DownloadTemplate"
            templateFileName={importConfig.templateName}
            params={{ lang: localStorage.getItem("lang") ?? undefined }}
            onImported={() => void reload()}
          />
        }
      >
        <BaseDataGrid<InventoryOpening>
          dataSource={gridData}
          keyExpr="INPUT_ID"
          menuCode={menuCode}
          screenCd={screenCd}
          gridId={gridId}
          actionButtons
          actionButtonsPosition="start"
          onInitialized={(e) => {
            gridRef.current = e.component ?? null
          }}
          onRowInserting={onRowInserting}
          onRowUpdating={onRowUpdating}
          onRowRemoving={onRowRemoving}
          onEditorPreparing={onEditorPreparing}
          onContextMenuPreparing={onContextMenuPreparing}
          onRowDblClick={handleRowDblClick}
          onEditingStart={(e) => {
            setIsUpdate(true)
            seedMasterFormDraft(e.data as unknown as Record<string, unknown>)
          }}
          onEditCanceled={() => clearMasterFormDraft()}
          onInitNewRow={(e) => {
            setIsUpdate(false)
            seedMasterFormDraft(e.data as unknown as Record<string, unknown>)
            e.data.QUANTITY = 0
            e.data.UNIT_PRICE_CC = 0
            e.data.AMOUNT_CC = 0
            e.data.STATE = "0"
            void getCurrentCompanyCd()
          }}
        >
          <Editing mode="popup" allowUpdating allowAdding allowDeleting confirmDelete>
            <MasterDataEditPopup key={lang} title={popupTitle} width="90%" maxWidth={800} />
            <InventoryOpeningForm
              onFormInstance={(form) => {
                editFormRef.current = form
              }}
            />
          </Editing>
          <InventoryOpeningColumns />
        </BaseDataGrid>

        <LoadPanel
          shadingColor="rgba(0, 0, 0, 0.4)"
          visible={loading}
          showIndicator
          shading
          showPane
        />
      </MasterDataPageLayout>
    </DxPage>
  )
}
