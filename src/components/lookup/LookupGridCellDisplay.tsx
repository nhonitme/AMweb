import { useRef, type KeyboardEvent, type MouseEvent, type PointerEvent, type ReactNode } from "react"
import type { ColumnCellTemplateData, ColumnEditCellTemplateData } from "devextreme/ui/data_grid"

import { flushLookupGridEditCell, type LookupGridFocusHost } from "./lookupHelpers"

export type LookupOpenMode = "dropdown" | "popup"

const pendingLookupOpenByGrid = new WeakMap<object, Map<string, LookupOpenMode>>()
const recentLookupOpenByGrid = new WeakMap<object, {
  dataField: string
  rowIndex: number
  rowKey: unknown
  mode: LookupOpenMode
  expiresAt: number
}>()

function buildLookupOpenKeys(rowKey: unknown, rowIndex: number, dataField: string) {
  const keys = [`index:${rowIndex}:${dataField}`]

  if (rowKey !== null && rowKey !== undefined) {
    keys.unshift(`key:${String(rowKey)}:${dataField}`)
  }

  return keys
}

export function queueLookupCellOpen(
  grid: object,
  rowKey: unknown,
  rowIndex: number,
  dataField: string,
  mode: LookupOpenMode,
) {
  const openMap = pendingLookupOpenByGrid.get(grid) ?? new Map<string, LookupOpenMode>()

  buildLookupOpenKeys(rowKey, rowIndex, dataField).forEach((key) => {
    openMap.set(key, mode)
  })

  pendingLookupOpenByGrid.set(grid, openMap)
}

function queueLookupOpen<TData, TKey extends string | number>(
  cellInfo: ColumnCellTemplateData<TData, TKey>,
  dataField: string,
  mode: LookupOpenMode,
) {
  queueLookupCellOpen(
    cellInfo.component as unknown as object,
    cellInfo.row?.key,
    cellInfo.rowIndex,
    dataField,
    mode,
  )
}

export function consumeLookupCellOpen<TData, TKey extends string | number>(
  cellInfo: ColumnEditCellTemplateData<TData, TKey>,
  dataField: string,
): LookupOpenMode | null {
  const gridKey = cellInfo.component as unknown as object
  const openMap = pendingLookupOpenByGrid.get(gridKey)
  const keys = buildLookupOpenKeys(cellInfo.row?.key, cellInfo.rowIndex, dataField)
  const queuedMode = openMap
    ? keys.map((key) => openMap.get(key)).find((value): value is LookupOpenMode => Boolean(value)) ?? null
    : null

  if (queuedMode && openMap) {
    keys.forEach((key) => {
      openMap.delete(key)
    })

    if (openMap.size === 0) {
      pendingLookupOpenByGrid.delete(gridKey)
    }

    recentLookupOpenByGrid.set(gridKey, {
      dataField,
      rowIndex: cellInfo.rowIndex,
      rowKey: cellInfo.row?.key,
      mode: queuedMode,
      expiresAt: Date.now() + 80,
    })

    return queuedMode
  }

  const recent = recentLookupOpenByGrid.get(gridKey)
  if (
    recent &&
    Date.now() < recent.expiresAt &&
    recent.dataField === dataField &&
    recent.rowIndex === cellInfo.rowIndex &&
    recent.rowKey === cellInfo.row?.key
  ) {
    return recent.mode
  }

  return null
}

function getLookupCellText(value: unknown) {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value).trim()
}

type LookupGridCellDisplayProps<TData, TKey extends string | number> = {
  mode: "display"
  cellInfo: ColumnCellTemplateData<TData, TKey>
  dataField: string
}

type LookupGridCellEditProps = {
  mode: "edit"
  children: ReactNode
}

type LookupGridCellEditorProps<TData, TKey extends string | number> =
  | LookupGridCellDisplayProps<TData, TKey>
  | LookupGridCellEditProps

type LookupGridInteractionEvent = {
  preventDefault: () => void
  stopPropagation: () => void
  nativeEvent?: {
    stopImmediatePropagation?: () => void
  }
}

function isPrimaryPointer(event: MouseEvent<HTMLElement> | PointerEvent<HTMLElement>) {
  return event.button === 0
}

export function LookupGridCellEditor<TData, TKey extends string | number>(
  props: LookupGridCellEditorProps<TData, TKey>,
) {
  const openStartedRef = useRef(false)

  if (props.mode === "edit") {
    return (
      <div
        className="am-grid-lookup-cell am-grid-lookup-shell am-grid-lookup-cell-editor"
        data-am-lookup-state="edit"
      >
        {props.children}
      </div>
    )
  }

  const { cellInfo, dataField } = props
  const displayText =
    getLookupCellText(cellInfo.text) ||
    getLookupCellText(cellInfo.displayValue) ||
    getLookupCellText(cellInfo.value)

  const stopLookupEvent = (event: LookupGridInteractionEvent) => {
    event.preventDefault()
    event.stopPropagation()
    event.nativeEvent?.stopImmediatePropagation?.()
  }

  const openLookup = (event?: LookupGridInteractionEvent) => {
    if (event) {
      stopLookupEvent(event)
    }

    if (openStartedRef.current) {
      return
    }

    openStartedRef.current = true
    const grid = cellInfo.component as LookupGridFocusHost & {
      editCell: (rowIndex: number, fieldName: string) => void
    }

    void flushLookupGridEditCell(grid).finally(() => {
      queueLookupOpen(cellInfo, dataField, "dropdown")
      grid.editCell(cellInfo.rowIndex, dataField)

      window.setTimeout(() => {
        openStartedRef.current = false
      }, 250)
    })
  }

  const handleContainerPointerDownCapture = (event: PointerEvent<HTMLDivElement>) => {
    if (!isPrimaryPointer(event)) {
      return
    }

    openLookup(event)
  }

  const handleContainerMouseDownCapture = (event: MouseEvent<HTMLDivElement>) => {
    if (!isPrimaryPointer(event)) {
      return
    }

    openLookup(event)
  }

  const handleContainerClick = (event: MouseEvent<HTMLDivElement>) => {
    openLookup(event)
  }

  const handleContainerMouseDown = (event: MouseEvent<HTMLDivElement>) => {
    stopLookupEvent(event)
  }

  const handleKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    if (event.key !== "Enter" && event.key !== " ") {
      return
    }

    event.preventDefault()
    event.stopPropagation()
    openLookup()
  }

  return (
    <div
      className="am-grid-lookup-cell am-grid-lookup-shell am-grid-lookup-display"
      data-am-lookup-state="display"
      role="button"
      tabIndex={0}
      title={displayText}
      onPointerDownCapture={handleContainerPointerDownCapture}
      onMouseDownCapture={handleContainerMouseDownCapture}
      onMouseDown={handleContainerMouseDown}
      onClick={handleContainerClick}
      onKeyDown={handleKeyDown}
    >
      {displayText ? <span className="am-grid-lookup-display-text">{displayText}</span> : null}
    </div>
  )
}

export function LookupGridCellDisplay<TData, TKey extends string | number>(
  props: Omit<LookupGridCellDisplayProps<TData, TKey>, "mode">,
) {
  return <LookupGridCellEditor {...props} mode="display" />
}
