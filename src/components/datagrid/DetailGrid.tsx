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
  /** Temporary per-voucher visibility (e.g., FC_TYPE); never persisted into column settings. */
  contextualColumnVisibility?: { enabled: boolean; columnNames: readonly string[] }
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

  // Foreign-currency voucher type overrides column visibility temporarily.
  // This never becomes a user's persisted sys_grid_column layout.
  const effectiveRuntimeColumnVisibility = useMemo<RuntimeColumnVisibilityOptions | undefined>(() => {
    if (!contextualColumnVisibility) return runtimeColumnVisibility
    const controlledColumnVisibility = {
      ...runtimeColumnVisibility?.controlledColumnVisibility,
    }
    for (const columnName of contextualColumnVisibility.columnNames) {
      controlledColumnVisibility[columnName] = contextualColumnVisibility.enabled
    }
    return {
      ...runtimeColumnVisibility,
      controlledColumnVisibility,
      // Contextual FX visibility must not mark a column as permanently
      // locked/hidden; the catalog owns allowHiding and column chooser state.
      preserveColumnSettings: true,
    }
  }, [contextualColumnVisibility, runtimeColumnVisibility])

  // Contextual hide is temporary. Persist the catalog visibility instead of
  // accidentally saving hidden currency columns into a user grid template.
  const saveColumnState = useCallback((state: Parameters<typeof columnSettingState.customSave>[0]) => {
    if (!contextualColumnVisibility || !Array.isArray(state.columns)) {
      return columnSettingState.customSave(state)
    }
    const conditionalFields = new Set(contextualColumnVisibility.columnNames.map((name) => name.toUpperCase()))
    const configuredColumns = new Map(
      columnSettingState.cachedEditorItems.map((item) => [item.columnName.toUpperCase(), item] as const),
    )
    type StateColumn = NonNullable<typeof state.columns>[number]
    const restoreColumns = (columns: StateColumn[]): StateColumn[] => columns.flatMap((column) => {
      const name = String(column.dataField ?? column.name ?? "").toUpperCase()
      const config = conditionalFields.has(name) ? configuredColumns.get(name) : undefined
      // A field absent from sys_grid_column may show temporarily for FC_TYPE,
      // but must never be inserted into a persisted user template.
      if (conditionalFields.has(name) && !config) return []
      return [{
        ...column,
        ...(config
          ? { visible: config.isVisible, allowHiding: config.allowHiding, showInColumnChooser: config.allowHiding }
          : {}),
        ...(Array.isArray(column.columns) ? { columns: restoreColumns(column.columns) } : {}),
      }]
    })
    return columnSettingState.customSave({ ...state, columns: restoreColumns(state.columns) })
  }, [columnSettingState.cachedEditorItems, columnSettingState.customSave, contextualColumnVisibility])

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const isEmpty = dataSource.length === 0
  const emptyStateText = noDataText ?? t("NO_DETAIL_DATA", "Không có dữ liệu chi tiết")
  const isSearchControlled = typeof controlledSearchVisible === "boolean"
  const effectiveSearchVisible = controlledSearchVisible ?? searchVisible
  const shouldRenderSearchToolbar = effectiveSearchVisible || showSearchButton
  const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number")
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
        columnSettingState.cachedEditorItems,
        columnSettingState.translateCaption,
        { hideColumnsMissingFromSettings: usesSysGridCatalog },
      )

      return effectiveRuntimeColumnVisibility
        ? applyRuntimeColumnVisibilityToChildren(settingsChildren, Column, effectiveRuntimeColumnVisibility)
        : settingsChildren
    },
    [children, columnSettingState.cachedEditorItems, columnSettingState.translateCaption, companyLangRevision, effectiveRuntimeColumnVisibility, usesSysGridCatalog],
  )

  const handleInitialized = useCallback(
    (event: InitializedEvent<TData, string | number>) => {
      gridRef.current = event.component ?? null
      columnSettingState.bindGridComponent(event.component ?? null)
      if (columnSettingState.cachedEditorItems.length) {
        columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
      }
      onInitialized?.(event)
    },
    [columnSettingState.bindGridComponent, columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent, onInitialized],
  )

  useEffect(() => {
    if (!columnSettingState.enabled || !gridRef.current || !columnSettingState.cachedEditorItems.length) {
      return
    }

    columnSettingState.syncEditorItemsToComponent(gridRef.current, columnSettingState.cachedEditorItems)
    applyRuntimeColumnVisibilityToComponent(gridRef.current, effectiveRuntimeColumnVisibility)
  }, [
    effectiveRuntimeColumnVisibility,
    columnSettingState.cachedEditorItems,
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

      columnSettingState.syncEditorItemsToComponent(gridRef.current, items)
      applyRuntimeColumnVisibilityToComponent(gridRef.current, effectiveRuntimeColumnVisibility)
    })

    return () => {
      cancelled = true
    }
  }, [
    columnSettingState.enabled,
    columnSettingState.loadEditorItems,
    columnSettingState.syncEditorItemsToComponent,
    effectiveRuntimeColumnVisibility,
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
        const preservesColumnSettings = effectiveRuntimeColumnVisibility?.preserveColumnSettings === true
        const needsVisibilityUpdate = effectiveRuntimeColumnVisibility?.forceVisibleColumnNames?.some(
          (name) => event.component.columnOption(name, "visible") !== true
            || (!preservesColumnSettings && event.component.columnOption(name, "allowHiding") !== false),
        ) || Object.entries(effectiveRuntimeColumnVisibility?.controlledColumnVisibility ?? {}).some(
          ([name, visible]) => event.component.columnOption(name, "visible") !== visible
            || (!preservesColumnSettings && event.component.columnOption(name, "allowHiding") !== false),
        )
        if (needsVisibilityUpdate) {
          applyRuntimeColumnVisibilityToComponent(event.component, effectiveRuntimeColumnVisibility)
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
