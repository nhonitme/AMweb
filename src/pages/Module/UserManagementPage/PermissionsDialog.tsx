import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import TreeView from "devextreme-react/tree-view";
import type { ItemClickEvent } from "devextreme/ui/tree_view";
import Button from "devextreme-react/button";
import CheckBox from "devextreme-react/check-box";
import Popup from "devextreme-react/popup";
import SelectBox from "devextreme-react/select-box";
import TextBox from "devextreme-react/text-box";
import notify from "devextreme/ui/notify";

import type { SysCode } from "@/api/sysCodeService";
import type { MenuItem } from "@/types/menu";
import { LanguageContext } from "@/lib/i18nLoader";
import { getSysCodeDisplayText } from "@/lib/sysCodeUtils";

import { DEFAULT_USER_LEVEL, normalizeUserLevel } from "./userInfoUtils";
import {
  applyPermissionPreset,
  buildLevelDefaultSummaryFlags,
  buildPresetPermissionRow,
  createEmptyPermissionRow,
  getDescendantMenuCodes,
  mergePermissionsWithMenuTree,
  type PermissionRow,
  type PermissionRowPatch,
  type PermissionTreeRow,
  updatePermissionRowsForMenus,
} from "./permissionUtils";

export type { PermissionRow } from "./permissionUtils";

/** Accountant-facing rights (maps onto underlying CAN_* flags). */
const UI_RIGHTS = [
  {
    id: "VIEW",
    labelKey: "PERM_VIEW",
    fallback: "Xem",
    isChecked: (row: PermissionRow) => row.CAN_VIEW,
    toPatch: (value: boolean): PermissionRowPatch => ({ CAN_VIEW: value }),
  },
  {
    id: "WRITE",
    labelKey: "PERM_WRITE",
    fallback: "Ghi",
    isChecked: (row: PermissionRow) => row.CAN_ADD && row.CAN_EDIT,
    toPatch: (value: boolean): PermissionRowPatch => ({
      CAN_ADD: value,
      CAN_EDIT: value,
    }),
  },
  {
    id: "DELETE",
    labelKey: "PERM_DELETE",
    fallback: "Xóa",
    isChecked: (row: PermissionRow) => row.CAN_DELETE,
    toPatch: (value: boolean): PermissionRowPatch => ({ CAN_DELETE: value }),
  },
  {
    id: "IMPORT",
    labelKey: "PERM_IMPORT",
    fallback: "Nhập",
    isChecked: (row: PermissionRow) => row.CAN_IMPORT,
    toPatch: (value: boolean): PermissionRowPatch => ({ CAN_IMPORT: value }),
  },
  {
    id: "EXPORT",
    labelKey: "PERM_EXPORT",
    fallback: "Xuất",
    isChecked: (row: PermissionRow) => row.CAN_EXPORT && row.CAN_PRINT,
    toPatch: (value: boolean): PermissionRowPatch => ({
      CAN_EXPORT: value,
      CAN_PRINT: value,
    }),
  },
  {
    id: "APPROVE",
    labelKey: "PERM_APPROVE",
    fallback: "Duyệt",
    isChecked: (row: PermissionRow) => row.CAN_APPROVE,
    toPatch: (value: boolean): PermissionRowPatch => ({ CAN_APPROVE: value }),
  },
] as const;

type MenuTreeViewItem = {
  MENU_ID: string;
  PARENT_ID: string | null;
  MENU_CODE: string;
  text: string;
  expanded: boolean;
};

export type PermissionsDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  userLabel?: string;
  permissions: PermissionRow[];
  menuItems?: MenuItem[];
  onChange: (newPermissions: PermissionRow[]) => void;
  onSave: () => void;
  onCancel: () => void;
  canSave?: boolean;
  loading?: boolean;
  userLevel?: number | null;
  userLevelCodes?: SysCode[];
};

function FlagSummary({
  flags,
  t,
}: {
  flags: Omit<PermissionRow, "MENU_CODE">;
  t: (key: string, fallback?: string) => string;
}) {
  const summaryRow: PermissionRow = { MENU_CODE: "", ...flags };

  return (
    <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-700">
      {UI_RIGHTS.map((right) => {
        const on = right.isChecked(summaryRow);
        return (
          <span key={right.id} className="inline-flex items-center gap-1">
            <span className="text-slate-600">{t(right.labelKey, right.fallback)}</span>
            <span className={on ? "font-semibold text-emerald-700" : "font-semibold text-slate-400"}>
              {on ? "✓" : "–"}
            </span>
          </span>
        );
      })}
    </div>
  );
}

export function PermissionsDialog({
  open,
  onOpenChange,
  title,
  userLabel,
  permissions,
  menuItems = [],
  onChange,
  onSave,
  onCancel,
  canSave = false,
  loading = false,
  userLevel,
  userLevelCodes = [],
}: PermissionsDialogProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string;
  };

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback ?? key) : fallback ?? key),
    [translate],
  );

  const [presetLevel, setPresetLevel] = useState<number>(DEFAULT_USER_LEVEL);
  const [applyToChildren, setApplyToChildren] = useState(true);
  const [selectedMenuId, setSelectedMenuId] = useState<string | null>(null);
  const [menuSearch, setMenuSearch] = useState("");
  const hasSelectedInitialRef = useRef(false);

  const rows = permissions ?? [];
  const baseTitle = title || t("USER_PERMISSION_TITLE", "Phân quyền");
  const dialogTitle = userLabel ? `${baseTitle} - ${userLabel}` : baseTitle;
  const isBusy = loading;

  const levelOptions = useMemo(() => {
    if (userLevelCodes.length > 0) {
      return [...userLevelCodes]
        .filter((item) => item.ISDEL !== "1" && item.IS_ACTIVE !== 0)
        .sort((a, b) => (a.SORT_ORDER ?? 0) - (b.SORT_ORDER ?? 0))
        .map((item) => ({
          value: Number(item.CODE_CD),
          label: getSysCodeDisplayText(item, t),
        }));
    }

    return [
      { value: 10, label: t("USER_LEVEL_ADMIN", "Quản trị") },
      { value: 20, label: t("USER_LEVEL_MANAGER", "Quản lý") },
      { value: 30, label: t("USER_LEVEL_STAFF", "Nhân viên") },
      { value: 40, label: t("USER_LEVEL_VIEW", "Chỉ xem") },
    ];
  }, [t, userLevelCodes]);

  const presetLevelLabel = useMemo(() => {
    const matched = levelOptions.find((item) => item.value === presetLevel);
    return matched?.label ?? String(presetLevel);
  }, [levelOptions, presetLevel]);

  const levelDefaultFlags = useMemo(
    () => buildLevelDefaultSummaryFlags(presetLevel),
    [presetLevel],
  );

  useEffect(() => {
    if (!open) {
      hasSelectedInitialRef.current = false;
      return;
    }

    setPresetLevel(normalizeUserLevel(userLevel));
    setApplyToChildren(true);
    setSelectedMenuId(null);
    setMenuSearch("");
    hasSelectedInitialRef.current = false;
  }, [open, userLevel]);

  const treeRows = useMemo<PermissionTreeRow[]>(
    () => mergePermissionsWithMenuTree(menuItems, rows, t).treeRows,
    [menuItems, rows, t],
  );

  const filteredTreeRows = useMemo(() => {
    const query = menuSearch.trim().toLowerCase();
    if (!query) {
      return treeRows;
    }

    const matchedIds = new Set<string>();
    const byId = new Map(treeRows.map((row) => [row.MENU_ID, row] as const));

    for (const row of treeRows) {
      const haystack = `${row.MENU_LABEL} ${row.MENU_CODE} ${row.MENU_NAME}`.toLowerCase();
      if (!haystack.includes(query)) {
        continue;
      }

      let current: PermissionTreeRow | undefined = row;
      while (current) {
        if (matchedIds.has(current.MENU_ID)) {
          break;
        }
        matchedIds.add(current.MENU_ID);
        current = current.PARENT_ID ? byId.get(current.PARENT_ID) : undefined;
      }
    }

    return treeRows.filter((row) => matchedIds.has(row.MENU_ID));
  }, [menuSearch, treeRows]);

  const treeViewItems = useMemo<MenuTreeViewItem[]>(
    () =>
      filteredTreeRows.map((row) => ({
        MENU_ID: row.MENU_ID,
        PARENT_ID: row.PARENT_ID,
        MENU_CODE: row.MENU_CODE,
        text: row.MENU_LABEL,
        expanded: !row.PARENT_ID,
      })),
    [filteredTreeRows],
  );

  const selectedRow = useMemo(
    () => treeRows.find((row) => row.MENU_ID === selectedMenuId) ?? null,
    [selectedMenuId, treeRows],
  );

  useEffect(() => {
    if (!open || isBusy || filteredTreeRows.length === 0 || hasSelectedInitialRef.current) {
      return;
    }

    hasSelectedInitialRef.current = true;
    setSelectedMenuId(filteredTreeRows[0]?.MENU_ID ?? null);
  }, [filteredTreeRows, isBusy, open]);

  const handleRestoreDefaults = useCallback(() => {
    const menuCodes = treeRows.map((row) => row.MENU_CODE);
    const next = applyPermissionPreset(rows, menuCodes, presetLevel);
    onChange(next);
    notify(
      t(
        "USER_PERMISSION_APPLIED_DEFAULT",
        "Đã áp dụng quyền mặc định của {0} cho {1} chức năng.",
      )
        .replace("{0}", presetLevelLabel)
        .replace("{1}", String(menuCodes.length)),
      "success",
      3500,
    );
  }, [onChange, presetLevel, presetLevelLabel, rows, t, treeRows]);

  const applyPatchToSelection = useCallback(
    (patch: PermissionRowPatch) => {
      if (!selectedRow?.MENU_CODE) {
        return;
      }

      const targetCodes = applyToChildren
        ? [selectedRow.MENU_CODE, ...getDescendantMenuCodes(treeRows, selectedRow.MENU_ID)]
        : [selectedRow.MENU_CODE];

      const nextRows = updatePermissionRowsForMenus(rows, targetCodes, patch);
      if (nextRows !== rows) {
        onChange(nextRows);
      }
    },
    [applyToChildren, onChange, rows, selectedRow, treeRows],
  );

  const currentPermission = selectedRow
    ? rows.find((row) => row.MENU_CODE === selectedRow.MENU_CODE) ??
      createEmptyPermissionRow(selectedRow.MENU_CODE)
    : null;

  const selectedPreset = selectedRow
    ? buildPresetPermissionRow(selectedRow.MENU_CODE, presetLevel)
    : null;

  const selectedDiffersFromDefault = Boolean(
    currentPermission &&
      selectedPreset &&
      UI_RIGHTS.some(
        (right) => right.isChecked(currentPermission) !== right.isChecked(selectedPreset),
      ),
  );

  const handleTreeItemClick = useCallback((event: ItemClickEvent<MenuTreeViewItem, string>) => {
    const menuId = event.itemData?.MENU_ID;
    if (menuId) {
      setSelectedMenuId(menuId);
    }
  }, []);

  return (
    <Popup
      visible={open}
      onHiding={() => onOpenChange(false)}
      showTitle={true}
      title={dialogTitle}
      dragEnabled={false}
      hideOnOutsideClick={true}
      width="min(920px, calc(100vw - 2rem))"
      minWidth={640}
      maxWidth={1100}
      height="auto"
    >
      <div className="w-full max-w-full bg-white">
        <div className="flex flex-col gap-3 border-b border-slate-200 pb-3 lg:flex-row lg:items-end lg:justify-between">
          <div className="flex min-w-0 flex-1 flex-col gap-3 sm:flex-row sm:items-end">
            <div className="w-full sm:w-[220px]">
              <div className="mb-1 text-xs font-medium text-slate-600">
                {t("USER_PERMISSION_PRESET", "Cấp người dùng")}
              </div>
              <SelectBox
                dataSource={levelOptions}
                displayExpr="label"
                valueExpr="value"
                value={presetLevel}
                width="100%"
                onValueChanged={(event) => {
                  if (!event.event) {
                    return;
                  }

                  const numericValue = Number(event.value);
                  if (Number.isFinite(numericValue) && numericValue > 0) {
                    setPresetLevel(numericValue);
                  }
                }}
              />
            </div>

            <div className="min-w-0 flex-1">
              <div className="mb-1 text-xs font-medium text-slate-600">
                {t("USER_PERMISSION_DEFAULT_RIGHTS", "Quyền mặc định")}
              </div>
              <FlagSummary flags={levelDefaultFlags} t={t} />
            </div>
          </div>

          <Button
            icon="refresh"
            stylingMode="outlined"
            text={t("USER_PERMISSION_RESTORE_DEFAULT", "Khôi phục quyền mặc định")}
            hint={t(
              "USER_PERMISSION_RESTORE_DEFAULT_HINT",
              "Gán lại quyền mặc định của cấp đã chọn cho toàn bộ chức năng",
            )}
            onClick={handleRestoreDefaults}
            disabled={isBusy || treeRows.length === 0}
          />
        </div>

        <div className="mt-3 flex h-[58vh] min-h-[360px] flex-col overflow-hidden rounded-lg border border-slate-200 lg:flex-row">
          {isBusy ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
              {t("USER_PERMISSION_LOADING", "Đang tải phân quyền...")}
            </div>
          ) : treeViewItems.length === 0 ? (
            <div className="flex h-full w-full items-center justify-center text-sm text-slate-500">
              {t("USER_PERMISSION_EMPTY", "Chưa có dữ liệu phân quyền.")}
            </div>
          ) : (
            <>
              <div className="flex min-h-0 w-full flex-col border-b border-slate-200 lg:w-[42%] lg:border-b-0 lg:border-r">
                <div className="border-b border-slate-100 px-3 py-2">
                  <div className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("USER_PERMISSION_MENU_LIST", "Danh sách menu")}
                  </div>
                  <TextBox
                    value={menuSearch}
                    mode="search"
                    placeholder={t("USER_PERMISSION_SEARCH_MENU", "Tìm menu...")}
                    showClearButton
                    width="100%"
                    valueChangeEvent="input"
                    onValueChanged={(event) => {
                      setMenuSearch(String(event.value ?? ""));
                    }}
                  />
                </div>
                <div className="min-h-0 flex-1 overflow-auto px-1 py-1">
                  <TreeView
                    items={treeViewItems}
                    dataStructure="plain"
                    keyExpr="MENU_ID"
                    parentIdExpr="PARENT_ID"
                    displayExpr="text"
                    expandedExpr="expanded"
                    selectionMode="single"
                    selectByClick
                    selectedItemKeys={selectedMenuId ? [selectedMenuId] : []}
                    expandNodesRecursive={false}
                    animationEnabled={false}
                    focusStateEnabled={false}
                    width="100%"
                    height="100%"
                    onItemClick={handleTreeItemClick}
                  />
                </div>
              </div>

              <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-slate-50/60">
                <div className="border-b border-slate-100 bg-white px-4 py-3">
                  <div className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                    {t("USER_PERMISSION_MENU_RIGHTS", "Quyền menu")}
                  </div>
                  <div className="mt-1 text-sm font-semibold text-slate-800">
                    {selectedRow?.MENU_LABEL ??
                      t("USER_PERMISSION_SELECT_MENU", "Chọn một menu bên trái")}
                  </div>
                  {selectedDiffersFromDefault ? (
                    <div className="mt-1 text-xs text-amber-700">
                      {t(
                        "USER_PERMISSION_CUSTOMIZED_HINT",
                        "Đang khác quyền mặc định của cấp {0}",
                      ).replace("{0}", presetLevelLabel)}
                    </div>
                  ) : null}
                </div>

                <div className="min-h-0 flex-1 overflow-auto px-4 py-4">
                  {!currentPermission ? (
                    <div className="text-sm text-slate-500">
                      {t(
                        "USER_PERMISSION_SELECT_MENU_HINT",
                        "Chọn một menu bên trái để xem và chỉnh quyền.",
                      )}
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        {UI_RIGHTS.map((right) => (
                          <CheckBox
                            key={right.id}
                            text={t(right.labelKey, right.fallback)}
                            value={right.isChecked(currentPermission)}
                            onValueChanged={(event) => {
                              if (!event.event) {
                                return;
                              }
                              applyPatchToSelection(right.toPatch(Boolean(event.value)));
                            }}
                          />
                        ))}
                      </div>

                      <div className="space-y-3 border-t border-slate-200 pt-4">
                        <CheckBox
                          text={t(
                            "USER_PERMISSION_APPLY_CHILDREN",
                            "Áp dụng quyền này cho tất cả menu con",
                          )}
                          value={applyToChildren}
                          onValueChanged={(event) => {
                            if (!event.event) {
                              return;
                            }
                            setApplyToChildren(Boolean(event.value));
                          }}
                        />

                        <div className="flex flex-wrap gap-2">
                          <Button
                            stylingMode="outlined"
                            text={t("USER_PERMISSION_CLEAR_ALL", "Bỏ tất cả")}
                            onClick={() => {
                              applyPatchToSelection({
                                CAN_VIEW: false,
                                CAN_ADD: false,
                                CAN_EDIT: false,
                                CAN_DELETE: false,
                                CAN_PRINT: false,
                                CAN_EXPORT: false,
                                CAN_IMPORT: false,
                                CAN_APPROVE: false,
                              });
                            }}
                          />
                          <Button
                            stylingMode="outlined"
                            text={t("USER_PERMISSION_SELECT_ALL", "Chọn tất cả")}
                            onClick={() => {
                              applyPatchToSelection({
                                CAN_VIEW: true,
                                CAN_ADD: true,
                                CAN_EDIT: true,
                                CAN_DELETE: true,
                                CAN_PRINT: true,
                                CAN_EXPORT: true,
                                CAN_IMPORT: true,
                                CAN_APPROVE: true,
                              });
                            }}
                          />
                        </div>

                        {selectedDiffersFromDefault && selectedPreset ? (
                          <Button
                            stylingMode="text"
                            text={t(
                              "USER_PERMISSION_RESET_ONE",
                              "Trả menu này về quyền mặc định",
                            )}
                            onClick={() => {
                              applyPatchToSelection({
                                CAN_VIEW: selectedPreset.CAN_VIEW,
                                CAN_ADD: selectedPreset.CAN_ADD,
                                CAN_EDIT: selectedPreset.CAN_EDIT,
                                CAN_DELETE: selectedPreset.CAN_DELETE,
                                CAN_PRINT: selectedPreset.CAN_PRINT,
                                CAN_EXPORT: selectedPreset.CAN_EXPORT,
                                CAN_IMPORT: selectedPreset.CAN_IMPORT,
                                CAN_APPROVE: selectedPreset.CAN_APPROVE,
                              });
                            }}
                          />
                        ) : null}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex justify-end border-t border-slate-200 pt-3">
          <div className="flex gap-2">
            <Button
              icon="close"
              stylingMode="outlined"
              text={t("CANCEL", "Hủy")}
              onClick={() => {
                onCancel();
                onOpenChange(false);
              }}
            />
            <Button
              icon="save"
              stylingMode="contained"
              type="default"
              text={t("USER_PERMISSION_SAVE", "Lưu thay đổi")}
              onClick={onSave}
              disabled={!canSave}
            />
          </div>
        </div>
      </div>
    </Popup>
  );
}
