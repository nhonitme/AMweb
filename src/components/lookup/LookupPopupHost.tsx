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

  const closeLookupPopup = useCallback(() => {
    explicitCloseRef.current = true
    popupWrapperRef.current = null
    setPopupOptions(null)
  }, [])

  const openLookupPopup = useCallback((options: LookupPopupOptions) => {
    explicitCloseRef.current = false
    setPopupOptions(options)
  }, [])

  const isLookupPopupOpen = popupOptions !== null
  usePopupEscapeLayer(isLookupPopupOpen, closeLookupPopup, () => popupWrapperRef.current)

  useEffect(() => {
    if (!isLookupPopupOpen) {
      return
    }

    raiseDialogsAboveSiblings()

    const observer = new MutationObserver(() => {
      raiseDialogsAboveSiblings()
    })
    observer.observe(document.body, { childList: true, subtree: true })

    return () => {
      observer.disconnect()
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
  const isLookupPopupOpenRef = useRef(isLookupPopupOpen)
  isLookupPopupOpenRef.current = isLookupPopupOpen
  const commandValue = useMemo(
    () => ({ openLookupPopup, closeLookupPopup, isLookupPopupOpenRef }),
    [closeLookupPopup, openLookupPopup],
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
          {popupOptions.renderContent({ closePopup: closeLookupPopup })}
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
