import { normalizeGridSettingKey, normalizeGridSettingText } from '@/lib/gridSettingCache'
import { resolveSysGridColumnDisplayCaption } from '@/lib/gridColumnSettingUtils'
import { isTechnicalIdColumnName } from '@/components/datagrid/gridColumnSettingRender'
import type { SysGridColumn } from '@/types/sysGridColumnSetting'

/** Optional runtime overrides — catalog/order/visible come from sys_grid_column (+ setting). */
export type FaColumnBehavior = {
  /** Force hidden + out of chooser (e.g. STATUS code). */
  locked?: boolean
  dataType?: 'string' | 'number' | 'date' | 'boolean'
  format?: string
  allowEditing?: boolean
  captionKey?: string
  captionFallback?: string
  minWidth?: number
}

export type FaResolvedColumn = {
  fieldName: string
  caption: string
  visible: boolean
  width?: number
  minWidth?: number
  visibleIndex?: number
  allowHiding: boolean
  showInColumnChooser: boolean
  fixed: boolean
  fixedPosition?: 'left' | 'right'
  dataType?: 'string' | 'number' | 'date' | 'boolean'
  format?: string
  allowEditing?: boolean
  alignment?: 'left' | 'center' | 'right'
  sortOrder?: string
  sortIndex?: number | null
}

type TranslateFn = (key: string, fallback: string) => string

function resolveFormatFromType(formatType: string | null | undefined, fallback?: string): string | undefined {
  const normalized = normalizeGridSettingText(formatType)
  if (!normalized) {
    return fallback
  }

  switch (normalized.toLowerCase()) {
    case 'date':
      return 'dd/MM/yyyy'
    case 'datetime':
      return 'dd/MM/yyyy HH:mm'
    case 'number0':
    case 'integer':
      return '#,##0'
    case 'number1':
      return '#,##0.0'
    case 'number2':
    case 'amount':
      return '#,##0.00'
    case 'number3':
      return '#,##0.000'
    case 'number4':
      return '#,##0.####'
    default:
      return normalized
  }
}

function inferDataType(
  formatType: string | null | undefined,
  behaviorType?: FaColumnBehavior['dataType'],
): FaColumnBehavior['dataType'] | undefined {
  if (behaviorType) {
    return behaviorType
  }

  const normalized = normalizeGridSettingText(formatType).toLowerCase()
  if (!normalized) {
    return undefined
  }
  if (normalized === 'date' || normalized === 'datetime') {
    return 'date'
  }
  if (
    normalized.startsWith('number') ||
    normalized === 'integer' ||
    normalized === 'amount' ||
    normalized === 'quantity' ||
    normalized === 'unitprice'
  ) {
    return 'number'
  }
  return 'string'
}

function sortMerged(merged: SysGridColumn[]): SysGridColumn[] {
  return [...merged].sort((left, right) => {
    const leftIndex = typeof left.VISIBLE_INDEX === 'number' ? left.VISIBLE_INDEX : Number.MAX_SAFE_INTEGER
    const rightIndex = typeof right.VISIBLE_INDEX === 'number' ? right.VISIBLE_INDEX : Number.MAX_SAFE_INTEGER
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }
    return normalizeGridSettingText(left.FIELD_NAME).localeCompare(normalizeGridSettingText(right.FIELD_NAME))
  })
}

function getBehavior(
  behaviors: Readonly<Record<string, FaColumnBehavior>> | undefined,
  fieldName: string,
): FaColumnBehavior | undefined {
  if (!behaviors) {
    return undefined
  }
  return behaviors[fieldName] ?? behaviors[normalizeGridSettingKey(fieldName)]
}

/**
 * Build columns purely from mergeGridLayout (sys_grid_column + sys_grid_column_setting).
 * Behaviors only override runtime extras (locked, dataType, format, caption keys).
 */
export function resolveFaColumnsFromSysGrid(
  merged: SysGridColumn[],
  translate: TranslateFn,
  behaviors?: Readonly<Record<string, FaColumnBehavior>>,
): FaResolvedColumn[] {
  return sortMerged(merged).map((layout, index) => {
    const fieldName = normalizeGridSettingText(layout.FIELD_NAME)
    const behavior = getBehavior(behaviors, fieldName)
    const technicalId = isTechnicalIdColumnName(fieldName)
    const locked = Boolean(behavior?.locked) || technicalId

    const captionFromLayout = resolveSysGridColumnDisplayCaption(
      layout.LABEL_TEXT,
      layout.COLUMN_LABEL_TEXT,
      layout.FIELD_NAME,
      layout.CAPTION,
      translate,
    )
    const captionFallback = behavior?.captionFallback ?? fieldName
    const captionKey = behavior?.captionKey ?? fieldName
    const caption =
      captionFromLayout && captionFromLayout.toUpperCase() !== fieldName.toUpperCase()
        ? captionFromLayout
        : translate(captionKey, captionFallback)

    const visibleFromLayout = layout.IS_VISIBLE !== '0'
    const allowHidingFromLayout = layout.ALLOW_HIDING !== '0'

    const width =
      typeof layout.COLUMN_WIDTH === 'number' && Number.isFinite(layout.COLUMN_WIDTH) && layout.COLUMN_WIDTH > 0
        ? layout.COLUMN_WIDTH
        : undefined

    const visibleIndex =
      typeof layout.VISIBLE_INDEX === 'number' && Number.isFinite(layout.VISIBLE_INDEX)
        ? layout.VISIBLE_INDEX
        : index

    const isFixed = layout.IS_FIXED === '1'
    const fixedPositionRaw = normalizeGridSettingText(layout.FIXED_POSITION).toLowerCase()
    const fixedPosition =
      isFixed && (fixedPositionRaw === 'left' || fixedPositionRaw === 'right')
        ? fixedPositionRaw
        : undefined

    const alignmentRaw = normalizeGridSettingText(layout.ALIGN).toLowerCase()
    const alignment =
      alignmentRaw === 'left' || alignmentRaw === 'center' || alignmentRaw === 'right'
        ? alignmentRaw
        : undefined

    return {
      fieldName,
      caption,
      visible: locked ? false : visibleFromLayout,
      width,
      minWidth: behavior?.minWidth,
      visibleIndex,
      allowHiding: locked ? false : allowHidingFromLayout,
      showInColumnChooser: !locked,
      fixed: Boolean(fixedPosition),
      fixedPosition,
      dataType: inferDataType(layout.FORMAT_TYPE, behavior?.dataType),
      format: resolveFormatFromType(layout.FORMAT_TYPE, behavior?.format),
      allowEditing: behavior?.allowEditing,
      alignment,
      sortOrder: normalizeGridSettingText(layout.SORT_ORDER).toLowerCase() || undefined,
      sortIndex: typeof layout.SORT_INDEX === 'number' ? layout.SORT_INDEX : null,
    }
  })
}

/** @deprecated Prefer resolveFaColumnsFromSysGrid — kept for allocation until migrated. */
export type FaColumnDef = {
  fieldName: string
  captionKey: string
  captionFallback: string
  defaultVisible: boolean
  defaultWidth?: number
  minWidth?: number
  locked?: boolean
  dataType?: 'string' | 'number' | 'date' | 'boolean'
  format?: string
  allowEditing?: boolean
  alignment?: 'left' | 'center' | 'right'
}

export function resolveFaColumns(
  defs: readonly FaColumnDef[],
  merged: SysGridColumn[],
  translate: TranslateFn,
): FaResolvedColumn[] {
  const behaviors: Record<string, FaColumnBehavior> = {}
  for (const def of defs) {
    behaviors[def.fieldName] = {
      locked: def.locked,
      dataType: def.dataType,
      format: def.format,
      allowEditing: def.allowEditing,
      captionKey: def.captionKey,
      captionFallback: def.captionFallback,
      minWidth: def.minWidth,
    }
  }

  if (merged.length > 0) {
    const fromDb = resolveFaColumnsFromSysGrid(merged, translate, behaviors)
    const seen = new Set(fromDb.map((item) => normalizeGridSettingKey(item.fieldName)))
    const missingDefs = defs.filter((def) => !seen.has(normalizeGridSettingKey(def.fieldName)))
    if (!missingDefs.length) {
      return fromDb
    }

    // Append registry-only fields not yet seeded in sys_grid_column
    const synthetic: SysGridColumn[] = missingDefs.map((def, index) => ({
      ID: 0,
      GRID_ID: '',
      FIELD_NAME: def.fieldName,
      LABEL_TEXT: def.captionKey,
      COLUMN_LABEL_TEXT: def.captionKey,
      CAPTION: def.captionFallback,
      IS_VISIBLE: def.defaultVisible ? '1' : '0',
      VISIBLE_INDEX: fromDb.length + index,
      COLUMN_WIDTH: def.defaultWidth ?? null,
      IS_FIXED: '0',
      FIXED_POSITION: null,
      ALLOW_HIDING: def.locked ? '0' : '1',
      ALIGN: def.alignment ?? null,
      FORMAT_TYPE: null,
      SORT_ORDER: null,
      SORT_INDEX: null,
    }))
    return [...fromDb, ...resolveFaColumnsFromSysGrid(synthetic, translate, behaviors)]
  }

  const synthetic: SysGridColumn[] = defs.map((def, index) => ({
    ID: 0,
    GRID_ID: '',
    FIELD_NAME: def.fieldName,
    LABEL_TEXT: def.captionKey,
    COLUMN_LABEL_TEXT: def.captionKey,
    CAPTION: def.captionFallback,
    IS_VISIBLE: def.defaultVisible ? '1' : '0',
    VISIBLE_INDEX: index,
    COLUMN_WIDTH: def.defaultWidth ?? null,
    IS_FIXED: '0',
    FIXED_POSITION: null,
    ALLOW_HIDING: def.locked ? '0' : '1',
    ALIGN: def.alignment ?? null,
    FORMAT_TYPE: null,
    SORT_ORDER: null,
    SORT_INDEX: null,
  }))
  return resolveFaColumnsFromSysGrid(synthetic, translate, behaviors)
}
