export type VoucherDetailRowIdentity = {
  ROW_KEY: string
  ISDEL?: boolean | number | string | null
}

export function isVoucherDetailRowSoftDeleted(row: VoucherDetailRowIdentity): boolean {
  const value = row.ISDEL
  return value === true || value === 1 || value === "1"
}

/**
 * Insert a new active row above the focused active row (Excel Insert Rows Above).
 * Soft-deleted slots stay in place; insert index is the array index of the focus key.
 */
export function insertActiveRowAbove<T extends VoucherDetailRowIdentity>(
  rows: readonly T[],
  focusKey: string | null | undefined,
  createRow: (nextActiveSort: number) => T,
): { nextRows: T[]; newRowKey: string } {
  const list = rows.map((row) => row)
  let insertAt = list.length

  if (focusKey) {
    const focusIndex = list.findIndex(
      (row) => row.ROW_KEY === focusKey && !isVoucherDetailRowSoftDeleted(row),
    )
    if (focusIndex >= 0) {
      insertAt = focusIndex
    }
  }

  const activeBefore = list
    .slice(0, insertAt)
    .filter((row) => !isVoucherDetailRowSoftDeleted(row)).length
  const newRow = createRow(activeBefore + 1)
  list.splice(insertAt, 0, newRow)

  return { nextRows: list, newRowKey: newRow.ROW_KEY }
}

/** Renumber SORT/STT (or any numeric order field) for active rows only, 1..n. */
export function renumberActiveSort<T extends VoucherDetailRowIdentity>(
  rows: readonly T[],
  sortField: keyof T & string,
): T[] {
  let activeSort = 0
  return rows.map((row) => {
    if (isVoucherDetailRowSoftDeleted(row)) {
      return row
    }

    activeSort += 1
    return {
      ...row,
      [sortField]: activeSort,
    }
  })
}

/**
 * Clear editable content of a row while preserving identity / order / soft-delete flag.
 * `createEmpty` should return a blank default row; preserved keys are copied from `row`.
 */
export function clearActiveRowContent<T extends VoucherDetailRowIdentity>(
  row: T,
  createEmpty: () => T,
  preserveKeys: readonly (keyof T)[],
): T {
  const next = { ...createEmpty() }
  for (const key of preserveKeys) {
    next[key] = row[key]
  }
  return next
}

export type VoucherDetailContextMenuAction = {
  text: string
  icon?: string
  disabled?: boolean
  onItemClick: () => void
}

export type VoucherDetailContextMenuItems = VoucherDetailContextMenuAction[]

export function buildVoucherDetailContextMenuItems(options: {
  canEdit: boolean
  insertText: string
  addAtEndText: string
  deleteText: string
  onInsert: () => void
  onAddAtEnd: () => void
  onDelete: () => void
}): VoucherDetailContextMenuItems {
  if (!options.canEdit) {
    return []
  }

  return [
    {
      text: options.insertText,
      icon: "insertrowabove",
      onItemClick: options.onInsert,
    },
    {
      text: options.addAtEndText,
      icon: "plus",
      onItemClick: options.onAddAtEnd,
    },
    {
      text: options.deleteText,
      icon: "trash",
      onItemClick: options.onDelete,
    },
  ]
}
