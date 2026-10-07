import type React from "react"
import type { ReactNode } from "react"
import type {
  EditorPreparingEvent,
  FocusedRowChangedEvent,
  InitializedEvent,
  OptionChangedEvent,
  RowDblClickEvent,
  RowInsertedEvent,
  RowInsertingEvent,
  RowRemovedEvent,
  RowRemovingEvent,
  RowPreparedEvent,
  RowUpdatedEvent,
  RowUpdatingEvent,
  SavingEvent,
  SelectionChangedEvent,
} from "devextreme/ui/data_grid"
import type { DataGridTypes } from "devextreme-react/data-grid"

import { BaseDataGrid } from "./BaseDataGrid"
import type { RuntimeColumnVisibilityOptions } from "./gridColumnSettingRender"
import type { GridColumnSettingState } from "./useGridColumnSettingState"

interface PageGridProps<TData> {
  dataSource: DataGridTypes.Properties["dataSource"]
  keyExpr: string
  copyExcludeFields?: string[]
  children: ReactNode
  menuCode?: string
  screenCd?: string
  gridId?: string
  persistColumnSettings?: boolean
  onInitialized?: (event: InitializedEvent<TData, string | number>) => void
  onRowDblClick?: (event: RowDblClickEvent<TData, string | number>) => void
  onSelectionChanged?: (event: SelectionChangedEvent<TData, string | number>) => void
  onFocusedRowChanged?: (event: FocusedRowChangedEvent<TData, string | number>) => void
  onRowPrepared?: (event: RowPreparedEvent<TData>) => void
  onRowInserting?: (event: RowInsertingEvent<TData, string | number>) => void
  onRowUpdating?: (event: RowUpdatingEvent<TData, string | number>) => void
  onRowRemoving?: (event: RowRemovingEvent<TData, string | number>) => void
  onRowInserted?: (event: RowInsertedEvent<TData, string | number>) => void
  onRowUpdated?: (event: RowUpdatedEvent<TData, string | number>) => void
  onRowRemoved?: (event: RowRemovedEvent<TData, string | number>) => void
  onSaving?: (event: SavingEvent<TData, string | number>) => void
  onEditorPreparing?: (event: EditorPreparingEvent<TData, string | number>) => void
  defaultSelectedRowKeys?: Array<string | number>
  onContextMenuUpdate?: (rowData: TData) => void
  onContextMenuCopy?: (rowData: TData) => void
  selectMode?: "single" | "multiple"
  selectAllMode?: "allPages" | "page"
  focusRowEnabled?: boolean
  autoNavigateToFocusedRow?: boolean
  selectByClick?: boolean
  pagingEnabled?: boolean
  showPager?: boolean
  pageSize?: number
  defaultPageSize?: number
  showPageSizeSelector?: boolean
  allowedPageSizes?: number[]
  remoteOperations?: boolean | Record<string, boolean>
  loadPanelEnabled?: boolean
  wordWrapEnabled?: boolean
  onOptionChanged?: (e: OptionChangedEvent) => void
  columnSettingStateRef?: React.MutableRefObject<GridColumnSettingState | null>
  runtimeColumnVisibility?: RuntimeColumnVisibilityOptions
  actionButtons?: boolean
  actionButtonsPosition?: 'start' | 'end'
  onAdd?: () => void
}

export function PageGrid<TData>({
  dataSource,
  keyExpr,
  copyExcludeFields,
  children,
  menuCode,
  screenCd,
  gridId,
  persistColumnSettings,
  onInitialized,
  onRowDblClick,
  onRowPrepared,
  onRowInserting,
  onRowUpdating,
  onRowRemoving,
  onRowInserted,
  onRowUpdated,
  onRowRemoved,
  onSaving,
  onEditorPreparing,
  defaultSelectedRowKeys,
  onSelectionChanged,
  onFocusedRowChanged,
  onContextMenuCopy,
  selectMode,
  selectAllMode,
  focusRowEnabled,
  autoNavigateToFocusedRow,
  selectByClick,
  actionButtons,
  actionButtonsPosition,
  onContextMenuUpdate,
  pagingEnabled,
  showPager,
  pageSize,
  defaultPageSize,
  showPageSizeSelector,
  allowedPageSizes,
  remoteOperations,
  loadPanelEnabled,
  wordWrapEnabled,
  onOptionChanged,
  columnSettingStateRef,
  runtimeColumnVisibility,
  onAdd,
}: PageGridProps<TData>) {
  return (
    <BaseDataGrid<TData>
      dataSource={dataSource}
      keyExpr={keyExpr}
      copyExcludeFields={copyExcludeFields}
      menuCode={menuCode}
      screenCd={screenCd}
      gridId={gridId}
      persistColumnSettings={persistColumnSettings}
      onInitialized={onInitialized}
      onRowDblClick={onRowDblClick}
      onRowPrepared={onRowPrepared}
      onRowInserting={onRowInserting}
      onRowUpdating={onRowUpdating}
      onRowRemoving={onRowRemoving}
      onRowInserted={onRowInserted}
      onRowUpdated={onRowUpdated}
      onRowRemoved={onRowRemoved}
      onSaving={onSaving}
      onEditorPreparing={onEditorPreparing}
      defaultSelectedRowKeys={defaultSelectedRowKeys}
      onSelectionChanged={onSelectionChanged}
      onFocusedRowChanged={onFocusedRowChanged}
      onContextMenuCopy={onContextMenuCopy}
      selectMode={selectMode}
      selectAllMode={selectAllMode}
      focusRowEnabled={focusRowEnabled}
      autoNavigateToFocusedRow={autoNavigateToFocusedRow}
      onContextMenuUpdate={onContextMenuUpdate}
      selectByClick={selectByClick}
      pagingEnabled={pagingEnabled}
      showPager={showPager}
      pageSize={pageSize}
      defaultPageSize={defaultPageSize}
      showPageSizeSelector={showPageSizeSelector}
      allowedPageSizes={allowedPageSizes}
      remoteOperations={remoteOperations}
      loadPanelEnabled={loadPanelEnabled}
      wordWrapEnabled={wordWrapEnabled}
      onOptionChanged={onOptionChanged}
      columnSettingStateRef={columnSettingStateRef}
      runtimeColumnVisibility={runtimeColumnVisibility}
      actionButtons={actionButtons}
      actionButtonsPosition={actionButtonsPosition}
      onAdd={onAdd}
    >
      {children}
    </BaseDataGrid>
  )
}

export default PageGrid
