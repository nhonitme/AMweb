type GridAddHandler = () => void

const addHandlerByGrid = new WeakMap<object, GridAddHandler>()
const listenersByGrid = new WeakMap<object, Set<() => void>>()

function notifyGridAddListeners(grid: object) {
  listenersByGrid.get(grid)?.forEach((listener) => listener())
}

/** GridToolbar registers its Add action so empty grids can reuse the same handler. */
export function setGridToolbarAddHandler(grid: object | null | undefined, handler: GridAddHandler | null) {
  if (!grid) {
    return
  }

  if (handler) {
    addHandlerByGrid.set(grid, handler)
  } else {
    addHandlerByGrid.delete(grid)
  }

  notifyGridAddListeners(grid)
}

export function getGridToolbarAddHandler(grid: object | null | undefined): GridAddHandler | undefined {
  if (!grid) {
    return undefined
  }

  return addHandlerByGrid.get(grid)
}

export function subscribeGridToolbarAdd(grid: object, listener: () => void): () => void {
  let listeners = listenersByGrid.get(grid)
  if (!listeners) {
    listeners = new Set()
    listenersByGrid.set(grid, listeners)
  }

  listeners.add(listener)
  return () => {
    listeners?.delete(listener)
  }
}
