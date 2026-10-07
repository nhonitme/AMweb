export const WORKSPACE_BAR_STORAGE_KEY = "am-workspace-bar";

export function getStoredWorkspaceBarVisible(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  return window.localStorage.getItem(WORKSPACE_BAR_STORAGE_KEY) === "1";
}

export function setStoredWorkspaceBarVisible(visible: boolean): void {
  if (typeof window === "undefined") {
    return;
  }

  window.localStorage.setItem(WORKSPACE_BAR_STORAGE_KEY, visible ? "1" : "0");
}
