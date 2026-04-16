import React, { useCallback, useContext, useMemo, useRef, useState } from "react";
import { Toolbar, Button } from "devextreme-react";
import DateBox from "devextreme-react/date-box";
import TextBox from "devextreme-react/text-box";
import { Item } from "devextreme-react/toolbar";
import type dxDataGrid from "devextreme/ui/data_grid";
import { confirm } from "devextreme/ui/dialog";
import { LanguageContext } from '@/lib/i18nLoader';
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup";
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

export type ToolbarCustomItem = {
  key?: string;
  icon?: string;
  text?: string;
  hint?: string;
  type?: 'default' | 'normal' | 'danger';
  stylingMode?: 'contained' | 'text' | 'outlined';
  showText?: 'always' | 'inMenu' | 'none';
  disabled?: boolean;
  onClick?: () => void;
};

export type GridToolbarProps = {
  title?: string;
  titleKey?: string;

  gridRef: React.RefObject<dxDataGrid | null>;

  onAdd?: () => void;
  onRefresh?: () => void;

  onExportPdf?: () => void;
  onExportXlsx?: () => void;
  onImport?: () => void;
  onDelete?: () => void;
  onRangeSearch?: () => void;
  onOpenColumnSettings?: () => void;
  fromDate?: Date | null;
  toDate?: Date | null;
  onFromDateChange?: (value: Date | null) => void;
  onToDateChange?: (value: Date | null) => void;
  showDateRange?: boolean;
  customItems?: ToolbarCustomItem[];

  showAdd?: boolean;
  showRefresh?: boolean;
  showColumnChooser?: boolean;
  showExportPdf?: boolean;
  showExportXlsx?: boolean;
  showImport?: boolean;
  showDelete?: boolean;
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
  customItems,
  showAdd = true,
  showRefresh = true,
  showColumnChooser = true,
  showExportPdf = true,
  showExportXlsx = true,
  showImport = true,
  showDelete = true,
  showSearch = true,
  onSearchStateChange,
  shortcutsEnabled = true,
  additionalShortcutActions,
  additionalShortcutHandlers,
  additionalShortcutOptions,
}: GridToolbarProps) {
  const { translate } = useContext(LanguageContext) as { translate?: (k: string, f?: string) => string };
  const label = titleKey ? (translate ? translate(titleKey, title) : title) : title;
  const renderLabel = () => <div className="toolbar-label">{label}</div>;
  const [searchText, setSearchText] = useState("");
  const searchContainerRef = useRef<HTMLDivElement | null>(null);
  const dateRangeContainerRef = useRef<HTMLDivElement | null>(null);

  const focusFirstInput = useCallback((container: HTMLElement | null) => {
    const input = container?.querySelector("input.dx-texteditor-input, input") as HTMLInputElement | null;
    input?.focus();
    input?.select?.();
  }, []);

  const getPrimaryRowIndex = useCallback(() => {
    const focusedRowKey = (gridRef.current as any)?.option?.("focusedRowKey");
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

  const executeGridInstanceHelper = useCallback((helperName: "__openFocusedOrSelectedRow" | "__duplicateFocusedOrSelectedRow" | "__openColumnSettings") => {
    const helper = (gridRef.current as any)?.[helperName];
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

    if (showSearch || showDateRange) {
      actions.push(SHORTCUT_ACTIONS.QUICK_SEARCH)
    }

    if (showDateRange) {
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
    ;(gridRef.current as any)?.closeEditCell?.()
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
    focusFirstInput(dateRangeContainerRef.current);
  }, [focusFirstInput]);

  const handlePrint = useCallback(() => {
    onExportPdf?.();
  }, [onExportPdf]);

  const updateSearchFilterVisibility = useCallback((value: string) => {
    const active = syncGridSearchState(gridRef.current, value);
    onSearchStateChange?.(value, active);
  }, [gridRef, onSearchStateChange]);

  const handleSearchTextChange = useCallback((value: string) => {
    setSearchText(value);
    updateSearchFilterVisibility(value);
  }, [gridRef, updateSearchFilterVisibility]);

  const handleRangeSearchClick = () => {
    if (onRangeSearch) {
      onRangeSearch();
      return;
    }
  };

  const handleDateBoxKeyDown = (event: React.KeyboardEvent | React.KeyboardEvent<HTMLInputElement> | { event?: KeyboardEvent; key?: string }) => {
    const key =
      (event as React.KeyboardEvent<HTMLInputElement>).key ||
      ((event as { event?: KeyboardEvent }).event?.key ?? (event as { key?: string }).key);

    if (key === "Enter") {
      handleRangeSearchClick();
    }
  };

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
    gridRef.current?.option('editing.confirmDelete', false);
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
      onExportPdf,
      onExportXlsx,
      onOpenColumnSettings,
      onImport,
      openShortcutHelp,
      shortcutActions,
    ],
  )

  useShortcutBindings(shortcutBindings, { enabled: shortcutsEnabled })

  return (
    <>
      <Toolbar className="my-toolbar">
        <Item location="before" locateInMenu="never" render={renderLabel} />

      {showAdd && (
        <Item location="after" widget="dxButton" locateInMenu="auto">
          <Button
            type="default"
            stylingMode="contained"
            onClick={handleAdd}
            icon="plus"
                      hint={translate ? translate('lblAddNew', 'Add') : 'Add'}
                      text={translate ? translate('lblAddNew', 'Add') : 'Add'}
          />
        </Item>
      )}

      {showDateRange ? (
        <Item location="after" locateInMenu="auto">
          <div ref={dateRangeContainerRef} className="flex items-center gap-2">
            <DateBox
              width={160}
              value={fromDate}
              displayFormat="dd/MM/yyyy"
              pickerType="calendar"
              placeholder={translate ? translate('MSG_FROMDATE', 'From') : 'From'}
              onValueChanged={(e) => onFromDateChange?.((e.value as Date) ?? null)}
              onKeyDown={handleDateBoxKeyDown}
              inputAttr={{ onKeyDown: handleDateBoxKeyDown }}
            />
            <DateBox
              width={160}
              value={toDate}
              displayFormat="dd/MM/yyyy"
              pickerType="calendar"
              placeholder={translate ? translate('MSG_TODATE', 'To') : 'To'}
              onValueChanged={(e) => onToDateChange?.((e.value as Date) ?? null)}
              onKeyDown={handleDateBoxKeyDown}
              inputAttr={{ onKeyDown: handleDateBoxKeyDown }}
            />
            <div ref={searchContainerRef}>
              <TextBox
                width={260}
                mode="search"
                stylingMode="outlined"
                value={searchText}
                showClearButton={true}
                placeholder={translate ? translate("Search...", "Search...") : "Search..."}
                onValueChanged={(e) => handleSearchTextChange(String(e.value ?? ""))}
                onEnterKey={() => updateSearchFilterVisibility(searchText)}
              />
            </div>
            <Button
              stylingMode="text"
              onClick={handleRangeSearchClick}
              icon="search"
              hint={translate ? translate('MSG_BTNSER', 'Search') : 'Search'}
            />
          </div>
        </Item>
      ) : showSearch ? (
        <Item location="after" locateInMenu="never">
          <div ref={searchContainerRef}>
            <TextBox
              width={260}
              mode="search"
              stylingMode="outlined"
              value={searchText}
              showClearButton={true}
              placeholder={translate ? translate("Search...", "Search...") : "Search..."}
              onValueChanged={(e) => handleSearchTextChange(String(e.value ?? ""))}
              onEnterKey={() => updateSearchFilterVisibility(searchText)}
            />
          </div>
        </Item>
      ) : null}

      {showRefresh && (
        <Item location="after" widget="dxButton" showText="inMenu" locateInMenu="auto">
          <Button
            stylingMode="text"
            onClick={handleRefresh}
            icon="refresh"
            hint={translate ? translate('MSG_BTNREFRESH', 'Refresh') : 'Refresh'}
            text={translate ? translate('MSG_BTNREFRESH', 'Refresh') : 'Refresh'}
          />
        </Item>
      )}

      {showColumnChooser && (
        <Item location="after" widget="dxButton" showText="inMenu" locateInMenu="auto">
          <Button
            stylingMode="text"
            onClick={handleColumnChooser}
            icon="columnchooser"
            hint={translate ? translate('AUDIT_SETTING_SHOW_HIDE', 'Column Settings') : 'Column Settings'}
            text={translate ? translate('AUDIT_SETTING_SHOW_HIDE', 'Column Settings') : 'Column Settings'}
          />
        </Item>
      )}

      {(showDelete || showImport || showExportPdf || showExportXlsx) && (
        <Item location="after" locateInMenu="auto">
          <div className="separator" />
        </Item>
      )}

      {customItems?.map((item, index) => (
        <Item
          key={item.key ?? index}
          location="after"
          widget="dxButton"
          showText={item.showText ?? "inMenu"}
          locateInMenu="auto"
          options={{
            icon: item.icon,
            text: item.text,
            hint: item.hint,
            type: item.type,
            stylingMode: item.stylingMode,
            disabled: item.disabled,
            onClick: item.onClick,
          }}
        />
      ))}

      {showDelete && (
        <Item location="after" widget="dxButton" showText="inMenu" locateInMenu="auto">
          <Button
            stylingMode="text"
            type="danger"
            onClick={handleDelete}
            icon="trash"
            hint={translate ? translate('MSG_BTNDELETE', 'Delete selected') : 'Delete selected'}
            text={translate ? translate('MSG_BTNDELETE', 'Delete selected') : 'Delete selected'}
          />
        </Item>
      )}

      {showImport && (
        <Item location="after" widget="dxButton" showText="inMenu" locateInMenu="auto">
          <Button
            stylingMode="text"
            onClick={onImport}
            icon="upload"
            hint={translate ? translate('MSG_BTNIMPORTEXCEL', 'Import from Excel') : 'Import from Excel'}
            text={translate ? translate('MSG_BTNIMPORTEXCEL', 'Import from Excel') : 'Import from Excel'}
          />
        </Item>
      )}

      {showExportPdf && (
        <Item location="after" widget="dxButton" showText="inMenu" locateInMenu="auto">
          <Button
            stylingMode="text"
            onClick={onExportPdf}
            icon="exportpdf"
            hint={translate ? translate('EXPORT_PDF_FILE', 'Export PDF') : 'Export PDF'}
            text={translate ? translate('EXPORT_PDF_FILE', 'Export PDF') : 'Export PDF'}
          />
        </Item>
      )}

      {showExportXlsx && (
        <Item location="after" widget="dxButton" showText="inMenu" locateInMenu="auto">
          <Button
            stylingMode="text"
            onClick={onExportXlsx}
            icon="download"
            hint={translate ? translate('MSG_BTNEXPORT', 'Export Excel') : 'Export Excel'}
            text={translate ? translate('MSG_BTNEXPORT', 'Export Excel') : 'Export Excel'}
          />
        </Item>
      )}
      </Toolbar>
      <ShortcutHelpPopup
        visible={shortcutHelpVisible}
        shortcuts={shortcutHelpItems}
        onClose={closeShortcutHelp}
      />
    </>
  );
}
