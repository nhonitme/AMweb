import type dxDataGrid from "devextreme/ui/data_grid"

export type VoucherSpreadsheetFocusCell = {
  rowIndex: number
  columnIndex: number
  field: string
}

export type VoucherSpreadsheetCommitReason =
  | "focus-row"
  | "focus-leave"
  | "pointer-outside"
  | "unspecified"

export type VoucherSpreadsheetFocusTransition = {
  prevField: string
  nextField: string
  columnChanged: boolean
  rowChangedBetweenDataRows: boolean
  enteringLookup: boolean
  leavingLiveInput: boolean
  shouldCommitRow: boolean
  shouldCommitLeave: boolean
}

export function resolveVoucherSpreadsheetFocusTransition(
  prev: VoucherSpreadsheetFocusCell,
  next: VoucherSpreadsheetFocusCell,
  liveInputFields: ReadonlySet<string>,
  lookupFields: ReadonlySet<string>,
): VoucherSpreadsheetFocusTransition {
  const prevField = prev.field
  const nextField = next.field
  const columnChanged = prev.columnIndex !== next.columnIndex
  const rowChangedBetweenDataRows =
    next.rowIndex !== prev.rowIndex && next.rowIndex >= 0 && prev.rowIndex >= 0
  const enteringLookup = columnChanged && lookupFields.has(nextField)
  const leavingLiveInput =
    (columnChanged || rowChangedBetweenDataRows) && liveInputFields.has(prevField)

  return {
    prevField,
    nextField,
    columnChanged,
    rowChangedBetweenDataRows,
    enteringLookup,
    leavingLiveInput,
    shouldCommitRow: rowChangedBetweenDataRows,
    shouldCommitLeave: leavingLiveInput && !rowChangedBetweenDataRows,
  }
}

export async function commitVoucherSpreadsheetGridCell(
  grid: dxDataGrid<unknown, string | number> | null | undefined,
): Promise<void> {
  if (!grid) {
    return
  }

  try {
    await grid.closeEditCell()
  } catch {
  }

  try {
    if (grid.hasEditData()) {
      await grid.saveEditData()
    }
  } catch {
  }
}

export function isVoucherSpreadsheetDropdownOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  return Boolean(target.closest(".dx-dropdowneditor-overlay"))
}

type PendingGridChange<T> = {
  type?: string
  key?: string | number
  data?: Partial<T>
}

export function readPendingGridUpdatesByKey<T>(
  grid: dxDataGrid<T, string | number> | null | undefined,
): Map<string, Partial<T>> {
  const updateByKey = new Map<string, Partial<T>>()
  if (!grid) {
    return updateByKey
  }

  const pendingChanges = (grid.option("editing.changes") as PendingGridChange<T>[] | undefined) ?? []
  pendingChanges.forEach((change) => {
    if (change?.type !== "update" || change.key == null || !change.data) {
      return
    }
    updateByKey.set(String(change.key), change.data)
  })
  return updateByKey
}
