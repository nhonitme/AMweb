import { resolveMenuCaption } from "@/utils/resolveConfigCaption";

export const PERMISSION_KEYS = [
  "CAN_VIEW",
  "CAN_ADD",
  "CAN_EDIT",
  "CAN_DELETE",
  "CAN_PRINT",
  "CAN_EXPORT",
  "CAN_IMPORT",
  "CAN_APPROVE",
] as const;

export type PermissionKey = (typeof PERMISSION_KEYS)[number];

export type PermissionRow = {
  MENU_CODE: string;
  CAN_VIEW: boolean;
  CAN_ADD: boolean;
  CAN_EDIT: boolean;
  CAN_DELETE: boolean;
  CAN_PRINT: boolean;
  CAN_EXPORT: boolean;
  CAN_IMPORT: boolean;
  CAN_APPROVE: boolean;
};

export type PermissionTreeRow = PermissionRow & {
  MENU_ID: string;
  PARENT_ID: string | null;
  MENU_NAME: string;
  MENU_LABEL: string;
  SORT_ORDER: number;
  CAN_ALL: boolean;
};

export type PermissionRowPatch = Partial<PermissionRow> & {
  CAN_ALL?: boolean;
};

export function createEmptyPermissionRow(menuCode: string): PermissionRow {
  return {
    MENU_CODE: menuCode,
    CAN_VIEW: false,
    CAN_ADD: false,
    CAN_EDIT: false,
    CAN_DELETE: false,
    CAN_PRINT: false,
    CAN_EXPORT: false,
    CAN_IMPORT: false,
    CAN_APPROVE: false,
  };
}

export function isAllowedPermissionValue(value: unknown): boolean {
  return value === 1 || value === "1" || value === true || value === "true";
}

export function normalizePermissionRow(row: Record<string, unknown>): PermissionRow {
  return {
    MENU_CODE: String(row.MENU_CODE ?? row.menuCode ?? ""),
    CAN_VIEW: isAllowedPermissionValue(row.CAN_VIEW) || isAllowedPermissionValue(row.canView),
    CAN_ADD: isAllowedPermissionValue(row.CAN_ADD) || isAllowedPermissionValue(row.canAdd),
    CAN_EDIT: isAllowedPermissionValue(row.CAN_EDIT) || isAllowedPermissionValue(row.canEdit),
    CAN_DELETE: isAllowedPermissionValue(row.CAN_DELETE) || isAllowedPermissionValue(row.canDelete),
    CAN_PRINT: isAllowedPermissionValue(row.CAN_PRINT) || isAllowedPermissionValue(row.canPrint),
    CAN_EXPORT: isAllowedPermissionValue(row.CAN_EXPORT) || isAllowedPermissionValue(row.canExport),
    CAN_IMPORT: isAllowedPermissionValue(row.CAN_IMPORT) || isAllowedPermissionValue(row.canImport),
    CAN_APPROVE: isAllowedPermissionValue(row.CAN_APPROVE) || isAllowedPermissionValue(row.canApprove),
  };
}

export function normalizePermissionRows(rows: unknown[]): PermissionRow[] {
  return rows.map((row) => normalizePermissionRow(row as Record<string, unknown>));
}

export function isPermissionRowEqual(a: PermissionRow, b: PermissionRow): boolean {
  return PERMISSION_KEYS.every((key) => a[key] === b[key]);
}

export function hasPermissionChanges(
  currentPermissions: PermissionRow[],
  initialPermissions: PermissionRow[],
): boolean {
  if (currentPermissions.length !== initialPermissions.length) {
    return true;
  }

  const initialPermissionMap = new Map(
    initialPermissions.map((row) => [row.MENU_CODE, row] as const),
  );

  return currentPermissions.some((row) => {
    const initialRow = initialPermissionMap.get(row.MENU_CODE);
    return !initialRow || !isPermissionRowEqual(row, initialRow);
  });
}

export function getChangedPermissionRows(
  currentPermissions: PermissionRow[],
  initialPermissions: PermissionRow[],
): PermissionRow[] {
  const initialPermissionMap = new Map(
    initialPermissions.map((row) => [row.MENU_CODE, row] as const),
  );

  return currentPermissions.filter((row) => {
    const initialRow = initialPermissionMap.get(row.MENU_CODE);
    return !initialRow || !isPermissionRowEqual(row, initialRow);
  });
}

export function applyPermissionPatch(
  currentRow: PermissionRow,
  patch: PermissionRowPatch,
): PermissionRow {
  const nextRow: PermissionRow = { ...currentRow };

  PERMISSION_KEYS.forEach((key) => {
    if (typeof patch[key] === "boolean") {
      nextRow[key] = patch[key];
    }
  });

  if (typeof patch.CAN_ALL === "boolean") {
    PERMISSION_KEYS.forEach((key) => {
      nextRow[key] = patch.CAN_ALL ?? false;
    });
  }

  return nextRow;
}

export function updatePermissionRows(
  rows: PermissionRow[],
  menuCode: string,
  patch: PermissionRowPatch,
): PermissionRow[] {
  if (!menuCode) {
    return rows;
  }

  const rowIndex = rows.findIndex((row) => row.MENU_CODE === menuCode);
  if (rowIndex < 0) {
    const nextRow = applyPermissionPatch(createEmptyPermissionRow(menuCode), patch);
    return [...rows, nextRow];
  }

  const currentRow = rows[rowIndex];
  const nextRow = applyPermissionPatch(currentRow, patch);
  if (isPermissionRowEqual(currentRow, nextRow)) {
    return rows;
  }

  const nextRows = [...rows];
  nextRows[rowIndex] = nextRow;
  return nextRows;
}

export function updatePermissionRowsForMenus(
  rows: PermissionRow[],
  menuCodes: string[],
  patch: PermissionRowPatch,
): PermissionRow[] {
  let nextRows = rows;
  for (const menuCode of menuCodes) {
    const updated = updatePermissionRows(nextRows, menuCode, patch);
    if (updated !== nextRows) {
      nextRows = updated;
    }
  }
  return nextRows;
}

type MenuJoinItem = {
  MENU_ID: string;
  MENU_CODE: string;
  MENU_NAME: string;
  LABEL_TEXT?: string | null;
  CAPTION?: string | null;
  PARENT_ID: string | null;
  SORT_ORDER: number;
  ROUTE_PATH?: string | null;
  IS_ACTIVE?: boolean;
  IS_VISIBLE?: boolean;
  IS_DISABLED?: boolean;
};

/** Folder/group menus (e.g. GRP_REPORT) are navigation only — not permission targets. */
export function isPermissionAssignableMenu(item: Pick<MenuJoinItem, "MENU_CODE" | "ROUTE_PATH">): boolean {
  const menuCode = String(item.MENU_CODE ?? "").trim();
  if (!menuCode) {
    return false;
  }

  if (/^GRP_/i.test(menuCode)) {
    return false;
  }

  const routePath = String(item.ROUTE_PATH ?? "").trim();
  if (!routePath) {
    return false;
  }

  return true;
}

function resolveVisibleParentId(
  parentId: string | null | undefined,
  menusById: Map<string, MenuJoinItem>,
  visibleIdSet: Set<string>,
): string | null {
  let current = parentId ?? null;
  const seen = new Set<string>();

  while (current) {
    if (seen.has(current)) {
      return null;
    }
    seen.add(current);

    if (visibleIdSet.has(current)) {
      return current;
    }

    current = menusById.get(current)?.PARENT_ID ?? null;
  }

  return null;
}

export function mergePermissionsWithMenuTree(
  menuItems: MenuJoinItem[],
  permissions: PermissionRow[],
  translateLabel: (key: string, fallback?: string) => string,
): { permissionRows: PermissionRow[]; treeRows: PermissionTreeRow[] } {
  const permissionMap = new Map(
    permissions
      .filter((row) => row.MENU_CODE)
      .map((row) => [row.MENU_CODE, row] as const),
  );

  const menusById = new Map(
    menuItems.filter((item) => item.MENU_ID).map((item) => [item.MENU_ID, item] as const),
  );

  const visibleMenus = menuItems.filter(
    (item) =>
      isPermissionAssignableMenu(item) &&
      item.IS_DISABLED !== true &&
      item.IS_ACTIVE !== false &&
      item.IS_VISIBLE !== false,
  );

  const menuIdSet = new Set(visibleMenus.map((item) => item.MENU_ID));
  const treeRows: PermissionTreeRow[] = visibleMenus.map((item) => {
    const permission = permissionMap.get(item.MENU_CODE) ?? createEmptyPermissionRow(item.MENU_CODE);
    return {
      ...permission,
      MENU_ID: item.MENU_ID,
      PARENT_ID: resolveVisibleParentId(item.PARENT_ID, menusById, menuIdSet),
      MENU_NAME: item.CAPTION || item.MENU_NAME,
      MENU_LABEL: resolveMenuCaption(item, translateLabel),
      SORT_ORDER: item.SORT_ORDER ?? 0,
      CAN_ALL: PERMISSION_KEYS.every((key) => Boolean(permission[key])),
    };
  });

  const coveredCodes = new Set(visibleMenus.map((item) => item.MENU_CODE));
  let orphanIndex = 0;
  for (const permission of permissions) {
    if (!permission.MENU_CODE || coveredCodes.has(permission.MENU_CODE)) {
      continue;
    }

    // Skip group codes that only exist in permission rows.
    if (/^GRP_/i.test(permission.MENU_CODE)) {
      continue;
    }

    orphanIndex += 1;
    treeRows.push({
      ...permission,
      MENU_ID: `orphan:${permission.MENU_CODE}`,
      PARENT_ID: null,
      MENU_NAME: permission.MENU_CODE,
      MENU_LABEL: translateLabel(permission.MENU_CODE, permission.MENU_CODE),
      SORT_ORDER: 100000 + orphanIndex,
      CAN_ALL: PERMISSION_KEYS.every((key) => Boolean(permission[key])),
    });
  }

  treeRows.sort((a, b) => a.SORT_ORDER - b.SORT_ORDER || a.MENU_LABEL.localeCompare(b.MENU_LABEL));

  const permissionRows = treeRows.map((row) => ({
    MENU_CODE: row.MENU_CODE,
    CAN_VIEW: row.CAN_VIEW,
    CAN_ADD: row.CAN_ADD,
    CAN_EDIT: row.CAN_EDIT,
    CAN_DELETE: row.CAN_DELETE,
    CAN_PRINT: row.CAN_PRINT,
    CAN_EXPORT: row.CAN_EXPORT,
    CAN_IMPORT: row.CAN_IMPORT,
    CAN_APPROVE: row.CAN_APPROVE,
  }));

  return { permissionRows, treeRows };
}

export function getDescendantMenuCodes(
  treeRows: PermissionTreeRow[],
  menuId: string,
): string[] {
  const childrenByParent = new Map<string, PermissionTreeRow[]>();
  for (const row of treeRows) {
    if (!row.PARENT_ID) {
      continue;
    }
    const siblings = childrenByParent.get(row.PARENT_ID) ?? [];
    siblings.push(row);
    childrenByParent.set(row.PARENT_ID, siblings);
  }

  const result: string[] = [];
  const stack = [...(childrenByParent.get(menuId) ?? [])];
  while (stack.length > 0) {
    const current = stack.pop();
    if (!current) {
      continue;
    }
    result.push(current.MENU_CODE);
    const children = childrenByParent.get(current.MENU_ID);
    if (children?.length) {
      stack.push(...children);
    }
  }
  return result;
}

/** Restricted menus mirror seed_sys_user_permission_by_userlv. */
const ADMIN_ONLY_MENUS = new Set(["MD_USER"]);
const MANAGER_PLUS_MENUS = new Set(["MD_COMPANY", "MD_MANAGEMENT"]);

/**
 * Typical default flags for a level (ignore menu-specific locks).
 * Used for the header "Quyền mặc định" summary.
 */
export function buildLevelDefaultSummaryFlags(
  userLevel: number,
): Omit<PermissionRow, "MENU_CODE"> {
  return buildPresetPermissionFlags("__DEFAULT__", userLevel);
}

/**
 * Build default permission flags for one menu from USERLV.
 * Smaller USERLV = higher privilege (10 ADMIN … 40 VIEW).
 */
export function buildPresetPermissionFlags(
  menuCode: string,
  userLevel: number,
): Omit<PermissionRow, "MENU_CODE"> {
  const level = Number.isFinite(userLevel) && userLevel > 0 ? userLevel : 40;

  let canView = true;
  let canWrite = level <= 30;
  let canDelete = level <= 30;
  let canImport = level <= 30;
  let canExport = true;
  let canApprove = level <= 20;

  if (ADMIN_ONLY_MENUS.has(menuCode)) {
    const allowed = level <= 10;
    canView = allowed;
    canWrite = allowed;
    canDelete = allowed;
    canImport = allowed;
    canExport = allowed;
    canApprove = allowed;
  } else if (MANAGER_PLUS_MENUS.has(menuCode)) {
    const allowed = level <= 20;
    canView = allowed;
    canWrite = allowed;
    canDelete = allowed;
    canImport = allowed;
    canExport = allowed;
    canApprove = allowed;
  }

  return {
    CAN_VIEW: canView,
    CAN_ADD: canWrite,
    CAN_EDIT: canWrite,
    CAN_DELETE: canDelete,
    CAN_PRINT: canExport,
    CAN_EXPORT: canExport,
    CAN_IMPORT: canImport,
    CAN_APPROVE: canApprove,
  };
}

export function buildPresetPermissionRow(menuCode: string, userLevel: number): PermissionRow {
  return {
    MENU_CODE: menuCode,
    ...buildPresetPermissionFlags(menuCode, userLevel),
  };
}

export function buildPresetPermissionRows(
  menuCodes: string[],
  userLevel: number,
): PermissionRow[] {
  return menuCodes
    .filter((code) => Boolean(code))
    .map((menuCode) => buildPresetPermissionRow(menuCode, userLevel));
}

export function applyPermissionPreset(
  currentRows: PermissionRow[],
  menuCodes: string[],
  userLevel: number,
): PermissionRow[] {
  const presetRows = buildPresetPermissionRows(menuCodes, userLevel);
  const presetMap = new Map(presetRows.map((row) => [row.MENU_CODE, row] as const));
  const nextRows = currentRows.map((row) => {
    const preset = presetMap.get(row.MENU_CODE);
    return preset ? { ...preset } : row;
  });

  for (const preset of presetRows) {
    if (!nextRows.some((row) => row.MENU_CODE === preset.MENU_CODE)) {
      nextRows.push({ ...preset });
    }
  }

  return nextRows;
}

export function getExceptionMenuCodes(
  permissions: PermissionRow[],
  userLevel: number,
): string[] {
  return permissions
    .filter((row) => {
      if (!row.MENU_CODE) {
        return false;
      }
      const preset = buildPresetPermissionRow(row.MENU_CODE, userLevel);
      return !isPermissionRowEqual(row, preset);
    })
    .map((row) => row.MENU_CODE);
}

export function filterTreeRowsForExceptions(
  treeRows: PermissionTreeRow[],
  exceptionMenuCodes: Set<string>,
): PermissionTreeRow[] {
  if (exceptionMenuCodes.size === 0) {
    return [];
  }

  const byId = new Map(treeRows.map((row) => [row.MENU_ID, row] as const));
  const keepIds = new Set<string>();

  for (const row of treeRows) {
    if (!exceptionMenuCodes.has(row.MENU_CODE)) {
      continue;
    }

    let current: PermissionTreeRow | undefined = row;
    while (current) {
      if (keepIds.has(current.MENU_ID)) {
        break;
      }
      keepIds.add(current.MENU_ID);
      current = current.PARENT_ID ? byId.get(current.PARENT_ID) : undefined;
    }
  }

  return treeRows.filter((row) => keepIds.has(row.MENU_ID));
}
