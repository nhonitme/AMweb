import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { SavedEvent } from "devextreme/ui/data_grid"

import {
  focusNewRowWithoutTopJump,
  readGridScrollTop,
  restoreGridScrollTopImmediate,
} from "./voucherSpreadsheetGrid"

type UseVoucherSpreadsheetAddRowOptions = {
  gridRef: RefObject<dxDataGrid<unknown, string | number> | null>
  syncRows: () => void
  dataSource: readonly unknown[]
  shouldSkipSavedSync?: () => boolean
}

type PendingAddRowState = {
  scrollTop: number
  resolve: () => void
}

export function useVoucherSpreadsheetAddRow({
  gridRef,
  syncRows,
  dataSource,
  shouldSkipSavedSync,
}: UseVoucherSpreadsheetAddRowOptions) {
  const addRowFlowRef = useRef(false)
  const pendingScrollTopRef = useRef<number | null>(null)
  const pendingAddRowRef = useRef<PendingAddRowState | null>(null)

  useLayoutEffect(() => {
    if (pendingScrollTopRef.current !== null) {
      const scrollTop = pendingScrollTopRef.current
      pendingScrollTopRef.current = null
      restoreGridScrollTopImmediate(gridRef.current, scrollTop)
    }

    const pendingAddRow = pendingAddRowRef.current
    const grid = gridRef.current
    if (!pendingAddRow || !grid) {
      return
    }

    pendingAddRowRef.current = null
    grid.addRow()
    focusNewRowWithoutTopJump(grid, pendingAddRow.scrollTop)
    addRowFlowRef.current = false
    pendingAddRow.resolve()
  }, [dataSource, gridRef])

  const scheduleScrollRestoreAfterDataSourceUpdate = useCallback((scrollTop: number) => {
    pendingScrollTopRef.current = scrollTop
  }, [])

  const handleAddRow = useCallback(async () => {
    const grid = gridRef.current
    if (!grid) {
      return
    }

    addRowFlowRef.current = true
    const scrollTopBeforeAdd = readGridScrollTop(grid)

    if (grid.hasEditData()) {
      await grid.saveEditData()
      await new Promise<void>((resolve) => {
        pendingAddRowRef.current = { scrollTop: scrollTopBeforeAdd, resolve }
        syncRows()
      })
      return
    }

    grid.addRow()
    focusNewRowWithoutTopJump(grid, scrollTopBeforeAdd)
    addRowFlowRef.current = false
  }, [gridRef, syncRows])

  const handleSaved = useCallback(
    (_event: SavedEvent<unknown, string>) => {
      if (addRowFlowRef.current || shouldSkipSavedSync?.()) {
        return
      }

      const scrollTop = readGridScrollTop(gridRef.current)
      scheduleScrollRestoreAfterDataSourceUpdate(scrollTop)
      syncRows()
    },
    [gridRef, scheduleScrollRestoreAfterDataSourceUpdate, shouldSkipSavedSync, syncRows],
  )

  return {
    handleAddRow,
    handleSaved,
  }
}
