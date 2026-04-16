import { useContext, useMemo } from "react"
import Popup from "devextreme-react/popup"
import { LanguageContext } from "@/lib/i18nLoader"
import {
  SHORTCUT_GROUP_ORDER,
  type ShortcutDefinition,
  type ShortcutGroup,
} from "@/lib/shortcuts/shortcutDefinitions"
import { formatShortcutCombo } from "@/lib/shortcuts/shortcutUtils"

type ShortcutHelpPopupProps = {
  visible: boolean
  shortcuts: ShortcutDefinition[]
  onClose: () => void
  title?: string
}

const groupFallbackLabels: Record<ShortcutGroup, string> = {
  system: "System",
  navigation: "Navigation",
  form: "Form",
  grid: "Grid",
}

export default function ShortcutHelpPopup({
  visible,
  shortcuts,
  onClose,
  title = "Keyboard shortcuts",
}: ShortcutHelpPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const groupedShortcuts = useMemo(() => {
    const nextGroups = new Map<ShortcutGroup, ShortcutDefinition[]>()

    shortcuts
      .filter((shortcut) => shortcut.visible !== false)
      .forEach((shortcut) => {
        const items = nextGroups.get(shortcut.group) ?? []
        items.push(shortcut)
        nextGroups.set(shortcut.group, items)
      })

    return SHORTCUT_GROUP_ORDER
      .map((group) => ({
        group,
        items: nextGroups.get(group) ?? [],
      }))
      .filter((group) => group.items.length > 0)
  }, [shortcuts])

  const resolveText = (key: string | undefined, fallback: string) =>
    key && translate ? translate(key, fallback) : fallback

  return (
    <Popup
      visible={visible}
      title={resolveText("SHORTCUT_HELP", title)}
      showTitle={true}
      width={620}
      maxWidth="92vw"
      height="auto"
      maxHeight="80vh"
      dragEnabled={false}
      hideOnOutsideClick={true}
      onHiding={onClose}
    >
      <div className="space-y-4 p-2">
        {groupedShortcuts.map(({ group, items }) => (
          <section key={group} className="space-y-2">
            <div className="border-b border-gray-200 pb-2 text-sm font-semibold text-gray-800">
              {resolveText(`SHORTCUT_GROUP_${group.toUpperCase()}`, groupFallbackLabels[group])}
            </div>
            <div className="space-y-2">
              {items.map((shortcut) => (
                <div
                  key={shortcut.action}
                  className="flex items-center justify-between gap-4 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2"
                >
                  <div className="text-sm text-gray-700">
                    {resolveText(shortcut.labelKey, shortcut.label)}
                  </div>
                  <div className="rounded-md bg-white px-2 py-1 font-mono text-xs font-semibold text-gray-800 shadow-sm">
                    {formatShortcutCombo(shortcut.combo)}
                  </div>
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </Popup>
  )
}
