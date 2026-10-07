import { formatMessage } from "devextreme/localization"

const EDITING_TEXT_KEY_PREFIXES = ["dxDataGrid-editing", "dxDataGrid-"] as const;

export type GridEditingTexts = Record<string, string>;

type GridWithEditingTexts = {
  option: (name: string, value?: unknown) => unknown;
};

/** Derive the message key from the option name: `saveRowChanges` -> `dxDataGrid-editingSaveRowChanges`. */
function resolveEditingText(optionName: string): string | null {
  const suffix = optionName.charAt(0).toUpperCase() + optionName.slice(1);

  for (const prefix of EDITING_TEXT_KEY_PREFIXES) {
    try {
      const value = formatMessage(`${prefix}${suffix}`);
      if (typeof value === "string" && value.length > 0) {
        return value;
      }
    } catch {
      // Try the next prefix.
    }
  }

  return null;
}

/** Re-push localized editing captions onto a live grid. */
export function applyGridEditingTexts(grid: GridWithEditingTexts | null | undefined): void {
  if (!grid || typeof grid.option !== "function") {
    return;
  }

  try {
    const current = grid.option("editing.texts");
    if (!current || typeof current !== "object") {
      return;
    }

    const localized: GridEditingTexts = {};
    Object.keys(current as Record<string, unknown>).forEach((optionName) => {
      const value = resolveEditingText(optionName);
      if (value !== null) {
        localized[optionName] = value;
      }
    });

    if (Object.keys(localized).length === 0) {
      return;
    }

    grid.option("editing.texts", { ...(current as Record<string, unknown>), ...localized });
  } catch {
    // Localization must never break the grid.
  }
}