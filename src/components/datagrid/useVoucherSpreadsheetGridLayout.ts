import { useCallback, useEffect, useRef, useState, type RefObject } from "react"
import type dxDataGrid from "devextreme/ui/data_grid"

import { VOUCHER_SPREADSHEET_MIN_GRID_HEIGHT } from "./voucherSpreadsheetGrid"

type UseVoucherSpreadsheetGridLayoutOptions = {
  gridRef: RefObject<dxDataGrid<unknown, string | number> | null>
  isVisible: boolean
  layoutVersion?: number
}

function safeUpdateGridDimensions(grid: dxDataGrid<unknown, string | number> | null): void {
  if (!grid) {
    return
  }

  try {
    grid.updateDimensions()
  } catch {
  }
}

export function useVoucherSpreadsheetGridLayout({
  gridRef,
  isVisible,
  layoutVersion = 0,
}: UseVoucherSpreadsheetGridLayoutOptions) {
  const containerRef = useRef<HTMLDivElement | null>(null)
  const gridReadyRef = useRef(false)
  const lastObservedHeightRef = useRef(0)
  const [gridHeight, setGridHeight] = useState(0)

  const syncContainerHeight = useCallback(() => {
    const container = containerRef.current
    if (!container) {
      return
    }

    const nextHeight = container.clientHeight
    if (nextHeight > 0) {
      setGridHeight((current) => (current === nextHeight ? current : nextHeight))
    }
  }, [])

  const updateGridDimensions = useCallback(() => {
    if (!gridReadyRef.current) {
      return
    }

    safeUpdateGridDimensions(gridRef.current)
  }, [gridRef])

  const notifyGridContentReady = useCallback(() => {
    gridReadyRef.current = true
    requestAnimationFrame(() => {
      syncContainerHeight()
      safeUpdateGridDimensions(gridRef.current)
    })
  }, [gridRef, syncContainerHeight])

  const notifyGridDisposing = useCallback(() => {
    gridReadyRef.current = false
  }, [])

  useEffect(() => {
    if (!isVisible) {
      gridReadyRef.current = false
      lastObservedHeightRef.current = 0
      return
    }

    const container = containerRef.current
    if (!container) {
      return
    }

    const observer = new ResizeObserver(() => {
      const nextHeight = container.clientHeight
      if (nextHeight <= 0 || nextHeight === lastObservedHeightRef.current) {
        return
      }

      lastObservedHeightRef.current = nextHeight
      syncContainerHeight()
      updateGridDimensions()
    })

    observer.observe(container)
    lastObservedHeightRef.current = container.clientHeight
    syncContainerHeight()

    return () => {
      observer.disconnect()
    }
  }, [isVisible, layoutVersion, syncContainerHeight, updateGridDimensions])

  const resolvedGridHeight = gridHeight > 0 ? gridHeight : VOUCHER_SPREADSHEET_MIN_GRID_HEIGHT

  return {
    containerRef,
    gridHeight: resolvedGridHeight,
    notifyGridContentReady,
    notifyGridDisposing,
  }
}
