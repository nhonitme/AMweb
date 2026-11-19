const OVERLAY_SELECTOR = ".dx-overlay-wrapper"
const DIALOG_OVERLAY_SELECTOR = ".dx-overlay-wrapper.dx-dialog-wrapper"
const FORM_DROPDOWN_SELECTOR = ".dx-dropdowneditor-overlay:not(.am-grid-lookup-dropdown)"

function readZIndex(element: Element): number {
  const parsed = Number.parseInt(window.getComputedStyle(element).zIndex, 10)
  return Number.isFinite(parsed) ? parsed : 0
}

export function raiseOverlayAboveSiblings(wrapper: HTMLElement | null | undefined): number {
  if (!wrapper) {
    return 0
  }
  return raiseOverlayAboveSiblingsCore(wrapper)
}

function raiseOverlayAboveSiblingsCore(wrapper: HTMLElement): number {
  // Popups/dialogs must not climb above active toasts (toast notify runs in the
  // same frame as watchNewestPopup and would otherwise end up under the top popup).
  const raisingToast = wrapper.classList.contains("dx-toast-wrapper")

  let max = 0
  document.querySelectorAll(OVERLAY_SELECTOR).forEach((node) => {
    if (node === wrapper) {
      return
    }
    if (!raisingToast && (node as HTMLElement).classList.contains("dx-toast-wrapper")) {
      return
    }
    max = Math.max(max, readZIndex(node))
  })

  const current = readZIndex(wrapper)
  const next = Math.max(current, max + 1)
  if (next !== current) {
    wrapper.style.setProperty("z-index", String(next), "important")
  }
  return next
}

function raiseMatchingOverlays(selector: string): void {
  document.querySelectorAll(selector).forEach((node) => {
    raiseOverlayAboveSiblings(node as HTMLElement)
  })
}

export function raiseDialogsAboveSiblings(): void {
  raiseMatchingOverlays(DIALOG_OVERLAY_SELECTOR)
}

export function raiseFormOverlaysAboveSiblings(): void {
  raiseMatchingOverlays(`${DIALOG_OVERLAY_SELECTOR}, ${FORM_DROPDOWN_SELECTOR}`)
}

export function overlayWrapperFromPopupContent(content: Element | null | undefined): HTMLElement | null {
  return content?.closest(OVERLAY_SELECTOR) ?? null
}

/** Bring the popup that actually opened above other fullscreen modal shades.
 * React can mount a hidden child Popup before it is made visible, so DOM
 * insertion order alone does not represent the active popup stack.
 */
export function raiseOpenedPopupAboveSiblings(component: { content: () => Element }): number {
  return raiseOverlayAboveSiblings(overlayWrapperFromPopupContent(component.content()))
}

const POPUP_WRAPPER_SELECTOR = ".dx-overlay-wrapper.dx-popup-wrapper"

function isShownPopup(wrapper: HTMLElement): boolean {
  const content = wrapper.querySelector<HTMLElement>(".dx-overlay-content")
  if (!content || wrapper.classList.contains("dx-state-invisible") || content.classList.contains("dx-state-invisible")) {
    return false
  }
  const wrapperStyle = window.getComputedStyle(wrapper)
  const contentStyle = window.getComputedStyle(content)
  return wrapperStyle.display !== "none" && wrapperStyle.visibility !== "hidden"
    && contentStyle.display !== "none" && contentStyle.visibility !== "hidden"
    && content.getClientRects().length > 0
}

let watchingNewestPopup = false

export function watchNewestPopupAboveSiblings(): void {
  if (watchingNewestPopup || typeof document === "undefined") {
    return
  }

  watchingNewestPopup = true
  let frame = 0

  const raiseNewest = () => {
    frame = 0
    // Never raise a pre-rendered hidden popup (deferRendering=false).
    // A later invisible BOM/lookup must not cover the currently active IO.
    const nodes = Array.from(document.querySelectorAll<HTMLElement>(POPUP_WRAPPER_SELECTOR))
      .filter(isShownPopup)
    if (nodes.length < 2) {
      return
    }

    raiseOverlayAboveSiblings(nodes[nodes.length - 1])
  }

  const schedule = () => {
    if (frame) {
      return
    }
    frame = requestAnimationFrame(raiseNewest)
  }

  const observer = new MutationObserver((mutations) => {
    runMutationScan(mutations)
  })

  function runMutationScan(mutations: MutationRecord[]): void {
    for (const mutation of mutations) {
      for (const node of mutation.addedNodes) {
        if (!(node instanceof HTMLElement)) {
          continue
        }
        if (
          node.matches(POPUP_WRAPPER_SELECTOR)
          || node.querySelector(POPUP_WRAPPER_SELECTOR)
        ) {
          schedule()
          return
        }
      }
    }
  }

  observer.observe(document.body, { childList: true, subtree: true })
}
