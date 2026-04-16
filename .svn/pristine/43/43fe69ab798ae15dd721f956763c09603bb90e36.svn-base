import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react"
import Popup from "devextreme-react/popup"

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
}

const LookupPopupContext = createContext<LookupPopupContextValue | null>(null)

export function LookupPopupProvider({ children }: { children: ReactNode }) {
  const [popupOptions, setPopupOptions] = useState<LookupPopupOptions | null>(null)

  const closeLookupPopup = useCallback(() => {
    setPopupOptions(null)
  }, [])

  const openLookupPopup = useCallback((options: LookupPopupOptions) => {
    setPopupOptions(options)
  }, [])

  const contextValue = useMemo(
    () => ({
      openLookupPopup,
      closeLookupPopup,
    }),
    [closeLookupPopup, openLookupPopup],
  )

  return (
    <LookupPopupContext.Provider value={contextValue}>
      {children}
      {popupOptions ? (
        <Popup
          visible={true}
          title={popupOptions.title}
          showTitle={true}
          width={popupOptions.width ?? "95vw"}
          height={popupOptions.height ?? "90vh"}
          dragEnabled={false}
          hideOnOutsideClick={false}
          container=".dx-viewport"
          position={{ my: "center", at: "center", of: window }}
          onHiding={closeLookupPopup}
        >
          {popupOptions.renderContent({ closePopup: closeLookupPopup })}
        </Popup>
      ) : null}
    </LookupPopupContext.Provider>
  )
}

export function useLookupPopupHost() {
  return useContext(LookupPopupContext)
}
