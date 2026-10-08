import { captureMasterPopupError } from "@/components/datagrid/masterPopupValidation";
import { useCallback, useContext, useMemo, useRef, useState } from "react"
import { LoadPanel } from "devextreme-react"
import { Editing } from "devextreme-react/data-grid"
import {
  RowDblClickEvent,
  RowInsertingEvent,
  RowRemovingEvent,
  RowUpdatingEvent,
} from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"

import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid"
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
import { exportBankInfoExcel } from "@/api/bankInfoApi"
import MasterDataEditPopup from "@/components/datagrid/MasterDataEditPopup"
import { getApiErrorMessage } from "@/api/apiTypes"
import type { BankInfo, BankInfoApi } from "@/types/bankInfo"
import BankForm from "./Form/BankForm"
import { BankColumns } from "./Columns/BankColumns"
import { bankImportConfig } from "./Columns/bankImportConfig"
import {
  useBankListQuery,
  useBankMutations,
} from "@/hooks/queries/master/masterDataQueries"
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers"
import {
  createDefaultBankInfo,
  mapBankInfoToApiPayload,
  normalizeBankInfoRows,
} from "./bankInfoUtils"

type TKey = string | number

type RowInsertingEventWithPromise = RowInsertingEvent<BankInfo, TKey> & { promise?: Promise<void> }
type RowUpdatingEventWithPromise = RowUpdatingEvent<BankInfo, TKey> & { promise?: Promise<void> }
type RowRemovingEventWithPromise = RowRemovingEvent<BankInfo, TKey> & { promise?: Promise<void> }

export type BankManagementPageMode = "page" | "lookup"

export type BankManagementPageProps = {
  mode?: BankManagementPageMode
  onPickBank?: (row: BankInfo) => void
  onCloseLookup?: () => void
}

export default function BankManagementPage({
  mode = "page",
  onPickBank,
  onCloseLookup,
}: BankManagementPageProps) {
  const isLookup = mode === "lookup"
  const screenCd = "/module/bank-management"
  const gridId = "bank-grid"
  const menuCode = "MD_BANK"
  const [isUpdate, setIsUpdate] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const gridRef = useRef<dxDataGrid | null>(null)

  const { lang, translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
    lang: string
  }

  const {
    data: bankRows = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchBanks,
  } = useBankListQuery(lang)
  const { createMutation, updateMutation, deleteMutation } = useBankMutations(lang)
  const loading = isLoading || isFetching
  const gridData = useMemo(() => normalizeBankInfoRows(bankRows), [bankRows])
  const reloadBanks = useMasterListReload(refetchBanks, gridRef)

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  )

  const popupTitle = t(isUpdate ? "lblEdit" : "lblAddNew", isUpdate ? "Edit Bank" : "Add Bank")

  const excludedFields = useMemo(
    () =>
      new Set<string>(["BANK_ID", "COMPANY_CD", "ISDEL"]),
    [],
  )

  useMasterListLoadError(isError, loadError, t, "Failed to load banks")

  const buildCreatePayload = useCallback((data: Partial<BankInfo>): Partial<BankInfoApi> => {
    const currentCompanyCd = getCurrentCompanyCd()
    const nextRow: BankInfo = {
      ...createDefaultBankInfo(currentCompanyCd),
      ...data,
      COMPANY_CD: data.COMPANY_CD || currentCompanyCd,
      BANK_CD: getSequenceSubmitCode(data.BANK_CD),
      BANK_NM: typeof data.BANK_NM === "string" ? data.BANK_NM.trim() : "",
    }

    return mapBankInfoToApiPayload(nextRow)
  }, [])

  const buildUpdatePayload = useCallback((event: RowUpdatingEventWithPromise): Partial<BankInfoApi> => {
    const currentCompanyCd = event.oldData?.COMPANY_CD || getCurrentCompanyCd()
    const nextBankCd =
      typeof event.newData?.BANK_CD === "string"
        ? event.newData.BANK_CD.trim()
        : typeof event.oldData?.BANK_CD === "string"
          ? event.oldData.BANK_CD.trim()
          : ""
    const nextBankName =
      typeof event.newData?.BANK_NM === "string"
        ? event.newData.BANK_NM.trim()
        : typeof event.oldData?.BANK_NM === "string"
          ? event.oldData.BANK_NM.trim()
          : ""
    const mergedRow: BankInfo = {
      ...createDefaultBankInfo(currentCompanyCd),
      ...(event.oldData ?? {}),
      ...(event.newData ?? {}),
      BANK_ID: typeof event.oldData?.BANK_ID === "number" ? event.oldData.BANK_ID : null,
      COMPANY_CD: currentCompanyCd,
      BANK_CD: nextBankCd,
      BANK_NM: nextBankName,
    }

    return mapBankInfoToApiPayload(mergedRow)
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
          console.error("Create bank error", error)
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
          console.error("Update bank error", error)
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
          const bankId = Number(event.key)
          if (!Number.isFinite(bankId) || bankId <= 0) {
            throw new Error("Invalid bank id")
          }

          await deleteMutation.mutateAsync([bankId])
          notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
        } catch (error) {
          console.error("Delete bank error", error)
          notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
        }
      })()
    },
    [deleteMutation, t],
  )

  const handleToolbarDelete = useCallback(async () => {
    const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const bankIds = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!bankIds.length) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2000)
      return
    }

    const confirmText = t(
      "MSG_CONFIRM_DELETE_RECORD",
      "Are you sure you want to delete {0} record?",
    ).replace("{0}", String(bankIds.length))

    const isConfirmed = await confirm(confirmText, t("MSG_CONFIRM_DELETE", "Confirm delete"))
    if (!isConfirmed) {
      return
    }

    try {
      await deleteMutation.mutateAsync(bankIds)
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
    } catch (error) {
      console.error("Bulk delete bank error", error)
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
    }
  }, [deleteMutation, t])

  const handleExportExcel = useCallback(async () => {
    try {
      const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
      const selectedBankId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : undefined
      const bankId =
        typeof selectedBankId === "number" && Number.isFinite(selectedBankId) && selectedBankId > 0
          ? selectedBankId
          : undefined

      const loadDownloadBlob = (signal: AbortSignal) => exportBankInfoExcel(bankId, lang, signal)
      await downloadFile({ fileName: `Bank_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
    } catch (error) {
      console.error("Export bank error", error)
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Xuất thất bại")), "error", 3000)
    }
  }, [lang, t])

  const handleExportPdf = useCallback(() => {
    const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const selectedBankId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : undefined
    const bankId =
      typeof selectedBankId === "number" && Number.isFinite(selectedBankId) && selectedBankId > 0
        ? selectedBankId
        : undefined

    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      bankId: bankId ? String(bankId) : undefined,
      reportCode: "BANK_INFO",
      menuCode,
      screenCd,
      gridId,
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }, [gridId, menuCode, screenCd, t])

  const onRowDblClick = useCallback((event: RowDblClickEvent<BankInfo, TKey>) => {
    if (isLookup) {
      if (event.data) {
        onPickBank?.(event.data)
        onCloseLookup?.()
      }
      return
    }

    if (!gridRef.current) {
      return
    }

    const rowIndex = typeof (event as { rowIndex?: number }).rowIndex === "number"
      ? (event as { rowIndex?: number }).rowIndex
      : gridRef.current.getRowIndexByKey(event.key as TKey)

    if (rowIndex !== undefined && rowIndex !== -1) {
      gridRef.current.editRow(rowIndex)
    }
  }, [isLookup, onCloseLookup, onPickBank])

  const content = (
    <MasterDataPageLayout
      toolbar={
        <GridToolbar
          gridRef={gridRef}
          onRefresh={() => void reloadBanks()}
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
          title={t("BANK_LIST", "Import danh sách ngân hàng")}
          moduleCd={bankImportConfig.moduleCd}
          templateUrl="/System/DownloadTemplate"
          templateFileName={bankImportConfig.templateName}
          params={{ lang: localStorage.getItem("lang") ?? undefined }}
          onImported={() => {
            void reloadBanks()
          }}
        />
      }
    >
      <BaseDataGrid<BankInfo>
        dataSource={gridData}
        keyExpr="BANK_ID"
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
        }}
        onInitialized={(event) => {
          gridRef.current = event.component ?? null
        }}
        onRowInserting={onRowInserting}
        onRowUpdating={onRowUpdating}
        onRowRemoving={onRowRemoving}
        onInitNewRow={(event) => {
          setIsUpdate(false)
          event.data = {
            ...createDefaultBankInfo(getCurrentCompanyCd()),
            ...(event.data ?? {}),
          }
          event.promise = assignSequencePreviewCode(event.data, menuCode, "BANK_CD").then(() => undefined)
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
            maxWidth={900}
          />
          <BankForm isUpdate={isUpdate} />
        </Editing>

        <BankColumns />
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
