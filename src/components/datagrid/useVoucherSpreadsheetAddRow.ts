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
  /**
   * Preferred: append via React state (smooth). Return new row key after emit.
   * When omitted, falls back to DevExtreme `grid.addRow()` (legacy).
   */
  appendRowInState?: () => string | null
  focusAppendedRow?: (
    grid: dxDataGrid<unknown, string | number>,
    rowKey: string,
    scrollTop: number,
  ) => void
}

type PendingLegacyAdd = {
  scrollTop: number
  resolve: () => void
}

type PendingStateAppend = {
  scrollTop: number
  rowKey: string
}

export function useVoucherSpreadsheetAddRow({
  gridRef,
  syncRows,
  dataSource,
  shouldSkipSavedSync,
  appendRowInState,
  focusAppendedRow,
}: UseVoucherSpreadsheetAddRowOptions) {
  const addRowFlowRef = useRef(false)
  const pendingScrollTopRef = useRef<number | null>(null)
  const pendingLegacyAddRef = useRef<PendingLegacyAdd | null>(null)
  const pendingStateAppendRef = useRef<PendingStateAppend | null>(null)
  const appendRowInStateRef = useRef(appendRowInState)
  appendRowInStateRef.current = appendRowInState
  const focusAppendedRowRef = useRef(focusAppendedRow)
  focusAppendedRowRef.current = focusAppendedRow

  useLayoutEffect(() => {
    if (pendingScrollTopRef.current !== null) {
      const scrollTop = pendingScrollTopRef.current
      pendingScrollTopRef.current = null
      restoreGridScrollTopImmediate(gridRef.current, scrollTop)
    }

    const grid = gridRef.current
    const pendingStateAppend = pendingStateAppendRef.current
    if (pendingStateAppend && grid) {
      pendingStateAppendRef.current = null
      const focusRow = focusAppendedRowRef.current
      if (focusRow) {
        focusRow(grid, pendingStateAppend.rowKey, pendingStateAppend.scrollTop)
      } else {
        focusNewRowWithoutTopJump(grid, pendingStateAppend.scrollTop)
      }
      return
    }

    const pendingLegacyAdd = pendingLegacyAddRef.current
    if (!pendingLegacyAdd || !grid) {
      return
    }

    pendingLegacyAddRef.current = null
    grid.addRow()
    focusNewRowWithoutTopJump(grid, pendingLegacyAdd.scrollTop)
    addRowFlowRef.current = false
    pendingLegacyAdd.resolve()
  }, [dataSource, gridRef])

  const scheduleScrollRestoreAfterDataSourceUpdate = useCallback((scrollTop: number) => {
    pendingScrollTopRef.current = scrollTop
  }, [])

  const handleAddRow = useCallback(async () => {
    const grid = gridRef.current
    const appendInState = appendRowInStateRef.current
    if (!grid && !appendInState) {
      return
    }

    const hasEditData = Boolean(grid?.hasEditData?.())
    const scrollTopBeforeAdd = readGridScrollTop(grid)

    addRowFlowRef.current = true

    if (appendInState) {
      if (hasEditData && grid) {
        await grid.saveEditData()
      }

      pendingScrollTopRef.current = scrollTopBeforeAdd
      const newRowKey = appendInState()
      if (newRowKey) {
        pendingStateAppendRef.current = { scrollTop: scrollTopBeforeAdd, rowKey: newRowKey }
      }
      addRowFlowRef.current = false
      return
    }

    if (!grid) {
      addRowFlowRef.current = false
      return
    }

    if (hasEditData) {
      await grid.saveEditData()
      await new Promise<void>((resolve) => {
        pendingLegacyAddRef.current = { scrollTop: scrollTopBeforeAdd, resolve }
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
