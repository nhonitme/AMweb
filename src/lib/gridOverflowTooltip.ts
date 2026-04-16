const GRID_CELL_SELECTOR = ".dx-datagrid-rowsview .dx-row > td, .dx-treelist-rowsview .dx-row > td"
const MANAGED_TOOLTIP_ATTR = "data-grid-overflow-tooltip"
const SKIP_CELL_CLASS_NAMES = [
  "dx-command-edit",
  "dx-command-select",
  "dx-command-expand",
  "dx-command-adaptive",
]
const SKIP_CELL_CONTENT_SELECTOR = [
  ".dx-texteditor",
  ".dx-dropdowneditor",
  ".dx-checkbox",
  ".dx-switch",
  ".dx-button",
  "input",
  "textarea",
  "select",
].join(", ")

let gridOverflowTooltipInitialized = false

function normalizeText(value: string | null | undefined): string {
  return String(value ?? "").replace(/\s+/g, " ").trim()
}

function isHTMLElement(value: unknown): value is HTMLElement {
  return value instanceof HTMLElement
}

function clearManagedTooltip(cell: HTMLElement) {
  if (cell.getAttribute(MANAGED_TOOLTIP_ATTR) !== "true") {
    return
  }

  cell.removeAttribute("title")
  cell.removeAttribute(MANAGED_TOOLTIP_ATTR)
}

function shouldSkipCell(cell: HTMLElement): boolean {
  if (SKIP_CELL_CLASS_NAMES.some((className) => cell.classList.contains(className))) {
    return true
  }

  return cell.querySelector(SKIP_CELL_CONTENT_SELECTOR) !== null
}

function hasOverflow(element: HTMLElement): boolean {
  return element.scrollWidth - element.clientWidth > 1 || element.scrollHeight - element.clientHeight > 1
}

function findOverflowSource(cell: HTMLElement): HTMLElement | null {
  const descendants = Array.from(cell.querySelectorAll<HTMLElement>("*")).reverse()

  for (const element of [...descendants, cell]) {
    if (!isHTMLElement(element)) {
      continue
    }

    if (!normalizeText(element.textContent)) {
      continue
    }

    if (element.clientWidth <= 0 && element.clientHeight <= 0) {
      continue
    }

    if (hasOverflow(element)) {
      return element
    }
  }

  return null
}

function syncCellTooltip(cell: HTMLElement) {
  if (shouldSkipCell(cell)) {
    clearManagedTooltip(cell)
    return
  }

  const overflowSource = findOverflowSource(cell)
  const tooltipText = normalizeText(overflowSource?.textContent ?? cell.textContent)

  if (!overflowSource || !tooltipText) {
    clearManagedTooltip(cell)
    return
  }

  cell.setAttribute("title", tooltipText)
  cell.setAttribute(MANAGED_TOOLTIP_ATTR, "true")
}

function handleGridPointer(event: Event) {
  const target = event.target
  if (!(target instanceof Element)) {
    return
  }

  const cell = target.closest(GRID_CELL_SELECTOR)
  if (!isHTMLElement(cell)) {
    return
  }

  syncCellTooltip(cell)
}

export function initGridOverflowTooltips() {
  if (gridOverflowTooltipInitialized || typeof document === "undefined") {
    return
  }

  document.addEventListener("mouseover", handleGridPointer, true)
  document.addEventListener("focusin", handleGridPointer, true)
  gridOverflowTooltipInitialized = true
}
