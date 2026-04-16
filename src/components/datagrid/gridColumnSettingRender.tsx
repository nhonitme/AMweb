import React from "react"

import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"

type GridColumnSettingsComponent = {
  beginUpdate?: () => void
  columnOption?: (...args: unknown[]) => unknown
  endUpdate?: () => void
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function isTechnicalIdColumnName(value: unknown): boolean {
  const normalized = normalizeText(value).toUpperCase()
  return normalized.endsWith("_ID")
}

function buildSettingsMap(items: GridColumnSettingEditorItem[]) {
  return new Map(items.map((item) => [item.columnName.toUpperCase(), item] as const))
}

function resolveColumnKey(props: Record<string, unknown>): string {
  const dataField = normalizeText(props.dataField)
  if (dataField) {
    return dataField.toUpperCase()
  }

  const name = normalizeText(props.name)
  if (!name || name.toLowerCase() === "buttons") {
    return ""
  }

  return name.toUpperCase()
}

export function applyGridColumnSettingsToChildren(
  children: React.ReactNode,
  columnComponent: unknown,
  items: GridColumnSettingEditorItem[],
) {
  const settingsMap = items.length ? buildSettingsMap(items) : new Map<string, GridColumnSettingEditorItem>()

  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child) || child.type !== columnComponent) {
      return child
    }

    const columnProps = child.props as Record<string, unknown>
    const columnKey = resolveColumnKey(columnProps)
    const technicalIdColumn = isTechnicalIdColumnName(columnProps.dataField) || isTechnicalIdColumnName(columnProps.name)
    const nextProps: Record<string, unknown> = technicalIdColumn
      ? {
          allowHiding: false,
          showInColumnChooser: false,
          visible: false,
        }
      : {}

    if (columnKey) {
      const setting = settingsMap.get(columnKey)
      if (setting) {
        nextProps.fixed = setting.fixedPosition !== "none"
        nextProps.fixedPosition = setting.fixedPosition === "none" ? undefined : setting.fixedPosition
        nextProps.visible = technicalIdColumn ? false : setting.isVisible

        if (!technicalIdColumn && typeof setting.visibleIndex === "number") {
          nextProps.visibleIndex = setting.visibleIndex
        }

        if (!technicalIdColumn && typeof setting.width === "number") {
          nextProps.width = setting.width
        }
      }
    }

    return Object.keys(nextProps).length > 0 ? React.cloneElement(child, nextProps) : child
  })
}

export function applyGridColumnSettingsToComponent(
  component: GridColumnSettingsComponent | null | undefined,
  items: GridColumnSettingEditorItem[],
): boolean {
  if (!component || typeof component.columnOption !== "function" || !items.length) {
    return false
  }

  component.beginUpdate?.()

  try {
    items.forEach((item) => {
      const columnKey = normalizeText(item.columnName)
      if (!columnKey) {
        return
      }

      const currentColumn = component.columnOption?.(columnKey)
      if (!currentColumn) {
        return
      }

      const technicalIdColumn = isTechnicalIdColumnName(columnKey)
      const fixed = item.fixedPosition !== "none"
      const sortOrder = item.sortOrder === "asc" || item.sortOrder === "desc" ? item.sortOrder : undefined
      const visibleIndex = typeof item.visibleIndex === "number" ? item.visibleIndex : undefined
      const width = typeof item.width === "number" ? item.width : undefined
      const sortIndex = typeof item.sortIndex === "number" ? item.sortIndex : undefined

      component.columnOption?.(columnKey, "visible", technicalIdColumn ? false : item.isVisible)
      if (technicalIdColumn) {
        component.columnOption?.(columnKey, "showInColumnChooser", false)
        component.columnOption?.(columnKey, "allowHiding", false)
      }
      component.columnOption?.(columnKey, "visibleIndex", technicalIdColumn ? undefined : visibleIndex)
      component.columnOption?.(columnKey, "width", technicalIdColumn ? undefined : width)
      component.columnOption?.(columnKey, "fixed", technicalIdColumn ? false : fixed)
      component.columnOption?.(columnKey, "fixedPosition", technicalIdColumn ? undefined : fixed ? item.fixedPosition : undefined)
      component.columnOption?.(columnKey, "sortOrder", technicalIdColumn ? undefined : sortOrder)
      component.columnOption?.(columnKey, "sortIndex", technicalIdColumn ? undefined : sortIndex)
    })
  } finally {
    component.endUpdate?.()
  }

  return true
}
