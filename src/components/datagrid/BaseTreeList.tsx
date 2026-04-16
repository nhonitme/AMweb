import React, { useContext } from "react";
import TreeList, {
  Paging,
  Pager,
  FilterRow,
  HeaderFilter,
  FilterBuilderPopup,
  FilterPanel,
  ColumnFixing,
  Column,
  StateStoring,
} from "devextreme-react/tree-list";
import { LanguageContext } from "@/lib/i18nLoader";
import GridColumnSettingsPopup from "./GridColumnSettingsPopup";
import { applyGridColumnSettingsToChildren } from "./gridColumnSettingRender";
import { useGridColumnSettingState } from "./useGridColumnSettingState";
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting";

import type {
  Column as ColumnType,
  InitializedEvent,
  ToolbarPreparingEvent,
  ContextMenuPreparingEvent,
  RowInsertingEvent,
  RowUpdatingEvent,
  RowRemovingEvent,
  EditingStartEvent,
  InitNewRowEvent,
  SelectionChangedEvent,
  RowClickEvent,
  RowDblClickEvent,
} from "devextreme/ui/tree_list";

interface BaseTreeListProps<T extends object> {
  dataSource: T[];
  keyExpr: string;
  parentIdExpr: string;
  rootValue?: string | number | null;
  copyExcludeFields?: string[];
  columns?: (string | ColumnType<T, unknown>)[];
  children?: React.ReactNode;
  actionButtons?: boolean;
  actionButtonsPosition?: "start" | "end";
  screenCd?: string;
  gridId?: string;
  persistColumnSettings?: boolean;
  onRowDblClick?: (e: RowDblClickEvent) => void;
  onRowClick?: (e: RowClickEvent) => void;

  onInitialized?: (e: InitializedEvent) => void;
  onToolbarPreparing?: (e: ToolbarPreparingEvent) => void;
  onContextMenuPreparing?: (e: ContextMenuPreparingEvent) => void;
  onRowInserting?: (e: RowInsertingEvent) => void;
  onRowUpdating?: (e: RowUpdatingEvent) => void;
  onRowRemoving?: (e: RowRemovingEvent) => void;
  onEditingStart?: (e: EditingStartEvent) => void;
  onInitNewRow?: (e: InitNewRowEvent) => void;
  onEditorPreparing?: (e: any) => void;
  onSelectionChanged?: (e: SelectionChangedEvent) => void;

  wordWrapEnabled?: boolean;
}

const handleToolbarPreparingDefault = (e: ToolbarPreparingEvent) => {
  e.toolbarOptions.items = e.toolbarOptions.items?.filter(
    (item) => item.name !== "addRowButton" && item.name !== "columnChooserButton"
  );
};

export function BaseTreeList<T extends object>({
  dataSource,
  keyExpr,
  parentIdExpr,
  rootValue = 0,
  copyExcludeFields = [],
  children,
  actionButtons = false,
  actionButtonsPosition = "end",
  screenCd,
  gridId,
  persistColumnSettings = true,
  onRowDblClick,
  onRowClick,
  onInitialized,
  onToolbarPreparing,
  onContextMenuPreparing,
  onRowInserting,
  onRowUpdating,
  onRowRemoving,
  onEditingStart,
  onInitNewRow,
  onSelectionChanged,
  wordWrapEnabled,
  onEditorPreparing
}: BaseTreeListProps<T>) {
  const { lang, translate } = useContext(LanguageContext) as {
    lang: string;
    translate: (key: string, fallback?: string) => string;
  };

  const t = (key: string, fallback?: string) =>
    translate ? translate(key, fallback) : (fallback ?? key);
  const columnSettingState = useGridColumnSettingState({
    enabled: persistColumnSettings,
    screenCd,
    gridId,
  });
  const treeListInstanceRef = React.useRef<any>(null);
  const [columnSettingsVisible, setColumnSettingsVisible] = React.useState(false);
  const [columnSettingsLoading, setColumnSettingsLoading] = React.useState(false);
  const [columnSettingsItems, setColumnSettingsItems] = React.useState<GridColumnSettingEditorItem[]>([]);

  const normalizedChildren = React.useMemo(() => {
    const childrenArray = React.Children.toArray(children);
    const buttonColumns: React.ReactNode[] = [];
    const otherChildren: React.ReactNode[] = [];

    childrenArray.forEach((child) => {
      if (!React.isValidElement(child)) {
        otherChildren.push(child);
        return;
      }

      if (child.type === Column && child.props?.type === "buttons") {
        const buttonColumn = React.cloneElement(child, {
          width: child.props.width ?? 90,
          showInColumnChooser: false,
          fixed: actionButtonsPosition === "start" ? true : child.props.fixed,
          fixedPosition:
            actionButtonsPosition === "start" ? "left" : child.props.fixedPosition,
        });
        buttonColumns.push(buttonColumn);
        return;
      }

      otherChildren.push(child);
    });

    if (buttonColumns.length > 0) {
      return actionButtonsPosition === "start"
        ? [...buttonColumns, ...otherChildren]
        : [...otherChildren, ...buttonColumns];
    }

    if (!actionButtons) {
      return children;
    }

    const injectedCommandColumn = (
      <Column
        type="buttons"
        width={90}
        showInColumnChooser={false}
        fixed={actionButtonsPosition === "start"}
        fixedPosition={actionButtonsPosition === "start" ? "left" : undefined}
      />
    );

    return actionButtonsPosition === "start"
      ? [injectedCommandColumn, ...otherChildren]
      : [...otherChildren, injectedCommandColumn];
  }, [children, actionButtons, actionButtonsPosition]);

  const renderedChildren = React.useMemo(
    () => applyGridColumnSettingsToChildren(normalizedChildren, Column, columnSettingState.cachedEditorItems),
    [columnSettingState.cachedEditorItems, normalizedChildren],
  );

  const hasConfiguredColumnWidths = React.useMemo(
    () => columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number"),
    [columnSettingState.cachedEditorItems],
  );

  React.useEffect(() => {
    if (!columnSettingState.enabled || !treeListInstanceRef.current || !columnSettingState.cachedEditorItems.length) {
      return;
    }

    columnSettingState.syncEditorItemsToComponent(treeListInstanceRef.current, columnSettingState.cachedEditorItems);
  }, [
    dataSource,
    columnSettingState.cachedEditorItems,
    columnSettingState.enabled,
    columnSettingState.syncEditorItemsToComponent,
    normalizedChildren,
  ]);

  const stripFields = (obj: Record<string, unknown>, fields: string[] | Set<string>) => {
    if (!obj || typeof obj !== "object") return;
    const upper = new Set(Array.from(fields).map((f) => f.toUpperCase()));
    Object.keys(obj).forEach((k) => {
      if (upper.has(k.toUpperCase())) {
        delete obj[k];
      }
    });
  };

  const copyDataRef = React.useRef<Record<string, unknown> | null>(null);
  const getPrimaryRowContext = React.useCallback((component: any) => {
    if (!component) {
      return null;
    }

    const selectedKeys = (component.getSelectedRowKeys?.() ?? []) as unknown[];
    const key = selectedKeys[0] ?? null;

    if (key === null || key === undefined) {
      return null;
    }

    const rowIndex = component.getRowIndexByKey?.(key);
    const data =
      component.getVisibleRows?.()?.find((row: { key?: unknown }) => row.key === key)?.data ?? null;

    return {
      key,
      rowIndex: typeof rowIndex === "number" ? rowIndex : -1,
      data,
    };
  }, []);

  const duplicateRowData = React.useCallback((component: any, rowData: T | null | undefined) => {
    if (!component || !rowData) {
      return false;
    }

    const clone = { ...(rowData as Record<string, unknown>) };
    if (keyExpr) stripFields(clone, [keyExpr]);
    if (copyExcludeFields.length) stripFields(clone, copyExcludeFields);
    copyDataRef.current = clone;
    component.addRow?.();
    return true;
  }, [copyExcludeFields, keyExpr]);

  const openColumnSettings = React.useCallback(async (componentOverride?: any) => {
    if (!columnSettingState.enabled) {
      return false;
    }

    const component = componentOverride ?? treeListInstanceRef.current;
    if (!component) {
      return false;
    }

    const shouldShowLoading =
      columnSettingState.cachedEditorItems.length === 0 && columnSettingsItems.length === 0;

    setColumnSettingsVisible(true);
    if (shouldShowLoading) {
      setColumnSettingsLoading(true);
    }

    try {
      const items = await columnSettingState.loadEditorItems(component);
      setColumnSettingsItems(items);
      return true;
    } finally {
      if (shouldShowLoading) {
        setColumnSettingsLoading(false);
      }
    }
  }, [columnSettingState, columnSettingsItems.length]);

  const handleColumnSettingsSave = React.useCallback(async (items: GridColumnSettingEditorItem[]) => {
    const component = treeListInstanceRef.current;
    const savedItems = component
      ? await columnSettingState.applyEditorItemsToComponent(component, items)
      : await columnSettingState.saveEditorItems(items);

    setColumnSettingsItems(savedItems);
    setColumnSettingsVisible(false);
  }, [columnSettingState]);

  const handleColumnSettingsReset = React.useCallback(async () => {
    const resetItems = await columnSettingState.resetEditorItems(treeListInstanceRef.current);
    setColumnSettingsItems(resetItems);
  }, [columnSettingState]);

  const installTreeListHelpers = React.useCallback((component: any) => {
    if (!component) {
      return;
    }

    component.__openFocusedOrSelectedRow = () => {
      const rowContext = getPrimaryRowContext(component);
      if (!rowContext) {
        return false;
      }

      if (rowContext.rowIndex >= 0) {
        component.editRow?.(rowContext.rowIndex);
        return true;
      }

      return false;
    };

    component.__duplicateFocusedOrSelectedRow = () => {
      const rowContext = getPrimaryRowContext(component);
      return duplicateRowData(component, rowContext?.data);
    };

    component.__openColumnSettings = () => openColumnSettings(component);
  }, [duplicateRowData, getPrimaryRowContext, openColumnSettings]);

  const handleRowClickInternal = (e: RowClickEvent) => {
    const comp = e.component;
    if (comp) {
      const key = e.key;
      if (comp.isRowSelected(key)) {
        comp.deselectRows(key);
      } else {
        comp.selectRows([key], true);
      }
    }
    onRowClick?.(e);
  };

  const handleContextMenuPreparingInternal = (e: ContextMenuPreparingEvent) => {
    if (e.row && e.row.rowType === "data") {
      const items: Array<{ text: string; onItemClick: () => void }> = [
        {
              text: t("UpdateMsg", "Update"),
          onItemClick: () => {
            e.component?.editRow(e.row!.rowIndex);
          },
        },
        {
            text: t("btndelete", "Delete"),
          onItemClick: () => {
            e.component?.deleteRow(e.row!.rowIndex);
          },
        },
      ];

      items.push({
          text: t("btn_copy", "Copy"),
        onItemClick: () => {
          if (e.row?.data) {
            const clone = { ...(e.row.data as Record<string, unknown>) };
            if (keyExpr) stripFields(clone, [keyExpr]);
            if (copyExcludeFields.length) stripFields(clone, copyExcludeFields);
            copyDataRef.current = clone;
            e.component?.addRow();
          }
        },
      });

      e.items = items;
    }

    onContextMenuPreparing?.(e);
  };

  return (
    <div className="data-tree-list-container h-full w-full">
      <TreeList
        dataSource={dataSource}
        keyExpr={keyExpr}
        parentIdExpr={parentIdExpr}
        rootValue={rootValue}
        width="100%"
        height="100%"
        key={lang}
        onSelectionChanged={onSelectionChanged}
        showBorders
        columnAutoWidth={!hasConfiguredColumnWidths}
        showColumnHeaders={true}
        allowColumnResizing={true}
        allowColumnReordering={true}
        hoverStateEnabled
        wordWrapEnabled={wordWrapEnabled}
        rowAlternationEnabled
        onRowClick={handleRowClickInternal}
        onRowDblClick={onRowDblClick}
        onInitialized={(e) => {
          treeListInstanceRef.current = e.component;
          installTreeListHelpers(e.component);
          if (columnSettingState.cachedEditorItems.length) {
            columnSettingState.syncEditorItemsToComponent(e.component, columnSettingState.cachedEditorItems);
          }
          onInitialized?.(e);
        }}
        onToolbarPreparing={(e) => {
          handleToolbarPreparingDefault(e);
          onToolbarPreparing?.(e);
        }}
        onContextMenuPreparing={handleContextMenuPreparingInternal}
        onRowInserting={onRowInserting}
        onRowUpdating={onRowUpdating}
        onRowRemoving={onRowRemoving}
        onEditingStart={onEditingStart}
        selection={{ mode: "single" }}
        onEditorPreparing={onEditorPreparing}
        onInitNewRow={(e) => {
        if (copyDataRef.current) {
          const nextData = {
            ...(e.data ?? ({} as T)),
            ...copyDataRef.current,
          } as T;

          const nextDataRecord = nextData as Record<string, unknown>;

          if (keyExpr) stripFields(nextDataRecord, [keyExpr]);
          if (copyExcludeFields.length) stripFields(nextDataRecord, copyExcludeFields);

          copyDataRef.current = null;
          e.data = nextData;
        }

        onInitNewRow?.(e);
      }}
      >
        <HeaderFilter visible />
        <FilterRow />
        <FilterPanel />
        <FilterBuilderPopup />
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

        <Paging defaultPageSize={20} />
        <Pager
          visible={true}
          showPageSizeSelector={true}
          allowedPageSizes={[20, 50, 100]}
          showInfo={true}
          showNavigationButtons={true}
          infoText={t("PAGE_TEXT", "Page {0} / {1} ({2} rows)")}
        />

        {renderedChildren}

      </TreeList>
      {columnSettingState.enabled ? (
        <GridColumnSettingsPopup
          visible={columnSettingsVisible}
          title={t("AUDIT_SETTING_SHOW_HIDE", "Column Settings")}
          items={columnSettingsItems}
          loading={columnSettingsLoading}
          onClose={() => setColumnSettingsVisible(false)}
          onReset={handleColumnSettingsReset}
          onSave={handleColumnSettingsSave}
        />
      ) : null}
    </div>
  );
}

export default BaseTreeList;
