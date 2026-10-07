const GRID_HEADER_CELL_SELECTOR =
  ".dx-datagrid-headers .dx-header-row > td, .dx-treelist-headers .dx-header-row > td"
const MANAGED_HEADER_TOOLTIP_ATTR = "data-grid-header-field-tooltip"
const HEADER_FIELD_NAME_ATTR = "data-grid-header-field-name"

let gridHeaderFieldTooltipInitialized = false

type HeaderCellPreparedLike = {
  rowType?: string
  column?: {
    dataField?: string
    name?: string
    command?: string
    type?: string
  } | null
  cellElement?: HTMLElement | null
}

function normalizeFieldName(value: string | null | undefined): string {
  return String(value ?? "").trim()
}

function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement
}

function resolveHeaderFieldName(column: HeaderCellPreparedLike["column"]): string {
  if (!column) {
    return ""
  }

  if (column.command || column.type === "selection" || column.type === "buttons" || column.type === "adaptive") {
    return ""
  }

  return normalizeFieldName(column.dataField) || normalizeFieldName(column.name)
}

function applyTitleToHeaderCell(cell: HTMLElement, fieldName: string) {
  cell.setAttribute("title", fieldName)
  cell.setAttribute(MANAGED_HEADER_TOOLTIP_ATTR, "true")
  cell.setAttribute(HEADER_FIELD_NAME_ATTR, fieldName)

  cell.querySelectorAll<HTMLElement>(".dx-datagrid-text-content, .dx-treelist-text-content").forEach((content) => {
    content.setAttribute("title", fieldName)
  })
}

export function applyHeaderFieldNameTooltip(event: HeaderCellPreparedLike) {
  if (event.rowType !== "header") {
    return
  }

  const cell = event.cellElement
  if (!isHTMLElement(cell)) {
    return
  }

  const fieldName = resolveHeaderFieldName(event.column)
  if (!fieldName) {
    return
  }

  applyTitleToHeaderCell(cell, fieldName)
}

function syncHeaderTooltipFromPointer(event: Event) {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  const cell = target.closest(GRID_HEADER_CELL_SELECTOR)
  if (!isHTMLElement(cell) || cell.getAttribute(MANAGED_HEADER_TOOLTIP_ATTR) !== "true") {
    return
  }

  const fieldName = normalizeFieldName(cell.getAttribute(HEADER_FIELD_NAME_ATTR))
  if (!fieldName) {
    return
  }

  applyTitleToHeaderCell(cell, fieldName)
}

export function initGridHeaderFieldTooltips() {
  if (gridHeaderFieldTooltipInitialized || typeof document === "undefined") {
    return
  }

  document.addEventListener("mouseover", syncHeaderTooltipFromPointer, true)
  document.addEventListener("focusin", syncHeaderTooltipFromPointer, true)
  gridHeaderFieldTooltipInitialized = true
}
