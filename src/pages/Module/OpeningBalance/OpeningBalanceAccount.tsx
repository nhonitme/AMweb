import { downloadFile } from "@/lib/fileUtils"
import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { confirm } from "devextreme/ui/dialog";
import { useNavigate} from "react-router-dom"
import Button from "devextreme-react/button"
import LoadPanel from "devextreme-react/load-panel"
import {
    Editing,
    Popup as DxPopup
} from "devextreme-react/data-grid"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import { LanguageContext } from "@/lib/i18nLoader";
import type dxDataGrid from "devextreme/ui/data_grid";
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { getCurrentLangCode } from '@/utils/language'
import { buildBeforeStatePayload, createEmptyRow, type BeforeState, type ROW_STATE } from "@/types/openingBalance"
import { formatNumber, SummaryCard } from "@/utils/openingBalanceHelpers"
import {
    exportToExcel,
} from "@/api/openingBalanceApi"
import {
    useOpeningBalanceAccountsMutations,
    useOpeningBalanceAccountsQuery,
} from "@/hooks/queries/openingBalanceQueries"
import { useMasterListLoadError, useMasterListReload } from "@/hooks/queries/master/masterQueryHelpers"
import type { EditorPreparingEvent, EditingStartEvent, RowDblClickEvent, ContextMenuPreparingEvent } from "devextreme/ui/data_grid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import { OpeningBalanceAccountColumns } from "./Columns/OpeningBalanceAccountColumns"
import { OpeningBalanceAccountForm } from "./Forms/OpeningBalanceAccountForm"
import { openingBalanceAmountErrorMessage } from "./openingBalanceValidation"
import BaseExcelImportPopup from "@/components/forms/BaseExcelImportPopup";
import { GetFiscalStartYear } from "@/api/openingBalanceApi";
import { openingBalanceAccountImportConfig } from "./Columns/OpeningBalanceAccountImportConfig";
import API_BASE_URL from "@/config/apiConfig";

type EditorValueChangedEvent = {
    value?: unknown
}

type OpeningBalanceEditorOptions = {
    items?: string[]
    onValueChanged?: (args: EditorValueChangedEvent) => void
}

type OpeningBalanceEditorPreparingEvent = EditorPreparingEvent<BeforeState, string | number> & {
    editorOptions: OpeningBalanceEditorOptions
}

function getTextValue(value: unknown): string {
    if (value === undefined || value === null) return ""
    return String(value).trim()
}

function OpeningBalanceAccount(): React.JSX.Element {
    const [openingYmd, setOpeningYmd] = useState<string>("19000101")

    const [isExcelModalOpen, setIsExcelModalOpen] = useState(false);
    const navigate = useNavigate()
    const gridRef = useRef<dxDataGrid<BeforeState, string | number> | null>(null)
    const { lang, translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string; lang: string };
    const t = translate

    const [keyword] = useState<string>("")
    const [rows, setRows] = useState<BeforeState[]>([])
    const [isFcSummaryExpanded, setIsFcSummaryExpanded] = useState<boolean>(false)
    const [isUpdate, setIsUpdate] = useState(false);
    const [editingRowData, setEditingRowData] = useState<BeforeState | null>(null);
    const popupTitle = translate ? translate(isUpdate ? "lblEdit" : "lblAddNew", "") : "";

    const screenCd = "/module/opening-balance/account"
    const gridId = "opening-balance-account-grid"

    const {
        data: queryRows = [],
        isLoading,
        isFetching,
        isError,
        error: loadError,
        refetch: refetchAccounts,
    } = useOpeningBalanceAccountsQuery(openingYmd, keyword)
    const { saveMutation } = useOpeningBalanceAccountsMutations()
    const loading = isLoading || isFetching
    const saving = saveMutation.isPending
    const reloadAccounts = useMasterListReload(refetchAccounts, gridRef)

    useMasterListLoadError(isError, loadError, t, "Failed to load opening balance accounts")

    useEffect(() => {
        void (async () => {
            try {
                const resp = await GetFiscalStartYear()
                setOpeningYmd(resp.Data)
            } catch (error) {
                console.error(error)
                notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải dữ liệu thất bại")), "error", 2500)
            }
        })()
    }, [t])

    useEffect(() => {
        const rowsWithIds = (queryRows as BeforeState[]).map((row) => ({
            ...row,
            ROW_ID:
                row.ROW_ID ||
                (row.ID != null && row.ID !== 0 ? String(row.ID) : `NEW_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`),
        }))
        setRows(rowsWithIds)
    }, [queryRows])

    const filteredRows = useMemo(() => {
        const search = keyword.trim().toLowerCase()

        if (!search) {
            return rows
        }

        return rows.filter((item) => {
            return (
                item.ACC_CD.toLowerCase().includes(search) ||
                item.ACC_NM_VIET.toLowerCase().includes(search) ||
                item.ACC_NM_ENG.toLowerCase().includes(search) ||
                item.ACC_NM_KOR.toLowerCase().includes(search) ||
                item.ACC_NM_CHINA.toLowerCase().includes(search) ||
                (item.SUMMARY ?? "").toLowerCase().includes(search) ||
                (item.NOTE ?? "").toLowerCase().includes(search)
            )
        })
    }, [keyword, rows])

    const totalDebit = useMemo(
        () => filteredRows.reduce((sum, item) => sum + Number(item.DEBIT || 0), 0),
        [filteredRows]
    )

    const totalCredit = useMemo(
        () => filteredRows.reduce((sum, item) => sum + Number(item.CREDIT || 0), 0),
        [filteredRows]
    )

    const totalDebitFc = useMemo(
        () => filteredRows.reduce((sum, item) => sum + Number(item.DEBIT_FC || 0), 0),
        [filteredRows]
    )

    const totalCreditFc = useMemo(
        () => filteredRows.reduce((sum, item) => sum + Number(item.CREDIT_FC || 0), 0),
        [filteredRows]
    )

    const diffAmount = useMemo(
        () => Math.abs(totalDebit - totalCredit),
        [totalDebit, totalCredit]
    )

    const diffAmountFc = useMemo(
        () => Math.abs(totalDebitFc - totalCreditFc),
        [totalDebitFc, totalCreditFc]
    )

    const validateRowBusiness = useCallback(
        (row: BeforeState): string | null => {
            if (!row.ACC_CD.trim()) {
                return t("ACC_CD_REQUIRED", "Mã tài khoản không được để trống")
            }
            return openingBalanceAmountErrorMessage(t, row)
        },
        [t]
    )


    const persistRow = useCallback(
        async (row: BeforeState) => {
            const businessError = validateRowBusiness(row)
            if (businessError) {
                notify(businessError, "warning", 2500)
                return
            }

            const rowState: ROW_STATE = (
                row.ROW_STATE === "INSERT"
                    ? "INSERT"
                    : row.ROW_STATE === "DELETE"
                    ? "DELETE"
                    : "UPDATE"
            ) as ROW_STATE

            const payloadRow: BeforeState = {
                ...row,
                ROW_STATE: rowState,
            }

            try {
                await saveMutation.mutateAsync(buildBeforeStatePayload([payloadRow], openingYmd))
                notify(t("SAVE_SUCCESS", "Lưu thành công"), "success", 2200)
            } catch (error) {
                console.error(error)
                notify(getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại")), "error", 2500)
                await refetchAccounts()
            }
        },
        [openingYmd, refetchAccounts, saveMutation, t, validateRowBusiness]
    )

    const handleRowInserted = useCallback(
        (e: { data: BeforeState }) => {
            setRows((current) => {
                const exists = current.some((item) => item.ROW_ID === e.data.ROW_ID)
                const next = exists ? current : [e.data, ...current]
                void persistRow(e.data)
                return next
            })
        },
        [persistRow]
    )

    const handleRowUpdated = useCallback(
        (e: { key: string | number; data: Partial<BeforeState> }) => {
            setRows((current) => {
                const next = current.map((item) =>
                    String(item.ROW_ID) === String(e.key)
                        ? {
                              ...item,
                              ...(e.data as Partial<BeforeState>),
                              ROW_STATE: (item.ROW_STATE === "INSERT" ? "INSERT" : "UPDATE") as ROW_STATE,
                          }
                        : item
                )
                const updated = next.find((item) => String(item.ROW_ID) === String(e.key))
                if (updated) {
                    void persistRow(updated)
                }
                return next
            })
        },
        [persistRow]
    )

    const handleDeleteSelectedRows = useCallback(async () => {
        const grid = gridRef.current
        if (!grid) {
            return
        }

        const selectedKeys = (await Promise.resolve(grid.getSelectedRowKeys())) as Array<string | number>
        const selectedRowsFromGrid = (await Promise.resolve(grid.getSelectedRowsData())) as BeforeState[]
        const selectedKeySetFromGrid = new Set(selectedKeys.map(getTextValue).filter(Boolean))

        const selectedRows = selectedRowsFromGrid.length > 0
            ? selectedRowsFromGrid
            : rows.filter((row) => selectedKeySetFromGrid.has(getTextValue(row.ROW_ID)))

        if (selectedRows.length === 0) {
            notify(t("MSG_SELECT_ROWS_TO_DELETE", "Vui lòng chọn dòng cần xóa"), "warning", 1600)
            return
        }

        const result = await confirm(
              t ? t("MSG_CONFIRM_DELETE_RECORD", "Are you sure you want to delete {0} record?").replace("{0}", String(selectedRows.length)) : "Are you sure you want to delete this record?",
              t ? t("MSG_CONFIRM_DELETE", "Confirm delete") : "Confirm delete"
            );
        
            if (!result) return;

        const rowsToDelete = selectedRows.map((row) => ({
            ...row,
            ROW_STATE: "DELETE" as ROW_STATE,
        }))

        try {
            await saveMutation.mutateAsync(buildBeforeStatePayload(rowsToDelete, openingYmd))

            setRows((current) =>
                current.filter((row) =>
                    !selectedRows.some((deleted) => getTextValue(deleted.ROW_ID) === getTextValue(row.ROW_ID))
                )
            )

            grid.clearSelection()
            notify(t("DELETE_SUCCESS", "Xóa thành công"), "success", 1600)
        } catch (error) {
            console.error(error)
            notify(getApiErrorMessage(error, t("DELETE_FAILED", "Xóa thất bại")), "error", 2500)
            await refetchAccounts()
        }
    }, [openingYmd, refetchAccounts, rows, saveMutation, t])

    const handleRowRemoved = useCallback(
        (e: { data: BeforeState }) => {
            const removed: BeforeState = {
                ...e.data,
                ROW_STATE: "DELETE" as ROW_STATE,
            }
            void persistRow(removed)
            setRows((current) => current.filter((item) => item.ROW_ID !== e.data.ROW_ID))
        },
        [persistRow]
    )

    const handleEditorPreparing = useCallback((e: OpeningBalanceEditorPreparingEvent) => {
        if (e.parentType !== "dataRow") return
        if (!e.row) return
    }, [])

    const handleRowDblClick = useCallback((e: RowDblClickEvent<BeforeState, string | number>) => {
        setIsUpdate(true)
        setEditingRowData(e.data ? { ...e.data } : null)
        e.component?.editRow?.(e.rowIndex)
    }, [])

    const onContextMenuPreparing = useCallback((e: ContextMenuPreparingEvent) => {
        if (e.row && e.row.rowType === "data") {
            e.items = [
                {
                    text: t('UpdateMsg', 'Update'),
                    onItemClick: () => {
                        if (e.row?.data) {
                            setIsUpdate(true)
                            setEditingRowData({ ...(e.row.data as BeforeState) })
                            e.component?.editRow?.(e.row.rowIndex)
                        }
                    },
                },
                {
                    text: t('btndelete', 'Delete'),
                    onItemClick: () => {
                        if (e.row?.data) {
                            e.component?.deleteRow?.(e.row.rowIndex)
                        }
                    },
                },
            ]
        }
    }, [t])

    const handleInitNewRow = useCallback((e: { data: BeforeState }) => {
        setIsUpdate(false)
        const emptyRow = createEmptyRow()

        if (!emptyRow.ROW_ID) {
            emptyRow.ROW_ID = `NEW_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
        }

        Object.assign(e.data, emptyRow)
        setEditingRowData({ ...e.data })
    }, [])

    const handleEditingStart = useCallback((e: EditingStartEvent<BeforeState>) => {
        const row = e?.data as BeforeState | undefined
        setIsUpdate(Boolean(row && row.ROW_ID && !String(row.ROW_ID).startsWith("NEW_")))
        setEditingRowData(row ? { ...row } : null)
    }, [])

    const toggleFcSummaryExpanded = useCallback(() => {
        setIsFcSummaryExpanded((current) => !current)
    }, [])

    const handleExportExcel = async () => {
        try {
            const keys = gridRef.current?.getSelectedRowKeys() || [];
            const ID = keys.length ? Number(keys[0]) : undefined;
            const loadDownloadBlob = (signal: AbortSignal) => exportToExcel(Number.isFinite(ID) && (ID as number) > 0 ? ID : undefined, getCurrentLangCode(), openingYmd, signal);
            await downloadFile({ fileName: `${translate('ACCOUNT_BALANCE_LIST','Account Balance List')}_${new Date().toISOString().replace(/[:.-]/g, '')}.xlsx`, load: loadDownloadBlob })
        } catch (err) {
        console.error('Export error', err);
        notify(
            getApiErrorMessage(err, translate ? translate('EXPORT_FAILED', 'Xuất thất bại') : 'Export failed'),
            'error',
            3000
        );
        }
  };

    return (
            <div className="min-h-full bg-gray-50 pt-0 md:pl-6 pr-6">
                <LoadPanel
                    visible={loading || saving}
                    shading={true}
                    showPane={true}
                    hideOnOutsideClick={false}
                    message={
                        saving
                            ? t("SAVING", "Đang lưu dữ liệu...")
                            : t("LOADING", "Đang tải dữ liệu...")
                    }
                />
                
                <BaseExcelImportPopup
                    visible={isExcelModalOpen}
                    onClose={() => setIsExcelModalOpen(false)}
                    title={t("ACCOUNT_BALANCE_LIST", "Import số dư đầu kỳ")}
                    moduleCd={openingBalanceAccountImportConfig.moduleCd}
                    templateUrl={`${API_BASE_URL}/System/DownloadTemplate`}
                    templateFileName={openingBalanceAccountImportConfig.templateName}
                    params={{
                        lang: getCurrentLangCode(),
                    }}
                    onImported={() => {
                        void reloadAccounts();
                    }}
                />
                <div className="mx-auto max-w-[1700px] space-y-2">
                    <div className="rounded-2xl border border-red-100 bg-white shadow-sm">
                        <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-">
                            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                                <div className="min-w-[140px]">
                                    <div className="mb-1 text-sm font-medium uppercase tracking-wide text-gray-500">
                                        {t("lblACCYEAR", "Năm tài chính")}: <span className="font-semibold text-red-600">{openingYmd.toString().substring(4, 6)}/{openingYmd.toString().substring(0, 4)}</span>
                                    </div>
                                </div>

                            </div>
                            <div className="flex flex-wrap items-end gap-2">
                                <Button
                                    text={t("GO_BACK_TO_PREVIOUS_PAGE", "Quay lại trang trước")}
                                    stylingMode="outlined"
                                    type="default"
                                    onClick={() => navigate("/gl/opening-balance")}
                                />
                                <Button
                                    text={t("RELOAD_PAGE", "Tải lại")}
                                    stylingMode="contained"
                                    type="default"
                                    onClick={() => void reloadAccounts()}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="rounded-2xl border border-red-100 bg-white shadow-sm">
                        <div className="space-y-4 p-4 md:p-5">
                            <div>
                                <div className="text-base font-semibold text-gray-900">
                                    {t("OPENING_BALANCE_SUMMARY", "Thông tin tổng hợp")}
                                </div>
                            </div>

                            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                                <SummaryCard
                                    title={t("AMOUNT_DEBT_TOTAL", "Tổng Nợ")}
                                    value={formatNumber(totalDebit)}
                                    subtitle={t("TOTAL_DEBIT_DESC", "Tổng phát sinh Nợ đầu kỳ")}
                                    tone="red"
                                />
                                <SummaryCard
                                    title={t("TOTAL_CREDIT", "Tổng Có")}
                                    value={formatNumber(totalCredit)}
                                    subtitle={t("TOTAL_CREDIT_DESC", "Tổng phát sinh Có đầu kỳ")}
                                    tone="blue"
                                />
                                <SummaryCard
                                    title={t("DIFF_CC", "Chênh lệch")}
                                    value={formatNumber(diffAmount)}
                                    subtitle={diffAmount === 0 ? t("BALANCED", "Cân đối") : t("NEED_RECHECK", "Cần kiểm tra lại")}
                                    tone={diffAmount === 0 ? "green" : "amber"}
                                />
                            </div>

                            <div className="overflow-hidden rounded-2xl border border-gray-100 bg-gray-50/60">
                                <button
                                    type="button"
                                    className="flex w-full items-center justify-between gap-3 px-4 text-left transition-colors duration-200 hover:bg-red-50/50"
                                    onClick={toggleFcSummaryExpanded}
                                    aria-expanded={isFcSummaryExpanded}
                                >
                                    <div>
                                        <div className="text-sm font-semibold uppercase tracking-wide text-gray-700">
                                            {t("FC_SUMMARY", "Ngoại tệ")}
                                        </div>
                                    </div>

                                    <span
                                        className={`mr-[-15px]  flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-red-100 bg-white text-sm font-semibold text-red-600 shadow-sm transition-transform duration-300 ease-out ${
                                            isFcSummaryExpanded ? "rotate-180" : "rotate-0"
                                        }`}
                                        aria-hidden="true"
                                    >
                                        ▼
                                    </span>
                                </button>

                                <div
                                    className={`grid transition-[grid-template-rows,opacity] duration-300 ease-out ${
                                        isFcSummaryExpanded ? "grid-rows-[1fr] opacity-100 pt-4" : "grid-rows-[0fr] opacity-0"
                                    }`}
                                >
                                    <div className="overflow-hidden">
                                        <div
                                            className={`grid grid-cols-1 gap-4 px-4 pb-4 transition-transform duration-300 ease-out md:grid-cols-2 xl:grid-cols-3 ${
                                                isFcSummaryExpanded ? "translate-y-0" : "-translate-y-2"
                                            }`}
                                        >
                                            <SummaryCard
                                                title={t("AMOUNT_DEBT_TOTAL_FC", "Tổng Nợ Ngoại tệ")}
                                                value={formatNumber(totalDebitFc)}
                                                subtitle={t("TOTAL_DEBIT_DESC", "Tổng phát sinh Nợ đầu kỳ")}
                                                tone="red"
                                            />
                                            <SummaryCard
                                                title={t("TOTAL_CREDIT_FC", "Tổng Có Ngoại tệ")}
                                                value={formatNumber(totalCreditFc)}
                                                subtitle={t("TOTAL_CREDIT_DESC", "Tổng phát sinh Có đầu kỳ")}
                                                tone="blue"
                                            />
                                            <SummaryCard
                                                title={t("DIFF_FC", "Chênh lệch Ngoại tệ")}
                                                value={formatNumber(diffAmountFc)}
                                                subtitle={diffAmountFc === 0 ? t("BALANCED", "Cân đối") : t("NEED_RECHECK", "Cần kiểm tra lại")}
                                                tone={diffAmountFc === 0 ? "green" : "amber"}
                                            />
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                    
                    <div className="rounded-2xl border border-red-100 bg-white shadow-sm">
                        <div className="border-b border-gray-100 px-4 py-3 md:px-5">
                            <div className="text-base font-semibold text-gray-900">
                                {t("ACCOUNT_BALANCE_LIST", "Danh sách số dư tài khoản")}
                            </div>
                        </div>

                        <div className="p-0 md:pl-4 pr-4 pb-4">
                            <GridToolbar
                                title=""
                                showColumnChooser={false}
                                gridRef={gridRef}
                                onRefresh={() => void reloadAccounts()}
                                showExportPdf={false}
                                onExportXlsx={handleExportExcel}
                                onImport={() => setIsExcelModalOpen(true)}
                                onDelete={handleDeleteSelectedRows}
                            />

                            <div>
                                <BaseDataGrid
                                    dataSource={filteredRows}
                                    keyExpr="ROW_ID"
                                    screenCd={screenCd}
                                    gridId={gridId}
                                    actionButtons={true}
                                    actionButtonsPosition="start"
                                    showPager={true}
                                    allowedPageSizes={[10, 20, 50, 100]}
                                    defaultPageSize={10}
                                    onInitialized={(event) => {
                                        gridRef.current = event.component ?? null;
                                    }}
                                    onRowInserted={handleRowInserted}
                                    onRowUpdated={handleRowUpdated}
                                    onRowRemoved={handleRowRemoved}
                                    onInitNewRow={handleInitNewRow}
                                    onEditorPreparing={handleEditorPreparing}
                                    onContextMenuPreparing={onContextMenuPreparing}
                                    onRowDblClick={handleRowDblClick}
                                    onEditingStart={handleEditingStart}
                                >
                                    <Editing
                                        mode="popup"
                                        allowUpdating={true}
                                        allowAdding={true}
                                        allowDeleting={true}
                                        confirmDelete={true}
                                        useIcons={true}
                                    >
                                        <DxPopup
                                            key={lang}  
                                            title={popupTitle}
                                            showTitle={true}
                                            width="90%"
                                            maxWidth={800}
                                            height="auto"
                                            deferRendering={false}
                                            animation={{
                                                show: {
                                                    type: "pop",
                                                    duration: 180,
                                                    from: { scale: 0.92, opacity: 0 },
                                                    to: { scale: 1, opacity: 1 },
                                                },
                                                hide: { type: "fade", duration: 120, from: 1, to: 0 },
                                            }}
                                        />
                                        <OpeningBalanceAccountForm
                                            translate={t}
                                            isUpdate={isUpdate}
                                            editingRowData={editingRowData}
                                        />
                                    </Editing>
                                    <OpeningBalanceAccountColumns t={t} />
                                </BaseDataGrid>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
    )
}

export default OpeningBalanceAccount
