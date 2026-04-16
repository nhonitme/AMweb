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

export type PermissionRowPatch = Partial<PermissionRow> & {
  CAN_ALL?: boolean;
};

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
  const rowIndex = rows.findIndex((row) => row.MENU_CODE === menuCode);
  if (rowIndex < 0) {
    return rows;
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
