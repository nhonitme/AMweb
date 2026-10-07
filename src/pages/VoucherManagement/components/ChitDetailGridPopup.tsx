import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentType, type MutableRefObject, type MouseEvent as ReactMouseEvent, type PointerEvent as ReactPointerEvent } from "react"
import { Button } from "devextreme-react"
import DataGrid, { Column, Editing, ColumnFixing, Scrolling } from "devextreme-react/data-grid"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
    CellClickEvent,
    CellPreparedEvent,
    ColumnCellTemplateData,
    ContentReadyEvent,
    FocusedCellChangedEvent,
    InitializedEvent,
    ToolbarPreparingEvent,
} from "devextreme/ui/data_grid"
import { useNavigate } from "react-router-dom"

import DeleteRowButton from "@/components/datagrid/DeleteRowButton"
import { LanguageContext } from "@/lib/i18nLoader"
import { useGridColumnSettingState, type GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { useInlineGridSearch } from "@/components/datagrid/gridSearch"
import VoucherSpreadsheetSummaryBar from "@/components/datagrid/VoucherSpreadsheetSummaryBar"
import {
    createSpreadsheetContinueRowKeyDownHandler,
    formatSpreadsheetSummaryNumber,
    prepareVoucherSpreadsheetToolbar,
    shouldKeepCurrentRowKeyOnDataSourceChange,
    VOUCHER_SPREADSHEET_GRID_CLASS,
    voucherSpreadsheetKeyboardNavigation,
} from "@/components/datagrid/voucherSpreadsheetGrid"
import {
    useVoucherSpreadsheetGridLayout,
} from "@/components/datagrid/useVoucherSpreadsheetGridLayout"
import { useVoucherSpreadsheetAddRow } from "@/components/datagrid/useVoucherSpreadsheetAddRow"
import { isForeignCurrencyCode } from "@/lib/currency"
import { getInventoryInputs, getInventoryOutputs } from "@/api/inventoryLinkApi"
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

export interface ChitDetailGridHandle {
    savePendingChanges: () => Promise<ChitDetail[]>
    addRow: () => void
    deleteCurrentRow: () => void
    focusSearch: () => void
    focusDetailRow: (rowKey: string, focusField?: ChitDetailAccountField) => Promise<void>
    setRowValidationWarnings: (warnings: ChitDetailRowValidationWarnings) => void
    clearRowValidationWarnings: () => void
    getCurrentRowKey: () => string | null
    getGridInstance: () => dxDataGrid<ChitDetail, string> | null
}

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
    screenCd?: string
    gridId?: string
    persistColumnSettings?: boolean
    columnSettingStateRef?: MutableRefObject<GridColumnSettingState | null>
}

const RUNTIME_COLUMN_SETTING_EXCLUDED_NAMES = ["FC_AMOUNT", "FC_RATE"] as const
const MAX_DETAIL_GRID_HEIGHT = 420
const LINK_ACTION_SLOT_CLASS = "inline-flex h-7 w-7 shrink-0 items-center justify-center"

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

function stopActionEvent(event: ReactMouseEvent<HTMLElement> | ReactPointerEvent<HTMLElement>) {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent.stopImmediatePropagation()
}

function OpenLinkedInventoryButton({
    targets,
    hint,
    onOpen,
}: {
    targets: LinkedInventoryTarget[]
    hint: string
    onOpen: (target: LinkedInventoryTarget) => void
}) {
    if (targets.length === 0) {
        return <span className={LINK_ACTION_SLOT_CLASS} aria-hidden />
    }

    if (targets.length === 1) {
        return (
            <button
                type="button"
                title={hint}
                onPointerDownCapture={stopActionEvent}
                onMouseDownCapture={stopActionEvent}
                onClick={(event) => {
                    stopActionEvent(event)
                    onOpen(targets[0])
                }}
                className={`${LINK_ACTION_SLOT_CLASS} rounded text-gray-500 transition-colors hover:bg-sky-50 hover:text-sky-600`}
            >
                <span className="dx-icon dx-icon-link" />
            </button>
        )
    }

    return (
        <label className={`relative ${LINK_ACTION_SLOT_CLASS}`} title={hint}>
            <span className="pointer-events-none absolute inset-0 flex items-center justify-center text-gray-500">
                <span className="dx-icon dx-icon-link" />
            </span>
            <select
                className="h-7 w-7 cursor-pointer appearance-none opacity-0"
                value=""
                aria-label={hint}
                onPointerDownCapture={stopActionEvent}
                onMouseDownCapture={stopActionEvent}
                onClick={stopActionEvent}
                onChange={(event) => {
                    const chitId = Number(event.target.value)
                    const target = targets.find((item) => item.chitId === chitId)
                    event.target.value = ""
                    if (target) {
                        onOpen(target)
                    }
                }}
            >
                <option value="" disabled>
                    {hint}
                </option>
                {targets.map((target) => (
                    <option key={target.chitId} value={target.chitId}>
                        {target.chitNo
                            ? `${target.chitType} · ${target.chitNo}`
                            : `${target.chitType} · ${target.chitId}`}
                    </option>
                ))}
            </select>
        </label>
    )
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
            screenCd,
            gridId,
            persistColumnSettings = false,
            columnSettingStateRef,
        },
        ref,
    ) {
        const navigate = useNavigate()
        const gridRef = useRef<dxDataGrid<ChitDetail, string> | null>(null)
        const searchContainerRef = useRef<HTMLDivElement | null>(null)
        const currentRowKeyRef = useRef<string | null>(null)
        const deleteFlowRef = useRef(false)
        const linkedInventoryByDetailIdRef = useRef<Record<number, LinkedInventoryTarget[]>>({})
        const linkedInventoryLoadKeyRef = useRef("")
        const linkedInventoryInFlightKeyRef = useRef("")
        const contentReadyHandledRef = useRef(false)
        const [linkedInventoryVersion, setLinkedInventoryVersion] = useState(0)
        const [forceForeignCurrencyColumnsVisible, setForceForeignCurrencyColumnsVisible] = useState(false)
        const [rowValidationWarnings, setRowValidationWarnings] = useState<ChitDetailRowValidationWarnings>({})
        const { translate } = useContext(LanguageContext) as {
            translate?: (key: string, fallback?: string) => string
        }
        const { searchText, searchVisible, showSearch, handleSearchTextChange, handleSearchEnter } =
            useInlineGridSearch(gridRef)
        const usesSysGridCatalog = persistColumnSettings && Boolean(gridId?.trim())
        const columnSettingState = useGridColumnSettingState({
            enabled: persistColumnSettings,
            screenCd,
            gridId,
            excludedColumnNames: RUNTIME_COLUMN_SETTING_EXCLUDED_NAMES,
            hideColumnsMissingFromSettings: usesSysGridCatalog,
        })
        const t = useCallback(
            (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
            [translate],
        )
        const visibleDetails = useMemo(() => getActiveChitDetails(details), [details])
        const showInventoryLinkActions = isInventoryLinkedAccountingVoucherType(chitType)
        const detailActionsColumnWidth = showInventoryLinkActions ? 96 : 60
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
        const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number")
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
                return
            }

            const loadKey = `${chitType}:${headerChitId}:${activeDetailIdsKey}`
            if (linkedInventoryLoadKeyRef.current === loadKey) {
                return
            }

            if (linkedInventoryInFlightKeyRef.current === loadKey) {
                return
            }

            linkedInventoryInFlightKeyRef.current = loadKey
            const detailIds = activeDetailIdsKey
                .split(",")
                .map((value) => Number(value))
                .filter((id) => id > 0)

            let cancelled = false

            void (async () => {
                try {
                    const lines = isInventoryInputLinkedAccountingVoucherType(chitType)
                        ? await getInventoryInputs(detailIds)
                        : isInventoryOutputLinkedAccountingVoucherType(chitType)
                          ? await getInventoryOutputs(detailIds)
                          : []
                    if (cancelled) {
                        return
                    }

                    const nextMap = buildLinkedInventoryByDetailId(lines)
                    linkedInventoryLoadKeyRef.current = loadKey
                    linkedInventoryInFlightKeyRef.current = ""
                    if (areLinkedInventoryMapsEqual(linkedInventoryByDetailIdRef.current, nextMap)) {
                        return
                    }

                    linkedInventoryByDetailIdRef.current = nextMap
                    // Spacer keeps layout stable; one light re-render only paints link icons.
                    setLinkedInventoryVersion((current) => current + 1)
                } catch (error) {
                    console.error("Load linked inventory vouchers failed", error)
                    if (!cancelled) {
                        linkedInventoryInFlightKeyRef.current = ""
                    }
                }
            })()

            return () => {
                cancelled = true
                if (linkedInventoryInFlightKeyRef.current === loadKey) {
                    linkedInventoryInFlightKeyRef.current = ""
                }
            }
        }, [activeDetailIdsKey, chitType, headerChitId, isVisible, showInventoryLinkActions])

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
            const activeRows = Array.isArray(source)
                ? normalizeChitDetailGridRows(source as ChitDetail[])
                : visibleDetails.map((item) => cloneChitDetail(item))
            const activeRowMap = new Map(
                activeRows.map((item) => [item.ROW_KEY, { ...item, ISDEL: false }] as const),
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

        const { handleAddRow, handleSaved } = useVoucherSpreadsheetAddRow({
            gridRef,
            syncRows,
            dataSource: visibleDetails,
            shouldSkipSavedSync: () => deleteFlowRef.current,
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
                />
            )
        }, [
            ChitDetailColumns,
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
                if (!targetKey) {
                    return
                }

                deleteFlowRef.current = true

                try {
                    if (gridRef.current?.hasEditData()) {
                        await gridRef.current.saveEditData()
                    }

                    const currentRows = buildMergedRows()
                    let changed = false
                    const nextRows = currentRows.map((item) => {
                        if (item.ROW_KEY !== targetKey || item.ISDEL) {
                            return item
                        }

                        changed = true
                        return cloneChitDetail({
                            ...item,
                            ISDEL: true,
                        })
                    })

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
            [buildMergedRows, emitRowsChange],
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

        const handleFocusedCellChanged = useCallback((event: FocusedCellChangedEvent<ChitDetail, string>) => {
            if (event.prevRowIndex < 0) {
                return
            }

            const previousRow = event.component.getVisibleRows().find((row) => row.rowIndex === event.prevRowIndex)
            if (previousRow?.rowType === "data" && previousRow.data) {
                applySoftValidationForRow(previousRow.data)
            }
        }, [applySoftValidationForRow])

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
                deleteCurrentRow: () => {
                    void softDeleteRowByKey(getCurrentRowKey())
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
            [focusDetailRow, focusSearchInput, getCurrentRowKey, handleAddRow, searchVisible, showSearch, softDeleteRowByKey, syncRows],
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

        useEffect(() => {
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
            <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-lg border border-gray-200 bg-white" style={rootStyle}>
                <div className="flex flex-shrink-0 flex-wrap items-center gap-2 border-b border-slate-200 bg-white px-3 py-2">
                    <Button
                        stylingMode="contained"
                        icon="plus"
                        hint={t("ADD_ROW", "Add row")}
                        onClick={() => {
                            void handleAddRow()
                        }}
                    />
                    <Button
                        stylingMode="outlined"
                        text={t("Undelete", "Hoàn tác")}
                        hint={t("RESTORE_LAST_DELETED_ROW", "Restore the last deleted row")}
                        disabled={softDeletedCount === 0}
                        onClick={() => {
                            void undeleteLastRow()
                        }}
                    />
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
                        columnAutoWidth={!hasConfiguredColumnWidths}
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
                            name="DETAIL_ACTIONS"
                            width={detailActionsColumnWidth}
                            fixed={true}
                            fixedPosition="left"
                            visibleIndex={0}
                            allowFixing={false}
                            allowEditing={false}
                            allowReordering={false}
                            showInColumnChooser={false}
                            cellRender={(cellInfo: ColumnCellTemplateData<ChitDetail, string>) => {
                                const rowKey = resolveChitDetailRowKey(cellInfo.row?.key, cellInfo.data)
                                const detailId = Number(cellInfo.data?.CHITDETAIL_ID ?? 0)
                                const linkedTargets =
                                    showInventoryLinkActions && detailId > 0
                                        ? linkedInventoryByDetailIdRef.current[detailId] ?? []
                                        : []
                                void linkedInventoryVersion

                                return (
                                    <div className="flex h-full w-full items-center justify-center gap-0.5">
                                        {showInventoryLinkActions ? (
                                            <OpenLinkedInventoryButton
                                                targets={linkedTargets}
                                                hint={t("OPEN_INVENTORY_VOUCHER", "Mở phiếu kho")}
                                                onOpen={handleOpenLinkedInventory}
                                            />
                                        ) : null}
                                        <div className="shrink-0 [&_>div]:!w-auto">
                                            <DeleteRowButton
                                                hint={t("DELETE", "Delete")}
                                                onDelete={() => {
                                                    if (rowKey) {
                                                        void softDeleteRowByKey(rowKey)
                                                    }
                                                }}
                                            />
                                        </div>
                                    </div>
                                )
                            }}
                        />
                        {renderedDetailColumns}
                    </DataGrid>
                </div>

                <VoucherSpreadsheetSummaryBar items={summaryItems} />
            </div>
        )
    })

export default ChitDetailGridPopup
