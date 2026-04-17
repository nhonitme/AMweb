import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentType } from "react"
import { Button } from "devextreme-react"
import DataGrid, { Column, ColumnFixing, Editing, Pager, Paging, StateStoring, FilterRow, FilterPanel, Toolbar, Item, Button as GridButton } from "devextreme-react/data-grid"
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
  layoutVersion?: number
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

function normalizeInventoryLineRows(rows: InventoryInputLine[]): InventoryInputLine[] {
  return rows.map((item) => cloneInventoryLine(item))
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

function mergeInsertedRow(rows: InventoryInputLine[], nextRow: InventoryInputLine) {
  const key = String(nextRow.ROW_KEY)
  const exists = rows.some((row) => String(row.ROW_KEY) === key)

  if (exists) {
    return rows.map((row) => (String(row.ROW_KEY) === key ? nextRow : row))
  }

  return [...rows, nextRow]
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
  }, ref) {
    const { translate } = useContext(LanguageContext) as {
      translate?: (key: string, fallback?: string) => string
    }
    const gridRef = useRef<dxDataGrid<InventoryInputLine, string> | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const searchContainerRef = useRef<HTMLDivElement | null>(null)
    const layoutFrameRef = useRef<number | null>(null)
    const layoutFollowUpFrameRef = useRef<number | null>(null)
    const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT)
    const [chromeHeight, setChromeHeight] = useState(DEFAULT_CHROME_HEIGHT)
    const [effectiveRowCount, setEffectiveRowCount] = useState(
      () => rows.reduce((count, item) => count + (item.ISDEL ? 0 : 1), 0),
    )
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
    const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number")
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

    const measureGridLayout = useCallback(() => {
      const container = containerRef.current
      if (!container) {
        return
      }

      if (container.getClientRects().length === 0) {
        return
      }

      const headerPanelHeight = getElementHeight(container.querySelector(".dx-datagrid-header-panel"))
      const headersHeight = getElementHeight(container.querySelector(".dx-datagrid-headers"))
      const filterPanelHeight = getElementHeight(container.querySelector(".dx-datagrid-filter-panel"))
      const pagerHeight = getElementHeight(container.querySelector(".dx-datagrid-pager"))
      const rowElements = Array.from(container.querySelectorAll(".dx-datagrid-rowsview .dx-data-row")).filter(
        (element) => !(element as HTMLElement).classList.contains("dx-freespace-row"),
      )
      const measuredRowHeight = Math.ceil(
        (rowElements[0] as HTMLElement | undefined)?.getBoundingClientRect().height ?? DEFAULT_ROW_HEIGHT,
      )
      const measuredChromeHeight = Math.max(
        DEFAULT_CHROME_HEIGHT,
        headerPanelHeight + headersHeight + filterPanelHeight + pagerHeight + 4,
      )
      const nextRowCount = Math.max(rowElements.length, visibleRows.length)

      setRowHeight((current) => (current === measuredRowHeight ? current : measuredRowHeight))
      setChromeHeight((current) => (current === measuredChromeHeight ? current : measuredChromeHeight))
      setEffectiveRowCount((current) => (current === nextRowCount ? current : nextRowCount))
    }, [visibleRows.length])

    const clearPendingLayoutRefresh = useCallback(() => {
      if (layoutFrameRef.current !== null) {
        cancelAnimationFrame(layoutFrameRef.current)
        layoutFrameRef.current = null
      }

      if (layoutFollowUpFrameRef.current !== null) {
        cancelAnimationFrame(layoutFollowUpFrameRef.current)
        layoutFollowUpFrameRef.current = null
      }
    }, [])

    const refreshGridLayout = useCallback(() => {
      if (!isVisible) {
        return
      }

      clearPendingLayoutRefresh()

      const updateGridLayout = () => {
        gridRef.current?.updateDimensions?.()
        measureGridLayout()
      }

      updateGridLayout()
      layoutFrameRef.current = requestAnimationFrame(() => {
        updateGridLayout()
        layoutFollowUpFrameRef.current = requestAnimationFrame(() => {
          updateGridLayout()
        })
      })
    }, [clearPendingLayoutRefresh, isVisible, measureGridLayout])

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

    const focusSearchInput = useCallback(() => {
      const input = searchContainerRef.current?.querySelector("input.dx-texteditor-input, input") as HTMLInputElement | null
      input?.focus()
      input?.select?.()
    }, [])

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

        const nextVisibleRows = getActiveInventoryLines(nextRows)
        setFocusedRowKey((current) =>
          current === targetKey ? nextVisibleRows[nextVisibleRows.length - 1]?.ROW_KEY ?? null : current,
        )
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

        setFocusedRowKey(deletedRow.ROW_KEY)
        emitRowsChange(nextRows)
        requestAnimationFrame(() => {
          gridRef.current?.navigateToRow?.(deletedRow.ROW_KEY)
        })
      },
      [buildMergedRows, emitRowsChange],
    )

    const handleFocusedRowChanged = useCallback((event: FocusedRowChangedEvent<InventoryInputLine, string>) => {
      const nextKey = event.row?.key
      setFocusedRowKey(typeof nextKey === "string" ? nextKey : nextKey != null ? String(nextKey) : null)
    }, [])

    const handleAddRow = useCallback(async () => {
      const grid = gridRef.current
      if (!grid) return

      // Nếu đang sửa dở 1 dòng thì commit lại trước
      if (grid.hasEditData()) {
        await grid.saveEditData()
      }

      // Đồng bộ lại dữ liệu hiện tại từ grid/state
      const currentRows = buildMergedRows()
      emitRowsChange(currentRows)

      // Sau đó mới thêm dòng mới
      grid.addRow()
    }, [buildMergedRows, emitRowsChange])

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
        deleteFocusedRow: () => {
          const targetKey = focusedRowKey ?? visibleRows[visibleRows.length - 1]?.ROW_KEY ?? null
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
        getGridInstance: () => gridRef.current,
      }),
      [focusSearchInput, focusedRowKey, handleAddRow, searchVisible, showSearch, softDeleteRowByKey, syncRows, visibleRows],
    )

    const handleInitialized = useCallback((event: InitializedEvent<InventoryInputLine, string>) => {
      gridRef.current = event.component ?? null
      if (columnSettingState.cachedEditorItems.length) {
        columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
      }
    }, [columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent])

    const handleContentReady = useCallback(
      (_event: ContentReadyEvent<InventoryInputLine, string>) => {
        refreshGridLayout()
      },
      [refreshGridLayout],
    )

    const handleSaved = useCallback(
      (_event: SavedEvent<InventoryInputLine, string>) => {
        syncRows()
        refreshGridLayout()
      },
      [refreshGridLayout, syncRows],
    )

    useEffect(() => {
      if (typeof window === "undefined") {
        return
      }

      const handleResize = () => {
        setViewportHeight(window.innerHeight)
      }

      window.addEventListener("resize", handleResize)
      return () => {
        window.removeEventListener("resize", handleResize)
      }
    }, [])

    useEffect(() => {
      if (!isVisible) {
        return
      }

      setEffectiveRowCount(visibleRows.length)
      refreshGridLayout()
    }, [isVisible, layoutVersion, refreshGridLayout, visibleRows.length])

    // Update focused row when visible rows change
    useEffect(() => {
      setFocusedRowKey((current) => {
        if (!current) {
          return visibleRows[0]?.ROW_KEY ?? null
        }

        if (visibleRows.some((item) => item.ROW_KEY === current)) {
          return current
        }

        return current
      })
    }, [visibleRows])

    useEffect(() => {
      if (!isVisible) {
        return
      }

      refreshGridLayout()
    }, [isVisible, refreshGridLayout, searchVisible, viewportHeight])

    useEffect(() => {
      if (!columnSettingState.enabled || !gridRef.current || !columnSettingState.cachedEditorItems.length) {
        return
      }

      columnSettingState.syncEditorItemsToComponent(gridRef.current, columnSettingState.cachedEditorItems)
    }, [
      columnSettingState.cachedEditorItems,
      columnSettingState.enabled,
      columnSettingState.syncEditorItemsToComponent,
      normalizedRows,
    ])

    useEffect(() => clearPendingLayoutRefresh, [clearPendingLayoutRefresh])

    const handleRowInserted = useCallback(
      (e: any) => {
        const nextRow = normalizeInputLine(e.data, {
          companyCd,
          chitDetailId,
          chitDetailCd,
          detailRowKey,
          inventoryYmd,
        })

        onChange(mergeInsertedRow(normalizedRows, nextRow))
      },
      [normalizedRows, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd, onChange],
    )

    const handleRowUpdated = useCallback(
      (e: any) => {
        const key = String(e.key)
        const nextRows = normalizedRows.map((row) => {
          if (String(row.ROW_KEY) !== key) return row
          return normalizeInputLine(
            { ...row, ...e.data },
            { companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd },
          )
        })
        onChange(nextRows)
      },
      [normalizedRows, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd, onChange],
    )

    const handleRowRemoved = useCallback(
      (e: any) => {
        const key = String(e.key)
        onChange(normalizedRows.filter((row) => String(row.ROW_KEY) !== key))
      },
      [normalizedRows, onChange],
    )

    const handleInitNewRow = useCallback(
      (e: any) => {
        const nextRow = normalizeInputLine(
          { SORT: normalizedRows.length + 1 },
          { companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd },
        )

        Object.assign(e.data, nextRow)
        setFocusedRowKey(nextRow.ROW_KEY)

        requestAnimationFrame(() => {
          gridRef.current?.navigateToRow?.(nextRow.ROW_KEY)
        })
      },
      [normalizedRows.length, companyCd, chitDetailId, chitDetailCd, detailRowKey, inventoryYmd],
    )

    const gridHeight = useMemo(() => {
      if (height !== undefined) {
        return height
      }

      const maxGridHeight = Math.max(240, Math.min(DEFAULT_MAX_GRID_HEIGHT, viewportHeight - VIEWPORT_VERTICAL_OFFSET))
      const visibleRowCount = Math.max(effectiveRowCount, 1)
      return Math.min(chromeHeight + visibleRowCount * rowHeight, maxGridHeight)
    }, [chromeHeight, effectiveRowCount, height, rowHeight, viewportHeight])

    const handleToolbarPreparing = useCallback((e: any) => {
      const items = e.toolbarOptions?.items ?? []

      const addItem = items.find((item: any) => item.name === "addRowButton")
      if (!addItem) return

      const originalOnClick = addItem.options?.onClick

      addItem.options = {
        ...(addItem.options ?? {}),
        onClick: async (args: any) => {
          const grid = gridRef.current
          if (!grid) {
            if (originalOnClick) originalOnClick(args)
            return
          }

          if (grid.hasEditData()) {
            await grid.saveEditData()
          }

          const currentRows = buildMergedRows()
          emitRowsChange(currentRows)

          if (originalOnClick) {
            originalOnClick(args)
          } else {
            grid.addRow()
          }
        },
      }
    }, [buildMergedRows, emitRowsChange])

    return (
      <div
        ref={containerRef}
        className="w-full overflow-hidden data-grid-container rounded-lg border border-gray-200 bg-white"
        style={{ height: gridHeight }}
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
          focusedRowEnabled={true}
          focusedRowKey={focusedRowKey ?? undefined}
          onInitialized={handleInitialized}
          onContentReady={handleContentReady}
          onFocusedRowChanged={handleFocusedRowChanged}
          onSaved={handleSaved}
          onToolbarPreparing={handleToolbarPreparing}
          onInitNewRow={handleInitNewRow}
        >
          <ColumnFixing enabled={true} />
          {columnSettingState.enabled ? (
            <StateStoring
              enabled={true}
              type="custom"
              customLoad={columnSettingState.customLoad}
              customSave={columnSettingState.customSave}
              savingTimeout={500}
            />
          ) : null}
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
          <FilterRow showOperationChooser={true} />
          <FilterPanel />
          <Toolbar>
            <Item name="addRowButton" location="before" />

            <Item location="before" locateInMenu="never">
              <div className="flex items-center gap-4">
                <Button
                  text={t("Undelete", "Hoàn tác")}
                  stylingMode="outlined"
                  hint={t("RESTORE_LAST_DELETED_ROW", "Restore the last deleted row")}
                  disabled={softDeletedCount === 0}
                  onClick={() => {
                    void undeleteLastRow()
                  }}
                />

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
            </Item>

            <Item location="after" locateInMenu="never">
              <div className="flex items-center gap-2">
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
            </Item>
          </Toolbar>

          <Column
            type="buttons"
            width={60}
            fixed={true}
            fixedPosition="left"
            visibleIndex={0}
            allowFixing={false}
            showInColumnChooser={false}
            allowReordering={false}
          >
            <GridButton
              icon="trash"
              hint={t("DELETE", "Delete")}
              onClick={(event: any) => {
                const rowKey = event.row?.key
                if (rowKey) {
                  void softDeleteRowByKey(rowKey)
                }
              }}
            />
          </Column>

          <Column dataField="INPUT_ID" caption={t("INPUT_ID", "Input ID")} visible={false} showInColumnChooser={false} allowHiding={false} />
          <Column dataField="INPUT_CD" caption={t("INPUT_CD", "Input Code")} visible={false} />
          <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CD", "Product Code")} />
          <Column dataField="STORE_CD" caption={t("STORE_CD", "Store Code")} />
          <Column dataField="UNIT_CD" caption={t("UNIT_CD", "Unit Code")} />
          <Column dataField="QUANTITY" caption={t("QUANTITY", "Quantity")} dataType="number" format="#,##0.###" />
          <Column dataField="UNIT_PRICE_CC" caption={t("UNIT_PRICE_CC", "Unit Price")} dataType="number" format="#,##0.00" />
          <Column dataField="AMOUNT_CC" caption={t("AMOUNT_CC", "Amount")} dataType="number" format="#,##0.00" />
          <Column dataField="INVENTORY_YMD" caption={t("INVENTORY_YMD", "Inventory Date")} visible={false} />
          <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
        </DataGrid>
      </div>
    )
  })

export default ChitInventoryInputGridPopup
