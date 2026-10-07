import type { NavigateFunction } from "react-router-dom"

export function navigateAfterPopupClose(navigate: NavigateFunction, fallbackPath: string): void {
  navigate(fallbackPath, { replace: true })
}
