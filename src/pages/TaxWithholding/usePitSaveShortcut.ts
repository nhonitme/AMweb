import { useMemo, useRef } from "react"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import { hasVisiblePopupWrapper, isPopupShortcutScopeTopMost } from "@/lib/popupShortcutScope"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS, type ShortcutActionCode } from "@/lib/shortcuts/shortcutDefinitions"

export type PitFormShortcutExtras = {
  onPrint?: () => void | Promise<void>
  onClose?: () => void
  onHelp?: () => void
  onAddRow?: () => void
  canAddRow?: boolean
  /** When true, Ctrl+Q runs the same save path (form already closes after save). */
  saveAndClose?: boolean
}

/** Read the current callback after the shortcut has committed the focused editor. */
export default function usePitSaveShortcut(
  save: () => Promise<void>,
  canSave: boolean,
  popupScopeId?: string,
  active = true,
  extras?: PitFormShortcutExtras,
) {
  const latest = useRef({ save, canSave, active, extras, popupScopeId })
  latest.current = { save, canSave, active, extras, popupScopeId }
  const saving = useRef(false)

  const ownsScope = () => {
    const scopeId = latest.current.popupScopeId
    return scopeId
      ? isPopupShortcutScopeTopMost(scopeId)
      : !hasVisiblePopupWrapper()
  }

  const actions = useMemo(() => {
    const next: ShortcutActionCode[] = [SHORTCUT_ACTIONS.SAVE]
    if (extras?.saveAndClose) next.push(SHORTCUT_ACTIONS.SAVE_AND_CLOSE)
    if (extras?.onPrint) next.push(SHORTCUT_ACTIONS.PRINT)
    if (extras?.onClose) next.push(SHORTCUT_ACTIONS.CLOSE)
    if (extras?.onAddRow) next.push(SHORTCUT_ACTIONS.ADD_ROW)
    if (extras?.onHelp) next.push(SHORTCUT_ACTIONS.HELP)
    return next
  }, [
    extras?.onAddRow,
    extras?.onClose,
    extras?.onHelp,
    extras?.onPrint,
    extras?.saveAndClose,
  ])

  const bindings = useMemo(
    () =>
      createShortcutBindings(
        actions,
        {
          [SHORTCUT_ACTIONS.SAVE]: async (event) => {
            if (event.repeat || saving.current || !latest.current.active || !latest.current.canSave || !ownsScope()) return
            saving.current = true
            try {
              await latest.current.save()
            } finally {
              saving.current = false
            }
          },
          [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: async (event) => {
            if (event.repeat || saving.current || !latest.current.active || !latest.current.canSave || !ownsScope()) return
            saving.current = true
            try {
              await latest.current.save()
            } finally {
              saving.current = false
            }
          },
          [SHORTCUT_ACTIONS.PRINT]: async (event) => {
            if (event.repeat || !latest.current.active || !latest.current.extras?.onPrint || !ownsScope()) return
            await latest.current.extras.onPrint()
          },
          [SHORTCUT_ACTIONS.CLOSE]: (event) => {
            if (event.repeat || !latest.current.active || !latest.current.extras?.onClose || !ownsScope()) return
            latest.current.extras.onClose()
          },
          [SHORTCUT_ACTIONS.ADD_ROW]: (event) => {
            if (event.repeat || !latest.current.active || !latest.current.extras?.onAddRow || !ownsScope()) return
            if (latest.current.extras.canAddRow === false) return
            latest.current.extras.onAddRow()
          },
          [SHORTCUT_ACTIONS.HELP]: (event) => {
            if (event.repeat || !latest.current.active || !latest.current.extras?.onHelp || !ownsScope()) return
            latest.current.extras.onHelp()
          },
        },
        {
          [SHORTCUT_ACTIONS.SAVE]: { stopPropagation: true },
          [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: { allowInInput: true, stopPropagation: true },
          [SHORTCUT_ACTIONS.PRINT]: { allowInInput: true, stopPropagation: true },
          [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true, stopPropagation: true },
          [SHORTCUT_ACTIONS.ADD_ROW]: { stopPropagation: true },
          [SHORTCUT_ACTIONS.HELP]: { allowInInput: true, stopPropagation: true },
        },
      ),
    [actions],
  )

  useShortcutBindings(bindings, {
    enabled: active,
    shouldHandleEvent: () => ownsScope(),
  })
}
