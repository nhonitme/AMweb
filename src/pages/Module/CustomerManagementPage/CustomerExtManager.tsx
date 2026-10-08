import { captureMasterPopupError, showMasterPopupError } from "@/components/datagrid/masterPopupValidation";
import { useCallback, useContext, useMemo, useRef, useState } from "react"
import { LoadPanel } from "devextreme-react"
import { Editing } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import {
  RowDblClickEvent,
  RowInsertingEvent,
  RowRemovingEvent,
  RowUpdatingEvent,
  SavingEvent,
} from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import MasterDataPageLayout from "@/components/datagrid/MasterDataPageLayout"
import MasterDataEditPopup from "@/components/datagrid/MasterDataEditPopup"
import { downloadFile } from "@/lib/fileUtils"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { assignSequencePreviewCode, getSequenceSubmitCode } from "@/lib/codeSequence"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildMasterGridReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import { exportCustomerExtExcel } from "@/api/customerExtApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { clearSysCodeSequencePreviewCache } from "@/api/sysCodeSequenceApi"
import { useSysCodes } from "@/lib/sysCodeContext"
import type { CustomerExt, CustomerExtApi } from "@/types/customerExt"
import {
  useCustomerExtListQuery,
  useCustomerExtMutations,
} from "@/hooks/queries/master/masterDataQueries"
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers"

import CustomerExtForm from "./CustomerExtForm"
import { CustomerColumns } from "./Columns/CustomerColumns"
import { customerImportConfig } from "./Columns/customerImportConfig"
import {
  createDefaultCustomerExt,
  mapCustomerExtToApiPayload,
  normalizeCustomerExtRows,
} from "./customerExtUtils"
import {
  beginCustomerEditSession,
  getCustomerEditIdentity,
  mergeIdentityIntoSavingChanges,
  registerCustomerEditGrid,
} from "./customerEditSession"

import "./CustomerExtPage.scss"

type TKey = string | number

type RowInsertingEventWithPromise = RowInsertingEvent<CustomerExt, TKey> & { promise?: Promise<void> }
type RowUpdatingEventWithPromise = RowUpdatingEvent<CustomerExt, TKey> & { promise?: Promise<void> }
type RowRemovingEventWithPromise = RowRemovingEvent<CustomerExt, TKey> & { promise?: Promise<void> }

const CUSTOMER_CATEGORY_CODE_TYPE = "CATEGORY_CD"
const CUSTOMER_TYPE_CODE_TYPE = "CUSTOMER_TYPE"

export type CustomerExtManagerMode = "page" | "lookup"

export type CustomerExtManagerProps = {
  mode?: CustomerExtManagerMode
  onPickCustomer?: (row: CustomerExt) => void
  onCloseLookup?: () => void
}

export default function CustomerExtManager({
  mode = "page",
  onPickCustomer,
  onCloseLookup,
}: CustomerExtManagerProps) {
  const isLookup = mode === "lookup"

  const [isUpdate, setIsUpdate] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const gridRef = useRef<dxDataGrid<CustomerExt, TKey> | null>(null)
  const insertSessionRef = useRef(false)

  const { lang, translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
    lang: string
  }

  const {
    data: customerRows = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchCustomers,
  } = useCustomerExtListQuery(lang)
  const { createMutation, updateMutation, deleteMutation } = useCustomerExtMutations(lang)
  const loading = isLoading || isFetching
  const gridData = useMemo(() => {
    const rows = normalizeCustomerExtRows(customerRows)
    return rows
  }, [customerRows])
  const reloadCustomers = useMasterListReload(refetchCustomers, gridRef)

  const { getCodesByType } = useSysCodes()
  const customerScreenCd = "/module/customer-management"
  const customerGridId = "customer-ext-grid"
  const menuCode = "MD_CUSTOMER"

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback || key) : fallback || key),
    [translate],
  )

  const popupTitle = t(isUpdate ? "lblEdit" : "lblAddNew", isUpdate ? "Edit Customer" : "Add Customer")

  const excludedFields = useMemo(
    () =>
      new Set<string>(["CUSTOMER_ID", "CUSTOMER_EXT_ID", "COMPANY_CD", "ISDEL"]),
    [],
  )

  const categoryCodes = useMemo(() => getCodesByType(CUSTOMER_CATEGORY_CODE_TYPE), [getCodesByType])
  const customerTypeCodes = useMemo(() => getCodesByType(CUSTOMER_TYPE_CODE_TYPE), [getCodesByType])

  useMasterListLoadError(isError, loadError, t, "Failed to load customers")

  const buildCreatePayload = useCallback((data: Partial<CustomerExt>): Partial<CustomerExtApi> => {
    const currentCompanyCd = getCurrentCompanyCd()

    const nextRow: CustomerExt = {
      ...createDefaultCustomerExt(currentCompanyCd),
      ...data,
      COMPANY_CD: data.COMPANY_CD || currentCompanyCd,
      CUSTOMER_CD: getSequenceSubmitCode(data.CUSTOMER_CD),
      CUSTOMER_NM_VIET: typeof data.CUSTOMER_NM_VIET === "string" ? data.CUSTOMER_NM_VIET.trim() : "",
    }

    return mapCustomerExtToApiPayload(nextRow)
  }, [])

  const buildUpdatePayload = useCallback((event: RowUpdatingEventWithPromise): Partial<CustomerExtApi> => {
    const currentCompanyCd = event.oldData?.COMPANY_CD || getCurrentCompanyCd()

    const mergedRow: CustomerExt = {
      ...createDefaultCustomerExt(currentCompanyCd),
      ...(event.oldData ?? {}),
      ...(event.newData ?? {}),
      COMPANY_CD: currentCompanyCd,
    }

    return mapCustomerExtToApiPayload(mergedRow)
  }, [])

  const identityDuplicateMessage = useCallback(
    () =>
      t(
        "MSG_CUSTOMER_IDENTITY_EXISTS",
        "Khách hàng đã tồn tại (trùng MST, tên và địa chỉ)",
      ),
    [t],
  )

  const resolveCustomerSaveError = useCallback(
    (error: unknown, fallback: string) => {
      const apiMessage = getApiErrorMessage(error, "")
      if (apiMessage.includes("same TAX_CD, name and address")) {
        return identityDuplicateMessage()
      }
      return getApiErrorMessage(error, fallback)
    },
    [identityDuplicateMessage],
  )

  const onRowInserting = useCallback(
    (event: RowInsertingEventWithPromise) => {
      const reportSaveError = captureMasterPopupError(event.component)
      event.promise = (async () => {
        try {
          const identity = getCustomerEditIdentity()
          const merged = {
            ...(event.data ?? {}),
            ...identity,
          }
          const payload = buildCreatePayload(merged)
          await createMutation.mutateAsync(payload)
          clearSysCodeSequencePreviewCache()
          notify(t("MSG_INSERT_SUCCESS", "Created successfully"), "success", 3000)
          event.component?.cancelEditData()
        } catch (error) {
          console.error("Create customer error", error)
          reportSaveError(resolveCustomerSaveError(error, t("INSERT_FAILED", "Thêm mới thất bại")))
          throw error
        }
      })()
    },
    [buildCreatePayload, createMutation, resolveCustomerSaveError, t],
  )

  const onRowUpdating = useCallback(
    (event: RowUpdatingEventWithPromise) => {
      const reportSaveError = captureMasterPopupError(event.component)
      event.promise = (async () => {
        try {
          const identity = getCustomerEditIdentity()
          event.newData = {
            ...(event.newData ?? {}),
            ...identity,
          }
          const payload = buildUpdatePayload(event)
          await updateMutation.mutateAsync(payload)
          notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
          event.component?.cancelEditData()
        } catch (error) {
          console.error("Update customer error", error)
          reportSaveError(resolveCustomerSaveError(error, t("UPDATE_FAILED", "Cập nhật thất bại")))
          throw error
        }
      })()
    },
    [buildUpdatePayload, resolveCustomerSaveError, t, updateMutation],
  )

  const onRowRemoving = useCallback(
    (event: RowRemovingEventWithPromise) => {
      event.promise = (async () => {
        try {
          const customerId = Number(event.key)
          if (!Number.isFinite(customerId) || customerId <= 0) {
            throw new Error("Invalid customer id")
          }

          await deleteMutation.mutateAsync([customerId])
          notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
        } catch (error) {
          console.error("Delete customer error", error)
          notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
        }
      })()
    },
    [deleteMutation, t],
  )

  const handleToolbarDelete = useCallback(async () => {
    const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const customerIds = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!customerIds.length) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2000)
      return
    }

    const confirmText = t(
      "MSG_CONFIRM_DELETE_RECORD",
      "Are you sure you want to delete {0} record?",
    ).replace("{0}", String(customerIds.length))

    const isConfirmed = await confirm(confirmText, t("MSG_CONFIRM_DELETE", "Confirm delete"))
    if (!isConfirmed) {
      return
    }

    try {
      await deleteMutation.mutateAsync(customerIds)
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
    } catch (error) {
      console.error("Bulk delete customer error", error)
      notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 3000)
    }
  }, [deleteMutation, t])

  const handleExportExcel = useCallback(async () => {
    try {
      const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
      const selectedCustomerId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : undefined
      const customerId =
        typeof selectedCustomerId === "number" && Number.isFinite(selectedCustomerId) && selectedCustomerId > 0
          ? selectedCustomerId
          : undefined

      const loadDownloadBlob = (signal: AbortSignal) => exportCustomerExtExcel(customerId, lang, signal)
      await downloadFile({ fileName: `Customer_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`, load: loadDownloadBlob })
    } catch (error) {
      console.error("Export customer error", error)
      notify(getApiErrorMessage(error, t("EXPORT_FAILED", "Xuất thất bại")), "error", 3000)
    }
  }, [lang, t])

  const handleExportPdf = useCallback(() => {
    const selectedKeys = (gridRef.current?.getSelectedRowKeys() || []) as Array<string | number>
    const selectedCustomerId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : undefined
    const customerId =
      typeof selectedCustomerId === "number" && Number.isFinite(selectedCustomerId) && selectedCustomerId > 0
        ? selectedCustomerId
        : undefined

    const targetUrl = buildMasterGridReportViewerPageUrl({
      companyCd: getCurrentCompanyCd(),
      customerId: customerId ? String(customerId) : undefined,
      reportCode: "CUSTOMER_INFO",
      menuCode,
      screenCd: customerScreenCd,
      gridId: customerGridId,
    })
    if (!openReportViewerPage(targetUrl)) {
      notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
    }
  }, [customerGridId, customerScreenCd, menuCode, t])

  const onRowDblClick = useCallback(
    (event: RowDblClickEvent<CustomerExt, TKey>) => {
      if (isLookup) {
        if (event.data) {
          onPickCustomer?.(event.data)
          onCloseLookup?.()
        }
        return
      }

      if (!gridRef.current) {
        return
      }

      setIsUpdate(true)

      beginCustomerEditSession(event.key as string | number | null | undefined, event.data)

      const rowIndex =
        typeof (event as { rowIndex?: number }).rowIndex === "number"
          ? (event as { rowIndex?: number }).rowIndex
          : gridRef.current.getRowIndexByKey(event.key as TKey)

      if (rowIndex !== undefined && rowIndex !== -1) {
        gridRef.current.editRow(rowIndex)
      }
    },
    [isLookup, onCloseLookup, onPickCustomer],
  )

  const onSaving = useCallback((event: SavingEvent<CustomerExt, TKey>) => {
    mergeIdentityIntoSavingChanges(event)
  }, [])

  const onRowDblClickRef = useRef(onRowDblClick)
  onRowDblClickRef.current = onRowDblClick
  const onSavingRef = useRef(onSaving)
  onSavingRef.current = onSaving
  const onRowInsertingRef = useRef(onRowInserting)
  onRowInsertingRef.current = onRowInserting
  const onRowUpdatingRef = useRef(onRowUpdating)
  onRowUpdatingRef.current = onRowUpdating
  const onRowRemovingRef = useRef(onRowRemoving)
  onRowRemovingRef.current = onRowRemoving

  const onEditingStart = useCallback((event: { key?: TKey; data?: CustomerExt; component?: dxDataGrid<CustomerExt, TKey> }) => {
    const changes = (event.component?.option("editing.changes") ?? []) as Array<{ type?: string }>
    const inserting = insertSessionRef.current || changes.some((change) => change.type === "insert")
    const rowId = Number(event.key)
    const nextIsUpdate = !inserting && Number.isFinite(rowId) && rowId > 0
    setIsUpdate(nextIsUpdate)
    beginCustomerEditSession(event.key as string | number | null | undefined, event.data)
  }, [])
  const onEditingStartRef = useRef(onEditingStart)
  onEditingStartRef.current = onEditingStart

  if (typeof window !== "undefined") {
    registerCustomerEditGrid(() => gridRef.current)
  }

  return (
    <MasterDataPageLayout
      toolbar={
        <GridToolbar
          gridRef={gridRef}
          onRefresh={() => void reloadCustomers()}
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
          title={t("CUSTOMER_LIST", "Import danh sách khách hàng")}
          moduleCd={customerImportConfig.moduleCd}
          templateUrl="/System/DownloadTemplate"
          templateFileName={customerImportConfig.templateName}
          params={{ lang: localStorage.getItem("lang") ?? undefined }}
          onImported={() => void reloadCustomers()}
        />
      }
    >
      <BaseDataGrid<CustomerExt>
        dataSource={gridData}
        keyExpr="CUSTOMER_ID"
        menuCode={menuCode}
        screenCd={customerScreenCd}
        gridId={customerGridId}
        copyExcludeFields={Array.from(excludedFields)}
        actionButtons={true}
        actionButtonsPosition="start"
        onRowDblClick={(event) => onRowDblClickRef.current(event)}
        onEditingStart={(event) => onEditingStartRef.current(event)}
        onInitialized={(event) => {
          const component = event.component ?? null
          gridRef.current = component
          registerCustomerEditGrid(() => gridRef.current)
          component?.on("editCanceled", () => {
            insertSessionRef.current = false
          })
          component?.on("rowInserted", () => {
            insertSessionRef.current = false
          })
        }}
        onRowInserting={(event) => onRowInsertingRef.current(event)}
        onRowUpdating={(event) => onRowUpdatingRef.current(event)}
        onRowRemoving={(event) => onRowRemovingRef.current(event)}
        onSaving={(event) => onSavingRef.current(event)}
        onInitNewRow={(event) => {
          insertSessionRef.current = true
          setIsUpdate(false)
          event.data = {
            ...createDefaultCustomerExt(getCurrentCompanyCd()),
            ...(event.data ?? {}),
          }
          beginCustomerEditSession(null, event.data)
          event.promise = assignSequencePreviewCode(event.data, menuCode, "CUSTOMER_CD")
            .then((nextCode) => {
              if (!nextCode) {
                showMasterPopupError(event.component,
                  t("MSG_CODE_SEQUENCE_NOT_CONFIGURED", "Customer code sequence is not configured"),
                )
              }
            })
            .catch((error) => {
              console.error("Preview customer code error", error)
              showMasterPopupError(event.component,
                getApiErrorMessage(error, t("Failed to preview customer code", "Failed to preview customer code")),
              )
              throw error
            })
            .then(() => undefined)
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
            scrollable
            key={lang}
            title={popupTitle}
            width="90%"
            maxWidth={1100}
          />
          <CustomerExtForm categoryCodes={categoryCodes} customerTypeCodes={customerTypeCodes} />
        </Editing>

        <CustomerColumns
          categoryCodes={categoryCodes}
          customerTypeCodes={customerTypeCodes}
        />
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
}
