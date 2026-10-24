import React, { useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { Button } from "devextreme-react"
import DataGrid, {
  Column,
  ColumnFixing,
  FilterRow,
  HeaderFilter,
  FilterPanel,
  Scrolling,
  StateStoring,
  Toolbar,
  Item,
} from "devextreme-react/data-grid"
import TextBox from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent } from "devextreme/ui/data_grid"

import { LanguageContext } from "@/lib/i18nLoader"
import { applyHeaderFieldNameTooltip } from "@/lib/gridHeaderFieldTooltip"
import {
  applyGridColumnSettingsToChildren,
  applyRuntimeColumnVisibilityToChildren,
  applyRuntimeColumnVisibilityToComponent,
  applyRuntimeColumnFormatAliasesToComponent,
  type RuntimeColumnVisibilityOptions,
} from "./gridColumnSettingRender"
import { useCompanyLangRevision } from "@/lib/companyLang"
import { GridEmptyAddButton } from "./GridEmptyAddButton"
import { useInlineGridSearch } from "./gridSearch"
import { useGridColumnSettingState, type GridColumnSettingState } from "./useGridColumnSettingState"
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting"

type ContextualColumnVisibility = { enabled: boolean; columnNames: readonly string[] }

/**
 * Use ONE effective catalog both for JSX columns and DevExtreme hydration.
 * The original catalog (including LABEL_TEXT and user layouts) is untouched.
 */
function applyContextualVisibility(
  items: GridColumnSettingEditorItem[],
  rule?: ContextualColumnVisibility,
): GridColumnSettingEditorItem[] {
  if (!rule) return items
  const targets = new Set(rule.columnNames.map((name) => name.toUpperCase()))
  return items.map((item) => targets.has(item.columnName.toUpperCase())
    ? { ...item, isVisible: rule.enabled }
    : item)
}

interface DetailGridProps<TData> {
  dataSource: TData[]
  keyExpr: string
  children: ReactNode
  height?: number | string
  noDataText?: string
  menuCode?: string
  screenCd?: string
  gridId?: string
  persistColumnSettings?: boolean
  onInitialized?: (event: InitializedEvent<TData, string | number>) => void
  searchVisible?: boolean
  showSearchButton?: boolean
  columnSettingStateRef?: React.MutableRefObject<GridColumnSettingState | null>
  columnSettingExcludedColumnNames?: readonly string[]
  runtimeColumnVisibility?: RuntimeColumnVisibilityOptions
  runtimeColumnFormatAliases?: Readonly<Record<string, string>>
  /** Temporary visibility of the IO list foreign-currency columns. */
  contextualColumnVisibility?: ContextualColumnVisibility
}

export function DetailGrid<TData>({
  dataSource,
  keyExpr,
  children,
  height,
  noDataText,
  menuCode,
  screenCd,
  gridId,
  persistColumnSettings = false,
  onInitialized,
  searchVisible: controlledSearchVisible,
  showSearchButton = true,
  columnSettingStateRef,
  columnSettingExcludedColumnNames = [],
  runtimeColumnVisibility,
  runtimeColumnFormatAliases,
  contextualColumnVisibility,
}: DetailGridProps<TData>) {
  const gridRef = useRef<dxDataGrid<TData, string | number> | null>(null)
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const {
    searchText,
    searchVisible,
    setSearchVisible,
    showSearch,
    handleSearchTextChange,
    handleSearchEnter,
    clearSearch,
  } =
    useInlineGridSearch(gridRef)
  const usesSysGridCatalog = persistColumnSettings && Boolean(gridId?.trim())
  const columnSettingState = useGridColumnSettingState({
    enabled: persistColumnSettings,
    menuCode,
    screenCd,
    gridId,
    excludedColumnNames: columnSettingExcludedColumnNames,
    hideColumnsMissingFromSettings: usesSysGridCatalog,
  })

  if (columnSettingStateRef) {
    columnSettingStateRef.current = columnSettingState
  }

  const effectiveEditorItems = useMemo(
    () => applyContextualVisibility(columnSettingState.cachedEditorItems, contextualColumnVisibility),
    [columnSettingState.cachedEditorItems, contextualColumnVisibility],
  )
  const effectiveVisibilityRef = useRef(contextualColumnVisibility)
  effectiveVisibilityRef.current = contextualColumnVisibility

  // Never persist a temporary FX hide/show into the user's column template.
  const saveColumnState = useCallback((state: Parameters<typeof columnSettingState.customSave>[0]) => {
    if (!contextualColumnVisibility || !Array.isArray(state.columns)) {
      return columnSettingState.customSave(state)
    }
    const conditionalFields = new Set(contextualColumnVisibility.columnNames.map((field) => field.toUpperCase()))
    const defaults = new Map(
      columnSettingState.cachedEditorItems.map((item) => [item.columnName.toUpperCase(), item] as const),
    )
    type StateColumn = NonNullable<typeof state.columns>[number]
    const restore = (columns: StateColumn[]): StateColumn[] => columns.flatMap((col) => {
      const name = String(col.dataField ?? col.name ?? "").toUpperCase()
      const original = conditionalFields.has(name) ? defaults.get(name) : undefined
      if (conditionalFields.has(name) && !original) return []
      return [{
        ...col,
        ...(original ? { visible: original.isVisible, allowHiding: original.allowHiding } : {}),
        ...(Array.isArray(col.columns) ? { columns: restore(col.columns) } : {}),
      }]
    })
    return columnSettingState.customSave({ ...state, columns: restore(state.columns) })
  }, [columnSettingState.cachedEditorItems, columnSettingState.customSave, contextualColumnVisibility])

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const isEmpty = dataSource.length === 0
  const emptyStateText = noDataText ?? t("NO_DETAIL_DATA", "Không có dữ liệu chi tiết")
  const isSearchControlled = typeof controlledSearchVisible === "boolean"
  const effectiveSearchVisible = controlledSearchVisible ?? searchVisible
  const shouldRenderSearchToolbar = effectiveSearchVisible || showSearchButton
  const hasConfiguredColumnWidths = effectiveEditorItems.some((item) => typeof item.width === "number")
  const columnSettingsTargetKey = useMemo(
    () => columnSettingState.targetIdentity || [(menuCode ?? screenCd)?.trim() ?? "", gridId?.trim() ?? ""].join("::"),
    [columnSettingState.targetIdentity, gridId, menuCode, screenCd],
  )
  const companyLangRevision = useCompanyLangRevision()
  const renderedChildren = useMemo(
    () => {
      const settingsChildren = applyGridColumnSettingsToChildren(
        children,
        Column,
        effectiveEditorItems,
        columnSettingState.translateCaption,
        { hideColumnsMissingFromSettings: usesSysGridCatalog },
      )

      return runtimeColumnVisibility
        ? applyRuntimeColumnVisibilityToChildren(settingsChildren, Column, runtimeColumnVisibility)
        : settingsChildren
    },
    [children, effectiveEditorItems, columnSettingState.translateCaption, companyLangRevision, runtimeColumnVisibility, usesSysGridCatalog],
  )

  const handleInitialized = useCallback(
    (event: InitializedEvent<TData, string | number>) => {
      gridRef.current = event.component ?? null
      columnSettingState.bindGridComponent(event.component ?? null)
      if (effectiveEditorItems.length) {
        columnSettingState.syncEditorItemsToComponent(event.component, effectiveEditorItems)
      }
      onInitialized?.(event)
    },
    [columnSettingState.bindGridComponent, effectiveEditorItems, columnSettingState.syncEditorItemsToComponent, onInitialized],
  )

  useEffect(() => {
    if (!columnSettingState.enabled || !gridRef.current || !effectiveEditorItems.length) {
      return
    }

    columnSettingState.syncEditorItemsToComponent(gridRef.current, effectiveEditorItems)
  }, [
    effectiveEditorItems,
    columnSettingState.enabled,
    columnSettingState.syncEditorItemsToComponent,
  ])

  useEffect(() => {
    if (!columnSettingState.enabled || !gridRef.current) {
      return
    }

    let cancelled = false

    void columnSettingState.loadEditorItems(gridRef.current).then((items) => {
      if (cancelled || !gridRef.current || items.length === 0) {
        return
      }

      columnSettingState.syncEditorItemsToComponent(
        gridRef.current,
        applyContextualVisibility(items, effectiveVisibilityRef.current),
      )
    })

    return () => {
      cancelled = true
    }
  }, [
    columnSettingState.enabled,
    columnSettingState.loadEditorItems,
    columnSettingState.syncEditorItemsToComponent,
  ])

  useEffect(() => {
    if (!isSearchControlled) {
      return
    }

    if (controlledSearchVisible) {
      setSearchVisible(true)
      return
    }

    clearSearch()
  }, [clearSearch, controlledSearchVisible, isSearchControlled, setSearchVisible])

  return (
    <div className="data-grid-container relative h-full w-full">
    <DataGrid<TData, string | number>
      key={columnSettingsTargetKey}
      loadPanel={{ enabled: false }}
      dataSource={dataSource}
      keyExpr={keyExpr}
      width="100%"
      height={height ?? "100%"}
      showBorders={true}
      columnAutoWidth={!hasConfiguredColumnWidths}
      allowColumnResizing={true}
      columnResizingMode="widget"
      allowColumnReordering={true}
      rowAlternationEnabled={true}
      hoverStateEnabled={true}
      wordWrapEnabled={false}
      noDataText={isEmpty ? " " : emptyStateText}
      paging={{ enabled: false }}
      onInitialized={handleInitialized}
      onContentReady={(event) => {
        const needsVisibilityUpdate = runtimeColumnVisibility?.forceVisibleColumnNames?.some(
          (name) => event.component.columnOption(name, "visible") !== true
            || event.component.columnOption(name, "allowHiding") !== false,
        ) || Object.entries(runtimeColumnVisibility?.controlledColumnVisibility ?? {}).some(
          ([name, visible]) => event.component.columnOption(name, "visible") !== visible
            || event.component.columnOption(name, "allowHiding") !== false,
        )
        if (needsVisibilityUpdate) {
          applyRuntimeColumnVisibilityToComponent(event.component, runtimeColumnVisibility)
        }
        applyRuntimeColumnFormatAliasesToComponent(event.component, runtimeColumnFormatAliases)
      }}
      onCellPrepared={(event) => {
        applyHeaderFieldNameTooltip(event)
      }}
    >
      <HeaderFilter visible={true} />
      <FilterRow showOperationChooser={true} />
      <FilterPanel />
      <ColumnFixing enabled={true} />
      {columnSettingState.enabled ? (
        <StateStoring
          enabled={true}
          type="custom"
          customLoad={columnSettingState.customLoad}
          customSave={saveColumnState}
          savingTimeout={500}
        />
      ) : null}
      {shouldRenderSearchToolbar ? (
        <Toolbar>
          <Item location="after" locateInMenu="never">
            <div className="flex items-center gap-2">
              {effectiveSearchVisible ? (
                <TextBox
                  width={260}
                  mode="search"
                  stylingMode="outlined"
                  value={searchText}
                  showClearButton={true}
                  placeholder={t("Search detail...", "Search detail...")}
                  onValueChanged={(event) => handleSearchTextChange(String(event.value ?? ""))}
                  onEnterKey={handleSearchEnter}
                />
              ) : null}
              {showSearchButton ? (
                <Button
                  stylingMode="text"
                  icon="search"
                  hint={t("Search detail", "Search detail")}
                  onClick={showSearch}
                />
              ) : null}
            </div>
          </Item>
        </Toolbar>
      ) : null}
      <Scrolling mode="standard" useNative={false} showScrollbar="always" />
      {renderedChildren}
    </DataGrid>
    {isEmpty ? (
      <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
        <div className="pointer-events-auto">
          <GridEmptyAddButton title={emptyStateText} />
        </div>
      </div>
    ) : null}
    </div>
  )
}

export default DetailGrid
