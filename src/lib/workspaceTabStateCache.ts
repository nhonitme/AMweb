export const JOURNAL_REPORT_TAB_STATE_KEY = "journal-report"

const workspaceTabState = new Map<string, Map<string, unknown>>()

export function readWorkspaceTabState<T>(tabId: string, stateKey: string): T | undefined {
  return workspaceTabState.get(tabId)?.get(stateKey) as T | undefined
}

export function writeWorkspaceTabState<T>(tabId: string, stateKey: string, value: T): void {
  let tabState = workspaceTabState.get(tabId)
  if (!tabState) {
    tabState = new Map<string, unknown>()
    workspaceTabState.set(tabId, tabState)
  }
  tabState.set(stateKey, value)
}

export function clearWorkspaceTabState(tabId: string): void {
  workspaceTabState.delete(tabId)
}

export function clearAllWorkspaceTabState(): void {
  workspaceTabState.clear()
}
