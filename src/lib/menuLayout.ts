export const MENU_LAYOUT_STORAGE_KEY = "am-menu-layout";

export type MenuLayout = "sidebar" | "header";

export const DEFAULT_MENU_LAYOUT: MenuLayout = "header";

export function isMenuLayout(value: unknown): value is MenuLayout {
  return value === "sidebar" || value === "header";
}

export function getStoredMenuLayout(): MenuLayout {
  if (typeof window === "undefined") {
    return DEFAULT_MENU_LAYOUT;
  }

  const raw = window.localStorage.getItem(MENU_LAYOUT_STORAGE_KEY);
  return isMenuLayout(raw) ? raw : DEFAULT_MENU_LAYOUT;
}

export function setStoredMenuLayout(layout: MenuLayout): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(MENU_LAYOUT_STORAGE_KEY, layout);
}
