import React from "react"

import { isTechnicalIdColumnName } from "@/components/datagrid/gridColumnSettingRender"
import { isReportSystemField } from "@/lib/reportSystemFields"

export type MasterCatalogField = {
  key: string
  caption?: string
}

type CatalogColumnComponent = React.ComponentType<{
  dataField?: string
  caption?: string
  calculateDisplayValue?: (row: Record<string, unknown>) => unknown
}>

export function isMasterDisplayColumn(fieldName: string): boolean {
  const normalized = fieldName.trim()
  if (!normalized) {
    return false
  }

  if (isReportSystemField(normalized)) {
    return false
  }

  return !isTechnicalIdColumnName(normalized)
}

export function collectPreviewFields(dataSource: unknown): MasterCatalogField[] {
  const rows = Array.isArray(dataSource) ? dataSource : []
  const keys: string[] = []
  const seen = new Set<string>()

  for (const row of rows) {
    if (!row || typeof row !== "object") {
      continue
    }

    for (const key of Object.keys(row)) {
      if (seen.has(key) || !isMasterDisplayColumn(key)) {
        continue
      }

      seen.add(key)
      keys.push(key)
    }
  }

  return keys.map((key) => ({ key }))
}

export type MasterCodeNameResolver = (fieldKey: string, rawValue: string | number) => string

function isEmptyCellValue(value: unknown): boolean {
  return value === null || value === undefined || (typeof value === "string" && value.trim() === "")
}

export function renderMasterCatalogColumns(
  columnComponent: CatalogColumnComponent,
  fields: readonly MasterCatalogField[],
  translate: (key: string, fallback: string) => string,
  resolveCodeName?: MasterCodeNameResolver,
): React.ReactNode[] {
  return fields
    .filter((field) => isMasterDisplayColumn(field.key))
    .map((field) =>
      React.createElement(columnComponent, {
        key: field.key,
        dataField: field.key,
        caption: translate(field.key, field.caption ?? field.key),
        calculateDisplayValue: resolveCodeName
          ? (row: Record<string, unknown>) => {
              const raw = row?.[field.key]
              if (isEmptyCellValue(raw) || (typeof raw !== "string" && typeof raw !== "number")) {
                return raw
              }

              const codeName = resolveCodeName(field.key, raw)
              return codeName ? translate(codeName, codeName) : raw
            }
          : undefined,
      }),
    )
}
