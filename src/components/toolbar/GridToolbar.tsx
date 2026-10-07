import React, { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { Button } from "devextreme-react";
import TextBox from "devextreme-react/text-box";
import type dxDataGrid from "devextreme/ui/data_grid";
import type dxTreeList from "devextreme/ui/tree_list";
import { confirm } from "devextreme/ui/dialog";
import DateRangeBox from "@/components/toolbar/DateRangeBox";
import { LanguageContext } from '@/lib/i18nLoader';
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup";
import { setGridToolbarAddHandler } from "@/components/datagrid/gridToolbarAddBridge";
import { syncGridSearchState } from "@/components/datagrid/gridSearch";
import useShortcutBindings from "@/hooks/useShortcutBindings";
import useShortcutHelp from "@/hooks/useShortcutHelp";
import {
  createShortcutBindings,
  type ShortcutBinding,
  type ShortcutHandler,
} from "@/lib/shortcuts/shortcutBindings";
import {
  SHORTCUT_ACTIONS,
  type ShortcutActionCode,
} from "@/lib/shortcuts/shortcutDefinitions";
import { SHORTCUT_KEYS } from "@/lib/shortcuts/shortcutKeys";
import { matchesShortcutEvent } from "@/lib/shortcuts/shortcutUtils";
import { hasVisiblePopupWrapper, isTopMostPopupShortcutScoped } from "@/lib/popupShortcutScope";
import "./PageToolbar.scss";

const TOOLBAR_FIELD = "page-toolbar__field";

type GridToolbarHelperName =
  | "__openFocusedOrSelectedRow"
  | "__duplicateFocusedOrSelectedRow"
  | "__openColumnSettings"

type GridToolbarInstance = (dxDataGrid | dxTreeList) & Partial<Record<GridToolbarHelperName, () => boolean>>

type GridOptionHost = {
  option?: {
    (name: string): unknown
    (name: string, value: unknown): void
  }
}

const readGridOption = (component: GridToolbarInstance | null | undefined, name: string) =>
  (component as GridOptionHost | null | undefined)?.option?.(name)

const writeGridOption = (component: GridToolbarInstance | null | undefined, name: string, value: unknown) => {
  (component as GridOptionHost | null | undefined)?.option?.(name, value)
}

export type ToolbarCustomItem = {
  key?: string;
  icon?: string;
  text?: string;
  hint?: string;
  type?: 'default' | 'normal' | 'danger';
  stylingMode?: 'contained' | 'text' | 'outlined';
  showText?: 'always' | 'inMenu' | 'none';
  disabled?: boolean;
  visible?: boolean;
  onClick?: (event?: MouseEvent) => void;
};

export type GridToolbarProps = {
  title?: string;
  titleKey?: string;

  gridRef: React.RefObject<GridToolbarInstance | null>;

  onAdd?: () => void;
  onRefresh?: () => void;

  onExportPdf?: () => void;
  onExportXlsx?: () => void;
  onImport?: () => void;
  onDelete?: () => void;
  onRangeSearch?: (searchText?: string) => void;
  onOpenColumnSettings?: () => void;
  fromDate?: Date | null;
  toDate?: Date | null;
  onFromDateChange?: (value: Date | null) => void;
  onToDateChange?: (value: Date | null) => void;
  showDateRange?: boolean;
  /** Shows a filter icon that toggles the page-level advanced search panel. */
  showAdvancedSearchToggle?: boolean;
  advancedSearchOpen?: boolean;
  onToggleAdvancedSearch?: () => void;
  customItems?: ToolbarCustomItem[];
  afterAddItems?: ToolbarCustomItem[];
  searchLeadingContent?: React.ReactNode;
  onSearchSubmit?: () => void;

  showAdd?: boolean;
  showRefresh?: boolean;
  showColumnChooser?: boolean;
  showExportPdf?: boolean;
  showExportXlsx?: boolean;
  showImport?: boolean;
  showDelete?: boolean;
  deleteDisabled?: boolean;
  /** Client-only search panel over the rows currently loaded in the grid. */
  showSearch?: boolean;
  onSearchStateChange?: (value: string, active: boolean) => void;
  shortcutsEnabled?: boolean;
  additionalShortcutActions?: ShortcutActionCode[];
  additionalShortcutHandlers?: Partial<Record<ShortcutActionCode, ShortcutHandler>>;
  additionalShortcutOptions?: Partial<Record<ShortcutActionCode, Omit<ShortcutBinding, "action" | "handler">>>;
};

export function GridToolbar({
  title = "",
  titleKey,
  gridRef,
  onAdd,
  onRefresh,
  onExportPdf,
  onExportXlsx,
  onImport,
  onDelete,
  onRangeSearch,
  onOpenColumnSettings,
  fromDate = null,
  toDate = null,
  onFromDateChange,
  onToDateChange,
  showDateRange = false,
  showAdvancedSearchToggle = false,
  advancedSearchOpen = false,
  onToggleAdvancedSearch,
  customItems,
  afterAddItems,
  searchLeadingContent,
  onSearchSubmit,
  showAdd = true,
  showRefresh = true,
  showColumnChooser = true,
  showExportPdf = true,
  showExportXlsx = true,
  showImport = true,
  showDelete = true,
  deleteDisabled = false,
  showSearch = true,
  onSearchStateChange,
  shortcutsEnabled = true,
  additionalShortcutActions,
  additionalShortcutHandlers,
  additionalShortcutOptions,
}: GridToolbarProps) {
  const { translate } = useContext(LanguageContext) as { translate?: (k: string, f?: string) => string };
  const label = titleKey ? (translate ? translate(titleKey, title) : title) : title;
  const [panelSearchText, setPanelSearchText] = useState("");
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const dateRangeContainerRef = useRef<HTMLDivElement | null>(null);

  const focusFirstInput = useCallback((container: HTMLElement | null) => {
    const input = container?.querySelector("input.dx-texteditor-input, input") as HTMLInputElement | null;
    input?.focus();
    input?.select?.();
  }, []);

  const getPrimaryRowIndex = useCallback(() => {
    const focusedRowKey = readGridOption(gridRef.current, "focusedRowKey");
    if (focusedRowKey !== undefined && focusedRowKey !== null) {
      const focusedIndex = gridRef.current?.getRowIndexByKey?.(focusedRowKey);
      if (typeof focusedIndex === "number" && focusedIndex >= 0) {
        return focusedIndex;
      }
    }

    const selectedKeys = (gridRef.current?.getSelectedRowKeys?.() ?? []) as unknown[];
    const primaryKey = selectedKeys[0];
    if (primaryKey === undefined || primaryKey === null) {
      return -1;
    }

    const selectedIndex = gridRef.current?.getRowIndexByKey?.(primaryKey);
    return typeof selectedIndex === "number" ? selectedIndex : -1;
  }, [gridRef]);

  const executeGridInstanceHelper = useCallback((helperName: GridToolbarHelperName) => {
    const helper = gridRef.current?.[helperName];
    if (typeof helper !== "function") {
      return false;
    }

    return helper() === true;
  }, [gridRef]);

  const shortcutActions = useMemo(() => {
    const actions = [
      SHORTCUT_ACTIONS.SAVE,
      SHORTCUT_ACTIONS.CLOSE,
      SHORTCUT_ACTIONS.HELP,
    ] as ShortcutActionCode[]

    if (showAdd) {
      actions.push(SHORTCUT_ACTIONS.ADD_ROW, SHORTCUT_ACTIONS.DUPLICATE)
    }

    if (showRefresh) {
      actions.push(SHORTCUT_ACTIONS.REFRESH)
    }

    actions.push(SHORTCUT_ACTIONS.OPEN, SHORTCUT_ACTIONS.EDIT)

    if (showColumnChooser) {
      actions.push(SHORTCUT_ACTIONS.COLUMN_CHOOSER)
    }

    if (showDelete) {
      actions.push(SHORTCUT_ACTIONS.DELETE)
    }

    if (showImport && onImport) {
      actions.push(SHORTCUT_ACTIONS.IMPORT)
    }

    if (showExportPdf && onExportPdf) {
      actions.push(SHORTCUT_ACTIONS.EXPORT_PDF, SHORTCUT_ACTIONS.PRINT)
    }

    if (showExportXlsx && onExportXlsx) {
      actions.push(SHORTCUT_ACTIONS.EXPORT_EXCEL)
    }

    if (showSearch) {
      actions.push(SHORTCUT_ACTIONS.QUICK_SEARCH)
    }

    if (showDateRange || showAdvancedSearchToggle) {
      actions.push(SHORTCUT_ACTIONS.ADVANCED_VOUCHER_SEARCH)
    }

    if (additionalShortcutActions?.length) {
      actions.push(...additionalShortcutActions)
    }

    return Array.from(new Set(actions))
  }, [
    additionalShortcutActions,
    onExportPdf,
    onExportXlsx,
    onImport,
    showAdd,
    showAdvancedSearchToggle,
    showColumnChooser,
    showDateRange,
    showDelete,
    showExportPdf,
    showExportXlsx,
    showImport,
    showRefresh,
    showSearch,
  ])
  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions)

  const handleAdd = () => {
    if (onAdd) return onAdd();
    gridRef.current?.addRow();
  };

  const handleAddRef = useRef(handleAdd);
  handleAddRef.current = handleAdd;

  useEffect(() => {
    let disposed = false;
    let lastGrid: object | null = null;

    const sync = () => {
      if (disposed) {
        return;
      }

      const grid = gridRef.current;
      if (grid === lastGrid) {
        return;
      }

      if (lastGrid) {
        setGridToolbarAddHandler(lastGrid, null);
      }

      lastGrid = grid;
      if (!grid) {
        return;
      }

      setGridToolbarAddHandler(
        grid,
        showAdd ? () => handleAddRef.current() : null,
      );
    };

    sync();
    const timerId = window.setInterval(sync, 200);

    return () => {
      disposed = true;
      window.clearInterval(timerId);
      if (lastGrid) {
        setGridToolbarAddHandler(lastGrid, null);
      }
      setGridToolbarAddHandler(gridRef.current, null);
    };
  }, [gridRef, showAdd]);

  const handleRefresh = () => {
    if (onRefresh) return onRefresh();
  };

  const handleColumnChooser = () => {
    if (onOpenColumnSettings) {
      onOpenColumnSettings();
      return;
    }

    executeGridInstanceHelper("__openColumnSettings");
  };

  const handleSave = useCallback(() => {
    void gridRef.current?.saveEditData?.()
  }, [gridRef])

  const handleClose = useCallback(() => {
    gridRef.current?.cancelEditData?.()
    gridRef.current?.closeEditCell?.()
  }, [gridRef])

  const handleOpen = useCallback(() => {
    if (executeGridInstanceHelper("__openFocusedOrSelectedRow")) {
      return;
    }

    const rowIndex = getPrimaryRowIndex();
    if (rowIndex >= 0) {
      gridRef.current?.editRow?.(rowIndex);
    }
  }, [executeGridInstanceHelper, getPrimaryRowIndex, gridRef]);

  const handleEdit = useCallback(() => {
    handleOpen();
  }, [handleOpen]);

  const handleDuplicate = useCallback(() => {
    if (executeGridInstanceHelper("__duplicateFocusedOrSelectedRow")) {
      return;
    }

    const rowIndex = getPrimaryRowIndex();
    if (rowIndex >= 0) {
      gridRef.current?.editRow?.(rowIndex);
    }
  }, [executeGridInstanceHelper, getPrimaryRowIndex, gridRef]);

  const handleQuickSearch = useCallback(() => {
    focusFirstInput(searchContainerRef.current);
  }, [focusFirstInput]);

  const handleAdvancedSearch = useCallback(() => {
    if (showAdvancedSearchToggle && onToggleAdvancedSearch) {
      onToggleAdvancedSearch();
      return;
    }

    focusFirstInput(dateRangeContainerRef.current);
  }, [focusFirstInput, onToggleAdvancedSearch, showAdvancedSearchToggle]);

  const handlePrint = useCallback(() => {
    onExportPdf?.();
  }, [onExportPdf]);

  const updatePanelSearch = useCallback((value: string) => {
    const active = syncGridSearchState(gridRef.current, value);
    onSearchStateChange?.(value, active);
  }, [gridRef, onSearchStateChange]);

  const handlePanelSearchTextChange = useCallback((value: string) => {
    setPanelSearchText(value);
    updatePanelSearch(value);
  }, [updatePanelSearch]);

  const handleRangeSearchClick = useCallback(() => {
    onRangeSearch?.();
  }, [onRangeSearch]);

  const handleSearchSubmitClick = useCallback(() => {
    updatePanelSearch(panelSearchText);
    onSearchSubmit?.();
  }, [onSearchSubmit, panelSearchText, updatePanelSearch]);

  const performGridDelete = () => {
    const keys = (gridRef.current?.getSelectedRowKeys() ?? []) as unknown[];
    keys.forEach((key) => {
      const idx = gridRef.current?.getRowIndexByKey(key);
      if (idx !== undefined && idx !== -1) {
        gridRef.current?.deleteRow(idx);
      }
    });
  };

  const handleDelete = async () => {
    if (deleteDisabled) {
      return;
    }
    writeGridOption(gridRef.current, "editing.confirmDelete", false);
    if (onDelete) {
      onDelete();
      return;
    }
    const confirmText =
      translate
        ? translate(
            'MSG_CONFIRM_DELETE_ROWS',
            'Are you sure you want to delete the selected rows?',
          )
        : 'Are you sure you want to delete the selected rows?';
    const confirmTitle = translate ? translate('MSG_BTNOK', 'Confirm') : 'Confirm';
    const isConfirmed = await confirm(confirmText, confirmTitle);
    if (isConfirmed) {
      performGridDelete();
    }
  };

  const shortcutBindings = useMemo(
    () => {
      const builtInHandlers: Partial<Record<ShortcutActionCode, ShortcutHandler>> = {
        [SHORTCUT_ACTIONS.SAVE]: () => handleSave(),
        [SHORTCUT_ACTIONS.CLOSE]: () => handleClose(),
        [SHORTCUT_ACTIONS.OPEN]: () => handleOpen(),
        [SHORTCUT_ACTIONS.EDIT]: () => handleEdit(),
        [SHORTCUT_ACTIONS.DELETE]: () => {
          void handleDelete()
        },
        [SHORTCUT_ACTIONS.ADD_ROW]: () => handleAdd(),
        [SHORTCUT_ACTIONS.DUPLICATE]: () => handleDuplicate(),
        [SHORTCUT_ACTIONS.REFRESH]: () => handleRefresh(),
        [SHORTCUT_ACTIONS.COLUMN_CHOOSER]: () => handleColumnChooser(),
        [SHORTCUT_ACTIONS.QUICK_SEARCH]: () => handleQuickSearch(),
        [SHORTCUT_ACTIONS.ADVANCED_VOUCHER_SEARCH]: () => handleAdvancedSearch(),
        [SHORTCUT_ACTIONS.IMPORT]: () => onImport?.(),
        [SHORTCUT_ACTIONS.PRINT]: () => handlePrint(),
        [SHORTCUT_ACTIONS.EXPORT_PDF]: () => onExportPdf?.(),
        [SHORTCUT_ACTIONS.EXPORT_EXCEL]: () => onExportXlsx?.(),
        [SHORTCUT_ACTIONS.HELP]: () => openShortcutHelp(),
      }

      return createShortcutBindings(
        shortcutActions,
        {
          ...builtInHandlers,
          ...additionalShortcutHandlers,
        },
        {
          [SHORTCUT_ACTIONS.QUICK_SEARCH]: { allowInInput: true },
          [SHORTCUT_ACTIONS.ADVANCED_VOUCHER_SEARCH]: { allowInInput: true },
          [SHORTCUT_ACTIONS.DELETE]: { enabled: !deleteDisabled },
          ...additionalShortcutOptions,
        },
      )
    },
    [
      additionalShortcutHandlers,
      additionalShortcutOptions,
      handleAdvancedSearch,
      handleAdd,
      handleClose,
      handleColumnChooser,
      handleDelete,
      handleDuplicate,
      handleEdit,
      handleOpen,
      handlePrint,
      handleQuickSearch,
      handleRefresh,
      handleSave,
      deleteDisabled,
      onExportPdf,
      onExportXlsx,
      onOpenColumnSettings,
      onImport,
      openShortcutHelp,
      shortcutActions,
    ],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: shortcutsEnabled,
    shouldHandleEvent: (event) => {
      if (!hasVisiblePopupWrapper()) {
        return true
      }

      // Custom popups (customer, voucher, fixed-asset, ...) register their own scope
      // and handle shortcuts themselves — do not steal Esc/Ctrl+S/F1 from them.
      if (isTopMostPopupShortcutScoped()) {
        return false
      }

      // Unscoped MasterDataEditPopup (bank/store/product/...) — toolbar owns SAVE/CLOSE/HELP
      // because GridToolbar otherwise suppresses every shortcut while any popup is visible.
      return (
        matchesShortcutEvent(event, SHORTCUT_KEYS.SAVE) ||
        matchesShortcutEvent(event, SHORTCUT_KEYS.CLOSE) ||
        matchesShortcutEvent(event, SHORTCUT_KEYS.HELP)
      )
    },
  })

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const visibleAfterAddItems = useMemo(
    () => (afterAddItems ?? []).filter((item) => item.visible !== false),
    [afterAddItems],
  )

  const visibleCustomItems = useMemo(
    () => (customItems ?? []).filter((item) => item.visible !== false),
    [customItems],
  )

  const isTextStyleCustomItem = (item: ToolbarCustomItem) => !item.stylingMode || item.stylingMode === "text"

  const primaryCustomItems = useMemo(
    () => visibleCustomItems.filter((item) => !isTextStyleCustomItem(item)),
    [visibleCustomItems],
  )

  const iconCustomItems = useMemo(
    () => visibleCustomItems.filter((item) => isTextStyleCustomItem(item)),
    [visibleCustomItems],
  )

  const hasLeadingIconClusterButtons =
    showRefresh || showAdvancedSearchToggle || showColumnChooser || iconCustomItems.length > 0

  const showDeleteSeparator = showDelete && hasLeadingIconClusterButtons

  const showImportExportSeparator =
    (showImport || showExportPdf || showExportXlsx) && (hasLeadingIconClusterButtons || showDelete)

  return (
    <>
      <div className="page-toolbar grid-toolbar">
        <div className="page-toolbar__row">
          <div className="page-toolbar__filters">
            {label ? <div className="page-toolbar__title">{label}</div> : null}

            {showDateRange ? (
              <div ref={dateRangeContainerRef} className="page-toolbar__run-group">
                <DateRangeBox
                  fromDate={fromDate}
                  toDate={toDate}
                  fromPlaceholder={t("MSG_FROMDATE", "From Date")}
                  toPlaceholder={t("MSG_TODATE", "To Date")}
                  labelMode="floating"
                  variant="grouped"
                  onFromDateChange={onFromDateChange}
                  onToDateChange={onToDateChange}
                  onEnter={handleRangeSearchClick}
                  width={150}
                  editorClassName={TOOLBAR_FIELD}
                  className="page-toolbar__date-range flex flex-nowrap gap-2"
                />
                <Button
                  className="page-toolbar__search-btn"
                  type="default"
                  stylingMode="contained"
                  icon="search"
                  text={t("MSG_BTNSER", "Tìm kiếm")}
                  hint={t("MSG_BTNSER", "Tìm kiếm")}
                  onClick={handleRangeSearchClick}
                />
              </div>
            ) : null}
          </div>

          <div className="page-toolbar__actions">
            <div className="page-toolbar__primary-actions">
              {showAdd ? (
                <Button
                  className="page-toolbar__add-btn page-toolbar__add-btn--primary"
                  type="default"
                  stylingMode="contained"
                  icon="plus"
                  text={t("lblAddNew", "Thêm mới")}
                  hint={t("lblAddNew", "Thêm mới")}
                  onClick={handleAdd}
                />
              ) : null}

              {visibleAfterAddItems.map((item, index) => (
                <Button
                  key={item.key ?? `after-add-${index}`}
                  className="page-toolbar__add-btn page-toolbar__add-btn--link"
                  type={item.type ?? "default"}
                  stylingMode={item.stylingMode ?? "contained"}
                  showText={item.showText ?? "always"}
                  disabled={item.disabled}
                  icon={item.icon}
                  text={item.text}
                  hint={item.hint}
                  onClick={(clickEvent) => {
                    item.onClick?.(clickEvent?.event)
                  }}
                />
              ))}

              {primaryCustomItems.map((item, index) => (
                <Button
                  key={item.key ?? `custom-primary-${index}`}
                  className="page-toolbar__add-btn"
                  type={item.type}
                  stylingMode={item.stylingMode ?? "outlined"}
                  showText={item.showText}
                  disabled={item.disabled}
                  icon={item.icon}
                  text={item.text}
                  hint={item.hint ?? item.text}
                  onClick={(clickEvent) => {
                    item.onClick?.(clickEvent?.event)
                  }}
                />
              ))}
            </div>

            {showSearch ? (
              <div ref={searchContainerRef} className="page-toolbar__quick-search-group flex items-end gap-1">
                {searchLeadingContent}
                <TextBox
                  className={`${TOOLBAR_FIELD} page-toolbar__field--search page-toolbar__quick-search`}
                  width={200}
                  stylingMode="outlined"
                  label={t("FA_QUICK_SEARCH", "Tìm nhanh")}
                  labelMode="floating"
                  value={panelSearchText}
                  showClearButton
                  placeholder={t("Search...", "Tìm...")}
                  onValueChanged={(event) => handlePanelSearchTextChange(String(event.value ?? ""))}
                  onEnterKey={() => {
                    updatePanelSearch(panelSearchText)
                    onSearchSubmit?.()
                  }}
                />
                <Button
                  className="page-toolbar__search-btn page-toolbar__search-btn--inline"
                  stylingMode="text"
                  icon="search"
                  hint={t("MSG_BTNSER", "Tìm kiếm")}
                  onClick={handleSearchSubmitClick}
                />
              </div>
            ) : null}

            <div className="page-toolbar__icon-cluster">
              {showRefresh ? (
                <Button
                  className="page-toolbar__action-btn"
                  stylingMode="text"
                  icon="refresh"
                  hint={t("MSG_BTNREFRESH", "Refresh")}
                  onClick={handleRefresh}
                />
              ) : null}

              {showAdvancedSearchToggle ? (
                <Button
                  className="page-toolbar__action-btn"
                  stylingMode="text"
                  type={advancedSearchOpen ? "default" : "normal"}
                  icon="filter"
                  hint={t("ADVANCED_SEARCH", "Tìm kiếm nâng cao")}
                  onClick={() => onToggleAdvancedSearch?.()}
                />
              ) : null}

              {showColumnChooser ? (
                <Button
                  className="page-toolbar__action-btn"
                  stylingMode="text"
                  icon="columnchooser"
                  hint={t("AUDIT_SETTING_SHOW_HIDE", "Thiết lập cột hiển thị")}
                  onClick={handleColumnChooser}
                />
              ) : null}

              {iconCustomItems.map((item, index) => (
                <Button
                  key={item.key ?? `custom-icon-${index}`}
                  className="page-toolbar__action-btn"
                  type={item.type}
                  stylingMode={item.stylingMode ?? "text"}
                  showText={item.showText}
                  disabled={item.disabled}
                  icon={item.icon}
                  hint={item.hint ?? item.text}
                  onClick={(clickEvent) => {
                    item.onClick?.(clickEvent?.event)
                  }}
                />
              ))}

              {showDelete ? (
                <>
                  {showDeleteSeparator ? (
                    <span className="page-toolbar__icon-cluster-sep" aria-hidden="true" />
                  ) : null}
                  <Button
                    className="page-toolbar__action-btn"
                    stylingMode="text"
                    type="danger"
                    disabled={deleteDisabled}
                    icon="trash"
                    hint={t("MSG_BTNDELETE", "Delete selected")}
                    onClick={() => {
                      void handleDelete()
                    }}
                  />
                </>
              ) : null}

              {showImportExportSeparator ? (
                <span className="page-toolbar__icon-cluster-sep" aria-hidden="true" />
              ) : null}

              {showImport ? (
                <Button
                  className="page-toolbar__action-btn"
                  stylingMode="text"
                  icon="upload"
                  hint={t("MSG_BTNIMPORTEXCEL", "Import from Excel")}
                  onClick={onImport}
                />
              ) : null}

              {showExportPdf ? (
                <Button
                  className="page-toolbar__action-btn"
                  stylingMode="text"
                  icon="exportpdf"
                  hint={t("EXPORT_PDF_FILE", "Export PDF")}
                  onClick={onExportPdf}
                />
              ) : null}

              {showExportXlsx ? (
                <Button
                  className="page-toolbar__action-btn"
                  stylingMode="text"
                  icon="xlsxfile"
                  hint={t("MSG_BTNEXPORT", "Export Excel")}
                  onClick={onExportXlsx}
                />
              ) : null}
            </div>
          </div>
        </div>
      </div>
      <ShortcutHelpPopup
        visible={shortcutHelpVisible}
        shortcuts={shortcutHelpItems}
        onClose={closeShortcutHelp}
      />
    </>
  );
}
