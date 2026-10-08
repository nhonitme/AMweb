import { captureMasterPopupError } from "@/components/datagrid/masterPopupValidation";
import { useCallback, useContext, useMemo, useRef, useState } from "react"
import { LoadPanel } from "devextreme-react"
import { Editing } from "devextreme-react/tree-list"
import {
  RowDblClickEvent,
  RowInsertingEvent,
  RowRemovingEvent,
  RowUpdatingEvent,
} from "devextreme/ui/tree_list"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"
import type dxTreeList from "devextreme/ui/tree_list"

import BaseTreeList from "@/components/datagrid/BaseTreeList"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout"
import DxPage from "@/dx/DxPage"
import { downloadFile } from "@/lib/fileUtils"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { assignSequencePreviewCode, getSequenceSubmitCode } from "@/lib/codeSequence"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import { exportDepartmentInfoExcel } from "@/api/departmentInfoApi"
import { MasterDataTreeListEditPopup } from "@/components/datagrid/MasterDataEditPopup"
import { getApiErrorMessage } from "@/api/apiTypes"
import type { DepartmentInfo, DepartmentInfoApi } from "@/types/departmentInfo"
import DepartmentInfoForm from "./DepartmentInfoForm"
import { DepartmentInfoColumns } from "./Columns/DepartmentInfoColumns"
import { useDepartmentImportConfig } from "./Columns/DepartmentImportConfig"
import {
  useDepartmentListQuery,
  useDepartmentMutations,
} from "@/hooks/queries/master/masterDataQueries"
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers"
import {
  attachDepartmentParentIds,
  createDefaultDepartmentInfo,
  DEPARTMENT_TREE_ROOT_ID,
  mapDepartmentInfoToApiPayload,
  normalizeDepartmentInfoRows,
  type DepartmentTreeRow,
} from "./departmentInfoUtils"

type TKey = string | number

type RowInsertingEventWithPromise = RowInsertingEvent<DepartmentTreeRow, TKey> & { promise?: Promise<void> }
type RowUpdatingEventWithPromise = RowUpdatingEvent<DepartmentTreeRow, TKey> & { promise?: Promise<void> }
type RowRemovingEventWithPromise = RowRemovingEvent<DepartmentTreeRow, TKey> & { promise?: Promise<void> }

export type DepartmentManagementPageMode = "page" | "lookup"

export type DepartmentManagementPageProps = {
  mode?: DepartmentManagementPageMode
  onPickDepartment?: (row: DepartmentInfo) => void
  onCloseLookup?: () => void
}

export default function DepartmentManagementPage({
  mode = "page",
  onPickDepartment,
  onCloseLookup,
}: DepartmentManagementPageProps) {
  const isLookup = mode === "lookup"
  const screenCd = "/master/cost-center"
  const gridId = "cost-center-grid"
  const menuCode = "MD_COST_CENTER"
  const [isUpdate, setIsUpdate] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [selectedParentRow, setSelectedParentRow] = useState<DepartmentInfo | null>(null)
  const treeListRef = useRef<dxTreeList | null>(null)

  const { lang, translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
    lang: string
  }

  const {
    data: departmentRows = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchDepartments,
  } = useDepartmentListQuery(lang)
  const { createMutation, updateMutation, deleteMutation } = useDepartmentMutations(lang)
  const loading = isLoading || isFetching
  const gridData = useMemo(
    () => attachDepartmentParentIds(normalizeDepartmentInfoRows(departmentRows)),
    [departmentRows],
  )
  const reloadDepartments = useMasterListReload(refetchDepartments, treeListRef)

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  )
  const importConfig = useDepartmentImportConfig()

  const popupTitle = t(isUpdate ? "lblEdit" : "lblAddNew", isUpdate ? "Edit Department" : "Add Department")

  const excludedFields = useMemo(
    () =>
      new Set<string>(["DEPARTMENT_ID", "COMPANY_CD", "ISDEL", "PARENT_ID"]),
    [],
  )

  useMasterListLoadError(isError, loadError, t, "Failed to load departments")

  const buildCreatePayload = useCallback((data: Partial<DepartmentInfo>): Partial<DepartmentInfoApi> => {
    const currentCompanyCd = getCurrentCompanyCd()
    const nextRow: DepartmentInfo = {
      ...createDefaultDepartmentInfo(currentCompanyCd),
      ...data,
      COMPANY_CD: data.COMPANY_CD || currentCompanyCd,
      DEPARTMENT_CD: getSequenceSubmitCode(data.DEPARTMENT_CD),
    }

    return mapDepartmentInfoToApiPayload(nextRow)
  }, [])

  const buildUpdatePayload = useCallback((event: RowUpdatingEventWithPromise): Partial<DepartmentInfoApi> => {
    const currentCompanyCd = event.oldData?.COMPANY_CD || getCurrentCompanyCd()
    const mergedRow: DepartmentInfo = {
      ...createDefaultDepartmentInfo(currentCompanyCd),
      ...(event.oldData ?? {}),
      ...(event.newData ?? {}),
      COMPANY_CD: currentCompanyCd,
    }

    return mapDepartmentInfoToApiPayload(mergedRow)
  }, [])

  const onRowInserting = useCallback(
    (event: RowInsertingEventWithPromise) => {
    const reportSaveError = captureMasterPopupError(event.component)
      event.promise = (async () => {
        try {
          const payload = buildCreatePayload({ ...(event.data ?? {}) })
          await createMutation.mutateAsync(payload)
          notify(t("MSG_INSERT_SUCCESS", "Created successfully"), "success", 3000)
          event.component?.cancelEditData()
        } catch (error) {
          console.error("Create department error", error)
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
          console.error("Update department error", error)
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
          const departmentId = Number(event.key)
          if (!Number.isFinite(departmentId) || departmentId <= 0) {
            throw new Error("Invalid department id")
          }

          await deleteMutation.mutateAsync([departmentId])
          notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
        } catch (error) {
          console.error("Delete department error", error)
          notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
        }
      })()
    },
    [deleteMutation, t],
  )

  const handleAddRoot = useCallback(() => {
    setSelectedParentRow(null)
    treeListRef.current?.addRow()
  }, [])

  const handleAddChild = useCallback((row: DepartmentInfo) => {
    setSelectedParentRow(row)
    setTimeout(() => {
      treeListRef.current?.addRow()
    }, 0)
  }, [])

  const handleToolbarDelete = useCallback(async () => {
    const selectedKeys = (treeListRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const departmentIds = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!departmentIds.length) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2000)
      return
    }

    const confirmText = t(
      "MSG_CONFIRM_DELETE_RECORD",
      "Are you sure you want to delete {0} record?",
    ).replace("{0}", String(departmentIds.length))

    const isConfirmed = await confirm(confirmText, t("MSG_CONFIRM_DELETE", "Confirm delete"))
    if (!isConfirmed) {
      return
    }

    try {
      await deleteMutation.mutateAsync(departmentIds)
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
    } catch (error) {
      console.error("Bulk delete department error", error)
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
    }
  }, [deleteMutation, t])

  const handleExportExcel = useCallback(async () => {
    try {
      const selectedKeys = (treeListRef.current?.getSelectedRowKeys() || []) as Array<string | number>
      const selectedDepartmentId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : undefined
      const departmentId =
        typeof selectedDepartmentId === "number" && Number.isFinite(selectedDepartmentId) && selectedDepartmentId > 0
          ? selectedDepartmentId
          : undefined

      const loadDownloadBlob = (signal: AbortSignal) => exportDepartmentInfoExcel(departmentId, lang, signal)
      await downloadFile({ fileName: `Department_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
    } catch (error) {
      console.error("Export department error", error)
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Xuất thất bại")), "error", 3000)
    }
  }, [lang, t])

  const handleExportPdf = useCallback(() => {
    const selectedKeys = (treeListRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const selectedDepartmentId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : undefined
    const departmentId =
      typeof selectedDepartmentId === "number" && Number.isFinite(selectedDepartmentId) && selectedDepartmentId > 0
        ? selectedDepartmentId
        : undefined

    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      departmentId: departmentId ? String(departmentId) : undefined,
      reportCode: "DEPARTMENT_INFO",
      menuCode,
      screenCd,
      gridId,
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }, [gridId, menuCode, screenCd, t])

  const onRowDblClick = useCallback((event: RowDblClickEvent<DepartmentTreeRow, TKey>) => {
    if (isLookup) {
      if (event.data) {
        onPickDepartment?.(event.data)
        onCloseLookup?.()
      }
      return
    }

    const tree = treeListRef.current
    if (!tree) {
      return
    }

    const rowIndex = typeof (event as { rowIndex?: number }).rowIndex === "number"
      ? (event as { rowIndex?: number }).rowIndex
      : tree.getRowIndexByKey(event.key as TKey)

    if (rowIndex !== undefined && rowIndex !== -1) {
      tree.editRow(rowIndex)
    }
  }, [isLookup, onCloseLookup, onPickDepartment])

  const content = (
    <MasterDataPageLayout
      toolbar={
        <GridToolbar
          gridRef={treeListRef}
          onAdd={handleAddRoot}
          onRefresh={() => void reloadDepartments()}
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
          title={t("DEPARTMENT_LIST", "Import danh sách phòng ban")}
          moduleCd={importConfig.moduleCd}
          templateUrl="/System/DownloadTemplate"
          templateFileName={importConfig.templateName}
          params={{ lang: localStorage.getItem("lang") ?? undefined }}
          onImported={() => void reloadDepartments()}
        />
      }
    >
      <BaseTreeList<DepartmentTreeRow>
        dataSource={gridData}
        keyExpr="DEPARTMENT_ID"
        parentIdExpr="PARENT_ID"
        rootValue={DEPARTMENT_TREE_ROOT_ID}
        menuCode={menuCode}
        screenCd={screenCd}
        gridId={gridId}
        copyExcludeFields={Array.from(excludedFields)}
        actionButtonsPosition="start"
        onRowDblClick={onRowDblClick}
        onEditingStart={(event) => {
          const rowId = Number(event.key)
          setIsUpdate(Number.isFinite(rowId) && rowId > 0)
        }}
        onInitialized={(event) => {
          treeListRef.current = event.component ?? null
        }}
        onRowInserting={onRowInserting}
        onRowUpdating={onRowUpdating}
        onRowRemoving={onRowRemoving}
        onInitNewRow={(event) => {
          setIsUpdate(false)
          const parent = selectedParentRow
          setSelectedParentRow(null)
          event.data = {
            ...createDefaultDepartmentInfo(getCurrentCompanyCd()),
            ...(event.data ?? {}),
            PARENT_CD: parent?.DEPARTMENT_CD ?? "",
            PARENT_ID: parent?.DEPARTMENT_ID && parent.DEPARTMENT_ID > 0
              ? parent.DEPARTMENT_ID
              : DEPARTMENT_TREE_ROOT_ID,
          }
          event.promise = assignSequencePreviewCode(event.data, menuCode, "DEPARTMENT_CD").then(() => undefined)
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
            maxWidth={980}
          />
          <DepartmentInfoForm isUpdate={isUpdate} />
        </Editing>

        <DepartmentInfoColumns onAddChild={handleAddChild} />
      </BaseTreeList>

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
