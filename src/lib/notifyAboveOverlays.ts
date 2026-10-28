import notify from "devextreme/ui/notify"

import { raiseOverlayAboveSiblings } from "@/components/popup/raiseOverlayZIndex"

function raiseAllToastWrappers(): void {
  document.querySelectorAll<HTMLElement>(".dx-overlay-wrapper.dx-toast-wrapper").forEach((wrapper) => {
    raiseOverlayAboveSiblings(wrapper)
  })
}

/** Show a toast above stacked fullscreen popups (IO / BOM / nested editors). */
export function notifyAboveOverlays(message: string, type?: string, displayTime?: number): void {
  notify(message, type, displayTime)
  // Toast mounts asynchronously; raise after the overlay wrapper exists.
  // Double rAF + microtask timeout so we win against watchNewestPopupAboveSiblings
  // which also schedules an rAF when the toast node is inserted.
  requestAnimationFrame(() => {
    raiseAllToastWrappers()
    requestAnimationFrame(() => {
      raiseAllToastWrappers()
      window.setTimeout(raiseAllToastWrappers, 0)
    })
  })
}
