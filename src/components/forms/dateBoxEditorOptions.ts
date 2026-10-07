import type { Properties as DateBoxProperties } from "devextreme/ui/date_box"

export type DateBoxEditorOptions = DateBoxProperties & Record<string, unknown>

export function createDateBoxEditorOptions<T extends Partial<DateBoxEditorOptions>>(editorOptions: T = {} as T) {
  return {
    type: "date",
    displayFormat: "dd/MM/yyyy",
    pickerType: "calendar",
    useMaskBehavior: true,
    ...editorOptions,
  } as DateBoxEditorOptions & T
}

export function createDateTimeBoxEditorOptions<T extends Partial<DateBoxEditorOptions>>(editorOptions: T = {} as T) {
  return {
    type: "datetime",
    displayFormat: "dd/MM/yyyy HH:mm:ss",
    pickerType: "calendar",
    dateSerializationFormat: "yyyy-MM-ddTHH:mm:ss",
    useMaskBehavior: true,
    ...editorOptions,
  } as DateBoxEditorOptions & T
}
