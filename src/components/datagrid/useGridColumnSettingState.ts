import { useCallback, useEffect, useMemo, useRef } from "react"

import {
  resetSysGridColumnSettings,
  saveSysGridColumnSettings,
} from "@/api/sysGridColumnSettingApi"
import {
  applyGridColumnSettingsToComponent,
  isTechnicalIdColumnName,
} from "@/components/datagrid/gridColumnSettingRender"
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import { useSysGridColumnSettings } from "@/lib/sysGridColumnSettingContext"
import type {
  GridColumnSettingEditorItem,
  SysGridColumnSetting,
  SysGridColumnSettingSaveItem,
} from "@/types/sysGridColumnSetting"

type GridStateColumn = {
  dataField?: string
  name?: string
  caption?: string
  visible?: boolean
  visibleIndex?: number
  width?: number | string | null
  fixed?: boolean
  fixedPosition?: string
  allowHiding?: boolean
  showInColumnChooser?: boolean
  sortOrder?: string
  sortIndex?: number
  type?: string
  command?: string
  columns?: GridStateColumn[]
}

type GridState = {
  columns?: GridStateColumn[]
}

type GridComponent = {
  beginUpdate?: () => void
  columnCount?: () => number
  columnOption?: (...args: any[]) => GridStateColumn | undefined | void
  endUpdate?: () => void
  state?: ((state?: GridState) => GridState | void)
}

type UseGridColumnSettingStateOptions = {
  enabled?: boolean
  screenCd?: string
  gridId?: string
}

const loadItemsPromiseMap = new Map<string, Promise<GridColumnSettingEditorItem[]>>()
const resetItemsPromiseMap = new Map<string, Promise<GridColumnSettingEditorItem[]>>()
const saveItemsPromiseMap = new Map<string, Promise<GridColumnSettingEditorItem[]>>()
const pendingSaveSignatureMap = new Map<string, string>()
const savedSignatureMap = new Map<string, string>()

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeNullableText(value: unknown): string | null {
  const normalized = normalizeText(value)
  return normalized.length > 0 ? normalized : null
}

function buildTargetCacheKey(screenCd: string, gridId: string): string {
  const companyCd = normalizeText(getCurrentCompanyCd())
  const userId = normalizeText(getCurrentUserId())
  const normalizedScreenCd = normalizeText(screenCd)
  const normalizedGridId = normalizeText(gridId)

  if (!companyCd || !userId || !normalizedScreenCd || !normalizedGridId) {
    return ""
  }

  return [
    companyCd.toUpperCase(),
    userId.toUpperCase(),
    normalizedScreenCd.toUpperCase(),
    normalizedGridId.toUpperCase(),
  ].join("::")
}

function toNullableNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return Math.round(value)
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value)
    if (Number.isFinite(parsed)) {
      return Math.round(parsed)
    }
  }

  return null
}

function resolveColumnName(column: GridStateColumn): string | null {
  return normalizeNullableText(column.dataField) ?? normalizeNullableText(column.name)
}

function isReservedColumnName(value: unknown): boolean {
  const normalized = normalizeText(value).toLowerCase()
  return normalized === "buttons"
}

function normalizeFixedPosition(value: unknown, fallback = "none"): "none" | "left" | "right" {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === "left" || normalized === "right") {
    return normalized
  }

  return fallback === "left" || fallback === "right" ? fallback : "none"
}

function sortEditorItems(items: GridColumnSettingEditorItem[]): GridColumnSettingEditorItem[] {
  return [...items].sort((left, right) => {
    const leftIndex = typeof left.visibleIndex === "number" ? left.visibleIndex : Number.MAX_SAFE_INTEGER
    const rightIndex = typeof right.visibleIndex === "number" ? right.visibleIndex : Number.MAX_SAFE_INTEGER

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }

    return left.columnName.localeCompare(right.columnName)
  })
}

function buildEditorItemsSignature(items: GridColumnSettingEditorItem[]): string {
  return JSON.stringify(
    sortEditorItems(items).map((item, index) => ({
      allowHiding: item.allowHiding ? 1 : 0,
      columnName: item.columnName.toUpperCase(),
      fixedPosition: normalizeFixedPosition(item.fixedPosition, "none"),
      isVisible: item.isVisible ? 1 : 0,
      sortIndex: toNullableNumber(item.sortIndex),
      sortOrder: normalizeText(item.sortOrder).toLowerCase(),
      visibleIndex: typeof item.visibleIndex === "number" ? item.visibleIndex : index,
      width: toNullableNumber(item.width),
    })),
  )
}

function flattenColumns(columns: GridStateColumn[]): GridStateColumn[] {
  return columns.flatMap((column) => {
    const childColumns = Array.isArray(column.columns) ? flattenColumns(column.columns) : []
    return [column, ...childColumns]
  })
}

function toEditorItemsFromColumns(columns: GridStateColumn[]): GridColumnSettingEditorItem[] {
  const items = flattenColumns(columns)
    .map((column) => {
      const dataField = normalizeNullableText(column.dataField)
      const fallbackName = normalizeNullableText(column.name)
      const columnName = resolveColumnName(column)
      const isCommandColumn =
        normalizeText(column.type).length > 0 ||
        normalizeText(column.command).length > 0 ||
        (!dataField && (isReservedColumnName(fallbackName) || (column.allowHiding === false && column.showInColumnChooser === false)))

      if (!columnName || isCommandColumn) {
        return null
      }

      const fixedPosition = column.fixed === true
        ? normalizeFixedPosition(column.fixedPosition, "left")
        : normalizeFixedPosition(column.fixedPosition, "none")
      const technicalIdColumn = isTechnicalIdColumnName(columnName)

      return {
        columnName,
        caption: normalizeText(column.caption) || columnName,
        isVisible: technicalIdColumn ? false : column.visible !== false,
        width: toNullableNumber(column.width),
        fixedPosition,
        visibleIndex: toNullableNumber(column.visibleIndex),
        allowHiding: technicalIdColumn ? false : column.allowHiding !== false && column.showInColumnChooser !== false,
        sortOrder: normalizeText(column.sortOrder).toLowerCase(),
        sortIndex: toNullableNumber(column.sortIndex),
      } satisfies GridColumnSettingEditorItem
    })
    .filter((item): item is GridColumnSettingEditorItem => item !== null)

  return sortEditorItems(items)
}

function toEditorItemsFromApi(settings: SysGridColumnSetting[]): GridColumnSettingEditorItem[] {
  return sortEditorItems(
    settings
      .filter((item) => {
        const columnName = normalizeText(item.COLUMN_NAME)
        return columnName.length > 0 && !isReservedColumnName(columnName)
      })
      .map((item) => {
        const technicalIdColumn = isTechnicalIdColumnName(item.COLUMN_NAME)

        return {
          columnName: item.COLUMN_NAME,
          caption: normalizeText(item.COLUMN_CAPTION) || item.COLUMN_NAME,
          isVisible: technicalIdColumn ? false : item.IS_VISIBLE !== "0",
          width: typeof item.COLUMN_WIDTH === "number" && Number.isFinite(item.COLUMN_WIDTH) ? item.COLUMN_WIDTH : null,
          fixedPosition:
            item.IS_FIXED === "1"
              ? normalizeFixedPosition(item.FIXED_POSITION, "left")
              : "none",
          visibleIndex:
            typeof item.VISIBLE_INDEX === "number" && Number.isFinite(item.VISIBLE_INDEX)
              ? item.VISIBLE_INDEX
              : null,
          allowHiding: technicalIdColumn ? false : item.ALLOW_HIDING !== "0",
          sortOrder: normalizeText(item.SORT_ORDER).toLowerCase(),
          sortIndex:
            typeof item.SORT_INDEX === "number" && Number.isFinite(item.SORT_INDEX)
              ? item.SORT_INDEX
              : null,
        }
      }),
  )
}

function toSaveItems(items: GridColumnSettingEditorItem[]): SysGridColumnSettingSaveItem[] {
  return sortEditorItems(items).map((item, index) => {
    const technicalIdColumn = isTechnicalIdColumnName(item.columnName)

    return {
      COLUMN_NAME: item.columnName,
      COLUMN_CAPTION: item.caption,
      IS_VISIBLE: technicalIdColumn ? "0" : item.isVisible ? "1" : "0",
      VISIBLE_INDEX: typeof item.visibleIndex === "number" ? item.visibleIndex : index,
      COLUMN_WIDTH: item.width,
      IS_FIXED: item.fixedPosition === "none" ? "0" : "1",
      FIXED_POSITION: item.fixedPosition === "none" ? "" : item.fixedPosition,
      ALLOW_HIDING: technicalIdColumn ? "0" : item.allowHiding ? "1" : "0",
      SORT_ORDER: item.sortOrder === "asc" || item.sortOrder === "desc" ? item.sortOrder : "",
      SORT_INDEX: item.sortIndex,
    }
  })
}

function filterPopupEditorItems(items: GridColumnSettingEditorItem[]): GridColumnSettingEditorItem[] {
  return sortEditorItems(
    items.filter((item) => !isTechnicalIdColumnName(item.columnName)),
  )
}

function mergeEditorItemsWithCurrentColumns(
  currentItems: GridColumnSettingEditorItem[],
  savedItems: GridColumnSettingEditorItem[],
): GridColumnSettingEditorItem[] {
  if (!currentItems.length) {
    return sortEditorItems(savedItems)
  }

  if (!savedItems.length) {
    return sortEditorItems(currentItems)
  }

  const currentItemsMap = new Map(
    currentItems.map((item) => [item.columnName.toUpperCase(), item] as const),
  )

  const mergedItems = savedItems
    .map((savedItem) => {
      const key = savedItem.columnName.toUpperCase()
      const currentItem = currentItemsMap.get(key)
      const technicalIdColumn = isTechnicalIdColumnName(savedItem.columnName)

      if (!currentItem) {
        return {
          ...savedItem,
          isVisible: technicalIdColumn ? false : savedItem.isVisible,
          allowHiding: technicalIdColumn ? false : savedItem.allowHiding,
        } satisfies GridColumnSettingEditorItem
      }

      currentItemsMap.delete(key)
      return {
        ...savedItem,
        caption: normalizeText(savedItem.caption) || currentItem.caption,
        isVisible: technicalIdColumn ? false : savedItem.isVisible,
        width: savedItem.width ?? currentItem.width,
        fixedPosition: savedItem.fixedPosition,
        visibleIndex: savedItem.visibleIndex,
        allowHiding: technicalIdColumn ? false : currentItem.allowHiding,
        sortOrder: savedItem.sortOrder,
        sortIndex: savedItem.sortIndex,
      } satisfies GridColumnSettingEditorItem
    })

  return sortEditorItems([
    ...mergedItems,
    ...currentItemsMap.values(),
  ])
}

function toGridStateColumns(items: GridColumnSettingEditorItem[]): GridStateColumn[] {
  return sortEditorItems(items).map((item) => ({
    dataField: item.columnName,
    name: item.columnName,
    visible: item.isVisible,
    visibleIndex: typeof item.visibleIndex === "number" ? item.visibleIndex : undefined,
    width: typeof item.width === "number" ? item.width : undefined,
    fixed: item.fixedPosition !== "none",
    fixedPosition: item.fixedPosition === "none" ? undefined : item.fixedPosition,
    allowHiding: item.allowHiding,
    sortOrder: item.sortOrder === "asc" || item.sortOrder === "desc" ? item.sortOrder : undefined,
    sortIndex: typeof item.sortIndex === "number" ? item.sortIndex : undefined,
  }))
}

function readColumnsFromComponent(component: GridComponent | null | undefined): GridColumnSettingEditorItem[] {
  if (!component || typeof component.columnCount !== "function" || typeof component.columnOption !== "function") {
    return []
  }

  const count = component.columnCount()
  const columns: GridStateColumn[] = []

  for (let index = 0; index < count; index += 1) {
    const column = component.columnOption(index)
    if (column) {
      columns.push(column)
    }
  }

  return toEditorItemsFromColumns(columns)
}

export function useGridColumnSettingState({
  enabled = true,
  screenCd,
  gridId,
}: UseGridColumnSettingStateOptions) {
  const {
    ensureGridColumnSettingsLoaded,
    getGridColumnSettings,
    reloadGridColumnSettings,
    settingsVersion,
    setGridColumnSettings,
  } = useSysGridColumnSettings()
  const target = useMemo(() => {
    const normalizedScreenCd = normalizeText(screenCd)
    const normalizedGridId = normalizeText(gridId)

    if (!enabled || !normalizedScreenCd || !normalizedGridId) {
      return null
    }

    return {
      screenCd: normalizedScreenCd,
      gridId: normalizedGridId,
    }
  }, [enabled, gridId, screenCd])
  const targetCacheKey = useMemo(
    () => (target ? buildTargetCacheKey(target.screenCd, target.gridId) : ""),
    [target],
  )
  const pendingHydrationSignatureRef = useRef<string | null>(null)
  const programmaticSignatureRef = useRef<string | null>(null)
  const baselineItemsRef = useRef<GridColumnSettingEditorItem[] | null>(null)
  const cachedEditorItems = useMemo(() => {
    if (!target) {
      return []
    }

    const cachedSettings = getGridColumnSettings(target.screenCd, target.gridId)
    return cachedSettings.length ? toEditorItemsFromApi(cachedSettings) : []
  }, [getGridColumnSettings, settingsVersion, target])

  useEffect(() => {
    if (!targetCacheKey || !cachedEditorItems.length) {
      return
    }

    const cachedSignature = buildEditorItemsSignature(cachedEditorItems)
    savedSignatureMap.set(targetCacheKey, cachedSignature)
    pendingHydrationSignatureRef.current = cachedSignature
  }, [cachedEditorItems, targetCacheKey])

  useEffect(() => {
    programmaticSignatureRef.current = null
    pendingHydrationSignatureRef.current = null
    baselineItemsRef.current = null
  }, [targetCacheKey])

  const buildComparableItem = useCallback((item: GridColumnSettingEditorItem) => ({
    columnName: item.columnName.toUpperCase(),
    fixedPosition: normalizeFixedPosition(item.fixedPosition, "none"),
    isVisible: item.isVisible ? 1 : 0,
    sortIndex: toNullableNumber(item.sortIndex),
    sortOrder: normalizeText(item.sortOrder).toLowerCase(),
    visibleIndex: typeof item.visibleIndex === "number" ? item.visibleIndex : null,
    width: toNullableNumber(item.width),
  }), [])

  const resolveChangedItems = useCallback((
    nextItems: GridColumnSettingEditorItem[],
    baselineItems: GridColumnSettingEditorItem[],
  ) => {
    if (!baselineItems.length) {
      return nextItems
    }

    const baselineMap = new Map(
      baselineItems.map((item) => [item.columnName.toUpperCase(), buildComparableItem(item)] as const),
    )

    return nextItems.filter((item) => {
      const baseline = baselineMap.get(item.columnName.toUpperCase())
      if (!baseline) {
        return true
      }

      const comparable = buildComparableItem(item)
      return JSON.stringify(comparable) !== JSON.stringify(baseline)
    })
  }, [buildComparableItem])

  const resolveCachedEditorItems = useCallback(async (force = false): Promise<GridColumnSettingEditorItem[]> => {
    if (!target || !targetCacheKey) {
      return []
    }

    if (!force) {
      const cachedSettings = getGridColumnSettings(target.screenCd, target.gridId)
      if (cachedSettings.length) {
        const cachedItems = toEditorItemsFromApi(cachedSettings)
        const cachedSignature = buildEditorItemsSignature(cachedItems)
        savedSignatureMap.set(targetCacheKey, cachedSignature)
        pendingHydrationSignatureRef.current = cachedSignature
        return cachedItems
      }
    }

    const pendingPromise = loadItemsPromiseMap.get(targetCacheKey)
    if (pendingPromise) {
      return await pendingPromise
    }

    const promise = (async () => {
      await ensureGridColumnSettingsLoaded(force)

      const nextSettings = getGridColumnSettings(target.screenCd, target.gridId)
      const nextItems = nextSettings.length ? toEditorItemsFromApi(nextSettings) : []

      if (nextItems.length) {
        const nextSignature = buildEditorItemsSignature(nextItems)
        savedSignatureMap.set(targetCacheKey, nextSignature)
        pendingHydrationSignatureRef.current = nextSignature
      } else if (force) {
        savedSignatureMap.delete(targetCacheKey)
        pendingHydrationSignatureRef.current = null
      }

      return nextItems
    })()

    loadItemsPromiseMap.set(targetCacheKey, promise)

    try {
      return await promise
    } catch (error) {
      console.error("Failed to resolve grid column settings", error)
      return []
    } finally {
      if (loadItemsPromiseMap.get(targetCacheKey) === promise) {
        loadItemsPromiseMap.delete(targetCacheKey)
      }
    }
  }, [ensureGridColumnSettingsLoaded, getGridColumnSettings, target, targetCacheKey])

  const loadEditorItems = useCallback(async (
    component?: GridComponent | null,
    force = false,
  ): Promise<GridColumnSettingEditorItem[]> => {
    if (!target) {
      return []
    }

    try {
      const currentItems = component ? readColumnsFromComponent(component) : []
      const cachedItems = await resolveCachedEditorItems(force)

      if (cachedItems.length) {
        const resolvedItems = filterPopupEditorItems(mergeEditorItemsWithCurrentColumns(currentItems, cachedItems))
        baselineItemsRef.current = resolvedItems
        return resolvedItems
      }

      const resolvedItems = currentItems.length ? filterPopupEditorItems(currentItems) : []
      baselineItemsRef.current = resolvedItems
      return resolvedItems
    } catch (error) {
      console.error("Failed to load grid column settings", error)
      const resolvedItems = component ? filterPopupEditorItems(readColumnsFromComponent(component)) : []
      baselineItemsRef.current = resolvedItems
      return resolvedItems
    }
  }, [resolveCachedEditorItems, target])

  const saveEditorItems = useCallback(async (items: GridColumnSettingEditorItem[]) => {
    if (!target || !targetCacheKey) {
      return sortEditorItems(items)
    }

    const normalizedItems = sortEditorItems(items)
    const nextSignature = buildEditorItemsSignature(normalizedItems)
    const baselineItems = sortEditorItems(
      baselineItemsRef.current?.length
        ? baselineItemsRef.current
        : cachedEditorItems.length
          ? cachedEditorItems
          : [],
    )
    const changedItems = sortEditorItems(resolveChangedItems(normalizedItems, baselineItems))
    const pendingPromise = saveItemsPromiseMap.get(targetCacheKey)

    if (pendingPromise && pendingSaveSignatureMap.get(targetCacheKey) === nextSignature) {
      return await pendingPromise
    }

    if (savedSignatureMap.get(targetCacheKey) === nextSignature) {
      baselineItemsRef.current = normalizedItems
      return normalizedItems
    }

    if (changedItems.length === 0) {
      savedSignatureMap.set(targetCacheKey, nextSignature)
      baselineItemsRef.current = normalizedItems
      return normalizedItems
    }

    const promise = (async () => {
      if (pendingPromise) {
        try {
          await pendingPromise
        } catch {
        }

        if (savedSignatureMap.get(targetCacheKey) === nextSignature) {
          return normalizedItems
        }
      }

      try {
        const response = await saveSysGridColumnSettings(target.screenCd, target.gridId, {
          SCREEN_CD: target.screenCd,
          GRID_ID: target.gridId,
          COLUMNS: toSaveItems(changedItems),
        })

        let refreshedSettings = Array.isArray(response.data) ? response.data : []
        if (response.success !== false) {
          loadItemsPromiseMap.delete(targetCacheKey)

          try {
            refreshedSettings = await reloadGridColumnSettings(target.screenCd, target.gridId)
          } catch (reloadError) {
            console.error("Failed to refresh sys grid column settings cache after save", reloadError)
            if (refreshedSettings.length) {
              setGridColumnSettings(target.screenCd, target.gridId, refreshedSettings)
            }
          }
        }

        const resolvedItems = refreshedSettings.length ? toEditorItemsFromApi(refreshedSettings) : normalizedItems
        savedSignatureMap.set(targetCacheKey, buildEditorItemsSignature(resolvedItems))
        baselineItemsRef.current = resolvedItems
        pendingHydrationSignatureRef.current = null
        return resolvedItems
      } catch (error) {
        console.error("Failed to save grid column settings", error)
        return normalizedItems
      }
    })()

    pendingSaveSignatureMap.set(targetCacheKey, nextSignature)
    saveItemsPromiseMap.set(targetCacheKey, promise)

    try {
      return await promise
    } finally {
      if (saveItemsPromiseMap.get(targetCacheKey) === promise) {
        saveItemsPromiseMap.delete(targetCacheKey)
        pendingSaveSignatureMap.delete(targetCacheKey)
      }
    }
  }, [cachedEditorItems, reloadGridColumnSettings, resolveChangedItems, setGridColumnSettings, target, targetCacheKey])

  const syncEditorItemsToComponent = useCallback((component: GridComponent | null | undefined, items: GridColumnSettingEditorItem[]) => {
    const normalizedItems = sortEditorItems(items)
    if (!component) {
      return normalizedItems
    }

    programmaticSignatureRef.current = buildEditorItemsSignature(normalizedItems)

    if (typeof component.state !== "function") {
      if (!applyGridColumnSettingsToComponent(component, normalizedItems)) {
        return normalizedItems
      }

      return normalizedItems
    }

    const appliedWithColumnOptions = applyGridColumnSettingsToComponent(component, normalizedItems)

    if (!appliedWithColumnOptions) {
      component.beginUpdate?.()

      try {
        const currentState = (component.state() as GridState | undefined) ?? {}
        component.state({
          ...currentState,
          columns: toGridStateColumns(normalizedItems),
        })
      } finally {
        component.endUpdate?.()
      }
    }

    return normalizedItems
  }, [])

  const applyEditorItemsToComponent = useCallback(async (component: GridComponent | null | undefined, items: GridColumnSettingEditorItem[]) => {
    const normalizedItems = syncEditorItemsToComponent(component, items)
    return await saveEditorItems(normalizedItems)
  }, [saveEditorItems, syncEditorItemsToComponent])

  const resetEditorItems = useCallback(async (component?: GridComponent | null) => {
    if (!target || !targetCacheKey) {
      return component ? filterPopupEditorItems(readColumnsFromComponent(component)) : []
    }

    const currentItems = component ? readColumnsFromComponent(component) : []
    const pendingPromise = resetItemsPromiseMap.get(targetCacheKey)

    if (pendingPromise) {
      return await pendingPromise
    }

    const promise = (async () => {
      try {
        const response = await resetSysGridColumnSettings(target.screenCd, target.gridId)
        const defaultSettings = Array.isArray(response.data) ? response.data : []
        const resolvedItems = defaultSettings.length
          ? mergeEditorItemsWithCurrentColumns(currentItems, toEditorItemsFromApi(defaultSettings))
          : currentItems
        return filterPopupEditorItems(resolvedItems)
      } catch (error) {
        console.error("Failed to reset grid column settings", error)
        return filterPopupEditorItems(currentItems)
      } finally {
        if (resetItemsPromiseMap.get(targetCacheKey) === promise) {
          resetItemsPromiseMap.delete(targetCacheKey)
        }
      }
    })()

    resetItemsPromiseMap.set(targetCacheKey, promise)
    return await promise
  }, [target, targetCacheKey])

  const customLoad = useCallback(async (): Promise<GridState> => {
    if (!target) {
      return {}
    }

    const items = await resolveCachedEditorItems()
    if (!items.length) {
      return {}
    }

    return {
      columns: toGridStateColumns(items),
    }
  }, [resolveCachedEditorItems, target])

  const customSave = useCallback(async (state: GridState) => {
    if (!target || !targetCacheKey || !Array.isArray(state?.columns)) {
      return
    }

    const nextItems = toEditorItemsFromColumns(state.columns)
    if (!nextItems.length) {
      return
    }

    const nextSignature = buildEditorItemsSignature(nextItems)
    if (programmaticSignatureRef.current === nextSignature) {
      programmaticSignatureRef.current = null
      if (pendingHydrationSignatureRef.current === nextSignature) {
        pendingHydrationSignatureRef.current = null
      }
      return
    }

    if (pendingHydrationSignatureRef.current) {
      if (pendingHydrationSignatureRef.current === nextSignature) {
        pendingHydrationSignatureRef.current = null
      }

      return
    }

    if (!savedSignatureMap.has(targetCacheKey)) {
      savedSignatureMap.set(targetCacheKey, nextSignature)
      return
    }

    if (savedSignatureMap.get(targetCacheKey) === nextSignature) {
      return
    }

    await saveEditorItems(nextItems)
  }, [saveEditorItems, target, targetCacheKey])

  const refreshEditorItems = useCallback(async (component?: GridComponent | null) => {
    if (targetCacheKey) {
      loadItemsPromiseMap.delete(targetCacheKey)
      resetItemsPromiseMap.delete(targetCacheKey)
      savedSignatureMap.delete(targetCacheKey)
      baselineItemsRef.current = null
    }

    return await loadEditorItems(component, true)
  }, [loadEditorItems, targetCacheKey])

  return {
    enabled: target !== null,
    customLoad,
    customSave,
    loadEditorItems,
    refreshEditorItems,
    resetEditorItems,
    saveEditorItems,
    syncEditorItemsToComponent,
    applyEditorItemsToComponent,
    cachedEditorItems,
    readColumnsFromComponent,
  }
}
