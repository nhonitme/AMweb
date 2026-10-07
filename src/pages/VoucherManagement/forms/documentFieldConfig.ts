import { createDateBoxEditorOptions, type DateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"

export function createVoucherEditorOptions<T extends Record<string, unknown>>(editorOptions: T = {} as T) {
  return {
    stylingMode: "outlined",
    ...editorOptions,
  }
}

export function createVoucherDateBoxEditorOptions<T extends Partial<DateBoxEditorOptions>>(editorOptions: T = {} as T) {
  return createVoucherEditorOptions(createDateBoxEditorOptions(editorOptions))
}

export function createRequiredRule(message: string) {
  return {
    type: "required" as const,
    message,
  }
}

export function createTrimmedRequiredRule(message: string) {
  return {
    type: "custom" as const,
    reevaluate: true,
    message,
    validationCallback: (event: { value?: unknown }) => String(event.value ?? "").trim().length > 0,
  }
}

export function createDateRequiredRule(message: string) {
  return {
    type: "custom" as const,
    reevaluate: true,
    message,
    validationCallback: (event: { value?: unknown }) => {
      if (event.value instanceof Date) {
        return !Number.isNaN(event.value.getTime())
      }

      return String(event.value ?? "").trim().length > 0
    },
  }
}
