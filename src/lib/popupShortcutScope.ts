import { useRef } from "react"

const POPUP_SHORTCUT_SCOPE_ATTR = "data-popup-shortcut-scope"
const POPUP_WRAPPER_SELECTOR = ".dx-overlay-wrapper.dx-popup-wrapper"

let popupShortcutScopeCounter = 0

type PopupWrapperInfo = {
  domIndex: number
  element: HTMLElement
  zIndex: number
}

function parseZIndex(value: string | null | undefined) {
  const parsed = Number.parseInt(String(value ?? ""), 10)
  return Number.isFinite(parsed) ? parsed : 0
}

function isVisibleElement(element: HTMLElement) {
  if (typeof window === "undefined") {
    return false
  }

  const style = window.getComputedStyle(element)
  if (style.display === "none" || style.visibility === "hidden") {
    return false
  }

  return element.getClientRects().length > 0
}

function getVisiblePopupWrappers() {
  if (typeof window === "undefined") {
    return [] as PopupWrapperInfo[]
  }

  return Array.from(document.querySelectorAll<HTMLElement>(POPUP_WRAPPER_SELECTOR))
    .map((element, domIndex) => {
      const content = element.querySelector<HTMLElement>(".dx-overlay-content")
      const zIndex = Math.max(
        parseZIndex(window.getComputedStyle(element).zIndex),
        content ? parseZIndex(window.getComputedStyle(content).zIndex) : 0,
      )
      const visible = isVisibleElement(element) || (content ? isVisibleElement(content) : false)

      return visible ? { domIndex, element, zIndex } : null
    })
    .filter((item): item is PopupWrapperInfo => item !== null)
}

export function visiblePopupCount() {
  return getVisiblePopupWrappers().length
}

export function getTopMostVisiblePopupWrapper() {
  const wrappers = getVisiblePopupWrappers()
  if (wrappers.length === 0) {
    return null
  }

  return [...wrappers]
    .sort((left, right) => {
      if (left.zIndex !== right.zIndex) {
        return left.zIndex - right.zIndex
      }

      return left.domIndex - right.domIndex
    })
    .at(-1)?.element ?? null
}

export function usePopupShortcutScopeId(prefix = "popup") {
  const scopeIdRef = useRef("")

  if (!scopeIdRef.current) {
    popupShortcutScopeCounter += 1
    scopeIdRef.current = `${prefix}-shortcut-scope-${popupShortcutScopeCounter}`
  }

  return scopeIdRef.current
}

export function createPopupShortcutWrapperAttr(scopeId: string) {
  return {
    [POPUP_SHORTCUT_SCOPE_ATTR]: scopeId,
  } as Record<string, string>
}

export function hasVisiblePopupWrapper() {
  return getVisiblePopupWrappers().length > 0
}

/** True when the top-most popup owns its own shortcut scope (custom editor popups). */
export function isTopMostPopupShortcutScoped() {
  const topMostWrapper = getTopMostVisiblePopupWrapper()
  if (!topMostWrapper) {
    return false
  }

  if (topMostWrapper.hasAttribute(POPUP_SHORTCUT_SCOPE_ATTR)) {
    return true
  }

  return Boolean(topMostWrapper.querySelector(`[${POPUP_SHORTCUT_SCOPE_ATTR}]`))
}

export function isPopupShortcutScopeTopMost(scopeId: string) {
  if (!scopeId) {
    return false
  }

  const topMostWrapper = getTopMostVisiblePopupWrapper()
  if (!topMostWrapper) {
    return false
  }

  const scopedElement = document.querySelector<HTMLElement>(`[${POPUP_SHORTCUT_SCOPE_ATTR}="${scopeId}"]`)
  if (!scopedElement) {
    return false
  }

  const ownerWrapper = scopedElement.closest<HTMLElement>(POPUP_WRAPPER_SELECTOR)
  return ownerWrapper === topMostWrapper
}
