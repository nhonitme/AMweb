export type FormValue = string | number | boolean | null | undefined
export type FormData = Record<string, FormValue>

export interface FormField {
  id: string
  name: string
  label: string
  type: "text" | "textarea" | "select" | "number" | "email" | "tel"
  required: boolean
  placeholder?: string
  options?: { value: string; label: string }[]
  validation?: {
    pattern?: string
    min?: number
    max?: number
    minLength?: number
    maxLength?: number
  }
  description?: string
  defaultValue?: FormValue
  disabled?: boolean
  dependsOn?: string
  showWhen?: (formData: FormData) => boolean
}

export type ValidationRuleFn = (value: FormValue, formData: FormData, existingData?: FormData[]) => string[]

export interface FormConfig {
  title: string
  description?: string
  fields: FormField[]
  submitLabel?: string
  cancelLabel?: string
  validationRules?: Record<string, ValidationRuleFn>
}

export interface DeleteConfig {
  title: string
  /** @deprecated Use singleMessage or multipleMessage instead for better control. */
  message: string
  singleMessage?: string
  multipleMessage?: string
  confirmText?: string
  cancelText?: string
  warningMessage?: string
  onDelete?: (id: string) => Promise<{ success: boolean; message: string }>
}
