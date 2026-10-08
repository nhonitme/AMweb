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

  let max = 0
  document.querySelectorAll(OVERLAY_SELECTOR).forEach((node) => {
    if (node === wrapper) {
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

const POPUP_WRAPPER_SELECTOR = ".dx-overlay-wrapper.dx-popup-wrapper"

let watchingNewestPopup = false

export function watchNewestPopupAboveSiblings(): void {
  if (watchingNewestPopup || typeof document === "undefined") {
    return
  }

  watchingNewestPopup = true
  let frame = 0

  const raiseNewest = () => {
    frame = 0
    const nodes = document.querySelectorAll<HTMLElement>(POPUP_WRAPPER_SELECTOR)
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
          node.classList.contains("dx-overlay-wrapper")
          || node.querySelector(".dx-overlay-wrapper")
        ) {
          schedule()
          return
        }
      }
    }
  }

  observer.observe(document.body, { childList: true, subtree: true })
}
