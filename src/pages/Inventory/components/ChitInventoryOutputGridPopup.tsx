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
    EditorPreparingEvent,
    FocusedCellChangedEvent,
    InitNewRowEvent,
    InitializedEvent,
    ToolbarPreparingEvent,
    ContentReadyEvent,
} from "devextreme/ui/data_grid"

import { createDateTimeBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { useInlineGridSearch } from "@/components/datagrid/gridSearch"
import { useGridColumnSettingState, type GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
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

import ProductLookupCellEditor from "@/components/lookup/InventoryLookupCellEditor"
import WarehouseLookupCellEditor from "@/components/lookup/WarehouseLookupCellEditor"
import UnitLookupCellEditor from "@/components/lookup/UnitLookupCellEditor"
import CurrencyLookupCellEditor from "@/components/lookup/CurrencyLookupCellEditor"
import { LookupGridCellEditor, consumeLookupCellOpen, type LookupOpenMode } from "@/components/lookup/LookupGridCellDisplay"
import { LanguageContext } from "@/lib/i18nLoader"
import { DEFAULT_CURRENCY_CODE, isForeignCurrencyCode } from "@/lib/currency"
import type { ChitDateValue, InventoryOutputLine } from "@/types/voucher"

export interface ChitInventoryOutputGridPopupHandle {
    savePendingChanges: () => Promise<InventoryOutputLine[]>
    addRow: () => void
    deleteCurrentRow: () => void
    focusSearch: () => void
    getCurrentRowKey: () => string | null
    getGridInstance: () => dxDataGrid<InventoryOutputLine, string> | null
}

interface ChitInventoryOutputGridPopupProps {
    companyCd?: string
    chitDetailId?: number | null
    chitDetailCd?: string | null
    detailRowKey?: string | null
    detailAmount?: number | null
    detailLabel?: string
    inventoryYmd?: ChitDateValue
    rows: InventoryOutputLine[]
    disabled?: boolean
    onChange: (rows: InventoryOutputLine[]) => void
    screenCd?: string
    gridId?: string
    persistColumnSettings?: boolean
    height?: number | string
    isVisible?: boolean
    layoutVersion?: number
    showDetailContext?: boolean
    foreignCurrencyColumnsVisible?: boolean
    adjustmentMode?: boolean
    columnSettingStateRef?: MutableRefObject<GridColumnSettingState | null>
    /** Rendered after Hoàn tác on the detail toolbar (e.g. accounting link UI). */
    linkSlot?: ReactNode
    beforeGridSlot?: ReactNode
    alternateContent?: ReactNode
}

const RUNTIME_COLUMN_SETTING_EXCLUDED_NAMES = ["UNIT_PRICE_FC", "EXCHANGE_RATES", "AMOUNT_FC"] as const
const MAX_DETAIL_GRID_HEIGHT = 420

function createRowKey(detailRowKey?: string | null) {
    return `output_${detailRowKey ?? "detail"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function toNumber(value: unknown) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
}

const INVENTORY_DATE_FIELDS = ["INVENTORY_YMD", "INPUT_INVENTORY_YMD", "OUTPUT_INVENTORY_YMD"] as const
const DATE_EDITOR_INPUT_SELECTOR = ".dx-datebox input.dx-texteditor-input, input.dx-texteditor-input"

type InventoryDateField = (typeof INVENTORY_DATE_FIELDS)[number]

function isInventoryDateColumn(field?: string | number | symbol): field is InventoryDateField {
    return typeof field === "string" && INVENTORY_DATE_FIELDS.includes(field as InventoryDateField)
}

function createInventoryDateTimeEditorOptions() {
    return createDateTimeBoxEditorOptions({
        inputAttr: { tabIndex: 0 },
    })
}

function resolveHtmlElement(element: unknown): HTMLElement | null {
    if (element instanceof HTMLElement) {
        return element
    }

    if (element && typeof element === "object" && "get" in element) {
        const getter = (element as { get: (index: number) => unknown }).get
        const nativeElement = getter.call(element, 0)
        return nativeElement instanceof HTMLElement ? nativeElement : null
    }

    return null
}

function focusGridDateEditor(
    component: dxDataGrid<InventoryOutputLine, string>,
    rowIndex: number,
    columnIndex: number,
    onComplete: () => void,
) {
    requestAnimationFrame(() => {
        try {
            component.editCell(rowIndex, columnIndex)
        } catch {
            onComplete()
            return
        }

        requestAnimationFrame(() => {
            try {
                const cellElement = resolveHtmlElement(component.getCellElement(rowIndex, columnIndex))
                const inputElement = cellElement?.querySelector<HTMLInputElement>(DATE_EDITOR_INPUT_SELECTOR) ?? null
                inputElement?.focus()
                inputElement?.select()
            } finally {
                onComplete()
            }
        })
    })
}

function hasForeignCurrencyOutputAmounts(rows: readonly InventoryOutputLine[]): boolean {
    return rows.some((row) => (
        isForeignCurrencyCode(row.FC_TYPE) ||
        toNumber(row.UNIT_PRICE_FC) !== 0 ||
        toNumber(row.EXCHANGE_RATES) !== 0 ||
        toNumber(row.AMOUNT_FC) !== 0
    ))
}

function normalizeOutputLine(
    row: Partial<InventoryOutputLine>,
    options: {
        companyCd?: string
        chitDetailId?: number | null
        chitDetailCd?: string | null
        detailRowKey?: string | null
        inventoryYmd?: ChitDateValue
    },
): InventoryOutputLine {
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
        OUTPUT_ID: row.OUTPUT_ID ?? null,
        COGS_DEBIT: row.COGS_DEBIT,
        COGS_CREDIT: row.COGS_CREDIT,
        OUTPUT_CD: String(row.OUTPUT_CD ?? ""),
        CHIT_ID: row.CHIT_ID ?? null,
        CHIT_CD: String(row.CHIT_CD ?? ""),
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
        TO_STORE_ID: row.TO_STORE_ID ?? null,
        TO_STORE_CD: String(row.TO_STORE_CD ?? ""),
        TO_STORE_NM_VIET: String(row.TO_STORE_NM_VIET ?? ""),
        TO_STORE_NM_ENG: String(row.TO_STORE_NM_ENG ?? ""),
        TO_STORE_NM_KOR: String(row.TO_STORE_NM_KOR ?? ""),
        TO_STORE_NM_CHINA: String(row.TO_STORE_NM_CHINA ?? ""),
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
        INPUT_INVENTORY_YMD: row.INPUT_INVENTORY_YMD ?? options.inventoryYmd ?? dayjs().toISOString(),
        OUTPUT_INVENTORY_YMD: row.OUTPUT_INVENTORY_YMD ?? row.INVENTORY_YMD ?? options.inventoryYmd ?? dayjs().toISOString(),
        STATE: String(row.STATE ?? "1"),
        CHITDETAIL_ID: row.CHITDETAIL_ID ?? null,
        CHITDETAIL_CD: String(row.CHITDETAIL_CD ?? ""),
        SORT: row.SORT ?? null,
        ISDEL: Boolean(row.ISDEL ?? false),
    }
}

function cloneOutputLine(item: InventoryOutputLine): InventoryOutputLine {
    return { ...item }
}

function getActiveOutputLines(rows: InventoryOutputLine[]): InventoryOutputLine[] {
    return rows.filter((item) => !item.ISDEL)
}

function normalizeOutputLineRows(rows: InventoryOutputLine[]): InventoryOutputLine[] {
    return rows.map((item) => cloneOutputLine(item))
}

type OutputLineCellDisplayInfo = ColumnCellTemplateData<InventoryOutputLine, string>
type OutputLineCellInfo = ColumnEditCellTemplateData<InventoryOutputLine, string>

function renderLookupCell(dataField: string) {
    return (cellInfo: OutputLineCellDisplayInfo) => (
        <LookupGridCellEditor mode="display" cellInfo={cellInfo} dataField={dataField} />
    )
}

function consumeLookupAutoOpen(cellInfo: OutputLineCellInfo, dataField: string) {
    return consumeLookupCellOpen(cellInfo, dataField)
}

function renderLookupEditor(children: JSX.Element) {
    return <LookupGridCellEditor mode="edit">{children}</LookupGridCellEditor>
}

export const ChitInventoryOutputGridPopup = forwardRef<ChitInventoryOutputGridPopupHandle, ChitInventoryOutputGridPopupProps>(
    function ChitInventoryOutputGridPopup({
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
        adjustmentMode = false,
        columnSettingStateRef,
        linkSlot,
        beforeGridSlot,
        alternateContent,
    }, ref) {
        const { translate } = useContext(LanguageContext) as {
            translate?: (key: string, fallback?: string) => string
        }
        const { getFormat } = useDecimalColumnFormats()
        const gridRef = useRef<dxDataGrid<InventoryOutputLine, string> | null>(null)
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
            (cellInfo: OutputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
                <ProductLookupCellEditor
                    useCogsAccounts={!adjustmentMode}
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
            [t, adjustmentMode],
        )

        const renderStoreEditor = useCallback(
            (cellInfo: OutputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
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

        const renderToStoreEditor = useCallback(
            (cellInfo: OutputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
                <WarehouseLookupCellEditor
                    value={cellInfo.data?.TO_STORE_ID ?? null}
                    rowData={(cellInfo.data ?? {}) as Record<string, unknown>}
                    rowIndex={cellInfo.row?.rowIndex ?? -1}
                    grid={cellInfo.component}
                    setValue={(storeId) => {
                        cellInfo.component.cellValue(cellInfo.row.rowIndex, "TO_STORE_ID", storeId)
                    }}
                    warehouseIdField="TO_STORE_ID"
                    warehouseCdField="TO_STORE_CD"
                    warehouseNmField="TO_STORE_NM_VIET"
                    placeholder={t("SelectToStore", "Select to store")}
                    popupTitle={t("SelectToStore", "Select to store")}
                    buttonHint={t("LIST_STORE", "Open store list")}
                    autoOpen={autoOpen}
                />
            ),
            [t],
        )

        const renderUnitEditor = useCallback(
            (cellInfo: OutputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
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
            (cellInfo: OutputLineCellInfo, autoOpen?: LookupOpenMode | null) => (
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
                    normalizeOutputLine(row, {
                        companyCd,
                        chitDetailId,
                        chitDetailCd,
                        detailRowKey,
                        inventoryYmd,
                    }),
                ),
            [rows, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd],
        )

        const visibleRows = useMemo(() => getActiveOutputLines(normalizedRows), [normalizedRows])
        const { containerRef, gridHeight, notifyGridContentReady, notifyGridDisposing } = useVoucherSpreadsheetGridLayout({
            gridRef,
            isVisible,
            layoutVersion,
        })
        const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number")
        const runtimeForeignCurrencyColumnsVisible = useMemo(
            () => foreignCurrencyColumnsVisible || forceForeignCurrencyColumnsVisible || hasForeignCurrencyOutputAmounts(visibleRows),
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
                    label: t("lblTotal_quantity", adjustmentMode ? "Total Adjustment Qty" : "Total Output Qty"),
                    value: formatSpreadsheetSummaryNumber(totalQuantity, 3),
                },
                {
                    key: "amount",
                    label: t("TOTAL_AMOUNT", adjustmentMode ? "Total Adjustment Amount" : "Total Output Amount"),
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
        }, [adjustmentMode, detailAmount, detailLabel, showDetailContext, t, totalAmount, totalQuantity, visibleRows.length])

        const buildMergedRows = useCallback(() => {
            const source = gridRef.current?.option("dataSource")
            const activeRows = Array.isArray(source)
                ? normalizeOutputLineRows(source).map((item) => cloneOutputLine(item))
                : visibleRows.map((item) => cloneOutputLine(item))
            const activeRowMap = new Map(
                activeRows.map((item) => [item.ROW_KEY, { ...item, ISDEL: false }] as const),
            )
            const mergedRows: InventoryOutputLine[] = []

            normalizedRows.forEach((item) => {
                if (item.ISDEL) {
                    mergedRows.push(cloneOutputLine(item))
                    return
                }

                const activeRow = activeRowMap.get(item.ROW_KEY)
                if (!activeRow) {
                    return
                }

                mergedRows.push(cloneOutputLine(activeRow))
                activeRowMap.delete(item.ROW_KEY)
            })

            activeRowMap.forEach((item) => {
                mergedRows.push(cloneOutputLine(item))
            })

            return mergedRows
        }, [normalizedRows, visibleRows])

        const emitRowsChange = useCallback(
            (rows: InventoryOutputLine[]) => {
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
                    return cloneOutputLine({
                        ...item,
                        ISDEL: true,
                    })
                })

                if (!changed) {
                    return
                }

                if (currentRowKeyRef.current === targetKey) {
                    currentRowKeyRef.current = getActiveOutputLines(nextRows).at(-1)?.ROW_KEY ?? null
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
                        ? cloneOutputLine({
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

        const handleCellClick = useCallback((event: CellClickEvent<InventoryOutputLine, string>) => {
            if (event.rowType !== "data") {
                return
            }

            currentRowKeyRef.current = event.key ?? null
        }, [])

        const focusedDateEditInProgressRef = useRef(false)

        const setOutputQuantity = useCallback((newData: Partial<InventoryOutputLine>, value: number | null, current: InventoryOutputLine) => {
            newData.QUANTITY = value
            newData.AMOUNT_CC = value === null || current.UNIT_PRICE_CC === null ? null : value * current.UNIT_PRICE_CC
        }, [])

        const setOutputUnitPrice = useCallback((newData: Partial<InventoryOutputLine>, value: number | null, current: InventoryOutputLine) => {
            newData.UNIT_PRICE_CC = value
            newData.AMOUNT_CC = value === null || current.QUANTITY === null ? null : current.QUANTITY * value
        }, [])

        const handleEditorPreparing = useCallback(
            (event: EditorPreparingEvent<InventoryOutputLine, string>) => {
                if (event.parentType === "dataRow" && (event.dataField === "QUANTITY" || event.dataField === "UNIT_PRICE_CC")) {
                    event.editorOptions = { ...event.editorOptions, valueChangeEvent: "input change" }
                    return
                }
                if (event.parentType !== "dataRow" || !isInventoryDateColumn(String(event.dataField))) {
                    return
                }

                const previousEditorOptions = event.editorOptions ?? {}
                const previousInputAttr = (previousEditorOptions as Record<string, unknown>).inputAttr as Record<string, unknown> | undefined
                const previousOnValueChanged = (previousEditorOptions as Record<string, unknown>).onValueChanged as ((event: { value?: unknown }) => void) | undefined

                event.editorOptions = {
                    ...previousEditorOptions,
                    ...createDateTimeBoxEditorOptions({
                        inputAttr: {
                            ...(previousInputAttr ?? {}),
                            tabIndex: 0,
                        },
                        onValueChanged: (valueEvent: { value?: unknown }) => {
                            event.setValue?.(valueEvent.value)
                            previousOnValueChanged?.(valueEvent)
                        },
                    }),
                }
            },
            [],
        )

        const handleFocusedCellChanged = useCallback(
            (event: FocusedCellChangedEvent<InventoryOutputLine, string>) => {
                if (
                    event.row?.rowType !== "data" ||
                    event.rowIndex < 0 ||
                    event.columnIndex < 0 ||
                    !isInventoryDateColumn(String(event.column?.dataField))
                ) {
                    return
                }

                if (focusedDateEditInProgressRef.current) {
                    return
                }

                focusedDateEditInProgressRef.current = true
                focusGridDateEditor(event.component, event.rowIndex, event.columnIndex, () => {
                    focusedDateEditInProgressRef.current = false
                })
            },
            [],
        )

        const handleContinueRow = useCallback(() => {
            void handleAddRow()
        }, [handleAddRow])

        const handleKeyDown = useMemo(
            () => createSpreadsheetContinueRowKeyDownHandler<InventoryOutputLine>(handleContinueRow),
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

        const handleInitialized = useCallback((event: InitializedEvent<InventoryOutputLine, string>) => {
            gridRef.current = event.component ?? null
            if (columnSettingState.cachedEditorItems.length) {
                columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
            }
        }, [columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent])

        const handleContentReady = useCallback(
            (_event: ContentReadyEvent<InventoryOutputLine, string>) => {
                notifyGridContentReady()
            },
            [notifyGridContentReady],
        )

        const handleDisposing = useCallback(() => {
            notifyGridDisposing()
        }, [notifyGridDisposing])

        const handleInitNewRow = useCallback(
            (e: InitNewRowEvent<InventoryOutputLine>) => {
                const nextRow = normalizeOutputLine(
                    { SORT: normalizedRows.length + 1, QUANTITY: 1 },
                    { companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd },
                )

                Object.assign(e.data, nextRow)
                currentRowKeyRef.current = nextRow.ROW_KEY
            },
            [normalizedRows.length, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd],
        )

        const rootStyle = height !== undefined ? { height } : { height: MAX_DETAIL_GRID_HEIGHT }

        const handleToolbarPreparing = useCallback((e: ToolbarPreparingEvent<InventoryOutputLine, string>) => {
            prepareVoucherSpreadsheetToolbar(e)
        }, [])

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

        if (columnSettingStateRef) {
            columnSettingStateRef.current = columnSettingState
        }

        const detailColumns = useMemo(() => (
                <>
                    <Column dataField="OUTPUT_ID" caption={t("OUTPUT_ID", "Output ID")} />
                    <Column dataField="COGS_DEBIT" visible={false} showInColumnChooser={false} />
                    <Column dataField="COGS_CREDIT" visible={false} showInColumnChooser={false} />
                    <Column dataField="OUTPUT_CD" caption={t("OUTPUT_CD", "Output Code")} />
                    <Column dataField="CHIT_CD" caption={t("SOURCE_CODE", "Source Code")} allowEditing={false} />
                    <Column dataField="PRODUCT_ID" caption={t("PRODUCT_ID", "Product ID")} />
                    <Column
                        dataField="PRODUCT_CD"
                        caption={t("lblPRODUCT_CD", "Product Code")}
                        cssClass="am-grid-lookup-column-cell"
                        cellRender={renderLookupCell("PRODUCT_CD")}
                        editCellRender={(cellInfo: OutputLineCellInfo) =>
                            renderLookupEditor(renderProductEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "PRODUCT_CD")))
                        }
                    />
                    <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM", "Product Name")} allowEditing={false} />
                    <Column dataField="STORE_ID" caption={t("STORE_ID", "Store ID")} />
                    <Column
                        dataField="STORE_CD"
                        caption={adjustmentMode ? t("FROM_STORE_CD", "From store code") : t("STORE_CD", "Store Code")}
                        cssClass="am-grid-lookup-column-cell"
                        cellRender={renderLookupCell("STORE_CD")}
                        editCellRender={(cellInfo: OutputLineCellInfo) =>
                            renderLookupEditor(renderStoreEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "STORE_CD")))
                        }
                    />
                    <Column dataField="STORE_NM_VIET" caption={adjustmentMode ? t("FROM_STORE_NM", "From store name") : t("STORE_NM", "Store Name")} allowEditing={false} />
                    {adjustmentMode ? (
                        <>
                            <Column dataField="TO_STORE_ID" caption={t("TO_STORE_ID", "To store ID")} />
                            <Column
                                dataField="TO_STORE_CD"
                                caption={t("TO_STORE_CD", "To store code")}
                                cssClass="am-grid-lookup-column-cell"
                                cellRender={renderLookupCell("TO_STORE_CD")}
                                editCellRender={(cellInfo: OutputLineCellInfo) =>
                                    renderLookupEditor(renderToStoreEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "TO_STORE_CD")))
                                }
                            />
                            <Column dataField="TO_STORE_NM_VIET" caption={t("TO_STORE_NM", "To store name")} allowEditing={false} />
                        </>
                    ) : null}
                    <Column dataField="UNIT_ID" caption={t("UNIT_ID", "Unit ID")} />
                    <Column
                        dataField="UNIT_CD"
                        caption={t("UNIT_CD", "Unit Code")}
                        cssClass="am-grid-lookup-column-cell"
                        cellRender={renderLookupCell("UNIT_CD")}
                        editCellRender={(cellInfo: OutputLineCellInfo) =>
                            renderLookupEditor(renderUnitEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "UNIT_CD")))
                        }
                    />
                    <Column dataField="QUANTITY" setCellValue={setOutputQuantity} caption={t("QUANTITY", "Quantity")} dataType="number" format={getFormat("QUANTITY", "#,##0.###")} editorOptions={createNumberEditorOptions(getFormat("QUANTITY", "#,##0.###"))} />
                    <Column dataField="UNIT_PRICE_CC" setCellValue={setOutputUnitPrice} caption={t("UNIT_PRICE_CC", "Unit Price")} dataType="number" format={getFormat("UNIT_PRICE_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_CC", "#,##0.00"))} />
                    <Column dataField="AMOUNT_CC" caption={t("AMOUNT_CC", "Amount")} dataType="number" format={getFormat("AMOUNT_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_CC", "#,##0.00"))} allowHiding={false} />
                    <Column
                        dataField="FC_TYPE"
                        caption={t("FC_TYPE", "Currency")}
                        cssClass="am-grid-lookup-column-cell"
                        cellRender={renderLookupCell("FC_TYPE")}
                        editCellRender={(cellInfo: OutputLineCellInfo) =>
                            renderLookupEditor(renderCurrencyEditor(cellInfo, consumeLookupAutoOpen(cellInfo, "FC_TYPE")))
                        }
                    />
                    <Column dataField="UNIT_PRICE_FC" caption={t("UNIT_PRICE_FC", "Unit Price FC")} dataType="number" format={getFormat("UNIT_PRICE_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_FC", "#,##0.00"))} visible={runtimeForeignCurrencyColumnsVisible} />
                    <Column dataField="EXCHANGE_RATES" caption={t("FC_RATE", "Exchange rate")} dataType="number" format={getFormat("EXCHANGE_RATES", "#,##0.000000")} editorOptions={createNumberEditorOptions(getFormat("EXCHANGE_RATES", "#,##0.000000"))} visible={runtimeForeignCurrencyColumnsVisible} />
                    <Column dataField="AMOUNT_FC" caption={t("AMOUNT_FC", "Amount FC")} dataType="number" format={getFormat("AMOUNT_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_FC", "#,##0.00"))} visible={runtimeForeignCurrencyColumnsVisible} />
                    {adjustmentMode ? (
                        <>
                            <Column
                                dataField="INPUT_INVENTORY_YMD"
                                caption={t("INPUT_INVENTORY_YMD", "Input inventory date")}
                                dataType="datetime"
                                format="dd/MM/yyyy HH:mm:ss"
                                editorOptions={createInventoryDateTimeEditorOptions()}
                            />
                            <Column
                                dataField="OUTPUT_INVENTORY_YMD"
                                caption={t("OUTPUT_INVENTORY_YMD", "Output inventory date")}
                                dataType="datetime"
                                format="dd/MM/yyyy HH:mm:ss"
                                editorOptions={createInventoryDateTimeEditorOptions()}
                            />
                        </>
                    ) : (
                        <Column dataField="INVENTORY_YMD" caption={t("INVENTORY_YMD", "Inventory Date")} />
                    )}
                    <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
                </>
        ), [
            adjustmentMode,
            createInventoryDateTimeEditorOptions,
            getFormat,
            renderCurrencyEditor,
            renderLookupCell,
            renderLookupEditor,
            renderProductEditor,
            renderStoreEditor,
            renderToStoreEditor,
            renderUnitEditor,
            runtimeForeignCurrencyColumnsVisible,
            setOutputQuantity,
            setOutputUnitPrice,
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

                    {beforeGridSlot}
                    {alternateContent}
                    <div
                        ref={containerRef}
                        style={{ display: alternateContent ? "none" : undefined }}
                    className={`min-h-0 flex-1 ${VOUCHER_SPREADSHEET_GRID_CLASS}`}
                >
                        <DataGrid<InventoryOutputLine, string>
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
                            onFocusedCellChanged={handleFocusedCellChanged}
                            onKeyDown={handleKeyDown}
                            noDataText={t("NO_INVENTORY_OUTPUT", "No inventory output lines")}
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
                        cellRender={(cellInfo: ColumnCellTemplateData<InventoryOutputLine, string>) => {
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

            {!alternateContent && <VoucherSpreadsheetSummaryBar items={summaryItems} />}
        </div>
        )
    })

export default ChitInventoryOutputGridPopup
