import type { QueryClient } from "@tanstack/react-query"

import {
  asGridSettingArray,
  normalizeGridSettingKey,
  normalizeGridSettingText,
  type GridSettingScope,
} from "@/lib/gridSettingCache"
import { queryKeys } from "@/lib/query/queryKeys"
import type {
  SysGridColumn,
  SysGridColumnBundle,
  SysGridColumnSetting,
  SysGridColumnTemplate,
} from "@/types/sysGridColumnSetting"
import { SYSTEM_GRID_TEMPLATE_ID } from "@/types/sysGridColumnSetting"

export type SysGridColumnSettingCachePayload = {
  companyCd: string
  userId: string
  bundle: SysGridColumnBundle
}

export const GRID_COLUMN_SETTINGS_STORAGE_KEY = "sys_grid_column_settings_v2"

const LEGACY_GRID_COLUMN_SETTINGS_STORAGE_KEYS = [
  "sys_grid_column_settings_v1",
  "sys_grid_column_settings_v6",
  "sys_grid_column_settings_v7",
  "sys_grid_column_settings_v8",
] as const

function buildScopedStorageKey(prefix: string, scope: GridSettingScope): string {
  return [
    prefix,
    normalizeGridSettingKey(scope.companyCd),
    normalizeGridSettingKey(scope.userId),
  ].join(":")
}

function emptyBundle(): SysGridColumnBundle {
  return { COLUMNS: [], TEMPLATES: [], SETTINGS: [] }
}

function isBundle(value: unknown): value is SysGridColumnBundle {
  if (!value || typeof value !== "object") {
    return false
  }

  const row = value as SysGridColumnBundle
  return Array.isArray(row.COLUMNS) && Array.isArray(row.TEMPLATES) && Array.isArray(row.SETTINGS)
}

function matchesGrid(gridId: string, value: unknown): boolean {
  return normalizeGridSettingKey(value) === normalizeGridSettingKey(gridId)
}

export function sortGridColumns(items: SysGridColumn[] | null | undefined): SysGridColumn[] {
  return asGridSettingArray(items).sort((left, right) => {
    const leftIndex = typeof left.VISIBLE_INDEX === "number" ? left.VISIBLE_INDEX : Number.MAX_SAFE_INTEGER
    const rightIndex = typeof right.VISIBLE_INDEX === "number" ? right.VISIBLE_INDEX : Number.MAX_SAFE_INTEGER
    if (leftIndex !== rightIndex) {
      return leftIndex - rightIndex
    }

    return normalizeGridSettingText(left.FIELD_NAME).localeCompare(normalizeGridSettingText(right.FIELD_NAME))
  })
}

export function sortTemplates(items: SysGridColumnTemplate[] | null | undefined): SysGridColumnTemplate[] {
  return asGridSettingArray(items).sort((left, right) => {
    const leftDefault = left.IS_DEFAULT_TEMPLATE === "1" ? 0 : 1
    const rightDefault = right.IS_DEFAULT_TEMPLATE === "1" ? 0 : 1
    if (leftDefault !== rightDefault) {
      return leftDefault - rightDefault
    }

    return normalizeGridSettingText(left.TEMPLATE_NAME).localeCompare(normalizeGridSettingText(right.TEMPLATE_NAME))
  })
}

export function getGridTemplates(
  bundle: SysGridColumnBundle | null | undefined,
  gridId: string,
): SysGridColumnTemplate[] {
  return sortTemplates(
    asGridSettingArray(bundle?.TEMPLATES).filter((item) => matchesGrid(gridId, item.GRID_ID)),
  )
}

const GRID_COLUMN_LABEL_MISS = "__AMNOTE_GRID_COLUMN_LABEL_MISS__"

function normalizeCaptionText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function tryTranslateLabel(
  key: string,
  translate?: ((key: string, fallback: string) => string) | null,
): string | null {
  if (!key || !translate) {
    return null
  }

  const translated = translate(key, GRID_COLUMN_LABEL_MISS)
  if (translated === GRID_COLUMN_LABEL_MISS) {
    return null
  }

  const normalized = normalizeCaptionText(translated)
  return normalized || null
}

/**
 * Grid column title priority:
 * 1) translate(setting.LABEL_TEXT)
 * 2) translate(sys_grid_column.LABEL_TEXT)
 * 3) translate(sys_grid_column.FIELD_NAME)
 * 4) sys_grid_column.CAPTION
 */
export function resolveSysGridColumnDisplayCaption(
  settingLabelText: string | null | undefined,
  columnLabelText: string | null | undefined,
  fieldName: string | null | undefined,
  caption: string | null | undefined,
  translate?: ((key: string, fallback: string) => string) | null,
): string {
  const settingLabel = normalizeCaptionText(settingLabelText)
  const columnLabel = normalizeCaptionText(columnLabelText)
  const field = normalizeCaptionText(fieldName)
  const cap = normalizeCaptionText(caption)

  return (
    tryTranslateLabel(settingLabel, translate) ||
    tryTranslateLabel(columnLabel, translate) ||
    tryTranslateLabel(field, translate) ||
    cap ||
    field
  )
}

export function coalesceColumn(
  column: SysGridColumn | null | undefined,
  setting: SysGridColumnSetting | null | undefined,
): SysGridColumn {
  const fieldName = column?.FIELD_NAME || setting?.FIELD_NAME || ""
  const settingLabel = normalizeCaptionText(setting?.LABEL_TEXT)
  const columnLabel = normalizeCaptionText(column?.LABEL_TEXT)
  const columnCaption = normalizeCaptionText(column?.CAPTION)

  return {
    ID: column?.ID ?? 0,
    GRID_ID: column?.GRID_ID || setting?.GRID_ID || "",
    FIELD_NAME: fieldName,
    LABEL_TEXT: settingLabel || null,
    COLUMN_LABEL_TEXT: columnLabel || null,
    CAPTION: columnCaption,
    IS_VISIBLE: setting?.IS_VISIBLE ?? column?.IS_VISIBLE ?? "1",
    VISIBLE_INDEX: setting?.VISIBLE_INDEX ?? column?.VISIBLE_INDEX ?? null,
    COLUMN_WIDTH: setting?.COLUMN_WIDTH ?? column?.COLUMN_WIDTH ?? null,
    IS_FIXED: setting?.IS_FIXED ?? column?.IS_FIXED ?? "0",
    FIXED_POSITION: setting?.FIXED_POSITION ?? column?.FIXED_POSITION ?? null,
    ALLOW_HIDING: setting?.ALLOW_HIDING ?? column?.ALLOW_HIDING ?? "1",
    ALIGN: column?.ALIGN ?? null,
    FORMAT_TYPE: column?.FORMAT_TYPE ?? null,
    SORT_ORDER: setting?.SORT_ORDER ?? column?.SORT_ORDER ?? null,
    SORT_INDEX: setting?.SORT_INDEX ?? column?.SORT_INDEX ?? null,
  }
}

export function mergeGridLayout(
  bundle: SysGridColumnBundle | null | undefined,
  gridId: string,
  templateId: number = SYSTEM_GRID_TEMPLATE_ID,
): SysGridColumn[] {
  const columns = asGridSettingArray(bundle?.COLUMNS).filter((item) => matchesGrid(gridId, item.GRID_ID))
  const settings = templateId > 0
    ? asGridSettingArray(bundle?.SETTINGS).filter(
        (item) => matchesGrid(gridId, item.GRID_ID) && Number(item.TEMPLATE_ID) === templateId,
      )
    : []
  const settingsByField = new Map(
    settings.map((item) => [normalizeGridSettingKey(item.FIELD_NAME), item] as const),
  )
  const seen = new Set<string>()
  const merged: SysGridColumn[] = []

  for (const column of columns) {
    const key = normalizeGridSettingKey(column.FIELD_NAME)
    merged.push(coalesceColumn(column, settingsByField.get(key)))
    seen.add(key)
  }

  for (const setting of settings) {
    const key = normalizeGridSettingKey(setting.FIELD_NAME)
    if (seen.has(key)) {
      continue
    }

    merged.push(coalesceColumn(undefined, setting))
  }

  return sortGridColumns(merged)
}

export function readGridColumnSettingsCache(scope: GridSettingScope): SysGridColumnSettingCachePayload | null {
  if (typeof window === "undefined") {
    return null
  }

  for (const prefix of LEGACY_GRID_COLUMN_SETTINGS_STORAGE_KEYS) {
    window.localStorage.removeItem(buildScopedStorageKey(prefix, scope))
  }

  const raw = window.localStorage.getItem(buildScopedStorageKey(GRID_COLUMN_SETTINGS_STORAGE_KEY, scope))
  if (!raw) {
    return null
  }

  try {
    const payload = JSON.parse(raw) as SysGridColumnSettingCachePayload
    if (
      normalizeGridSettingKey(payload?.companyCd) !== normalizeGridSettingKey(scope.companyCd) ||
      normalizeGridSettingKey(payload?.userId) !== normalizeGridSettingKey(scope.userId) ||
      !isBundle(payload?.bundle)
    ) {
      window.localStorage.removeItem(buildScopedStorageKey(GRID_COLUMN_SETTINGS_STORAGE_KEY, scope))
      return null
    }

    return {
      companyCd: scope.companyCd,
      userId: scope.userId,
      bundle: payload.bundle,
    }
  } catch {
    window.localStorage.removeItem(buildScopedStorageKey(GRID_COLUMN_SETTINGS_STORAGE_KEY, scope))
    return null
  }
}

export function writeGridColumnSettingsCache(scope: GridSettingScope, bundle: SysGridColumnBundle): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.setItem(
    buildScopedStorageKey(GRID_COLUMN_SETTINGS_STORAGE_KEY, scope),
    JSON.stringify({
      companyCd: scope.companyCd,
      userId: scope.userId,
      bundle,
    } satisfies SysGridColumnSettingCachePayload),
  )
}

export function removeGridColumnSettingsCache(scope: GridSettingScope): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(buildScopedStorageKey(GRID_COLUMN_SETTINGS_STORAGE_KEY, scope))
  for (const prefix of LEGACY_GRID_COLUMN_SETTINGS_STORAGE_KEYS) {
    window.localStorage.removeItem(buildScopedStorageKey(prefix, scope))
  }
}

function hasBundleContent(bundle: SysGridColumnBundle | null | undefined): boolean {
  return Boolean(
    bundle
    && (bundle.COLUMNS.length > 0 || bundle.TEMPLATES.length > 0 || bundle.SETTINGS.length > 0),
  )
}

export function persistScopeToLocalStorage(queryClient: QueryClient, scope: GridSettingScope): void {
  const bundle = queryClient.getQueryData<SysGridColumnBundle>(
    queryKeys.gridColumnSettings.allForScope(scope.companyCd, scope.userId),
  )
  // Never overwrite a good localStorage snapshot with undefined/empty after RQ gcTime eviction.
  if (!isBundle(bundle)) {
    return
  }
  if (!hasBundleContent(bundle)) {
    const existing = readGridColumnSettingsCache(scope)
    if (existing && hasBundleContent(existing.bundle)) {
      return
    }
  }
  writeGridColumnSettingsCache(scope, bundle)
}

export function applyAllSettingsToQueryCache(
  queryClient: QueryClient,
  scope: GridSettingScope,
  bundle: SysGridColumnBundle,
): void {
  queryClient.setQueryData(
    queryKeys.gridColumnSettings.allForScope(scope.companyCd, scope.userId),
    isBundle(bundle) ? bundle : emptyBundle(),
  )
}

export function getCachedBundle(queryClient: QueryClient, scope: GridSettingScope): SysGridColumnBundle {
  const bundle = queryClient.getQueryData<SysGridColumnBundle>(
    queryKeys.gridColumnSettings.allForScope(scope.companyCd, scope.userId),
  )
  if (isBundle(bundle) && hasBundleContent(bundle)) {
    return bundle
  }

  // RQ may have GC'd the fetchQuery result (no observer). Rehydrate from localStorage.
  const cachedState = readGridColumnSettingsCache(scope)
  if (cachedState && hasBundleContent(cachedState.bundle)) {
    applyAllSettingsToQueryCache(queryClient, scope, cachedState.bundle)
    return cachedState.bundle
  }

  return isBundle(bundle) ? bundle : emptyBundle()
}

export function patchGridSliceInQueryCache(
  queryClient: QueryClient,
  scope: GridSettingScope,
  gridId: string,
  slice: Partial<Pick<SysGridColumnBundle, "COLUMNS" | "TEMPLATES" | "SETTINGS">>,
): SysGridColumnBundle {
  const current = getCachedBundle(queryClient, scope)
  const next: SysGridColumnBundle = {
    COLUMNS: slice.COLUMNS
      ? [
          ...current.COLUMNS.filter((item) => !matchesGrid(gridId, item.GRID_ID)),
          ...asGridSettingArray(slice.COLUMNS),
        ]
      : current.COLUMNS,
    TEMPLATES: slice.TEMPLATES
      ? [
          ...current.TEMPLATES.filter((item) => !matchesGrid(gridId, item.GRID_ID)),
          ...asGridSettingArray(slice.TEMPLATES),
        ]
      : current.TEMPLATES,
    SETTINGS: slice.SETTINGS
      ? [
          ...current.SETTINGS.filter((item) => !matchesGrid(gridId, item.GRID_ID)),
          ...asGridSettingArray(slice.SETTINGS),
        ]
      : current.SETTINGS,
  }

  applyAllSettingsToQueryCache(queryClient, scope, next)
  persistScopeToLocalStorage(queryClient, scope)
  return next
}
