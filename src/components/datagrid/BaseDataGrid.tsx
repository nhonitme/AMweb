import { MasterPopupValidationContext, useMasterPopupValidation } from "./masterPopupValidation";
import React, { useContext } from "react";
import DataGrid, {
    Paging,
    Pager,
    FilterRow,
    HeaderFilter,
    FilterBuilderPopup,
    FilterPanel,
    Selection,
    ColumnFixing,
    Column,
    StateStoring,
    type DataGridTypes,
} from "devextreme-react/data-grid";
import { LanguageContext } from "@/lib/i18nLoader";
import { applyHeaderFieldNameTooltip } from "@/lib/gridHeaderFieldTooltip";
import { DEFAULT_PAGE_SIZE } from "@/lib/paging";
import { flushActiveEditorValue } from "@/lib/shortcuts/shortcutUtils";
import GridColumnSettingsPopup from "./GridColumnSettingsPopup";
import { GridEmptyAddButton } from "./GridEmptyAddButton";
import {
    getGridToolbarAddHandler,
    subscribeGridToolbarAdd,
} from "./gridToolbarAddBridge";
import {
    applyGridColumnSettingsToChildren,
    applyRuntimeColumnVisibilityToChildren,
    applyRuntimeColumnVisibilityToComponent,
    type RuntimeColumnVisibilityOptions,
} from "./gridColumnSettingRender";
import { useCompanyLangRevision } from "@/lib/companyLang";
import { applyGridEditingTexts } from "@/lib/gridEditingTexts";
import { useGridColumnSettingState, type GridColumnSettingState } from "./useGridColumnSettingState";
import type { GridColumnSettingEditorItem } from "@/types/sysGridColumnSetting";

import type {
    Column as ColumnType,
    InitializedEvent,
    ToolbarPreparingEvent,
    ContextMenuPreparingEvent,
    RowPreparedEvent,
    RowInsertingEvent,
    RowUpdatingEvent,
    RowRemovingEvent,
    EditingStartEvent,
    EditCanceledEvent,
    InitNewRowEvent,
    SelectionChangedEvent,
    RowDblClickEvent,
    FocusedRowChangedEvent,
    CellClickEvent,
    CellPreparedEvent,
    OptionChangedEvent,
    RowInsertedEvent,
    RowUpdatedEvent,
    RowRemovedEvent,
    EditorPreparingEvent,
    SavingEvent,
    ContentReadyEvent,
} from "devextreme/ui/data_grid";
import type dxDataGrid from "devextreme/ui/data_grid";

type GridComponentInstance = dxDataGrid & {
    __openFocusedOrSelectedRow?: () => boolean;
    __duplicateFocusedOrSelectedRow?: () => boolean;
    __openColumnSettings?: () => boolean | Promise<boolean>;
};

function shouldApplyDataGridKeyExpr(dataSource: DataGridTypes.Properties["dataSource"]): boolean {
    return Array.isArray(dataSource);
}

function isGridEmptyForAddCta(component: dxDataGrid | null | undefined): boolean {
    if (!component) {
        return false;
    }

    try {
        const dataSource = component.getDataSource?.();
        if (dataSource?.isLoading?.()) {
            return false;
        }

        const totalCount = component.totalCount?.();
        if (typeof totalCount === "number" && Number.isFinite(totalCount)) {
            if (totalCount > 0) {
                return false;
            }
            if (totalCount === 0) {
                return true;
            }
            // totalCount === -1: remote/CustomStore has not published a total yet.
        }

        const items = dataSource?.items?.() ?? [];
        if (items.length > 0) {
            return false;
        }

        const visibleDataRows = (component.getVisibleRows?.() ?? []).filter(
            (row) => row?.rowType === "data",
        );
        if (visibleDataRows.length > 0) {
            return false;
        }

        const root = component.element?.() as HTMLElement | undefined;
        const noDataEl = root?.querySelector?.(".dx-datagrid-nodata") as HTMLElement | null;
        if (noDataEl) {
            const style = window.getComputedStyle(noDataEl);
            if (style.display !== "none" && style.visibility !== "hidden" && style.opacity !== "0") {
                return true;
            }
        }

        // Empty items + no visible data rows after load finished.
        return !dataSource?.isLoading?.();
    } catch {
        return false;
    }
}

interface BaseDataGridProps<T> {
    dataSource: DataGridTypes.Properties["dataSource"];
    keyExpr: string;
    copyExcludeFields?: string[];
    columns?: (string | ColumnType<T, unknown>)[];
    children?: React.ReactNode;
    actionButtons?: boolean;
    actionButtonsPosition?: 'start' | 'end';
    menuCode?: string;
    screenCd?: string;
    gridId?: string;
    persistColumnSettings?: boolean;

    onRowDblClick?: (e: RowDblClickEvent) => void;

    onInitialized?: (e: InitializedEvent) => void;
    onContentReady?: (e: ContentReadyEvent) => void;
    onToolbarPreparing?: (e: ToolbarPreparingEvent) => void;
    onContextMenuPreparing?: (e: ContextMenuPreparingEvent) => void;
    onCellClick?: (e: CellClickEvent) => void;
    onContextMenuUpdate?: (rowData: T) => void;
    onContextMenuCopy?: (rowData: T) => void;
    onContextMenuDelete?: (rowData: T) => void;
    onRowInserting?: (e: RowInsertingEvent) => void;
    onRowUpdating?: (e: RowUpdatingEvent) => void;
    onRowRemoving?: (e: RowRemovingEvent) => void;
    onEditingStart?: (e: EditingStartEvent) => void;
    onEditCanceled?: (e: EditCanceledEvent) => void;
    onInitNewRow?: (e: InitNewRowEvent) => void;
    onSelectionChanged?: (e: SelectionChangedEvent) => void;
    onFocusedRowChanged?: (e: FocusedRowChangedEvent) => void;
    onRowPrepared?: (e: RowPreparedEvent) => void;
    defaultSelectedRowKeys?: Array<string | number>;
    selectMode?: "none" | "single" | "multiple";
    selectAllMode?: "allPages" | "page";
    focusRowEnabled?: boolean;
    autoNavigateToFocusedRow?: boolean;
    selectByClick?: boolean;
    enableModifierSelection?: boolean;
    enableDragSelection?: boolean;
    pagingEnabled?: boolean;
    showPager?: boolean;
    pageSize?: number;
    defaultPageSize?: number;
    showPageSizeSelector?: boolean;
    allowedPageSizes?: number[];
    remoteOperations?: boolean | Record<string, boolean>;
    loadPanelEnabled?: boolean;
    optionChanged?: (e: OptionChangedEvent) => void;
    onSaving?: (e: SavingEvent) => void;
    onRowInserted?: (e: RowInsertedEvent) => void;
    onRowUpdated?: (e: RowUpdatedEvent) => void;
    onRowRemoved?: (e: RowRemovedEvent) => void;
    onEditorPreparing?: (e: EditorPreparingEvent) => void;
    wordWrapEnabled?: boolean;
    keyboardNavigation?: DataGridTypes.Properties["keyboardNavigation"];
    showGridFilters?: boolean;
  onOptionChanged?: (e: OptionChangedEvent) => void;    
    columnSettingStateRef?: React.MutableRefObject<GridColumnSettingState | null>;
    runtimeColumnVisibility?: RuntimeColumnVisibilityOptions;
    /** Optional empty-state Add handler. Prefer GridToolbar registration when available. */
    onAdd?: () => void;
}

const handleToolbarPreparingDefault = (e: ToolbarPreparingEvent) => {
    e.toolbarOptions.items = e.toolbarOptions.items?.filter(
        (item) => item.name !== 'addRowButton' && item.name !== 'columnChooserButton'
    );
};

export function BaseDataGrid<T>({
    dataSource,
    keyExpr,
    copyExcludeFields = [],
    children,
    actionButtons = false,
    actionButtonsPosition = 'end',
    menuCode,
    screenCd,
    gridId,
    persistColumnSettings = true,
    onRowDblClick,
    onInitialized,
    onContentReady,
    onToolbarPreparing,
    onContextMenuPreparing,
    onCellClick,
    onContextMenuUpdate,
    onContextMenuCopy,
    onContextMenuDelete,
    onRowInserting,
    onRowUpdating,
    onRowRemoving,
    onEditingStart,
    onEditCanceled,
    onInitNewRow,
    onSelectionChanged,
    onFocusedRowChanged,
    onRowPrepared,
    defaultSelectedRowKeys,
    onOptionChanged,
    selectMode = "multiple",
    selectAllMode = "allPages",
    selectByClick = true,
    enableModifierSelection = false,
    enableDragSelection = false,
    focusRowEnabled = false,
    autoNavigateToFocusedRow = true,
    pagingEnabled = true,
    showPager = true,
    pageSize,
    defaultPageSize = DEFAULT_PAGE_SIZE,
    showPageSizeSelector = true,
    allowedPageSizes = [20, 50, 100],

    onSaving,
    onRowInserted,
    onRowUpdated,
    onRowRemoved,
    onEditorPreparing,
    remoteOperations,
    loadPanelEnabled = false,
    wordWrapEnabled,
    keyboardNavigation,
    showGridFilters = true,
    columnSettingStateRef,
    runtimeColumnVisibility,
    onAdd,
}: BaseDataGridProps<T>) {
    const { translate, lang } = useContext(LanguageContext) as {
        translate: (key: string, fallback?: string) => string;
        lang?: string;
    };

    const t = (key: string, fallback?: string) => (translate ? translate(key, fallback) : fallback ?? key);
    const popupValidation = useMasterPopupValidation();
    const usesSysGridCatalog = persistColumnSettings && Boolean(gridId?.trim());
    const columnSettingState = useGridColumnSettingState({
        enabled: persistColumnSettings,
        menuCode,
        screenCd,
        gridId,
        hideColumnsMissingFromSettings: usesSysGridCatalog,
    });
    if (columnSettingStateRef) {
        columnSettingStateRef.current = columnSettingState;
    }
    const gridInstanceRef = React.useRef<GridComponentInstance | null>(null);
    const dragSelectionRef = React.useRef<{
        pointerId: number;
        startY: number;
        startKeyToken: string;
        preserveSelection: boolean;
        active: boolean;
        lastRangeToken: string;
    } | null>(null);
    const suppressClickAfterDragRef = React.useRef(false);
    const onAddRef = React.useRef(onAdd);
    onAddRef.current = onAdd;
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
                item.caption ?? "",
                item.labelText ?? "",
                item.columnLabelText ?? "",
                item.formatType ?? "",
            ].join(":"))
            .join("|"),
        [columnSettingState.cachedEditorItems],
    );
    const gridRemountKey = `${columnSettingsTargetKey}::grid`;
    const columnSettingsPopupKey = `${columnSettingsTargetKey}::column-settings`;
    const columnSettingsTargetKeyRef = React.useRef(columnSettingsTargetKey);
    const [gridContentReady, setGridContentReady] = React.useState(false);
    const [isGridEmpty, setIsGridEmpty] = React.useState(false);
    const [emptyAddAvailable, setEmptyAddAvailable] = React.useState(false);

    React.useEffect(() => {
        columnSettingsTargetKeyRef.current = columnSettingsTargetKey;
        setColumnSettingsVisible(false);
        setColumnSettingsLoading(false);
        setColumnSettingsItems([]);
        setGridContentReady(false);
        setIsGridEmpty(false);
        setEmptyAddAvailable(false);
    }, [columnSettingsTargetKey]);

    const refreshEmptyAddState = React.useCallback((component?: GridComponentInstance | null) => {
        const grid = component ?? gridInstanceRef.current;
        if (!grid) {
            setIsGridEmpty(false);
            setEmptyAddAvailable(false);
            return;
        }

        const empty = isGridEmptyForAddCta(grid);
        const hasToolbarAdd = typeof getGridToolbarAddHandler(grid) === "function";
        const hasPropAdd = typeof onAddRef.current === "function";

        setIsGridEmpty(empty);
        setEmptyAddAvailable(empty && (hasToolbarAdd || hasPropAdd));
    }, []);

    React.useEffect(() => {
        refreshEmptyAddState();
    }, [onAdd, refreshEmptyAddState]);

    React.useEffect(() => {
        const grid = gridInstanceRef.current;
        if (!grid) {
            return;
        }

        refreshEmptyAddState(grid);
        return subscribeGridToolbarAdd(grid, () => {
            refreshEmptyAddState(grid);
        });
    }, [gridContentReady, refreshEmptyAddState]);

    const handleEmptyAddClick = React.useCallback(() => {
        const toolbarAdd = getGridToolbarAddHandler(gridInstanceRef.current);
        if (toolbarAdd) {
            toolbarAdd();
            return;
        }

        onAddRef.current?.();
    }, []);

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
                    fixed: actionButtonsPosition === 'start' ? true : child.props.fixed,
                    fixedPosition:
                        actionButtonsPosition === 'start' ? 'left' : child.props.fixedPosition,
                });
                buttonColumns.push(buttonColumn);
                return;
            }

            otherChildren.push(child);
        });

        if (buttonColumns.length > 0) {
            return actionButtonsPosition === 'start'
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
                fixed={actionButtonsPosition === 'start'}
                fixedPosition={actionButtonsPosition === 'start' ? 'left' : undefined}
            />
        );

        return actionButtonsPosition === 'start'
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
    const renderedChildren = React.useMemo(() => {
        const settingsChildren = applyGridColumnSettingsToChildren(
            normalizedChildren,
            Column,
            columnLayoutItemsRef.current,
            columnSettingState.translateCaption,
            { hideColumnsMissingFromSettings: usesSysGridCatalog },
        );

        return runtimeColumnVisibility
            ? applyRuntimeColumnVisibilityToChildren(settingsChildren, Column, runtimeColumnVisibility)
            : settingsChildren;
    }, [columnLayoutSignature, columnSettingState.translateCaption, companyLangRevision, normalizedChildren, runtimeColumnVisibility, usesSysGridCatalog]);

    const hasConfiguredColumnWidths = React.useMemo(
        () => columnSettingState.cachedEditorItems.some((item) => typeof item.width === "number"),
        [columnSettingState.cachedEditorItems],
    );
    const onContentReadyRef = React.useRef(onContentReady);
    onContentReadyRef.current = onContentReady;
    const handleContentReady = React.useCallback((event: ContentReadyEvent) => {
        const component = (event.component ?? null) as GridComponentInstance | null;
        setGridContentReady(true);
        if (component && runtimeColumnVisibility) {
            applyRuntimeColumnVisibilityToComponent(component as never, runtimeColumnVisibility);
        }
        refreshEmptyAddState(component);
        onContentReadyRef.current?.(event);
    }, [refreshEmptyAddState, runtimeColumnVisibility]);

    React.useEffect(() => {
        // DevExtreme snapshots editing captions when the widget is built; refresh on language switch.
        applyGridEditingTexts(gridInstanceRef.current);
    }, [gridContentReady, lang]);

    React.useEffect(() => {
        if (!gridContentReady || !gridInstanceRef.current) {
            return;
        }

        if (columnSettingState.cachedEditorItems.length) {
            columnSettingState.syncEditorItemsToComponent(
                gridInstanceRef.current,
                columnSettingState.cachedEditorItems,
            );
        }

        if (runtimeColumnVisibility) {
            applyRuntimeColumnVisibilityToComponent(gridInstanceRef.current as never, runtimeColumnVisibility);
        }
    }, [
        columnSettingState.cachedEditorItems,
        columnSettingState.syncEditorItemsToComponent,
        gridContentReady,
        runtimeColumnVisibility,
    ]);

    const stripFields = (obj: Record<string, unknown>, fields: string[] | Set<string>) => {
        if (!obj || typeof obj !== 'object') return;
        const upper = new Set(Array.from(fields).map((f) => f.toUpperCase()));
        Object.keys(obj).forEach((k) => {
            if (upper.has(k.toUpperCase())) {
                delete obj[k];
            }
        });
    };

    const copyDataRef = React.useRef<Record<string, unknown> | null>(null);
    const getPrimaryRowContext = React.useCallback((component: GridComponentInstance | null) => {
        if (!component) {
            return null;
        }

        const selectedKeys = (component.getSelectedRowKeys?.() ?? []) as unknown[];
        const selectedRows = (component.getSelectedRowsData?.() ?? []) as T[];
        const focusedRowKey = component.option?.("focusedRowKey");
        const key = selectedKeys[0] ?? focusedRowKey ?? null;

        if (key === null || key === undefined) {
            return null;
        }

        const rowIndex = component.getRowIndexByKey?.(key);
        const data =
            selectedRows[0] ??
            component.getVisibleRows?.()?.find((row: { key?: unknown }) => row.key === key)?.data ??
            null;

        return {
            key,
            rowIndex: typeof rowIndex === "number" ? rowIndex : -1,
            data,
        };
    }, []);

    const duplicateRowData = React.useCallback((component: GridComponentInstance | null, rowData: T | null | undefined) => {
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

    const openColumnSettings = React.useCallback(async (componentOverride?: GridComponentInstance | null) => {
        if (!columnSettingState.enabled) {
            return false;
        }

        const component = componentOverride ?? gridInstanceRef.current;
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
        const component = gridInstanceRef.current;
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
        const resetItems = await columnSettingState.resetEditorItems(gridInstanceRef.current);
        setColumnSettingsItems(resetItems);
    }, [columnSettingState]);

    const handleColumnTemplateChange = React.useCallback(async (templateId: number) => {
        const items = await columnSettingState.changeTemplate(templateId, gridInstanceRef.current);
        setColumnSettingsItems(items);
    }, [columnSettingState]);

    const handleColumnTemplateCreate = React.useCallback(async (payload: { templateName: string; isDefaultTemplate: boolean }) => {
        const items = await columnSettingState.createTemplate(payload, gridInstanceRef.current);
        setColumnSettingsItems(items);
    }, [columnSettingState]);

    const handleColumnTemplateSetDefault = React.useCallback(async (templateId: number) => {
        await columnSettingState.setDefaultTemplate(templateId);
    }, [columnSettingState]);

    const installGridHelpers = React.useCallback((component: GridComponentInstance | null) => {
        if (!component) {
            return;
        }

        component.__openFocusedOrSelectedRow = () => {
            const rowContext = getPrimaryRowContext(component);
            if (!rowContext) {
                return false;
            }

            if (onContextMenuUpdate && rowContext.data) {
                onContextMenuUpdate(rowContext.data);
                return true;
            }

            if (rowContext.rowIndex >= 0) {
                component.editRow?.(rowContext.rowIndex);
                return true;
            }

            return false;
        };

        component.__duplicateFocusedOrSelectedRow = () => {
            const rowContext = getPrimaryRowContext(component);
            if (!rowContext?.data) {
                return false;
            }

            if (onContextMenuCopy) {
                onContextMenuCopy(rowContext.data);
                return true;
            }

            return duplicateRowData(component, rowContext.data);
        };

        component.__openColumnSettings = () => openColumnSettings(component);
    }, [duplicateRowData, getPrimaryRowContext, onContextMenuCopy, onContextMenuUpdate, openColumnSettings]);
    const pagingProps =
        typeof pageSize === "number" && Number.isFinite(pageSize) && pageSize > 0
            ? { pageSize }
            : { defaultPageSize };
    const gridKeyExprProps =
        shouldApplyDataGridKeyExpr(dataSource) && keyExpr ? { keyExpr } : {};

    const selectionKeyToken = (key: unknown) => `${typeof key}:${String(key)}`;

    const getSelectionRowElement = (target: EventTarget | null) => {
        if (!(target instanceof Element)) {
            return null;
        }
        return target.closest<HTMLElement>("tr.dx-data-row[data-base-grid-selection-key]");
    };

    const handleDragSelectionPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
        if (!enableDragSelection || selectMode !== "multiple" || event.pointerType !== "mouse" || event.button !== 0) {
            return;
        }

        const target = event.target instanceof Element ? event.target : null;
        if (!target || target.closest(".dx-command-select, .dx-select-checkbox, button, a, input, textarea, select, [contenteditable='true']")) {
            return;
        }

        const rowElement = getSelectionRowElement(event.target);
        const startKeyToken = rowElement?.dataset.baseGridSelectionKey;
        if (!startKeyToken) {
            return;
        }

        dragSelectionRef.current = {
            pointerId: event.pointerId,
            startY: event.clientY,
            startKeyToken,
            preserveSelection: Boolean(event.ctrlKey || event.metaKey),
            active: false,
            lastRangeToken: "",
        };
    };

    const handleDragSelectionPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragSelectionRef.current;
        if (!enableDragSelection || !drag || drag.pointerId !== event.pointerId) {
            return;
        }

        if (!drag.active && Math.abs(event.clientY - drag.startY) < 5) {
            return;
        }

        const target = document.elementFromPoint(event.clientX, event.clientY);
        const rowElement = getSelectionRowElement(target);
        const targetKeyToken = rowElement?.dataset.baseGridSelectionKey;
        const component = gridInstanceRef.current;
        if (!targetKeyToken || !component) {
            return;
        }

        const visibleKeys = (component.getVisibleRows?.() ?? [])
            .filter((row) => (row as { rowType?: string }).rowType === "data")
            .map((row) => (row as { key?: unknown }).key)
            .filter((key): key is string | number => typeof key === "string" || typeof key === "number");
        const startIndex = visibleKeys.findIndex((key) => selectionKeyToken(key) === drag.startKeyToken);
        const targetIndex = visibleKeys.findIndex((key) => selectionKeyToken(key) === targetKeyToken);
        if (startIndex < 0 || targetIndex < 0) {
            return;
        }

        const firstIndex = Math.min(startIndex, targetIndex);
        const lastIndex = Math.max(startIndex, targetIndex);
        const rangeKeys = visibleKeys.slice(firstIndex, lastIndex + 1);
        const rangeToken = rangeKeys.map(selectionKeyToken).join("|");
        drag.active = true;
        event.preventDefault();
        if (!event.currentTarget.hasPointerCapture(event.pointerId)) {
            event.currentTarget.setPointerCapture(event.pointerId);
        }

        if (rangeToken !== drag.lastRangeToken) {
            drag.lastRangeToken = rangeToken;
            component.selectRows(rangeKeys as never[], drag.preserveSelection);
        }
    };

    const finishDragSelection = (event: React.PointerEvent<HTMLDivElement>) => {
        const drag = dragSelectionRef.current;
        if (!drag || drag.pointerId !== event.pointerId) {
            return;
        }
        dragSelectionRef.current = null;
        if (drag.active) {
            suppressClickAfterDragRef.current = true;
            window.setTimeout(() => {
                suppressClickAfterDragRef.current = false;
            }, 0);
            if (event.currentTarget.hasPointerCapture(event.pointerId)) {
                event.currentTarget.releasePointerCapture(event.pointerId);
            }
        }
    };

    const handleRowPreparedInternal = (event: RowPreparedEvent<T>) => {
        if (enableDragSelection && event.rowType === "data") {
            const dxElement = event.rowElement as unknown as HTMLElement & { 0?: HTMLElement; get?: (index: number) => HTMLElement };
            const rowNode = dxElement instanceof HTMLElement ? dxElement : dxElement[0] ?? dxElement.get?.(0);
            rowNode?.setAttribute("data-base-grid-selection-key", selectionKeyToken(event.key));
        }
        onRowPrepared?.(event);
    };

    const handleCellClickInternal = (e: CellClickEvent) => {
        if (suppressClickAfterDragRef.current) {
            suppressClickAfterDragRef.current = false;
            e.event?.preventDefault();
            return;
        }
        onCellClick?.(e);
        if (e.rowType !== "data" || selectMode !== "multiple") {
            return;
        }

        const columnCommand = (e.column as { command?: string } | undefined)?.command;
        const columnType = e.column?.type;
        const isSelectionColumn = columnType === "selection" || columnCommand === "select";
        const isCommandColumn = columnType === "buttons";
        const clickTarget = e.event?.target instanceof Element ? e.event.target : null;
        const clickedSelectionControl = Boolean(clickTarget?.closest(".dx-command-select, .dx-select-checkbox"));

        if (isCommandColumn || e.key === undefined || e.key === null) {
            return;
        }

        if (isSelectionColumn || clickedSelectionControl) return;

        // DevExtreme may expose either the browser event or a wrapped event.
        // Read the modifier from both so Ctrl/Cmd selection works on row cells.
        const clickEvent = e.event as (MouseEvent & { originalEvent?: MouseEvent }) | undefined;
        const nativeEvent = clickEvent?.originalEvent ?? clickEvent;
        const modifierPressed = enableModifierSelection && Boolean(nativeEvent?.ctrlKey || nativeEvent?.metaKey);
        if (modifierPressed) {
            const selectedKeys = e.component.getSelectedRowKeys?.() ?? [];
            const isAlreadySelected = selectedKeys.some((key) => key === e.key);
            nativeEvent?.preventDefault?.();
            if (isAlreadySelected) {
                e.component.deselectRows([e.key]);
            } else {
                e.component.selectRows([e.key], true);
            }
            return;
        }

        e.component.selectRows([e.key], false);
    };

    const handleContextMenuPreparingInternal = (e: ContextMenuPreparingEvent) => {
        if (e.row && e.row.rowType === "data") {
            const items: Array<{ text: string; onItemClick: () => void }> = [
                {
                    text: t('UpdateMsg', 'Update'),
                    onItemClick: () => {
                        if (onContextMenuUpdate && e.row?.data) {
                            onContextMenuUpdate(e.row.data as T)
                        } else {
                            e.component?.editRow(e.row!.rowIndex)
                        }
                    },
                },
                {
                    text: t('btndelete', 'Delete'),
                    onItemClick: () => {
                        if (onContextMenuDelete && e.row?.data) {
                            onContextMenuDelete(e.row.data as T)
                            return
                        }
                        e.component?.deleteRow(e.row!.rowIndex);
                    },
                },
            ];
            items.push({
                text: t('btn_copy', 'Copy'),
                onItemClick: () => {
                    if (e.row?.data) {
                        if (onContextMenuCopy) {
                            onContextMenuCopy(e.row.data as T);
                            return;
                        }

                        const clone = { ...(e.row.data as Record<string, unknown>) };
                        if (keyExpr) stripFields(clone, [keyExpr]);
                        if (copyExcludeFields && copyExcludeFields.length) stripFields(clone, copyExcludeFields);
                        copyDataRef.current = clone;
                        e.component?.addRow();
                    }
                },
            });
            e.items = items;
        }
        onContextMenuPreparing && onContextMenuPreparing(e);
    };

    return (
        <MasterPopupValidationContext.Provider value={popupValidation}>
        <div
            className={`data-grid-container relative h-full w-full${emptyAddAvailable && isGridEmpty ? " data-grid-container--empty-add" : ""}`}
            onPointerDown={handleDragSelectionPointerDown}
            onPointerMove={handleDragSelectionPointerMove}
            onPointerUp={finishDragSelection}
            onPointerCancel={finishDragSelection}
        >
            <DataGrid
                key={gridRemountKey}
                loadPanel={{ enabled: loadPanelEnabled }}
                dataSource={dataSource}
                noDataText={emptyAddAvailable ? " " : translate("NO_DATA", "Không có dữ liệu")}
                {...gridKeyExprProps}
                width="100%"
                height="100%"
                onSelectionChanged={onSelectionChanged}
                showBorders
                columnAutoWidth={!hasConfiguredColumnWidths}
                showColumnHeaders={true}
                allowColumnResizing={true}
                columnResizingMode="widget"
                allowColumnReordering={true}
                focusedRowEnabled={focusRowEnabled}
                autoNavigateToFocusedRow={focusRowEnabled ? autoNavigateToFocusedRow : false}
                hoverStateEnabled
                wordWrapEnabled={wordWrapEnabled}
                keyboardNavigation={keyboardNavigation}
                remoteOperations={remoteOperations}
                rowAlternationEnabled
                onFocusedRowChanged={onFocusedRowChanged}
                onRowDblClick={onRowDblClick}
                onInitialized={(e) => {
                    const comp = (e.component ?? null) as GridComponentInstance | null;
                    gridInstanceRef.current = comp;
                    columnSettingState.bindGridComponent(comp);
                    popupValidation.bind(comp);
                    installGridHelpers(comp);
                    onInitialized?.(e);
                    refreshEmptyAddState(comp);
                    applyGridEditingTexts(comp);
                }}
                onContentReady={handleContentReady}
                onCellPrepared={(event: CellPreparedEvent) => {
                    applyHeaderFieldNameTooltip(event);
                }}
                onRowPrepared={handleRowPreparedInternal}
                defaultSelectedRowKeys={defaultSelectedRowKeys}
                onToolbarPreparing={(e) => {
                    handleToolbarPreparingDefault(e);
                    onToolbarPreparing?.(e);
                }}
                onContextMenuPreparing={handleContextMenuPreparingInternal}
                onRowInserting={onRowInserting}
                onRowUpdating={onRowUpdating}
                onRowRemoving={onRowRemoving}
                onSaving={(event: SavingEvent) => {
                    const flushPromise = flushActiveEditorValue(document.activeElement);
                    onSaving?.(event);
                    const savePromise = event.promise;
                    event.promise = savePromise
                        ? Promise.all([flushPromise, savePromise]).then(() => undefined)
                        : flushPromise;
                }}
                onEditingStart={onEditingStart}
                onEditCanceled={onEditCanceled}
                onOptionChanged={onOptionChanged}
                onRowInserted={onRowInserted}
                onRowUpdated={onRowUpdated}
                onRowRemoved={onRowRemoved}
                onEditorPreparing={onEditorPreparing}
                onCellClick={handleCellClickInternal}
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
                {showGridFilters ? (
                    <>
                        <HeaderFilter visible />
                        <FilterRow showOperationChooser />
                        <FilterPanel />
                        <FilterBuilderPopup />
                    </>
                ) : null}

                <Selection
                    mode={selectMode}
                    selectAllMode={selectAllMode}
                    showCheckBoxesMode="always"
                    selectByClick={selectMode === "single" ? selectByClick : false}
                />
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

                <Paging enabled={pagingEnabled} {...pagingProps} />
                {showPager ? (
                    <Pager
                        visible={true}
                        showPageSizeSelector={showPageSizeSelector}
                        allowedPageSizes={allowedPageSizes}
                        showInfo={true}
                        showNavigationButtons={true}
                        infoText={t("PAGE_TEXT", "Page {0} / {1} ({2} rows)")}
                    />
                ) : null}

                {renderedChildren}

            </DataGrid>
            {emptyAddAvailable && isGridEmpty ? (
                <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center px-4">
                    <div className="pointer-events-auto">
                        <GridEmptyAddButton
                            label={t("lblAddNew", "Thêm mới")}
                            onClick={handleEmptyAddClick}
                            title={t("NO_DATA_TITLE", "Chưa có dữ liệu")}
                            description={t("NO_DATA_HINT", "Nhấn nút bên dưới để thêm mới")}
                        />
                    </div>
                </div>
            ) : null}
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
