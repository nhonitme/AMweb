import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState } from "react"
import { Button } from "devextreme-react"
import DataGrid, { Column, ColumnFixing, Editing, FilterRow, FilterPanel, Toolbar, Item, Button as GridButton, StateStoring } from "devextreme-react/data-grid"
import TextBox from "devextreme-react/text-box"
import dayjs from "dayjs"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent, FocusedRowChangedEvent, ContentReadyEvent, SavedEvent } from "devextreme/ui/data_grid"

import { useGridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { useInlineGridSearch } from "@/components/datagrid/gridSearch"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ChitDateValue, InventoryInputLine } from "@/types/voucher"

export interface ChitInventoryInputGridPopupHandle {
  savePendingChanges: () => Promise<InventoryInputLine[]>
  addRow: () => void
  deleteFocusedRow: () => void
  focusSearch: () => void
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
  height?: number
  isVisible?: boolean
}

const DEFAULT_ROW_HEIGHT = 38
const DEFAULT_CHROME_HEIGHT = 118
const DEFAULT_MAX_GRID_HEIGHT = 420
const VIEWPORT_VERTICAL_OFFSET = 430

function createRowKey(detailRowKey?: string | null) {
  return `input_${detailRowKey ?? "detail"}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`
}

function getElementHeight(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    return 0
  }
  return Math.ceil(element.getBoundingClientRect().height)
}

function cloneInventoryLine(item: InventoryInputLine): InventoryInputLine {
  return { ...item }
}

function getActiveInventoryLines(rows: InventoryInputLine[]): InventoryInputLine[] {
  return rows.filter((item) => !item.ISDEL)
}

function toNumber(value: unknown) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
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
    COMPANY_CD: String(row.COMPANY_CD ?? options.companyCd ?? ""),
    PRODUCT_ID: row.PRODUCT_ID ?? null,
    PRODUCT_CD: String(row.PRODUCT_CD ?? ""),
    STORE_ID: row.STORE_ID ?? null,
    STORE_CD: String(row.STORE_CD ?? ""),
    UNIT_ID: row.UNIT_ID ?? null,
    UNIT_CD: String(row.UNIT_CD ?? ""),
    QUANTITY: quantity,
    UNIT_PRICE_CC: unitPrice,
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
  }, ref) {
    const { translate } = useContext(LanguageContext) as {
      translate?: (key: string, fallback?: string) => string
    }
    const gridRef = useRef<dxDataGrid<InventoryInputLine, string> | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const searchContainerRef = useRef<HTMLDivElement | null>(null)
    const layoutFrameRef = useRef<number | null>(null)

    const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT)
    const [chromeHeight, setChromeHeight] = useState(DEFAULT_CHROME_HEIGHT)
    const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
    const [viewportHeight, setViewportHeight] = useState(() =>
      typeof window === "undefined" ? 900 : window.innerHeight,
    )

    const columnSettingState = useGridColumnSettingState({
      enabled: persistColumnSettings,
      screenCd,
      gridId,
    })
    const { searchText, searchVisible, showSearch, handleSearchTextChange, handleSearchEnter } =
      useInlineGridSearch(gridRef)

    const t = useCallback(
      (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
      [translate],
    )

    // Normalize and filter rows
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
    const softDeletedCount = useMemo(
      () => normalizedRows.reduce((count, item) => count + (item.ISDEL ? 1 : 0), 0),
      [normalizedRows],
    )
    const totalQuantity = useMemo(
      () => visibleRows.reduce((sum, row) => sum + toNumber(row.QUANTITY), 0),
      [visibleRows],
    )
    const totalAmount = useMemo(
      () => visibleRows.reduce((sum, row) => sum + toNumber(row.AMOUNT_CC), 0),
      [visibleRows],
    )

    // Grid layout measurement
    const measureGridLayout = useCallback(() => {
      const container = containerRef.current
      if (!container || container.getClientRects().length === 0) {
        return
      }

      const headerPanel = getElementHeight(container.querySelector(".dx-datagrid-header-panel"))
      const headers = getElementHeight(container.querySelector(".dx-datagrid-headers"))
      const filterPanel = getElementHeight(container.querySelector(".dx-datagrid-filter-panel"))
      const pager = getElementHeight(container.querySelector(".dx-datagrid-pager"))

      const rowElements = Array.from(container.querySelectorAll(".dx-datagrid-rowsview .dx-data-row")).filter(
        (el) => !(el as HTMLElement).classList.contains("dx-freespace-row"),
      )
      const measuredRowHeight = Math.ceil(
        (rowElements[0] as HTMLElement | undefined)?.getBoundingClientRect().height ?? DEFAULT_ROW_HEIGHT,
      )
      const measuredChrome = Math.max(
        DEFAULT_CHROME_HEIGHT,
        headerPanel + headers + filterPanel + pager + 4,
      )

      setRowHeight((current) => (current === measuredRowHeight ? current : measuredRowHeight))
      setChromeHeight((current) => (current === measuredChrome ? current : measuredChrome))
    }, [])

    const clearLayoutFrame = useCallback(() => {
      if (layoutFrameRef.current !== null) {
        cancelAnimationFrame(layoutFrameRef.current)
        layoutFrameRef.current = null
      }
    }, [])

    const refreshGridLayout = useCallback(() => {
      if (!isVisible) return
      clearLayoutFrame()

      const updateLayout = () => {
        gridRef.current?.updateDimensions?.()
        measureGridLayout()
      }

      updateLayout()
      layoutFrameRef.current = requestAnimationFrame(updateLayout)
    }, [clearLayoutFrame, isVisible, measureGridLayout])

    // Row operations
    const buildMergedRows = useCallback(() => {
      const source = gridRef.current?.option("dataSource")
      const activeRows = Array.isArray(source) ? source : visibleRows
      const activeMap = new Map(activeRows.map((item) => [item.ROW_KEY, cloneInventoryLine(item)]))

      const merged: InventoryInputLine[] = []
      normalizedRows.forEach((item) => {
        if (item.ISDEL) {
          merged.push(cloneInventoryLine(item))
        } else {
          const active = activeMap.get(item.ROW_KEY)
          if (active) {
            merged.push(cloneInventoryLine(active))
            activeMap.delete(item.ROW_KEY)
          }
        }
      })

      activeMap.forEach((item) => merged.push(cloneInventoryLine(item)))
      return merged
    }, [normalizedRows, visibleRows])

    const emitRowsChange = useCallback(
      (newRows: InventoryInputLine[]) => {
        onChange(newRows)
        return newRows
      },
      [onChange],
    )

    const syncRows = useCallback(
      () => emitRowsChange(buildMergedRows()),
      [buildMergedRows, emitRowsChange],
    )

    const softDeleteRow = useCallback(
      async (targetKey: string | null) => {
        if (!targetKey) return

        if (gridRef.current?.hasEditData?.()) {
          await gridRef.current.saveEditData()
        }

        const current = buildMergedRows()
        const nextRows = current.map((item) =>
          item.ROW_KEY === targetKey && !item.ISDEL
            ? cloneInventoryLine({ ...item, ISDEL: true })
            : item,
        )

        if (nextRows === current) return

        const remaining = getActiveInventoryLines(nextRows)
        setFocusedRowKey(remaining[remaining.length - 1]?.ROW_KEY ?? null)
        emitRowsChange(nextRows)
      },
      [buildMergedRows, emitRowsChange],
    )

    const restoreLastDeleted = useCallback(
      async () => {
        if (gridRef.current?.hasEditData?.()) {
          await gridRef.current.saveEditData()
        }

        const current = buildMergedRows()
        const deleted = [...current].reverse().find((item) => item.ISDEL)
        if (!deleted) return

        const nextRows = current.map((item) =>
          item.ROW_KEY === deleted.ROW_KEY
            ? cloneInventoryLine({ ...item, ISDEL: false })
            : item,
        )

        setFocusedRowKey(deleted.ROW_KEY)
        emitRowsChange(nextRows)
        requestAnimationFrame(() => {
          gridRef.current?.navigateToRow?.(deleted.ROW_KEY)
        })
      },
      [buildMergedRows, emitRowsChange],
    )

    // Grid event handlers
    const handleInitialized = useCallback((event: InitializedEvent<InventoryInputLine, string>) => {
      gridRef.current = event.component ?? null
      if (columnSettingState.cachedEditorItems.length) {
        columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
      }
    }, [columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent])

    const handleContentReady = useCallback(() => {
      refreshGridLayout()
    }, [refreshGridLayout])

    const handleSaved = useCallback(() => {
      syncRows()
      refreshGridLayout()
    }, [refreshGridLayout, syncRows])

    const handleFocusedRowChanged = useCallback((event: FocusedRowChangedEvent<InventoryInputLine, string>) => {
      const key = event.row?.key
      setFocusedRowKey(typeof key === "string" ? key : key != null ? String(key) : null)
    }, [])

    const handleAddRow = useCallback(async () => {
      const grid = gridRef.current
      if (!grid) return

      if (grid.hasEditData?.()) {
        await grid.saveEditData()
      }

      syncRows()
      grid.addRow()

      requestAnimationFrame(() => {
        const rows = grid.getVisibleRows()
        const lastRow = rows[rows.length - 1]
        if (lastRow?.key) {
          const key = typeof lastRow.key === "string" ? lastRow.key : String(lastRow.key)
          setFocusedRowKey(key)
          grid.navigateToRow?.(lastRow.key)
        }
      })
    }, [syncRows])

    const handleInitNewRow = useCallback(
      (e: any) => {
        const newRow = normalizeInputLine(
          { SORT: visibleRows.length + 1 },
          { companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd },
        )
        Object.assign(e.data, newRow)
        setFocusedRowKey(newRow.ROW_KEY)
        requestAnimationFrame(() => {
          gridRef.current?.navigateToRow?.(newRow.ROW_KEY)
        })
      },
      [visibleRows.length, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd],
    )

    // Expose methods via ref
    useImperativeHandle(
      ref,
      () => ({
        savePendingChanges: async () => {
          if (gridRef.current?.hasEditData?.()) {
            await gridRef.current.saveEditData()
          }
          return syncRows()
        },
        addRow: () => {
          void handleAddRow()
        },
        deleteFocusedRow: () => {
          const key = focusedRowKey ?? visibleRows[visibleRows.length - 1]?.ROW_KEY ?? null
          void softDeleteRow(key)
        },
        focusSearch: () => {
          if (!searchVisible) showSearch()
          requestAnimationFrame(() => {
            const input = searchContainerRef.current?.querySelector("input") as HTMLInputElement | null
            input?.focus()
            input?.select?.()
          })
        },
        getGridInstance: () => gridRef.current,
      }),
      [focusedRowKey, handleAddRow, searchVisible, showSearch, softDeleteRow, syncRows, visibleRows],
    )

    // Effects
    useEffect(() => {
      const handleResize = () => setViewportHeight(window.innerHeight)
      window.addEventListener("resize", handleResize)
      return () => window.removeEventListener("resize", handleResize)
    }, [])

    useEffect(() => {
      if (!isVisible) return
      refreshGridLayout()
    }, [isVisible, refreshGridLayout, searchVisible, viewportHeight])

    useEffect(() => {
      if (visibleRows.length === 0) {
        setFocusedRowKey(null)
        return
      }

      setFocusedRowKey((current) => {
        if (!current) return visibleRows[0]?.ROW_KEY ?? null
        if (visibleRows.some((item) => item.ROW_KEY === current)) return current
        return visibleRows[0]?.ROW_KEY ?? null
      })
    }, [visibleRows])

    useEffect(() => {
      if (!columnSettingState.enabled || !gridRef.current) return
      columnSettingState.syncEditorItemsToComponent(gridRef.current, columnSettingState.cachedEditorItems)
    }, [columnSettingState.cachedEditorItems, columnSettingState.enabled, columnSettingState.syncEditorItemsToComponent, normalizedRows])

    useEffect(() => clearLayoutFrame, [clearLayoutFrame])

    // Calculate grid height
    const gridHeight = useMemo(() => {
      if (height !== undefined) return height
      const maxHeight = Math.max(240, Math.min(DEFAULT_MAX_GRID_HEIGHT, viewportHeight - VIEWPORT_VERTICAL_OFFSET))
      const rowCount = Math.max(visibleRows.length, 1)
      return Math.min(chromeHeight + rowCount * rowHeight, maxHeight)
    }, [chromeHeight, height, rowHeight, viewportHeight, visibleRows.length])

    return (
      <div
        ref={containerRef}
        className="flex flex-col gap-3 h-full min-h-0"
      >
        {/* Header Info */}
        <div className="grid gap-3 rounded-lg border border-gray-200 bg-slate-50 p-3 lg:grid-cols-4">
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t("DETAIL_ROW", "Detail Row")}
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-800">
              {detailLabel || "-"}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t("DETAIL_AMOUNT", "Detail Amount")}
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-800">
              {Number(detailAmount ?? 0).toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t("TOTAL_INPUT_QTY", "Total Input Qty")}
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-800">
              {totalQuantity.toLocaleString()}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wide text-gray-500">
              {t("TOTAL_INPUT_AMOUNT", "Total Input Amount")}
            </div>
            <div className="mt-1 text-sm font-semibold text-gray-800">
              {totalAmount.toLocaleString()}
            </div>
          </div>
        </div>

        {/* Grid */}
        <div
          className="flex-1 min-h-0 overflow-hidden rounded-lg border border-gray-200 bg-white"
          style={{ height: gridHeight }}
        >
          <DataGrid<InventoryInputLine, string>
            ref={gridRef}
            dataSource={visibleRows}
            keyExpr="ROW_KEY"
            width="100%"
            height={gridHeight}
            showBorders
            columnAutoWidth
            rowAlternationEnabled
            allowColumnResizing
            allowColumnReordering
            focusedRowEnabled
            focusedRowKey={focusedRowKey ?? undefined}
            onInitialized={handleInitialized}
            onContentReady={handleContentReady}
            onFocusedRowChanged={handleFocusedRowChanged}
            onSaved={handleSaved}
            onInitNewRow={handleInitNewRow}
          >
            <ColumnFixing enabled />
            {columnSettingState.enabled && (
              <StateStoring
                enabled
                type="custom"
                customLoad={columnSettingState.customLoad}
                customSave={columnSettingState.customSave}
                savingTimeout={500}
              />
            )}
            <Editing
              mode="batch"
              allowAdding={!disabled}
              allowUpdating={!disabled}
              allowDeleting={false}
              startEditAction="click"
              selectTextOnEditStart
              newRowPosition="last"
            />
            <FilterRow showOperationChooser />
            <FilterPanel />
            <Toolbar>
              <Item name="addRowButton" location="before" />
              <Item location="before" locateInMenu="never">
                <Button
                  text={t("Undelete", "Hoàn tác")}
                  stylingMode="outlined"
                  disabled={softDeletedCount === 0}
                  onClick={() => void restoreLastDeleted()}
                />
              </Item>
              <Item location="after" locateInMenu="never">
                <div className="flex items-center gap-2">
                  {searchVisible && (
                    <div ref={searchContainerRef}>
                      <TextBox
                        width={260}
                        mode="search"
                        stylingMode="outlined"
                        value={searchText}
                        showClearButton
                        placeholder={t("Search detail...", "Tìm chi tiết...")}
                        onValueChanged={(event) => handleSearchTextChange(String(event.value ?? ""))}
                        onEnterKey={handleSearchEnter}
                      />
                    </div>
                  )}
                  <Button
                    stylingMode="text"
                    icon="search"
                    onClick={showSearch}
                  />
                </div>
              </Item>
            </Toolbar>

            {/* Delete Button Column */}
            <Column
              type="buttons"
              width={60}
              fixed
              fixedPosition="left"
              visibleIndex={0}
              allowFixing={false}
              showInColumnChooser={false}
              allowReordering={false}
            >
              <GridButton
                icon="trash"
                onClick={(event: any) => {
                  const key = event.row?.key
                  if (key) void softDeleteRow(key)
                }}
              />
            </Column>

            {/* Data Columns */}
            <Column dataField="INPUT_ID" visible={false} showInColumnChooser={false} />
            <Column dataField="INPUT_CD" visible={false} />
            <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CD", "Product Code")} />
            <Column dataField="STORE_CD" caption={t("STORE_CD", "Store Code")} />
            <Column dataField="UNIT_CD" caption={t("UNIT_CD", "Unit Code")} />
            <Column dataField="QUANTITY" caption={t("QUANTITY", "Quantity")} dataType="number" format="#,##0.###" />
            <Column dataField="UNIT_PRICE_CC" caption={t("UNIT_PRICE_CC", "Unit Price")} dataType="number" format="#,##0.00" />
            <Column dataField="AMOUNT_CC" caption={t("AMOUNT_CC", "Amount")} dataType="number" format="#,##0.00" />
            <Column dataField="INVENTORY_YMD" visible={false} />
            <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
          </DataGrid>
        </div>
      </div>
    )
  },
)

ChitInventoryInputGridPopup.displayName = "ChitInventoryInputGridPopup"
