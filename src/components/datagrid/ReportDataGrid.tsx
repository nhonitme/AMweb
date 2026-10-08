import { forwardRef, useCallback, useContext, useEffect, useImperativeHandle, useLayoutEffect, useMemo, useRef, useState, type ForwardedRef, type PointerEvent as ReactPointerEvent } from "react"
import DataGrid, {
  Column,
  ColumnFixing,
  FilterPanel,
  FilterRow,
  Grouping,
  HeaderFilter,
  Scrolling,
  StateStoring,
  Summary,
  TotalItem,
} from "devextreme-react/data-grid"
import ProgressBar from "devextreme-react/progress-bar"
import ScrollView from "devextreme-react/scroll-view"
import { formatNumber } from "devextreme/localization"
import { getFaStatusDisplayText } from "@/pages/Module/FixedAssetManagement/fixedAssetStatus"
import { Coins, Landmark, Scale } from "lucide-react"
import ContextMenu from "devextreme/ui/context_menu"
import type {
  CellPreparedEvent,
  ContextMenuPreparingEvent,
  GroupCellTemplateData,
  InitializedEvent,
  RowDblClickEvent,
  RowPreparedEvent,
  dxDataGrid,
} from "devextreme/ui/data_grid"
import type dxScrollView from "devextreme/ui/scroll_view"
import { hasSearchText, syncGridSearchState } from "@/components/datagrid/gridSearch"
import { applyHeaderFieldNameTooltip } from "@/lib/gridHeaderFieldTooltip"

import type {
  ConfiguredReportPreview,
  ReportPreviewCellValue,
  ReportPreviewColumn,
  ReportPreviewColumnDataType,
} from "@/api/configuredReportPreviewApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { isReportSystemField } from "@/lib/reportSystemFields"
import { applyGridColumnSettingsToChildren } from "@/components/datagrid/gridColumnSettingRender"
import { useCompanyLangRevision } from "@/lib/companyLang"
import { useSysCodes } from "@/lib/sysCodeContext";
import GridColumnSettingsPopup from "@/components/datagrid/GridColumnSettingsPopup"
import { useGridColumnSettingState, type GridColumnSettingEditorItem } from "@/components/datagrid/useGridColumnSettingState"
import { normalizeYmd } from "@/pages/Accounting/accountingDateUtils"
import { translateReportColumnCaption, translateReportItemCaption } from "@/utils/reportColumnCaption"

export type ReportDataGridRow = {
  ROW_KEY: string
  [fieldName: string]: ReportPreviewCellValue
}

export type ReportDataGridHandle = {
  openColumnSettings: () => Promise<boolean>
}

export type ReportDataGridGroupConfig = {
  groupField: string
  labelField: string
  labelPrefixKey?: string
  labelPrefixFallback?: string
}

const REPORT_OUTLINE_REQUIRED_FIELDS = ["__ROW_TYPE", "__ROW_LEVEL", "__ROW_SORT"] as const
const OUTLINE_INDENT_FIELD_CANDIDATES = [
  "ACCOUNT_NAME",
  "DESCRIPTION",
  "CUSTOMER_NAME",
  "ITEM_NAME",
  "ITEM_TEXT",
  "LINE_NAME",
  "SECTION_NAME",
  "REPORT_ITEM_NAME",
] as const
const REPORT_GRID_FILLER_FIELD = "__REPORT_GRID_FILLER__"

type OutlineRowVisualStyle = {
  accentColor: string
  backgroundColor: string
  borderTop: string
  color: string
  fontWeight: string
  textTransform?: "uppercase"
}

type OutlineTreeInfo = {
  parentByRowKey: Map<string, string>
  parentRowKeys: Set<string>
  parentRowKeysKey: string
}

type ReportDataGridCellRenderData = {
  data?: ReportDataGridRow
  value?: ReportPreviewCellValue
  text?: string
}

type ReportDataGridProps = {
  menuCode?: string
  reportCode: string
  preview: ConfiguredReportPreview | null
  loading: boolean
  searchText: string
  gridId?: string
  fromDate?: Date | null
  toDate?: Date | null
  defaultOutlineExpanded?: boolean
  pinLastRowToBottom?: boolean
  outlineIndentFieldCandidates?: readonly string[]
  outlineIndentFallbackToFirstString?: boolean
  pinLastRowRenderMode?: "summary" | "fixedFooter";
  showFilterPanel?: boolean;
  groupConfig?: ReportDataGridGroupConfig
  onRowPrepared?: (event: RowPreparedEvent<ReportDataGridRow, string>) => void
  onRowDblClick?: (event: RowDblClickEvent<ReportDataGridRow, string>) => void
}

type PinnedBottomColumnInfo = {
  key: string
  fieldName: string
  width: number
  alignment?: string | null
  dataType: ReportPreviewColumnDataType
  format?: string | null
}

type ReportCustomizeTextCellInfo = {
  value?: unknown
  valueText?: string
}

function normalizeSearchText(value: string): string {
  return value.trim().toLowerCase()
}

function normalizeColumnKey(value: unknown): string {
  return typeof value === "string" ? value.trim().toUpperCase() : ""
}

function readRowField(row: ReportDataGridRow | undefined, fieldName: string): string | null {
  if (!row) {
    return null
  }

  const normalizedField = normalizeColumnKey(fieldName)
  if (!normalizedField) {
    return null
  }

  for (const [key, value] of Object.entries(row)) {
    if (normalizeColumnKey(key) !== normalizedField || value === null || value === undefined) {
      continue
    }

    const text = String(value).trim()
    if (text.length > 0) {
      return text
    }
  }

  return null
}

function resolveDataFieldName(
  columns: ReportPreviewColumn[],
  rows: ReportDataGridRow[],
  fieldName: string,
): string | null {
  const normalizedField = normalizeColumnKey(fieldName)
  if (!normalizedField) {
    return null
  }

  const matchedColumn = columns.find((column) => normalizeColumnKey(column.FIELD_NAME) === normalizedField)
  if (matchedColumn) {
    return matchedColumn.FIELD_NAME
  }

  if (rows.length === 0) {
    return null
  }

  return Object.keys(rows[0]).find((key) => normalizeColumnKey(key) === normalizedField) ?? null
}

function resolveGroupRowItems(data: unknown): ReportDataGridRow[] {
  if (!data || typeof data !== "object") {
    return []
  }

  const record = data as Record<string, unknown>
  if (Array.isArray(record.items)) {
    return record.items as ReportDataGridRow[]
  }

  if (Array.isArray(record.collapsedItems)) {
    return record.collapsedItems as ReportDataGridRow[]
  }

  return []
}

function normalizeNullableString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : null
}

function toFiniteNumber(value: ReportPreviewCellValue): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string") {
    const parsed = Number.parseFloat(value.replace(/,/g, "").trim())
    return Number.isFinite(parsed) ? parsed : null
  }

  return null
}

const TEMP_DECIMAL_PLACE_OPTIONS = [0, 1, 2, 3, 4, 6] as const
const REPORT_CELL_KEY_ATTR = "data-report-cell-key"

type ReportCellSelectionStats = {
  numericCount: number
  cellCount: number
  sum: number
  avg: number | null
}

function buildNumberFormat(places: number, useGrouping = true): string {
  const precision = Math.max(0, Math.min(12, Math.trunc(places)))
  const decimalPart = precision > 0 ? `.${"0".repeat(precision)}` : ""
  return useGrouping ? `#,##0${decimalPart}` : `0${decimalPart}`
}

function formatUsesGrouping(format: string | null | undefined): boolean {
  // .NET numeric formats (N0, N2, etc.) always use thousand separators.
  return !format || /^n\d{1,2}$/i.test(format.trim()) || format.includes(",") || format.includes("#")
}

function isYmdFieldName(fieldName: string | null | undefined): boolean {
  return typeof fieldName === "string" && fieldName.trim().toUpperCase().endsWith("_YMD")
}

/**
 * Report preview carries a format *type* token (`number2`, `date`, `text`, ...),
 * not a DevExtreme format string, whenever the column has a sys_grid_column
 * setting. Feeding the raw token to a column makes DevExtreme render the token
 * itself as the cell text, so translate it first.
 */
export function resolveDevExtremeColumnFormat(format: string | null | undefined): string | undefined {
  const normalized = normalizeNullableString(format)
  if (!normalized) {
    return undefined
  }

  // DevExtreme does not interpret .NET-style "N0" as a numeric format:
  // it renders the literal N followed by the value (e.g. N4).
  // Convert N0/N2/... to DevExtreme-compatible number masks.
  const dotNetNumericFormat = /^n(\d{1,2})$/i.exec(normalized)
  if (dotNetNumericFormat) {
    const places = Number(dotNetNumericFormat[1])
    if (places <= 12) {
      return buildNumberFormat(places)
    }
  }

  switch (normalized.toLowerCase()) {
    case "text":
    case "string":
    case "boolean":
    case "bool":
      return undefined
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

export function resolveColumnDisplayFormat(
  column: ReportPreviewColumn,
  tempDecimalPlacesByField: Readonly<Record<string, number>> = {},
): string | undefined {
  if (isYmdFieldName(column.FIELD_NAME) || resolveColumnDataType(column) === "date") {
    return resolveDevExtremeColumnFormat(column.FORMAT) ?? "dd/MM/yyyy"
  }

  if (resolveColumnDataType(column) !== "number") {
    return resolveDevExtremeColumnFormat(column.FORMAT)
  }

  const overridePlaces = tempDecimalPlacesByField[normalizeColumnKey(column.FIELD_NAME)]
  if (overridePlaces === undefined) {
    return resolveDevExtremeColumnFormat(column.FORMAT)
  }

  return buildNumberFormat(overridePlaces, formatUsesGrouping(column.FORMAT))
}

function resolveYmdCellValue(row: ReportDataGridRow, fieldName: string): Date | null {
  return normalizeYmd(row[fieldName])
}

function makeReportCellKey(rowKey: string, fieldName: string): string {
  return `${rowKey}::${fieldName}`
}

function parseReportCellKey(cellKey: string): { rowKey: string; fieldName: string } | null {
  const separatorIndex = cellKey.indexOf("::")
  if (separatorIndex <= 0) {
    return null
  }

  const rowKey = cellKey.slice(0, separatorIndex)
  const fieldName = cellKey.slice(separatorIndex + 2)
  if (!rowKey || !fieldName) {
    return null
  }

  return { rowKey, fieldName }
}

function resolveReportCellKeyFromTarget(target: EventTarget | null): string | null {
  if (!(target instanceof Element)) {
    return null
  }

  const cell = target.closest(`td[${REPORT_CELL_KEY_ATTR}]`)
  if (!(cell instanceof HTMLElement)) {
    return null
  }

  const cellKey = cell.getAttribute(REPORT_CELL_KEY_ATTR)
  return cellKey && cellKey.length > 0 ? cellKey : null
}

type BalanceSheetPeriodTotals = {
  totalAssets: number
  totalCapital: number
  difference: number
}

type BalanceSheetFooterTotals = {
  current: BalanceSheetPeriodTotals
  previous: BalanceSheetPeriodTotals
}

const BALANCE_SHEET_REPORT_CODES = new Set(["GL_BALANCE_SHEET_B01DN", "B01_DN"])
const PROFIT_LOSS_REPORT_CODES = new Set(["GL_PROFIT_LOSS_B02DN", "B02_DN"])
const CASHFLOW_REPORT_CODES = new Set([
  "GL_CASHFLOW_B03DN_TT",
  "GL_CASHFLOW_B03DN_GT",
  "B03_DN_TT",
  "B03_DN_GT",
])
const BALANCE_SHEET_ASSET_ITEM_CODES = ["280", "270"] as const
const BALANCE_SHEET_CAPITAL_ITEM_CODES = ["440"] as const
const BALANCE_SHEET_END_YEAR_FIELDS = new Set(["END_YEAR", "THISYEARMONEY", "CURRENT_YEAR"])
const BALANCE_SHEET_BEGIN_YEAR_FIELDS = new Set(["BEGIN_YEAR", "LASTYEARMONEY", "PREVIOUS_YEAR"])
const COMPARATIVE_YEAR_CURRENT_FIELDS = new Set(["CURRENT_YEAR", "THISYEARMONEY", "END_YEAR"])
const COMPARATIVE_YEAR_PREVIOUS_FIELDS = new Set(["PREVIOUS_YEAR", "LASTYEARMONEY", "BEGIN_YEAR"])

function isBalanceSheetReportCode(reportCode: string | null | undefined): boolean {
  const normalized = typeof reportCode === "string" ? reportCode.trim().toUpperCase() : ""
  return BALANCE_SHEET_REPORT_CODES.has(normalized)
}

function isProfitLossReportCode(reportCode: string | null | undefined): boolean {
  const normalized = typeof reportCode === "string" ? reportCode.trim().toUpperCase() : ""
  return PROFIT_LOSS_REPORT_CODES.has(normalized)
}

function isCashflowReportCode(reportCode: string | null | undefined): boolean {
  const normalized = typeof reportCode === "string" ? reportCode.trim().toUpperCase() : ""
  return CASHFLOW_REPORT_CODES.has(normalized)
}

function isComparativeYearPeriodReportCode(reportCode: string | null | undefined): boolean {
  return isProfitLossReportCode(reportCode) || isCashflowReportCode(reportCode)
}

function formatBalanceSheetHeaderDate(value: Date | null | undefined): string | null {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null
  }

  const day = `${value.getDate()}`.padStart(2, "0")
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const year = value.getFullYear()
  return `${day}/${month}/${year}`
}

function formatHeaderDateRange(
  fromDate: Date | null | undefined,
  toDate: Date | null | undefined,
): string | null {
  const fromText = formatBalanceSheetHeaderDate(fromDate)
  const toText = formatBalanceSheetHeaderDate(toDate)
  return fromText && toText ? `${fromText} - ${toText}` : null
}

function resolveBalanceSheetHeaderPeriod(
  fieldName: string,
  fromDate: Date | null | undefined,
  toDate: Date | null | undefined,
): string | null {
  const fieldKey = normalizeColumnKey(fieldName)
  if (!fieldKey) {
    return null
  }

  if (BALANCE_SHEET_END_YEAR_FIELDS.has(fieldKey)) {
    return formatHeaderDateRange(fromDate, toDate)
  }

  if (BALANCE_SHEET_BEGIN_YEAR_FIELDS.has(fieldKey)) {
    if (!(fromDate instanceof Date) || Number.isNaN(fromDate.getTime())) {
      return null
    }

    const openingDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() - 1)
    return formatBalanceSheetHeaderDate(openingDate)
  }

  return null
}

function resolveComparativeYearHeaderPeriod(
  fieldName: string,
  fromDate: Date | null | undefined,
  toDate: Date | null | undefined,
): string | null {
  const fieldKey = normalizeColumnKey(fieldName)
  if (!fieldKey) {
    return null
  }

  if (COMPARATIVE_YEAR_CURRENT_FIELDS.has(fieldKey)) {
    return formatHeaderDateRange(fromDate, toDate)
  }

  if (COMPARATIVE_YEAR_PREVIOUS_FIELDS.has(fieldKey)) {
    if (!(fromDate instanceof Date) || Number.isNaN(fromDate.getTime())) {
      return null
    }

    const previousDate = new Date(fromDate.getFullYear(), fromDate.getMonth(), fromDate.getDate() - 1)
    return formatBalanceSheetHeaderDate(previousDate)
  }

  return null
}

function resolveFinancialStatementHeaderPeriod(
  reportCode: string | null | undefined,
  fieldName: string,
  fromDate: Date | null | undefined,
  toDate: Date | null | undefined,
): string | null {
  if (isBalanceSheetReportCode(reportCode)) {
    return resolveBalanceSheetHeaderPeriod(fieldName, fromDate, toDate)
  }

  if (isComparativeYearPeriodReportCode(reportCode)) {
    return resolveComparativeYearHeaderPeriod(fieldName, fromDate, toDate)
  }

  return null
}

function readBalanceSheetItemCode(row: ReportDataGridRow): string {
  const raw = row.ITEM_CODE ?? row.ITEM_NM_NO ?? ""
  return String(raw).trim()
}

function readBalanceSheetAmount(
  row: ReportDataGridRow | undefined,
  period: "current" | "previous",
): number {
  if (!row) {
    return 0
  }

  if (period === "previous") {
    return (
      toFiniteNumber(row.BEGIN_YEAR) ??
      toFiniteNumber(row.LASTYEARMONEY) ??
      toFiniteNumber(row.PREVIOUS_YEAR) ??
      0
    )
  }

  return (
    toFiniteNumber(row.END_YEAR) ??
    toFiniteNumber(row.THISYEARMONEY) ??
    toFiniteNumber(row.CURRENT_YEAR) ??
    0
  )
}

function buildBalanceSheetPeriodTotals(
  assetsRow: ReportDataGridRow | undefined,
  capitalRow: ReportDataGridRow | undefined,
  period: "current" | "previous",
): BalanceSheetPeriodTotals {
  const totalAssets = readBalanceSheetAmount(assetsRow, period)
  const totalCapital = readBalanceSheetAmount(capitalRow, period)
  return {
    totalAssets,
    totalCapital,
    difference: Math.abs(totalAssets - totalCapital),
  }
}

function findBalanceSheetRowByItemCodes(
  rows: readonly ReportDataGridRow[],
  itemCodes: readonly string[],
): ReportDataGridRow | undefined {
  for (const itemCode of itemCodes) {
    const matched = rows.find((row) => readBalanceSheetItemCode(row) === itemCode)
    if (matched) {
      return matched
    }
  }

  return undefined
}

function computeBalanceSheetFooterTotals(
  reportCode: string | null | undefined,
  rows: readonly ReportDataGridRow[],
): BalanceSheetFooterTotals | null {
  if (!isBalanceSheetReportCode(reportCode) || rows.length === 0) {
    return null
  }

  const assetsRow = findBalanceSheetRowByItemCodes(rows, BALANCE_SHEET_ASSET_ITEM_CODES)
  const capitalRow = findBalanceSheetRowByItemCodes(rows, BALANCE_SHEET_CAPITAL_ITEM_CODES)
  if (!assetsRow && !capitalRow) {
    return null
  }

  return {
    current: buildBalanceSheetPeriodTotals(assetsRow, capitalRow, "current"),
    previous: buildBalanceSheetPeriodTotals(assetsRow, capitalRow, "previous"),
  }
}

function computeReportCellSelectionStats(
  rowsByKey: Map<string, ReportDataGridRow>,
  selectedKeys: ReadonlySet<string>,
  numberFieldNames: ReadonlySet<string>,
): ReportCellSelectionStats {
  let numericCount = 0
  let sum = 0

  for (const cellKey of selectedKeys) {
    const parsed = parseReportCellKey(cellKey)
    if (!parsed) {
      continue
    }

    if (!numberFieldNames.has(normalizeColumnKey(parsed.fieldName))) {
      continue
    }

    const row = rowsByKey.get(parsed.rowKey)
    if (!row) {
      continue
    }

    const numericValue = toFiniteNumber(row[parsed.fieldName])
    if (numericValue === null) {
      continue
    }

    numericCount += 1
    sum += numericValue
  }

  return {
    numericCount,
    cellCount: selectedKeys.size,
    sum,
    avg: numericCount > 0 ? sum / numericCount : null,
  }
}

function syncReportCellSelectionHighlights(
  root: ParentNode | null,
  selectedKeys: ReadonlySet<string>,
): void {
  if (!root) {
    return
  }

  root.querySelectorAll(`td[${REPORT_CELL_KEY_ATTR}].report-cell-selected`).forEach((element) => {
    element.classList.remove("report-cell-selected")
  })

  selectedKeys.forEach((cellKey) => {
    const escaped =
      typeof CSS !== "undefined" && typeof CSS.escape === "function" ? CSS.escape(cellKey) : cellKey
    root.querySelectorAll(`td[${REPORT_CELL_KEY_ATTR}="${escaped}"]`).forEach((element) => {
      element.classList.add("report-cell-selected")
    })
  })
}

function buildCellRangeKeys(
  anchorKey: string,
  focusKey: string,
  visibleRows: ReportDataGridRow[],
  visibleFields: string[],
): string[] {
  const anchor = parseReportCellKey(anchorKey)
  const focus = parseReportCellKey(focusKey)
  if (!anchor || !focus) {
    return []
  }

  const rowIndexByKey = new Map(visibleRows.map((row, index) => [row.ROW_KEY, index] as const))
  const fieldIndexByName = new Map(
    visibleFields.map((fieldName, index) => [normalizeColumnKey(fieldName), index] as const),
  )

  const anchorRowIndex = rowIndexByKey.get(anchor.rowKey)
  const focusRowIndex = rowIndexByKey.get(focus.rowKey)
  const anchorFieldIndex = fieldIndexByName.get(normalizeColumnKey(anchor.fieldName))
  const focusFieldIndex = fieldIndexByName.get(normalizeColumnKey(focus.fieldName))

  if (
    anchorRowIndex == null ||
    focusRowIndex == null ||
    anchorFieldIndex == null ||
    focusFieldIndex == null
  ) {
    return [focusKey]
  }

  const rowStart = Math.min(anchorRowIndex, focusRowIndex)
  const rowEnd = Math.max(anchorRowIndex, focusRowIndex)
  const fieldStart = Math.min(anchorFieldIndex, focusFieldIndex)
  const fieldEnd = Math.max(anchorFieldIndex, focusFieldIndex)
  const keys: string[] = []

  for (let rowIndex = rowStart; rowIndex <= rowEnd; rowIndex += 1) {
    const row = visibleRows[rowIndex]
    if (!row) {
      continue
    }

    for (let fieldIndex = fieldStart; fieldIndex <= fieldEnd; fieldIndex += 1) {
      const fieldName = visibleFields[fieldIndex]
      if (!fieldName) {
        continue
      }

      keys.push(makeReportCellKey(row.ROW_KEY, fieldName))
    }
  }

  return keys
}

function mergeUniqueCellKeys(...groups: ReadonlyArray<ReadonlyArray<string>>): string[] {
  const merged = new Set<string>()
  groups.forEach((group) => {
    group.forEach((key) => {
      if (key) {
        merged.add(key)
      }
    })
  })
  return Array.from(merged)
}

function toggleCellKey(keys: readonly string[], cellKey: string): string[] {
  if (keys.includes(cellKey)) {
    return keys.filter((key) => key !== cellKey)
  }

  return [...keys, cellKey]
}

function formatCellValueForClipboard(value: ReportPreviewCellValue | undefined): string {
  if (value === null || value === undefined) {
    return ""
  }

  if (typeof value === "boolean") {
    return value ? "1" : "0"
  }

  return String(value)
}

function buildSelectedCellsClipboardText(
  selectedKeys: readonly string[],
  rowsByKey: Map<string, ReportDataGridRow>,
  visibleRows: ReportDataGridRow[],
  visibleFields: string[],
): string {
  if (selectedKeys.length === 0) {
    return ""
  }

  const selectedSet = new Set(selectedKeys)
  const rowIndexByKey = new Map(visibleRows.map((row, index) => [row.ROW_KEY, index] as const))
  const fieldIndexByName = new Map(
    visibleFields.map((fieldName, index) => [normalizeColumnKey(fieldName), index] as const),
  )

  let minRow = Number.POSITIVE_INFINITY
  let maxRow = Number.NEGATIVE_INFINITY
  let minField = Number.POSITIVE_INFINITY
  let maxField = Number.NEGATIVE_INFINITY

  for (const cellKey of selectedKeys) {
    const parsed = parseReportCellKey(cellKey)
    if (!parsed) {
      continue
    }

    const rowIndex = rowIndexByKey.get(parsed.rowKey)
    const fieldIndex = fieldIndexByName.get(normalizeColumnKey(parsed.fieldName))
    if (rowIndex == null || fieldIndex == null) {
      continue
    }

    minRow = Math.min(minRow, rowIndex)
    maxRow = Math.max(maxRow, rowIndex)
    minField = Math.min(minField, fieldIndex)
    maxField = Math.max(maxField, fieldIndex)
  }

  if (!Number.isFinite(minRow) || !Number.isFinite(minField)) {
    return selectedKeys
      .map((cellKey) => {
        const parsed = parseReportCellKey(cellKey)
        if (!parsed) {
          return ""
        }

        return formatCellValueForClipboard(rowsByKey.get(parsed.rowKey)?.[parsed.fieldName])
      })
      .join("\t")
  }

  const lines: string[] = []
  for (let rowIndex = minRow; rowIndex <= maxRow; rowIndex += 1) {
    const row = visibleRows[rowIndex]
    if (!row) {
      continue
    }

    const cells: string[] = []
    for (let fieldIndex = minField; fieldIndex <= maxField; fieldIndex += 1) {
      const fieldName = visibleFields[fieldIndex]
      if (!fieldName) {
        cells.push("")
        continue
      }

      const cellKey = makeReportCellKey(row.ROW_KEY, fieldName)
      cells.push(selectedSet.has(cellKey) ? formatCellValueForClipboard(row[fieldName]) : "")
    }

    lines.push(cells.join("\t"))
  }

  return lines.join("\n")
}

async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) {
    return false
  }

  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text)
      return true
    }
  } catch {
    // fall through to legacy copy
  }

  try {
    const textarea = document.createElement("textarea")
    textarea.value = text
    textarea.setAttribute("readonly", "")
    textarea.style.position = "fixed"
    textarea.style.left = "-9999px"
    document.body.appendChild(textarea)
    textarea.select()
    const succeeded = document.execCommand("copy")
    document.body.removeChild(textarea)
    return succeeded
  } catch {
    return false
  }
}

function hideOpenReportContextMenus(): void {
  document.querySelectorAll(".dx-context-menu").forEach((element) => {
    if (!(element instanceof HTMLElement)) {
      return
    }

    const instance = ContextMenu.getInstance(element) as { hide?: () => void } | undefined
    instance?.hide?.()
  })
}

function resolveOutlineRowSort(row: ReportDataGridRow): number {
  return toFiniteNumber(row.__ROW_SORT) ?? Number.MAX_SAFE_INTEGER
}

function resolveOutlineRowLevel(row: ReportDataGridRow): number {
  return Math.max(0, Math.round(toFiniteNumber(row.__ROW_LEVEL) ?? 0))
}

function resolveOutlineParentRowKey(row: ReportDataGridRow | undefined): string | null {
  return normalizeNullableString(row?.__PARENT_ROW_KEY)
}

function resolveOutlineRowType(row: ReportDataGridRow | undefined): string {
  return typeof row?.__ROW_TYPE === "string" ? row.__ROW_TYPE.trim().toUpperCase() : ""
}

function isReportStyleFlagEnabled(value: ReportPreviewCellValue | undefined): boolean {
  if (value === true || value === 1) {
    return true
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return value === 1
  }

  if (typeof value !== "string") {
    return false
  }

  const normalized = value.trim().toUpperCase()
  return normalized === "1" || normalized === "Y" || normalized === "TRUE"
}

function isRowFontBold(row: ReportDataGridRow | undefined): boolean {
  if (!row) {
    return false
  }

  return isReportStyleFlagEnabled(row.FONT_BOLD) || isReportStyleFlagEnabled(row.__FONT_BOLD)
}

const REPORT_ITEM_NAME_FIELDS = new Set([
  "ITEM_NAME",
  "REPORT_ITEM_NAME",
  "ITEM_TEXT",
  "LINE_NAME",
  "SECTION_NAME",
])

function isReportItemNameField(fieldName: string | null | undefined): boolean {
  const key = normalizeColumnKey(fieldName)
  return key.length > 0 && REPORT_ITEM_NAME_FIELDS.has(key)
}

function resolveReportSysCodeType(
  fieldName: string | null | undefined,
  sysCodeMap: Record<string, unknown[]>,
): string {
  const codeType = normalizeColumnKey(fieldName)
  if (!codeType || isReportSystemField(fieldName)) {
    return ""
  }

  return sysCodeMap[codeType]?.length ? codeType : ""
}

function resolveOutlineRowVisualStyle(rowType: string): OutlineRowVisualStyle {
  if (rowType === "TOTAL" || rowType === "TOTAL_FOOTER"|| rowType.includes("TOTAL")) {
    return {
      accentColor: "",
      backgroundColor: "#e5e7eb",
      borderTop: "1px solid #9ca3af",
      color: "#0f172a",
      fontWeight: "700",
    }
  }

  if (rowType === "SECTION") {
    return {
      accentColor: "#2563eb",
      backgroundColor: "#dbeafe",
      borderTop: "1px solid #93c5fd",
      color: "#1e3a8a",
      fontWeight: "700",
      textTransform: "uppercase",
    }
  }

  if (rowType === "GROUP") {
    return {
      accentColor: "",
      backgroundColor: "#eef2ff",
      borderTop: "1px solid #c7d2fe",
      color: "#1e1b4b",
      fontWeight: "700",
    }
  }

  return {
    accentColor: "",
    backgroundColor: "",
    borderTop: "",
    color: "",
    fontWeight: "",
  }
}

/** DevExtreme group rows: keep GROUP colors; no border-top / font-weight on cells (icon stays centered). */
function resolveDevExtremeGroupRowVisualStyle(): OutlineRowVisualStyle {
  return {
    ...resolveOutlineRowVisualStyle("GROUP"),
    borderTop: "",
    fontWeight: "",
  }
}

function applyCellVisualStyle(
  cellElement: HTMLElement,
  visualStyle: OutlineRowVisualStyle,
  outlineMode: boolean,
) {
  if (!outlineMode) {
    cellElement.style.removeProperty("background-color")
    cellElement.style.removeProperty("border-top")
    cellElement.style.removeProperty("color")
    cellElement.style.removeProperty("font-weight")
    cellElement.style.removeProperty("text-transform")
    cellElement.style.removeProperty("box-shadow")
    return
  }

  if (visualStyle.backgroundColor) {
    cellElement.style.setProperty("background-color", visualStyle.backgroundColor, "important")
  } else {
    cellElement.style.removeProperty("background-color")
  }

  if (visualStyle.borderTop) {
    cellElement.style.setProperty("border-top", visualStyle.borderTop, "important")
  } else {
    cellElement.style.removeProperty("border-top")
  }

  if (visualStyle.color) {
    cellElement.style.setProperty("color", visualStyle.color, "important")
  } else {
    cellElement.style.removeProperty("color")
  }

  if (visualStyle.fontWeight) {
    cellElement.style.setProperty("font-weight", visualStyle.fontWeight, "important")
  } else {
    cellElement.style.removeProperty("font-weight")
  }

  if (visualStyle.textTransform) {
    cellElement.style.setProperty("text-transform", visualStyle.textTransform, "important")
  } else {
    cellElement.style.removeProperty("text-transform")
  }

  cellElement.style.removeProperty("box-shadow")
}

function applyRowVisualStyle(
  rowElement: HTMLElement,
  visualStyle: OutlineRowVisualStyle,
  rowType: string,
  outlineMode: boolean,
) {
  rowElement.dataset.reportRowType = outlineMode ? rowType : ""

  if (!outlineMode) {
    rowElement.style.removeProperty("background-color")
    rowElement.style.removeProperty("color")
    rowElement.style.removeProperty("font-weight")
    return
  }

  if (visualStyle.backgroundColor) {
    rowElement.style.setProperty("background-color", visualStyle.backgroundColor, "important")
  } else {
    rowElement.style.removeProperty("background-color")
  }

  if (visualStyle.color) {
    rowElement.style.setProperty("color", visualStyle.color, "important")
  } else {
    rowElement.style.removeProperty("color")
  }

  if (visualStyle.fontWeight) {
    rowElement.style.setProperty("font-weight", visualStyle.fontWeight, "important")
  } else {
    rowElement.style.removeProperty("font-weight")
  }
}

function resolveOutlineIndentField(
  columns: ReportPreviewColumn[],
  candidates: readonly string[] = OUTLINE_INDENT_FIELD_CANDIDATES,
  fallbackToFirstString = true,
): string | null {
  const fieldByKey = new Map(
    columns.map((column) => [normalizeColumnKey(column.FIELD_NAME), column.FIELD_NAME] as const),
  )

  for (const fieldName of candidates) {
    const resolvedField = fieldByKey.get(normalizeColumnKey(fieldName))
    if (resolvedField) {
      return resolvedField
    }
  }

  if (!fallbackToFirstString) {
    return null
  }

  return columns.find((column) => resolveColumnDataType(column) === "string")?.FIELD_NAME ?? null
}

function normalizeRowValues(values: Record<string, ReportPreviewCellValue>): Record<string, ReportPreviewCellValue> {
  return Object.entries(values).reduce((acc, [key, value]) => {
    acc[key] = value
    const normalizedKey = normalizeColumnKey(key)
    if (normalizedKey && normalizedKey !== key) {
      acc[normalizedKey] = value
    }
    return acc
  }, {} as Record<string, ReportPreviewCellValue>)
}

function hasOutlineTechnicalValues(preview: ConfiguredReportPreview | null): boolean {
  return preview?.ROWS.some((row) =>
    Object.keys(row.VALUES).some((key) =>
      REPORT_OUTLINE_REQUIRED_FIELDS.some((fieldName) => fieldName === normalizeColumnKey(key)),
    ),
  ) === true
}

function buildOutlineTreeInfo(rows: ReportDataGridRow[]): OutlineTreeInfo {
  const parentByRowKey = new Map<string, string>()
  const parentRowKeys = new Set<string>()

  rows.forEach((row) => {
    const rowKey = normalizeNullableString(row.ROW_KEY)
    const parentRowKey = resolveOutlineParentRowKey(row)
    if (!rowKey || !parentRowKey) {
      return
    }

    parentByRowKey.set(rowKey, parentRowKey)
    parentRowKeys.add(parentRowKey)
  })

  const parentRowKeysKey = Array.from(parentRowKeys).sort().join("|")

  return {
    parentByRowKey,
    parentRowKeys,
    parentRowKeysKey,
  }
}

function shouldShowOutlineRow(
  row: ReportDataGridRow,
  expandedRowKeys: Set<string>,
  parentByRowKey: Map<string, string>,
): boolean {
  let parentRowKey = resolveOutlineParentRowKey(row)
  const visitedRowKeys = new Set<string>()

  while (parentRowKey) {
    if (!expandedRowKeys.has(parentRowKey)) {
      return false
    }

    if (visitedRowKeys.has(parentRowKey)) {
      return true
    }

    visitedRowKeys.add(parentRowKey)
    parentRowKey = parentByRowKey.get(parentRowKey) ?? null
  }

  return true
}

function filterExpandedOutlineRows(
  rows: ReportDataGridRow[],
  outlineMode: boolean,
  expandedRowKeys: Set<string>,
  parentByRowKey: Map<string, string>,
): ReportDataGridRow[] {
  if (!outlineMode) {
    return rows
  }

  return rows.filter((row) => shouldShowOutlineRow(row, expandedRowKeys, parentByRowKey))
}

function isOutlineEmphasisRow(row: ReportDataGridRow | undefined): boolean {
  const rowType = resolveOutlineRowType(row)
  return rowType === "GROUP" || rowType === "SECTION" || rowType === "TOTAL" || rowType.includes("TOTAL")
}

export function toReportDataGridRows(preview: ConfiguredReportPreview | null): ReportDataGridRow[] {
  if (!preview) {
    return []
  }

  const rows = preview.ROWS.map((row) => ({
    ROW_KEY: row.ROW_KEY,
    ...normalizeRowValues(row.VALUES),
  }))

  return rows
}

const FA_STATUS_TEXT_REPORT_CODES = new Set([
  "FA_ASSET_BOOK_REPORT",
  "FA_DEPRECIATION_PERIOD_REPORT",
])

const KNOWN_FA_STATUS_CODES = new Set([
  "NOT_IN_USE",
  "IN_USE",
  "SUSPENDED",
  "SOLD",
  "USING",
  "STOP",
  "FINISHED",
])

export function toLocalizedReportDataGridRows(
  preview: ConfiguredReportPreview | null,
  translate: (key: string, fallback: string) => string,
  reportCode?: string | null,
): ReportDataGridRow[] {
  const normalizedReportCode = String(reportCode ?? "").trim().toUpperCase()
  const localizeStatusText = FA_STATUS_TEXT_REPORT_CODES.has(normalizedReportCode)
  const localizeTaxReductionGroup = normalizedReportCode === "TAX_VAT_REDUCTION_APPENDIX"
  return toReportDataGridRows(preview).map((row) => {
    let localized = localizeReportItemNameFields(row, translate)
    if (localizeTaxReductionGroup) {
      localized = localizeTaxReductionAppendixGroup(localized, translate)
    }
    return localizeStatusText ? localizeFaStatusTextField(localized, translate) : localized
  })
}

// The SP/API returns the invoice group code. Localize ITEM_KIND in the UI so
// switching the language changes group headers and Excel export without
// re-fetching the report or altering the invoice's actual PRODUCT_NAME.
function localizeTaxReductionAppendixGroup(
  row: ReportDataGridRow,
  translate: (key: string, fallback: string) => string,
): ReportDataGridRow {
  const type = readRowField(row, "TYPE")?.trim()
  const translationKey =
    type === "1" ? "Tax_reduction_appendix_group1" :
    type === "2" ? "Tax_reduction_appendix_group2" : null
  if (!translationKey) {
    return row
  }

  const fieldName = Object.keys(row).find((key) => normalizeColumnKey(key) === "ITEM_KIND") ?? "ITEM_KIND"
  const fallback = readRowField(row, "ITEM_KIND") ??
    (type === "1" ? "I. Hàng hóa, dịch vụ mua vào" : "II. Hàng hóa, dịch vụ bán ra")
  const translated = translate(translationKey, fallback)
  return translated === row[fieldName] ? row : { ...row, [fieldName]: translated }
}

function localizeFaStatusTextField(
  row: ReportDataGridRow,
  translate: (key: string, fallback: string) => string,
): ReportDataGridRow {
  const status = readRowField(row, "STATUS")
  if (!status || !KNOWN_FA_STATUS_CODES.has(status.trim().toUpperCase())) {
    return row
  }

  const display = getFaStatusDisplayText(status, translate).trim()
  if (!display) {
    return row
  }

  const statusTextKey = Object.keys(row).find((key) => normalizeColumnKey(key) === "STATUS_TEXT") ?? "STATUS_TEXT"
  if (row[statusTextKey] === display) {
    return row
  }

  return {
    ...row,
    [statusTextKey]: display,
  }
}

function localizeReportItemNameFields(
  row: ReportDataGridRow,
  translate: (key: string, fallback: string) => string,
): ReportDataGridRow {
  const labelText = readRowField(row, "LABEL_TEXT")
  const caption = readRowField(row, "CAPTION")
  if (!labelText && !caption) {
    return row
  }

  let next: ReportDataGridRow | null = null

  for (const [key, value] of Object.entries(row)) {
    if (!isReportItemNameField(key) || typeof value !== "string") {
      continue
    }

    const display = translateReportItemCaption(
      {
        LABEL_TEXT: labelText,
        CAPTION: caption,
        ITEM_NAME: value,
      },
      translate,
    )

    if (display === value) {
      continue
    }

    if (!next) {
      next = { ...row }
    }

    next[key] = display
  }

  return next ?? row
}

function filterRows(
  rows: ReportDataGridRow[],
  columns: ReportPreviewColumn[],
  searchText: string,
): ReportDataGridRow[] {
  const normalizedSearchText = normalizeSearchText(searchText)
  if (!normalizedSearchText) {
    return rows
  }

  return rows.filter((row) =>
    columns.some((column) => {
      const value = row[column.FIELD_NAME]
      return value !== null && value !== undefined && String(value).toLowerCase().includes(normalizedSearchText)
    }),
  )
}

function formatCellValue(value: ReportPreviewCellValue | undefined, text: string | undefined): string {
  if (text !== undefined) {
    return text
  }

  if (value === null || value === undefined) {
    return ""
  }

  return String(value)
}

function resolveColumnDataType(column: ReportPreviewColumn): ReportPreviewColumnDataType {
  if (isYmdFieldName(column.FIELD_NAME)) {
    return "date"
  }

  const formatToken = normalizeNullableString(column.FORMAT)?.toLowerCase()
  if (formatToken === "date" || formatToken === "datetime") {
    return "date"
  }

  return column.DATA_TYPE || "string"
}

function resolveColumnWidth(column: ReportPreviewColumn): number {
  const width = Number(column.WIDTH)
  return Number.isFinite(width) && width > 0 ? Math.round(width) : 120
}

function buildColumnSettingMap(items: GridColumnSettingEditorItem[]) {
  return new Map(
    items
      .map((item) => [normalizeColumnKey(item.columnName), item] as const)
      .filter(([columnName]) => columnName.length > 0),
  )
}

function resolveSettingWidth(setting: GridColumnSettingEditorItem | undefined): number | null {
  if (typeof setting?.width !== "number" || !Number.isFinite(setting.width)) {
    return null
  }

  return Math.max(1, Math.round(setting.width))
}

function shouldPinLastRowToBottom(row: ReportDataGridRow | undefined): boolean {
  return resolveOutlineRowType(row) === "TOTAL_FOOTER"
}

function splitLastRowForPinnedBottom(
  rows: ReportDataGridRow[],
  pinLastRowToBottom: boolean,
): { dataRows: ReportDataGridRow[]; pinnedBottomRow: ReportDataGridRow | null } {
  const lastRow = rows[rows.length - 1]

  if (!pinLastRowToBottom || !shouldPinLastRowToBottom(lastRow)) {
    return {
      dataRows: rows,
      pinnedBottomRow: null,
    }
  }

  return {
    dataRows: rows.slice(0, rows.length - 1),
    pinnedBottomRow: lastRow ?? null,
  }
}

function resolvePinnedBottomColumns(
  columns: ReportPreviewColumn[],
  settings: GridColumnSettingEditorItem[],
  tempDecimalPlacesByField: Readonly<Record<string, number>>,
): PinnedBottomColumnInfo[] {
  const settingMap = buildColumnSettingMap(settings)

  return columns.flatMap((column) => {
    const setting =
      settingMap.get(normalizeColumnKey(column.FIELD_NAME)) ??
      settingMap.get(normalizeColumnKey(column.COLUMN_KEY))

    if (!setting) {
      return []
    }

    if (setting?.isVisible === false) {
      return []
    }

    return [
      {
        key: column.COLUMN_KEY,
        fieldName: column.FIELD_NAME,
        width: resolveSettingWidth(setting) ?? resolveColumnWidth(column),
        alignment: column.ALIGN,
        dataType: resolveColumnDataType(column),
        format: resolveColumnDisplayFormat(column, tempDecimalPlacesByField) ?? null,
      },
    ]
  })
}

function formatPinnedBottomCellValue(
  value: ReportPreviewCellValue | undefined,
  column: PinnedBottomColumnInfo,
): string {
  if (value === null || value === undefined) {
    return ""
  }

  const format = normalizeNullableString(column.format)

  if (column.dataType === "date" || isYmdFieldName(column.fieldName)) {
    const dateValue = normalizeYmd(value)
    if (!dateValue) {
      return ""
    }

    const day = `${dateValue.getDate()}`.padStart(2, "0")
    const month = `${dateValue.getMonth() + 1}`.padStart(2, "0")
    const year = dateValue.getFullYear()
    return `${day}/${month}/${year}`
  }

  if (column.dataType === "number") {
    const numericValue = toFiniteNumber(value)

    if (numericValue === null) {
      return String(value)
    }

    if (format) {
      try {
        return formatNumber(numericValue, format)
      } catch {
      }
    }

    return numericValue.toLocaleString(undefined, { maximumFractionDigits: 6 })
  }

  return String(value)
}
const PINNED_BOTTOM_SUMMARY_NAME_PREFIX = "PINNED_BOTTOM__"

function resolvePinnedBottomSummaryName(fieldName: string): string {
  return `${PINNED_BOTTOM_SUMMARY_NAME_PREFIX}${fieldName}`
}

function resolvePinnedBottomSummaryFieldName(summaryName: unknown): string | null {
  if (typeof summaryName !== "string" || !summaryName.startsWith(PINNED_BOTTOM_SUMMARY_NAME_PREFIX)) {
    return null
  }

  const fieldName = summaryName.slice(PINNED_BOTTOM_SUMMARY_NAME_PREFIX.length)
  return fieldName.length > 0 ? fieldName : null
}


function ReportDataGrid(
  {
    reportCode,
    menuCode,
    preview,
    loading,
    searchText,
    gridId,
    fromDate = null,
    toDate = null,
    defaultOutlineExpanded = true,
    pinLastRowToBottom = true,
    onRowPrepared,
    onRowDblClick,
    outlineIndentFieldCandidates = OUTLINE_INDENT_FIELD_CANDIDATES,
    outlineIndentFallbackToFirstString = false,
    pinLastRowRenderMode = "summary",
    showFilterPanel = false,
    groupConfig,
  }: ReportDataGridProps,
  ref: ForwardedRef<ReportDataGridHandle>,
) {
  const { translate, labelsReady } = useContext(LanguageContext)
  
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])
  const { getCodeName, sysCodeMap } = useSysCodes();
  const isBalanceSheetReport = isBalanceSheetReportCode(reportCode)
  const hasPeriodHeaderCaptions =
    isBalanceSheetReport || isComparativeYearPeriodReportCode(reportCode)
  const columns = useMemo(
    () =>
      (preview?.COLUMNS ?? []).filter(
        (column) => !isReportSystemField(column.FIELD_NAME),
      ),
    [preview?.COLUMNS],
  )
  const outlineMode = useMemo(
    () => preview?.PREVIEW_MODE === "OUTLINE_GRID" || hasOutlineTechnicalValues(preview),
    [preview],
  )


  const outlineIndentField = useMemo(
  () =>
    resolveOutlineIndentField(
      columns,
      outlineIndentFieldCandidates,
      outlineIndentFallbackToFirstString,
    ),
  [columns, outlineIndentFieldCandidates, outlineIndentFallbackToFirstString],
  )

  const rows = useMemo(
    () => toLocalizedReportDataGridRows(preview, t, reportCode),
    [preview, reportCode, t],
  )
  const groupDataField = useMemo(
    () => (groupConfig ? resolveDataFieldName(columns, rows, groupConfig.groupField) : null),
    [columns, groupConfig, rows],
  )
  const normalizedGroupField = normalizeColumnKey(groupConfig?.groupField)
  const outlineTree = useMemo(() => buildOutlineTreeInfo(rows), [rows])
  const [expandedRowKeys, setExpandedRowKeys] = useState<Set<string>>(() => new Set())
  const gridRef = useRef<dxDataGrid | null>(null)
  const gridHostRef = useRef<HTMLDivElement | null>(null)
  const [tempDecimalPlacesByField, setTempDecimalPlacesByField] = useState<Record<string, number>>({})
  const [selectedCellKeys, setSelectedCellKeys] = useState<string[]>([])
  const cellSelectionDragRef = useRef<{
    active: boolean
    anchorKey: string | null
    baseKeys: string[]
    additive: boolean
    moved: boolean
  }>({ active: false, anchorKey: null, baseKeys: [], additive: false, moved: false })
  const selectionAnchorKeyRef = useRef<string | null>(null)
  const selectedCellKeysRef = useRef<string[]>([])
  const rowDblClickGuardRef = useRef<{ rowKey: string; at: number } | null>(null)
  const lastRowDrillAtRef = useRef(0)
  const ROW_DBLCLICK_MS = 400
  const ROW_DRILL_DEDUP_MS = 500
  const resolvedGridId = (gridId ?? reportCode).trim()
  const columnSettingState = useGridColumnSettingState({
    enabled: true,
    menuCode,
    gridId: resolvedGridId,
    excludedColumnNames: [REPORT_GRID_FILLER_FIELD],
    hideColumnsMissingFromSettings: true,
  })
  const expandedRows = useMemo(
    () => filterExpandedOutlineRows(rows, outlineMode, expandedRowKeys, outlineTree.parentByRowKey),
    [expandedRowKeys, outlineMode, outlineTree.parentByRowKey, rows],
  )
  const { dataRows, pinnedBottomRow } = useMemo(
    () => splitLastRowForPinnedBottom(expandedRows, pinLastRowToBottom && pinLastRowRenderMode === "summary"),
    [expandedRows, pinLastRowRenderMode, pinLastRowToBottom],
  )
  const filteredRows = useMemo(
    () => filterRows(dataRows, columns, searchText),
    [columns, dataRows, searchText],
  )
  const pinnedBottomColumns = useMemo(
    () => resolvePinnedBottomColumns(columns, columnSettingState.cachedEditorItems, tempDecimalPlacesByField),
    [columnSettingState.cachedEditorItems, columns, tempDecimalPlacesByField],
  )
  const shouldRenderPinnedBottomSummary = pinnedBottomRow !== null && pinLastRowRenderMode === "summary"
  const searchVisible = useMemo(() => hasSearchText(searchText), [searchText])
  const numberFieldNames = useMemo(
    () =>
      new Set(
        columns
          .filter((column) => resolveColumnDataType(column) === "number")
          .map((column) => normalizeColumnKey(column.FIELD_NAME)),
      ),
    [columns],
  )
  const visibleFieldNames = useMemo(() => columns.map((column) => column.FIELD_NAME), [columns])
  const rowsByKey = useMemo(() => new Map(filteredRows.map((row) => [row.ROW_KEY, row] as const)), [filteredRows])
  const selectionStats = useMemo(
    () => computeReportCellSelectionStats(rowsByKey, new Set(selectedCellKeys), numberFieldNames),
    [numberFieldNames, rowsByKey, selectedCellKeys],
  )
  const balanceSheetFooterTotals = useMemo(
    () => computeBalanceSheetFooterTotals(reportCode, rows),
    [reportCode, rows],
  )
  const selectionFormat = "#,##0.##"
  const balanceSheetAmountFormat = "#,##0"

  const setTempDecimalPlacesForField = useCallback((fieldName: string, places: number | null) => {
    const normalizedField = normalizeColumnKey(fieldName)
    if (!normalizedField) {
      return
    }

    setTempDecimalPlacesByField((current) => {
      if (places === null) {
        if (!(normalizedField in current)) {
          return current
        }

        const next = { ...current }
        delete next[normalizedField]
        return next
      }

      if (current[normalizedField] === places) {
        return current
      }

      return {
        ...current,
        [normalizedField]: places,
      }
    })
  }, [])

  const clearTempDecimalPlaces = useCallback(() => {
    setTempDecimalPlacesByField({})
  }, [])

  useEffect(() => {
    syncGridSearchState(gridRef.current, searchText)
  }, [searchText])

  useEffect(() => {
    setExpandedRowKeys(
      defaultOutlineExpanded ? new Set(outlineTree.parentRowKeys) : new Set(),
    )
  }, [defaultOutlineExpanded, outlineTree.parentRowKeys, outlineTree.parentRowKeysKey])

  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsLoading, setColumnSettingsLoading] = useState(false)
  const [columnSettingsItems, setColumnSettingsItems] = useState<GridColumnSettingEditorItem[]>([])
  const columnSettingsTargetKey = useMemo(
    () => columnSettingState.targetIdentity || [(menuCode ?? reportCode).trim(), resolvedGridId].join("::"),
    [columnSettingState.targetIdentity, menuCode, reportCode, resolvedGridId],
  )
  const gridRemountKey = `${columnSettingsTargetKey}::grid`
  const columnSettingsPopupKey = `${columnSettingsTargetKey}::column-settings`
  const columnSettingsTargetKeyRef = useRef(columnSettingsTargetKey)

  useEffect(() => {
    columnSettingsTargetKeyRef.current = columnSettingsTargetKey
    setColumnSettingsVisible(false)
    setColumnSettingsLoading(false)
    setColumnSettingsItems([])
  }, [columnSettingsTargetKey])

  const renderOutlineCell = useCallback(
    (cellData: ReportDataGridCellRenderData) => {
      const valueText = formatCellValue(cellData.value, cellData.text)

      return (
        <div className="flex min-w-0 items-center gap-1">
          <span className="h-5 w-5 flex-shrink-0" />
          <span className={`min-w-0 truncate ${isOutlineEmphasisRow(cellData.data) ? "font-semibold" : ""}`}>
            {valueText}
          </span>
        </div>
      )
    },
    [],
  )

  const resolveSummaryAlignment = (align?: string | null): 'left' | 'center' | 'right' => {
    const value = (align ?? '').toLowerCase().trim()

    if (value === 'right') return 'right'
    if (value === 'center') return 'center'

    return 'left'
  }

  const resolveColumnAlignClass = (align?: string | null) => {
    const value = (align ?? '').toLowerCase().trim()

    if (value === 'right') return 'report-cell-align-right'
    if (value === 'center') return 'report-cell-align-center'

    return 'report-cell-align-left'
  }

  const isZeroValue = (value: unknown) => {
    if (value === null || value === undefined || value === '') return false

    if (typeof value === 'number') {
      return value === 0
    }

    const numericValue = Number(String(value).replace(/,/g, '').trim())

    return Number.isFinite(numericValue) && numericValue === 0
  }

  const customizeZeroAsBlankText = (cellInfo: ReportCustomizeTextCellInfo): string => {
    if (isZeroValue(cellInfo.value)) return ''

    return cellInfo.valueText ?? ''
  }

  const renderGroupCell = useCallback(
    (cellData: GroupCellTemplateData) => {
      if (!groupConfig) {
        return cellData.text ?? String(cellData.value ?? "")
      }

      const groupValue = cellData.value ?? ""
      const groupItems = resolveGroupRowItems(cellData.data)
      const sampleRow =
        groupItems[0] ??
        filteredRows.find((row) => readRowField(row, groupConfig.groupField) === String(groupValue)) ??
        filteredRows.find((row) => readRowField(row, groupConfig.groupField) != null)

      let labelValue = readRowField(sampleRow, groupConfig.labelField)
      if (!labelValue && groupValue !== null && groupValue !== undefined && String(groupValue).trim().length > 0) {
        labelValue = t(`EInvoiceKind_${groupValue}`, "")
      }

      const prefix = t(groupConfig.labelPrefixKey ?? "VAT_INOUT_TYPE", groupConfig.labelPrefixFallback ?? "Loại hóa đơn")
      const valueText = String(groupValue ?? "").trim()
      const labelText = labelValue?.trim() ?? ""

      return (
        <span className="font-semibold text-indigo-950">
          {prefix}: {valueText}
          {labelText ? ` - ${labelText}` : ""}
        </span>
      )
    },
    [filteredRows, groupConfig, t],
  )

  const columnsComponents = useMemo(() => {
    const indentField = normalizeColumnKey(outlineIndentField)
    let groupedFieldApplied = false

    const columnElements = columns.map((column) => {
      const columnIsOutlineIndentField = outlineMode && indentField.length > 0 && normalizeColumnKey(column.FIELD_NAME) === indentField
      const isGroupColumn =
        Boolean(groupConfig && groupDataField) &&
        normalizeColumnKey(column.FIELD_NAME) === normalizedGroupField

      if (isGroupColumn) {
        groupedFieldApplied = true
      }

      const ymdColumn = isYmdFieldName(column.FIELD_NAME) || resolveColumnDataType(column) === "date"
      const periodHeaderText = hasPeriodHeaderCaptions
        ? resolveFinancialStatementHeaderPeriod(reportCode, column.FIELD_NAME, fromDate, toDate)
        : null

      let cellRender = columnIsOutlineIndentField ? renderOutlineCell : undefined;
      const sysCodeType = resolveReportSysCodeType(column.FIELD_NAME, sysCodeMap);
      if (sysCodeType) {
        cellRender = (cellData) => {
          const raw = formatCellValue(cellData.value, cellData.text).trim();
          if (!raw) {
            return "";
          }

          if (!labelsReady) {
            return raw;
          }

          const codeName = getCodeName(sysCodeType, raw).trim();
          return codeName ? t(codeName, codeName) : raw;
        };
      }

      return (
        <Column
          key={column.COLUMN_KEY}
          dataField={column.FIELD_NAME}
          caption={translateReportColumnCaption(column, t)}
          dataType={resolveColumnDataType(column)}
          format={resolveColumnDisplayFormat(column, tempDecimalPlacesByField)}
          width={resolveColumnWidth(column)}
          allowSorting
          allowFiltering
          groupIndex={isGroupColumn ? 0 : undefined}
          groupCellRender={isGroupColumn ? renderGroupCell : undefined}
          cellRender={cellRender}
          headerCellRender={
            periodHeaderText
              ? (header) => {
                  const title = String(header.column?.caption ?? "").trim()
                  return (
                    <div className="bs-period-header">
                      <span className="bs-period-header__title">{title}</span>
                      <span className="bs-period-header__period">{periodHeaderText}</span>
                    </div>
                  )
                }
              : undefined
          }
          calculateCellValue={
            ymdColumn
              ? (row: ReportDataGridRow) => resolveYmdCellValue(row, column.FIELD_NAME)
              : undefined
          }
          alignment="left"
          cssClass={resolveColumnAlignClass(column.ALIGN)}
          customizeText={ymdColumn ? undefined : customizeZeroAsBlankText}
        />
      )
    })

    if (groupConfig && groupDataField && !groupedFieldApplied) {
      columnElements.unshift(
        <Column
          key={`__GROUP__${groupDataField}`}
          dataField={groupDataField}
          caption={t(groupConfig.labelPrefixKey ?? "VAT_INOUT_TYPE", groupConfig.labelPrefixFallback ?? "Loại hóa đơn")}
          visible={false}
          showInColumnChooser={false}
          allowGrouping={false}
          groupIndex={0}
          groupCellRender={renderGroupCell}
        />,
      )
    }

    return columnElements
  }, [
    columns,
    fromDate,
    getCodeName,
    groupConfig,
    groupDataField,
    hasPeriodHeaderCaptions,
    labelsReady,
    normalizedGroupField,
    outlineIndentField,
    outlineMode,
    renderGroupCell,
    renderOutlineCell,
    reportCode,
    sysCodeMap,
    t,
    tempDecimalPlacesByField,
    toDate,
  ])

  const companyLangRevision = useCompanyLangRevision()
  const renderedChildren = useMemo(
    () =>
      applyGridColumnSettingsToChildren(
        columnsComponents,
        Column,
        columnSettingState.cachedEditorItems,
        columnSettingState.translateCaption,
        { hideColumnsMissingFromSettings: true },
      ),
    [columnsComponents, columnSettingState.cachedEditorItems, columnSettingState.translateCaption, companyLangRevision],
  )

  const openColumnSettings = useCallback(async (): Promise<boolean> => {
    if (!columnSettingState.enabled || !gridRef.current) {
      return false
    }

    const targetKey = columnSettingsTargetKeyRef.current
    const shouldShowLoading = columnSettingState.cachedEditorItems.length === 0 && columnSettingsItems.length === 0
    setColumnSettingsItems([])
    setColumnSettingsVisible(true)
    if (shouldShowLoading) {
      setColumnSettingsLoading(true)
    }

    try {
      const items = await columnSettingState.loadEditorItems(gridRef.current)
      if (columnSettingsTargetKeyRef.current !== targetKey) {
        return false
      }
      setColumnSettingsItems(items)
      return true
    } finally {
      if (shouldShowLoading && columnSettingsTargetKeyRef.current === targetKey) {
        setColumnSettingsLoading(false)
      }
    }
  }, [columnSettingState, columnSettingsItems.length])

  useImperativeHandle(ref, () => ({ openColumnSettings }), [openColumnSettings])

  const handleColumnSettingsSave = useCallback(
    async (items: GridColumnSettingEditorItem[]) => {
      const targetKey = columnSettingsTargetKeyRef.current
      const savedItems = gridRef.current
        ? await columnSettingState.applyEditorItemsToComponent(gridRef.current, items)
        : await columnSettingState.saveEditorItems(items)
      if (columnSettingsTargetKeyRef.current !== targetKey) {
        return
      }
      setColumnSettingsItems(savedItems)
      setColumnSettingsVisible(false)
    },
    [columnSettingState],
  )

  const handleColumnSettingsReset = useCallback(async () => {
    const resetItems = await columnSettingState.resetEditorItems(gridRef.current)
    setColumnSettingsItems(resetItems)
  }, [columnSettingState])

  const handleColumnTemplateChange = useCallback(
    async (templateId: number) => {
      const items = await columnSettingState.changeTemplate(templateId, gridRef.current)
      setColumnSettingsItems(items)
    },
    [columnSettingState],
  )

  const handleColumnTemplateCreate = useCallback(
    async (payload: { templateName: string; isDefaultTemplate: boolean }) => {
      const items = await columnSettingState.createTemplate(payload, gridRef.current)
      setColumnSettingsItems(items)
    },
    [columnSettingState],
  )

  const handleColumnTemplateSetDefault = useCallback(
    async (templateId: number) => {
      await columnSettingState.setDefaultTemplate(templateId)
    },
    [columnSettingState],
  )

  const handleInitialized = useCallback((event: InitializedEvent<ReportDataGridRow, string>) => {
    gridRef.current = event.component
  }, [])

  const hScrollProxyRef = useRef<dxScrollView | null>(null)
  const hScrollPaneRef = useRef<HTMLDivElement | null>(null)
  const horizontalScrollSyncingRef = useRef(false)
  const [horizontalScrollContentWidth, setHorizontalScrollContentWidth] = useState(0)
  const [horizontalScrollNeeded, setHorizontalScrollNeeded] = useState(false)

  const resolveProxyScrollContainer = useCallback(() => {
    const element = hScrollProxyRef.current?.element()
    return element?.querySelector<HTMLElement>(".dx-scrollable-container") ?? null
  }, [])

  const resolveGridScrollable = useCallback(() => {
    const grid = gridRef.current as
      | (dxDataGrid & {
          getScrollable?: () => {
            scrollWidth?: () => number
            clientWidth?: () => number
            scrollOffset?: () => { left?: number; top?: number }
            scrollTo?: (position: { left?: number; top?: number }) => void
            on?: (eventName: string, handler: () => void) => void
            off?: (eventName: string, handler?: () => void) => void
          } | null
        })
      | null

    return grid?.getScrollable?.() ?? null
  }, [])

  const syncHorizontalScrollProxyFromGrid = useCallback(() => {
    const scrollable = resolveGridScrollable()
    if (!scrollable) {
      return
    }

    const scrollWidth = Number(scrollable.scrollWidth?.() ?? 0)
    const clientWidth = Number(scrollable.clientWidth?.() ?? 0)
    const gridMaxLeft = Math.max(0, scrollWidth - clientWidth)
    const needsHorizontalScroll = gridMaxLeft > 2
    setHorizontalScrollNeeded((current) => (current === needsHorizontalScroll ? current : needsHorizontalScroll))

    const proxyScrollContainer = resolveProxyScrollContainer()
    const proxyClientWidth = Number(proxyScrollContainer?.clientWidth ?? 0)
    if (!needsHorizontalScroll || !proxyScrollContainer || proxyClientWidth <= 0) {
      return
    }

    // Proxy sits in a narrower footer pane than the grid viewport. Size its
    // content so proxy.maxLeft === grid.maxLeft and scrollLeft stays 1:1.
    const contentWidth = Math.max(Math.round(proxyClientWidth + gridMaxLeft), 1)
    setHorizontalScrollContentWidth((current) => (current === contentWidth ? current : contentWidth))

    if (horizontalScrollSyncingRef.current) {
      return
    }

    const left = Number(scrollable.scrollOffset?.()?.left ?? 0)
    if (Math.abs(proxyScrollContainer.scrollLeft - left) > 1) {
      horizontalScrollSyncingRef.current = true
      proxyScrollContainer.scrollLeft = left
      window.requestAnimationFrame(() => {
        horizontalScrollSyncingRef.current = false
      })
    }
  }, [resolveGridScrollable, resolveProxyScrollContainer])

  const handleHorizontalScrollProxyScroll = useCallback(() => {
    const proxyScrollContainer = resolveProxyScrollContainer()
    const scrollable = resolveGridScrollable()
    if (!proxyScrollContainer || !scrollable || horizontalScrollSyncingRef.current) {
      return
    }

    horizontalScrollSyncingRef.current = true
    const gridScrollWidth = Number(scrollable.scrollWidth?.() ?? 0)
    const gridClientWidth = Number(scrollable.clientWidth?.() ?? 0)
    const gridMaxLeft = Math.max(0, gridScrollWidth - gridClientWidth)
    const nextLeft = Math.min(Math.max(0, proxyScrollContainer.scrollLeft), gridMaxLeft)
    scrollable.scrollTo?.({ left: nextLeft })
    window.requestAnimationFrame(() => {
      horizontalScrollSyncingRef.current = false
    })
  }, [resolveGridScrollable, resolveProxyScrollContainer])

  const handleHorizontalScrollProxyInitialized = useCallback((event: { component: dxScrollView }) => {
    hScrollProxyRef.current = event.component
    void event.component.update().then(syncHorizontalScrollProxyFromGrid)
  }, [syncHorizontalScrollProxyFromGrid])

  const handleHorizontalScrollProxyDisposing = useCallback(() => {
    hScrollProxyRef.current = null
  }, [])

  useLayoutEffect(() => {
    if (!horizontalScrollNeeded) {
      return
    }

    const proxy = hScrollProxyRef.current
    if (proxy) {
      void proxy.update().then(syncHorizontalScrollProxyFromGrid)
    }
  }, [horizontalScrollContentWidth, horizontalScrollNeeded, syncHorizontalScrollProxyFromGrid])

  useEffect(() => {
    if (loading) {
      setHorizontalScrollNeeded(false)
      return
    }

    const scrollable = resolveGridScrollable()
    syncHorizontalScrollProxyFromGrid()
    const handleScroll = () => {
      if (horizontalScrollSyncingRef.current) {
        return
      }

      syncHorizontalScrollProxyFromGrid()
    }

    scrollable?.on?.("scroll", handleScroll)

    const handleWindowResize = () => {
      syncHorizontalScrollProxyFromGrid()
    }
    window.addEventListener("resize", handleWindowResize)

    const host = gridHostRef.current
    const hscrollPane = hScrollPaneRef.current
    const resizeObserver =
      typeof ResizeObserver !== "undefined"
        ? new ResizeObserver(() => {
            syncHorizontalScrollProxyFromGrid()
          })
        : null
    if (resizeObserver) {
      if (host) {
        resizeObserver.observe(host)
      }
      if (hscrollPane) {
        resizeObserver.observe(hscrollPane)
      }
    }

    const timer = window.setInterval(() => {
      syncHorizontalScrollProxyFromGrid()
    }, 800)

    return () => {
      scrollable?.off?.("scroll", handleScroll)
      window.removeEventListener("resize", handleWindowResize)
      resizeObserver?.disconnect()
      window.clearInterval(timer)
    }
  }, [filteredRows, horizontalScrollNeeded, loading, resolveGridScrollable, syncHorizontalScrollProxyFromGrid, columnSettingState.cachedEditorItems])

  const applySelectedCellKeys = useCallback((nextKeys: string[], options?: { commitReactState?: boolean }) => {
    selectedCellKeysRef.current = nextKeys
    syncReportCellSelectionHighlights(gridHostRef.current, new Set(nextKeys))
    // Trì hoãn setState trong lúc pointerdown/move — re-render giữa 2 click phá native dblclick (virtual rows).
    if (options?.commitReactState !== false) {
      setSelectedCellKeys(nextKeys)
    }
  }, [])

  const fireReportRowDblClick = useCallback(
    (row: ReportDataGridRow | undefined) => {
      if (!row || typeof onRowDblClick !== "function") {
        return
      }

      const now = Date.now()
      if (now - lastRowDrillAtRef.current < ROW_DRILL_DEDUP_MS) {
        return
      }
      lastRowDrillAtRef.current = now
      onRowDblClick({ data: row } as RowDblClickEvent<ReportDataGridRow, string>)
    },
    [onRowDblClick],
  )

  const handleRowDblClickInternal = useCallback(
    (event: RowDblClickEvent<ReportDataGridRow, string>) => {
      fireReportRowDblClick(event.data)
    },
    [fireReportRowDblClick],
  )

  const finishCellSelectionPointer = useCallback(
    (options?: { detectDblClick?: boolean }) => {
      const drag = cellSelectionDragRef.current
      if (!drag.active) {
        return
      }

      if (drag.additive && !drag.moved && drag.anchorKey) {
        applySelectedCellKeys(toggleCellKey(drag.baseKeys, drag.anchorKey))
      } else {
        // Commit stats bar state once per gesture (không setState giữa 2 click).
        applySelectedCellKeys([...selectedCellKeysRef.current])
      }

      const shouldDetectDblClick = options?.detectDblClick === true && !drag.moved && !drag.additive && Boolean(drag.anchorKey)
      const anchorKey = drag.anchorKey

      cellSelectionDragRef.current = {
        active: false,
        anchorKey: null,
        baseKeys: [],
        additive: false,
        moved: false,
      }

      if (!shouldDetectDblClick || !anchorKey) {
        return
      }

      const parsed = parseReportCellKey(anchorKey)
      if (!parsed?.rowKey) {
        return
      }

      const now = Date.now()
      const previous = rowDblClickGuardRef.current
      if (previous && previous.rowKey === parsed.rowKey && now - previous.at <= ROW_DBLCLICK_MS) {
        rowDblClickGuardRef.current = null
        fireReportRowDblClick(rowsByKey.get(parsed.rowKey))
        return
      }

      rowDblClickGuardRef.current = { rowKey: parsed.rowKey, at: now }
    },
    [applySelectedCellKeys, fireReportRowDblClick, rowsByKey],
  )

  const clearCellSelection = useCallback(() => {
    cellSelectionDragRef.current = {
      active: false,
      anchorKey: null,
      baseKeys: [],
      additive: false,
      moved: false,
    }
    selectionAnchorKeyRef.current = null
    rowDblClickGuardRef.current = null
    applySelectedCellKeys([])
  }, [applySelectedCellKeys])

  useEffect(() => {
    clearCellSelection()
  }, [clearCellSelection, filteredRows])

  useEffect(() => {
    clearTempDecimalPlaces()
  }, [clearTempDecimalPlaces, reportCode])

  useEffect(() => {
    syncReportCellSelectionHighlights(gridHostRef.current, new Set(selectedCellKeysRef.current))
  }, [filteredRows, loading, tempDecimalPlacesByField])

  useEffect(() => {
    const handleWindowPointerUp = () => {
      finishCellSelectionPointer({ detectDblClick: true })
    }

    window.addEventListener("pointerup", handleWindowPointerUp)
    return () => window.removeEventListener("pointerup", handleWindowPointerUp)
  }, [finishCellSelectionPointer])

  const handleGridPointerDown = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      if (event.button !== 0) {
        return
      }

      // Let DevExtreme handle the native expand/collapse arrow on group rows.
      // Resetting the React cell selection during pointerdown can re-render the
      // grid before DevExtreme receives the click, swallowing the toggle.
      if (event.target instanceof Element && event.target.closest(".dx-group-row")) {
        return
      }

      if (
        event.target instanceof Element &&
        event.target.closest(
          ".dx-context-menu, .dx-scrollable-scrollbar, .report-grid-hscroll, .report-grid-hscroll-pane",
        )
      ) {
        return
      }

      hideOpenReportContextMenus()

      const cellKey = resolveReportCellKeyFromTarget(event.target)
      if (!cellKey) {
        clearCellSelection()
        return
      }

      // Không preventDefault ở pointerdown — sẽ nuốt click/dblclick (mất drill mở phiếu).
      // Chặn DX kéo-cuộn khi đang drag chọn ô: xem handleGridPointerMove.

      const additive = event.ctrlKey || event.metaKey
      const extend = event.shiftKey
      const currentKeys = selectedCellKeysRef.current
      const extendAnchor = selectionAnchorKeyRef.current ?? currentKeys[0] ?? cellKey

      if (extend) {
        const rangeKeys = buildCellRangeKeys(extendAnchor, cellKey, filteredRows, visibleFieldNames)
        const nextKeys = additive ? mergeUniqueCellKeys(currentKeys, rangeKeys) : rangeKeys
        cellSelectionDragRef.current = {
          active: true,
          anchorKey: extendAnchor,
          baseKeys: additive ? [...currentKeys] : [],
          additive,
          moved: false,
        }
        applySelectedCellKeys(nextKeys, { commitReactState: false })
        return
      }

      if (additive) {
        cellSelectionDragRef.current = {
          active: true,
          anchorKey: cellKey,
          baseKeys: [...currentKeys],
          additive: true,
          moved: false,
        }
        selectionAnchorKeyRef.current = cellKey
        applySelectedCellKeys(mergeUniqueCellKeys(currentKeys, [cellKey]), { commitReactState: false })
        return
      }

      cellSelectionDragRef.current = {
        active: true,
        anchorKey: cellKey,
        baseKeys: [],
        additive: false,
        moved: false,
      }
      selectionAnchorKeyRef.current = cellKey
      applySelectedCellKeys([cellKey], { commitReactState: false })
    },
    [applySelectedCellKeys, clearCellSelection, filteredRows, visibleFieldNames],
  )

  const handleGridPointerMove = useCallback(
    (event: ReactPointerEvent<HTMLDivElement>) => {
      const drag = cellSelectionDragRef.current
      if (!drag.active || !drag.anchorKey) {
        return
      }

      // Tránh browser/DX bắt đầu gesture cuộn trong lúc kéo chọn ô.
      event.preventDefault()

      const cellKey = resolveReportCellKeyFromTarget(event.target)
      if (!cellKey) {
        return
      }

      drag.moved = true
      const rangeKeys = buildCellRangeKeys(drag.anchorKey, cellKey, filteredRows, visibleFieldNames)
      const nextKeys = drag.additive ? mergeUniqueCellKeys(drag.baseKeys, rangeKeys) : rangeKeys
      applySelectedCellKeys(nextKeys, { commitReactState: false })
    },
    [applySelectedCellKeys, filteredRows, visibleFieldNames],
  )

  const handleGridPointerUp = useCallback(() => {
    finishCellSelectionPointer({ detectDblClick: true })
  }, [finishCellSelectionPointer])

  const copySelectedCells = useCallback(async () => {
    const text = buildSelectedCellsClipboardText(
      selectedCellKeysRef.current,
      rowsByKey,
      filteredRows,
      visibleFieldNames,
    )
    if (!text) {
      return false
    }

    return copyTextToClipboard(text)
  }, [filteredRows, rowsByKey, visibleFieldNames])

  const copySelectionSum = useCallback(async () => {
    const stats = computeReportCellSelectionStats(
      rowsByKey,
      new Set(selectedCellKeysRef.current),
      numberFieldNames,
    )
    if (stats.numericCount <= 0) {
      return false
    }

    return copyTextToClipboard(String(stats.sum))
  }, [numberFieldNames, rowsByKey])

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (!(event.ctrlKey || event.metaKey) || event.key.toLowerCase() !== "c") {
        return
      }

      if (selectedCellKeysRef.current.length === 0) {
        return
      }

      const target = event.target
      if (
        target instanceof HTMLElement &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable)
      ) {
        return
      }

      event.preventDefault()
      void copySelectedCells()
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [copySelectedCells])

  const handleContextMenuPreparing = useCallback(
    (event: ContextMenuPreparingEvent<ReportDataGridRow, string>) => {
      if (event.row?.rowType && event.row.rowType !== "data" && event.target !== "header") {
        return
      }

      const items = Array.isArray(event.items) ? [...event.items] : []
      const columnFieldName =
        typeof event.column?.dataField === "string" ? event.column.dataField.trim() : ""
      const normalizedColumnField = normalizeColumnKey(columnFieldName)
      const canSetTempDecimal =
        normalizedColumnField.length > 0 &&
        normalizedColumnField !== REPORT_GRID_FILLER_FIELD &&
        numberFieldNames.has(normalizedColumnField)

      if (canSetTempDecimal) {
        const matchedColumn = columns.find(
          (column) => normalizeColumnKey(column.FIELD_NAME) === normalizedColumnField,
        )
        const columnCaption = matchedColumn
          ? translateReportColumnCaption(matchedColumn, t)
          : columnFieldName

        items.push({
          text: `${t("REPORT_TEMP_DECIMAL", "Số chữ số thập phân tạm thời")}: ${columnCaption}`,
          beginGroup: items.length > 0,
          items: [
            {
              text: t("REPORT_TEMP_DECIMAL_DEFAULT", "Mặc định theo báo cáo"),
              onItemClick: () => setTempDecimalPlacesForField(normalizedColumnField, null),
            },
            ...TEMP_DECIMAL_PLACE_OPTIONS.map((places) => ({
              text:
                places === 0
                  ? t("REPORT_TEMP_DECIMAL_0", "0 chữ số (số nguyên)")
                  : t(`REPORT_TEMP_DECIMAL_${places}`, `${places} chữ số thập phân`),
              onItemClick: () => setTempDecimalPlacesForField(normalizedColumnField, places),
            })),
          ],
        })
      }

      if (selectedCellKeysRef.current.length > 0) {
        items.push({
          text: t("REPORT_COPY_CELLS", "Sao chép ô đã chọn"),
          beginGroup: true,
          onItemClick: () => {
            void copySelectedCells()
          },
        })
        items.push({
          text: t("REPORT_COPY_SUM", "Sao chép tổng cộng"),
          onItemClick: () => {
            void copySelectionSum()
          },
        })
        items.push({
          text: t("REPORT_CLEAR_CELL_SELECTION", "Bỏ chọn ô"),
          onItemClick: () => clearCellSelection(),
        })
      }

      event.items = items
    },
    [
      clearCellSelection,
      columns,
      copySelectedCells,
      copySelectionSum,
      numberFieldNames,
      setTempDecimalPlacesForField,
      t,
    ],
  )

  const handleRowPrepared = useCallback(
    (event: RowPreparedEvent<ReportDataGridRow, string>) => {
      if (event.rowType === "group" && event.rowElement && groupConfig) {
        const visualStyle = resolveDevExtremeGroupRowVisualStyle()
        applyRowVisualStyle(event.rowElement, visualStyle, "GROUP", true)
      }

      if (event.rowType === "data" && event.rowElement) {
        const rowType = outlineMode ? resolveOutlineRowType(event.data) : ""
        const visualStyle = resolveOutlineRowVisualStyle(rowType)
        applyRowVisualStyle(event.rowElement, visualStyle, rowType, outlineMode)
        if (isRowFontBold(event.data)) {
          event.rowElement.style.setProperty("font-weight", "700", "important")
        }
      }

      if (event.rowType === "totalFooter" && event.rowElement && shouldRenderPinnedBottomSummary) {
        const rowType = pinnedBottomRow ? resolveOutlineRowType(pinnedBottomRow) || "TOTAL" : "TOTAL"
        const visualStyle = resolveOutlineRowVisualStyle(rowType)
        applyRowVisualStyle(event.rowElement, visualStyle, rowType, true)
        if (isRowFontBold(pinnedBottomRow ?? undefined)) {
          event.rowElement.style.setProperty("font-weight", "700", "important")
        }
      }

      onRowPrepared?.(event)
    },
    [groupConfig, onRowPrepared, outlineMode, pinnedBottomRow, shouldRenderPinnedBottomSummary],
  )

  const calculatePinnedBottomSummary = useCallback(
    (options: { name?: string; summaryProcess?: string; totalValue?: unknown }) => {
      if (!shouldRenderPinnedBottomSummary || !pinnedBottomRow || options.summaryProcess !== "finalize") {
        return
      }

      const fieldName = resolvePinnedBottomSummaryFieldName(options.name)
      if (!fieldName) {
        return
      }

      options.totalValue = pinnedBottomRow[fieldName] ?? ""
    },
    [pinnedBottomRow, shouldRenderPinnedBottomSummary],
  )

  const handleCellPrepared = useCallback(
    (event: CellPreparedEvent<ReportDataGridRow, string>) => {
      applyHeaderFieldNameTooltip(event)

      if (!event.cellElement) {
        return
      }

      const dataFieldRaw = typeof event.column?.dataField === "string" ? event.column.dataField : ""
      const isFillerColumn = dataFieldRaw === REPORT_GRID_FILLER_FIELD

      // Cột bù khoảng trống: luôn nền trắng, không nhận màu outline/header/footer.
      if (isFillerColumn) {
        event.cellElement.style.setProperty("background-color", "#ffffff", "important")
        event.cellElement.style.setProperty("background-image", "none", "important")
        event.cellElement.style.removeProperty("border-top")
        event.cellElement.style.removeProperty("color")
        event.cellElement.style.removeProperty("font-weight")
        event.cellElement.style.removeProperty("text-transform")
        event.cellElement.style.removeProperty("box-shadow")
        event.cellElement.style.removeProperty("padding-left")
        event.cellElement.removeAttribute(REPORT_CELL_KEY_ATTR)
        event.cellElement.classList.remove("report-cell-selected")
        return
      }

      if (event.rowType === "group" && event.cellElement && groupConfig) {
        const visualStyle = resolveDevExtremeGroupRowVisualStyle()
        applyCellVisualStyle(event.cellElement, visualStyle, true)
        event.cellElement.style.setProperty("vertical-align", "middle", "important")
        return
      }

      if (event.rowType === "totalFooter" && shouldRenderPinnedBottomSummary) {
        const rowType = pinnedBottomRow ? resolveOutlineRowType(pinnedBottomRow) || "TOTAL" : "TOTAL"
        const visualStyle = resolveOutlineRowVisualStyle(rowType)
        applyCellVisualStyle(event.cellElement, visualStyle, true)
        if (isRowFontBold(pinnedBottomRow ?? undefined)) {
          event.cellElement.style.setProperty("font-weight", "700", "important")
        }

        return
      }

      if (event.rowType !== "data" || !event.data) {
        return
      }

      const rowType = outlineMode ? resolveOutlineRowType(event.data) : ""
      const visualStyle = resolveOutlineRowVisualStyle(rowType)

      applyCellVisualStyle(event.cellElement, visualStyle, outlineMode)
      if (isRowFontBold(event.data)) {
        event.cellElement.style.setProperty("font-weight", "700", "important")
      }

      if (dataFieldRaw && event.data.ROW_KEY) {
        const cellKey = makeReportCellKey(String(event.data.ROW_KEY), dataFieldRaw)
        event.cellElement.setAttribute(REPORT_CELL_KEY_ATTR, cellKey)
        event.cellElement.classList.toggle(
          "report-cell-selected",
          selectedCellKeysRef.current.includes(cellKey),
        )
      } else {
        event.cellElement.removeAttribute(REPORT_CELL_KEY_ATTR)
        event.cellElement.classList.remove("report-cell-selected")
      }

      const dataField = normalizeColumnKey(event.column?.dataField)
      const indentField = normalizeColumnKey(outlineIndentField)
      if (!outlineMode || !indentField || dataField !== indentField) {
        event.cellElement.style.removeProperty("padding-left")
        return
      }

      const outlineLevel = resolveOutlineRowLevel(event.data)
      const indent = outlineLevel * 18
      event.cellElement.style.position = "relative"
      event.cellElement.style.boxSizing = "border-box"
      event.cellElement.style.setProperty("padding-left", `${indent}px`, "important")

      if (visualStyle.accentColor) {
        event.cellElement.style.setProperty("box-shadow", `inset 4px 0 0 ${visualStyle.accentColor}`, "important")
      } else {
        event.cellElement.style.removeProperty("box-shadow")
      }
    },
    [
      groupConfig,
      outlineIndentField,
      outlineMode,
      pinnedBottomRow,
      shouldRenderPinnedBottomSummary,
    ],
  )

  const [loadingProgress, setLoadingProgress] = useState(0)

  useEffect(() => {
    if (!loading) {
      setLoadingProgress(0)
      return
    }

    setLoadingProgress(18)
    const timer = window.setInterval(() => {
    setLoadingProgress((currentValue) => {
      if (currentValue >= 92) return currentValue

      const nextValue = currentValue + 0.8
      return Math.min(92, nextValue)
    })
  }, 40)

    return () => window.clearInterval(timer)
  }, [loading])

  const hasReportFooterContent = Boolean(balanceSheetFooterTotals) || selectionStats.numericCount > 0
  const showReportFooter = hasReportFooterContent || horizontalScrollNeeded

  return (
    <>
      <div className="flex h-full min-h-0 w-full min-w-0 flex-col overflow-hidden">
        {loading ? (
          <div className="px-1 pb-2">
            <ProgressBar
              min={0}
              max={100}
              value={loadingProgress}
              showStatus={false}
            />
          </div>
        ) : null}

        {!loading ? (
          <div className="flex min-h-0 w-full min-w-0 flex-1 flex-col overflow-hidden">
            <div
              ref={gridHostRef}
              className={
                hasPeriodHeaderCaptions
                  ? "report-data-grid-host report-data-grid-host--period-headers min-h-0 w-full min-w-0 flex-1 overflow-hidden"
                  : "report-data-grid-host min-h-0 w-full min-w-0 flex-1 overflow-hidden"
              }
              onPointerDown={handleGridPointerDown}
              onPointerMove={handleGridPointerMove}
              onPointerUp={handleGridPointerUp}
              onPointerLeave={handleGridPointerUp}
            >
              <DataGrid
                key={gridRemountKey}
                className="report-data-grid"
                dataSource={filteredRows}
                keyExpr="ROW_KEY"
                width="100%"
                height="100%"
                showBorders
                showRowLines
                showColumnLines
                rowAlternationEnabled
                repaintChangesOnly={false}
                hoverStateEnabled
                focusedRowEnabled
                allowColumnResizing
                allowColumnReordering
                columnResizingMode="widget"
                columnAutoWidth={false}
                wordWrapEnabled={false}
                cellHintEnabled
                noDataText={t("NO_DATA", "No data")}
                loadPanel={{ enabled: false }}
                onInitialized={handleInitialized}
                onContentReady={() => {
                  syncHorizontalScrollProxyFromGrid()
                }}
                onRowPrepared={handleRowPrepared}
                onRowDblClick={handleRowDblClickInternal}
                onCellPrepared={handleCellPrepared}
                onContextMenuPreparing={handleContextMenuPreparing}
              >
                <Scrolling
                  mode="virtual"
                  rowRenderingMode="virtual"
                  useNative={false}
                  showScrollbar="always"
                  scrollByThumb
                  scrollByContent={false}
                />
                {groupConfig && groupDataField ? <Grouping autoExpandAll allowCollapsing /> : null}
                <ColumnFixing enabled />
                {columnSettingState.enabled ? (
                  <StateStoring
                    enabled
                    type="custom"
                    customLoad={columnSettingState.customLoad}
                    customSave={columnSettingState.customSave}
                    savingTimeout={500}
                  />
                ) : null}
                <FilterRow visible={searchVisible} />
                <HeaderFilter visible />
                <FilterPanel visible={showFilterPanel} />

                {renderedChildren}

                {shouldRenderPinnedBottomSummary ? (
                  <Summary calculateCustomSummary={calculatePinnedBottomSummary}>
                    {pinnedBottomColumns.map((column) => (
                      <TotalItem
                        key={resolvePinnedBottomSummaryName(column.fieldName)}
                        name={resolvePinnedBottomSummaryName(column.fieldName)}
                        column={column.fieldName}
                        showInColumn={column.fieldName}
                        summaryType="custom"
                        valueFormat={column.format ?? undefined}
                        customizeText={() => formatPinnedBottomCellValue(pinnedBottomRow?.[column.fieldName], column)}
                        cssClass={`report-total-footer-cell`}
                        alignment={resolveSummaryAlignment(column.alignment)}
                      />
                    ))}
                  </Summary>
                ) : null}

                <Column
                  key={REPORT_GRID_FILLER_FIELD}
                  dataField={REPORT_GRID_FILLER_FIELD}
                  caption=""
                  allowSorting={false}
                  allowFiltering={false}
                  allowHeaderFiltering={false}
                  allowReordering={false}
                  allowResizing={false}
                  fixed={false}
                  cssClass="report-grid-filler-column"
                  visibleIndex={99999999999999999}
                />
              </DataGrid>
            </div>

            {showReportFooter ? (
              <div
                className={
                  horizontalScrollNeeded
                    ? "report-grid-footer"
                    : "report-grid-footer report-grid-footer--summary-only"
                }
              >
                <div className="report-grid-summary">
                  <div className="report-grid-summary-main">
                  {balanceSheetFooterTotals ? (
                    <div className="bs-footer-kpis">
                      {(
                        [
                          {
                            key: "current",
                            titleKey: "lbl_ThisPeriod",
                            titleFallback: "KỲ NÀY",
                            totals: balanceSheetFooterTotals.current,
                          },
                          {
                            key: "previous",
                            titleKey: "lbl_PreviousPeriod",
                            titleFallback: "KỲ TRƯỚC",
                            totals: balanceSheetFooterTotals.previous,
                          },
                        ] as const
                      ).map((period) => (
                        <div key={period.key} className="bs-footer-period">
                          <span className="bs-footer-period__title">
                            {t(period.titleKey, period.titleFallback)}
                          </span>
                          <div className="bs-footer-period__kpis">
                            <div className="bs-footer-kpi bs-footer-kpi--assets">
                              <span className="bs-footer-kpi__icon" aria-hidden="true">
                                <Landmark size={18} strokeWidth={2} />
                              </span>
                              <span className="bs-footer-kpi__body">
                                <span className="bs-footer-kpi__label">
                                  {t("lbl_Assets", "TỔNG CỘNG TÀI SẢN")}
                                </span>
                                <strong className="bs-footer-kpi__value">
                                  {formatNumber(period.totals.totalAssets, balanceSheetAmountFormat)}
                                </strong>
                              </span>
                            </div>
                            <div className="bs-footer-kpi bs-footer-kpi--capital">
                              <span className="bs-footer-kpi__icon" aria-hidden="true">
                                <Coins size={18} strokeWidth={2} />
                              </span>
                              <span className="bs-footer-kpi__body">
                                <span className="bs-footer-kpi__label">
                                  {t("lbl_Debt", "TỔNG CỘNG NGUỒN VỐN")}
                                </span>
                                <strong className="bs-footer-kpi__value">
                                  {formatNumber(period.totals.totalCapital, balanceSheetAmountFormat)}
                                </strong>
                              </span>
                            </div>
                            <div className="bs-footer-kpi bs-footer-kpi--difference">
                              <span className="bs-footer-kpi__icon" aria-hidden="true">
                                <Scale size={18} strokeWidth={2} />
                              </span>
                              <span className="bs-footer-kpi__body">
                                <span className="bs-footer-kpi__label">
                                  {t("lbl_Difference", "CHÊNH LỆCH")}
                                </span>
                                <strong className="bs-footer-kpi__value">
                                  {formatNumber(period.totals.difference, balanceSheetAmountFormat)}
                                </strong>
                              </span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : null}
                  {selectionStats.numericCount > 0 ? (
                    <div className="report-grid-summary-metrics">
                      <span className="report-grid-metric report-grid-metric--emphasis">
                        <span className="report-grid-metric__label">
                          {t("REPORT_CELL_SUM", "Tổng cộng")}
                        </span>
                        <strong className="report-grid-metric__value">
                          {formatNumber(selectionStats.sum, selectionFormat)}
                        </strong>
                      </span>
                      <span className="report-grid-metric">
                        <span className="report-grid-metric__label">
                          {t("REPORT_CELL_AVG", "Trung bình")}
                        </span>
                        <strong className="report-grid-metric__value">
                          {selectionStats.avg == null
                            ? "—"
                            : formatNumber(selectionStats.avg, selectionFormat)}
                        </strong>
                      </span>
                    </div>
                  ) : null}
                </div>
              </div>

                {horizontalScrollNeeded ? (
                  <div ref={hScrollPaneRef} className="report-grid-hscroll-pane">
                    <ScrollView
                      className="report-grid-hscroll"
                      direction="horizontal"
                      useNative={false}
                      showScrollbar="always"
                      scrollByThumb
                      scrollByContent={false}
                      bounceEnabled={false}
                      width="100%"
                      height={18}
                      onInitialized={handleHorizontalScrollProxyInitialized}
                      onDisposing={handleHorizontalScrollProxyDisposing}
                      onScroll={handleHorizontalScrollProxyScroll}
                    >
                      <div
                        className="report-grid-hscroll-content"
                        style={{ width: Math.max(horizontalScrollContentWidth, 1) }}
                      />
                    </ScrollView>
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}
      </div>

      <GridColumnSettingsPopup
        key={columnSettingsPopupKey}
        visible={columnSettingsVisible}
        title={t("SYS_GRID_COLUMN_SETTING", "Thiết lập cột hiển thị")}
        items={columnSettingsItems}
        loading={columnSettingsLoading}
        onClose={() => setColumnSettingsVisible(false)}
        onReset={handleColumnSettingsReset}
        onSave={handleColumnSettingsSave}
        templates={columnSettingState.templateOptions}
        selectedTemplateId={columnSettingState.currentTemplateId}
        templateLoading={columnSettingState.templateLoading}
        onTemplateChange={handleColumnTemplateChange}
        onCreateTemplate={handleColumnTemplateCreate}
        onSetDefaultTemplate={handleColumnTemplateSetDefault}
      />
    </>
  )
}

export default forwardRef(ReportDataGrid)
