import { createDateBoxEditorOptions, type DateBoxEditorOptions } from "./dateBoxEditorOptions"

export function createOutlinedEditorOptions<T extends Record<string, unknown>>(editorOptions: T = {} as T) {
  return {
    stylingMode: "outlined",
    ...editorOptions,
  }
}

export function createOutlinedDateBoxEditorOptions<T extends Partial<DateBoxEditorOptions>>(editorOptions: T = {} as T) {
  return createOutlinedEditorOptions(createDateBoxEditorOptions(editorOptions))
}
