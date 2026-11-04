import { memo, useCallback, useEffect, useMemo, useRef } from "react"

import DataGrid, { Column, Paging, Scrolling, Selection } from "devextreme-react/data-grid"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { CellPreparedEvent, RowClickEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"

import type { CashflowFormulaOptionRow, FormulaOptionPreviewColumn } from "@/api/reportFormulaOptionApi"

import {
  buildFormulaDisplay,
  getDataSourceLabel,
  isVatHeaderRow,
  matchesLineFilter,
  normalizeText,
  type DataSourceMode,
  type TranslateFn,
} from "./formulaOptionsShared"

const previewNumberFormat = new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 })
const GRID_LOAD_PANEL = { enabled: false }

type GridRowUpdate = {
  type: "update"
  key: string
  data: FormulaGridRow
}

type FormulaDisplayCacheEntry = {
  stamp: string
  previewColumns: FormulaOptionPreviewColumn[]
  previewValuesByItemCode: Record<string, Record<string, unknown>>
  display: FormulaGridRow
}

type FormulaListGridProps = {
  rows: CashflowFormulaOptionRow[]
  selectedItemKey: string
  onSelectedItemKeyChange: (itemKey: string) => void
  previewColumns: FormulaOptionPreviewColumn[]
  previewValuesByItemCode: Record<string, Record<string, unknown>>
  lineFilter: string
  isVatDeclaration: boolean
  canonicalReportCode: string
  dataSourceMode: DataSourceMode
  t: TranslateFn
}

type FormulaGridRow = CashflowFormulaOptionRow & {
  __CAPTION_TEXT: string
  __VAT_CODES: string
  __FORMULA_TEXT: string
  __SOURCE_TEXT: string
  __VISIBLE_MARK: string
  __IS_HEADER: boolean
  [previewField: `PREVIEW_${string}`]: string
}

function previewFieldName(fieldName: string): `PREVIEW_${string}` {
  return `PREVIEW_${fieldName}`
}

function sameItemKeys(current: FormulaGridRow[], next: FormulaGridRow[]): boolean {
  if (current.length !== next.length) {
    return false
  }

  for (let index = 0; index < current.length; index += 1) {
    if (current[index]?.ITEM_KEY !== next[index]?.ITEM_KEY) {
      return false
    }
  }

  return true
}

function rowContentChanged(current: FormulaGridRow, next: FormulaGridRow): boolean {
  if (current === next) {
    return false
  }

  const currentRecord = current as Record<string, unknown>
  const nextRecord = next as Record<string, unknown>
  const nextKeys = Object.keys(nextRecord)
  if (Object.keys(currentRecord).length !== nextKeys.length) {
    return true
  }

  for (const key of nextKeys) {
    if (currentRecord[key] !== nextRecord[key]) {
      return true
    }
  }

  return false
}

function assignGridRow(target: FormulaGridRow, source: FormulaGridRow) {
  const targetRecord = target as Record<string, unknown>
  const sourceRecord = source as Record<string, unknown>
  Object.assign(targetRecord, sourceRecord)
  for (const key of Object.keys(targetRecord)) {
    if (!Object.prototype.hasOwnProperty.call(sourceRecord, key)) {
      delete targetRecord[key]
    }
  }
}

function formatPreviewCellValue(value: unknown): string {
  if (value == null || value === "") {
    return "—"
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return previewNumberFormat.format(value)
  }

  const parsed = Number(value)
  if (Number.isFinite(parsed) && String(value).trim() !== "") {
    return previewNumberFormat.format(parsed)
  }

  return String(value)
}

function readPreviewValue(
  values: Record<string, unknown> | undefined,
  fieldName: string,
): unknown {
  if (!values) {
    return null
  }

  const direct = values[fieldName]
  if (direct != null && direct !== "") {
    return direct
  }

  const normalizedField = fieldName.toUpperCase()
  const matchedKey = Object.keys(values).find((key) => key.toUpperCase() === normalizedField)
  return matchedKey ? values[matchedKey] : null
}

export const FormulaListGrid = memo(function FormulaListGrid({
  rows,
  selectedItemKey,
  onSelectedItemKeyChange,
  previewColumns,
  previewValuesByItemCode,
  lineFilter,
  isVatDeclaration,
  canonicalReportCode,
  dataSourceMode,
  t,
}: FormulaListGridProps) {
  const gridRef = useRef<dxDataGrid<FormulaGridRow, string> | null>(null)
  const selectedKeyRef = useRef(selectedItemKey)
  const onSelectedItemKeyChangeRef = useRef(onSelectedItemKeyChange)
  const selectionFromGridRef = useRef(false)
  const displayCacheRef = useRef(new WeakMap<CashflowFormulaOptionRow, FormulaDisplayCacheEntry>())
  const boundRowsRef = useRef<FormulaGridRow[] | null>(null)
  const untitledLabel = t("UNTITLED", "Chưa đặt tên")
  const headerLabel = t("DATA_SOURCE_HEADER", "Tiêu đề nhóm")

  onSelectedItemKeyChangeRef.current = onSelectedItemKeyChange

  const gridRows = useMemo<FormulaGridRow[]>(() => {
    const stamp = `${canonicalReportCode}|${dataSourceMode}|${isVatDeclaration ? 1 : 0}|${untitledLabel}|${headerLabel}`
    const sorted = [...rows].sort(
      (left, right) => left.SORT_ORDER - right.SORT_ORDER || left.ITEM_KEY.localeCompare(right.ITEM_KEY),
    )
    const filtered = isVatDeclaration && lineFilter.trim()
      ? sorted.filter((row) => matchesLineFilter(row, lineFilter))
      : sorted
    const cache = displayCacheRef.current

    return filtered.map((row) => {
      const cached = cache.get(row)
      if (
        cached
        && cached.stamp === stamp
        && cached.previewColumns === previewColumns
        && cached.previewValuesByItemCode === previewValuesByItemCode
      ) {
        return cached.display
      }

      const isHeader = isVatDeclaration && isVatHeaderRow(row)
      const formulaText = isHeader
        ? headerLabel
        : buildFormulaDisplay(row, canonicalReportCode, t)
      const sourceText = isHeader
        ? ""
        : getDataSourceLabel(normalizeText(row.DATA_SOURCE_TYPE), t, dataSourceMode)
      const vatCodes = [normalizeText(row.CODE_NO1), normalizeText(row.CODE_NO2)]
        .filter(Boolean)
        .map((code) => `[${code}]`)
        .join(" ")
      const itemCode = normalizeText(row.ITEM_CODE).toUpperCase()
      const previewValues = itemCode ? previewValuesByItemCode[itemCode] : undefined
      const previewFields: Record<string, string> = {}
      previewColumns.forEach((column) => {
        previewFields[previewFieldName(column.FIELD_NAME)] = formatPreviewCellValue(
          readPreviewValue(previewValues, column.FIELD_NAME),
        )
      })
      const display: FormulaGridRow = {
        ...row,
        __CAPTION_TEXT: row.CAPTION || untitledLabel,
        __VAT_CODES: vatCodes || "—",
        __FORMULA_TEXT: formulaText || "—",
        __SOURCE_TEXT: sourceText,
        __VISIBLE_MARK: row.IS_VISIBLE === "1" ? "✓" : "—",
        __IS_HEADER: isHeader,
        ...previewFields,
      }
      cache.set(row, {
        stamp,
        previewColumns,
        previewValuesByItemCode,
        display,
      })
      return display
    })
  }, [
    canonicalReportCode,
    dataSourceMode,
    headerLabel,
    isVatDeclaration,
    lineFilter,
    previewColumns,
    previewValuesByItemCode,
    rows,
    t,
    untitledLabel,
  ])

  if (boundRowsRef.current === null) {
    boundRowsRef.current = gridRows.slice()
  }
  const gridDataSource = boundRowsRef.current ?? gridRows

  const syncGridRowsRef = useRef<() => void>(() => {})
  syncGridRowsRef.current = () => {
    const bound = boundRowsRef.current
    const grid = gridRef.current
    if (!bound) {
      return
    }

    // A new dataSource array reloads the virtual grid and freezes the editor.
    // Keep one array and repaint only the edited row.
    if (!sameItemKeys(bound, gridRows)) {
      bound.splice(0, bound.length, ...gridRows)
      if (grid) {
        void grid.refresh(true)
      }
      return
    }

    const changes: GridRowUpdate[] = []
    for (let index = 0; index < gridRows.length; index += 1) {
      const current = bound[index]
      const next = gridRows[index]
      if (!current || !next || !rowContentChanged(current, next)) {
        continue
      }

      assignGridRow(current, next)
      changes.push({ type: "update", key: current.ITEM_KEY, data: current })
    }

    if (changes.length === 0 || !grid) {
      return
    }

    const loadedItems = grid.getDataSource()?.items() as FormulaGridRow[] | undefined
    const rowIndexes: number[] = []
    for (const change of changes) {
      const loaded = loadedItems?.find((item) => item?.ITEM_KEY === change.key)
      if (loaded && loaded !== change.data) {
        assignGridRow(loaded, change.data)
      }

      const rowIndex = grid.getRowIndexByKey(change.key)
      if (rowIndex >= 0) {
        rowIndexes.push(rowIndex)
      }
    }

    if (rowIndexes.length > 0) {
      grid.repaintRows(rowIndexes, true)
    }
  }

  useEffect(() => {
    syncGridRowsRef.current()
  }, [gridRows])

  const applyGridSelection = useCallback((itemKey: string) => {
    const grid = gridRef.current
    if (!grid || !itemKey) {
      return
    }

    const current = grid.getSelectedRowKeys?.() ?? []
    if (current.length === 1 && String(current[0]) === itemKey) {
      return
    }

    void grid.selectRows([itemKey], false)
  }, [])

  const selectRowKey = useCallback((itemKey: string) => {
    const nextKey = itemKey.trim()
    if (!nextKey || nextKey === selectedKeyRef.current) {
      return
    }

    // DevExtreme already paints the clicked row. Defer React state until the
    // next frame so mounting the detail editors cannot block that paint.
    selectedKeyRef.current = nextKey
    selectionFromGridRef.current = true
    window.requestAnimationFrame(() => {
      onSelectedItemKeyChangeRef.current(nextKey)
    })
  }, [])

  useEffect(() => {
    if (selectionFromGridRef.current && selectedItemKey === selectedKeyRef.current) {
      selectionFromGridRef.current = false
      return
    }

    selectionFromGridRef.current = false
    selectedKeyRef.current = selectedItemKey
    applyGridSelection(selectedItemKey)
  }, [applyGridSelection, selectedItemKey])

  const handleInitialized = useCallback((event: { component?: dxDataGrid<FormulaGridRow, string> }) => {
    gridRef.current = event.component ?? null
    if (selectedKeyRef.current) {
      void event.component?.selectRows([selectedKeyRef.current], false)
    }
    syncGridRowsRef.current()
  }, [])

  const handleRowClick = useCallback((event: RowClickEvent<FormulaGridRow, string>) => {
    selectRowKey(String(event.key ?? event.data?.ITEM_KEY ?? ""))
  }, [selectRowKey])

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent<FormulaGridRow, string>) => {
    // Keyboard / programmatic selection path. Ignore empty clears during click.
    const nextKey = String(event.selectedRowKeys?.[0] ?? "")
    if (!nextKey) {
      return
    }

    selectRowKey(nextKey)
  }, [selectRowKey])

  const handleCellPrepared = useCallback((event: CellPreparedEvent<FormulaGridRow, string>) => {
    if (event.rowType !== "data" || !event.data || !event.cellElement) {
      return
    }

    const row = event.data
    if (event.column?.dataField === "__CAPTION_TEXT") {
      const indent = Math.max(0, (row.LEVEL_NO || 1) - 1) * 12
      event.cellElement.style.paddingLeft = `${12 + indent}px`
      event.cellElement.style.fontWeight = row.__IS_HEADER ? "600" : "500"
    }

    if (event.column?.dataField === "ITEM_CODE") {
      event.cellElement.style.fontWeight = "600"
    }

    if (event.column?.dataField === "__FORMULA_TEXT") {
      event.cellElement.style.color = "#1d4ed8"
      event.cellElement.style.fontSize = "12px"
    }

    if (event.column?.dataField === "__VISIBLE_MARK") {
      event.cellElement.style.color = row.IS_VISIBLE === "1" ? "#059669" : "#94a3b8"
      event.cellElement.style.textAlign = "center"
    }

    if (String(event.column?.dataField ?? "").startsWith("PREVIEW_")) {
      const raw = event.value
      const hasValue = raw != null && raw !== "" && raw !== "—"
      event.cellElement.style.fontFamily = "ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace"
      event.cellElement.style.fontSize = "12px"
      event.cellElement.style.fontWeight = hasValue ? "600" : "400"
      event.cellElement.style.color = hasValue ? "#047857" : "#94a3b8"
      event.cellElement.style.textAlign = "right"
    }
  }, [])

  const handleRowPrepared = useCallback((event: { rowType?: string; data?: FormulaGridRow; rowElement?: HTMLElement }) => {
    if (event.rowType !== "data" || !event.data || !event.rowElement) {
      return
    }

    if (isVatDeclaration && event.data.__IS_HEADER) {
      event.rowElement.style.backgroundColor = "#f1f5f9"
      event.rowElement.style.fontWeight = "600"
      return
    }

    event.rowElement.style.backgroundColor = ""
    event.rowElement.style.fontWeight = ""
  }, [isVatDeclaration])

  const noDataText = isVatDeclaration && lineFilter.trim()
    ? t("NO_FILTER_MATCH", "Không có chỉ tiêu khớp bộ lọc")
    : t("NO_DATA", "Chưa có chỉ tiêu")

  return (
    <DataGrid
      dataSource={gridDataSource}
      keyExpr="ITEM_KEY"
      repaintChangesOnly={true}
      focusedRowEnabled={false}
      autoNavigateToFocusedRow={false}
      hoverStateEnabled={true}
      showBorders={isVatDeclaration}
      showRowLines={true}
      showColumnLines={isVatDeclaration}
      columnAutoWidth={false}
      wordWrapEnabled={false}
      height="100%"
      noDataText={noDataText}
      loadPanel={GRID_LOAD_PANEL}
      onInitialized={handleInitialized}
      onRowClick={handleRowClick}
      onSelectionChanged={handleSelectionChanged}
      onCellPrepared={handleCellPrepared}
      onRowPrepared={handleRowPrepared}
    >
      <Selection mode="single" showCheckBoxesMode="none" />
      <Scrolling mode="virtual" rowRenderingMode="virtual" preloadEnabled={true} useNative={true} />
      <Paging enabled={true} pageSize={40} />
      <Column
        caption={t("ORDER", "TT")}
        dataField="SORT_ORDER"
        width={56}
        alignment="center"
        allowSorting={false}
      />
      <Column
        caption={t("ITEM_CODE", "Mã CT")}
        dataField="ITEM_CODE"
        width={72}
        allowSorting={false}
      />
      {isVatDeclaration ? (
        <Column
          caption={t("VAT_CODES", "Mã [ ]")}
          dataField="__VAT_CODES"
          width={110}
          allowSorting={false}
        />
      ) : null}
      <Column
        caption={t("CAPTION", "Tên chỉ tiêu")}
        dataField="__CAPTION_TEXT"
        minWidth={180}
        allowSorting={false}
      />
      {previewColumns.map((column) => (
        <Column
          key={column.FIELD_NAME}
          caption={column.CAPTION || column.FIELD_NAME}
          dataField={previewFieldName(column.FIELD_NAME)}
          width={120}
          alignment="right"
          allowSorting={false}
        />
      ))}
      <Column
        caption={t("FORMULA_EXPR", "Cách lấy số")}
        dataField="__FORMULA_TEXT"
        minWidth={200}
        allowSorting={false}
      />
      <Column
        caption={t("IS_VISIBLE", "Hiện")}
        dataField="__VISIBLE_MARK"
        width={52}
        alignment="center"
        allowSorting={false}
      />
    </DataGrid>
  )
}, (prev, next) => (
  prev.rows === next.rows
  && prev.previewColumns === next.previewColumns
  && prev.previewValuesByItemCode === next.previewValuesByItemCode
  && prev.lineFilter === next.lineFilter
  && prev.isVatDeclaration === next.isVatDeclaration
  && prev.canonicalReportCode === next.canonicalReportCode
  && prev.dataSourceMode === next.dataSourceMode
  && prev.t === next.t
  && prev.onSelectedItemKeyChange === next.onSelectedItemKeyChange
))
