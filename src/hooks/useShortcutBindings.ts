import { useEffect } from "react"
import { resolveShortcutBinding, type ShortcutBinding } from "@/lib/shortcuts/shortcutBindings"
import {
  flushActiveShortcutTarget,
  isEditableShortcutTarget,
  matchesShortcutEvent,
} from "@/lib/shortcuts/shortcutUtils"

type UseShortcutBindingsOptions = {
  enabled?: boolean
  capture?: boolean
}

export function useShortcutBindings(
  bindings: ShortcutBinding[],
  { enabled = true, capture = true }: UseShortcutBindingsOptions = {},
) {
  useEffect(() => {
    if (!enabled || bindings.length === 0) {
      return
    }

    const resolvedBindings = bindings.map(resolveShortcutBinding)

    const handleKeyDown = async (event: KeyboardEvent) => {
      for (const binding of resolvedBindings) {
        if (binding.enabled === false) {
          continue
        }

        const allowInInput = binding.allowInInput ?? binding.shortcut.allowInInput ?? false
        if (!allowInInput && isEditableShortcutTarget(event.target)) {
          continue
        }

        if (!matchesShortcutEvent(event, binding.shortcut.combo)) {
          continue
        }

        if (binding.preventDefault ?? binding.shortcut.preventDefault ?? true) {
          event.preventDefault()
        }

        if (binding.stopPropagation ?? binding.shortcut.stopPropagation ?? false) {
          event.stopPropagation()
        }

        if (binding.commitActiveEditor ?? binding.shortcut.commitActiveEditor ?? false) {
          await flushActiveShortcutTarget(event.target)
        }

        binding.handler(event, binding.shortcut)
        break
      }
    }

    window.addEventListener("keydown", handleKeyDown, capture)
    return () => {
      window.removeEventListener("keydown", handleKeyDown, capture)
    }
  }, [bindings, capture, enabled])
}

export default useShortcutBindings
