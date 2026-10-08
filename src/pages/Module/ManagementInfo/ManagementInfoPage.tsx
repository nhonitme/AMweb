import { captureMasterPopupError } from "@/components/datagrid/masterPopupValidation";
import {
  clearMasterFormDraft,
  mergeMasterFormDraft,
  seedMasterFormDraft,
} from "@/components/lookup/masterFormDraft";
import { useCallback, useContext, useMemo, useRef, useState } from "react"
import { LoadPanel } from "devextreme-react"
import { Column, Editing } from "devextreme-react/data-grid"
import {
  RowDblClickEvent,
  RowInsertingEvent,
  RowRemovingEvent,
  RowUpdatingEvent,
} from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"

import "./ManagementInfoPage.scss"

import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout"
import DxPage from "@/dx/DxPage"
import {
  exportManagementInfoExcel,
} from "@/api/managementInfoApi"
import MasterDataEditPopup from "@/components/datagrid/MasterDataEditPopup"
import { getApiErrorMessage } from "@/api/apiTypes"
import { downloadFile } from "@/lib/fileUtils"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { assignSequencePreviewCode, getSequenceSubmitCode } from "@/lib/codeSequence"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import type { ManagementInfo, ManagementInfoApi } from "@/types/managementInfo"
import {
  useManagementInfoListQuery,
  useManagementInfoMutations,
} from "@/hooks/queries/master/masterDataQueries"
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers"
import { managementInfoFields } from "./Columns/ManagementInfoColumns"
import { ManagementInfoForm } from "./Forms/ManagementInfoForm"
import { createManagementInfoImportConfig } from "./ManagementInfoImportConfig"
import {
  createDefaultManagementInfo,
  mapManagementInfoToApiPayload,
  normalizeManagementInfoRows,
} from "./managementInfoUtils"

type TKey = string | number

type RowInsertingEventWithPromise = RowInsertingEvent<ManagementInfo, TKey> & { promise?: Promise<void> }
type RowUpdatingEventWithPromise = RowUpdatingEvent<ManagementInfo, TKey> & { promise?: Promise<void> }
type RowRemovingEventWithPromise = RowRemovingEvent<ManagementInfo, TKey> & { promise?: Promise<void> }

export type ManagementInfoPageMode = "page" | "lookup"

export type ManagementInfoPageProps = {
  mode?: ManagementInfoPageMode
  onPickManagement?: (row: ManagementInfo) => void
  onCloseLookup?: () => void
}

export default function ManagementInfoPage({
  mode = "page",
  onPickManagement,
  onCloseLookup,
}: ManagementInfoPageProps) {
  const isLookup = mode === "lookup"
  const screenCd = "/module/management-info"
  const gridId = "management-info-grid"
  const menuCode = "MD_MANAGEMENT"
  const [isUpdate, setIsUpdate] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const gridRef = useRef<dxDataGrid | null>(null)

  const { lang, translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
    lang: string
  }

  const {
    data: managementRows = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchManagementInfos,
  } = useManagementInfoListQuery(lang)
  const { createMutation, updateMutation, deleteMutation } = useManagementInfoMutations(lang)
  const loading = isLoading || isFetching
  const gridData = useMemo(() => normalizeManagementInfoRows(managementRows), [managementRows])
  const reloadManagementInfos = useMasterListReload(refetchManagementInfos, gridRef)

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  )

  const importConfig = useMemo(() => createManagementInfoImportConfig(translate), [translate])
  const popupTitle = t(isUpdate ? "lblEdit" : "lblAddNew", isUpdate ? "Edit Management Info" : "Add Management Info")

  const excludedFields = useMemo(
    () =>
      new Set<string>(["MG_ID", "COMPANY_CD", "ISDEL"]),
    [],
  )

  useMasterListLoadError(isError, loadError, t, "Failed to load management info")

  const buildCreatePayload = useCallback((data: Partial<ManagementInfo>): Partial<ManagementInfoApi> => {
    const currentCompanyCd = getCurrentCompanyCd()
    const nextRow: ManagementInfo = {
      ...createDefaultManagementInfo(currentCompanyCd),
      ...data,
      COMPANY_CD: data.COMPANY_CD || currentCompanyCd,
      MG_CD: getSequenceSubmitCode(data.MG_CD),
    }

    return mapManagementInfoToApiPayload(nextRow)
  }, [])

  const buildUpdatePayload = useCallback((event: RowUpdatingEventWithPromise): Partial<ManagementInfoApi> => {
    const currentCompanyCd = event.oldData?.COMPANY_CD || getCurrentCompanyCd()
    const mergedRow: ManagementInfo = {
      ...createDefaultManagementInfo(currentCompanyCd),
      ...(event.oldData ?? {}),
      ...(event.newData ?? {}),
      ...mergeMasterFormDraft({}),
      COMPANY_CD: currentCompanyCd,
    }

    return mapManagementInfoToApiPayload(mergedRow)
  }, [])

  const onRowInserting = useCallback(
    (event: RowInsertingEventWithPromise) => {
    const reportSaveError = captureMasterPopupError(event.component)
      event.promise = (async () => {
        try {
          const payload = buildCreatePayload(mergeMasterFormDraft(event.data ?? {}))
          await createMutation.mutateAsync(payload)
          notify(t("MSG_INSERT_SUCCESS", "Created successfully"), "success", 3000)
          event.component?.cancelEditData()
        } catch (error) {
          console.error("Create management info error", error)
          reportSaveError(getApiErrorMessage(error, t("INSERT_FAILED", "Thêm mới thất bại")))
          throw error
        }
      })()
    },
    [buildCreatePayload, createMutation, t],
  )

  const onRowUpdating = useCallback(
    (event: RowUpdatingEventWithPromise) => {
    const reportSaveError = captureMasterPopupError(event.component)
      event.promise = (async () => {
        try {
          const payload = buildUpdatePayload(event)
          await updateMutation.mutateAsync(payload)
          notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
          event.component?.cancelEditData()
        } catch (error) {
          console.error("Update management info error", error)
          reportSaveError(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")))
          throw error
        }
      })()
    },
    [buildUpdatePayload, t, updateMutation],
  )

  const onRowRemoving = useCallback(
    (event: RowRemovingEventWithPromise) => {
      event.promise = (async () => {
        try {
          const managementId = Number(event.key)
          if (!Number.isFinite(managementId) || managementId <= 0) {
            throw new Error("Invalid management id")
          }

          await deleteMutation.mutateAsync([managementId])
          notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
        } catch (error) {
          console.error("Delete management info error", error)
          notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
        }
      })()
    },
    [deleteMutation, t],
  )

  const handleToolbarDelete = useCallback(async () => {
    const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const managementIds = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!managementIds.length) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2000)
      return
    }

    const confirmText = t(
      "MSG_CONFIRM_DELETE_RECORD",
      "Are you sure you want to delete {0} record?",
    ).replace("{0}", String(managementIds.length))

    const isConfirmed = await confirm(confirmText, t("MSG_CONFIRM_DELETE", "Confirm delete"))
    if (!isConfirmed) {
      return
    }

    try {
      await deleteMutation.mutateAsync(managementIds)
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
    } catch (error) {
      console.error("Bulk delete management info error", error)
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
    }
  }, [deleteMutation, t])

  const handleExportExcel = useCallback(async () => {
    try {
      const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
      const selectedManagementId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : undefined
      const managementId =
        typeof selectedManagementId === "number" && Number.isFinite(selectedManagementId) && selectedManagementId > 0
          ? selectedManagementId
          : undefined

      const loadDownloadBlob = (signal: AbortSignal) => exportManagementInfoExcel(managementId, lang, signal)
      await downloadFile({ fileName: `management_info_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
    } catch (error) {
      console.error("Export management info error", error)
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Xuất thất bại")), "error", 3000)
    }
  }, [lang, t])

  const handleExportPdf = useCallback(() => {
    const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const selectedManagementId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : undefined
    const managementId =
      typeof selectedManagementId === "number" && Number.isFinite(selectedManagementId) && selectedManagementId > 0
        ? selectedManagementId
        : undefined

    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      mgId: managementId ? String(managementId) : undefined,
      reportCode: "MANAGEMENT_INFO",
      menuCode,
      screenCd,
      gridId,
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }, [gridId, menuCode, screenCd, t])

  const onRowDblClick = useCallback((event: RowDblClickEvent<ManagementInfo, TKey>) => {
    if (isLookup) {
      if (event.data) {
        onPickManagement?.(event.data)
        onCloseLookup?.()
      }
      return
    }

    if (!gridRef.current) {
      return
    }

    const rowIndex =
      typeof (event as RowDblClickEvent<ManagementInfo, TKey> & { rowIndex?: number }).rowIndex === "number"
        ? (event as RowDblClickEvent<ManagementInfo, TKey> & { rowIndex?: number }).rowIndex
        : gridRef.current.getRowIndexByKey(event.key as TKey)

    if (rowIndex !== undefined && rowIndex !== -1) {
      gridRef.current.editRow(rowIndex)
    }
  }, [isLookup, onCloseLookup, onPickManagement])

  const content = (
    <MasterDataPageLayout
      toolbar={
        <GridToolbar
          gridRef={gridRef}
          onRefresh={() => void reloadManagementInfos()}
          onDelete={handleToolbarDelete}
          onImport={() => setIsExcelModalOpen(true)}
          onExportPdf={handleExportPdf}
          onExportXlsx={handleExportExcel}
        />
      }
      overlays={
        <BaseExcelImportPopup
          visible={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          title={t("MANAGEMENT_INFO_LIST", "Import danh sách thông tin quản lý")}
          moduleCd={importConfig.moduleCd}
          templateUrl="/System/DownloadTemplate"
          templateFileName={importConfig.templateName}
          params={{ lang: localStorage.getItem("lang") ?? undefined }}
          onImported={() => void reloadManagementInfos()}
        />
      }
    >
      <BaseDataGrid<ManagementInfo>
        dataSource={gridData}
        keyExpr="MG_ID"
        menuCode={menuCode}
        screenCd={screenCd}
        gridId={gridId}
        copyExcludeFields={Array.from(excludedFields)}
        actionButtons
        actionButtonsPosition="start"
        onRowDblClick={onRowDblClick}
        onEditingStart={(event) => {
          const rowId = Number(event.key)
          setIsUpdate(Number.isFinite(rowId) && rowId > 0)
          seedMasterFormDraft(event.data as unknown as Record<string, unknown>)
        }}
        onEditCanceled={() => clearMasterFormDraft()}
        onInitialized={(event) => {
          gridRef.current = event.component ?? null
        }}
        onRowInserting={onRowInserting}
        onRowUpdating={onRowUpdating}
        onRowRemoving={onRowRemoving}
        onInitNewRow={(event) => {
          setIsUpdate(false)
          event.data = {
            ...createDefaultManagementInfo(getCurrentCompanyCd()),
            ...(event.data ?? {}),
          }
          seedMasterFormDraft(event.data as unknown as Record<string, unknown>)
          event.promise = assignSequencePreviewCode(event.data, menuCode, "MG_CD").then(() => undefined)
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
            title={popupTitle}
            width="90%"
            maxWidth={980}
          />
          <ManagementInfoForm />
        </Editing>

        {managementInfoFields.map((field) => (
          <Column
            key={field.key}
            dataField={field.key}
           />
        ))}
      </BaseDataGrid>

      <LoadPanel
        shadingColor="rgba(0, 0, 0, 0.4)"
        visible={loading}
        showIndicator={true}
        shading={true}
        showPane={true}
      />
    </MasterDataPageLayout>
  )

  return isLookup ? content : <DxPage>{content}</DxPage>
}
