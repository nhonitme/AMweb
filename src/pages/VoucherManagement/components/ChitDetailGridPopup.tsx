import { forwardRef, useCallback, useContext, useEffect, useLayoutEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentType, type MutableRefObject } from "react"
import { Button } from "devextreme-react"
import type { ReactNode } from "react"
import DataGrid, { Column, Editing, ColumnFixing, Scrolling } from "devextreme-react/data-grid"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
    CellClickEvent,
    CellPreparedEvent,
    ColumnCellTemplateData,
    ContentReadyEvent,
    ContextMenuPreparingEvent,
    InitializedEvent,
    ToolbarPreparingEvent,
} from "devextreme/ui/data_grid"
import { useNavigate } from "react-router-dom"

import { LanguageContext } from "@/lib/i18nLoader"
import { useGridColumnSettingState, type GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { useInlineGridSearch } from "@/components/datagrid/gridSearch"
import VoucherSpreadsheetSummaryBar from "@/components/datagrid/VoucherSpreadsheetSummaryBar"
import {
    AM_GRID_READONLY_COLUMN_CELL_CLASS,
    createSpreadsheetContinueRowKeyDownHandler,
    focusAppendedSpreadsheetRow,
    formatSpreadsheetSummaryNumber,
    prepareVoucherSpreadsheetToolbar,
    readGridScrollTop,
    shouldKeepCurrentRowKeyOnDataSourceChange,
    VOUCHER_SPREADSHEET_GRID_CLASS,
    voucherSpreadsheetKeyboardNavigation,
} from "@/components/datagrid/voucherSpreadsheetGrid"
import {
    buildVoucherDetailContextMenuItems,
    clearActiveRowContent,
    insertActiveRowAbove,
    renumberActiveSort,
} from "@/components/datagrid/voucherDetailRowOrder"
import {
    useVoucherSpreadsheetGridLayout,
} from "@/components/datagrid/useVoucherSpreadsheetGridLayout"
import { useVoucherSpreadsheetAddRow } from "@/components/datagrid/useVoucherSpreadsheetAddRow"
import { useVoucherSpreadsheetDetailSync } from "@/components/datagrid/useVoucherSpreadsheetDetailSync"
import { readPendingGridUpdatesByKey } from "@/components/datagrid/voucherSpreadsheetDetailSync"
import { isForeignCurrencyCode } from "@/lib/currency"
import { useLookupPopupCommands } from "@/components/lookup/LookupPopupHost"
import {
    CHIT_DETAIL_LIVE_INPUT_FIELDS,
    CHIT_DETAIL_LOOKUP_FIELDS,
} from "./chitEditorConstants"
import { getInventoryInputs, getInventoryOutputs } from "@/api/inventoryLinkApi"
import { getInventoryIssueLinksByCogsVoucherId } from "@/api/inventoryVoucherApi"
import {
    areLinkedInventoryMapsEqual,
    buildLinkedInventoryByDetailId,
    type LinkedInventoryTarget,
} from "@/pages/Inventory/inventoryAccountingLinkUtils"
import type { ChitDetail, ChitInfo, ChitType } from "@/types/voucher"
import {
    calculateChitAmount,
    cloneChitDetail,
    createDefaultChitDetail,
    getActiveChitDetails,
    getVoucherRouteByChitType,
    isInventoryInputLinkedAccountingVoucherType,
    isInventoryLinkedAccountingVoucherType,
    isInventoryOutputLinkedAccountingVoucherType,
} from "../chitUtils"
import type { VoucherDetailColumnsProps } from "./ChitDetailColumnsPopup"
import {
    getChitDetailMissingAccountFields,
    type ChitDetailAccountField,
    type ChitDetailRowValidationWarnings,
} from "./chitEditorUtils"
import VoucherDetailActions from "./VoucherDetailActions"

export interface ChitDetailGridHandle {
    savePendingChanges: () => Promise<ChitDetail[]>
    addRow: () => void
    insertRowAbove: (targetKey?: string | null) => void
    clearCurrentRow: () => void
    deleteCurrentRow: () => void
    softDeleteRowByKey: (targetKey: string | null) => void
    focusSearch: () => void
    focusDetailRow: (rowKey: string, focusField?: ChitDetailAccountField) => Promise<void>
    setRowValidationWarnings: (warnings: ChitDetailRowValidationWarnings) => void
    clearRowValidationWarnings: () => void
    getCurrentRowKey: () => string | null
    getGridInstance: () => dxDataGrid<ChitDetail, string> | null
}

const CHIT_DETAIL_CLEAR_PRESERVE_KEYS = [
    "ROW_KEY",
    "CHITDETAIL_ID",
    "COMPANY_CD",
    "CHIT_ID",
    "CHITDETAIL_CD",
    "CHIT_YMD",
    "CHIT_VMD",
    "SORT",
    "ISDEL",
] as const satisfies readonly (keyof ChitDetail)[]

interface ChitDetailGridProps {
    companyCd: string
    chitType?: ChitType
    baseDate?: ChitInfo["CHIT_YMD"]
    details: ChitDetail[]
    onChange: (rows: ChitDetail[], amount: number) => void
    height?: number | string
    isVisible?: boolean
    readOnly?: boolean
    layoutVersion?: number
    ChitDetailColumns?: ComponentType<VoucherDetailColumnsProps> | undefined
    quickCreateCustomer?: boolean
    screenCd?: string
    gridId?: string
    persistColumnSettings?: boolean
    columnSettingStateRef?: MutableRefObject<GridColumnSettingState | null>
    onOpenInventory?: (row: ChitDetail, target?: LinkedInventoryTarget) => Promise<void>
    inventoryBusy?: boolean
    pendingInventoryRowKeys?: string[]
    pendingInventoryDeleteRowKeys?: string[]
    pendingInventoryDeleteChitIds?: number[]
    inventoryRefreshVersion?: number
    showInventoryLinkActions?: boolean
    canOpenInventoryRow?: (row: ChitDetail) => boolean
    inventoryLinkType?: "IR" | "IO"
    showVatDetailActions?: boolean
    hasVatDataForRow?: (rowKey: string) => boolean
    isVatActiveForRow?: (rowKey: string) => boolean
    onOpenVat?: (row: ChitDetail) => void
    renderDetailLink?: (row: ChitDetail) => ReactNode
  linkSlot?: ReactNode
}

const RUNTIME_COLUMN_SETTING_EXCLUDED_NAMES = ["FC_AMOUNT", "FC_RATE"] as const
const MAX_DETAIL_GRID_HEIGHT = 420

function normalizeChitDetailGridRows(rows: ChitDetail[]): ChitDetail[] {
    return rows.map((item) => cloneChitDetail(item))
}

function resolveChitDetailRowKey(
    rowKey: string | number | undefined,
    data: ChitDetail | undefined,
): string | null {
    if (typeof rowKey === "string" && rowKey.length > 0) {
        return rowKey
    }

    if (typeof data?.ROW_KEY === "string" && data.ROW_KEY.length > 0) {
        return data.ROW_KEY
    }

    return null
}

function hasForeignCurrencyDetails(rows: readonly ChitDetail[]): boolean {
    return rows.some((row) => isForeignCurrencyCode(row.FC_TYPE))
}

function resolveDetailActionsColumnWidth(options: {
    showInventory: boolean
    showVat: boolean
    hasDetailLink: boolean
}): number {
    const { showInventory, showVat, hasDetailLink } = options
    let width = 0
    if (showInventory) {
        width += 72
    }
    if (showVat) {
        width += 64
    }
    if (hasDetailLink) {
        width += 72
    }
    if (showInventory && showVat) {
        width += 8
    }
    return Math.max(width, 64)
}

export const ChitDetailGridPopup = forwardRef<ChitDetailGridHandle, ChitDetailGridProps>(
    function ChitDetailGrid(
        {
            companyCd,
            chitType,
            details,
            onChange,
            height,
            isVisible = true,
            readOnly = false,
            layoutVersion = 0,
            ChitDetailColumns,
            quickCreateCustomer = false,
            screenCd,
            gridId,
            persistColumnSettings = false,
            columnSettingStateRef,
            onOpenInventory,
            inventoryBusy = false,
            pendingInventoryRowKeys = [],
            pendingInventoryDeleteRowKeys = [],
            pendingInventoryDeleteChitIds = [],
            inventoryRefreshVersion = 0,
            showInventoryLinkActions: showInventoryLinkActionsProp,
            inventoryLinkType,
            showVatDetailActions: showVatDetailActionsProp,
            hasVatDataForRow,
            isVatActiveForRow,
            onOpenVat,
            renderDetailLink,
  linkSlot,
        },
        ref,
    ) {
        const navigate = useNavigate()
        const lookupPopupCommands = useLookupPopupCommands()
        const gridRef = useRef<dxDataGrid<ChitDetail, string> | null>(null)
        const searchContainerRef = useRef<HTMLDivElement | null>(null)
        const currentRowKeyRef = useRef<string | null>(null)
        const deleteFlowRef = useRef(false)
        const linkedInventoryByDetailIdRef = useRef<Record<number, LinkedInventoryTarget[]>>({})
        const linkedInventoryLoadKeyRef = useRef("")
        const linkedInventoryInFlightKeyRef = useRef("")
        const contentReadyHandledRef = useRef(false)
        const [linkedInventoryVersion, setLinkedInventoryVersion] = useState(0)
        const [linkLoading, setLinkLoading] = useState(false)
        const [linkLoadFailed, setLinkLoadFailed] = useState(false)
        const [linkRetryVersion, setLinkRetryVersion] = useState(0)
        const [forceForeignCurrencyColumnsVisible, setForceForeignCurrencyColumnsVisible] = useState(false)
        const [rowValidationWarnings, setRowValidationWarnings] = useState<ChitDetailRowValidationWarnings>({})
        const { translate } = useContext(LanguageContext) as {
            translate?: (key: string, fallback?: string) => string
        }
        const { searchText, searchVisible, showSearch, handleSearchTextChange, handleSearchEnter } =
            useInlineGridSearch(gridRef)
        const usesSysGridCatalog = persistColumnSettings && Boolean(gridId?.trim())
        const excludedColumnNames = useMemo(
            () => chitType === "PO" || chitType === "SO"
                ? [...RUNTIME_COLUMN_SETTING_EXCLUDED_NAMES, "VAT_AMOUNT", "VAT_CHIT_NO"]
                : RUNTIME_COLUMN_SETTING_EXCLUDED_NAMES,
            [chitType],
        )
        const columnSettingState = useGridColumnSettingState({
            enabled: persistColumnSettings,
            screenCd,
            gridId,
            excludedColumnNames,
            hideColumnsMissingFromSettings: usesSysGridCatalog,
        })
        const t = useCallback(
            (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
            [translate],
        )
        const visibleDetails = useMemo(() => getActiveChitDetails(details), [details])
        const showInventoryLinkActions = showInventoryLinkActionsProp ?? isInventoryLinkedAccountingVoucherType(chitType)
        const showVatActions = showVatDetailActionsProp ?? Boolean(onOpenVat)
        const showDetailActionsColumn = Boolean(renderDetailLink || showInventoryLinkActions || showVatActions)
        const detailActionsColumnWidth = resolveDetailActionsColumnWidth({
            showInventory: showInventoryLinkActions,
            showVat: showVatActions,
            hasDetailLink: Boolean(renderDetailLink),
        })
        const usePercentHeight = height === "100%"
        const activeDetailIdsKey = useMemo(
            () =>
                visibleDetails
                    .map((detail) => Number(detail.CHITDETAIL_ID ?? 0))
                    .filter((id) => id > 0)
                    .sort((a, b) => a - b)
                    .join(","),
            [visibleDetails],
        )
        const headerChitId = useMemo(() => {
            for (const detail of visibleDetails) {
                const chitId = Number(detail.CHIT_ID ?? 0)
                if (chitId > 0) {
                    return chitId
                }
            }
            return 0
        }, [visibleDetails])

        const { containerRef, gridHeight, notifyGridContentReady, notifyGridDisposing } = useVoucherSpreadsheetGridLayout({
            gridRef,
            isVisible,
            layoutVersion,
        })
        const resolvedDataGridHeight = usePercentHeight ? "100%" : gridHeight
        const foreignCurrencyColumnsVisible = forceForeignCurrencyColumnsVisible || hasForeignCurrencyDetails(visibleDetails)
        const softDeletedCount = useMemo(
            () => details.reduce((count, item) => count + (item.ISDEL ? 1 : 0), 0),
            [details],
        )
        const totalAmount = useMemo(() => calculateChitAmount(visibleDetails), [visibleDetails])
        const summaryItems = useMemo(
            () => [
                {
                    key: "rows",
                    label: t("ROW_COUNT", "Rows"),
                    value: formatSpreadsheetSummaryNumber(visibleDetails.length),
                },
                {
                    key: "amount",
                    label: t("TOTAL_AMOUNT", "Total Amount"),
                    value: formatSpreadsheetSummaryNumber(totalAmount, 2),
                },
            ],
            [t, totalAmount, visibleDetails.length],
        )

        useEffect(() => {
            contentReadyHandledRef.current = false
        }, [isVisible, layoutVersion])

        useEffect(() => {
            if (!isVisible || !showInventoryLinkActions) {
                if (linkedInventoryLoadKeyRef.current !== "" || Object.keys(linkedInventoryByDetailIdRef.current).length > 0) {
                    linkedInventoryLoadKeyRef.current = ""
                    linkedInventoryInFlightKeyRef.current = ""
                    linkedInventoryByDetailIdRef.current = {}
                    setLinkedInventoryVersion((current) => current + 1)
                }
                return
            }

            if (!activeDetailIdsKey) {
                linkedInventoryByDetailIdRef.current = {}
                setLinkLoading(false)
                setLinkLoadFailed(false)
                return
            }

            const loadKey = `${chitType}:${headerChitId}:${activeDetailIdsKey}:${inventoryRefreshVersion}:${linkRetryVersion}`
            if (linkedInventoryLoadKeyRef.current === loadKey) {
                return
            }

            if (linkedInventoryInFlightKeyRef.current === loadKey) {
                return
            }

            linkedInventoryInFlightKeyRef.current = loadKey
            setLinkLoading(true)
            setLinkLoadFailed(false)
            const detailIds = activeDetailIdsKey
                .split(",")
                .map((value) => Number(value))
                .filter((id) => id > 0)

            let cancelled = false

            void (async () => {
                try {
                    const lines = chitType === "OT" && !inventoryLinkType
                        ? [
                            ...(await getInventoryInputs(detailIds)),
                            ...(await getInventoryOutputs(detailIds)),
                          ]
                        : inventoryLinkType === "IR" || (!inventoryLinkType && isInventoryInputLinkedAccountingVoucherType(chitType))
                        ? await getInventoryInputs(detailIds)
                        : inventoryLinkType === "IO" || (!inventoryLinkType && isInventoryOutputLinkedAccountingVoucherType(chitType))
                          ? await getInventoryOutputs(detailIds)
                          : []
                    if (cancelled) {
                        return
                    }

                    const nextMap = buildLinkedInventoryByDetailId(lines)

                    if (chitType === "OT" && headerChitId > 0) {
                        const cogsLinks = await getInventoryIssueLinksByCogsVoucherId(headerChitId)
                        if (cancelled) {
                            return
                        }
                        for (const [detailIdText, inventoryChitId] of Object.entries(cogsLinks)) {
                            const detailId = Number(detailIdText)
                            const chitId = Number(inventoryChitId)
                            if (!(detailId > 0 && chitId > 0)) {
                                continue
                            }
                            const existing = nextMap[detailId] ?? []
                            if (existing.some((target) => target.chitId === chitId)) {
                                continue
                            }
                            nextMap[detailId] = [
                                ...existing,
                                { chitId, chitType: "IO", chitNo: "" },
                            ]
                        }
                    }

                    linkedInventoryLoadKeyRef.current = loadKey
                    linkedInventoryInFlightKeyRef.current = ""
                    if (areLinkedInventoryMapsEqual(linkedInventoryByDetailIdRef.current, nextMap)) {
                        return
                    }

                    linkedInventoryByDetailIdRef.current = nextMap
                    setLinkedInventoryVersion((current) => current + 1)
                } catch (error) {
                    console.error("Load linked inventory vouchers failed", error)
                    if (!cancelled) {
                        linkedInventoryInFlightKeyRef.current = ""
                        setLinkLoadFailed(true)
                    }
                } finally {
                    if (!cancelled) setLinkLoading(false)
                }
            })()

            return () => {
                cancelled = true
                if (linkedInventoryInFlightKeyRef.current === loadKey) {
                    linkedInventoryInFlightKeyRef.current = ""
                }
            }
        }, [activeDetailIdsKey, chitType, headerChitId, isVisible, showInventoryLinkActions, inventoryRefreshVersion, linkRetryVersion, inventoryLinkType])

        const handleOpenLinkedInventory = useCallback(
            (target: LinkedInventoryTarget) => {
                const route = getVoucherRouteByChitType(target.chitType)
                if (!route || !(target.chitId > 0)) {
                    notify(t("OPEN_INVENTORY_VOUCHER_FAILED", "Không mở được phiếu kho"), "warning", 2500)
                    return
                }

                navigate(route, {
                    state: {
                        openChitId: target.chitId,
                        openMode: "edit",
                    },
                })
            },
            [navigate, t],
        )

        const buildMergedRows = useCallback(() => {
            const source = gridRef.current?.option("dataSource")
            const pendingByKey = readPendingGridUpdatesByKey(gridRef.current)
            const activeRows = Array.isArray(source)
                ? normalizeChitDetailGridRows(source as ChitDetail[])
                : visibleDetails.map((item) => cloneChitDetail(item))
            const activeRowMap = new Map(
                activeRows.map((item) => {
                    const patch = pendingByKey.get(String(item.ROW_KEY))
                    const merged = patch ? { ...item, ...patch } : item
                    return [item.ROW_KEY, { ...merged, ISDEL: false }] as const
                }),
            )
            const mergedRows: ChitDetail[] = []

            details.forEach((item) => {
                if (item.ISDEL) {
                    mergedRows.push(cloneChitDetail(item))
                    return
                }

                const activeRow = activeRowMap.get(item.ROW_KEY)
                if (!activeRow) {
                    return
                }

                mergedRows.push(cloneChitDetail(activeRow))
                activeRowMap.delete(item.ROW_KEY)
            })

            activeRowMap.forEach((item) => {
                mergedRows.push(cloneChitDetail(item))
            })

            return mergedRows
        }, [details, visibleDetails])

        const emitRowsChange = useCallback(
            (rows: ChitDetail[]) => {
                onChange(rows, calculateChitAmount(rows))
                return rows
            },
            [onChange],
        )

        const syncRows = useCallback(() => emitRowsChange(buildMergedRows()), [buildMergedRows, emitRowsChange])

        const applySoftValidationForRow = useCallback((row: ChitDetail | null | undefined) => {
            if (!row || row.ISDEL) {
                return
            }

            const rowKey = row.ROW_KEY
            const missingFields = getChitDetailMissingAccountFields(row)
            setRowValidationWarnings((current) => {
                const next = { ...current }
                if (missingFields.length === 0) {
                    delete next[rowKey]
                } else {
                    next[rowKey] = missingFields
                }
                return next
            })
        }, [])

        const handleLeaveFocusCell = useCallback((prev: { rowIndex: number }) => {
            const previousRow = gridRef.current?.getVisibleRows().find((row) => row.rowIndex === prev.rowIndex)
            if (previousRow?.rowType === "data" && previousRow.data) {
                applySoftValidationForRow(previousRow.data)
            }
        }, [applySoftValidationForRow])

        const { handleFocusedCellChanged, isCommitInFlight } = useVoucherSpreadsheetDetailSync({
            visible: isVisible,
            isReadOnly: readOnly,
            isLookupPopupOpenRef: lookupPopupCommands?.isLookupPopupOpenRef ?? null,
            gridRef,
            gridContainerRef: containerRef,
            syncRows,
            liveInputFields: CHIT_DETAIL_LIVE_INPUT_FIELDS,
            lookupFields: CHIT_DETAIL_LOOKUP_FIELDS,
            onLeaveFocusCell: handleLeaveFocusCell,
        })

        const appendDetailRowInState = useCallback(() => {
            const currentRows = buildMergedRows()
            const nextSort = getActiveChitDetails(currentRows).length + 1
            const newRow = createDefaultChitDetail(nextSort, companyCd)
            const nextRows = renumberActiveSort([...currentRows, newRow], "SORT")
            currentRowKeyRef.current = newRow.ROW_KEY
            emitRowsChange(nextRows)
            return newRow.ROW_KEY
        }, [buildMergedRows, companyCd, emitRowsChange])

        const { handleAddRow, handleSaved } = useVoucherSpreadsheetAddRow({
            gridRef,
            syncRows,
            dataSource: visibleDetails,
            shouldSkipSavedSync: () => deleteFlowRef.current || isCommitInFlight(),
            appendRowInState: appendDetailRowInState,
            focusAppendedRow: (grid, rowKey, scrollTop) => {
                focusAppendedSpreadsheetRow(grid, rowKey, scrollTop, "DEBIT")
            },
        })

        const handleCurrencyValueChanged = useCallback(
            (value: unknown) => {
                setForceForeignCurrencyColumnsVisible(isForeignCurrencyCode(value))
            },
            [],
        )
        const renderedDetailColumns = useMemo(() => {
            if (!ChitDetailColumns) {
                return null
            }

            return (
                <ChitDetailColumns
                    onCurrencyValueChanged={handleCurrencyValueChanged}
                    foreignCurrencyColumnsVisible={foreignCurrencyColumnsVisible}
                    quickCreateCustomer={quickCreateCustomer}
                />
            )
        }, [
            ChitDetailColumns,
            quickCreateCustomer,
            foreignCurrencyColumnsVisible,
            handleCurrencyValueChanged,
        ])

        const focusSearchInput = useCallback(() => {
            const input = searchContainerRef.current?.querySelector("input.dx-texteditor-input, input") as HTMLInputElement | null
            input?.focus()
            input?.select?.()
        }, [])

        const getCurrentRowKey = useCallback(() => {
            const editingRowKey = gridRef.current?.option("editing.editRowKey") as unknown

            if (typeof editingRowKey === "string" && visibleDetails.some((item) => item.ROW_KEY === editingRowKey)) {
                return editingRowKey
            }

            const currentRowKey = currentRowKeyRef.current
            if (currentRowKey && visibleDetails.some((item) => item.ROW_KEY === currentRowKey)) {
                return currentRowKey
            }

            return visibleDetails[visibleDetails.length - 1]?.ROW_KEY ?? null
        }, [visibleDetails])

        const softDeleteRowByKey = useCallback(
            async (targetKey: string | null) => {
                if (!targetKey || readOnly) {
                    return
                }

                deleteFlowRef.current = true

                try {
                    if (gridRef.current?.hasEditData()) {
                        await gridRef.current.saveEditData()
                    }

                    const currentRows = buildMergedRows()
                    let changed = false
                    const nextRows = renumberActiveSort(
                        currentRows.map((item) => {
                            if (item.ROW_KEY !== targetKey || item.ISDEL) {
                                return item
                            }

                            changed = true
                            return cloneChitDetail({
                                ...item,
                                ISDEL: true,
                            })
                        }),
                        "SORT",
                    )

                    if (!changed) {
                        return
                    }

                    if (currentRowKeyRef.current === targetKey) {
                        currentRowKeyRef.current = getActiveChitDetails(nextRows).at(-1)?.ROW_KEY ?? null
                    }

                    emitRowsChange(nextRows)
                } finally {
                    deleteFlowRef.current = false
                }
            },
            [buildMergedRows, emitRowsChange, readOnly],
        )

        const insertRowAbove = useCallback(
            async (targetKey?: string | null) => {
                if (readOnly) {
                    return
                }

                const grid = gridRef.current
                const focusKey = targetKey ?? getCurrentRowKey()
                const scrollTop = readGridScrollTop(grid)

                if (grid?.hasEditData()) {
                    await grid.saveEditData()
                }

                const currentRows = buildMergedRows()
                const { nextRows, newRowKey } = insertActiveRowAbove(
                    currentRows,
                    focusKey,
                    (nextSort) => createDefaultChitDetail(nextSort, companyCd),
                )
                const renumbered = renumberActiveSort(nextRows, "SORT")
                currentRowKeyRef.current = newRowKey
                emitRowsChange(renumbered)

                requestAnimationFrame(() => {
                    const nextGrid = gridRef.current
                    if (!nextGrid) {
                        return
                    }
                    focusAppendedSpreadsheetRow(nextGrid, newRowKey, scrollTop, "DEBIT")
                })
            },
            [buildMergedRows, companyCd, emitRowsChange, getCurrentRowKey, readOnly],
        )

        const clearCurrentRow = useCallback(
            async (targetKey?: string | null) => {
                if (readOnly) {
                    return
                }

                const focusKey = targetKey ?? getCurrentRowKey()
                if (!focusKey) {
                    return
                }

                if (gridRef.current?.hasEditData()) {
                    await gridRef.current.saveEditData()
                }

                const currentRows = buildMergedRows()
                let changed = false
                const nextRows = currentRows.map((item) => {
                    if (item.ROW_KEY !== focusKey || item.ISDEL) {
                        return item
                    }

                    changed = true
                    return clearActiveRowContent(
                        item,
                        () => createDefaultChitDetail(item.SORT ?? 1, companyCd),
                        CHIT_DETAIL_CLEAR_PRESERVE_KEYS,
                    )
                })

                if (!changed) {
                    return
                }

                currentRowKeyRef.current = focusKey
                emitRowsChange(nextRows)
            },
            [buildMergedRows, companyCd, emitRowsChange, getCurrentRowKey, readOnly],
        )

        const handleContextMenuPreparing = useCallback(
            (event: ContextMenuPreparingEvent<ChitDetail, string>) => {
                if (readOnly || event.row?.rowType !== "data" || !event.row.data) {
                    return
                }

                const rowKey = resolveChitDetailRowKey(event.row.key, event.row.data)
                if (!rowKey) {
                    return
                }

                event.items = buildVoucherDetailContextMenuItems({
                    canEdit: !readOnly,
                    insertText: t("INSERT_ROW", "Chèn dòng"),
                    addAtEndText: t("ADD_ROW", "Thêm dòng"),
                    deleteText: t("DELETE_ROW", "Xóa dòng"),
                    onInsert: () => {
                        void insertRowAbove(rowKey)
                    },
                    onAddAtEnd: () => {
                        void handleAddRow()
                    },
                    onDelete: () => {
                        void softDeleteRowByKey(rowKey)
                    },
                })
            },
            [handleAddRow, insertRowAbove, readOnly, softDeleteRowByKey, t],
        )

        const undeleteLastRow = useCallback(
            async () => {
                if (gridRef.current?.hasEditData()) {
                    await gridRef.current.saveEditData()
                }

                const currentRows = buildMergedRows()
                const deletedRow = [...currentRows].reverse().find((item) => item.ISDEL)
                if (!deletedRow) {
                    return
                }

                const nextRows = currentRows.map((item) =>
                    item.ROW_KEY === deletedRow.ROW_KEY
                        ? cloneChitDetail({
                            ...item,
                            ISDEL: false,
                        })
                        : item,
                )

                currentRowKeyRef.current = deletedRow.ROW_KEY
                emitRowsChange(nextRows)
                requestAnimationFrame(() => {
                    gridRef.current?.navigateToRow?.(deletedRow.ROW_KEY)
                })
            },
            [buildMergedRows, emitRowsChange],
        )

        const handleCellClick = useCallback((event: CellClickEvent<ChitDetail, string>) => {
            if (event.rowType !== "data") {
                return
            }

            currentRowKeyRef.current = resolveChitDetailRowKey(event.key, event.data)
        }, [])

        const handleCellPrepared = useCallback((event: CellPreparedEvent<ChitDetail, string>) => {
            if (event.rowType !== "data" || !event.cellElement || !event.column?.dataField) {
                return
            }

            const dataField = event.column.dataField
            if (dataField !== "DEBIT" && dataField !== "CREDIT") {
                return
            }

            const rowKey = resolveChitDetailRowKey(event.key, event.data)
            if (!rowKey) {
                return
            }

            const warnings = rowValidationWarnings[rowKey]
            if (!warnings?.includes(dataField)) {
                return
            }

            event.cellElement.classList.add("am-grid-cell-validation-warning")
        }, [rowValidationWarnings])

        const focusDetailRow = useCallback(async (rowKey: string, focusField: ChitDetailAccountField = "DEBIT") => {
            const grid = gridRef.current
            if (!grid || !rowKey) {
                return
            }

            await grid.navigateToRow(rowKey)
            const rowIndex = grid.getRowIndexByKey(rowKey)
            if (rowIndex >= 0) {
                grid.editCell(rowIndex, focusField)
            }
        }, [])

        const handleContinueRow = useCallback(() => {
            void handleAddRow()
        }, [handleAddRow])

        const handleKeyDown = useMemo(
            () => createSpreadsheetContinueRowKeyDownHandler<ChitDetail>(() => {
                void handleContinueRow()
            }),
            [handleContinueRow],
        )

        useImperativeHandle(
            ref,
            () => ({
                savePendingChanges: async () => {
                    if (gridRef.current) {
                        await gridRef.current.saveEditData()
                    }

                    return syncRows()
                },
                addRow: () => {
                    void handleAddRow()
                },
                insertRowAbove: (targetKey) => {
                    void insertRowAbove(targetKey)
                },
                clearCurrentRow: () => {
                    void clearCurrentRow()
                },
                deleteCurrentRow: () => {
                    void softDeleteRowByKey(getCurrentRowKey())
                },
                softDeleteRowByKey: (targetKey) => {
                    void softDeleteRowByKey(targetKey)
                },
                focusSearch: () => {
                    if (!searchVisible) {
                        showSearch()
                    }

                    requestAnimationFrame(() => {
                        focusSearchInput()
                    })
                },
                focusDetailRow,
                setRowValidationWarnings: (warnings: ChitDetailRowValidationWarnings) => {
                    setRowValidationWarnings(warnings)
                },
                clearRowValidationWarnings: () => {
                    setRowValidationWarnings({})
                },
                getCurrentRowKey,
                getGridInstance: () => gridRef.current,
            }),
            [clearCurrentRow, focusDetailRow, focusSearchInput, getCurrentRowKey, handleAddRow, insertRowAbove, searchVisible, showSearch, softDeleteRowByKey, syncRows],
        )

        const handleInitialized = useCallback((event: InitializedEvent<ChitDetail, string>) => {
            gridRef.current = event.component ?? null
            if (columnSettingState.cachedEditorItems.length) {
                columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
            }
        }, [columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent])

        const handleContentReady = useCallback(
            (_event: ContentReadyEvent<ChitDetail, string>) => {
                if (contentReadyHandledRef.current) {
                    return
                }

                contentReadyHandledRef.current = true
                if (usePercentHeight) {
                    try {
                        gridRef.current?.updateDimensions()
                    } catch {
                    }
                    return
                }

                notifyGridContentReady()
            },
            [notifyGridContentReady, usePercentHeight],
        )

        const handleDisposing = useCallback(() => {
            notifyGridDisposing()
        }, [notifyGridDisposing])

        const handleToolbarPreparing = useCallback((e: ToolbarPreparingEvent<ChitDetail, string>) => {
            prepareVoucherSpreadsheetToolbar(e)
        }, [])

        useEffect(() => {
            gridRef.current?.repaint()
        }, [rowValidationWarnings])

        useEffect(() => {
            if (!isVisible) {
                setForceForeignCurrencyColumnsVisible(false)
                setRowValidationWarnings({})
                return
            }

            const currentRowKey = currentRowKeyRef.current
            const visibleRowKeys = visibleDetails.map((item) => item.ROW_KEY)
            if (shouldKeepCurrentRowKeyOnDataSourceChange(gridRef.current, currentRowKey, visibleRowKeys)) {
                return
            }

            currentRowKeyRef.current = visibleDetails[0]?.ROW_KEY ?? null
        }, [isVisible, visibleDetails])

        useLayoutEffect(() => {
            if (!isVisible || !columnSettingState.enabled || !gridRef.current || !columnSettingState.cachedEditorItems.length) {
                return
            }

            columnSettingState.syncEditorItemsToComponent(gridRef.current, columnSettingState.cachedEditorItems)
        }, [
            columnSettingState.cachedEditorItems,
            columnSettingState.enabled,
            columnSettingState.syncEditorItemsToComponent,
            isVisible,
        ])

        useEffect(() => {
            if (!isVisible || !columnSettingState.enabled || !gridRef.current) {
                return
            }

            let cancelled = false

            void columnSettingState.loadEditorItems(gridRef.current).then((items) => {
                if (cancelled || !gridRef.current || items.length === 0) {
                    return
                }

                columnSettingState.syncEditorItemsToComponent(gridRef.current, items)
            })

            return () => {
                cancelled = true
            }
        }, [
            columnSettingState.enabled,
            columnSettingState.loadEditorItems,
            columnSettingState.syncEditorItemsToComponent,
            isVisible,
        ])

        if (columnSettingStateRef) {
            columnSettingStateRef.current = columnSettingState
        }

        const rootStyle = height !== undefined ? { height } : { height: MAX_DETAIL_GRID_HEIGHT }

        return (
            <div className="flex min-h-0 w-full flex-col overflow-hidden bg-white" style={rootStyle}>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
                    {!readOnly ? (
                        <>
                            <Button
                                stylingMode="outlined"
                                icon="plus"
                                text={t("ADD_ROW", "Thêm dòng")}
                                hint={t("ADD_ROW", "Thêm dòng")}
                                onClick={() => {
                                    void handleAddRow()
                                }}
                            />
                            {softDeletedCount > 0 ? (
                                <Button
                                    stylingMode="outlined"
                                    icon="revert"
                                    text={t("Undelete", "Hoàn tác")}
                                    hint={t("RESTORE_LAST_DELETED_ROW", "Restore the last deleted row")}
                                    onClick={() => {
                                        void undeleteLastRow()
                                    }}
                                />
                            ) : null}
                        </>
                    ) : null}
                    {linkSlot ? (
                        <>
                            <div role="separator" aria-orientation="vertical" className="mx-1 h-6 border-l border-slate-300" />
                            {linkSlot}
                        </>
                    ) : null}
                    <div className="ml-auto flex items-center gap-2">
                        {searchVisible ? (
                            <div ref={searchContainerRef}>
                                <TextBox
                                    width={260}
                                    mode="search"
                                    stylingMode="outlined"
                                    value={searchText}
                                    showClearButton={true}
                                    placeholder={t("Search detail...", "Tìm chi tiết...")}
                                    onValueChanged={(event) => handleSearchTextChange(String(event.value ?? ""))}
                                    onEnterKey={handleSearchEnter}
                                />
                            </div>
                        ) : null}
                        <Button
                            stylingMode="text"
                            icon="search"
                            hint={t("Search detail", "Tìm chi tiết")}
                            onClick={showSearch}
                        />
                    </div>
                </div>

                <div
                    ref={containerRef}
                    className={`min-h-0 flex-1 ${VOUCHER_SPREADSHEET_GRID_CLASS}`}
                >
                    <DataGrid<ChitDetail, string>
                        loadPanel={{ enabled: false }}
                        dataSource={visibleDetails}
                        keyExpr="ROW_KEY"
                        width="100%"
                        height={resolvedDataGridHeight}
                        showBorders
                        columnAutoWidth={false}
                        rowAlternationEnabled
                        allowColumnResizing
                        allowColumnReordering
                        wordWrapEnabled={false}
                        focusedRowEnabled
                        paging={{ enabled: false }}
                        keyboardNavigation={voucherSpreadsheetKeyboardNavigation}
                        onInitialized={handleInitialized}
                        onContentReady={handleContentReady}
                        onDisposing={handleDisposing}
                        onToolbarPreparing={handleToolbarPreparing}
                        onCellClick={handleCellClick}
                        onCellPrepared={handleCellPrepared}
                        onFocusedCellChanged={handleFocusedCellChanged}
                        onSaved={handleSaved}
                        onKeyDown={handleKeyDown}
                        onContextMenuPreparing={handleContextMenuPreparing}
                        onInitNewRow={(event) => {
                            const nextRow = createDefaultChitDetail(visibleDetails.length + 1, companyCd)
                            Object.assign(event.data, nextRow)
                            currentRowKeyRef.current = nextRow.ROW_KEY
                        }}
                    >
                        <ColumnFixing enabled={true} />
                        <Scrolling
                            mode="standard"
                            useNative={false}
                            showScrollbar="always"
                            scrollByContent={true}
                            scrollByThumb={true}
                        />
                        <Editing
                            mode="batch"
                            allowAdding={!readOnly}
                            allowUpdating={!readOnly}
                            allowDeleting={false}
                            confirmDelete={false}
                            startEditAction="click"
                            selectTextOnEditStart={true}
                            newRowPosition="last"
                        />
                        <Column
                            name="STT"
                            caption={t("STT", "No")}
                            width={70}
                            dataType="number"
                            fixed={true}
                            fixedPosition="left"
                            allowEditing={false}
                            allowHiding={false}
                            allowSorting={false}
                            allowFiltering={false}
                            allowReordering={false}
                            showInColumnChooser={false}
                            visibleIndex={0}
                            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
                            calculateCellValue={(row: ChitDetail) => {
                                const index = visibleDetails.findIndex((item) => item.ROW_KEY === row.ROW_KEY)
                                return index >= 0 ? index + 1 : null
                            }}
                        />
                        {showDetailActionsColumn ? (
                            <Column
                                name="DETAIL_ACTIONS"
                                width={detailActionsColumnWidth}
                                fixed={true}
                                fixedPosition="left"
                                visibleIndex={1}
                                allowFixing={false}
                                allowEditing={false}
                                allowReordering={false}
                                showInColumnChooser={false}
                                cellRender={(cellInfo: ColumnCellTemplateData<ChitDetail, string>) => {
                                    const rowKey = resolveChitDetailRowKey(cellInfo.row?.key, cellInfo.data)
                                    const detailId = Number(cellInfo.data?.CHITDETAIL_ID ?? 0)
                                    const pendingDeleteIdSet = new Set(pendingInventoryDeleteChitIds)
                                    const linkedTargets = (
                                        showInventoryLinkActions && detailId > 0
                                            ? linkedInventoryByDetailIdRef.current[detailId] ?? []
                                            : []
                                    ).filter((item) => !pendingDeleteIdSet.has(item.chitId))
                                    const inventoryPending =
                                        pendingInventoryRowKeys.includes(rowKey ?? "")
                                        || pendingInventoryDeleteRowKeys.includes(rowKey ?? "")
                                    void linkedInventoryVersion

                                    const resolvedRowKey = rowKey ?? ""
                                    const vatHasData = resolvedRowKey ? Boolean(hasVatDataForRow?.(resolvedRowKey)) : false
                                    const vatActive = resolvedRowKey ? Boolean(isVatActiveForRow?.(resolvedRowKey)) : false
                                    const inventoryDisabled =
                                        inventoryBusy
                                        || (detailId > 0 && (linkLoading || (!linkLoadFailed && linkedInventoryLoadKeyRef.current !== `${chitType}:${headerChitId}:${activeDetailIdsKey}:${inventoryRefreshVersion}:${linkRetryVersion}`)))
                                        || (readOnly && linkedTargets.length === 0 && !linkLoadFailed && !inventoryPending)
                                    const inventoryHint = linkLoadFailed
                                        ? t("RETRY_INVENTORY_LINK", "Không tải được liên kết kho. Bấm để thử lại")
                                        : inventoryPending
                                          ? t("INVENTORY_PENDING_SOURCE_SAVE", "Bản nháp phiếu kho — lưu phiếu nguồn để hoàn tất liên kết")
                                          : linkedTargets.length > 0
                                            ? t("OPEN_INVENTORY_VOUCHER", "Mở phiếu hàng tồn kho đã liên kết")
                                            : t("ENTER_INVENTORY_VOUCHER", "Nhập phiếu hàng tồn kho")

                                    return (
                                        <div className="flex h-full w-full items-center justify-center gap-0.5">
                                            {cellInfo.data && renderDetailLink ? renderDetailLink(cellInfo.data) : null}
                                            {showInventoryLinkActions || showVatActions ? (
                                                <VoucherDetailActions
                                                    rowKey={resolvedRowKey}
                                                    showInventoryButton={showInventoryLinkActions}
                                                    hasVatData={vatHasData}
                                                    isVatActive={vatActive}
                                                    inventoryLabel={t("INVENTORY", "Kho")}
                                                    inventoryHint={inventoryHint}
                                                    vatLabel={t("VAT", "VAT")}
                                                    vatHint={vatActive
                                                        ? t("VAT_CLOSE_PANEL", "Đóng thông tin VAT")
                                                        : vatHasData
                                                          ? t("VAT_EDIT_INFO", "Sửa thông tin VAT")
                                                          : t("VAT_ENTER_INFO", "Nhập thông tin VAT")}
                                                    inventoryPending={inventoryPending}
                                                    inventoryDisabled={inventoryDisabled}
                                                    inventoryTargets={linkedTargets}
                                                    vatDisabled={!resolvedRowKey || !cellInfo.data}
                                                    onInventoryClick={(target) => {
                                                        if (detailId > 0 && linkLoadFailed) {
                                                            setLinkRetryVersion((version) => version + 1)
                                                            return
                                                        }
                                                        if (cellInfo.data && onOpenInventory) void onOpenInventory(cellInfo.data, target)
                                                        else if (target) handleOpenLinkedInventory(target)
                                                    }}
                                                    onVatClick={() => {
                                                        if (cellInfo.data && onOpenVat) {
                                                            onOpenVat(cellInfo.data)
                                                        }
                                                    }}
                                                />
                                            ) : null}
                                        </div>
                                    )
                                }}
                            />
                        ) : null}
                        {renderedDetailColumns}
                    </DataGrid>
                </div>

                <VoucherSpreadsheetSummaryBar items={summaryItems} />
            </div>
        )
    })

export default ChitDetailGridPopup
