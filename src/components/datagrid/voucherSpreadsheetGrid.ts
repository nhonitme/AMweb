import type dxDataGrid from "devextreme/ui/data_grid"
import type { KeyDownEvent, Properties as DataGridProperties, ToolbarPreparingEvent } from "devextreme/ui/data_grid"

type ToolbarItemLike = {
  name?: string
}

export const VOUCHER_SPREADSHEET_HIDDEN_TOOLBAR_ITEMS = new Set([
  "addRowButton",
  "saveButton",
  "revertButton",
])

export function prepareVoucherSpreadsheetToolbar(
  event: ToolbarPreparingEvent<unknown, string>,
): void {
  event.toolbarOptions = {
    ...(event.toolbarOptions ?? {}),
    items: (event.toolbarOptions?.items ?? []).filter(
      (item) => !VOUCHER_SPREADSHEET_HIDDEN_TOOLBAR_ITEMS.has((item as ToolbarItemLike).name ?? ""),
    ),
  }
}

export const VOUCHER_SPREADSHEET_GRID_CLASS = "am-voucher-spreadsheet-grid"

export const VOUCHER_SPREADSHEET_PAGE_SCROLL_GRID_CLASS = "am-voucher-spreadsheet-grid-page-scroll"

export const AM_GRID_READONLY_COLUMN_CELL_CLASS = "am-grid-readonly-column-cell"

export function isReadonlySpreadsheetColumn(
  column: GridColumnLike & { name?: string } | undefined,
  gridReadOnly: boolean,
): boolean {
  if (!column) {
    return false
  }

  if (column.type === "buttons" || column.command || column.name === "DETAIL_ACTIONS") {
    return false
  }

  if (gridReadOnly) {
    return true
  }

  return column.allowEditing === false
}

export const VOUCHER_SPREADSHEET_MIN_GRID_HEIGHT = 240

export const voucherSpreadsheetKeyboardNavigation: NonNullable<DataGridProperties["keyboardNavigation"]> = {
  enabled: true,
  editOnKeyPress: true,
  enterKeyAction: "moveFocus",
  enterKeyDirection: "column",
}

/** Excel-style: Alt+Enter / Shift+Enter inserts a line break in multiline cells. */
export function isSpreadsheetMultilineInsertKey(event: KeyboardEvent | null | undefined): boolean {
  if (!event || event.key !== "Enter") {
    return false
  }

  return Boolean(event.altKey || event.shiftKey)
}

export function resolveSpreadsheetKeyboardEvent(event: unknown): KeyboardEvent | null {
  if (!event || typeof event !== "object") {
    return null
  }

  const candidate = event as KeyboardEvent & { originalEvent?: KeyboardEvent }
  if (typeof candidate.key === "string") {
    return candidate
  }

  if (candidate.originalEvent && typeof candidate.originalEvent.key === "string") {
    return candidate.originalEvent
  }

  return null
}

export function normalizeSpreadsheetMultilineText(value: unknown): string {
  return String(value ?? "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
}

type TextEditorLike = {
  option: (name: string, value?: unknown) => unknown
  element?: () => HTMLElement | undefined
}

/** Inserts `\n` at the caret inside a dxTextArea / native textarea. */
export function insertSpreadsheetTextAreaNewline(editor: TextEditorLike | null | undefined): boolean {
  if (!editor) {
    return false
  }

  const root = editor.element?.()
  const input = (root?.querySelector?.("textarea") ?? null) as HTMLTextAreaElement | null
  const current = normalizeSpreadsheetMultilineText(editor.option("value"))

  if (!input) {
    editor.option("value", `${current}\n`)
    return true
  }

  const start = input.selectionStart ?? current.length
  const end = input.selectionEnd ?? current.length
  const next = `${current.slice(0, start)}\n${current.slice(end)}`
  editor.option("value", next)

  requestAnimationFrame(() => {
    const caret = start + 1
    input.focus()
    input.setSelectionRange(caret, caret)
  })

  return true
}

type GridColumnLike = {
  allowEditing?: boolean
  visible?: boolean
  type?: string
  command?: string
  index?: number
  visibleIndex?: number
}

export type { GridColumnLike }

export function isEditableVisibleColumn(column: GridColumnLike): boolean {
  if (column.type === "selection" || column.type === "buttons" || column.command) {
    return false
  }

  if (column.visible === false) {
    return false
  }

  return column.allowEditing !== false
}

export function createSpreadsheetContinueRowKeyDownHandler<T>(
  onContinueRow: () => void,
): (event: KeyDownEvent<T, string>) => void {
  return (event) => {
    const nativeEvent = event.event
    if (!nativeEvent) {
      return
    }

    const key = nativeEvent.key
    if (key !== "Enter" && key !== "Tab") {
      return
    }

    // Alt/Shift+Enter = xuống dòng trong ô (kiểu Excel), không thêm dòng mới.
    if (key === "Enter" && (nativeEvent.altKey || nativeEvent.shiftKey || nativeEvent.ctrlKey || nativeEvent.metaKey)) {
      return
    }

    if (key === "Tab" && nativeEvent.shiftKey) {
      return
    }

    const grid = event.component
    const visibleDataRows = grid.getVisibleRows().filter((row) => row.rowType === "data")
    if (visibleDataRows.length === 0) {
      return
    }

    const focusedRowIndex = grid.option("focusedRowIndex")
    if (typeof focusedRowIndex !== "number" || focusedRowIndex < 0) {
      return
    }

    const focusedRow = visibleDataRows.find((row) => row.rowIndex === focusedRowIndex)
    if (!focusedRow || focusedRow.rowType !== "data") {
      return
    }

    const visibleColumns = grid.getVisibleColumns()
    const editableColumns = visibleColumns.filter((column) => isEditableVisibleColumn(column as GridColumnLike))
    if (editableColumns.length === 0) {
      return
    }

    const focusedColumnIndex = grid.option("focusedColumnIndex")
    if (typeof focusedColumnIndex !== "number" || focusedColumnIndex < 0) {
      return
    }

    const focusedColumn = visibleColumns[focusedColumnIndex]
    if (!focusedColumn) {
      return
    }

    const editableColumnIndex = editableColumns.findIndex(
      (column) => column.index === focusedColumn.index || column.visibleIndex === focusedColumn.visibleIndex,
    )
    if (editableColumnIndex < 0) {
      return
    }

    const lastDataRowIndex = visibleDataRows[visibleDataRows.length - 1]?.rowIndex
    const isLastRow = focusedRowIndex === lastDataRowIndex
    const isLastEditableColumn = editableColumnIndex === editableColumns.length - 1

    if (!isLastRow || !isLastEditableColumn) {
      return
    }

    nativeEvent.preventDefault()
    void Promise.resolve(grid.saveEditData()).finally(() => {
      onContinueRow()
    })
  }
}

export function formatSpreadsheetSummaryNumber(value: number, fractionDigits = 0): string {
  return value.toLocaleString(undefined, {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  })
}

type ScrollableLike = {
  scrollOffset: () => { top: number; left: number }
  scrollTo: (target: { top?: number; left?: number }) => void
}

export function readGridScrollTop(grid: dxDataGrid<unknown, string | number> | null | undefined): number {
  const scrollable = grid?.getScrollable() as ScrollableLike | null | undefined
  return scrollable?.scrollOffset()?.top ?? 0
}

export function restoreGridScrollTopImmediate(
  grid: dxDataGrid<unknown, string | number> | null | undefined,
  scrollTop: number,
): void {
  if (!grid || scrollTop < 0) {
    return
  }

  const scrollable = grid.getScrollable() as ScrollableLike | null | undefined
  scrollable?.scrollTo({ top: scrollTop })
}

export function shouldKeepCurrentRowKeyOnDataSourceChange(
  grid: dxDataGrid<unknown, string | number> | null | undefined,
  currentRowKey: string | null,
  visibleRowKeys: readonly string[],
): boolean {
  if (!currentRowKey) {
    return false
  }

  if (visibleRowKeys.includes(currentRowKey)) {
    return true
  }

  if (!grid) {
    return false
  }

  if (grid.getRowIndexByKey(currentRowKey) >= 0) {
    return true
  }

  const editRowKey = grid.option("editing.editRowKey")
  return editRowKey === currentRowKey
}

export type VoucherSpreadsheetScrollSnapshot = {
  gridScrollTop: number
  containerScrollTop: number
}

export function restoreContainerScrollTop(
  container: HTMLElement | null | undefined,
  scrollTop: number,
): void {
  if (!container || scrollTop < 0) {
    return
  }

  container.scrollTop = scrollTop
}

export function focusNewRowWithoutTopJump(
  grid: dxDataGrid<unknown, string | number>,
  scrollTopBeforeAdd: number,
): void {
  const editRowKey = grid.option("editing.editRowKey")
  restoreGridScrollTopImmediate(grid, scrollTopBeforeAdd)

  if (typeof editRowKey !== "string" || editRowKey.length === 0) {
    return
  }

  requestAnimationFrame(() => {
    restoreGridScrollTopImmediate(grid, scrollTopBeforeAdd)
    if (grid.getRowIndexByKey(editRowKey) < 0) {
      return
    }

    void grid.navigateToRow(editRowKey)
  })
}

export function focusDetailCellWithoutScrollJump(
  grid: dxDataGrid<unknown, string | number>,
  rowKey: string,
  dataField: string,
  snapshot: Pick<VoucherSpreadsheetScrollSnapshot, "gridScrollTop"> & Partial<Pick<VoucherSpreadsheetScrollSnapshot, "containerScrollTop">>,
  container?: HTMLElement | null,
): void {
  restoreGridScrollTopImmediate(grid, snapshot.gridScrollTop)
  if (container && snapshot.containerScrollTop !== undefined) {
    restoreContainerScrollTop(container, snapshot.containerScrollTop)
  }

  const rowIndex = grid.getRowIndexByKey(rowKey)
  if (rowIndex < 0) {
    return
  }

  void grid.editCell(rowIndex, dataField)
  restoreGridScrollTopImmediate(grid, snapshot.gridScrollTop)
  if (container && snapshot.containerScrollTop !== undefined) {
    restoreContainerScrollTop(container, snapshot.containerScrollTop)
  }

  requestAnimationFrame(() => {
    restoreGridScrollTopImmediate(grid, snapshot.gridScrollTop)
    if (container && snapshot.containerScrollTop !== undefined) {
      restoreContainerScrollTop(container, snapshot.containerScrollTop)
    }
  })
}
