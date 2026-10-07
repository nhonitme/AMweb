import React from "react"

import { shouldHideLangColumn } from "@/lib/companyLang"
import { asGridSettingArray } from "@/lib/gridSettingCache"
import { resolveSysGridColumnDisplayCaption } from "@/lib/gridColumnSettingUtils"
import { isReportSystemField } from "@/lib/reportSystemFields"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"

type GridCaptionTranslator = (key: string, fallback: string) => string

export type RuntimeColumnVisibilityOptions = {
  forceVisibleColumnNames?: readonly string[]
  controlledColumnVisibility?: Record<string, boolean>
}

export type ApplyGridColumnSettingsOptions = {
  /**
   * Hide FE/schema columns that are absent from sys_grid_column (no FE fallback).
   */
  hideColumnsMissingFromSettings?: boolean
}

type GridColumnSettingsComponent = {
  beginUpdate?: () => void
  columnCount?: () => number
  columnOption?: (...args: unknown[]) => unknown
  endUpdate?: () => void
}

export function isGridComponentReady(component: GridColumnSettingsComponent | null | undefined): boolean {
  if (!component || typeof component.columnCount !== "function") {
    return false
  }

  return component.columnCount() > 0
}

type GridColumnReference = {
  identifier: number | string
  index: number
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function resolveDevExtremeColumnFormat(formatType: string | null | undefined): string | undefined {
  const normalized = normalizeText(formatType)
  if (!normalized) {
    return undefined
  }

  switch (normalized.toLowerCase()) {
    case "date":
      return "dd/MM/yyyy"
    case "datetime":
      return "dd/MM/yyyy HH:mm"
    case "number0":
    case "integer":
      return "#,##0"
    case "number1":
      return "#,##0.0"
    case "number2":
    case "amount":
    case "quantity":
    case "unitprice":
      return "#,##0.00"
    case "number3":
      return "#,##0.000"
    case "number4":
      return "#,##0.0000"
    default:
      return normalized
  }
}

function resolveGridColumnCaption(
  item: GridColumnSettingEditorItem,
  currentCaption: unknown,
  translate?: GridCaptionTranslator,
): string {
  const resolved = resolveSysGridColumnDisplayCaption(
    item.labelText,
    item.columnLabelText,
    item.columnName,
    item.caption,
    translate,
  )
  if (!isTechnicalColumnCaption(resolved, item.columnName)) {
    return resolved
  }

  const liveCaption = normalizeText(currentCaption)
  if (liveCaption && !isTechnicalColumnCaption(liveCaption, item.columnName)) {
    return liveCaption
  }

  return resolved
}

export function isTechnicalColumnCaption(caption: unknown, columnName: unknown): boolean {
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

export function isTechnicalIdColumnName(value: unknown): boolean {
  const normalized = normalizeText(value)
  if (!normalized) {
    return false
  }

  // Prefer shared report/grid convention (`__CHIT_ID`, `__MENU_NM`, ...).
  if (isReportSystemField(normalized)) {
    return true
  }

  return normalized.toUpperCase().endsWith("_ID")
}

export function isSystemFixedColumnName(value: unknown): boolean {
  const normalized = normalizeText(value).toUpperCase()
  return normalized === "DETAIL_ACTIONS"
}

function buildSettingsMap(items: GridColumnSettingEditorItem[]) {
  return new Map(items.map((item) => [item.columnName.toUpperCase(), item] as const))
}

function collectColumnFieldNames(children: React.ReactNode, columnComponent: unknown): string[] {
  const names: string[] = []
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child)) {
      return
    }

    const childProps = child.props as Record<string, unknown>
    if (childProps.children !== undefined) {
      names.push(...collectColumnFieldNames(childProps.children as React.ReactNode, columnComponent))
    }

    if (child.type !== columnComponent) {
      return
    }

    names.push(...getColumnCandidateKeys(childProps))
  })
  return names
}

function isLockedHiddenColumnProps(props: Record<string, unknown>): boolean {
  return props.showInColumnChooser === false && props.allowHiding === false
}

function isCommandColumn(props: Record<string, unknown>): boolean {
  const columnType = normalizeText(props.type)
  const command = normalizeText(props.command)
  if (columnType.length > 0 || command.length > 0) {
    return true
  }

  const dataField = normalizeText(props.dataField)
  const name = normalizeText(props.name)
  if (isSystemFixedColumnName(name)) {
    return true
  }

  if (!dataField && !name && typeof props.cellRender === "function") {
    return true
  }

  return !dataField && name.toLowerCase() === "buttons"
}

function getColumnCandidateKeys(props: Record<string, unknown>): string[] {
  const candidates = [normalizeText(props.dataField), normalizeText(props.name)]

  return Array.from(
    new Set(
      candidates
        .filter((value) => value.length > 0 && value.toLowerCase() !== "buttons")
        .map((value) => value.toUpperCase()),
    ),
  )
}

function resolveSetting(
  settingsMap: Map<string, GridColumnSettingEditorItem>,
  props: Record<string, unknown>,
): GridColumnSettingEditorItem | undefined {
  const columnCandidateKeys = getColumnCandidateKeys(props)

  for (const columnCandidateKey of columnCandidateKeys) {
    const setting = settingsMap.get(columnCandidateKey)
    if (setting) {
      return setting
    }
  }

  return undefined
}

function buildComponentColumnReferenceMap(component: GridColumnSettingsComponent): Map<string, GridColumnReference> {
  const columnReferenceMap = new Map<string, GridColumnReference>()

  if (typeof component.columnCount !== "function" || typeof component.columnOption !== "function") {
    return columnReferenceMap
  }

  const columnCount = component.columnCount()

  for (let index = 0; index < columnCount; index += 1) {
    const column = component.columnOption(index)
    if (!column || typeof column !== "object") {
      continue
    }

    const columnProps = column as Record<string, unknown>
    const columnCandidateKeys = getColumnCandidateKeys(columnProps)
    if (columnCandidateKeys.length === 0) {
      continue
    }

    const identifier = normalizeText(columnProps.name) || normalizeText(columnProps.dataField) || index
    const reference = {
      identifier,
      index,
    } satisfies GridColumnReference

    columnCandidateKeys.forEach((columnCandidateKey) => {
      if (!columnReferenceMap.has(columnCandidateKey)) {
        columnReferenceMap.set(columnCandidateKey, reference)
      }
    })
  }

  return columnReferenceMap
}

function readComponentColumn(
  component: GridColumnSettingsComponent,
  reference: GridColumnReference,
) {
  if (typeof component.columnOption !== "function") {
    return undefined
  }

  if (typeof reference.identifier === "string" && reference.identifier.length > 0) {
    const resolvedColumn = component.columnOption(reference.identifier)
    if (resolvedColumn) {
      return resolvedColumn
    }
  }

  return component.columnOption(reference.index)
}

function writeComponentColumnOption(
  component: GridColumnSettingsComponent,
  reference: GridColumnReference,
  optionName: string,
  optionValue: unknown,
) {
  if (typeof component.columnOption !== "function") {
    return
  }

  if (typeof reference.identifier === "string" && reference.identifier.length > 0) {
    component.columnOption(reference.identifier, optionName, optionValue)
    return
  }

  component.columnOption(reference.index, optionName, optionValue)
}

function applySystemFixedColumnOptions(
  nextProps: Record<string, unknown>,
  columnCandidateKeys: string[],
) {
  if (!columnCandidateKeys.some((columnKey) => isSystemFixedColumnName(columnKey))) {
    return
  }

  nextProps.allowHiding = false
  nextProps.showInColumnChooser = false
  nextProps.visible = true
  nextProps.fixed = true
  nextProps.fixedPosition = "left"
  nextProps.visibleIndex = 0
}

function buildRuntimeVisibilityMap(options: RuntimeColumnVisibilityOptions) {
  return new Map(
    Object.entries(options.controlledColumnVisibility ?? {}).map(
      ([columnName, visible]) => [columnName.toUpperCase(), visible] as const,
    ),
  )
}

function hasForcedVisibleColumn(columnCandidateKeys: string[], options: RuntimeColumnVisibilityOptions) {
  const forceVisibleColumnNames = new Set(
    (options.forceVisibleColumnNames ?? []).map((columnName) => columnName.toUpperCase()),
  )

  return columnCandidateKeys.some((columnKey) => forceVisibleColumnNames.has(columnKey))
}

function resolveControlledColumnVisibility(
  columnCandidateKeys: string[],
  runtimeVisibilityMap: Map<string, boolean>,
) {
  for (const columnKey of columnCandidateKeys) {
    if (runtimeVisibilityMap.has(columnKey)) {
      return runtimeVisibilityMap.get(columnKey)
    }
  }

  return undefined
}

function expandGridColumnChildren(children: React.ReactNode): React.ReactNode {
  const expanded = React.Children.toArray(children).flatMap((child) => {
    if (!React.isValidElement(child)) {
      return [child]
    }

    if (child.type === React.Fragment) {
      return React.Children.toArray(child.props.children)
    }

    return [child]
  })

  if (expanded.length === 0) {
    return null
  }

  if (expanded.length === 1) {
    return expanded[0]
  }

  return expanded
}

export function applyGridColumnSettingsToChildren(
  children: React.ReactNode,
  columnComponent: unknown,
  items: GridColumnSettingEditorItem[] | null | undefined,
  translate?: GridCaptionTranslator,
  options?: ApplyGridColumnSettingsOptions,
) {
  const expandedChildren = expandGridColumnChildren(children)
  const allFieldNames = collectColumnFieldNames(expandedChildren, columnComponent)
  return applyGridColumnSettingsToChildrenUnsafe(expandedChildren, columnComponent, items, translate, options, allFieldNames)
}

function applyGridColumnSettingsToChildrenUnsafe(
  children: React.ReactNode,
  columnComponent: unknown,
  items: GridColumnSettingEditorItem[] | null | undefined,
  translate?: GridCaptionTranslator,
  options?: ApplyGridColumnSettingsOptions,
  allFieldNames: string[] = [],
) {
  const normalizedItems = asGridSettingArray(items)
  const settingsMap = normalizedItems.length ? buildSettingsMap(normalizedItems) : new Map<string, GridColumnSettingEditorItem>()
  const hideColumnsMissingFromSettings = Boolean(options?.hideColumnsMissingFromSettings)

  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child
    }

    const childProps = child.props as Record<string, unknown>
    const currentChildren = childProps.children
    const nextChildren =
      currentChildren === undefined
        ? currentChildren
        : applyGridColumnSettingsToChildrenUnsafe(currentChildren, columnComponent, normalizedItems, translate, options, allFieldNames)

    if (child.type !== columnComponent) {
      return nextChildren !== currentChildren ? React.cloneElement(child, undefined, nextChildren) : child
    }

    const columnCandidateKeys = getColumnCandidateKeys(childProps)
    const technicalIdColumn = columnCandidateKeys.some((columnKey) => isTechnicalIdColumnName(columnKey))
    const lockedHiddenColumn =
      technicalIdColumn ||
      isLockedHiddenColumnProps(childProps)
    const setting = resolveSetting(settingsMap, childProps)
    const nextProps: Record<string, unknown> = lockedHiddenColumn
      ? {
          allowHiding: false,
          showInColumnChooser: false,
          visible: false,
        }
      : {}

    if (setting) {
      nextProps.fixed = setting.fixedPosition !== "none"
      nextProps.fixedPosition = setting.fixedPosition === "none" ? undefined : setting.fixedPosition
      nextProps.visible = lockedHiddenColumn ? false : setting.isVisible
      nextProps.allowHiding = lockedHiddenColumn ? false : setting.allowHiding

      if (!lockedHiddenColumn && typeof setting.visibleIndex === "number") {
        nextProps.visibleIndex = setting.visibleIndex
      }

      if (!lockedHiddenColumn && typeof setting.width === "number") {
        nextProps.width = setting.width
      }

      const caption = resolveGridColumnCaption(setting, childProps.caption, translate)
      if (!lockedHiddenColumn && !isTechnicalColumnCaption(caption, setting.columnName)) {
        nextProps.caption = caption
      }

      if (!lockedHiddenColumn && setting.alignment) {
        nextProps.alignment = setting.alignment
      }

      if (!lockedHiddenColumn && setting.formatType) {
        nextProps.format = resolveDevExtremeColumnFormat(setting.formatType)
      }
    } else if (hideColumnsMissingFromSettings && !lockedHiddenColumn && !isCommandColumn(childProps)) {
      nextProps.visible = false
      nextProps.showInColumnChooser = false
      nextProps.allowHiding = false
    }

    const hideInactiveLang = columnCandidateKeys.some((columnKey) => shouldHideLangColumn(columnKey, allFieldNames))
    if (hideInactiveLang) {
      nextProps.visible = false
      nextProps.allowHiding = false
      nextProps.showInColumnChooser = false
    }

    applySystemFixedColumnOptions(nextProps, columnCandidateKeys)

    if (nextChildren !== currentChildren) {
      nextProps.children = nextChildren
    }

    return Object.keys(nextProps).length > 0 ? React.cloneElement(child, nextProps) : child
  })
}

export function applyRuntimeColumnVisibilityToChildren(
  children: React.ReactNode,
  columnComponent: unknown,
  options: RuntimeColumnVisibilityOptions,
) {
  const runtimeVisibilityMap = buildRuntimeVisibilityMap(options)

  return React.Children.map(children, (child) => {
    if (!React.isValidElement(child)) {
      return child
    }

    const childProps = child.props as Record<string, unknown>
    const currentChildren = childProps.children
    const nextChildren =
      currentChildren === undefined
        ? currentChildren
        : applyRuntimeColumnVisibilityToChildren(currentChildren, columnComponent, options)

    if (child.type !== columnComponent) {
      return nextChildren !== currentChildren ? React.cloneElement(child, undefined, nextChildren) : child
    }

    const columnCandidateKeys = getColumnCandidateKeys(childProps)
    const controlledVisible = resolveControlledColumnVisibility(columnCandidateKeys, runtimeVisibilityMap)
    const nextProps: Record<string, unknown> = {}

    if (hasForcedVisibleColumn(columnCandidateKeys, options)) {
      nextProps.visible = true
      nextProps.allowHiding = false
    }

    if (typeof controlledVisible === "boolean") {
      nextProps.visible = controlledVisible
      nextProps.allowHiding = false
      nextProps.showInColumnChooser = false
    }

    if (nextChildren !== currentChildren) {
      nextProps.children = nextChildren
    }

    return Object.keys(nextProps).length > 0 ? React.cloneElement(child, nextProps) : child
  })
}

export function applyRuntimeColumnVisibilityToComponent(
  component: GridColumnSettingsComponent | null | undefined,
  options: RuntimeColumnVisibilityOptions | null | undefined,
): boolean {
  if (!options || !isGridComponentReady(component) || typeof component?.columnOption !== "function") {
    return false
  }

  const columnReferenceMap = buildComponentColumnReferenceMap(component)
  const runtimeVisibilityMap = buildRuntimeVisibilityMap(options)
  const forceVisibleColumnNames = new Set(
    (options.forceVisibleColumnNames ?? []).map((columnName) => columnName.toUpperCase()),
  )

  if (!runtimeVisibilityMap.size && !forceVisibleColumnNames.size) {
    return false
  }

  component.beginUpdate?.()

  try {
    columnReferenceMap.forEach((columnReference, columnKey) => {
      if (forceVisibleColumnNames.has(columnKey)) {
        writeComponentColumnOption(component, columnReference, "visible", true)
        writeComponentColumnOption(component, columnReference, "allowHiding", false)
      }

      if (runtimeVisibilityMap.has(columnKey)) {
        writeComponentColumnOption(component, columnReference, "visible", runtimeVisibilityMap.get(columnKey))
        writeComponentColumnOption(component, columnReference, "allowHiding", false)
        writeComponentColumnOption(component, columnReference, "showInColumnChooser", false)
      }
    })
  } finally {
    component.endUpdate?.()
  }

  return true
}

export function applyGridColumnSettingsToComponent(
  component: GridColumnSettingsComponent | null | undefined,
  items: GridColumnSettingEditorItem[] | null | undefined,
  translate?: GridCaptionTranslator,
  options?: ApplyGridColumnSettingsOptions,
): boolean {
  const normalizedItems = asGridSettingArray(items)
  if (!isGridComponentReady(component) || typeof component?.columnOption !== "function" || !normalizedItems.length) {
    return false
  }

  const columnReferenceMap = buildComponentColumnReferenceMap(component)
  const allFieldNames = Array.from(columnReferenceMap.keys())
  const configuredColumnKeys = new Set(
    normalizedItems
      .map((item) => normalizeText(item.columnName).toUpperCase())
      .filter((columnKey) => columnKey.length > 0),
  )
  const hideColumnsMissingFromSettings = Boolean(options?.hideColumnsMissingFromSettings)
  const processedColumnReferences = new Set<GridColumnReference>()

  component.beginUpdate?.()

  try {
    normalizedItems.forEach((item) => {
      const columnKey = normalizeText(item.columnName)
      if (!columnKey) {
        return
      }

      const columnReference = columnReferenceMap.get(columnKey.toUpperCase())
      if (!columnReference) {
        return
      }

      processedColumnReferences.add(columnReference)

      const currentColumn = readComponentColumn(component, columnReference)
      if (!currentColumn) {
        return
      }

      const technicalIdColumn = isTechnicalIdColumnName(columnKey)
      const columnProps = currentColumn as Record<string, unknown>
      const lockedHiddenColumn =
        technicalIdColumn ||
        isLockedHiddenColumnProps(columnProps)
      const fixed = item.fixedPosition !== "none"
      const sortOrder = item.sortOrder === "asc" || item.sortOrder === "desc" ? item.sortOrder : undefined
      const visibleIndex = typeof item.visibleIndex === "number" ? item.visibleIndex : undefined
      const width = typeof item.width === "number" ? item.width : undefined
      const sortIndex = typeof item.sortIndex === "number" ? item.sortIndex : undefined

      writeComponentColumnOption(
        component,
        columnReference,
        "visible",
        lockedHiddenColumn ? false : item.isVisible,
      )
      if (lockedHiddenColumn) {
        writeComponentColumnOption(component, columnReference, "showInColumnChooser", false)
        writeComponentColumnOption(component, columnReference, "allowHiding", false)
      } else {
        writeComponentColumnOption(component, columnReference, "allowHiding", item.allowHiding)
      }
      writeComponentColumnOption(
        component,
        columnReference,
        "visibleIndex",
        lockedHiddenColumn ? undefined : visibleIndex,
      )
      writeComponentColumnOption(component, columnReference, "width", lockedHiddenColumn ? undefined : width)
      writeComponentColumnOption(component, columnReference, "fixed", lockedHiddenColumn ? false : fixed)
      writeComponentColumnOption(
        component,
        columnReference,
        "fixedPosition",
        lockedHiddenColumn ? undefined : fixed ? item.fixedPosition : undefined,
      )
      writeComponentColumnOption(component, columnReference, "sortOrder", lockedHiddenColumn ? undefined : sortOrder)
      writeComponentColumnOption(component, columnReference, "sortIndex", lockedHiddenColumn ? undefined : sortIndex)
      const caption = resolveGridColumnCaption(
        item,
        columnProps.caption,
        translate,
      )
      if (!lockedHiddenColumn && !isTechnicalColumnCaption(caption, item.columnName)) {
        writeComponentColumnOption(component, columnReference, "caption", caption)
      }
      if (!lockedHiddenColumn && item.alignment) {
        writeComponentColumnOption(component, columnReference, "alignment", item.alignment)
      }
      if (!lockedHiddenColumn && item.formatType) {
        writeComponentColumnOption(
          component,
          columnReference,
          "format",
          resolveDevExtremeColumnFormat(item.formatType),
        )
      }
    })

    columnReferenceMap.forEach((columnReference, columnKey) => {
      if (isSystemFixedColumnName(columnKey)) {
        writeComponentColumnOption(component, columnReference, "visible", true)
        writeComponentColumnOption(component, columnReference, "allowHiding", false)
        writeComponentColumnOption(component, columnReference, "showInColumnChooser", false)
        writeComponentColumnOption(component, columnReference, "fixed", true)
        writeComponentColumnOption(component, columnReference, "fixedPosition", "left")
        writeComponentColumnOption(component, columnReference, "visibleIndex", 0)
        return
      }

      if (!hideColumnsMissingFromSettings || configuredColumnKeys.has(columnKey) || processedColumnReferences.has(columnReference)) {
        return
      }

      if (isTechnicalIdColumnName(columnKey)) {
        writeComponentColumnOption(component, columnReference, "visible", false)
        writeComponentColumnOption(component, columnReference, "showInColumnChooser", false)
        writeComponentColumnOption(component, columnReference, "allowHiding", false)
        return
      }

      writeComponentColumnOption(component, columnReference, "visible", false)
      writeComponentColumnOption(component, columnReference, "showInColumnChooser", false)
      writeComponentColumnOption(component, columnReference, "allowHiding", false)
    })

    columnReferenceMap.forEach((columnReference, columnKey) => {
      if (!shouldHideLangColumn(columnKey, allFieldNames)) {
        return
      }

      writeComponentColumnOption(component, columnReference, "visible", false)
      writeComponentColumnOption(component, columnReference, "showInColumnChooser", false)
      writeComponentColumnOption(component, columnReference, "allowHiding", false)
    })
  } finally {
    component.endUpdate?.()
  }

  return true
}
