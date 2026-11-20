import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from "react"
import Popup from "devextreme-react/popup"
import {
  disableBuiltInPopupEscape,
  usePopupEscapeLayer,
} from "@/components/popup/popupEscapeStack"
import { getLookupOverlayContainer } from "./lookupHelpers"
import {
  overlayWrapperFromPopupContent,
  raiseOverlayAboveSiblings,
  raiseDialogsAboveSiblings,
} from "@/components/popup/raiseOverlayZIndex"

type LookupPopupRender = (options: { closePopup: () => void }) => ReactNode

type LookupPopupOptions = {
  title?: string
  width?: number | string
  height?: number | string
  renderContent: LookupPopupRender
}

type LookupPopupContextValue = {
  openLookupPopup: (options: LookupPopupOptions) => void
  closeLookupPopup: () => void
  isLookupPopupOpen: boolean
}

type LookupPopupCommands = {
  openLookupPopup: (options: LookupPopupOptions) => void
  closeLookupPopup: () => void
  isLookupPopupOpenRef: MutableRefObject<boolean>
}

const LookupPopupContext = createContext<LookupPopupContextValue | null>(null)
const LookupPopupCommandsContext = createContext<LookupPopupCommands | null>(null)

export function LookupPopupProvider({ children }: { children: ReactNode }) {
  const [popupOptions, setPopupOptions] = useState<LookupPopupOptions | null>(null)
  const explicitCloseRef = useRef(false)
  const popupWrapperRef = useRef<HTMLElement | null>(null)
  // Updated synchronously in open/close so pointer handlers see the flag before React re-renders.
  const isLookupPopupOpenRef = useRef(false)

  const closeLookupPopup = useCallback(() => {
    explicitCloseRef.current = true
    isLookupPopupOpenRef.current = false
    popupWrapperRef.current = null
    setPopupOptions(null)
  }, [])

  const openLookupPopup = useCallback((options: LookupPopupOptions) => {
    explicitCloseRef.current = false
    isLookupPopupOpenRef.current = true
    setPopupOptions(options)
  }, [])

  const isLookupPopupOpen = popupOptions !== null
  usePopupEscapeLayer(isLookupPopupOpen, closeLookupPopup, () => popupWrapperRef.current)

  useEffect(() => {
    if (!isLookupPopupOpen) {
      return
    }

    raiseDialogsAboveSiblings()

    // Raise once more after overlays settle. Avoid body+subtree MutationObserver:
    // DataGrid mount mutates DOM heavily and was thrashing z-index (popup jitter).
    const timer = window.setTimeout(() => {
      raiseDialogsAboveSiblings()
      raiseOverlayAboveSiblings(popupWrapperRef.current)
    }, 50)

    return () => {
      window.clearTimeout(timer)
    }
  }, [isLookupPopupOpen])

  const contextValue = useMemo(
    () => ({
      openLookupPopup,
      closeLookupPopup,
      isLookupPopupOpen,
    }),
    [closeLookupPopup, isLookupPopupOpen, openLookupPopup],
  )

  const getPopupContainer = () => getLookupOverlayContainer()
  const commandValue = useMemo(
    () => ({ openLookupPopup, closeLookupPopup, isLookupPopupOpenRef }),
    [closeLookupPopup, openLookupPopup],
  )

  // Keep the same element tree across parent re-renders (draft sync, etc.)
  // so the lookup DataGrid is not remounted and does not call store.load() again.
  const popupContent = useMemo(
    () => (popupOptions ? popupOptions.renderContent({ closePopup: closeLookupPopup }) : null),
    [closeLookupPopup, popupOptions],
  )

  return (
    <LookupPopupCommandsContext.Provider value={commandValue}>
      <LookupPopupContext.Provider value={contextValue}>
        {children}
      </LookupPopupContext.Provider>
      {popupOptions ? (
        <Popup
          visible={true}
          title={popupOptions.title}
          showTitle={true}
          width={popupOptions.width ?? "95vw"}
          height={popupOptions.height ?? "90vh"}
          dragEnabled={false}
          hideOnOutsideClick={false}
          container={getPopupContainer()}
          position={{ my: "center", at: "center", of: window }}
          wrapperAttr={{ class: "am-lookup-popup" }}
          onShown={(event) => {
            disableBuiltInPopupEscape(event.component)
            popupWrapperRef.current = overlayWrapperFromPopupContent(event.component.content())
            raiseOverlayAboveSiblings(popupWrapperRef.current)
          }}
          onHiding={(event) => {
            if (explicitCloseRef.current) {
              return
            }

            event.cancel = true
            closeLookupPopup()
          }}
        >
          {popupContent}
        </Popup>
      ) : null}
    </LookupPopupCommandsContext.Provider>
  )
}

export function useLookupPopupHost() {
  return useContext(LookupPopupContext)
}

/** Stable popup commands for lookup controls that should not rerender when visibility changes. */
export function useLookupPopupCommands() {
  return useContext(LookupPopupCommandsContext)
}
