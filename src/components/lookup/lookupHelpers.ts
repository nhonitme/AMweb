export interface LookupGridCellValueHost {
  cellValue?: (rowIndex: number, fieldName: string, fieldValue: unknown) => void
  beginUpdate?: () => void
  endUpdate?: () => void
}

type LookupGridVisibleColumn = {
  dataField?: string
  name?: string
  index?: number
  visibleIndex?: number
}

type LookupGridFocusHost = LookupGridCellValueHost & {
  closeEditCell?: () => Promise<void> | void
  editCell?: (rowIndex: number, fieldName: string) => void
  focus?: (element?: Element) => void
  getCellElement?: (rowIndex: number, visibleColumnIndex: number) => unknown
  getVisibleColumns?: () => LookupGridVisibleColumn[]
}

export async function flushLookupGridEditCell(grid: LookupGridFocusHost | null | undefined): Promise<void> {
  if (!grid?.closeEditCell) {
    return
  }

  try {
    await grid.closeEditCell()
  } catch {
  }
}

export function getLookupOverlayContainer(): HTMLElement | undefined {
  if (typeof document === "undefined") {
    return undefined
  }

  // Append overlays to body so droplist escapes popup overflow:hidden,
  // same path for CUSTOMER_CD / DEBIT / CREDIT.
  return document.body
}

export const trimLookupText = (value: unknown): string => {
  if (typeof value === "string") {
    return value.trim()
  }

  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim()
}

export const firstLookupText = (...values: unknown[]): string => {
  for (const value of values) {
    const text = trimLookupText(value)
    if (text) {
      return text
    }
  }

  return ""
}

export const toLookupNumber = (value: unknown): number | null => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

export const setLookupGridCellValue = (
  grid: LookupGridCellValueHost | null | undefined,
  rowIndex: number,
  fieldName: string | undefined,
  fieldValue: unknown,
) => {
  if (!fieldName) {
    return
  }

  if (typeof rowIndex !== "number" || rowIndex < 0) {
    return
  }

  grid?.cellValue?.(rowIndex, fieldName, fieldValue)
}

export const setLookupGridCellValues = (
  grid: LookupGridCellValueHost | null | undefined,
  rowIndex: number,
  values: Record<string, unknown>,
) => {
  if (!grid || rowIndex < 0) {
    return
  }

  grid.beginUpdate?.()

  try {
    Object.entries(values).forEach(([fieldName, fieldValue]) => {
      setLookupGridCellValue(grid, rowIndex, fieldName, fieldValue)
    })
  } finally {
    grid.endUpdate?.()
  }
}

const toElement = (value: unknown): Element | null => {
  if (value instanceof Element) {
    return value
  }

  if (typeof value !== "object" || value === null) {
    return null
  }

  const getCandidate = (value as { get?: (index: number) => unknown }).get
  if (typeof getCandidate === "function") {
    const firstElement = getCandidate.call(value, 0)
    return firstElement instanceof Element ? firstElement : null
  }

  const indexedElement = (value as { 0?: unknown })[0]
  return indexedElement instanceof Element ? indexedElement : null
}

const getLookupGridCellElement = (
  grid: LookupGridFocusHost,
  rowIndex: number,
  fieldName: string,
): Element | null => {
  const visibleColumns = grid.getVisibleColumns?.() ?? []
  const columnIndex = visibleColumns.findIndex((column) => column.dataField === fieldName || column.name === fieldName)

  if (columnIndex < 0) {
    return null
  }

  const column = visibleColumns[columnIndex]
  const visibleColumnIndex =
    typeof column.visibleIndex === "number"
      ? column.visibleIndex
      : typeof column.index === "number"
        ? column.index
        : columnIndex

  return toElement(grid.getCellElement?.(rowIndex, visibleColumnIndex))
}

const getLookupEditorInput = (cellElement: Element | null): HTMLElement | null => {
  if (!cellElement) {
    return null
  }

  return cellElement.querySelector<HTMLElement>(
    ".am-grid-lookup-editor input.dx-texteditor-input, .am-grid-lookup-editor input, .dx-texteditor-input",
  )
}

const focusLookupGridCell = (
  grid: LookupGridFocusHost,
  rowIndex: number,
  fieldName: string,
): boolean => {
  const cellElement = getLookupGridCellElement(grid, rowIndex, fieldName)

  if (cellElement) {
    grid.focus?.(cellElement)

    const editorInput = getLookupEditorInput(cellElement)
    if (editorInput) {
      editorInput.focus()
      return cellElement.contains(document.activeElement)
    }
  }

  grid.editCell?.(rowIndex, fieldName)

  const editedCellElement = getLookupGridCellElement(grid, rowIndex, fieldName)
  const editedInput = getLookupEditorInput(editedCellElement)

  if (editedCellElement) {
    grid.focus?.(editedCellElement)
  }

  if (editedInput) {
    editedInput.focus()
    return editedCellElement?.contains(document.activeElement) ?? false
  }

  grid.focus?.()
  return false
}

export const restoreLookupGridCellFocus = (
  grid: LookupGridCellValueHost | null | undefined,
  rowIndex: number,
  fieldName: string | undefined,
) => {
  if (!grid || !fieldName) {
    return
  }

  if (typeof rowIndex !== "number" || rowIndex < 0) {
    return
  }

  const focusHost = grid as LookupGridFocusHost
  let attempt = 0

  const scheduleFocus = () => {
    window.setTimeout(() => {
      window.requestAnimationFrame(() => {
        const restored = focusLookupGridCell(focusHost, rowIndex, fieldName)
        if (!restored && attempt < 2) {
          attempt += 1
          scheduleFocus()
        }
      })
    }, 0)
  }

  scheduleFocus()
}

export const hasLookupRowField = (
  rowData: object | undefined,
  fieldName: string | undefined,
) => Boolean(rowData && fieldName && fieldName in rowData)

type LookupGridEditableColumn = LookupGridVisibleColumn & {
  allowEditing?: boolean
  visible?: boolean
}

export const focusNextEditableGridCell = (
  grid: LookupGridFocusHost | null | undefined,
  rowIndex: number,
  currentFieldName: string,
) => {
  if (!grid || rowIndex < 0 || !currentFieldName) {
    return
  }

  const visibleColumns = (grid.getVisibleColumns?.() ?? []) as LookupGridEditableColumn[]
  const editableColumns = visibleColumns.filter(
    (column) =>
      column.visible !== false &&
      column.allowEditing !== false &&
      typeof column.dataField === 'string' &&
      column.dataField.length > 0,
  )

  const currentIndex = editableColumns.findIndex((column) => column.dataField === currentFieldName)
  if (currentIndex < 0 || currentIndex >= editableColumns.length - 1) {
    restoreLookupGridCellFocus(grid, rowIndex, currentFieldName)
    return
  }

  const nextField = editableColumns[currentIndex + 1]?.dataField
  if (!nextField) {
    restoreLookupGridCellFocus(grid, rowIndex, currentFieldName)
    return
  }

  grid.editCell?.(rowIndex, nextField)
  restoreLookupGridCellFocus(grid, rowIndex, nextField)
}

export const focusPreviousEditableGridCell = (
  grid: LookupGridFocusHost | null | undefined,
  rowIndex: number,
  currentFieldName: string,
) => {
  if (!grid || rowIndex < 0 || !currentFieldName) {
    return
  }

  const visibleColumns = (grid.getVisibleColumns?.() ?? []) as LookupGridEditableColumn[]
  const editableColumns = visibleColumns.filter(
    (column) =>
      column.visible !== false &&
      column.allowEditing !== false &&
      typeof column.dataField === 'string' &&
      column.dataField.length > 0,
  )

  const currentIndex = editableColumns.findIndex((column) => column.dataField === currentFieldName)
  if (currentIndex <= 0) {
    restoreLookupGridCellFocus(grid, rowIndex, currentFieldName)
    return
  }

  const previousField = editableColumns[currentIndex - 1]?.dataField
  if (!previousField) {
    restoreLookupGridCellFocus(grid, rowIndex, currentFieldName)
    return
  }

  grid.editCell?.(rowIndex, previousField)
  restoreLookupGridCellFocus(grid, rowIndex, previousField)
}
