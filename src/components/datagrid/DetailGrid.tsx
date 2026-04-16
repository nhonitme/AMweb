import { useCallback, useContext, useEffect, useMemo, useRef, type ReactNode } from "react"
import { Button } from "devextreme-react"
import DataGrid, {
  Column,
  ColumnFixing,
  FilterRow,
  HeaderFilter,
  Pager,
  Paging,
  FilterPanel,
  StateStoring,
  Toolbar,
  Item,
} from "devextreme-react/data-grid"
import TextBox from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent } from "devextreme/ui/data_grid"

import { LanguageContext } from "@/lib/i18nLoader"
import { applyGridColumnSettingsToChildren } from "./gridColumnSettingRender"
import { useInlineGridSearch } from "./gridSearch"
import { useGridColumnSettingState } from "./useGridColumnSettingState"

interface DetailGridProps<TData> {
  dataSource: TData[]
  keyExpr: string
  children: ReactNode
  height?: number | string
  noDataText?: string
  screenCd?: string
  gridId?: string
  persistColumnSettings?: boolean
  onInitialized?: (event: InitializedEvent<TData, string | number>) => void
  searchVisible?: boolean
  showSearchButton?: boolean
}

export function DetailGrid<TData>({
  dataSource,
  keyExpr,
  children,
  height,
  noDataText,
  screenCd,
  gridId,
  persistColumnSettings = false,
  onInitialized,
  searchVisible: controlledSearchVisible,
  showSearchButton = true,
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
  const columnSettingState = useGridColumnSettingState({
    enabled: persistColumnSettings,
    screenCd,
    gridId,
  })

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const isSearchControlled = typeof controlledSearchVisible === "boolean"
  const effectiveSearchVisible = controlledSearchVisible ?? searchVisible
  const shouldRenderSearchToolbar = effectiveSearchVisible || showSearchButton
  const hasConfiguredColumnWidths = columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number")
  const renderedChildren = useMemo(
    () => applyGridColumnSettingsToChildren(children, Column, columnSettingState.cachedEditorItems),
    [children, columnSettingState.cachedEditorItems],
  )

  const handleInitialized = useCallback(
    (event: InitializedEvent<TData, string | number>) => {
      gridRef.current = event.component ?? null
      if (columnSettingState.cachedEditorItems.length) {
        columnSettingState.syncEditorItemsToComponent(event.component, columnSettingState.cachedEditorItems)
      }
      onInitialized?.(event)
    },
    [columnSettingState.cachedEditorItems, columnSettingState.syncEditorItemsToComponent, onInitialized],
  )

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

  useEffect(() => {
    if (!columnSettingState.enabled || !gridRef.current || !columnSettingState.cachedEditorItems.length) {
      return
    }

    columnSettingState.syncEditorItemsToComponent(gridRef.current, columnSettingState.cachedEditorItems)
  }, [
    children,
    columnSettingState.cachedEditorItems,
    columnSettingState.enabled,
    columnSettingState.syncEditorItemsToComponent,
    dataSource,
  ])

  return (
    <div className="data-grid-container h-full w-full">
    <DataGrid<TData, string | number>
      loadPanel={{ enabled: false }}
      dataSource={dataSource}
      keyExpr={keyExpr}
      width="100%"
      height={height ?? "100%"}
      showBorders={true}
      columnAutoWidth={!hasConfiguredColumnWidths}
      allowColumnResizing={true}
      allowColumnReordering={true}
      rowAlternationEnabled={true}
      hoverStateEnabled={true}
      wordWrapEnabled={true}
      noDataText={noDataText ?? t("NO_DETAIL_DATA", "No detail data")}
      onInitialized={handleInitialized}
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
          customSave={columnSettingState.customSave}
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
      <Paging defaultPageSize={10} />
      <Pager
        visible={true}
        showPageSizeSelector={true}
        allowedPageSizes={[10, 20, 50]}
        showInfo={true}
        showNavigationButtons={true}
        infoText={t("PAGE_TEXT", "Page {0} / {1} ({2} rows)")}
      />
      {renderedChildren}
    </DataGrid></div> 
  )
}

export default DetailGrid
