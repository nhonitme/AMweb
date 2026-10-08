import { MasterPopupValidationContext, useMasterPopupValidation } from "./masterPopupValidation";
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
  type TreeListTypes,
} from "devextreme-react/tree-list";
import { LanguageContext } from "@/lib/i18nLoader";
import { applyHeaderFieldNameTooltip } from "@/lib/gridHeaderFieldTooltip";
import { flushActiveEditorValue } from "@/lib/shortcuts/shortcutUtils";
import GridColumnSettingsPopup from "./GridColumnSettingsPopup";
import {
  applyGridColumnSettingsToChildren,
} from "./gridColumnSettingRender";
import { useCompanyLangRevision } from "@/lib/companyLang";
import { applyGridEditingTexts } from "@/lib/gridEditingTexts";
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
  CellPreparedEvent,
  EditorPreparingEvent,
  SavingEvent,
} from "devextreme/ui/tree_list";
import type dxTreeList from "devextreme/ui/tree_list";

type TreeListComponentInstance = dxTreeList & {
  __openFocusedOrSelectedRow?: () => boolean;
  __duplicateFocusedOrSelectedRow?: () => boolean;
  __openColumnSettings?: () => boolean | Promise<boolean>;
};

interface BaseTreeListProps<T extends object> {
  dataSource: TreeListTypes.Properties["dataSource"];
  keyExpr: string;
  parentIdExpr: string;
  rootValue?: string | number | null;
  copyExcludeFields?: string[];
  columns?: (string | ColumnType<T, unknown>)[];
  children?: React.ReactNode;
  actionButtons?: boolean;
  actionButtonsPosition?: "start" | "end";
  menuCode?: string;
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
  onEditorPreparing?: (e: EditorPreparingEvent) => void;
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
  menuCode,
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
  const { translate, lang } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string;
    lang?: string;
  };

  const t = (key: string, fallback?: string) =>
    translate ? translate(key, fallback) : (fallback ?? key);
  const popupValidation = useMasterPopupValidation();
    const usesSysGridCatalog = persistColumnSettings && Boolean(gridId?.trim());
  const columnSettingState = useGridColumnSettingState({
    enabled: persistColumnSettings,
    menuCode,
    screenCd,
    gridId,
    hideColumnsMissingFromSettings: usesSysGridCatalog,
  });
  const treeListInstanceRef = React.useRef<TreeListComponentInstance | null>(null);
  const [columnSettingsVisible, setColumnSettingsVisible] = React.useState(false);
  const [columnSettingsLoading, setColumnSettingsLoading] = React.useState(false);
  const [columnSettingsItems, setColumnSettingsItems] = React.useState<GridColumnSettingEditorItem[]>([]);
  const columnSettingsTargetKey = React.useMemo(
    () => columnSettingState.targetIdentity || [(menuCode ?? screenCd)?.trim() ?? "", gridId?.trim() ?? ""].join("::"),
    [columnSettingState.targetIdentity, gridId, menuCode, screenCd],
  );
  const columnLayoutSignature = React.useMemo(
    () => columnSettingState.cachedEditorItems
      .map((item) => [
        item.columnName.toUpperCase(),
        item.visibleIndex ?? "",
        item.width ?? "",
        item.fixedPosition,
      ].join(":"))
      .join("|"),
    [columnSettingState.cachedEditorItems],
  );
  const gridRemountKey = `${columnSettingsTargetKey}::grid`;
  const columnSettingsPopupKey = `${columnSettingsTargetKey}::column-settings`;
  const columnSettingsTargetKeyRef = React.useRef(columnSettingsTargetKey);

  React.useEffect(() => {
    columnSettingsTargetKeyRef.current = columnSettingsTargetKey;
    setColumnSettingsVisible(false);
    setColumnSettingsLoading(false);
    setColumnSettingsItems([]);
  }, [columnSettingsTargetKey]);

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

  const columnLayoutItemsRef = React.useRef(columnSettingState.cachedEditorItems);
  const columnLayoutSignatureRef = React.useRef(columnLayoutSignature);
  if (columnLayoutSignatureRef.current !== columnLayoutSignature) {
    columnLayoutSignatureRef.current = columnLayoutSignature;
    columnLayoutItemsRef.current = columnSettingState.cachedEditorItems;
  }

  const companyLangRevision = useCompanyLangRevision();
  const renderedChildren = React.useMemo(
    () => applyGridColumnSettingsToChildren(
      normalizedChildren,
      Column,
      columnLayoutItemsRef.current,
      columnSettingState.translateCaption,
      { hideColumnsMissingFromSettings: usesSysGridCatalog },
    ),
    [columnLayoutSignature, columnSettingState.translateCaption, companyLangRevision, normalizedChildren, usesSysGridCatalog],
  );

  React.useEffect(() => {
    const component = treeListInstanceRef.current;
    if (!component || !columnSettingState.cachedEditorItems.length) {
      return;
    }

    columnSettingState.syncEditorItemsToComponent(component, columnSettingState.cachedEditorItems);
  }, [
    columnSettingState.cachedEditorItems,
    columnSettingState.syncEditorItemsToComponent,
  ]);

  React.useEffect(() => {
    // DevExtreme snapshots editing captions when the widget is built; refresh on language switch.
    applyGridEditingTexts(treeListInstanceRef.current);
  }, [lang]);

  const hasConfiguredColumnWidths = React.useMemo(
    () => columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number"),
    [columnSettingState.cachedEditorItems],
  );

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
  const getPrimaryRowContext = React.useCallback((component: TreeListComponentInstance | null) => {
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

  const duplicateRowData = React.useCallback((component: TreeListComponentInstance | null, rowData: T | null | undefined) => {
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

  const openColumnSettings = React.useCallback(async (componentOverride?: TreeListComponentInstance | null) => {
    if (!columnSettingState.enabled) {
      return false;
    }

    const component = componentOverride ?? treeListInstanceRef.current;
    if (!component) {
      return false;
    }

    const shouldShowLoading =
      columnSettingState.cachedEditorItems.length === 0 && columnSettingsItems.length === 0;

    const targetKey = columnSettingsTargetKeyRef.current;
    setColumnSettingsItems([]);
    setColumnSettingsVisible(true);
    if (shouldShowLoading) {
      setColumnSettingsLoading(true);
    }

    try {
      const items = await columnSettingState.loadEditorItems(component);
      if (columnSettingsTargetKeyRef.current !== targetKey) {
        return false;
      }
      setColumnSettingsItems(items);
      return true;
    } finally {
      if (shouldShowLoading && columnSettingsTargetKeyRef.current === targetKey) {
        setColumnSettingsLoading(false);
      }
    }
  }, [columnSettingState, columnSettingsItems.length]);

  const handleColumnSettingsSave = React.useCallback(async (items: GridColumnSettingEditorItem[]) => {
    const targetKey = columnSettingsTargetKeyRef.current;
    const component = treeListInstanceRef.current;
    const savedItems = component
      ? await columnSettingState.applyEditorItemsToComponent(component, items)
      : await columnSettingState.saveEditorItems(items);

    if (columnSettingsTargetKeyRef.current !== targetKey) {
      return;
    }
    setColumnSettingsItems(savedItems);
    setColumnSettingsVisible(false);
  }, [columnSettingState]);

  const handleColumnSettingsReset = React.useCallback(async () => {
    const resetItems = await columnSettingState.resetEditorItems(treeListInstanceRef.current);
    setColumnSettingsItems(resetItems);
  }, [columnSettingState]);

  const handleColumnTemplateChange = React.useCallback(async (templateId: number) => {
    const items = await columnSettingState.changeTemplate(templateId, treeListInstanceRef.current);
    setColumnSettingsItems(items);
  }, [columnSettingState]);

  const handleColumnTemplateCreate = React.useCallback(async (payload: { templateName: string; isDefaultTemplate: boolean }) => {
    const items = await columnSettingState.createTemplate(payload, treeListInstanceRef.current);
    setColumnSettingsItems(items);
  }, [columnSettingState]);

  const handleColumnTemplateSetDefault = React.useCallback(async (templateId: number) => {
    await columnSettingState.setDefaultTemplate(templateId);
  }, [columnSettingState]);

  const installTreeListHelpers = React.useCallback((component: TreeListComponentInstance | null) => {
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
    <MasterPopupValidationContext.Provider value={popupValidation}>
    <div className="data-tree-list-container h-full w-full">
      <TreeList
        key={gridRemountKey}
        loadPanel={{ enabled: false }}
        dataSource={dataSource}
        keyExpr={keyExpr}
        parentIdExpr={parentIdExpr}
        rootValue={rootValue}
        width="100%"
        height="100%"
        onSelectionChanged={onSelectionChanged}
        showBorders
        columnAutoWidth={!hasConfiguredColumnWidths}
        showColumnHeaders={true}
        allowColumnResizing={true}
        columnResizingMode="widget"
        allowColumnReordering={true}
        hoverStateEnabled
        wordWrapEnabled={wordWrapEnabled}
        rowAlternationEnabled
        onRowClick={handleRowClickInternal}
        onRowDblClick={onRowDblClick}
        onInitialized={(e) => {
          treeListInstanceRef.current = e.component ?? null;
          columnSettingState.bindGridComponent(e.component);
          popupValidation.bind(e.component ?? null);
          installTreeListHelpers(e.component ?? null);
          onInitialized?.(e);
          applyGridEditingTexts(e.component);
        }}
        onToolbarPreparing={(e) => {
          handleToolbarPreparingDefault(e);
          onToolbarPreparing?.(e);
        }}
        onCellPrepared={(event: CellPreparedEvent) => {
          applyHeaderFieldNameTooltip(event);
        }}
        onContextMenuPreparing={handleContextMenuPreparingInternal}
        onRowInserting={onRowInserting}
        onRowUpdating={onRowUpdating}
        onRowRemoving={onRowRemoving}
        onSaving={(event: SavingEvent) => {
          event.promise = flushActiveEditorValue(document.activeElement);
        }}
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
          key={columnSettingsPopupKey}
          visible={columnSettingsVisible}
          title={t("AUDIT_SETTING_SHOW_HIDE", "Thiết lập cột hiển thị")}
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
      ) : null}
    </div>
    </MasterPopupValidationContext.Provider>
  );
}

export default BaseTreeList;
