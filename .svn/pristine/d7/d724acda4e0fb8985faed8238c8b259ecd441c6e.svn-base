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
  defaultValue?: any
  disabled?: boolean
  dependsOn?: string // Field dependency
  showWhen?: (formData: any) => boolean // Conditional display
}

export interface FormConfig {
  title: string
  description?: string
  fields: FormField[]
  submitLabel?: string
  cancelLabel?: string
  validationRules?: {
    [key: string]: (value: any, formData: any, existingData?: any[]) => string[]
  }
}

export interface DeleteConfig {
  title: string
  /** @deprecated Use singleMessage or multipleMessage instead for better control. */
  message: string // Kept for backward compatibility, but singleMessage/multipleMessage are preferred
  singleMessage?: string // Message for deleting a single item (e.g., "Bạn có chắc chắn muốn xóa {item}?")
  multipleMessage?: string // Message for deleting multiple items (e.g., "Bạn có chắc chắn muốn xóa {count} mục đã chọn?")
  confirmText?: string
  cancelText?: string
  warningMessage?: string
  onDelete?: (id: string) => Promise<{ success: boolean; message: string }>
}
