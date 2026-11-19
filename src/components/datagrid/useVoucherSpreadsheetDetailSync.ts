import { useCallback, useEffect, useRef, type RefObject } from "react"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { FocusedCellChangedEvent } from "devextreme/ui/data_grid"

import { flushActiveEditorValue } from "@/lib/shortcuts/shortcutUtils"
import {
  commitVoucherSpreadsheetGridCell,
  isVoucherSpreadsheetDropdownOverlayTarget,
  resolveVoucherSpreadsheetFocusTransition,
  type VoucherSpreadsheetCommitReason,
  type VoucherSpreadsheetFocusCell,
} from "./voucherSpreadsheetDetailSync"

type UseVoucherSpreadsheetDetailSyncOptions<TRow, TKey extends string | number = string> = {
  visible: boolean
  isReadOnly: boolean
  isLookupPopupOpen?: boolean
  gridRef: RefObject<dxDataGrid<TRow, TKey> | null>
  gridContainerRef: RefObject<HTMLElement | null>
  syncRows: () => void
  preserveScrollForSync?: (syncFn: () => void) => void
  liveInputFields: ReadonlySet<string>
  lookupFields: ReadonlySet<string>
  onLeaveFocusCell?: (prev: VoucherSpreadsheetFocusCell) => void
}

export function useVoucherSpreadsheetDetailSync<TRow, TKey extends string | number = string>({
  visible,
  isReadOnly,
  isLookupPopupOpen = false,
  gridRef,
  gridContainerRef,
  syncRows,
  preserveScrollForSync,
  liveInputFields,
  lookupFields,
  onLeaveFocusCell,
}: UseVoucherSpreadsheetDetailSyncOptions<TRow, TKey>) {
  const focusRef = useRef<VoucherSpreadsheetFocusCell | null>(null)
  const commitInFlightRef = useRef(false)

  const syncTotalsFromGrid = useCallback(() => {
    if (preserveScrollForSync) {
      preserveScrollForSync(() => {
        syncRows()
      })
      return
    }
    syncRows()
  }, [preserveScrollForSync, syncRows])

  const commitGridEdits = useCallback(async (reason: VoucherSpreadsheetCommitReason = "unspecified") => {
    if (commitInFlightRef.current) {
      return
    }

    const grid = gridRef.current
    if (!grid) {
      return
    }

    if (reason === "pointer-outside"
      && !grid.hasEditData()
      && grid.option("editing.editRowKey") == null
      && grid.option("editing.editColumnName") == null) {
      return
    }

    commitInFlightRef.current = true
    try {
      if (reason === "pointer-outside") {
        await flushActiveEditorValue()
      }

      const hadEditDataBeforeClose = Boolean(grid.hasEditData?.())
      await commitVoucherSpreadsheetGridCell(grid)

      if (
        hadEditDataBeforeClose
        || reason === "pointer-outside"
        || reason === "focus-leave"
        || reason === "focus-row"
      ) {
        syncTotalsFromGrid()
      }
    } finally {
      commitInFlightRef.current = false
    }
  }, [gridRef, syncTotalsFromGrid])

  const handleSaved = useCallback(() => {
    if (commitInFlightRef.current) {
      return
    }
    syncTotalsFromGrid()
  }, [syncTotalsFromGrid])

  const handleFocusedCellChanged = useCallback(
    (event: FocusedCellChangedEvent<TRow, TKey>) => {
      const next: VoucherSpreadsheetFocusCell = {
        rowIndex: event.rowIndex,
        columnIndex: event.columnIndex,
        field: String(event.column?.dataField ?? event.column?.name ?? ""),
      }
      const prev = focusRef.current
      focusRef.current = next

      if (!prev || prev.rowIndex < 0) {
        return
      }

      onLeaveFocusCell?.(prev)

      const transition = resolveVoucherSpreadsheetFocusTransition(
        prev,
        next,
        liveInputFields,
        lookupFields,
      )
      if (transition.shouldCommitRow) {
        void commitGridEdits("focus-row")
        return
      }

      if (transition.shouldCommitLeave) {
        void commitGridEdits("focus-leave")
      }
    },
    [commitGridEdits, liveInputFields, lookupFields, onLeaveFocusCell],
  )

  useEffect(() => {
    if (!visible) {
      focusRef.current = null
    }
  }, [visible])

  useEffect(() => {
    if (!visible || isReadOnly) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (isLookupPopupOpen) {
        return
      }

      const target = event.target
      if (isVoucherSpreadsheetDropdownOverlayTarget(target)) {
        return
      }

      const gridContainer = gridContainerRef.current
      if (!gridContainer || !(target instanceof Node) || gridContainer.contains(target)) {
        return
      }

      const sourcePopup = gridContainer.closest(".dx-overlay-wrapper")
      const targetPopup = target instanceof Element ? target.closest(".dx-overlay-wrapper") : null
      if (sourcePopup && targetPopup && sourcePopup !== targetPopup) {
        return
      }

      void commitGridEdits("pointer-outside")
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
    }
  }, [commitGridEdits, gridContainerRef, isLookupPopupOpen, isReadOnly, visible])

  return {
    commitGridEdits,
    handleSaved,
    handleFocusedCellChanged,
  }
}
