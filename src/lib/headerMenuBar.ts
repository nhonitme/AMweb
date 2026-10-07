export const HEADER_MENU_BAR_STORAGE_KEY = "am-header-menu-bar";

export function getStoredHeaderMenuBarVisible(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const raw = window.localStorage.getItem(HEADER_MENU_BAR_STORAGE_KEY);
  return raw === "1";
}

export function setStoredHeaderMenuBarVisible(visible: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(HEADER_MENU_BAR_STORAGE_KEY, visible ? "1" : "0");
}
