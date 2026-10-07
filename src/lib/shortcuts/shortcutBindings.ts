import {
  getSharedShortcutDefinition,
  type ShortcutActionCode,
  type ShortcutDefinition,
} from "./shortcutDefinitions"

export type ShortcutHandler = (event: KeyboardEvent, shortcut: ShortcutDefinition) => void

export type ShortcutBinding = {
  action: ShortcutActionCode
  handler: ShortcutHandler
  enabled?: boolean
  allowInInput?: boolean
  commitActiveEditor?: boolean
  preventDefault?: boolean
  stopPropagation?: boolean
}

export function createShortcutBindings(
  actions: ShortcutActionCode[],
  handlers: Partial<Record<ShortcutActionCode, ShortcutHandler>>,
  options?: Partial<Record<ShortcutActionCode, Omit<ShortcutBinding, "action" | "handler">>>,
) {
  return actions.flatMap((action) => {
    const handler = handlers[action]
    if (!handler) {
      return []
    }

    return [
      {
        action,
        handler,
        ...options?.[action],
      } satisfies ShortcutBinding,
    ]
  })
}

export function resolveShortcutBinding(binding: ShortcutBinding) {
  return {
    ...binding,
    shortcut: getSharedShortcutDefinition(binding.action),
  }
}
