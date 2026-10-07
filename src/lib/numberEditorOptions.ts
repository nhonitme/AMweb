import type { Format } from "devextreme/localization"

export function createNumberEditorOptions<T extends Record<string, unknown>>(
  format: Format | string,
  editorOptions?: T,
) {
  return {
    format,
    useMaskBehavior: true,
    ...editorOptions,
  }
}
