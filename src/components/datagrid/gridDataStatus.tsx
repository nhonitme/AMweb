import React, { createContext, useContext, useMemo } from "react"

export type GridDataStatusValue = {
  /** Initial load or any in-flight fetch for the rows currently bound to the grid. */
  loading?: boolean
  /** Background refetch / filter / search fetch. */
  fetching?: boolean
  /** Last load failed — do not treat as an empty result set. */
  error?: boolean
  /** Force-hide empty overlay (e.g. detail waiting on master selection load). */
  suppressEmptyOverlay?: boolean
}

const GridDataStatusContext = createContext<GridDataStatusValue | null>(null)

export function GridDataStatusProvider({
  value,
  children,
}: {
  value: GridDataStatusValue
  children: React.ReactNode
}) {
  const memo = useMemo(
    () => ({
      loading: Boolean(value.loading),
      fetching: Boolean(value.fetching),
      error: Boolean(value.error),
      suppressEmptyOverlay: Boolean(value.suppressEmptyOverlay),
    }),
    [value.error, value.fetching, value.loading, value.suppressEmptyOverlay],
  )

  return (
    <GridDataStatusContext.Provider value={memo}>
      {children}
    </GridDataStatusContext.Provider>
  )
}

export function useGridDataStatus(): GridDataStatusValue {
  return useContext(GridDataStatusContext) ?? {}
}

/**
 * Empty state is allowed only after a successful, settled load with zero rows.
 * Loading / fetching / error must never look like "no data".
 */
export function shouldAllowGridEmptyState(
  status: GridDataStatusValue,
  isEmpty: boolean,
): boolean {
  if (!isEmpty) {
    return false
  }
  if (status.suppressEmptyOverlay || status.loading || status.fetching || status.error) {
    return false
  }
  return true
}

export function resolveGridDataStatus(
  props: GridDataStatusValue,
  context: GridDataStatusValue,
): GridDataStatusValue {
  return {
    loading: props.loading ?? context.loading,
    fetching: props.fetching ?? context.fetching,
    error: props.error ?? context.error,
    suppressEmptyOverlay: props.suppressEmptyOverlay ?? context.suppressEmptyOverlay,
  }
}
