import {
  forwardRef,
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
  type ForwardedRef,
} from "react"
import TreeList, {
  Column,
  ColumnFixing,
  FilterPanel,
  FilterRow,
  HeaderFilter,
  Scrolling,
  StateStoring,
} from "devextreme-react/tree-list"
import type dxTreeList from "devextreme/ui/tree_list"
import type {
  ContentReadyEvent,
  InitializedEvent,
  RowDblClickEvent as TreeRowDblClickEvent,
  RowPreparedEvent,
} from "devextreme/ui/tree_list"
// Report pages drill down with the shared handler typed against the DataGrid
// event, so keep the same shape and forward the TreeList event untouched.
import type { RowDblClickEvent } from "devextreme/ui/data_grid"

import type { ConfiguredReportPreview, ReportPreviewColumn } from "@/api/configuredReportPreviewApi"
import GridColumnSettingsPopup from "@/components/datagrid/GridColumnSettingsPopup"
import { applyGridColumnSettingsToChildren } from "@/components/datagrid/gridColumnSettingRender"
import { hasSearchText, syncGridSearchState } from "@/components/datagrid/gridSearch"
import {
  useGridColumnSettingState,
  type GridColumnSettingEditorItem,
} from "@/components/datagrid/useGridColumnSettingState"
import { LanguageContext } from "@/lib/i18nLoader"
import { useCompanyLangRevision } from "@/lib/companyLang"
import { isReportSystemField } from "@/lib/reportSystemFields"
import {
  resolveColumnDisplayFormat,
  toLocalizedReportDataGridRows,
  type ReportDataGridRow,
} from "./ReportDataGrid"

/**
 * DevExtreme TreeList view for configured reports whose procedure ships outline
 * metadata (`ROW_KEY` / `PARENT_ROW_KEY` / `ROW_TYPE` / `ROW_LEVEL`).
 * Flat reports keep using `ReportDataGrid`.
 */
export type ReportTreeRow = ReportDataGridRow & {
  ID: string
  PARENT_ID: string | null
  ROW_TYPE: string
  ROW_LEVEL: number
}

export type ReportTreeListHandle = {
  openColumnSettings: () => Promise<boolean>
}

export type ReportTreeListProps = {
  preview: ConfiguredReportPreview | null
  loading: boolean
  searchText: string
  reportCode: string
  menuCode?: string
  onRowDblClick?: (event: RowDblClickEvent<ReportDataGridRow, string>) => void
}

/**
 * Report procedures expose the outline metadata either with the report/grid
 * system prefix (`__ROW_KEY`, `__PARENT_ROW_KEY`, ...) or with the bare column
 * name, depending on the deployed procedure version. Read both so the tree keeps
 * working with either shape instead of silently falling back to a flat list.
 */
const TECHNICAL_FIELD_ALIASES = {
  ROW_KEY: ["__ROW_KEY", "ROW_KEY"],
  PARENT_ROW_KEY: ["__PARENT_ROW_KEY", "PARENT_ROW_KEY"],
  ROW_TYPE: ["__ROW_TYPE", "ROW_TYPE"],
  ROW_LEVEL: ["__ROW_LEVEL", "ROW_LEVEL"],
  ROW_SORT: ["__ROW_SORT", "ROW_SORT"],
} as const

/** Metadata columns that must never reach the grid as business columns. */
const HIDDEN_TECHNICAL_FIELDS = new Set<string>([
  ...Object.values(TECHNICAL_FIELD_ALIASES).flat(),
  "COMPANY_CD",
])

const ROW_TYPE_TOTAL_ROWS = new Set(["TOTAL", "TOTAL_FOOTER"])
const ROW_TYPE_GROUP_ROWS = new Set(["GROUP", "SECTION"])

function readTechnicalField(row: ReportDataGridRow, aliases: readonly string[]): string | null {
  const entries = Object.entries(row)

  for (const alias of aliases) {
    const match = entries.find(([key]) => key.toUpperCase() === alias)
    if (!match || match[1] === null || match[1] === undefined) {
      continue
    }

    const value = String(match[1]).trim()
    if (value) {
      return value
    }
  }

  return null
}

function resolveRowLevel(row: ReportDataGridRow): number {
  const levelValue = Number(readTechnicalField(row, TECHNICAL_FIELD_ALIASES.ROW_LEVEL) ?? 0)
  return Number.isFinite(levelValue) ? Math.max(0, Math.floor(levelValue)) : 0
}

function resolveRowType(row: ReportDataGridRow): string {
  return readTechnicalField(row, TECHNICAL_FIELD_ALIASES.ROW_TYPE)?.toUpperCase() ?? ""
}

function isTechnicalDisplayField(fieldName: string): boolean {
  return isReportSystemField(fieldName) || HIDDEN_TECHNICAL_FIELDS.has(fieldName.trim().toUpperCase())
}

/**
 * Builds the flat key/parent-key pairs TreeList needs. Row order is the display
 * order produced by the report, so when a procedure omits the parent key the
 * hierarchy is derived from the row level plus the nearest shallower row.
 */
function resolveTreeRows(rows: ReportDataGridRow[]): ReportTreeRow[] {
  const sourceKeys = rows.map((row, index) => {
    return readTechnicalField(row, TECHNICAL_FIELD_ALIASES.ROW_KEY) ?? row.ROW_KEY ?? String(index + 1)
  })

  // TreeList needs unique keys. Duplicated report keys keep the first row's id
  // as the parent target and get a suffixed id, instead of throwing and
  // blanking the whole report.
  const firstIdBySourceKey = new Map<string, string>()
  const usedIds = new Set<string>()
  const idByIndex = sourceKeys.map((sourceKey, index) => {
    const knownId = firstIdBySourceKey.get(sourceKey)
    if (knownId !== undefined) {
      let candidate = `${sourceKey}#${index}`
      let suffix = index
      while (usedIds.has(candidate)) {
        suffix += 1
        candidate = `${sourceKey}#${suffix}`
      }
      usedIds.add(candidate)
      return candidate
    }

    usedIds.add(sourceKey)
    firstIdBySourceKey.set(sourceKey, sourceKey)
    return sourceKey
  })

  const previousRowKeyByLevel = new Map<number, string>()

  return rows.map((row, index) => {
    const id = idByIndex[index]
    const rowType = resolveRowType(row)
    const level = resolveRowLevel(row)
    const explicitParentKey = readTechnicalField(row, TECHNICAL_FIELD_ALIASES.PARENT_ROW_KEY)
    const isFooter = rowType === "TOTAL_FOOTER"

    for (const knownLevel of Array.from(previousRowKeyByLevel.keys())) {
      if (knownLevel >= level) {
        previousRowKeyByLevel.delete(knownLevel)
      }
    }

    const parentFromPreviousLevel = level > 0 ? previousRowKeyByLevel.get(level - 1) ?? null : null
    if (!isFooter) {
      previousRowKeyByLevel.set(level, id)
    }

    const parentSourceKey = explicitParentKey ?? parentFromPreviousLevel
    const parentId = isFooter ? null : parentSourceKey ? firstIdBySourceKey.get(parentSourceKey) ?? null : null

    return { ...row, ID: id, PARENT_ID: parentId, ROW_TYPE: rowType, ROW_LEVEL: level }
  })
}

function ReportTreeList(
  { preview, loading, searchText, reportCode, menuCode, onRowDblClick }: ReportTreeListProps,
  ref: ForwardedRef<ReportTreeListHandle>,
) {
  const { translate } = useContext(LanguageContext)
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])
  const companyLangRevision = useCompanyLangRevision()
  const treeListRef = useRef<dxTreeList<ReportTreeRow, string> | null>(null)

  const columns = useMemo(
    () => (preview?.COLUMNS ?? []).filter((column) => !isTechnicalDisplayField(column.FIELD_NAME)),
    [preview?.COLUMNS],
  )
  const treeRows = useMemo(
    () => resolveTreeRows(toLocalizedReportDataGridRows(preview, t, reportCode)),
    [preview, reportCode, t],
  )

  const hasHierarchyMetadata = useMemo(
    () =>
      treeRows.some((row) => readTechnicalField(row, TECHNICAL_FIELD_ALIASES.PARENT_ROW_KEY) !== null) ||
      treeRows.some((row) => readTechnicalField(row, TECHNICAL_FIELD_ALIASES.ROW_LEVEL) !== null),
    [treeRows],
  )
  const rowsHaveChildren = useMemo(() => treeRows.some((row) => row.PARENT_ID !== null), [treeRows])
  const parentIds = useMemo(() => {
    const idsWithChildren = new Set(
      treeRows.flatMap((row) => (row.PARENT_ID ? [row.PARENT_ID] : [])),
    )
    return treeRows.filter((row) => idsWithChildren.has(row.ID)).map((row) => row.ID)
  }, [treeRows])
  // Mặc định mở rộng toàn bộ cây; nút "Thu gọn tất cả" để người dùng thu lại.
  const defaultExpandedIds = parentIds

  const searchVisible = hasSearchText(searchText)
  const rowsSignature = useMemo(() => treeRows.map((row) => row.ID).join("|"), [treeRows])
  const expandedSignatureRef = useRef("")

  const applyDefaultExpansion = useCallback(() => {
    const instance = treeListRef.current
    if (!instance || expandedSignatureRef.current === rowsSignature) {
      return
    }

    expandedSignatureRef.current = rowsSignature
    defaultExpandedIds.forEach((key) => instance.expandRow(key))
  }, [defaultExpandedIds, rowsSignature])

  const handleInitialized = useCallback(
    (event: InitializedEvent<ReportTreeRow, string>) => {
      treeListRef.current = event.component ?? null
    },
    [],
  )
  const handleContentReady = useCallback(
    (event: ContentReadyEvent<ReportTreeRow, string>) => {
      treeListRef.current = event.component ?? treeListRef.current
      applyDefaultExpansion()
      syncGridSearchState(treeListRef.current, searchText)
    },
    [applyDefaultExpansion, searchText],
  )

  useEffect(() => {
    expandedSignatureRef.current = ""
    applyDefaultExpansion()
  }, [applyDefaultExpansion, rowsSignature])

  useEffect(() => {
    syncGridSearchState(treeListRef.current, searchText)
  }, [searchText])

  const handleExpandAll = useCallback(() => {
    parentIds.forEach((key) => treeListRef.current?.expandRow(key))
  }, [parentIds])
  const handleCollapseAll = useCallback(() => {
    parentIds.forEach((key) => treeListRef.current?.collapseRow(key))
  }, [parentIds])
  const handleRowDblClick = useCallback(
    (event: TreeRowDblClickEvent<ReportTreeRow, string>) => {
      const rowType = resolveRowType((event.data ?? {}) as ReportDataGridRow)
      if (ROW_TYPE_GROUP_ROWS.has(rowType) || ROW_TYPE_TOTAL_ROWS.has(rowType)) {
        return
      }

      onRowDblClick?.(event as unknown as RowDblClickEvent<ReportDataGridRow, string>)
    },
    [onRowDblClick],
  )
  const handleRowPrepared = useCallback(
    (event: RowPreparedEvent<ReportTreeRow, string>) => {
      if (event.rowType !== "data" || !event.data) {
        return
      }

      event.rowElement?.setAttribute("data-report-row-type", event.data.ROW_TYPE)
      if (ROW_TYPE_TOTAL_ROWS.has(event.data.ROW_TYPE)) {
        event.rowElement?.classList.add("font-semibold", "bg-slate-100")
      }
    },
    [],
  )

  const resolvedGridId = reportCode.trim()
  const columnSettingState = useGridColumnSettingState({
    enabled: true,
    menuCode,
    gridId: resolvedGridId,
    hideColumnsMissingFromSettings: true,
  })
  const [columnSettingsVisible, setColumnSettingsVisible] = useState(false)
  const [columnSettingsLoading, setColumnSettingsLoading] = useState(false)
  const [columnSettingsItems, setColumnSettingsItems] = useState<GridColumnSettingEditorItem[]>([])
  const columnSettingsTargetKey = columnSettingState.targetIdentity ?? `${menuCode ?? ""}::${resolvedGridId}`
  const columnSettingsTargetKeyRef = useRef(columnSettingsTargetKey)
  const columnLayoutSignature = useMemo(
    () =>
      columnSettingState.cachedEditorItems
        .map((item) =>
          [item.columnName.toUpperCase(), item.visibleIndex ?? "", item.width ?? "", item.fixedPosition].join(":"),
        )
        .join("|"),
    [columnSettingState.cachedEditorItems],
  )

  useEffect(() => {
    columnSettingsTargetKeyRef.current = columnSettingsTargetKey
    setColumnSettingsVisible(false)
    setColumnSettingsLoading(false)
    setColumnSettingsItems([])
  }, [columnSettingsTargetKey])

  const columnChildren = useMemo(
    () => [
      ...columns.map((column: ReportPreviewColumn) => (
        <Column
          key={column.COLUMN_KEY}
          dataField={column.FIELD_NAME}
          caption={column.CAPTION}
          dataType={column.DATA_TYPE === "date" ? "date" : column.DATA_TYPE === "number" ? "number" : undefined}
          // Preview FORMAT is a format-type token (number2, date, ...) — passing
          // it straight through makes DevExtreme print the token as the cell text.
          format={resolveColumnDisplayFormat(column)}
          alignment={column.ALIGN}
          width={column.WIDTH || undefined}
          allowResizing
        />
      )),
      <Column key="__tree_id" dataField="ID" visible={false} allowHiding={false} showInColumnChooser={false} />,
      <Column
        key="__tree_parent_id"
        dataField="PARENT_ID"
        visible={false}
        allowHiding={false}
        showInColumnChooser={false}
      />,
      <Column
        key="__tree_row_type"
        dataField="ROW_TYPE"
        visible={false}
        allowHiding={false}
        showInColumnChooser={false}
      />,
      <Column
        key="__tree_row_level"
        dataField="ROW_LEVEL"
        visible={false}
        allowHiding={false}
        showInColumnChooser={false}
      />,
    ],
    [columns],
  )
  const renderedColumnChildren = useMemo(
    () =>
      applyGridColumnSettingsToChildren(
        columnChildren,
        Column,
        columnSettingState.cachedEditorItems,
        columnSettingState.translateCaption,
        { hideColumnsMissingFromSettings: true },
      ),
    // columnLayoutSignature/companyLangRevision intentionally bust the memo when
    // the cached settings array is replaced in place.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [columnChildren, columnLayoutSignature, companyLangRevision],
  )

  useEffect(() => {
    const component = treeListRef.current
    if (!component || !columnSettingState.cachedEditorItems.length) {
      return
    }

    columnSettingState.syncEditorItemsToComponent(component, columnSettingState.cachedEditorItems)
  }, [columnSettingState, columnSettingState.cachedEditorItems])

  const openColumnSettings = useCallback(async (): Promise<boolean> => {
    const component = treeListRef.current
    if (!columnSettingState.enabled || !component) {
      return false
    }

    const targetKey = columnSettingsTargetKeyRef.current
    const shouldShowLoading =
      columnSettingState.cachedEditorItems.length === 0 && columnSettingsItems.length === 0
    setColumnSettingsItems([])
    setColumnSettingsVisible(true)
    if (shouldShowLoading) {
      setColumnSettingsLoading(true)
    }

    try {
      const items = await columnSettingState.loadEditorItems(component)
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
      const component = treeListRef.current
      const savedItems = component
        ? await columnSettingState.applyEditorItemsToComponent(component, items)
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
    setColumnSettingsItems(await columnSettingState.resetEditorItems(treeListRef.current))
  }, [columnSettingState])
  const handleColumnTemplateChange = useCallback(
    async (templateId: number) => {
      setColumnSettingsItems(await columnSettingState.changeTemplate(templateId, treeListRef.current))
    },
    [columnSettingState],
  )
  const handleColumnTemplateCreate = useCallback(
    async (payload: { templateName: string; isDefaultTemplate: boolean }) => {
      setColumnSettingsItems(await columnSettingState.createTemplate(payload, treeListRef.current))
    },
    [columnSettingState],
  )
  const handleColumnTemplateSetDefault = useCallback(
    async (templateId: number) => {
      await columnSettingState.setDefaultTemplate(templateId)
    },
    [columnSettingState],
  )

  if (loading) {
    return <div className="flex h-full items-center justify-center text-sm text-slate-500">{t("LOADING", "Đang tải...")}</div>
  }

  return (
    <>
      <div className="flex h-full min-h-0 min-w-0 flex-col overflow-hidden">
        <div className="flex shrink-0 justify-end gap-2 border-b border-slate-200 px-3 py-2">
          <button type="button" className="rounded border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={handleExpandAll}>
            {t("EXPAND_ALL", "Mở rộng tất cả")}
          </button>
          <button type="button" className="rounded border-slate-300 px-2 py-1 text-xs hover:bg-slate-50" onClick={handleCollapseAll}>
            {t("COLLAPSE_ALL", "Thu gọn tất cả")}
          </button>
        </div>
        {treeRows.length > 0 && (!hasHierarchyMetadata || !rowsHaveChildren) ? (
          <div className="shrink-0 border-b border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800">
            {!hasHierarchyMetadata
              ? t("REPORT_TREE_HIERARCHY_MISSING", "Dữ liệu báo cáo chưa có thông tin phân cấp cha-con; đang hiển thị các dòng ở cấp gốc.")
              : t("REPORT_TREE_NO_PARENT_LINKS", "Procedure có cột cha-con nhưng không tạo được quan hệ cha-con cho dữ liệu này.")}
          </div>
        ) : null}
        <TreeList
          className="min-h-0 flex-1"
          dataSource={treeRows}
          keyExpr="ID"
          parentIdExpr="PARENT_ID"
          filterMode="fullBranch"
          expandNodesOnFiltering
          onInitialized={handleInitialized}
          onContentReady={handleContentReady}
          onRowDblClick={handleRowDblClick}
          onRowPrepared={handleRowPrepared}
          width="100%"
          height="100%"
          showBorders
          showRowLines
          showColumnLines
          columnAutoWidth={false}
          allowColumnResizing
          allowColumnReordering
          columnResizingMode="widget"
          wordWrapEnabled={false}
          autoExpandAll={false}
          repaintChangesOnly
        >
          <Scrolling mode="virtual" rowRenderingMode="virtual" useNative={false} showScrollbar="always" />
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
          <FilterPanel visible={searchVisible} />
          {renderedColumnChildren}
        </TreeList>
      </div>
      <GridColumnSettingsPopup
        key={`${columnSettingsTargetKey}::column-settings`}
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

export default forwardRef(ReportTreeList)
