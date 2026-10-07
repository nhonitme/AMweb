import { useCallback, useContext, useMemo } from "react"
import Button from "devextreme-react/button"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import TextArea from "devextreme-react/text-area"

import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import { LanguageContext } from "@/lib/i18nLoader"
import { createPopupShortcutWrapperAttr, isPopupShortcutScopeTopMost, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"

type EInvoiceMinuteXmlPopupProps = {
  visible: boolean
  title: string
  xml: string
  onClose: () => void
}

export default function EInvoiceMinuteXmlPopup({ visible, title, xml, onClose }: EInvoiceMinuteXmlPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const popupShortcutScopeId = usePopupShortcutScopeId("einvoice-minute-xml")

  const shortcutActions = useMemo(() => [SHORTCUT_ACTIONS.CLOSE, SHORTCUT_ACTIONS.HELP], [])

  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions)

  const handleClosePopup = useCallback(() => {
    if (shortcutHelpVisible) {
      closeShortcutHelp()
      return
    }

    onClose()
  }, [closeShortcutHelp, onClose, shortcutHelpVisible])

  const shortcutBindings = useMemo(
    () =>
      createShortcutBindings(
        shortcutActions,
        {
          [SHORTCUT_ACTIONS.CLOSE]: () => handleClosePopup(),
          [SHORTCUT_ACTIONS.HELP]: () => {
            if (shortcutHelpVisible) {
              closeShortcutHelp()
              return
            }

            openShortcutHelp()
          },
        },
        {
          [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
          [SHORTCUT_ACTIONS.HELP]: { allowInInput: true },
        },
      ),
    [closeShortcutHelp, handleClosePopup, openShortcutHelp, shortcutActions, shortcutHelpVisible],
  )

  const shouldHandleShortcutEvent = useCallback(
    () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
    [popupShortcutScopeId],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: visible,
    shouldHandleEvent: shouldHandleShortcutEvent,
  })

  return (
    <Popup
      visible={visible}
      title={title}
      showTitle={true}
      showCloseButton={false}
      width="min(980px, 96vw)"
      height="min(760px, 92vh)"
      animation={POPUP_FADE_ANIMATION}
      wrapperAttr={createPopupShortcutWrapperAttr(popupShortcutScopeId)}
      onHiding={handleClosePopup}
    >
      <ToolbarItem
        toolbar="top"
        location="after"
        render={() => <Button icon="close" stylingMode="text" hint={t("CLOSE", "Close")} onClick={handleClosePopup} />}
      />
      <div className="relative h-full p-3">
        <TextArea value={xml} height="100%" readOnly={true} />
        <ShortcutHelpPopup
          visible={shortcutHelpVisible}
          shortcuts={shortcutHelpItems}
          onClose={closeShortcutHelp}
        />
      </div>
    </Popup>
  )
}
