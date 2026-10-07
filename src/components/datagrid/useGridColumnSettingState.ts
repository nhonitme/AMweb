import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import {
  resetSysGridColumnTemplate,
  saveSysGridColumnSettings,
} from "@/api/sysGridColumnSettingApi"
import {
  applyGridColumnSettingsToComponent,
  isGridComponentReady,
  isSystemFixedColumnName,
  isTechnicalIdColumnName,
} from "@/components/datagrid/gridColumnSettingRender"
import { asGridSettingArray } from "@/lib/gridSettingCache"
import { getCurrentCompanyCd, getCurrentUserId } from "@/lib/login"
import { LanguageContext } from "@/lib/i18nLoader"
import { useSysGridColumnSettings } from "@/lib/sysGridColumnSettingContext"
import {
  getStoredGridTemplateId,
  setStoredGridTemplateId,
} from "@/lib/sysGridColumnTemplateStorage"
import type {
  GridColumnSettingEditorItem,
  GridColumnTemplateOption,
  SysGridColumn,
  SysGridColumnSettingSaveItem,
  SysGridColumnTemplate,
} from "@/types/sysGridColumnSetting"
import { SYSTEM_GRID_TEMPLATE_ID } from "@/types/sysGridColumnSetting"

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
  columnOption?: (id: string | number, ...rest: unknown[]) => GridStateColumn | undefined | void
  endUpdate?: () => void
  repaint?: () => void
  state?: ((state?: GridState) => GridState | void)
  updateDimensions?: () => void
}

type UseGridColumnSettingStateOptions = {
  enabled?: boolean
  menuCode?: string
  screenCd?: string
  gridId?: string
  excludedColumnNames?: readonly string[]
  /** Hide schema/store columns that are absent from sys_grid_column. */
  hideColumnsMissingFromSettings?: boolean
}

type CreateTemplatePayload = {
  isDefaultTemplate: boolean
  templateName: string
}

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

function normalizeTemplateId(value: unknown): number {
  const parsed = typeof value === "number" ? value : Number.parseInt(normalizeText(value), 10)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : SYSTEM_GRID_TEMPLATE_ID
}

function buildTargetCacheKey(gridId: string, templateId: number): string {
  return [getCurrentCompanyCd(), getCurrentUserId(), gridId, String(templateId)]
    .map((item) => normalizeText(item).toUpperCase())
    .join("::")
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
  const normalized = normalizeText(value)
  return normalized.toLowerCase() === "buttons" || isSystemFixedColumnName(normalized)
}

function normalizeFixedPosition(value: unknown, fallback = "none"): "none" | "left" | "right" {
  const normalized = normalizeText(value).toLowerCase()
  if (normalized === "left" || normalized === "right") {
    return normalized
  }

  return fallback === "left" || fallback === "right" ? fallback : "none"
}

function sortEditorItems(items: GridColumnSettingEditorItem[] | null | undefined): GridColumnSettingEditorItem[] {
  return asGridSettingArray(items).sort((left, right) => {
    const leftIndex = typeof left.visibleIndex === "number" ? left.visibleIndex : Number.MAX_SAFE_INTEGER
    const rightIndex = typeof right.visibleIndex === "number" ? right.visibleIndex : Number.MAX_SAFE_INTEGER

    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }

    return left.columnName.localeCompare(right.columnName)
  })
}

function buildEditorItemsSignature(items: GridColumnSettingEditorItem[] | null | undefined): string {
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

function restoreTrustedHiddenColumns(
  nextItems: GridColumnSettingEditorItem[],
  trustedItems: GridColumnSettingEditorItem[] | null | undefined,
): { items: GridColumnSettingEditorItem[]; restored: boolean } {
  if (!trustedItems?.length) {
    return { items: nextItems, restored: false }
  }

  const trustedHidden = new Map(
    trustedItems
      .filter((item) => !item.isVisible)
      .map((item) => [item.columnName.toUpperCase(), item] as const),
  )
  if (!trustedHidden.size) {
    return { items: nextItems, restored: false }
  }

  let restored = false
  const items = nextItems.map((item) => {
    const trusted = trustedHidden.get(item.columnName.toUpperCase())
    if (!trusted || !item.isVisible) {
      return item
    }

    restored = true
    return {
      ...item,
      isVisible: false,
      allowHiding: trusted.allowHiding,
    }
  })

  return { items, restored }
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
        caption: normalizeText(column.caption),
        labelText: null,
        columnLabelText: null,
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

function toEditorItemsFromApi(settings: SysGridColumn[] | null | undefined): GridColumnSettingEditorItem[] {
  return sortEditorItems(
    asGridSettingArray(settings)
      .filter((item) => {
        const columnName = normalizeText(item.FIELD_NAME)
        return columnName.length > 0 && !isReservedColumnName(columnName)
      })
      .map((item) => {
        const technicalIdColumn = isTechnicalIdColumnName(item.FIELD_NAME)

        return {
          columnName: item.FIELD_NAME,
          caption: normalizeText(item.CAPTION),
          labelText: item.LABEL_TEXT ?? null,
          columnLabelText: item.COLUMN_LABEL_TEXT ?? null,
          isVisible: technicalIdColumn ? false : item.IS_VISIBLE !== "0",
          width: typeof item.COLUMN_WIDTH === "number" && Number.isFinite(item.COLUMN_WIDTH) ? item.COLUMN_WIDTH : null,
          fixedPosition:
            item.IS_FIXED === "1"
              ? normalizeFixedPosition(item.FIXED_POSITION, "left")
              : normalizeFixedPosition(item.FIXED_POSITION, "none"),
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
          alignment: normalizeNullableText(item.ALIGN),
          formatType: normalizeNullableText(item.FORMAT_TYPE),
        }
      }),
  )
}

function toSaveItems(items: GridColumnSettingEditorItem[]): SysGridColumnSettingSaveItem[] {
  return sortEditorItems(items).map((item, index) => {
    const technicalIdColumn = isTechnicalIdColumnName(item.columnName)

    return {
      FIELD_NAME: item.columnName,
      LABEL_TEXT: item.labelText || item.columnName,
      CAPTION: item.caption,
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

function filterPopupEditorItems(items: GridColumnSettingEditorItem[] | null | undefined): GridColumnSettingEditorItem[] {
  return sortEditorItems(
    asGridSettingArray(items).filter((item) => {
      if (isTechnicalIdColumnName(item.columnName) || isSystemFixedColumnName(item.columnName)) {
        return false
      }
      // Locked-hidden (e.g. STATUS code): keep out of ColumnChooser UI
      if (!item.allowHiding && !item.isVisible) {
        return false
      }
      return true
    }),
  )
}

function isUnsetOrTechnicalCaption(caption: unknown, columnName: unknown): boolean {
  const normalizedCaption = normalizeText(caption)
  const normalizedColumnName = normalizeText(columnName)
  if (!normalizedCaption) {
    return true
  }

  if (!normalizedColumnName) {
    return false
  }

  return normalizedCaption.toUpperCase() === normalizedColumnName.toUpperCase()
}

function resolveMergedCaption(
  savedCaption: unknown,
  columnName: unknown,
  currentCaption: unknown,
): string {
  const liveCaption = normalizeText(currentCaption)
  if (isUnsetOrTechnicalCaption(savedCaption, columnName)) {
    return liveCaption || normalizeText(savedCaption) || normalizeText(columnName)
  }

  return normalizeText(savedCaption) || liveCaption || normalizeText(columnName)
}

function mergeEditorItemsWithCurrentColumns(
  currentItems: GridColumnSettingEditorItem[] | null | undefined,
  savedItems: GridColumnSettingEditorItem[] | null | undefined,
): GridColumnSettingEditorItem[] {
  const normalizedCurrentItems = asGridSettingArray(currentItems)
  const normalizedSavedItems = asGridSettingArray(savedItems)

  if (!normalizedCurrentItems.length) {
    return sortEditorItems(normalizedSavedItems)
  }

  if (!normalizedSavedItems.length) {
    return sortEditorItems(normalizedCurrentItems)
  }

  const currentItemsMap = new Map(
    normalizedCurrentItems.map((item) => [item.columnName.toUpperCase(), item] as const),
  )

  const mergedItems = normalizedSavedItems
    .map((savedItem) => {
      const key = savedItem.columnName.toUpperCase()
      const currentItem = currentItemsMap.get(key)
      const technicalIdColumn = isTechnicalIdColumnName(savedItem.columnName)

      if (!currentItem) {
        return null
      }

      currentItemsMap.delete(key)
      return {
        ...savedItem,
        caption: resolveMergedCaption(savedItem.caption, savedItem.columnName, currentItem.caption),
        columnLabelText: savedItem.columnLabelText ?? currentItem.columnLabelText ?? null,
        labelText: savedItem.labelText ?? currentItem.labelText ?? null,
        isVisible: technicalIdColumn ? false : savedItem.isVisible && currentItem.isVisible,
        width: savedItem.width ?? currentItem.width,
        fixedPosition: savedItem.fixedPosition,
        visibleIndex: savedItem.visibleIndex,
        allowHiding: technicalIdColumn ? false : currentItem.allowHiding,
        sortOrder: savedItem.sortOrder,
        sortIndex: savedItem.sortIndex,
      } satisfies GridColumnSettingEditorItem
    })
    .filter((item): item is GridColumnSettingEditorItem => item !== null)

  return sortEditorItems([
    ...mergedItems,
    ...currentItemsMap.values(),
  ])
}

function keepOnlySavedEditorItems(
  mergedItems: GridColumnSettingEditorItem[],
  savedItems: GridColumnSettingEditorItem[],
): GridColumnSettingEditorItem[] {
  const savedKeys = new Set(savedItems.map((item) => item.columnName.toUpperCase()))
  return sortEditorItems(mergedItems.filter((item) => savedKeys.has(item.columnName.toUpperCase())))
}

function collectPositiveWidths(items: GridColumnSettingEditorItem[] | null | undefined): Map<string, number> {
  const widths = new Map<string, number>()
  for (const item of asGridSettingArray(items)) {
    const width = toNullableNumber(item.width)
    if (width != null && width > 0) {
      widths.set(item.columnName.toUpperCase(), width)
    }
  }

  return widths
}

function rememberDraggedWidths(
  items: GridColumnSettingEditorItem[],
  baselineItems: GridColumnSettingEditorItem[] | null | undefined,
  draggedWidths: Map<string, number>,
) {
  const baselineWidths = collectPositiveWidths(baselineItems)
  for (const item of items) {
    const key = item.columnName.toUpperCase()
    const width = toNullableNumber(item.width)
    if (width == null || width <= 0) {
      continue
    }

    if (baselineWidths.get(key) === width) {
      draggedWidths.delete(key)
      continue
    }

    draggedWidths.set(key, width)
  }
}

function applyDraggedWidths(
  items: GridColumnSettingEditorItem[],
  liveItems: GridColumnSettingEditorItem[] | null | undefined,
  draggedWidths: ReadonlyMap<string, number>,
): GridColumnSettingEditorItem[] {
  const liveWidths = collectPositiveWidths(liveItems)
  if (!liveWidths.size && !draggedWidths.size) {
    return items
  }

  let changed = false
  const nextItems = items.map((item) => {
    const key = item.columnName.toUpperCase()
    const width = draggedWidths.get(key) ?? liveWidths.get(key) ?? null
    if (width == null || width === item.width) {
      return item
    }

    changed = true
    return {
      ...item,
      width,
    }
  })

  return changed ? nextItems : items
}

function scopeEditorItemsToCurrentColumns(
  items: GridColumnSettingEditorItem[] | null | undefined,
  currentItems: GridColumnSettingEditorItem[] | null | undefined,
): GridColumnSettingEditorItem[] {
  const normalizedItems = asGridSettingArray(items)
  const normalizedCurrentItems = asGridSettingArray(currentItems)

  if (!normalizedCurrentItems.length) {
    return sortEditorItems(normalizedItems)
  }

  const currentItemsMap = new Map(
    normalizedCurrentItems.map((item) => [item.columnName.toUpperCase(), item] as const),
  )
  const scopedItems = normalizedItems
    .map((item) => {
      const currentItem = currentItemsMap.get(item.columnName.toUpperCase())
      if (!currentItem) {
        return null
      }

      return {
        ...item,
        caption: resolveMergedCaption(item.caption, item.columnName, currentItem.caption),
        columnLabelText: item.columnLabelText ?? currentItem.columnLabelText ?? null,
        allowHiding: currentItem.allowHiding,
      } satisfies GridColumnSettingEditorItem
    })
    .filter((item): item is GridColumnSettingEditorItem => item !== null)

  return sortEditorItems(scopedItems.length ? scopedItems : normalizedCurrentItems)
}

function readColumnsFromComponent(component: GridComponent | null | undefined): GridColumnSettingEditorItem[] {
  if (!component || typeof component.columnCount !== "function" || typeof component.columnOption !== "function") {
    return []
  }

  const count = component.columnCount()
  const columns: GridStateColumn[] = []

  for (let index = 0; index < count; index += 1) {
    const column = component.columnOption(index)
    if (!column) {
      continue
    }

    const configuredWidth = toNullableNumber(column.width)
    const visibleWidth = toNullableNumber(component.columnOption(index, "visibleWidth"))
    columns.push({
      ...column,
      width: configuredWidth && configuredWidth > 0
        ? configuredWidth
        : visibleWidth && visibleWidth > 0
          ? visibleWidth
          : configuredWidth,
    })
  }

  return toEditorItemsFromColumns(columns)
}

function sortTemplates(templates: SysGridColumnTemplate[] | null | undefined): SysGridColumnTemplate[] {
  return asGridSettingArray(templates).sort((left, right) => {
    const leftDefault = left.IS_DEFAULT_TEMPLATE === "1" ? 0 : 1
    const rightDefault = right.IS_DEFAULT_TEMPLATE === "1" ? 0 : 1
    if (leftDefault !== rightDefault) {
      return leftDefault - rightDefault
    }

    return normalizeText(left.TEMPLATE_NAME).localeCompare(normalizeText(right.TEMPLATE_NAME))
  })
}

function resolvePreferredTemplateId(
  templates: SysGridColumnTemplate[],
  preferredTemplateId?: number | null,
): number {
  const sortedTemplates = sortTemplates(templates)
  const normalizedPreferredTemplateId = normalizeTemplateId(preferredTemplateId)

  if (normalizedPreferredTemplateId > 0) {
    const matchedTemplate = sortedTemplates.find((item) => item.TEMPLATE_ID === normalizedPreferredTemplateId)
    if (matchedTemplate) {
      return matchedTemplate.TEMPLATE_ID
    }
  }

  const defaultTemplate = sortedTemplates.find((item) => item.IS_DEFAULT_TEMPLATE === "1")
  if (defaultTemplate) {
    return defaultTemplate.TEMPLATE_ID
  }

  return SYSTEM_GRID_TEMPLATE_ID
}

function toTemplateOptions(templates: SysGridColumnTemplate[]): GridColumnTemplateOption[] {
  const userOptions = sortTemplates(templates).map((item) => ({
    templateId: item.TEMPLATE_ID,
    templateName: normalizeText(item.TEMPLATE_NAME) || `Mẫu ${item.TEMPLATE_ID}`,
    isDefaultTemplate: item.IS_DEFAULT_TEMPLATE === "1",
    isSystemTemplate: false,
    columnCount: 0,
  }))

  return [
    {
      templateId: SYSTEM_GRID_TEMPLATE_ID,
      templateName: "Mặc định",
      isDefaultTemplate: userOptions.every((item) => !item.isDefaultTemplate),
      isSystemTemplate: true,
      columnCount: 0,
    },
    ...userOptions,
  ]
}

function resolveSavedTemplateId(
  templates: SysGridColumnTemplate[],
  requestedTemplateId: number,
  requestedName?: string,
): number {
  const sortedTemplates = sortTemplates(templates)

  if (requestedTemplateId > 0) {
    const matchedTemplate = sortedTemplates.find((item) => item.TEMPLATE_ID === requestedTemplateId)
    if (matchedTemplate) {
      return matchedTemplate.TEMPLATE_ID
    }
  }

  const normalizedName = normalizeText(requestedName)
  if (normalizedName) {
    const matchedName = sortedTemplates.find(
      (item) => normalizeText(item.TEMPLATE_NAME).toUpperCase() === normalizedName.toUpperCase(),
    )
    if (matchedName) {
      return matchedName.TEMPLATE_ID
    }
  }

  const defaultTemplate = sortedTemplates.find((item) => item.IS_DEFAULT_TEMPLATE === "1")
  if (defaultTemplate) {
    return defaultTemplate.TEMPLATE_ID
  }

  return sortedTemplates[0]?.TEMPLATE_ID ?? SYSTEM_GRID_TEMPLATE_ID
}

export function useGridColumnSettingState({
  enabled = true,
  gridId,
  excludedColumnNames = [],
  hideColumnsMissingFromSettings = false,
}: UseGridColumnSettingStateOptions) {
  const { translate } = useContext(LanguageContext)
  const translateCaption = useCallback(
    (key: string, fallback: string) => translate?.(key, fallback) ?? fallback,
    [translate],
  )
  const {
    getGridColumnSettings,
    getGridColumnTemplates,
    patchGridSlice,
    settingsRevision,
  } = useSysGridColumnSettings()

  const target = useMemo(() => {
    const normalizedCompanyCd = normalizeText(getCurrentCompanyCd())
    const normalizedUserId = normalizeText(getCurrentUserId())
    const normalizedGridId = normalizeText(gridId)

    if (!enabled || !normalizedCompanyCd || !normalizedUserId || !normalizedGridId) {
      return null
    }

    return {
      companyCd: normalizedCompanyCd,
      gridId: normalizedGridId,
      userId: normalizedUserId,
    }
  }, [enabled, gridId])

  const excludedColumnNamesKey = useMemo(
    () =>
      Array.from(new Set(excludedColumnNames.map((item) => normalizeText(item).toUpperCase()).filter(Boolean)))
        .sort()
        .join("|"),
    [excludedColumnNames],
  )

  const excludedColumnNameSet = useMemo(
    () => new Set(excludedColumnNamesKey ? excludedColumnNamesKey.split("|") : []),
    [excludedColumnNamesKey],
  )

  const filterExcludedEditorItems = useCallback(
    (items: GridColumnSettingEditorItem[] | null | undefined): GridColumnSettingEditorItem[] =>
      asGridSettingArray(items).filter((item) => !excludedColumnNameSet.has(item.columnName.toUpperCase())),
    [excludedColumnNameSet],
  )

  const readFilteredColumnsFromComponent = useCallback(
    (component: GridComponent | null | undefined): GridColumnSettingEditorItem[] =>
      filterExcludedEditorItems(readColumnsFromComponent(component)),
    [filterExcludedEditorItems],
  )

  const filterEditableItems = useCallback(
    (items: GridColumnSettingEditorItem[]): GridColumnSettingEditorItem[] =>
      filterPopupEditorItems(filterExcludedEditorItems(items)),
    [filterExcludedEditorItems],
  )

  const [currentTemplateIdState, setCurrentTemplateIdState] = useState(() =>
    target ? getStoredGridTemplateId(target.gridId) : SYSTEM_GRID_TEMPLATE_ID,
  )
  const [templateLoading, setTemplateLoading] = useState(false)
  const pendingHydrationSignatureRef = useRef<string | null>(null)
  const programmaticSignatureRef = useRef<string | null>(null)
  const baselineItemsRef = useRef<GridColumnSettingEditorItem[] | null>(null)
  const draggedWidthRef = useRef<Map<string, number>>(new Map())

  const setCurrentTemplateId = useCallback((nextTemplateId: number) => {
    const normalizedTemplateId = normalizeTemplateId(nextTemplateId)
    setCurrentTemplateIdState(normalizedTemplateId)

    if (target) {
      setStoredGridTemplateId(target.gridId, normalizedTemplateId)
    }
  }, [target])

  useEffect(() => {
    programmaticSignatureRef.current = null
    pendingHydrationSignatureRef.current = null
    baselineItemsRef.current = null
    draggedWidthRef.current.clear()

    if (!target) {
      setCurrentTemplateIdState(SYSTEM_GRID_TEMPLATE_ID)
      return
    }

    setCurrentTemplateIdState(getStoredGridTemplateId(target.gridId))
  }, [target?.companyCd, target?.gridId, target?.userId])

  const cachedTemplates = useMemo(() => {
    if (!target) {
      return []
    }

    return getGridColumnTemplates(target.gridId)
  }, [getGridColumnTemplates, settingsRevision, target])

  const currentTemplateId = useMemo(
    () => resolvePreferredTemplateId(cachedTemplates, currentTemplateIdState),
    [cachedTemplates, currentTemplateIdState],
  )

  useEffect(() => {
    if (!target) {
      return
    }

    if (currentTemplateIdState === currentTemplateId) {
      return
    }

    setCurrentTemplateId(currentTemplateId)
  }, [currentTemplateId, currentTemplateIdState, setCurrentTemplateId, target])

  const currentTemplate = useMemo(
    () => toTemplateOptions(cachedTemplates).find(
      (item) => item.templateId === currentTemplateId,
    ) ?? {
      templateId: currentTemplateId,
      templateName: currentTemplateId === SYSTEM_GRID_TEMPLATE_ID ? "Mặc định" : `Mẫu ${currentTemplateId}`,
      isDefaultTemplate: currentTemplateId === SYSTEM_GRID_TEMPLATE_ID,
      isSystemTemplate: currentTemplateId === SYSTEM_GRID_TEMPLATE_ID,
      columnCount: 0,
    },
    [cachedTemplates, currentTemplateId],
  )

  const templateOptions = useMemo(
    () => toTemplateOptions(cachedTemplates),
    [cachedTemplates],
  )

  const targetCacheKey = useMemo(
    () => (target ? buildTargetCacheKey(target.gridId, currentTemplateId) : ""),
    [currentTemplateId, target],
  )

  const targetIdentity = useMemo(
    () =>
      target
        ? [
            target.companyCd.toUpperCase(),
            target.userId.toUpperCase(),
            target.gridId.toUpperCase(),
          ].join("::")
        : "",
    [target],
  )

  const cachedEditorItems = useMemo(() => {
    if (!target) {
      return []
    }

      const cachedSettings = getGridColumnSettings(target.gridId, currentTemplateId)
      return asGridSettingArray(cachedSettings).length
        ? filterExcludedEditorItems(toEditorItemsFromApi(cachedSettings))
        : []
  }, [currentTemplateId, filterExcludedEditorItems, getGridColumnSettings, settingsRevision, target])

  useEffect(() => {
    if (!targetCacheKey || !cachedEditorItems.length) {
      return
    }

    const cachedSignature = buildEditorItemsSignature(cachedEditorItems)
    savedSignatureMap.set(targetCacheKey, cachedSignature)
    pendingHydrationSignatureRef.current = cachedSignature
    if (!baselineItemsRef.current?.length) {
      baselineItemsRef.current = cachedEditorItems
    }
  }, [cachedEditorItems, targetCacheKey])

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

  const loadItemsForTemplate = useCallback(async (
    component?: GridComponent | null,
    templateIdOverride?: number,
  ): Promise<GridColumnSettingEditorItem[]> => {
    if (!target) {
      return []
    }

    const gridTemplateId = currentTemplateId
    const preferredTemplateId = normalizeTemplateId(templateIdOverride ?? gridTemplateId)
    const templates = getGridColumnTemplates(target.gridId)
    const desiredTemplateId = resolvePreferredTemplateId(templates, preferredTemplateId)
    const cachedSettings = getGridColumnSettings(target.gridId, desiredTemplateId)
    const currentItems = component ? readFilteredColumnsFromComponent(component) : []
    const cachedItems = cachedSettings.length
      ? filterExcludedEditorItems(toEditorItemsFromApi(cachedSettings))
      : []

    if (desiredTemplateId !== currentTemplateId) {
      setCurrentTemplateId(desiredTemplateId)
    }

    const resolvedItems = cachedItems.length
      ? filterEditableItems(
          hideColumnsMissingFromSettings
            ? keepOnlySavedEditorItems(
                mergeEditorItemsWithCurrentColumns(currentItems, cachedItems),
                cachedItems,
              )
            : mergeEditorItemsWithCurrentColumns(currentItems, cachedItems),
        )
      : hideColumnsMissingFromSettings
        ? []
        : currentItems.length
          ? filterEditableItems(currentItems)
          : []

    const keepLiveWidths = desiredTemplateId === gridTemplateId
    if (!keepLiveWidths) {
      draggedWidthRef.current.clear()
    }

    baselineItemsRef.current = resolvedItems
    return keepLiveWidths
      ? applyDraggedWidths(resolvedItems, currentItems, draggedWidthRef.current)
      : resolvedItems
  }, [
    currentTemplateId,
    filterEditableItems,
    filterExcludedEditorItems,
    getGridColumnSettings,
    getGridColumnTemplates,
    hideColumnsMissingFromSettings,
    readFilteredColumnsFromComponent,
    setCurrentTemplateId,
    target,
  ])

  const loadEditorItems = useCallback(async (
    component?: GridComponent | null,
  ): Promise<GridColumnSettingEditorItem[]> => {
    return await loadItemsForTemplate(component, currentTemplateId)
  }, [currentTemplateId, loadItemsForTemplate])

  const saveEditorItems = useCallback(async (items: GridColumnSettingEditorItem[], persistAll = true) => {
    if (!target || !targetCacheKey) {
      return sortEditorItems(filterExcludedEditorItems(items))
    }

    const normalizedItems = sortEditorItems(filterExcludedEditorItems(items))
    const nextSignature = buildEditorItemsSignature(normalizedItems)
    const baselineItems = sortEditorItems(
      baselineItemsRef.current?.length
        ? baselineItemsRef.current
        : cachedEditorItems.length
          ? cachedEditorItems
          : [],
    )
    if (!persistAll && !baselineItems.length) {
      return normalizedItems
    }

    const changedItems = persistAll ? normalizedItems : sortEditorItems(resolveChangedItems(normalizedItems, baselineItems))
    const pendingPromise = saveItemsPromiseMap.get(targetCacheKey)

    if (pendingPromise && pendingSaveSignatureMap.get(targetCacheKey) === nextSignature) {
      return await pendingPromise
    }

    if (!persistAll && savedSignatureMap.get(targetCacheKey) === nextSignature) {
      baselineItemsRef.current = normalizedItems
      return normalizedItems
    }

    if (!persistAll && changedItems.length === 0) {
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

        if (!persistAll && savedSignatureMap.get(targetCacheKey) === nextSignature) {
          return normalizedItems
        }
      }

      const response = await saveSysGridColumnSettings({
        GRID_ID: target.gridId,
        TEMPLATE_ID: currentTemplateId,
        TEMPLATE_NAME: currentTemplate.templateName,
        IS_DEFAULT_TEMPLATE: currentTemplate.isDefaultTemplate ? "1" : "0",
        COLUMNS: toSaveItems(changedItems),
      })

      patchGridSlice(target.gridId, {
        TEMPLATES: response.data.TEMPLATES,
        SETTINGS: response.data.SETTINGS,
      })

      const resolvedTemplateId = resolveSavedTemplateId(
        response.data.TEMPLATES,
        currentTemplateId,
        currentTemplate.templateName,
      )
      const resolvedCacheKey = buildTargetCacheKey(target.gridId, resolvedTemplateId) || targetCacheKey

      if (resolvedTemplateId !== currentTemplateId) {
        setCurrentTemplateId(resolvedTemplateId)
      }

      const mergedSettings = getGridColumnSettings(target.gridId, resolvedTemplateId)
      const resolvedItems = mergedSettings.length
        ? filterExcludedEditorItems(toEditorItemsFromApi(mergedSettings))
        : normalizedItems
      savedSignatureMap.set(resolvedCacheKey, buildEditorItemsSignature(resolvedItems))
      if (resolvedCacheKey !== targetCacheKey) {
        savedSignatureMap.delete(targetCacheKey)
      }
      draggedWidthRef.current.clear()
      baselineItemsRef.current = resolvedItems
      pendingHydrationSignatureRef.current = null
      return resolvedItems
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
  }, [
    cachedEditorItems,
    currentTemplate,
    currentTemplateId,
    filterExcludedEditorItems,
    getGridColumnSettings,
    patchGridSlice,
    resolveChangedItems,
    setCurrentTemplateId,
    target,
    targetCacheKey,
  ])

  const syncEditorItemsToComponent = useCallback((component: GridComponent | null | undefined, items: GridColumnSettingEditorItem[]) => {
    const normalizedItems = sortEditorItems(items)
    if (!isGridComponentReady(component)) {
      return normalizedItems
    }

    programmaticSignatureRef.current = buildEditorItemsSignature(normalizedItems)

    try {
      applyGridColumnSettingsToComponent(component, normalizedItems, translateCaption, {
        hideColumnsMissingFromSettings,
      })
    } catch (error) {
      console.error("Failed to sync grid column settings", error)
    }

    return normalizedItems
  }, [hideColumnsMissingFromSettings, translateCaption])

  const boundComponentRef = useRef<GridComponent | null>(null)
  const visibilityRepairTimerRef = useRef(0)

  const bindGridComponent = useCallback((component: GridComponent | null | undefined) => {
    boundComponentRef.current = component ?? null
  }, [])

  const repairVisibilityOnComponent = useCallback((items: GridColumnSettingEditorItem[]) => {
    const component = boundComponentRef.current
    if (!component || !items.length) {
      return
    }

    syncEditorItemsToComponent(component, items)
    window.clearTimeout(visibilityRepairTimerRef.current)
    visibilityRepairTimerRef.current = window.setTimeout(() => {
      if (boundComponentRef.current) {
        syncEditorItemsToComponent(boundComponentRef.current, items)
      }
    }, 600)
  }, [syncEditorItemsToComponent])

  useEffect(() => () => {
    window.clearTimeout(visibilityRepairTimerRef.current)
  }, [])

  const applyEditorItemsToComponent = useCallback(async (component: GridComponent | null | undefined, items: GridColumnSettingEditorItem[]) => {
    const currentItems = component ? readFilteredColumnsFromComponent(component) : []
    const scopedItems = scopeEditorItemsToCurrentColumns(filterExcludedEditorItems(items), currentItems)
    const normalizedItems = syncEditorItemsToComponent(component, scopedItems)
    const savedItems = await saveEditorItems(normalizedItems)

    if (component) {
      syncEditorItemsToComponent(component, savedItems)
    }

    return savedItems
  }, [filterExcludedEditorItems, readFilteredColumnsFromComponent, saveEditorItems, syncEditorItemsToComponent])

  const resetEditorItems = useCallback(async (component?: GridComponent | null) => {
    if (!target || !targetCacheKey) {
      return component ? filterEditableItems(readFilteredColumnsFromComponent(component)) : []
    }

    setTemplateLoading(true)

    try {
      const currentItems = component ? readFilteredColumnsFromComponent(component) : []
      const response = await resetSysGridColumnTemplate({
        GRID_ID: target.gridId,
      })

      patchGridSlice(target.gridId, {
        TEMPLATES: response.data.TEMPLATES,
        SETTINGS: response.data.SETTINGS,
      })
      setCurrentTemplateId(SYSTEM_GRID_TEMPLATE_ID)

      const refreshedSettings = getGridColumnSettings(target.gridId, SYSTEM_GRID_TEMPLATE_ID)
      const refreshedItems = filterExcludedEditorItems(toEditorItemsFromApi(refreshedSettings))
      const resolvedItems = refreshedItems.length
        ? hideColumnsMissingFromSettings
          ? keepOnlySavedEditorItems(
              mergeEditorItemsWithCurrentColumns(currentItems, refreshedItems),
              refreshedItems,
            )
          : mergeEditorItemsWithCurrentColumns(currentItems, refreshedItems)
        : hideColumnsMissingFromSettings
          ? []
          : currentItems
      const editableItems = filterEditableItems(resolvedItems)
      const resolvedCacheKey = buildTargetCacheKey(target.gridId, SYSTEM_GRID_TEMPLATE_ID)
      const resolvedSignature = buildEditorItemsSignature(editableItems)

      if (resolvedCacheKey) {
        savedSignatureMap.set(resolvedCacheKey, resolvedSignature)
      }
      draggedWidthRef.current.clear()
      baselineItemsRef.current = editableItems
      pendingHydrationSignatureRef.current = null

      if (component) {
        syncEditorItemsToComponent(component, editableItems)
      }

      return editableItems
    } finally {
      setTemplateLoading(false)
    }
  }, [
    filterEditableItems,
    filterExcludedEditorItems,
    getGridColumnSettings,
    hideColumnsMissingFromSettings,
    patchGridSlice,
    readFilteredColumnsFromComponent,
    setCurrentTemplateId,
    syncEditorItemsToComponent,
    target,
    targetCacheKey,
  ])

  const changeTemplate = useCallback(async (
    templateId: number,
    component?: GridComponent | null,
  ) => {
    const normalizedTemplateId = normalizeTemplateId(templateId)
    setCurrentTemplateId(normalizedTemplateId)
    return await loadItemsForTemplate(component, normalizedTemplateId)
  }, [loadItemsForTemplate, setCurrentTemplateId])

  const createTemplate = useCallback(async (
    payload: CreateTemplatePayload,
    component?: GridComponent | null,
  ) => {
    if (!target) {
      return []
    }

    setTemplateLoading(true)

    try {
      const sourceItems = sortEditorItems(
        component
          ? filterExcludedEditorItems(readFilteredColumnsFromComponent(component))
          : cachedEditorItems.length
            ? cachedEditorItems
            : baselineItemsRef.current ?? [],
      )
      const response = await saveSysGridColumnSettings({
        GRID_ID: target.gridId,
        TEMPLATE_NAME: payload.templateName,
        IS_DEFAULT_TEMPLATE: payload.isDefaultTemplate ? "1" : "0",
        COLUMNS: toSaveItems(sourceItems),
      })

      patchGridSlice(target.gridId, {
        TEMPLATES: response.data.TEMPLATES,
        SETTINGS: response.data.SETTINGS,
      })

      const createdTemplateId = resolveSavedTemplateId(
        response.data.TEMPLATES,
        SYSTEM_GRID_TEMPLATE_ID,
        payload.templateName,
      )
      setCurrentTemplateId(createdTemplateId)

      const createdSettings = getGridColumnSettings(target.gridId, createdTemplateId)
      const resolvedItems = createdSettings.length
        ? filterEditableItems(toEditorItemsFromApi(createdSettings))
        : filterEditableItems(sourceItems)

      if (component) {
        syncEditorItemsToComponent(component, resolvedItems)
      }

      const createdCacheKey = buildTargetCacheKey(target.gridId, createdTemplateId)
      savedSignatureMap.set(createdCacheKey, buildEditorItemsSignature(resolvedItems))
      draggedWidthRef.current.clear()
      baselineItemsRef.current = resolvedItems
      return resolvedItems
    } finally {
      setTemplateLoading(false)
    }
  }, [
    cachedEditorItems,
    filterEditableItems,
    filterExcludedEditorItems,
    getGridColumnSettings,
    patchGridSlice,
    readFilteredColumnsFromComponent,
    setCurrentTemplateId,
    syncEditorItemsToComponent,
    target,
  ])

  const setDefaultTemplate = useCallback(async (templateId = currentTemplateId) => {
    if (!target) {
      return
    }

    const normalizedTemplateId = normalizeTemplateId(templateId)
    if (normalizedTemplateId <= 0) {
      return
    }

    setTemplateLoading(true)

    try {
      const response = await saveSysGridColumnSettings({
        GRID_ID: target.gridId,
        TEMPLATE_ID: normalizedTemplateId,
        IS_DEFAULT_TEMPLATE: "1",
        COLUMNS: [],
      })

      patchGridSlice(target.gridId, {
        TEMPLATES: response.data.TEMPLATES,
        SETTINGS: response.data.SETTINGS,
      })
      setCurrentTemplateId(normalizedTemplateId)
    } finally {
      setTemplateLoading(false)
    }
  }, [currentTemplateId, patchGridSlice, setCurrentTemplateId, target])

  const targetCacheKeyRef = useRef(targetCacheKey)
  targetCacheKeyRef.current = targetCacheKey

  const customLoad = useCallback(async (): Promise<GridState> => {
    // Layout comes from applyGridColumnSettingsToChildren; returning columns here races DevExtreme init.
    return {}
  }, [])

  const customSave = useCallback(async (state: GridState) => {
    const resolvedTargetCacheKey = targetCacheKeyRef.current
    if (!target || !resolvedTargetCacheKey || !Array.isArray(state?.columns)) {
      return
    }

    const rawItems = filterExcludedEditorItems(toEditorItemsFromColumns(state.columns))
    if (!rawItems.length) {
      return
    }

    const trustedItems = baselineItemsRef.current?.length ? baselineItemsRef.current : cachedEditorItems
    const { items: nextItems, restored } = restoreTrustedHiddenColumns(rawItems, trustedItems)
    const nextSignature = buildEditorItemsSignature(nextItems)
    if (restored) {
      repairVisibilityOnComponent(trustedItems)
    }
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

    if (savedSignatureMap.get(resolvedTargetCacheKey) === nextSignature) {
      return
    }

    rememberDraggedWidths(nextItems, trustedItems, draggedWidthRef.current)

    if (currentTemplateId === SYSTEM_GRID_TEMPLATE_ID) {
      return
    }

    await saveEditorItems(nextItems, false)
  }, [cachedEditorItems, currentTemplateId, filterExcludedEditorItems, repairVisibilityOnComponent, saveEditorItems, target])

  const refreshEditorItems = useCallback(async (component?: GridComponent | null) => {
    if (targetCacheKey) {
      savedSignatureMap.delete(targetCacheKey)
      baselineItemsRef.current = null
    }

    return await loadItemsForTemplate(component, currentTemplateId)
  }, [currentTemplateId, loadItemsForTemplate, targetCacheKey])

  return {
    enabled: target !== null,
    customLoad,
    customSave,
    loadEditorItems,
    refreshEditorItems,
    resetEditorItems,
    saveEditorItems,
    syncEditorItemsToComponent,
    bindGridComponent,
    applyEditorItemsToComponent,
    cachedEditorItems,
    readColumnsFromComponent: readFilteredColumnsFromComponent,
    changeTemplate,
    createTemplate,
    setDefaultTemplate,
    translateCaption,
    targetIdentity,
    currentTemplateId,
    currentTemplateName: currentTemplate.templateName,
    currentTemplateIsDefault: currentTemplate.isDefaultTemplate,
    templateOptions,
    templateLoading,
  }
}

export type GridColumnSettingState = ReturnType<typeof useGridColumnSettingState>
export type { GridColumnSettingEditorItem }
