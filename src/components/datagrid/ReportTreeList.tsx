import React, {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
  type PointerEvent as ReactPointerEvent,
} from "react"
import TreeList, {
  Column,
  ColumnFixing,
  FilterPanel,
  FilterRow,
  HeaderFilter,
  Scrolling,
  StateStoring,
} from "devextreme-react/tree-list"
import type dxTreeList from "devextreme/ui/tree_list"
import ScrollView from "devextreme-react/scroll-view"
import { formatNumber } from "devextreme/localization"
import type dxScrollView from "devextreme/ui/scroll_view"
import type {
  CellPreparedEvent,
  ContentReadyEvent,
  ContextMenuPreparingEvent,
  InitializedEvent,
  RowDblClickEvent as TreeRowDblClickEvent,
  RowPreparedEvent,
} from "devextreme/ui/tree_list"
// Report pages drill down with the shared handler typed against the DataGrid
// event, so keep the same shape and forward the TreeList event untouched.
import type { RowDblClickEvent } from "devextreme/ui/data_grid"

import type { ConfiguredReportPreview, ReportPreviewColumn } from "@/api/configuredReportPreviewApi"
import GridColumnSettingsPopup from "@/components/datagrid/GridColumnSettingsPopup"
import { applyGridColumnSettingsToChildren } from "@/components/datagrid/gridColumnSettingRender"
import { hasSearchText, syncGridSearchState } from "@/components/datagrid/gridSearch"
import {
  useGridColumnSettingState,
  type GridColumnSettingEditorItem,
} from "@/components/datagrid/useGridColumnSettingState"
import { LanguageContext } from "@/lib/i18nLoader"
import { useCompanyLangRevision } from "@/lib/companyLang"
import { isReportSystemField } from "@/lib/reportSystemFields"
import {
  TEMP_DECIMAL_PLACE_OPTIONS,
  REPORT_CELL_KEY_ATTR,
  buildCellRangeKeys,
  buildSelectedCellsClipboardText,
  computeReportCellSelectionStats,
  copyTextToClipboard,
  makeReportCellKey,
  mergeUniqueCellKeys,
  normalizeColumnKey,
  resolveColumnDataType,
  resolveColumnDisplayFormat,
  resolveReportCellKeyFromTarget,
  syncReportCellSelectionHighlights,
  toggleCellKey,
  toLocalizedReportDataGridRows,
  type ReportDataGridRow,
} from "./ReportDataGrid"

function customizeZeroAsBlankText(cellInfo: { value?: unknown; valueText?: string }): string {
  const value = cellInfo.value
  const numericValue = typeof value === "number"
    ? value
    : typeof value === "string" && value.trim() !== "" ? Number(value) : NaN
  return numericValue === 0 ? "" : cellInfo.valueText ?? ""
}

export type ReportTreeRow = ReportDataGridRow & {
  ID: string
  PARENT_ID: string | null
  ROW_TYPE: string
  ROW_LEVEL: number
}

export type ReportTreeListHandle = {
  openColumnSettings: () => Promise<boolean>
}

export type ReportTreeListProps = {
  preview: ConfiguredReportPreview | null
  loading: boolean
  searchText: string
  reportCode: string
  menuCode?: string
  onRowDblClick?: (event: RowDblClickEvent<ReportDataGridRow, string>) => void
}

/**
 * Report procedures expose the outline metadata either with the report/grid
 * system prefix (`__ROW_KEY`, `__PARENT_ROW_KEY`, ...) or with the bare column
 * name, depending on the deployed procedure version. Read both so the tree keeps
 * working with either shape instead of silently falling back to a flat list.
 */
const TECHNICAL_FIELD_ALIASES = {
  ROW_KEY: ["__ROW_KEY", "ROW_KEY"],
  PARENT_ROW_KEY: ["__PARENT_ROW_KEY", "PARENT_ROW_KEY"],
  ROW_TYPE: ["__ROW_TYPE", "ROW_TYPE"],
  ROW_LEVEL: ["__ROW_LEVEL", "ROW_LEVEL"],
  ROW_SORT: ["__ROW_SORT", "ROW_SORT"],
} as const

const HIDDEN_TECHNICAL_FIELDS = new Set<string>([
  ...Object.values(TECHNICAL_FIELD_ALIASES).flat(),
  "COMPANY_CD",
])

const ROW_TYPE_TOTAL_ROWS = new Set(["TOTAL", "TOTAL_FOOTER", "OPENING_TOTAL", "TOTAL_PERIOD", "ENDING_TOTAL"])
const ROW_TYPE_GROUP_ROWS = new Set(["GROUP", "SECTION"])

function readTechnicalField(row: ReportDataGridRow, aliases: readonly string[]): string | null {
  const entries = Object.entries(row)

  for (const alias of aliases) {
    const match = entries.find(([key]) => key.toUpperCase() === alias)
    if (!match || match[1] === null || match[1] === undefined) {
      continue
    }

    const value = String(match[1]).trim()
    if (value) {
      return value
    }
  }

  return null
}

function resolveRowLevel(row: ReportDataGridRow): number {
  const levelValue = Number(readTechnicalField(row, TECHNICAL_FIELD_ALIASES.ROW_LEVEL) ?? 0)
  return Number.isFinite(levelValue) ? Math.max(0, Math.floor(levelValue)) : 0
}

function resolveRowType(row: ReportDataGridRow): string {
  return readTechnicalField(row, TECHNICAL_FIELD_ALIASES.ROW_TYPE)?.toUpperCase() ?? ""
}

function isTechnicalDisplayField(fieldName: string): boolean {
  return isReportSystemField(fieldName) || HIDDEN_TECHNICAL_FIELDS.has(fieldName.trim().toUpperCase())
}

/**
 * Builds the flat key/parent-key pairs TreeList needs. Row order is the display
 * order produced by the report, so when a procedure omits the parent key the
 * hierarchy is derived from the row level plus the nearest shallower row.
 */
function resolveTreeRows(rows: ReportDataGridRow[]): ReportTreeRow[] {
  const sourceKeys = rows.map((row, index) => {
    return readTechnicalField(row, TECHNICAL_FIELD_ALIASES.ROW_KEY) ?? row.ROW_KEY ?? String(index + 1)
  })

  // TreeList needs unique keys. Duplicated report keys keep the first row's id
  // as the parent target and get a suffixed id, instead of throwing and
  // blanking the whole report.
  const firstIdBySourceKey = new Map<string, string>()
  const usedIds = new Set<string>()
  const idByIndex = sourceKeys.map((sourceKey, index) => {
    const knownId = firstIdBySourceKey.get(sourceKey)
    if (knownId !== undefined) {
      let candidate = `${sourceKey}#${index}`
      let suffix = index
      while (usedIds.has(candidate)) {
        suffix += 1
        candidate = `${sourceKey}#${suffix}`
      }
      usedIds.add(candidate)
      return candidate
    }

    usedIds.add(sourceKey)
    firstIdBySourceKey.set(sourceKey, sourceKey)
    return sourceKey
  })

  const previousRowKeyByLevel = new Map<number, string>()

  return rows.map((row, index) => {
    const id = idByIndex[index]
    const rowType = resolveRowType(row)
    const level = resolveRowLevel(row)
    const explicitParentKey = readTechnicalField(row, TECHNICAL_FIELD_ALIASES.PARENT_ROW_KEY)
    const isFooter = rowType === "TOTAL_FOOTER"

    for (const knownLevel of Array.from(previousRowKeyByLevel.keys())) {
      if (knownLevel >= level) {
        previousRowKeyByLevel.delete(knownLevel)
      }
    }

    const parentFromPreviousLevel = level > 0 ? previousRowKeyByLevel.get(level - 1) ?? null : null
    if (!isFooter) {
      previousRowKeyByLevel.set(level, id)
    }

    const parentSourceKey = explicitParentKey ?? parentFromPreviousLevel
    const parentId = isFooter ? null : parentSourceKey ? firstIdBySourceKey.get(parentSourceKey) ?? null : null

    return { ...row, ROW_KEY: id, ID: id, PARENT_ID: parentId, ROW_TYPE: rowType, ROW_LEVEL: level }
  })
}

function ReportTreeList(
  { preview, loading, searchText, reportCode, menuCode, onRowDblClick }: ReportTreeListProps,
  ref: ForwardedRef<ReportTreeListHandle>,
) {
  const { translate } = useContext(LanguageContext)
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])
  const companyLangRevision = useCompanyLangRevision()
  const treeListRef = useRef<dxTreeList<ReportTreeRow, string> | null>(null)
  const treeListHostRef = useRef<HTMLDivElement | null>(null)
  const [allRowsExpanded, setAllRowsExpanded] = useState(false)
  const [tempDecimalPlacesByField, setTempDecimalPlacesByField] = useState<Record<string, number>>({})
  const [selectedCellKeys, setSelectedCellKeys] = useState<string[]>([])
  const selectedCellKeysRef = useRef<string[]>([])
  const selectionAnchorRef = useRef<string | null>(null)
  const dragSelectionRef = useRef<{ active: boolean; anchor: string; base: string[]; additive: boolean; moved: boolean } | null>(null)

  const columns = useMemo(
    () => (preview?.COLUMNS ?? []).filter((column) => !isTechnicalDisplayField(column.FIELD_NAME)),
    [preview?.COLUMNS],
  )
  const treeRows = useMemo(
    () => resolveTreeRows(toLocalizedReportDataGridRows(preview, t, reportCode)),
    [preview, reportCode, t],
  )
  // Optional procedure metadata controls initial expansion without report-specific logic.
  const defaultExpandAll = useMemo(() => {
    const setting = treeRows
      .map((row) => readTechnicalField(row, ["__TREE_EXPAND_ALL", "TREE_EXPAND_ALL"]))
      .find((value) => value !== null)
    return setting == null || !["0", "FALSE", "N", "NO"].includes(setting.toUpperCase())
  }, [treeRows])

  const parentIds = useMemo(() => {
    const idsWithChildren = new Set(
      treeRows.flatMap((row) => (row.PARENT_ID ? [row.PARENT_ID] : [])),
    )
    return treeRows.filter((row) => idsWithChildren.has(row.ID)).map((row) => row.ID)
  }, [treeRows])
  const defaultExpandedIds = useMemo(
    () => (defaultExpandAll ? parentIds : []),
    [defaultExpandAll, parentIds],
  )
  const syncExpandedState = useCallback(() => {
    const instance = treeListRef.current
    setAllRowsExpanded(Boolean(instance && parentIds.length && parentIds.every((key) => instance.isRowExpanded(key))))
  }, [parentIds])

  const searchVisible = hasSearchText(searchText)
  const numberFieldNames = useMemo(() => new Set(columns.filter((column) => resolveColumnDataType(column) === "number").map((column) => normalizeColumnKey(column.FIELD_NAME))), [columns])
  const rowsByKey = useMemo(() => new Map(treeRows.map((row) => [row.ROW_KEY, row] as const)), [treeRows])
  const selectionStats = useMemo(() => computeReportCellSelectionStats(rowsByKey, new Set(selectedCellKeys), numberFieldNames), [rowsByKey, selectedCellKeys, numberFieldNames])
  const [horizontalScrollNeeded, setHorizontalScrollNeeded] = useState(false)
  const [horizontalScrollContentWidth, setHorizontalScrollContentWidth] = useState(1)
  const hScrollProxyRef = useRef<dxScrollView | null>(null)
  const hScrollPaneRef = useRef<HTMLDivElement | null>(null)
  const horizontalScrollSyncingRef = useRef(false)
  const rowsSignature = useMemo(() => treeRows.map((row) => row.ID).join("|"), [treeRows])
  const expandedSignatureRef = useRef("")

  const applyDefaultExpansion = useCallback(() => {
    const instance = treeListRef.current
    if (!instance || expandedSignatureRef.current === rowsSignature) {
      return
    }

    expandedSignatureRef.current = rowsSignature
    defaultExpandedIds.forEach((key) => instance.expandRow(key))
  }, [defaultExpandedIds, rowsSignature])

  const handleInitialized = useCallback(
    (event: InitializedEvent<ReportTreeRow, string>) => {
      treeListRef.current = event.component ?? null
    },
    [],
  )
  const handleContentReady = useCallback(
    (event: ContentReadyEvent<ReportTreeRow, string>) => {
      treeListRef.current = event.component ?? treeListRef.current
      applyDefaultExpansion()
      syncGridSearchState(treeListRef.current, searchText)
      syncExpandedState()
    },
    [applyDefaultExpansion, searchText, syncExpandedState],
  )

  useEffect(() => {
    expandedSignatureRef.current = ""
    applyDefaultExpansion()
  }, [applyDefaultExpansion, rowsSignature])

  useEffect(() => {
    syncGridSearchState(treeListRef.current, searchText)
  }, [searchText])

  const handleExpandAll = useCallback(() => {
    parentIds.forEach((key) => treeListRef.current?.expandRow(key))
  }, [parentIds])
  const handleCollapseAll = useCallback(() => {
    parentIds.forEach((key) => treeListRef.current?.collapseRow(key))
  }, [parentIds])
  const handleToggleAll = useCallback(() => {
    const instance = treeListRef.current
    if (!instance) return
    if (parentIds.every((key) => instance.isRowExpanded(key))) handleCollapseAll()
    else handleExpandAll()
    syncExpandedState()
  }, [parentIds, handleCollapseAll, handleExpandAll, syncExpandedState])
  const updateHeaderToggleButton = useCallback((button: HTMLButtonElement, expanded: boolean) => {
    button.textContent = expanded ? "−" : "+"
    button.disabled = parentIds.length === 0
    button.title = expanded ? t("COLLAPSE_ALL", "Thu gọn tất cả") : t("EXPAND_ALL", "Mở rộng tất cả")
    button.setAttribute("aria-label", button.title)
    button.setAttribute("aria-expanded", String(expanded))
  }, [parentIds.length, t])

  useEffect(() => {
    treeListHostRef.current?.querySelectorAll<HTMLButtonElement>(".report-tree-toggle-all")
      .forEach((button) => updateHeaderToggleButton(button, allRowsExpanded))
  }, [allRowsExpanded, updateHeaderToggleButton])
  const handleRowDblClick = useCallback(
    (event: TreeRowDblClickEvent<ReportTreeRow, string>) => {
      const row = event.data
      const hasChildren = Boolean(row && parentIds.includes(row.ID))

      if (row && hasChildren) {
        const treeList = treeListRef.current
        const isExpanded = treeList?.isRowExpanded(row.ID) ?? false
        if (isExpanded) {
          treeList?.collapseRow(row.ID)
        } else {
          void treeList?.expandRow(row.ID)
        }
        return
      }

      const rowType = resolveRowType((row ?? {}) as ReportDataGridRow)
      if (ROW_TYPE_GROUP_ROWS.has(rowType) || ROW_TYPE_TOTAL_ROWS.has(rowType)) {
        return
      }

      onRowDblClick?.(event as unknown as RowDblClickEvent<ReportDataGridRow, string>)
    },
    [onRowDblClick, parentIds, reportCode],
  )
  const handleRowPrepared = useCallback(
    (event: RowPreparedEvent<ReportTreeRow, string>) => {
      if (event.rowType !== "data" || !event.data) {
        return
      }

      event.rowElement?.setAttribute("data-report-row-type", event.data.ROW_TYPE)
      if (event.data.ROW_TYPE === "GROUP") {
        event.rowElement?.classList.add("font-semibold", "bg-blue-50")
      } else if (event.data.ROW_TYPE === "SECTION") {
        event.rowElement?.classList.add("font-semibold", "bg-slate-50")
      } else if (ROW_TYPE_TOTAL_ROWS.has(event.data.ROW_TYPE)) {
        event.rowElement?.classList.add("font-semibold", "bg-slate-100")
      }
    },
    [],
  )

  const resolvedGridId = reportCode.trim()
  const columnSettingState = useGridColumnSettingState({
    enabled: true,
    menuCode,
    gridId: resolvedGridId,
    hideColumnsMissingFromSettings: true,
  })
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsLoading, setColumnSettingsLoading] = useState(false)
  const [columnSettingsItems, setColumnSettingsItems] = useState<GridColumnSettingEditorItem[]>([])
  const columnSettingsTargetKey = columnSettingState.targetIdentity ?? `${menuCode ?? ""}::${resolvedGridId}`
  const columnSettingsTargetKeyRef = useRef(columnSettingsTargetKey)
  const appliedColumnSettingsRef = useRef<{
    component: dxTreeList<ReportTreeRow, string>
    signature: string
  } | null>(null)
  const columnLayoutSignature = useMemo(
    () =>
      columnSettingState.cachedEditorItems
        .map((item) =>
          [item.columnName.toUpperCase(), item.visibleIndex ?? "", item.width ?? "", item.fixedPosition].join(":"),
        )
        .join("|"),
    [columnSettingState.cachedEditorItems],
  )

  useEffect(() => {
    columnSettingsTargetKeyRef.current = columnSettingsTargetKey
    setColumnSettingsVisible(false)
    setColumnSettingsLoading(false)
    setColumnSettingsItems([])
  }, [columnSettingsTargetKey])

  const columnChildren = useMemo(
    () => [
      ...columns.map((column: ReportPreviewColumn) => (
        <Column
          key={column.COLUMN_KEY}
          dataField={column.FIELD_NAME}
          caption={column.CAPTION}
          dataType={column.DATA_TYPE === "date" ? "date" : column.DATA_TYPE === "number" ? "number" : undefined}
          format={resolveColumnDisplayFormat(column, tempDecimalPlacesByField)}
          customizeText={resolveColumnDataType(column) === "number" ? customizeZeroAsBlankText : undefined}
          alignment={column.ALIGN}
          width={column.WIDTH || undefined}
          allowResizing
        />
      )),
      <Column key="__tree_id" dataField="ID" visible={false} allowHiding={false} showInColumnChooser={false} />,
      <Column
        key="__tree_parent_id"
        dataField="PARENT_ID"
        visible={false}
        allowHiding={false}
        showInColumnChooser={false}
      />,
      <Column
        key="__tree_row_type"
        dataField="ROW_TYPE"
        visible={false}
        allowHiding={false}
        showInColumnChooser={false}
      />,
      <Column
        key="__tree_row_level"
        dataField="ROW_LEVEL"
        visible={false}
        allowHiding={false}
        showInColumnChooser={false}
      />,
    ],
    [columns, tempDecimalPlacesByField],
  )
  const renderedColumnChildren = useMemo(() => {
    const configured = applyGridColumnSettingsToChildren(
      columnChildren,
      Column,
      columnSettingState.cachedEditorItems,
      columnSettingState.translateCaption,
      { hideColumnsMissingFromSettings: true },
    )
    // Temporary context-menu decimal formatting must win over persisted grid settings.
    // Otherwise saved formatType overwrites the user's temporary precision choice.
    return React.Children.map(configured, (child) => {
      if (!React.isValidElement(child)) return child
      const field = (child.props as { dataField?: string }).dataField
      const column = columns.find((item) => normalizeColumnKey(item.FIELD_NAME) === normalizeColumnKey(field))
      if (!column || tempDecimalPlacesByField[normalizeColumnKey(field)] === undefined) return child
      return React.cloneElement(child as React.ReactElement<{ format?: string }>, {
        format: resolveColumnDisplayFormat(column, tempDecimalPlacesByField),
      })
    })
    // columnLayoutSignature/companyLangRevision intentionally bust the memo when
    // cached settings arrays are replaced in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [columnChildren, columnLayoutSignature, companyLangRevision, columns, tempDecimalPlacesByField])

  const { cachedEditorItems: cachedColumnSettings, syncEditorItemsToComponent } = columnSettingState
  useEffect(() => {
    const component = treeListRef.current
    if (loading || !component || !cachedColumnSettings.length) {
      return
    }
    const signature = JSON.stringify([companyLangRevision, cachedColumnSettings])
    if (appliedColumnSettingsRef.current?.component === component &&
        appliedColumnSettingsRef.current.signature === signature) {
      return
    }
    // Applying column options can repaint rows. Selection state must not replay them.
    appliedColumnSettingsRef.current = { component, signature }
    syncEditorItemsToComponent(component, cachedColumnSettings)
  }, [syncEditorItemsToComponent, cachedColumnSettings,
    columnLayoutSignature, companyLangRevision, loading])

  const openColumnSettings = useCallback(async (): Promise<boolean> => {
    const component = treeListRef.current
    if (!columnSettingState.enabled || !component) {
      return false
    }

    const targetKey = columnSettingsTargetKeyRef.current
    const shouldShowLoading =
      columnSettingState.cachedEditorItems.length === 0 && columnSettingsItems.length === 0
    setColumnSettingsItems([])
    setColumnSettingsVisible(true)
    if (shouldShowLoading) {
      setColumnSettingsLoading(true)
    }

    try {
      const items = await columnSettingState.loadEditorItems(component)
      if (columnSettingsTargetKeyRef.current !== targetKey) {
        return false
      }
      setColumnSettingsItems(items)
      return true
    } finally {
      if (shouldShowLoading && columnSettingsTargetKeyRef.current === targetKey) {
        setColumnSettingsLoading(false)
      }
    }
  }, [columnSettingState, columnSettingsItems.length])

  useImperativeHandle(ref, () => ({ openColumnSettings }), [openColumnSettings])

  const handleColumnSettingsSave = useCallback(
    async (items: GridColumnSettingEditorItem[]) => {
      const targetKey = columnSettingsTargetKeyRef.current
      const component = treeListRef.current
      const savedItems = component
        ? await columnSettingState.applyEditorItemsToComponent(component, items)
        : await columnSettingState.saveEditorItems(items)

      if (columnSettingsTargetKeyRef.current !== targetKey) {
        return
      }
      setColumnSettingsItems(savedItems)
      setColumnSettingsVisible(false)
    },
    [columnSettingState],
  )
  const handleColumnSettingsReset = useCallback(async () => {
    setColumnSettingsItems(await columnSettingState.resetEditorItems(treeListRef.current))
  }, [columnSettingState])
  const handleColumnTemplateChange = useCallback(
    async (templateId: number) => {
      setColumnSettingsItems(await columnSettingState.changeTemplate(templateId, treeListRef.current))
    },
    [columnSettingState],
  )
  const handleColumnTemplateCreate = useCallback(
    async (payload: { templateName: string; isDefaultTemplate: boolean }) => {
      setColumnSettingsItems(await columnSettingState.createTemplate(payload, treeListRef.current))
    },
    [columnSettingState],
  )
  const handleColumnTemplateSetDefault = useCallback(
    async (templateId: number) => {
      await columnSettingState.setDefaultTemplate(templateId)
    },
    [columnSettingState],
  )


  const getVisibleSelectionRows = useCallback((): ReportTreeRow[] => {
    const visible = treeListRef.current?.getVisibleRows() ?? []
    return visible.filter((row) => row.rowType === "data" && row.data).map((row) => row.data as ReportTreeRow)
  }, [])

  const getVisibleSelectionFields = useCallback((): string[] => {
    const allowed = new Set(columns.map((column) => normalizeColumnKey(column.FIELD_NAME)))
    return (treeListRef.current?.getVisibleColumns() ?? [])
      .map((column) => typeof column.dataField === "string" ? column.dataField : "")
      .filter((field) => allowed.has(normalizeColumnKey(field)))
  }, [columns])

  const applySelectedCellKeys = useCallback((keys: string[], commit = true) => {
    selectedCellKeysRef.current = keys
    syncReportCellSelectionHighlights(treeListHostRef.current, new Set(keys))
    if (commit) {
      setSelectedCellKeys((current) =>
        current.length === keys.length && current.every((key, index) => key === keys[index])
          ? current
          : keys,
      )
    }
  }, [])

  const clearSelectedCells = useCallback(() => {
    dragSelectionRef.current = null
    selectionAnchorRef.current = null
    applySelectedCellKeys([])
  }, [applySelectedCellKeys])

  useEffect(() => {
    clearSelectedCells()
  }, [treeRows, searchText, clearSelectedCells])

  useEffect(() => {
    setTempDecimalPlacesByField({})
  }, [reportCode])

  const handleCellPrepared = useCallback((event: CellPreparedEvent<ReportTreeRow, string>) => {
    const cell = event.cellElement
    if (!cell) return
    if (event.rowType === "header" && event.columnIndex === 0) {
      let button = cell.querySelector<HTMLButtonElement>(".report-tree-toggle-all")
      if (!button) {
        button = document.createElement("button")
        button.type = "button"
        button.className = "report-tree-toggle-all mr-1 inline-flex h-4 w-4 items-center justify-center rounded text-sm font-semibold leading-none text-slate-600 hover:bg-slate-200 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-500 disabled:opacity-40"
        button.addEventListener("pointerdown", (pointerEvent) => pointerEvent.stopPropagation())
        button.addEventListener("mousedown", (mouseEvent) => mouseEvent.stopPropagation())
        button.addEventListener("dblclick", (clickEvent) => clickEvent.stopPropagation())
        const caption = cell.querySelector(".dx-treelist-text-content, .dx-datagrid-text-content") ?? cell
        caption.prepend(button)
      }
      button.onclick = (clickEvent) => {
        clickEvent.stopPropagation()
        handleToggleAll()
      }
      updateHeaderToggleButton(button, parentIds.length > 0 && parentIds.every((key) => event.component.isRowExpanded(key)))
    }
    const field = typeof event.column?.dataField === "string" ? event.column.dataField : ""
    if (event.rowType !== "data" || !event.data?.ID ||
        !columns.some((column) => normalizeColumnKey(column.FIELD_NAME) === normalizeColumnKey(field))) {
      cell.removeAttribute(REPORT_CELL_KEY_ATTR)
      cell.classList.remove("report-cell-selected")
      return
    }
    const key = makeReportCellKey(event.data.ID, field)
    cell.setAttribute(REPORT_CELL_KEY_ATTR, key)
    cell.classList.toggle("report-cell-selected", selectedCellKeysRef.current.includes(key))
  }, [columns, handleToggleAll, parentIds, updateHeaderToggleButton])

  const handlePointerDown = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 ||
        (event.target instanceof Element && event.target.closest(".dx-scrollable-scrollbar, .dx-context-menu"))) return
    const key = resolveReportCellKeyFromTarget(event.target)
    if (!key) {
      clearSelectedCells()
      return
    }
    const additive = event.ctrlKey || event.metaKey
    const previous = selectedCellKeysRef.current
    const anchor = event.shiftKey ? selectionAnchorRef.current ?? previous[0] ?? key : key
    const range = event.shiftKey
      ? buildCellRangeKeys(anchor, key, getVisibleSelectionRows(), getVisibleSelectionFields())
      : [key]
    dragSelectionRef.current = { active: true, anchor, base: additive ? [...previous] : [], additive, moved: false }
    if (!event.shiftKey) selectionAnchorRef.current = key
    applySelectedCellKeys(additive ? mergeUniqueCellKeys(previous, range) : range, false)
  }, [applySelectedCellKeys, clearSelectedCells, getVisibleSelectionRows, getVisibleSelectionFields])

  const handlePointerMove = useCallback((event: ReactPointerEvent<HTMLDivElement>) => {
    const drag = dragSelectionRef.current
    if (!drag?.active) return
    // Match ReportDataGrid: suppress native text selection even when the
    // pointer crosses a non-data cell while a range selection is in progress.
    event.preventDefault()
    const key = resolveReportCellKeyFromTarget(event.target)
    if (!key) return
    if (!drag.moved && key === drag.anchor) return
    drag.moved = true
    const range = buildCellRangeKeys(drag.anchor, key, getVisibleSelectionRows(), getVisibleSelectionFields())
    applySelectedCellKeys(drag.additive ? mergeUniqueCellKeys(drag.base, range) : range, false)
  }, [applySelectedCellKeys, getVisibleSelectionRows, getVisibleSelectionFields])

  const finishSelection = useCallback(() => {
    const drag = dragSelectionRef.current
    if (!drag?.active) return
    dragSelectionRef.current = null
    const keys = drag.additive && !drag.moved
      ? toggleCellKey(drag.base, drag.anchor)
      : [...selectedCellKeysRef.current]
    applySelectedCellKeys(keys)
  }, [applySelectedCellKeys])

  useEffect(() => {
    window.addEventListener("pointerup", finishSelection)
    return () => window.removeEventListener("pointerup", finishSelection)
  }, [finishSelection])

  const copySelectedCells = useCallback(async () => {
    const selected = buildSelectedCellsClipboardText(
      selectedCellKeysRef.current, rowsByKey, getVisibleSelectionRows(), getVisibleSelectionFields(),
    )
    return copyTextToClipboard(selected)
  }, [rowsByKey, getVisibleSelectionRows, getVisibleSelectionFields])

  const copySelectionSum = useCallback(async () => {
    const stats = computeReportCellSelectionStats(rowsByKey, new Set(selectedCellKeysRef.current), numberFieldNames)
    return stats.numericCount > 0 ? copyTextToClipboard(String(stats.sum)) : false
  }, [rowsByKey, numberFieldNames])

  useEffect(() => {
    const handleCopy = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "c" ||
          selectedCellKeysRef.current.length === 0) return
      const target = event.target
      if (target instanceof HTMLElement &&
          (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable)) return
      event.preventDefault()
      void copySelectedCells()
    }
    window.addEventListener("keydown", handleCopy)
    return () => window.removeEventListener("keydown", handleCopy)
  }, [copySelectedCells])

  const handleContextMenuPreparing = useCallback((event: ContextMenuPreparingEvent<ReportTreeRow, string>) => {
    if (event.row?.rowType && event.row.rowType !== "data" && event.target !== "header") return
    const items = Array.isArray(event.items) ? [...event.items] : []
    const field = typeof event.column?.dataField === "string" ? event.column.dataField.trim() : ""
    const normalized = normalizeColumnKey(field)
    if (numberFieldNames.has(normalized)) {
      const caption = columns.find((column) => normalizeColumnKey(column.FIELD_NAME) === normalized)?.CAPTION ?? field
      items.push({
        text: t("REPORT_TEMP_DECIMAL", "Số chữ số thập phân tạm thời") + ": " + caption,
        beginGroup: items.length > 0,
        items: [
          { text: t("REPORT_TEMP_DECIMAL_DEFAULT", "Mặc định theo báo cáo"), onItemClick: () => setTempDecimalPlacesByField((current) => {
            const next = { ...current }
            delete next[normalized]
            return next
          }) },
          ...TEMP_DECIMAL_PLACE_OPTIONS.map((places) => ({
            text: places === 0 ? t("REPORT_TEMP_DECIMAL_0", "0 chữ số (số nguyên)") : t("REPORT_TEMP_DECIMAL_" + places, places + " chữ số thập phân"),
            onItemClick: () => setTempDecimalPlacesByField((current) => ({ ...current, [normalized]: places })),
          })),
        ],
      })
    }
    if (selectedCellKeysRef.current.length > 0) {
      items.push({ text: t("REPORT_COPY_CELLS", "Sao chép ô đã chọn"), beginGroup: true, onItemClick: () => { void copySelectedCells() } })
      items.push({ text: t("REPORT_COPY_SUM", "Sao chép tổng cộng"), onItemClick: () => { void copySelectionSum() } })
      items.push({ text: t("REPORT_CLEAR_CELL_SELECTION", "Bỏ chọn ô"), onItemClick: clearSelectedCells })
    }
    event.items = items
  }, [columns, numberFieldNames, t, clearSelectedCells, copySelectedCells, copySelectionSum])


  const resolveScrollable = useCallback(() => {
    const instance = treeListRef.current as (dxTreeList<ReportTreeRow, string> & {
      getScrollable?: () => {
        scrollWidth?: () => number
        clientWidth?: () => number
        scrollOffset?: () => { left?: number; top?: number }
        scrollTo?: (position: { left?: number; top?: number }) => void
        on?: (eventName: string, handler: () => void) => void
        off?: (eventName: string, handler: () => void) => void
      } | null
    }) | null
    return instance?.getScrollable?.() ?? null
  }, [])

  const getProxyScrollContainer = useCallback(() => {
    return hScrollProxyRef.current?.element()?.querySelector<HTMLElement>(".dx-scrollable-container") ?? null
  }, [])

  const syncScrollFromTree = useCallback(() => {
    const scrollable = resolveScrollable()
    if (!scrollable) return
    const maxLeft = Math.max(0, Number(scrollable.scrollWidth?.() ?? 0) - Number(scrollable.clientWidth?.() ?? 0))
    const needed = maxLeft > 2
    setHorizontalScrollNeeded((current) => current === needed ? current : needed)
    const proxy = getProxyScrollContainer()
    if (!proxy || proxy.clientWidth <= 0 || !needed) return
    const contentWidth = Math.max(1, Math.round(proxy.clientWidth + maxLeft))
    setHorizontalScrollContentWidth((current) => current === contentWidth ? current : contentWidth)
    if (horizontalScrollSyncingRef.current) return
    const left = Number(scrollable.scrollOffset?.()?.left ?? 0)
    if (Math.abs(proxy.scrollLeft - left) > 1) {
      horizontalScrollSyncingRef.current = true
      proxy.scrollLeft = left
      window.requestAnimationFrame(() => { horizontalScrollSyncingRef.current = false })
    }
  }, [resolveScrollable, getProxyScrollContainer])

  const handleProxyScroll = useCallback(() => {
    const proxy = getProxyScrollContainer()
    const scrollable = resolveScrollable()
    if (!proxy || !scrollable || horizontalScrollSyncingRef.current) return
    horizontalScrollSyncingRef.current = true
    const maxLeft = Math.max(0, Number(scrollable.scrollWidth?.() ?? 0) - Number(scrollable.clientWidth?.() ?? 0))
    scrollable.scrollTo?.({ left: Math.min(Math.max(0, proxy.scrollLeft), maxLeft) })
    window.requestAnimationFrame(() => { horizontalScrollSyncingRef.current = false })
  }, [getProxyScrollContainer, resolveScrollable])

  const handleProxyInitialized = useCallback((event: { component: dxScrollView }) => {
    hScrollProxyRef.current = event.component
    void event.component.update().then(syncScrollFromTree)
  }, [syncScrollFromTree])

  const handleProxyDisposing = useCallback(() => {
    hScrollProxyRef.current = null
  }, [])

  useLayoutEffect(() => {
    if (!horizontalScrollNeeded || !hScrollProxyRef.current) return
    void hScrollProxyRef.current.update().then(syncScrollFromTree)
  }, [horizontalScrollNeeded, horizontalScrollContentWidth, syncScrollFromTree])

  useEffect(() => {
    if (loading) {
      setHorizontalScrollNeeded(false)
      return
    }
    const scrollable = resolveScrollable()
    const onScroll = () => {
      if (!horizontalScrollSyncingRef.current) syncScrollFromTree()
    }
    scrollable?.on?.("scroll", onScroll)
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(syncScrollFromTree) : null
    if (treeListHostRef.current) observer?.observe(treeListHostRef.current)
    if (hScrollPaneRef.current) observer?.observe(hScrollPaneRef.current)
    window.addEventListener("resize", syncScrollFromTree)
    const timer = window.setInterval(syncScrollFromTree, 800)
    syncScrollFromTree()
    return () => {
      scrollable?.off?.("scroll", onScroll)
      observer?.disconnect()
      window.removeEventListener("resize", syncScrollFromTree)
      window.clearInterval(timer)
    }
  }, [loading, treeRows, columnLayoutSignature, resolveScrollable, syncScrollFromTree])


  // Selection summary updates must preserve the DOM between the two clicks.
  const renderedTreeList = useMemo(() => (
        <TreeList
          className="report-tree-list h-full"
          dataSource={treeRows}
          keyExpr="ID"
          parentIdExpr="PARENT_ID"
          filterMode="fullBranch"
          expandNodesOnFiltering
          onInitialized={handleInitialized}
          onContentReady={handleContentReady}
          onRowDblClick={handleRowDblClick}
          onRowExpanded={syncExpandedState}
          onRowCollapsed={syncExpandedState}
          onRowPrepared={handleRowPrepared}
          onCellPrepared={handleCellPrepared}
          onContextMenuPreparing={handleContextMenuPreparing}
          width="100%"
          height="100%"
          showBorders
          showRowLines
          showColumnLines
          columnAutoWidth={false}
          allowColumnResizing
          allowColumnReordering
          columnResizingMode="widget"
          wordWrapEnabled={false}
          autoExpandAll={defaultExpandAll}
          repaintChangesOnly
        >
          <Scrolling mode="virtual" rowRenderingMode="virtual" useNative={false} showScrollbar="always" scrollByThumb scrollByContent={false} />
          <ColumnFixing enabled />
          {columnSettingState.enabled ? (
            <StateStoring
              enabled
              type="custom"
              customLoad={columnSettingState.customLoad}
              customSave={columnSettingState.customSave}
              savingTimeout={500}
            />
          ) : null}
          <FilterRow visible={searchVisible} />
          <HeaderFilter visible />
          <FilterPanel visible={searchVisible} />
          {renderedColumnChildren}
        </TreeList>
  ), [
    treeRows,
    handleInitialized,
    handleContentReady,
    handleRowDblClick,
    syncExpandedState,
    handleRowPrepared,
    handleCellPrepared,
    handleContextMenuPreparing,
    defaultExpandAll,
    columnSettingState.enabled,
    columnSettingState.customLoad,
    columnSettingState.customSave,
    searchVisible,
    renderedColumnChildren,
  ])

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">{t("LOADING", "Đang tải...")}</div>
  }

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div
          ref={treeListHostRef}
          className="report-tree-list-host min-h-0 min-w-0 flex-1 overflow-hidden"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={finishSelection}
          onPointerLeave={finishSelection}
        >
          {renderedTreeList}

        </div>
        {horizontalScrollNeeded || selectionStats.numericCount > 0 ? (
          <div className={horizontalScrollNeeded ? "report-grid-footer" : "report-grid-footer report-grid-footer--summary-only"}>
            <div className="report-grid-summary">
              <div className="report-grid-summary-main">
                {selectionStats.numericCount > 0 ? (
                  <div className="report-grid-summary-metrics">
                    <span className="report-grid-metric report-grid-metric--emphasis">
                      <span className="report-grid-metric__label">{t("REPORT_CELL_SUM", "Tổng cộng")}</span>
                      <strong className="report-grid-metric__value">{formatNumber(selectionStats.sum, "#,##0.##")}</strong>
                    </span>
                    <span className="report-grid-metric">
                      <span className="report-grid-metric__label">{t("REPORT_CELL_AVG", "Trung bình")}</span>
                      <strong className="report-grid-metric__value">
                        {selectionStats.avg == null ? "—" : formatNumber(selectionStats.avg, "#,##0.##")}
                      </strong>
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
            {horizontalScrollNeeded ? (
              <div ref={hScrollPaneRef} className="report-grid-hscroll-pane">
                <ScrollView
                  className="report-grid-hscroll"
                  direction="horizontal"
                  useNative={false}
                  showScrollbar="always"
                  scrollByThumb
                  scrollByContent={false}
                  bounceEnabled={false}
                  width="100%"
                  height={18}
                  onInitialized={handleProxyInitialized}
                  onDisposing={handleProxyDisposing}
                  onScroll={handleProxyScroll}
                >
                  <div className="report-grid-hscroll-content" style={{ width: Math.max(horizontalScrollContentWidth, 1) }} />
                </ScrollView>
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
      <GridColumnSettingsPopup
        key={`${columnSettingsTargetKey}::column-settings`}
        visible={columnSettingsVisible}
        title={t("SYS_GRID_COLUMN_SETTING", "Thiết lập cột hiển thị")}
        items={columnSettingsItems}
        loading={columnSettingsLoading}
        onClose={() => setColumnSettingsVisible(false)}
        onReset={handleColumnSettingsReset}
        onSave={handleColumnSettingsSave}
        templates={columnSettingState.templateOptions}
        selectedTemplateId={columnSettingState.currentTemplateId}
        templateLoading={columnSettingState.templateLoading}
        onTemplateChange={handleColumnTemplateChange}
        onCreateTemplate={handleColumnTemplateCreate}
        onSetDefaultTemplate={handleColumnTemplateSetDefault}
      />
    </>
  )
}

export default forwardRef(ReportTreeList)
