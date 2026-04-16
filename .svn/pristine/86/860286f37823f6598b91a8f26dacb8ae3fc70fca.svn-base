const devExtremeThemeAssets = import.meta.glob(
  "../../node_modules/devextreme/dist/css/dx.*.css",
  {
    eager: true,
    import: "default",
    query: "?url",
  },
) as Record<string, string>;

const DEVEXTREME_THEME_STORAGE_KEY = "dx-theme";
const COMPACT_SUFFIX = ".compact";

const FAMILY_LABELS = {
  fluent: "Fluent",
  generic: "Generic",
  material: "Material",
} as const;

const FAMILY_ORDER: Record<DevExtremeThemeFamily, number> = {
  fluent: 0,
  material: 1,
  generic: 2,
};

const GENERIC_THEME_LABELS: Record<string, string> = {
  carmine: "Carmine",
  contrast: "Contrast",
  dark: "Dark",
  darkmoon: "Dark Moon",
  darkviolet: "Dark Violet",
  greenmist: "Green Mist",
  light: "Light",
  softblue: "Soft Blue",
};

export type DevExtremeThemeFamily = "fluent" | "generic" | "material";
export type DevExtremeThemeId = string;

export type DevExtremeThemeOption = {
  family: DevExtremeThemeFamily;
  familyLabel: string;
  href: string;
  id: DevExtremeThemeId;
  isCompact: boolean;
  isDark: boolean;
  label: string;
  searchText: string;
};

function getThemeIdFromAssetPath(assetPath: string): string | null {
  const fileName = assetPath.split(/[\\/]/).pop();
  if (!fileName || !fileName.startsWith("dx.") || !fileName.endsWith(".css")) {
    return null;
  }

  const themeId = fileName.slice(3, -4);
  return themeId === "common" ? null : themeId;
}

function getThemeFamily(themeId: string): DevExtremeThemeFamily {
  if (themeId.startsWith("fluent.")) {
    return "fluent";
  }

  if (themeId.startsWith("material.")) {
    return "material";
  }

  return "generic";
}

function isCompactTheme(themeId: string): boolean {
  return themeId.endsWith(COMPACT_SUFFIX);
}

function getBaseThemeId(themeId: string): string {
  return isCompactTheme(themeId) ? themeId.slice(0, -COMPACT_SUFFIX.length) : themeId;
}

function isDarkTheme(themeId: string): boolean {
  const baseThemeId = getBaseThemeId(themeId);

  return (
    baseThemeId === "contrast" ||
    baseThemeId === "dark" ||
    baseThemeId === "darkmoon" ||
    baseThemeId === "darkviolet" ||
    baseThemeId.includes(".dark")
  );
}

function capitalizeWord(word: string): string {
  if (word === "saas") {
    return "SaaS";
  }

  if (!word.length) {
    return word;
  }

  return `${word[0].toUpperCase()}${word.slice(1)}`;
}

function getThemeLabel(themeId: string): string {
  const family = getThemeFamily(themeId);
  const familyLabel = FAMILY_LABELS[family];
  const compactLabel = isCompactTheme(themeId) ? " (Compact)" : "";
  const baseThemeId = getBaseThemeId(themeId);

  if (family === "generic") {
    const detail = GENERIC_THEME_LABELS[baseThemeId] ?? capitalizeWord(baseThemeId);
    return `${familyLabel} ${detail}${compactLabel}`;
  }

  const detailTokens = baseThemeId.split(".").slice(1).map(capitalizeWord);
  return `${familyLabel} ${detailTokens.join(" ")}${compactLabel}`;
}

function compareThemes(a: DevExtremeThemeOption, b: DevExtremeThemeOption): number {
  const familyOrder = FAMILY_ORDER[a.family] - FAMILY_ORDER[b.family];
  if (familyOrder !== 0) {
    return familyOrder;
  }

  return a.label.localeCompare(b.label);
}

export const DEFAULT_DEVEXTREME_THEME: DevExtremeThemeId = "fluent.blue.light.compact";

export const DEVEXTREME_THEMES: DevExtremeThemeOption[] = Object.entries(devExtremeThemeAssets)
  .map(([assetPath, href]) => {
    const themeId = getThemeIdFromAssetPath(assetPath);
    if (!themeId) {
      return null;
    }

    const family = getThemeFamily(themeId);
    const label = getThemeLabel(themeId);

    return {
      family,
      familyLabel: FAMILY_LABELS[family],
      href,
      id: themeId,
      isCompact: isCompactTheme(themeId),
      isDark: isDarkTheme(themeId),
      label,
      searchText: `${themeId} ${label} ${FAMILY_LABELS[family]}`.toLowerCase(),
    } satisfies DevExtremeThemeOption;
  })
  .filter((theme): theme is DevExtremeThemeOption => theme !== null)
  .sort(compareThemes);

export function getDevExtremeThemeStorageKey(): string {
  return DEVEXTREME_THEME_STORAGE_KEY;
}

export function isDevExtremeThemeId(value: string): value is DevExtremeThemeId {
  return DEVEXTREME_THEMES.some((theme) => theme.id === value);
}

export function resolveDevExtremeThemeId(value: string | null | undefined): DevExtremeThemeId {
  if (value && isDevExtremeThemeId(value)) {
    return value;
  }

  return DEFAULT_DEVEXTREME_THEME;
}

export function getStoredDevExtremeTheme(): DevExtremeThemeId {
  if (typeof window === "undefined") {
    return DEFAULT_DEVEXTREME_THEME;
  }

  return resolveDevExtremeThemeId(window.localStorage.getItem(DEVEXTREME_THEME_STORAGE_KEY));
}

export function setStoredDevExtremeTheme(themeId: DevExtremeThemeId): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(DEVEXTREME_THEME_STORAGE_KEY, themeId);
}

export function getDevExtremeTheme(themeId: DevExtremeThemeId): DevExtremeThemeOption {
  return (
    DEVEXTREME_THEMES.find((theme) => theme.id === themeId) ??
    DEVEXTREME_THEMES.find((theme) => theme.id === DEFAULT_DEVEXTREME_THEME) ??
    DEVEXTREME_THEMES[0]
  );
}

export function ensureDevExtremeThemeLinks(doc?: Document): void {
  if (typeof document === "undefined") {
    return;
  }

  const targetDocument = doc ?? document;
  const head = targetDocument.head;

  if (!head) {
    return;
  }

  const existingThemeIds = new Set(
    Array.from(head.querySelectorAll<HTMLLinkElement>('link[rel="dx-theme"][data-theme]')).map((link) =>
      link.getAttribute("data-theme"),
    ),
  );

  const fragment = targetDocument.createDocumentFragment();

  DEVEXTREME_THEMES.forEach((theme) => {
    if (existingThemeIds.has(theme.id)) {
      return;
    }

    const link = targetDocument.createElement("link");
    link.rel = "dx-theme";
    link.href = theme.href;
    link.setAttribute("data-theme", theme.id);
    link.setAttribute("data-active", theme.id === DEFAULT_DEVEXTREME_THEME ? "true" : "false");
    link.setAttribute("data-managed-by", "amnote15");
    fragment.appendChild(link);
  });

  head.appendChild(fragment);
}
