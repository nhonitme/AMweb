import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent, SelectionChangedEvent, RowDblClickEvent, OptionChangedEvent } from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import { createChit, deleteChit, exportChitExcel, getChits, importChitExcel, updateChit } from "@/api/voucherApi"
import DetailGrid from "@/components/datagrid/DetailGrid"
import GridColumnSettingsPopup, {
  type GridColumnSettingsPopupTab,
  type GridColumnSettingsPopupTabSaveItem,
} from "@/components/datagrid/GridColumnSettingsPopup"
import PageGrid from "@/components/datagrid/PageGrid"
import { useGridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import ExcelImportModal from "@/components/modals/ExcelImportModal"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"
import type { ChitInfo, ChitDetail, ChitLedger, ChitType } from "@/types/voucher"
import {
  calculateChitAmount,
  cloneChit,
  cloneChitDetail,
  createDefaultChit,
  createDefaultChitDetail,
  createRowKey,
  getChitTypeLabel,
  mapChitToApiPayload,
  normalizeChitRows
} from "./chitUtils"
import ChitColumns from "./components/ChitColumns"
import ChitDetailColumns from "./components/ChitDetailColumns"
import ChitEditorPopup from "./components/ChitEditorPopup"
import { createVoucherImportConfig } from "./voucherImportConfig"
import { LoadPanel } from "devextreme-react/cjs/load-panel"

interface ChitManagementPageProps {
  ledger: ChitLedger
  chitType: ChitType
}

const formatDateToYmd = (value: Date | null): string | undefined => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return undefined
  }

  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")

  return `${year}${month}${day}`
}

export function ChitManagementPage({ ledger, chitType }: ChitManagementPageProps) {
  const gridRef = useRef<dxDataGrid<ChitInfo, string | number> | null>(null)
  const detailGridRef = useRef<dxDataGrid<ChitDetail, string | number> | null>(null)
  const location = useLocation()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [popupLoading, setPopupLoading] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)
  const [isUpdate, setIsUpdate] = useState(false)
  const [isExcelModalOpen, setIsExcelModalOpen] = useState(false)
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsTabs, setColumnSettingsTabs] = useState<GridColumnSettingsPopupTab[]>([])
  const today = useMemo(() => {
    const d = new Date()
    d.setHours(0, 0, 0, 0)
    return d
  }, [])
  const [fromDate, setFromDate] = useState<Date | null>(today)
  const [toDate, setToDate] = useState<Date | null>(today)
  const [rows, setRows] = useState<ChitInfo[]>([])
  const [selectedRow, setSelectedRow] = useState<ChitInfo | null>(null)
  const [selectedRowDetails, setSelectedRowDetails] = useState<ChitDetail[]>([])
  const [isMasterSearchActive, setIsMasterSearchActive] = useState(false)
  const [pageNumber, setPageNumber] = useState(1)
  const [pageSize, setPageSize] = useState(20)
  const [, setTotalRecords] = useState(0)
  const [editingRow, setEditingRow] = useState<ChitInfo>(() =>
    createDefaultChit(chitType, getCurrentCompanyCd(), getCurrentUserId()),
  )

  const { translate } = useContext(LanguageContext)

  const t = useCallback(
    (key: string, fallback: string) => translate(key, fallback),
    [translate],
  )

  const title = useMemo(() => getChitTypeLabel(chitType, t), [chitType, t])
  const screenCd = useMemo(() => location.pathname, [location.pathname])
  const masterGridId = "voucher-master-grid"
  const detailGridId = "voucher-detail-grid"
  const importConfig = useMemo(() => createVoucherImportConfig(ledger, chitType, t), [ledger, chitType, t])
  const masterColumnSettingState = useGridColumnSettingState({
    screenCd,
    gridId: masterGridId,
  })
  const detailColumnSettingState = useGridColumnSettingState({
    screenCd,
    gridId: detailGridId,
  })
  const excelEnabled = importConfig !== null
  const getRowDetails = useCallback(
    (row: ChitInfo | null) => (row ? row.DETAILS.map((item) => cloneChitDetail(item)) : []),
    [],
  )

  const loadData = useCallback(
    async function loadData(fromParam: Date | null, toParam: Date | null, targetPage = pageNumber, targetPageSize = pageSize) {
      setLoading(true)

      try {
        const fromYmd = formatDateToYmd(fromParam)
        const toYmd = formatDateToYmd(toParam)

        if (fromYmd && toYmd && fromYmd > toYmd) {
          notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
          setRows([])
          gridRef.current?.clearSelection()
          setSelectedRow(null)
          setSelectedRowDetails([])
          setTotalRecords(0)
          setPageNumber(1)
          return
        }

        const response = await getChits(ledger, chitType, {
          fromYmd,
          toYmd,
          INCLUDE_DETAILS: true,
          pageNumber: targetPage,
          pageSize: targetPageSize,
        })
        const data = normalizeChitRows(response.data || [], chitType)

        if (response.totalRecords > 0 && targetPage > response.totalPages) {
          await loadData(fromParam, toParam, response.totalPages, targetPageSize)
          return
        }

        setRows(data)
        setTotalRecords(response.totalRecords)
        setPageNumber(response.pageNumber)
        setPageSize(response.pageSize)
        gridRef.current?.clearSelection()
        const nextSelectedRow = data.length > 0 ? data[0] : null
        setSelectedRow(nextSelectedRow)
        setSelectedRowDetails(getRowDetails(nextSelectedRow))
      } catch (error) {
        console.error("Failed to load chit notes", error)
        notify(t("Load failed", "Load failed"), "error", 4000)
      } finally {
        setLoading(false)
      }
    }, [getRowDetails, ledger, chitType, pageNumber, pageSize, t],
  )

  useEffect(() => {
    void loadData(fromDate, toDate, 1, 20)
  }, [])

  const openCreatePopup = useCallback(() => {
    setIsUpdate(false)
    const companyCd = getCurrentCompanyCd()
    const userId = getCurrentUserId()
    const newChit = createDefaultChit(chitType, companyCd, userId)
    setEditingRow({
      ...newChit,
      DETAILS: [createDefaultChitDetail(1, companyCd)],
    })
    setPopupVisible(true)
  }, [chitType])

const openEditPopup = useCallback(
  async (target?: ChitInfo | null) => {
    const row = target ?? selectedRow
    if (!row?.CHIT_ID) {
      notify(t("Select a row first", "Select a row first"), "warning", 2500)
      return
    }

    setPopupLoading(true)

    try {
      setIsUpdate(true)
      setEditingRow(cloneChit(row))
      setPopupVisible(true)
    } catch (error) {
      console.error("Open edit popup failed", error)
      notify(t("Load failed", "Load failed"), "error", 4000)
    } finally {
      setPopupLoading(false)
    }
  },
  [selectedRow, t],
)

  const openDuplicatePopup = useCallback((target?: ChitInfo | null) => {
    const row = target ?? selectedRow
    if (!row) {
      notify(t("Select a row first", "Select a row first"), "warning", 2500)
      return
    }

    const companyCd = getCurrentCompanyCd()
    const userId = getCurrentUserId()
    const duplicatedDetails = row.DETAILS.length
      ? row.DETAILS.map((detail, index) => ({
          ...createDefaultChitDetail(index + 1, companyCd),
          ...cloneChitDetail(detail),
          ROW_KEY: createRowKey(),
          CHITDETAIL_ID: null,
          CHIT_ID: null,
          CHITDETAIL_CD: "",
          SORT: index + 1,
          CREATE_BY: "",
          CREATE_DT: null,
          UPDATE_BY: "",
          UPDATE_DT: null,
        }))
      : [createDefaultChitDetail(1, companyCd)]

    setIsUpdate(false)
    setEditingRow({
      ...createDefaultChit(chitType, companyCd, userId),
      ...cloneChit(row),
      CHIT_ID: null,
      CHIT_CD: "",
      CHIT_NO: "",
      DETAILS: duplicatedDetails,
      DETAIL_COUNT: duplicatedDetails.length,
      AMOUNT: calculateChitAmount(duplicatedDetails),
      CREATE_BY: "",
      CREATE_DT: null,
      UPDATE_BY: "",
      UPDATE_DT: null,
    })
    setPopupVisible(true)
  }, [chitType, selectedRow, t])

  const persistChit = useCallback(
    async (record: ChitInfo, reopenNew = false) => {
      setPopupLoading(true)

      try {
        const payload = mapChitToApiPayload(record)
        if (isUpdate) {
          await updateChit(ledger, payload, chitType)
          notify(t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
        } else {
          await createChit(ledger, payload, chitType)
          notify(t("CREATE_SUCCESS", "Created successfully"), "success", 3000)
        }

        setPopupVisible(false)
        await loadData(fromDate, toDate, pageNumber, pageSize)

        if (reopenNew) {
          openCreatePopup()
        }
      } catch (error) {
        console.error("Save chit note error", error)
        notify(t("Save failed", "Save failed"), "error", 4000)
      } finally {
        setPopupLoading(false)
      }
    },
    [chitType, fromDate, isUpdate, ledger, loadData, openCreatePopup, pageNumber, pageSize, t, toDate],
  )

  const handleSave = useCallback(
    async (record: ChitInfo) => {
      await persistChit(record, false)
    },
    [persistChit],
  )

  const handleSaveAndNew = useCallback(
    async (record: ChitInfo) => {
      await persistChit(record, true)
    },
    [persistChit],
  )

  const handleDelete = useCallback(async () => {
    const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
    const ids = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!ids.length) {
      notify(t("No rows selected", "No rows selected"), "warning", 2500)
      return
    }

    const confirmText = t(
      "MSG_CONFIRM_DELETE_RECORD",
      "Are you sure you want to delete {0} record?",
    ).replace("{0}", String(ids.length))
    const confirmed = await confirm(confirmText, t("MSG_CONFIRM_DELETE", "Confirm delete"))
    if (!confirmed) {
      return
    }

    setLoading(true)

    try {
      await Promise.all(ids.map((id) => deleteChit(ledger, id, chitType)))
      notify(t("DELETE_SUCCESS", "Deleted successfully"), "success", 3000)
      await loadData(fromDate, toDate, pageNumber, pageSize)
    } catch (error) {
      console.error("Delete chit note error", error)
      notify(t("Delete failed", "Delete failed"), "error", 4000)
      setLoading(false)
    }
  }, [fromDate, ledger, loadData, chitType, pageNumber, pageSize, t, toDate])


  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<ChitInfo, string | number>) => {
      const selected = event.selectedRowsData
      if (selected.length === 0) return
      const lastKey = event.currentSelectedRowKeys[event.currentSelectedRowKeys.length - 1]
      const row = lastKey != null
        ? (selected.find((r) => r.CHIT_ID == lastKey) ?? selected[0])
        : selected[0]
      setSelectedRow(row)
      setSelectedRowDetails(getRowDetails(row))
    },
    [getRowDetails],
  )

  const handleRowDblClick = useCallback(
    (event: RowDblClickEvent<ChitInfo, string | number>) => {
      void openEditPopup(event.data ?? null)
    },
    [openEditPopup],
  )

  const masterCopyExcludeFields = useMemo(
    () => ["CHIT_ID", "COMPANY_CD", "CHIT_TYPE", "USERID", "DETAIL_COUNT", "DETAILS", "CREATE_BY", "CREATE_DT", "MODIFY_BY", "MODIFY_DT"],
    [],
  )

  const chitColumnsNode = useMemo(() => <ChitColumns />, [])

  const handleContextMenuUpdate = useCallback(
    (rowData: ChitInfo) => {
      setSelectedRow(rowData)
      setSelectedRowDetails(getRowDetails(rowData))
      void openEditPopup(rowData)
    },
    [getRowDetails, openEditPopup],
  )

  const handleContextMenuCopy = useCallback(
    (rowData: ChitInfo) => {
      openDuplicatePopup(rowData)
    },
    [openDuplicatePopup],
  )

  const handleGridInitialized = useCallback((event: InitializedEvent<ChitInfo,string | number>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleDetailGridInitialized = useCallback((event: InitializedEvent<ChitDetail, string | number>) => {
    detailGridRef.current = event.component ?? null
  }, [])

  const handleRangeSearch = useCallback(() => {
    void loadData(fromDate, toDate, 1, pageSize)
  }, [fromDate, loadData, pageSize, toDate])

  const handleRefresh = useCallback(() => {
    void loadData(fromDate, toDate, pageNumber, pageSize)
  }, [fromDate, loadData, pageNumber, pageSize, toDate])

  const handleOptionChanged = useCallback(async (e: OptionChangedEvent<ChitInfo, string | number>) => {
    if (e.fullName === "paging.pageIndex") {
      const pageIndex = Number(e.value ?? 0)
      const nextPageSize = e.component.pageSize()
      await loadData(fromDate, toDate, pageIndex + 1, nextPageSize)
      return
    }

    if (e.fullName === "paging.pageSize") {
      const nextPageSize = Number(e.value ?? pageSize)
      e.component.pageIndex(0)
      await loadData(fromDate, toDate, 1, nextPageSize)
    }
  }, [fromDate, loadData, pageSize, toDate])

  const handleExportExcel = useCallback(async () => {
    try {
      const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
      const selectedChitId = selectedKeys.length > 0 ? Number(selectedKeys[0]) : null
      const blob = await exportChitExcel(ledger, chitType, {
        chitId: Number.isFinite(selectedChitId) && (selectedChitId ?? 0) > 0 ? selectedChitId : null,
        fromYmd: formatDateToYmd(fromDate),
        toYmd: formatDateToYmd(toDate),
      })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement("a")
      const fileLabel = title.trim().replace(/\s+/g, "_").toLowerCase()

      anchor.href = url
      anchor.download = `${fileLabel}_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`
      document.body.appendChild(anchor)
      anchor.click()
      anchor.remove()
      URL.revokeObjectURL(url)
    } catch (error) {
      console.error("Export chit note error", error)
      notify(t("EXPORT_FAILED", "Export failed"), "error", 4000)
    }
  }, [fromDate, ledger, chitType, t, title, toDate])

  const handleExportPdf = useCallback(() => {
    const selectedKeys: Array<string | number> = gridRef.current?.getSelectedRowKeys() ?? []
    const selectedIds = selectedKeys
      .map((key) => Number(key))
      .filter((value) => Number.isFinite(value) && value > 0)

    if (!selectedIds.length) {
      notify(t("Select a row first", "Select a row first"), "warning", 2500)
      return
    }

    const selectedIdSet = new Set(selectedIds)
    const orderedChitIds = rows
      .filter((row) => selectedIdSet.has(Number(row.CHIT_ID)))
      .map((row) => Number(row.CHIT_ID))

    for (const selectedId of selectedIds) {
      if (!orderedChitIds.includes(selectedId)) {
        orderedChitIds.push(selectedId)
      }
    }

    const companyCd = getCurrentCompanyCd()
    const params = new URLSearchParams()

    if (companyCd) {
      params.set("companyCd", companyCd)
    }

    params.set("reportCode", "PAYMENT_VOUCHER")
    params.set("chitId", String(orderedChitIds[0]))
    params.set("chitIds", orderedChitIds.join(","))

    const targetUrl = `${window.location.origin}/report-viewer${params.toString() ? `?${params.toString()}` : ""}`
    const viewerWindow = window.open(targetUrl, "_blank", "noopener,noreferrer")

    if (!viewerWindow) {
      notify(t("Unable to open report viewer", "Unable to open report viewer"), "error", 3000)
    }
  }, [rows, t])

  const handleImport = useCallback(
    async (_rows: Array<Record<string, unknown>>, _method: "add" | "update" | "overwrite", file?: File) => {
      if (!file) {
        notify(t("VAL_SELECT_EXCEL_FILE", "Please select an Excel file"), "warning", 3000)
        return
      }

      try {
        await importChitExcel(ledger, chitType, file)
        await loadData(fromDate, toDate, pageNumber, pageSize)
      } catch (error) {
        console.error("Import chit note error", error)
        notify(t("IMPORT_FAILED", "Import failed"), "error", 4000)
      }
    },
    [fromDate, ledger, loadData, chitType, pageNumber, pageSize, t, toDate],
  )

  const createColumnSettingTabs = useCallback((
    masterItems: GridColumnSettingEditorItem[],
    detailItems: GridColumnSettingEditorItem[],
    masterLoading = false,
    detailLoading = false,
  ): GridColumnSettingsPopupTab[] => [
    {
      key: masterGridId,
      title: t("VOUCHER_LIST", "Voucher list"),
      items: masterItems,
      loading: masterLoading,
    },
    {
      key: detailGridId,
      title: t("VOUCHER_DETAIL", "Voucher detail"),
      items: detailItems,
      loading: detailLoading,
    },
  ], [detailGridId, masterGridId, t])

  const openColumnSettings = useCallback(() => {
    setColumnSettingsVisible(true)
    setColumnSettingsTabs(createColumnSettingTabs([], [], true, true))

    void Promise.all([
      masterColumnSettingState.loadEditorItems(gridRef.current),
      detailColumnSettingState.loadEditorItems(detailGridRef.current),
    ]).then(([masterItems, detailItems]) => {
      setColumnSettingsTabs(createColumnSettingTabs(masterItems, detailItems, false, false))
    })
  }, [createColumnSettingTabs, detailColumnSettingState, masterColumnSettingState])

  const handleColumnSettingsSave = useCallback(async (tabs: GridColumnSettingsPopupTabSaveItem[]) => {
    const tabMap = new Map(tabs.map((item) => [item.key, item.items] as const))
    const [savedMasterItems, savedDetailItems] = await Promise.all([
      gridRef.current
        ? masterColumnSettingState.applyEditorItemsToComponent(
            gridRef.current,
            tabMap.get(masterGridId) ?? [],
          )
        : masterColumnSettingState.saveEditorItems(tabMap.get(masterGridId) ?? []),
      detailGridRef.current
        ? detailColumnSettingState.applyEditorItemsToComponent(
            detailGridRef.current,
            tabMap.get(detailGridId) ?? [],
          )
        : detailColumnSettingState.saveEditorItems(tabMap.get(detailGridId) ?? []),
    ])

    setColumnSettingsTabs(createColumnSettingTabs(savedMasterItems, savedDetailItems, false, false))
    setColumnSettingsVisible(false)
  }, [
    createColumnSettingTabs,
    detailColumnSettingState,
    detailGridId,
    masterColumnSettingState,
    masterGridId,
  ])

  const handleColumnSettingsReset = useCallback(async (activeTabKey?: string) => {
    if (!activeTabKey) {
      return
    }

    if (activeTabKey === masterGridId) {
      const resetMasterItems = await masterColumnSettingState.resetEditorItems(gridRef.current)
      const currentDetailItems = columnSettingsTabs.find((tab) => tab.key === detailGridId)?.items ?? []
      setColumnSettingsTabs(createColumnSettingTabs(resetMasterItems, currentDetailItems, false, false))
      return
    }

    if (activeTabKey === detailGridId) {
      const resetDetailItems = await detailColumnSettingState.resetEditorItems(detailGridRef.current)
      const currentMasterItems = columnSettingsTabs.find((tab) => tab.key === masterGridId)?.items ?? []
      setColumnSettingsTabs(createColumnSettingTabs(currentMasterItems, resetDetailItems, false, false))
    }
  }, [
    columnSettingsTabs,
    createColumnSettingTabs,
    detailColumnSettingState,
    detailGridId,
    masterColumnSettingState,
    masterGridId,
  ])

  const handleNewReceiptShortcut = useCallback(() => {
    if (chitType === "RC") {
      openCreatePopup()
      return
    }

    navigate("/gl/voucher/receipt")
  }, [chitType, navigate, openCreatePopup])

  const handleAddPaymentShortcut = useCallback(() => {
    if (chitType === "PM") {
      openCreatePopup()
      return
    }

    navigate("/gl/voucher/payment")
  }, [chitType, navigate, openCreatePopup])

  const additionalShortcutActions = useMemo(
    () => [SHORTCUT_ACTIONS.NEW_OR_ADD_RECEIPT, SHORTCUT_ACTIONS.ADD_PAYMENT],
    [],
  )

  const additionalShortcutHandlers = useMemo(
    () => ({
      [SHORTCUT_ACTIONS.NEW_OR_ADD_RECEIPT]: () => handleNewReceiptShortcut(),
      [SHORTCUT_ACTIONS.ADD_PAYMENT]: () => handleAddPaymentShortcut(),
    }),
    [handleAddPaymentShortcut, handleNewReceiptShortcut],
  )

  return (
    <DxPage>
      <GridToolbar
        gridRef={gridRef}
        onAdd={openCreatePopup}
        onOpenColumnSettings={openColumnSettings}
        onRefresh={handleRefresh}
        onRangeSearch={handleRangeSearch}
        fromDate={fromDate}
        toDate={toDate}
        onFromDateChange={setFromDate}
        onToDateChange={setToDate}
        showDateRange={true}
        onDelete={handleDelete}
        onImport={excelEnabled ? () => setIsExcelModalOpen(true) : undefined}
        onExportPdf={chitType === "PM" ? handleExportPdf : undefined}
        showExportPdf={chitType === "PM"}
        onExportXlsx={excelEnabled ? handleExportExcel : undefined}
        showImport={excelEnabled}
        showExportXlsx={excelEnabled}
        onSearchStateChange={(_value, active) => setIsMasterSearchActive(active)}
        shortcutsEnabled={!popupVisible && !isExcelModalOpen}
        additionalShortcutActions={additionalShortcutActions}
        additionalShortcutHandlers={additionalShortcutHandlers}
      />

      {excelEnabled && importConfig ? (
        <ExcelImportModal
          isOpen={isExcelModalOpen}
          onClose={() => setIsExcelModalOpen(false)}
          onImport={handleImport}
          existingData={rows}
          config={importConfig}
          serverImport={true}
          hideUpdateOverwrite={true}
        />
      ) : null}

      <div className="flex h-[calc(100vh-220px)] min-h-[560px] flex-col gap-2">
        <div className="relative min-h-[260px] flex-[0_0_66%]">
          <PageGrid<ChitInfo>
            dataSource={rows}
            keyExpr="CHIT_ID"
            screenCd={screenCd}
            gridId={masterGridId}
            pagingEnabled={true}
            showPager={true}
            copyExcludeFields={masterCopyExcludeFields}
            onInitialized={handleGridInitialized}
            onSelectionChanged={handleSelectionChanged}
            onRowDblClick={handleRowDblClick}
            onContextMenuUpdate={handleContextMenuUpdate}
            onContextMenuCopy={handleContextMenuCopy}
            selectMode="multiple"
            onOptionChanged={handleOptionChanged}
          >
            {chitColumnsNode}
          </PageGrid>

          <LoadPanel
            visible={loading}
            showIndicator={true}
            showPane={true}
            shading={true}
            shadingColor="rgba(0, 0, 0, 0.15)"
          />
        </div>

        <div className="min-h-[220px] flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-sm">
          <div className="relative h-full">
            <DetailGrid<ChitDetail>
              dataSource={selectedRowDetails}
              keyExpr="CHITDETAIL_ID"
              height="100%"
              screenCd={screenCd}
              gridId={detailGridId}
              persistColumnSettings={true}
              onInitialized={handleDetailGridInitialized}
              searchVisible={isMasterSearchActive}
              showSearchButton={false}
              noDataText={
                selectedRow?.CHIT_ID
                  ? t("NO_DETAIL_DATA", "No detail data")
                  : t("Select a row to view detail", "Select a row to view detail")
              }
            >
              <ChitDetailColumns />
            </DetailGrid>
          </div>
        </div>
      </div>

      <ChitEditorPopup
        visible={popupVisible}
        value={editingRow}
        ledger={ledger}
        chitType={chitType}
        isUpdate={isUpdate}
        loading={popupLoading}
        onClose={() => {
          if (!popupLoading) {
            setPopupVisible(false)
          }
        }}
        onSave={handleSave}
        onSaveAndNew={handleSaveAndNew}
      />
      <GridColumnSettingsPopup
        visible={columnSettingsVisible}
        title={t("AUDIT_SETTING_SHOW_HIDE", "Column Settings")}
        tabs={columnSettingsTabs}
        onClose={() => setColumnSettingsVisible(false)}
        onReset={handleColumnSettingsReset}
        onSaveTabs={handleColumnSettingsSave}
      />
    </DxPage>
  )
}

export default ChitManagementPage
