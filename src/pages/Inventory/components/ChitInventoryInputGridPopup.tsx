import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react"
import { Button } from "devextreme-react"
import DataGrid, { Column, ColumnFixing, Editing, Scrolling } from "devextreme-react/data-grid"
import TextBox from "devextreme-react/text-box"
import dayjs from "dayjs"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
    CellClickEvent,
    ColumnCellTemplateData,
    ColumnEditCellTemplateData,
    InitNewRowEvent,
    InitializedEvent,
    ToolbarPreparingEvent,
    ContentReadyEvent,
    EditorPreparingEvent,
} from "devextreme/ui/data_grid"

import { useGridColumnSettingState, type GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { useInlineGridSearch } from "@/components/datagrid/gridSearch"
import DeleteRowButton from "@/components/datagrid/DeleteRowButton"
import VoucherSpreadsheetSummaryBar from "@/components/datagrid/VoucherSpreadsheetSummaryBar"
import {
    createSpreadsheetContinueRowKeyDownHandler,
    formatSpreadsheetSummaryNumber,
    prepareVoucherSpreadsheetToolbar,
    shouldKeepCurrentRowKeyOnDataSourceChange,
    VOUCHER_SPREADSHEET_GRID_CLASS,
    voucherSpreadsheetKeyboardNavigation,
} from "@/components/datagrid/voucherSpreadsheetGrid"
import { useVoucherSpreadsheetGridLayout } from "@/components/datagrid/useVoucherSpreadsheetGridLayout"
import { useVoucherSpreadsheetAddRow } from "@/components/datagrid/useVoucherSpreadsheetAddRow"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ChitDateValue, InventoryInputLine } from "@/types/voucher"

import ProductLookupCellEditor from "@/components/lookup/InventoryLookupCellEditor"
import WarehouseLookupCellEditor from "@/components/lookup/WarehouseLookupCellEditor"
import UnitLookupCellEditor from "@/components/lookup/UnitLookupCellEditor"
import CurrencyLookupCellEditor from "@/components/lookup/CurrencyLookupCellEditor"
import { LookupGridCellEditor, consumeLookupCellOpen, type LookupOpenMode } from "@/components/lookup/LookupGridCellDisplay"
import { DEFAULT_CURRENCY_CODE, isForeignCurrencyCode } from "@/lib/currency"

export interface ChitInventoryInputGridPopupHandle {
    savePendingChanges: () => Promise<InventoryInputLine[]>
    addRow: () => void
    deleteCurrentRow: () => void
    focusSearch: () => void
    getCurrentRowKey: () => string | null
    getGridInstance: () => dxDataGrid<InventoryInputLine, string> | null
}

interface ChitInventoryInputGridPopupProps {
    companyCd?: string
    chitDetailId?: number | null
    chitDetailCd?: string | null
    detailRowKey?: string | null
    detailAmount?: number | null
    detailLabel?: string
    inventoryYmd?: ChitDateValue
    rows: InventoryInputLine[]
    disabled?: boolean
    onChange: (rows: InventoryInputLine[]) => void
    screenCd?: string
    gridId?: string
    persistColumnSettings?: boolean
    height?: number | string
    isVisible?: boolean
    layoutVersion?: number
    showDetailContext?: boolean
    foreignCurrencyColumnsVisible?: boolean
    columnSettingStateRef?: MutableRefObject<GridColumnSettingState | null>
    /** Rendered after Hoàn tác on the detail toolbar (e.g. accounting link UI). */
    linkSlot?: ReactNode
}

const RUNTIME_COLUMN_SETTING_EXCLUDED_NAMES = ["AMOUNT_CC", "UNIT_PRICE_FC", "EXCHANGE_RATES", "AMOUNT_FC"] as const
const MAX_DETAIL_GRID_HEIGHT = 420

function createRowKey(detailRowKey?: string | null) {
    return `input_${detailRowKey ?? "detail"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

type InputLineCellDisplayInfo = ColumnCellTemplateData<InventoryInputLine, string>
type InputLineCellInfo = ColumnEditCellTemplateData<InventoryInputLine, string>

function cloneInventoryLine(item: InventoryInputLine): InventoryInputLine {
    return { ...item }
}

function getActiveInventoryLines(rows: InventoryInputLine[]): InventoryInputLine[] {
    return rows.filter((item) => !item.ISDEL)
}

function normalizeInventoryLineRows(rows: InventoryInputLine[]): InventoryInputLine[] {
    return rows.map((item) => cloneInventoryLine(item))
}

function toNumber(value: unknown) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

function hasForeignCurrencyInputAmounts(rows: readonly InventoryInputLine[]): boolean {
    return rows.some((row) => (
        isForeignCurrencyCode(row.FC_TYPE) ||
        toNumber(row.UNIT_PRICE_FC) !== 0 ||
        toNumber(row.EXCHANGE_RATES) !== 0 ||
        toNumber(row.AMOUNT_FC) !== 0
    ))
}

function normalizeInputLine(
    row: Partial<InventoryInputLine>,
    options: {
        companyCd?: string
        chitDetailId?: number | null
        chitDetailCd?: string | null
        detailRowKey?: string | null
        inventoryYmd?: ChitDateValue
    },
): InventoryInputLine {
    const quantity = row.QUANTITY == null ? null : toNumber(row.QUANTITY)
    const unitPrice = row.UNIT_PRICE_CC == null ? null : toNumber(row.UNIT_PRICE_CC)
    const amount =
        row.AMOUNT_CC != null
            ? toNumber(row.AMOUNT_CC)
            : quantity != null && unitPrice != null
                ? quantity * unitPrice
                : null

    return {
        ROW_KEY: row.ROW_KEY || createRowKey(options.detailRowKey),
        INPUT_ID: row.INPUT_ID ?? null,
        INPUT_CD: String(row.INPUT_CD ?? ""),
        INVENTORY_ID: row.INVENTORY_ID ?? null,
        INVENTORY_CD: String(row.INVENTORY_CD ?? ""),
        CHIT_TYPE: String(row.CHIT_TYPE ?? ""),
        COMPANY_CD: String(row.COMPANY_CD ?? options.companyCd ?? ""),
        PRODUCT_ID: row.PRODUCT_ID ?? null,
        PRODUCT_CD: String(row.PRODUCT_CD ?? ""),
        PRODUCT_NM_VIET: String(row.PRODUCT_NM_VIET ?? ""),
        PRODUCT_NM_ENG: String(row.PRODUCT_NM_ENG ?? ""),
        PRODUCT_NM_KOR: String(row.PRODUCT_NM_KOR ?? ""),
        PRODUCT_NM_CHINA: String(row.PRODUCT_NM_CHINA ?? ""),
        STORE_ID: row.STORE_ID ?? null,
        STORE_CD: String(row.STORE_CD ?? ""),
        STORE_NM_VIET: String(row.STORE_NM_VIET ?? ""),
        STORE_NM_ENG: String(row.STORE_NM_ENG ?? ""),
        STORE_NM_KOR: String(row.STORE_NM_KOR ?? ""),
        STORE_NM_CHINA: String(row.STORE_NM_CHINA ?? ""),
        UNIT_ID: row.UNIT_ID ?? null,
        UNIT_CD: String(row.UNIT_CD ?? ""),
        UNIT_NM_VIET: String(row.UNIT_NM_VIET ?? ""),
        UNIT_NM_ENG: String(row.UNIT_NM_ENG ?? ""),
        UNIT_NM_KOR: String(row.UNIT_NM_KOR ?? ""),
        UNIT_NM_CHINA: String(row.UNIT_NM_CHINA ?? ""),
        QUANTITY: quantity,
        UNIT_PRICE_CC: unitPrice,
        FC_TYPE: String(row.FC_TYPE ?? DEFAULT_CURRENCY_CODE).trim() || DEFAULT_CURRENCY_CODE,
        UNIT_PRICE_FC: row.UNIT_PRICE_FC == null ? 0 : toNumber(row.UNIT_PRICE_FC),
        EXCHANGE_RATES: row.EXCHANGE_RATES == null ? 0 : toNumber(row.EXCHANGE_RATES),
        AMOUNT_CC: amount,
        AMOUNT_FC: row.AMOUNT_FC == null ? 0 : toNumber(row.AMOUNT_FC),
        SUMMARY: String(row.SUMMARY ?? ""),
        INVENTORY_YMD: row.INVENTORY_YMD ?? options.inventoryYmd ?? dayjs().toISOString(),
        STATE: String(row.STATE ?? "1"),
        CHITDETAIL_ID: row.CHITDETAIL_ID ?? options.chitDetailId ?? null,
        CHITDETAIL_CD: String(row.CHITDETAIL_CD ?? options.chitDetailCd ?? ""),
        SORT: row.SORT ?? null,
        ISDEL: Boolean(row.ISDEL ?? false),
    }
}

function renderLookupCell(dataField: string) {
    return (cellInfo: InputLineCellDisplayInfo) => (
        <LookupGridCellEditor mode="display" cellInfo={cellInfo} dataField={dataField} />
    )
}

function consumeLookupAutoOpen(cellInfo: InputLineCellInfo, dataField: string) {
    return consumeLookupCellOpen(cellInfo, dataField)
}

function renderLookupEditor(children: JSX.Element) {
    return <LookupGridCellEditor mode="edit">{children}</LookupGridCellEditor>
}

export const ChitInventoryInputGridPopup = forwardRef<ChitInventoryInputGridPopupHandle, ChitInventoryInputGridPopupProps>(
    function ChitInventoryInputGridPopup({
        companyCd,
        chitDetailId,
        chitDetailCd,
        detailRowKey,
        detailAmount,
        detailLabel,
        inventoryYmd,
        rows,
        disabled,
        onChange,
        screenCd,
        gridId,
        persistColumnSettings = false,
        height,
        isVisible = true,
        layoutVersion = 0,
        showDetailContext = true,
        foreignCurrencyColumnsVisible = false,
        columnSettingStateRef,
        linkSlot,
    }, ref) {
        const { translate } = useContext(LanguageContext) as {
            translate?: (key: string, fallback?: string) => string
        }
        const { getFormat } = useDecimalColumnFormats()
        const gridRef = useRef<dxDataGrid<InventoryInputLine, string> | null>(null)
        const searchContainerRef = useRef<HTMLDivElement | null>(null)
        const currentRowKeyRef = useRef<string | null>(null)
        const [forceForeignCurrencyColumnsVisible, setForceForeignCurrencyColumnsVisible] = useState(false)
        const usesSysGridCatalog = persistColumnSettings && Boolean(gridId?.trim())
        const columnSettingState = useGridColumnSettingState({
            enabled: persistColumnSettings,
            screenCd,
            gridId,
            excludedColumnNames: RUNTIME_COLUMN_SETTING_EXCLUDED_NAMES,
            hideColumnsMissingFromSettings: usesSysGridCatalog,
        })
        const { searchText, searchVisible, showSearch, handleSearchTextChange, handleSearchEnter } =
            useInlineGridSearch(gridRef)

        const t = useCallback(
            (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
            [translate],
        )

        const renderProductEditor = useCallback(
            (cellInfo: InputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
                <ProductLookupCellEditor
                    value={cellInfo.data?.PRODUCT_ID ?? null}
                    rowData={(cellInfo.data ?? {}) as Record<string, unknown>}
                    rowIndex={cellInfo.row?.rowIndex ?? -1}
                    grid={cellInfo.component}
                    setValue={(productId) => {
                        cellInfo.component.cellValue(cellInfo.row.rowIndex, "PRODUCT_ID", productId)
                    }}
                    productIdField="PRODUCT_ID"
                    productCdField="PRODUCT_CD"
                    productNmField="PRODUCT_NM_VIET"
                    unitIdField="UNIT_ID"
                    unitCdField="UNIT_CD"
                    unitNmField="UNIT_NM_VIET"
                    warehouseIdField="STORE_ID"
                    warehouseNmField="STORE_NM_VIET"
                    placeholder={t("SelectProduct", "Select product")}
                    popupTitle={t("SelectProduct", "Select product")}
                    buttonHint={t("LIST_PRODUCT", "Open product list")}
                    autoOpen={autoOpen}
                />
            ),
            [t],
        )

        const renderStoreEditor = useCallback(
            (cellInfo: InputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
                <WarehouseLookupCellEditor
                    value={cellInfo.data?.STORE_ID ?? null}
                    rowData={(cellInfo.data ?? {}) as Record<string, unknown>}
                    rowIndex={cellInfo.row?.rowIndex ?? -1}
                    grid={cellInfo.component}
                    setValue={(storeId) => {
                        cellInfo.component.cellValue(cellInfo.row.rowIndex, "STORE_ID", storeId)
                    }}
                    warehouseIdField="STORE_ID"
                    warehouseCdField="STORE_CD"
                    warehouseNmField="STORE_NM_VIET"
                    placeholder={t("SelectStore", "Select store")}
                    popupTitle={t("SelectStore", "Select store")}
                    buttonHint={t("LIST_STORE", "Open store list")}
                    autoOpen={autoOpen}
                />
            ),
            [t],
        )

        const renderUnitEditor = useCallback(
            (cellInfo: InputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
                <UnitLookupCellEditor
                    value={cellInfo.data?.UNIT_ID ?? null}
                    rowData={(cellInfo.data ?? {}) as Record<string, unknown>}
                    rowIndex={cellInfo.row?.rowIndex ?? -1}
                    grid={cellInfo.component}
                    setValue={(unitId) => {
                        cellInfo.component.cellValue(cellInfo.row.rowIndex, "UNIT_ID", unitId)
                    }}
                    unitIdField="UNIT_ID"
                    unitCdField="UNIT_CD"
                    unitNmField="UNIT_NM_VIET"
                    placeholder={t("SelectUnit", "Select unit")}
                    popupTitle={t("SelectUnit", "Select unit")}
                    buttonHint={t("LIST_UNIT", "Open unit list")}
                    autoOpen={autoOpen}
                />
            ),
            [t],
        )

        const renderCurrencyEditor = useCallback(
            (cellInfo: InputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
                <CurrencyLookupCellEditor
                    value={cellInfo.data?.FC_TYPE ?? DEFAULT_CURRENCY_CODE}
                    rowData={cellInfo.data ?? {}}
                    rowIndex={cellInfo.row?.rowIndex ?? -1}
                    grid={cellInfo.component}
                    setValue={(currencyCd) => {
                        const nextCurrencyCd = String(currencyCd ?? "").trim() || DEFAULT_CURRENCY_CODE
                        cellInfo.component.cellValue(cellInfo.row.rowIndex, "FC_TYPE", nextCurrencyCd)
                        setForceForeignCurrencyColumnsVisible(isForeignCurrencyCode(nextCurrencyCd))
                    }}
                    currencyCdField="FC_TYPE"
                    currencyCdFieldCaption={t("CURRENCY_CD", "Currency code")}
                    currencyNmFieldCaption={t("CURRENCY_NM", "Currency name")}
                    placeholder={t("CURRENCY_SELECT", "Select currency")}
                    popupTitle={t("CURRENCY_SELECT", "Select currency")}
                    buttonHint={t("CURRENCY_LOOKUP", "Open currency list")}
                    autoOpen={autoOpen}
                />
            ),
            [t],
        )

        const normalizedRows = useMemo(
            () =>
                rows.map((row) =>
                    normalizeInputLine(row, {
                        companyCd,
                        chitDetailId,
                        chitDetailCd,
                        detailRowKey,
                        inventoryYmd,
                    }),
                ),
            [rows, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd],
        )

        const visibleRows = useMemo(() => getActiveInventoryLines(normalizedRows), [normalizedRows])
        const { containerRef, gridHeight, notifyGridContentReady, notifyGridDisposing } = useVoucherSpreadsheetGridLayout({
            gridRef,
            isVisible,
            layoutVersion,
        })
        const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number")
        const runtimeForeignCurrencyColumnsVisible = useMemo(
            () => foreignCurrencyColumnsVisible || forceForeignCurrencyColumnsVisible || hasForeignCurrencyInputAmounts(visibleRows),
            [forceForeignCurrencyColumnsVisible, foreignCurrencyColumnsVisible, visibleRows],
        )
        const softDeletedCount = useMemo(
            () => normalizedRows.reduce((count, item) => count + (item.ISDEL ? 1 : 0), 0),
            [normalizedRows],
        )

        const totalQuantity = useMemo(
            () => normalizedRows.reduce((sum, row) => sum + toNumber(row.QUANTITY), 0),
            [normalizedRows],
        )

        const totalAmount = useMemo(
            () => normalizedRows.reduce((sum, row) => sum + toNumber(row.AMOUNT_CC), 0),
            [normalizedRows],
        )

        const summaryItems = useMemo(() => {
            const items = [
                {
                    key: "rows",
                    label: t("ROW_COUNT", "Rows"),
                    value: formatSpreadsheetSummaryNumber(visibleRows.length),
                },
                {
                    key: "quantity",
                    label: t("lblTotal_quantity", "Total Input Qty"),
                    value: formatSpreadsheetSummaryNumber(totalQuantity, 3),
                },
                {
                    key: "amount",
                    label: t("TOTAL_AMOUNT", "Total Input Amount"),
                    value: formatSpreadsheetSummaryNumber(totalAmount, 2),
                },
            ]

            if (showDetailContext) {
                items.unshift(
                    {
                        key: "detail-line",
                        label: t("DETAIL_LINE", "Detail Line"),
                        value: detailLabel || "-",
                    },
                    {
                        key: "detail-amount",
                        label: t("DETAIL_ROW_AMOUNT", "Detail Amount"),
                        value: formatSpreadsheetSummaryNumber(Number(detailAmount ?? 0), 2),
                    },
                )
            }

            return items
        }, [detailAmount, detailLabel, showDetailContext, t, totalAmount, totalQuantity, visibleRows.length])

        const buildMergedRows = useCallback(() => {
            const source = gridRef.current?.option("dataSource")
            const activeRows = Array.isArray(source)
                ? normalizeInventoryLineRows(source).map((item) => cloneInventoryLine(item))
                : visibleRows.map((item) => cloneInventoryLine(item))
            const activeRowMap = new Map(
                activeRows.map((item) => [item.ROW_KEY, { ...item, ISDEL: false }] as const),
            )
            const mergedRows: InventoryInputLine[] = []

            normalizedRows.forEach((item) => {
                if (item.ISDEL) {
                    mergedRows.push(cloneInventoryLine(item))
                    return
                }

                const activeRow = activeRowMap.get(item.ROW_KEY)
                if (!activeRow) {
                    return
                }

                mergedRows.push(cloneInventoryLine(activeRow))
                activeRowMap.delete(item.ROW_KEY)
            })

            activeRowMap.forEach((item) => {
                mergedRows.push(cloneInventoryLine(item))
            })

            return mergedRows
        }, [normalizedRows, visibleRows])

        const emitRowsChange = useCallback(
            (rows: InventoryInputLine[]) => {
                onChange(rows)
                return rows
            },
            [onChange],
        )

        const syncRows = useCallback(() => emitRowsChange(buildMergedRows()), [buildMergedRows, emitRowsChange])

        const { handleAddRow, handleSaved } = useVoucherSpreadsheetAddRow({
            gridRef,
            syncRows,
            dataSource: visibleRows,
        })

        const focusSearchInput = useCallback(() => {
            const input = searchContainerRef.current?.querySelector("input.dx-texteditor-input, input") as HTMLInputElement | null
            input?.focus()
            input?.select?.()
        }, [])

        const getCurrentRowKey = useCallback(() => {
            const editingRowKey = gridRef.current?.option("editing.editRowKey") as unknown

            if (typeof editingRowKey === "string" && visibleRows.some((item) => item.ROW_KEY === editingRowKey)) {
                return editingRowKey
            }

            const currentRowKey = currentRowKeyRef.current
            if (currentRowKey && visibleRows.some((item) => item.ROW_KEY === currentRowKey)) {
                return currentRowKey
            }

            return visibleRows[visibleRows.length - 1]?.ROW_KEY ?? null
        }, [visibleRows])

        const softDeleteRowByKey = useCallback(
            async (targetKey: string | null) => {
                if (!targetKey) {
                    return
                }

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
                    return cloneInventoryLine({
                        ...item,
                        ISDEL: true,
                    })
                })

                if (!changed) {
                    return
                }

                if (currentRowKeyRef.current === targetKey) {
                    currentRowKeyRef.current = getActiveInventoryLines(nextRows).at(-1)?.ROW_KEY ?? null
                }

                emitRowsChange(nextRows)
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
                        ? cloneInventoryLine({
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

        const handleCellClick = useCallback((event: CellClickEvent<InventoryInputLine, string>) => {
            if (event.rowType !== "data") {
                return
            }

            currentRowKeyRef.current = event.key ?? null
        }, [])

        const handleContinueRow = useCallback(() => {
            void handleAddRow()
        }, [handleAddRow])

        const handleKeyDown = useMemo(
            () => createSpreadsheetContinueRowKeyDownHandler<InventoryInputLine>(handleContinueRow),
            [handleContinueRow],
        )

        useImperativeHandle(
            ref,
            () => ({
                savePendingChanges: async () => {
                    if (gridRef.current?.hasEditData()) {
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
                getCurrentRowKey,
                getGridInstance: () => gridRef.current,
            }),
            [focusSearchInput, getCurrentRowKey, handleAddRow, searchVisible, showSearch, softDeleteRowByKey, syncRows],
        )

        const handleInitialized = useCallback((event: InitializedEvent<InventoryInputLine, string>) => {
            gridRef.current = event.component ?? null
            if (columnSettingState.cachedEditorItems.length) {
                columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
            }
        }, [columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent])

        const handleContentReady = useCallback(
            (_event: ContentReadyEvent<InventoryInputLine, string>) => {
                notifyGridContentReady()
            },
            [notifyGridContentReady],
        )

        const handleDisposing = useCallback(() => {
            notifyGridDisposing()
        }, [notifyGridDisposing])

        useEffect(() => {
            if (!isVisible) {
                setForceForeignCurrencyColumnsVisible(false)
                return
            }

            const currentRowKey = currentRowKeyRef.current
            const visibleRowKeys = visibleRows.map((item) => item.ROW_KEY)
            if (shouldKeepCurrentRowKeyOnDataSourceChange(gridRef.current, currentRowKey, visibleRowKeys)) {
                return
            }

            currentRowKeyRef.current = visibleRows[0]?.ROW_KEY ?? null
        }, [isVisible, visibleRows])

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

        const handleInitNewRow = useCallback(
            (e: InitNewRowEvent<InventoryInputLine>) => {
                const nextRow = normalizeInputLine(
                    { SORT: normalizedRows.length + 1 },
                    { companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd },
                )

                Object.assign(e.data, nextRow)
                currentRowKeyRef.current = nextRow.ROW_KEY
            },
            [normalizedRows.length, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd],
        )

        const rootStyle = height !== undefined ? { height } : { height: MAX_DETAIL_GRID_HEIGHT }

        const handleToolbarPreparing = useCallback((e: ToolbarPreparingEvent<InventoryInputLine, string>) => {
            prepareVoucherSpreadsheetToolbar(e)
        }, [])

        if (columnSettingStateRef) {
            columnSettingStateRef.current = columnSettingState
        }

        const setInputQuantity = useCallback((newData: Partial<InventoryInputLine>, value: number | null, current: InventoryInputLine) => {
            newData.QUANTITY = value
            newData.AMOUNT_CC = value === null || current.UNIT_PRICE_CC === null ? null : value * current.UNIT_PRICE_CC
        }, [])

        const setInputUnitPrice = useCallback((newData: Partial<InventoryInputLine>, value: number | null, current: InventoryInputLine) => {
            newData.UNIT_PRICE_CC = value
            newData.AMOUNT_CC = value === null || current.QUANTITY === null ? null : current.QUANTITY * value
        }, [])

        const handleEditorPreparing = useCallback((event: EditorPreparingEvent<InventoryInputLine, string>) => {
            if (event.parentType === "dataRow" && (event.dataField === "QUANTITY" || event.dataField === "UNIT_PRICE_CC")) {
                event.editorOptions = { ...event.editorOptions, valueChangeEvent: "input change" }
            }
        }, [])

        const detailColumns = useMemo(() => (
                <>
                    <Column dataField="INPUT_ID" caption={t("INPUT_ID", "Input ID")} />
                    <Column dataField="INPUT_CD" caption={t("INPUT_CD", "Input Code")} />
                    <Column dataField="INVENTORY_CD" caption={t("SOURCE_CODE", "Source Code")} allowEditing={false} />
                    <Column dataField="PRODUCT_ID" caption={t("PRODUCT_ID", "Product ID")} />
                    <Column
                        dataField="PRODUCT_CD"
                        caption={t("lblPRODUCT_CD", "Product Code")}
                        cssClass="am-grid-lookup-column-cell"
                        cellRender={renderLookupCell("PRODUCT_CD")}
                        editCellRender={(cellInfo: InputLineCellInfo) =>
                            renderLookupEditor(renderProductEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "PRODUCT_CD")))
                        }
                    />
                    <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM", "Product Name")} allowEditing={false} />
                    <Column dataField="STORE_ID" caption={t("STORE_ID", "Store ID")} />
                    <Column
                        dataField="STORE_CD"
                        caption={t("STORE_CD", "Store Code")}
                        cssClass="am-grid-lookup-column-cell"
                        cellRender={renderLookupCell("STORE_CD")}
                        editCellRender={(cellInfo: InputLineCellInfo) =>
                            renderLookupEditor(renderStoreEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "STORE_CD")))
                        }
                    />
                    <Column dataField="STORE_NM_VIET" caption={t("STORE_NM", "Store Name")} allowEditing={false} />
                    <Column dataField="UNIT_ID" caption={t("UNIT_ID", "Unit ID")} />
                    <Column
                        dataField="UNIT_CD"
                        caption={t("UNIT_CD", "Unit Code")}
                        cssClass="am-grid-lookup-column-cell"
                        cellRender={renderLookupCell("UNIT_CD")}
                        editCellRender={(cellInfo: InputLineCellInfo) =>
                            renderLookupEditor(renderUnitEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "UNIT_CD")))
                        }
                    />
                    <Column dataField="QUANTITY" setCellValue={setInputQuantity} caption={t("QUANTITY", "Quantity")} dataType="number" format={getFormat("QUANTITY", "#,##0.###")} editorOptions={createNumberEditorOptions(getFormat("QUANTITY", "#,##0.###"))} />
                    <Column dataField="UNIT_PRICE_CC" setCellValue={setInputUnitPrice} caption={t("UNIT_PRICE_CC", "Unit Price")} dataType="number" format={getFormat("UNIT_PRICE_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_CC", "#,##0.00"))} />
                    <Column dataField="AMOUNT_CC" caption={t("AMOUNT_CC", "Amount")} dataType="number" format={getFormat("AMOUNT_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_CC", "#,##0.00"))} allowHiding={false} />
                    <Column
                        dataField="FC_TYPE"
                        caption={t("FC_TYPE", "Currency")}
                        cssClass="am-grid-lookup-column-cell"
                        cellRender={renderLookupCell("FC_TYPE")}
                        editCellRender={(cellInfo: InputLineCellInfo) =>
                            renderLookupEditor(renderCurrencyEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "FC_TYPE")))
                        }
                    />
                    <Column dataField="UNIT_PRICE_FC" caption={t("UNIT_PRICE_FC", "Unit Price FC")} dataType="number" format={getFormat("UNIT_PRICE_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_FC", "#,##0.00"))} visible={runtimeForeignCurrencyColumnsVisible} />
                    <Column dataField="EXCHANGE_RATES" caption={t("FC_RATE", "Exchange rate")} dataType="number" format={getFormat("EXCHANGE_RATES", "#,##0.000000")} editorOptions={createNumberEditorOptions(getFormat("EXCHANGE_RATES", "#,##0.000000"))} visible={runtimeForeignCurrencyColumnsVisible} />
                    <Column dataField="AMOUNT_FC" caption={t("AMOUNT_FC", "Amount FC")} dataType="number" format={getFormat("AMOUNT_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_FC", "#,##0.00"))} visible={runtimeForeignCurrencyColumnsVisible} />
                    <Column dataField="INVENTORY_YMD" caption={t("INVENTORY_YMD", "Inventory Date")} />
                    <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
                </>
        ), [
            getFormat,
            renderCurrencyEditor,
            renderLookupCell,
            renderLookupEditor,
            renderProductEditor,
            renderStoreEditor,
            renderUnitEditor,
            runtimeForeignCurrencyColumnsVisible,
            setInputQuantity,
            setInputUnitPrice,
            t,
        ])

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

                        {linkSlot ? <div className="flex min-w-0 flex-wrap items-center gap-2">{linkSlot}</div> : null}

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
                        <DataGrid<InventoryInputLine, string>
                            loadPanel={{ enabled: false }}
                            dataSource={visibleRows}
                            keyExpr="ROW_KEY"
                            width="100%"
                            height={gridHeight}
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
                            onCellClick={handleCellClick}
                            onSaved={handleSaved}
                            onToolbarPreparing={handleToolbarPreparing}
                            onInitNewRow={handleInitNewRow}
                            onEditorPreparing={handleEditorPreparing}
                            onKeyDown={handleKeyDown}
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
                                allowAdding={!disabled}
                                allowUpdating={!disabled}
                                allowDeleting={false}
                                confirmDelete={false}
                                startEditAction="click"
                                selectTextOnEditStart={true}
                                newRowPosition="last"
                            />

                    <Column
                        name="DETAIL_ACTIONS"
                        width={60}
                        fixed={true}
                        fixedPosition="left"
                        visibleIndex={0}
                        allowFixing={false}
                        showInColumnChooser={false}
                        allowReordering={false}
                        cellRender={(cellInfo: ColumnCellTemplateData<InventoryInputLine, string>) => {
                            const rowKey = typeof cellInfo.row?.key === "string" ? cellInfo.row.key : null
                            return (
                                <DeleteRowButton
                                    hint={t("DELETE", "Delete")}
                                    onDelete={() => { if (rowKey) void softDeleteRowByKey(rowKey) }}
                                />
                            )
                        }}
                    />

                    {detailColumns}
                </DataGrid>
            </div>

            <VoucherSpreadsheetSummaryBar items={summaryItems} />
        </div>
        )
    })

export default ChitInventoryInputGridPopup
