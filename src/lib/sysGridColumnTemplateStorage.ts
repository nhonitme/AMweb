import {
  getCurrentGridSettingScope,
  normalizeGridSettingKey,
  normalizeGridSettingText,
} from "@/lib/gridSettingCache"
import { SYSTEM_GRID_TEMPLATE_ID } from "@/types/sysGridColumnSetting"

const STORAGE_KEY = "sys_grid_column_template_selection_v2"

type GridTemplateSelectionMap = Record<string, number>

function buildScopeKey(gridId: string): string {
  const scope = getCurrentGridSettingScope()
  if (!scope) {
    return ""
  }

  return [scope.companyCd, scope.userId, gridId].map(normalizeGridSettingKey).join("::")
}

function readSelectionMap(): GridTemplateSelectionMap {
  if (typeof window === "undefined") {
    return {}
  }

  window.localStorage.removeItem("sys_grid_column_template_selection")

  const raw = window.localStorage.getItem(STORAGE_KEY)
  if (!raw) {
    return {}
  }

  try {
    const parsed = JSON.parse(raw) as GridTemplateSelectionMap
    return parsed && typeof parsed === "object" ? parsed : {}
  } catch {
    window.localStorage.removeItem(STORAGE_KEY)
    return {}
  }
}

function writeSelectionMap(selectionMap: GridTemplateSelectionMap): void {
  if (typeof window === "undefined") {
    return
  }

  if (Object.keys(selectionMap).length === 0) {
    window.localStorage.removeItem(STORAGE_KEY)
    return
  }

  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(selectionMap))
}

export function getStoredGridTemplateId(gridId?: string): number {
  const scopeKey = buildScopeKey(normalizeGridSettingText(gridId))
  if (!scopeKey) {
    return SYSTEM_GRID_TEMPLATE_ID
  }

  const value = Number(readSelectionMap()[scopeKey])
  return Number.isFinite(value) && value > 0 ? value : SYSTEM_GRID_TEMPLATE_ID
}

export function setStoredGridTemplateId(gridId?: string, templateId?: number | null): void {
  const scopeKey = buildScopeKey(normalizeGridSettingText(gridId))
  if (!scopeKey) {
    return
  }

  const selectionMap = readSelectionMap()
  const normalizedTemplateId = typeof templateId === "number" && templateId > 0 ? templateId : SYSTEM_GRID_TEMPLATE_ID

  if (normalizedTemplateId <= 0) {
    delete selectionMap[scopeKey]
  } else {
    selectionMap[scopeKey] = normalizedTemplateId
  }

  writeSelectionMap(selectionMap)
}

export function clearStoredGridTemplateSelections(): void {
  if (typeof window === "undefined") {
    return
  }

  window.localStorage.removeItem(STORAGE_KEY)
  window.localStorage.removeItem("sys_grid_column_template_selection")
}
