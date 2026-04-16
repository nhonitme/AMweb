import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  getSharedShortcutDefinitions,
  type ShortcutActionCode,
} from "@/lib/shortcuts/shortcutDefinitions"

let activeShortcutHelpOwnerId: string | null = null
let shortcutHelpOwnerSequence = 0
const shortcutHelpSubscribers = new Set<() => void>()

function notifyShortcutHelpSubscribers() {
  shortcutHelpSubscribers.forEach((listener) => listener())
}

function setActiveShortcutHelpOwner(ownerId: string | null) {
  if (activeShortcutHelpOwnerId === ownerId) {
    return
  }

  activeShortcutHelpOwnerId = ownerId
  notifyShortcutHelpSubscribers()
}

export function useShortcutHelp(actions: ShortcutActionCode[]) {
  const ownerIdRef = useRef<string>("")
  if (!ownerIdRef.current) {
    shortcutHelpOwnerSequence += 1
    ownerIdRef.current = `shortcut-help-${shortcutHelpOwnerSequence}`
  }

  const [activeOwnerId, setActiveOwnerId] = useState(activeShortcutHelpOwnerId)

  const shortcuts = useMemo(() => getSharedShortcutDefinitions(actions), [actions])

  useEffect(() => {
    const handleChange = () => {
      setActiveOwnerId(activeShortcutHelpOwnerId)
    }

    shortcutHelpSubscribers.add(handleChange)
    return () => {
      shortcutHelpSubscribers.delete(handleChange)
      if (activeShortcutHelpOwnerId === ownerIdRef.current) {
        setActiveShortcutHelpOwner(null)
      }
    }
  }, [])

  const openShortcutHelp = useCallback(() => {
    setActiveShortcutHelpOwner(ownerIdRef.current)
  }, [])

  const closeShortcutHelp = useCallback(() => {
    if (activeShortcutHelpOwnerId === ownerIdRef.current) {
      setActiveShortcutHelpOwner(null)
    }
  }, [])

  return {
    shortcutHelpVisible: activeOwnerId === ownerIdRef.current,
    shortcutHelpItems: shortcuts,
    openShortcutHelp,
    closeShortcutHelp,
  }
}

export default useShortcutHelp
