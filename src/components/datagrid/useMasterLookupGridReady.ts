import { useCallback, useEffect, useState } from "react"

/**
 * Lookup master pages paint GridToolbar ("Thêm mới") above the grid body, and
 * BaseDataGrid may briefly show the empty-grid Add CTA before rows bind.
 * Hold the toolbar/overlay until the grid has painted once and data is ready
 * (!loading or already has rows).
 */
export function useMasterLookupGridReady(isLookup: boolean, dataReady = true) {
  const [gridPainted, setGridPainted] = useState(!isLookup)

  useEffect(() => {
    setGridPainted(!isLookup)
  }, [isLookup])

  const onLookupContentReady = useCallback(() => {
    if (!isLookup) {
      return
    }
    setGridPainted(true)
  }, [isLookup])

  const lookupGridReady = !isLookup || (gridPainted && dataReady)

  return {
    lookupGridReady,
    holdToolbarUntilReady: isLookup,
    onLookupContentReady,
  }
}
