import { useEffect, useRef } from "react"
import Popup from "devextreme/ui/popup"
import type dxPopup from "devextreme/ui/popup"

import { watchNewestPopupAboveSiblings } from "@/components/popup/raiseOverlayZIndex"
import { getTopMostVisiblePopupWrapper, visiblePopupCount } from "@/lib/popupShortcutScope"

type PopupEscapeLayer = {
  id: symbol
  close: () => void
  getWrapper?: () => HTMLElement | null
}

export type PopupEscapeRegistration = (() => void) & {
  hasLayerAbove: () => boolean
}

const escapeLayers: PopupEscapeLayer[] = []
let listening = false

function dismissPopupWrapper(wrapper: HTMLElement) {
  const content = wrapper.querySelector<HTMLElement>(".dx-overlay-content")
  if (!content) {
    return
  }

  const instance = Popup.getInstance(content) as dxPopup | undefined
  if (!instance) {
    return
  }

  void instance.hide()
}

function handleEscape(event: KeyboardEvent) {
  if ((event.key !== "Escape" && event.key !== "Esc") || event.isComposing) {
    return
  }

  const topVisual = getTopMostVisiblePopupWrapper()
  const topLayer = escapeLayers[escapeLayers.length - 1]
  const layerWrapper = topLayer?.getWrapper?.() ?? null

  if (!topVisual && !topLayer) {
    return
  }

  // Child popup is visually above a registered parent. Close only the child.
  if (topLayer && layerWrapper && topVisual && topVisual !== layerWrapper) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()
    dismissPopupWrapper(topVisual)
    return
  }

  if (visiblePopupCount() > 1 && topVisual) {
    event.preventDefault()
    event.stopPropagation()
    event.stopImmediatePropagation()

    const unregisteredPopupOpen = visiblePopupCount() > escapeLayers.length
    if (unregisteredPopupOpen && layerWrapper !== topVisual) {
      dismissPopupWrapper(topVisual)
      return
    }

    if (topLayer && (!layerWrapper || layerWrapper === topVisual)) {
      topLayer.close()
      return
    }

    dismissPopupWrapper(topVisual)
    return
  }

  if (!topLayer) {
    return
  }

  event.preventDefault()
  event.stopPropagation()
  event.stopImmediatePropagation()
  topLayer.close()
}

function syncEscapeListener() {
  if (listening || typeof window === "undefined") {
    return
  }

  window.addEventListener("keydown", handleEscape, true)
  listening = true
}

export function installPopupStacking() {
  syncEscapeListener()
  watchNewestPopupAboveSiblings()
}

export function registerPopupEscapeLayer(
  close: () => void,
  getWrapper?: () => HTMLElement | null,
): PopupEscapeRegistration {
  const layer = { id: Symbol("popup-escape-layer"), close, getWrapper }
  escapeLayers.push(layer)
  installPopupStacking()

  const unregister = (() => {
    const index = escapeLayers.findIndex((candidate) => candidate.id === layer.id)
    if (index >= 0) {
      escapeLayers.splice(index, 1)
    }
    syncEscapeListener()
  }) as PopupEscapeRegistration

  unregister.hasLayerAbove = () => {
    const index = escapeLayers.findIndex((candidate) => candidate.id === layer.id)
    return index >= 0 && index < escapeLayers.length - 1
  }

  return unregister
}

export function disableBuiltInPopupEscape(component: Pick<dxPopup, "registerKeyHandler">) {
  component.registerKeyHandler("escape", () => undefined)
}

export function usePopupEscapeLayer(
  active: boolean,
  close: () => void,
  getWrapper?: () => HTMLElement | null,
) {
  const getWrapperRef = useRef(getWrapper)
  getWrapperRef.current = getWrapper

  useEffect(() => {
    if (!active) {
      return
    }

    return registerPopupEscapeLayer(close, () => getWrapperRef.current?.() ?? null)
  }, [active, close])
}
