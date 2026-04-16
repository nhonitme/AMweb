import type { ReactNode } from "react"
import type { InitializedEvent, RowDblClickEvent, SelectionChangedEvent, FocusedRowChangedEvent, OptionChangedEvent } from "devextreme/ui/data_grid"

import { BaseDataGrid } from "./BaseDataGrid"

interface PageGridProps<TData> {
  dataSource: any
  keyExpr: string
  copyExcludeFields?: string[]
  children: ReactNode
  screenCd?: string
  gridId?: string
  persistColumnSettings?: boolean
  onInitialized?: (event: InitializedEvent<TData, string | number>) => void
  onRowDblClick?: (event: RowDblClickEvent<TData, string | number>) => void
  onSelectionChanged?: (event: SelectionChangedEvent<TData, string | number>) => void
  onFocusedRowChanged?: (event: FocusedRowChangedEvent<TData, string | number>) => void
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
  onOptionChanged?: (e: OptionChangedEvent) => void
}

export function PageGrid<TData>({
  dataSource,
  keyExpr,
  copyExcludeFields,
  children,
  screenCd,
  gridId,
  persistColumnSettings,
  onInitialized,
  onRowDblClick,
  onSelectionChanged,
  onFocusedRowChanged,
  onContextMenuCopy,
  selectMode,
  selectAllMode,
  focusRowEnabled,
  autoNavigateToFocusedRow,
  selectByClick,
  onContextMenuUpdate,
  pagingEnabled,
  showPager,
  pageSize,
  defaultPageSize,
  showPageSizeSelector,
  allowedPageSizes,
  remoteOperations,
  onOptionChanged
}: PageGridProps<TData>) {
  return (
    <BaseDataGrid<TData>
      dataSource={dataSource}
      keyExpr={keyExpr}
      copyExcludeFields={copyExcludeFields}
      screenCd={screenCd}
      gridId={gridId}
      persistColumnSettings={persistColumnSettings}
      onInitialized={onInitialized}
      onRowDblClick={onRowDblClick}
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
      onOptionChanged={onOptionChanged}
    >
      {children}
    </BaseDataGrid>
  )
}

export default PageGrid
