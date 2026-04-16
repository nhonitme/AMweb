import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useMemo, useRef, useState, type ComponentType } from "react"
import { Button } from "devextreme-react"
import DataGrid, { Toolbar, Item, Editing, FilterRow, FilterPanel, ColumnFixing, StateStoring } from "devextreme-react/data-grid"
import TextBox from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
  ContentReadyEvent,
  FocusedRowChangedEvent,
  InitializedEvent,
  SavedEvent,
} from "devextreme/ui/data_grid"

import { LanguageContext } from "@/lib/i18nLoader"
import { useGridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import { useInlineGridSearch } from "@/components/datagrid/gridSearch"
import type { ChitDetail } from "@/types/voucher"
import {
  calculateChitAmount,
  cloneChitDetail,
  createDefaultChitDetail,
  getActiveChitDetails,
  normalizeChitDetailRows,
} from "../chitUtils"
import type { VoucherDetailColumnsProps } from "./ChitDetailColumnsPopup"
export interface ChitDetailGridHandle {
  savePendingChanges: () => Promise<ChitDetail[]>
  addRow: () => void
  deleteFocusedRow: () => void
  focusSearch: () => void
  getGridInstance: () => dxDataGrid<ChitDetail, string> | null
}

interface ChitDetailGridProps {
  companyCd: string
  details: ChitDetail[]
  onChange: (rows: ChitDetail[], amount: number) => void
  height?: number
  isVisible?: boolean
  layoutVersion?: number
  ChitDetailColumns?: ComponentType<VoucherDetailColumnsProps> | undefined
  screenCd?: string
  gridId?: string
  persistColumnSettings?: boolean
  onOpenInventoryRow?: (rowKey: string | null) => void
}

const DEFAULT_ROW_HEIGHT = 38
const DEFAULT_CHROME_HEIGHT = 118
const DEFAULT_MAX_GRID_HEIGHT = 420
const VIEWPORT_VERTICAL_OFFSET = 430

function getElementHeight(element: Element | null) {
  if (!(element instanceof HTMLElement)) {
    return 0
  }

  return Math.ceil(element.getBoundingClientRect().height)
}

export const ChitDetailGridPopup = forwardRef<ChitDetailGridHandle, ChitDetailGridProps>(
  function ChitDetailGrid(
    {
      companyCd,
      details,
      onChange,
      height,
      isVisible = true,
      layoutVersion = 0,
      ChitDetailColumns,
      screenCd,
      gridId,
      persistColumnSettings = false,
      onOpenInventoryRow,
    },
    ref,
  ) {
    const gridRef = useRef<dxDataGrid<ChitDetail, string> | null>(null)
    const containerRef = useRef<HTMLDivElement | null>(null)
    const searchContainerRef = useRef<HTMLDivElement | null>(null)
    const layoutFrameRef = useRef<number | null>(null)
    const layoutFollowUpFrameRef = useRef<number | null>(null)
    const [rowHeight, setRowHeight] = useState(DEFAULT_ROW_HEIGHT)
    const [chromeHeight, setChromeHeight] = useState(DEFAULT_CHROME_HEIGHT)
    const [effectiveRowCount, setEffectiveRowCount] = useState(
      () => details.reduce((count, item) => count + (item.ISDEL ? 0 : 1), 0),
    )
    const [focusedRowKey, setFocusedRowKey] = useState<string | null>(null)
    const [viewportHeight, setViewportHeight] = useState(() =>
      typeof window === "undefined" ? 900 : window.innerHeight,
    )
    const { translate } = useContext(LanguageContext) as {
      translate?: (key: string, fallback?: string) => string
    }
    const { searchText, searchVisible, showSearch, handleSearchTextChange, handleSearchEnter } =
      useInlineGridSearch(gridRef)
    const columnSettingState = useGridColumnSettingState({
      enabled: persistColumnSettings,
      screenCd,
      gridId,
    })

    const t = useCallback(
      (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
      [translate],
    )
    const visibleDetails = useMemo(() => getActiveChitDetails(details), [details])
    const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number")
    const softDeletedCount = useMemo(
      () => details.reduce((count, item) => count + (item.ISDEL ? 1 : 0), 0),
      [details],
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
      const rowElements = Array.from(container.querySelectorAll(".dx-datagrid-rowsview .dx-data-row")).filter(
        (element) => !(element as HTMLElement).classList.contains("dx-freespace-row"),
      )
      const measuredRowHeight = Math.ceil(
        (rowElements[0] as HTMLElement | undefined)?.getBoundingClientRect().height ?? DEFAULT_ROW_HEIGHT,
      )
      const measuredChromeHeight = Math.max(
        DEFAULT_CHROME_HEIGHT,
        headerPanelHeight + headersHeight + filterPanelHeight + 4,
      )
      const nextRowCount = Math.max(rowElements.length, visibleDetails.length)

      setRowHeight((current) => (current === measuredRowHeight ? current : measuredRowHeight))
      setChromeHeight((current) => (current === measuredChromeHeight ? current : measuredChromeHeight))
      setEffectiveRowCount((current) => (current === nextRowCount ? current : nextRowCount))
    }, [visibleDetails.length])

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
        ? normalizeChitDetailRows(source).map((item) => cloneChitDetail(item))
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
          return cloneChitDetail({
            ...item,
            ISDEL: true,
          })
        })

        if (!changed) {
          return
        }

        const nextVisibleRows = getActiveChitDetails(nextRows)
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
            ? cloneChitDetail({
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

    const handleFocusedRowChanged = useCallback((event: FocusedRowChangedEvent<ChitDetail, string>) => {
      const nextKey = event.row?.key
      setFocusedRowKey(typeof nextKey === "string" ? nextKey : nextKey != null ? String(nextKey) : null)
    }, [])

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
          gridRef.current?.addRow()
        },
        deleteFocusedRow: () => {
          const targetKey = focusedRowKey ?? visibleDetails[visibleDetails.length - 1]?.ROW_KEY ?? null
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
      [focusSearchInput, focusedRowKey, searchVisible, showSearch, softDeleteRowByKey, syncRows, visibleDetails],
    )

    const handleInitialized = useCallback((event: InitializedEvent<ChitDetail, string>) => {
      gridRef.current = event.component ?? null
      if (columnSettingState.cachedEditorItems.length) {
        columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
      }
    }, [columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent])

    const handleContentReady = useCallback(
      (_event: ContentReadyEvent<ChitDetail, string>) => {
        refreshGridLayout()
      },
      [refreshGridLayout],
    )

    const handleSaved = useCallback(
      (_event: SavedEvent<ChitDetail, string>) => {
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

      setEffectiveRowCount(visibleDetails.length)
      refreshGridLayout()
    }, [isVisible, layoutVersion, refreshGridLayout, visibleDetails.length])

    useEffect(() => {
      setFocusedRowKey((current) => {
        if (current && visibleDetails.some((item) => item.ROW_KEY === current)) {
          return current
        }

        return visibleDetails[0]?.ROW_KEY ?? null
      })
    }, [visibleDetails])

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
      details,
      isVisible,
    ])

    useEffect(() => clearPendingLayoutRefresh, [clearPendingLayoutRefresh])

    const gridHeight = useMemo(() => {
      if (height !== undefined) {
        return height
      }

      const maxGridHeight = Math.max(240, Math.min(DEFAULT_MAX_GRID_HEIGHT, viewportHeight - VIEWPORT_VERTICAL_OFFSET))
      const visibleRowCount = Math.max(effectiveRowCount, 1)
      return Math.min(chromeHeight + visibleRowCount * rowHeight, maxGridHeight)
    }, [chromeHeight, effectiveRowCount, height, rowHeight, viewportHeight])

    return (
      <div
        ref={containerRef}
        className="w-full overflow-hidden data-grid-container"
        style={{ height: gridHeight }}
      >
        <DataGrid<ChitDetail, string>
          dataSource={visibleDetails}
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
          onInitNewRow={(event) => {
            setEffectiveRowCount((current) => current + 1)
            event.data = createDefaultChitDetail(visibleDetails.length + 1, companyCd)
          }}
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
            allowAdding={true}
            allowUpdating={true}
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
              <Button
                text={t("Undelete", "Hoàn tác")}
                stylingMode="outlined"
                hint={t("RESTORE_LAST_DELETED_ROW", "Restore the last deleted row")}
                disabled={softDeletedCount === 0}
                onClick={() => {
                  void undeleteLastRow()
                }}
              />
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
          {ChitDetailColumns ? (
            <ChitDetailColumns
              onSoftDeleteRow={(rowKey) => {
                void softDeleteRowByKey(rowKey)
              }}
              onOpenInventoryRow={(rowKey) => {
                const targetKey = rowKey ?? focusedRowKey ?? null
                if (!targetKey) {
                  return
                }

                setFocusedRowKey(targetKey)
                requestAnimationFrame(() => {
                  gridRef.current?.navigateToRow?.(targetKey)
                })
                onOpenInventoryRow?.(targetKey)
              }}
            />
          ) : null}
        </DataGrid>
      </div>
    )
  },
)

export default ChitDetailGridPopup
