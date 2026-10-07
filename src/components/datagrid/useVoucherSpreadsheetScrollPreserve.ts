import { useCallback, useLayoutEffect, useRef, type RefObject } from "react"
import type dxDataGrid from "devextreme/ui/data_grid"

import {
  focusDetailCellWithoutScrollJump,
  readGridScrollTop,
  restoreContainerScrollTop,
  restoreGridScrollTopImmediate,
  type VoucherSpreadsheetScrollSnapshot,
} from "./voucherSpreadsheetGrid"

type PendingPostRestoreAction = {
  type: "focusCell"
  rowKey: string
  dataField: string
}

type UseVoucherSpreadsheetScrollPreserveOptions = {
  gridRef: RefObject<dxDataGrid<unknown, string | number> | null>
  containerRef: RefObject<HTMLElement | null>
  dataSource: readonly unknown[]
}

export function useVoucherSpreadsheetScrollPreserve({
  gridRef,
  containerRef,
  dataSource,
}: UseVoucherSpreadsheetScrollPreserveOptions) {
  const pendingScrollRef = useRef<VoucherSpreadsheetScrollSnapshot | null>(null)
  const pendingPostRestoreRef = useRef<PendingPostRestoreAction | null>(null)

  const captureScrollPositions = useCallback((): VoucherSpreadsheetScrollSnapshot => {
    return {
      gridScrollTop: readGridScrollTop(gridRef.current),
      containerScrollTop: containerRef.current?.scrollTop ?? 0,
    }
  }, [containerRef, gridRef])

  const restoreScrollPositions = useCallback((snapshot: VoucherSpreadsheetScrollSnapshot) => {
    restoreGridScrollTopImmediate(gridRef.current, snapshot.gridScrollTop)
    restoreContainerScrollTop(containerRef.current, snapshot.containerScrollTop)
  }, [containerRef, gridRef])

  const scheduleDataSourceChange = useCallback(
    (snapshot: VoucherSpreadsheetScrollSnapshot, postRestore?: PendingPostRestoreAction) => {
      pendingScrollRef.current = snapshot
      pendingPostRestoreRef.current = postRestore ?? null
    },
    [],
  )

  useLayoutEffect(() => {
    const snapshot = pendingScrollRef.current
    if (!snapshot) {
      return
    }

    pendingScrollRef.current = null
    const postRestore = pendingPostRestoreRef.current
    pendingPostRestoreRef.current = null

    restoreScrollPositions(snapshot)

    const grid = gridRef.current
    if (postRestore?.type === "focusCell" && grid) {
      focusDetailCellWithoutScrollJump(
        grid,
        postRestore.rowKey,
        postRestore.dataField,
        snapshot,
        containerRef.current,
      )
    }

    requestAnimationFrame(() => {
      restoreScrollPositions(snapshot)
    })
  }, [containerRef, dataSource, gridRef, restoreScrollPositions])

  const preserveScrollForSync = useCallback(
    (syncFn: () => void) => {
      scheduleDataSourceChange(captureScrollPositions())
      syncFn()
    },
    [captureScrollPositions, scheduleDataSourceChange],
  )

  return {
    captureScrollPositions,
    scheduleDataSourceChange,
    preserveScrollForSync,
    restoreScrollPositions,
  }
}
