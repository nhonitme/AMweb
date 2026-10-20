import { useCallback, useContext, useEffect, useMemo, useRef } from "react"
import type dxForm from "devextreme/ui/form"
import type { ValidationRule } from "devextreme/common"
import { MasterPopupValidationContext } from "@/components/datagrid/masterPopupValidation"
import { createDuplicateCodeValidator } from "@/utils/gridValidation"
import { duplicateMasterMessage, requiredMasterMessage, type MasterTranslate } from "./masterValidationMessages"

type FormItem = {
  dataField?: string
  validationRules?: ValidationRule[]
  items?: FormItem[]
  tabs?: Array<{ items?: FormItem[] }>
  cssClass?: string
  isRequired?: boolean
}

export type MasterFormError = { dataField: string; message: string }

/** Required fallback also covers React lookup/identity templates without a native dxValidator. */
export function collectMasterFormRequiredErrors(items: FormItem[], data: Record<string, unknown>): MasterFormError[] {
  const errors: MasterFormError[] = []
  for (const item of items) {
    if (item.dataField) {
      const value = data[item.dataField]
      const missing = value == null || value === false || value === "" || (typeof value === "string" && !value.trim())
      if (missing) {
        for (const rule of item.validationRules ?? []) {
          if (rule.type === "required") errors.push({ dataField: item.dataField, message: rule.message ?? item.dataField })
        }
      }
    }
    errors.push(...collectMasterFormRequiredErrors(item.items ?? [], data))
    for (const tab of item.tabs ?? []) errors.push(...collectMasterFormRequiredErrors(tab.items ?? [], data))
  }
  return errors
}

export function useMasterFormValidation(t: MasterTranslate) {
  const popup = useContext(MasterPopupValidationContext)
  const popupRef = useRef(popup)
  popupRef.current = popup
  const registerFormValidation = popup?.registerFormValidation
  const formRef = useRef<dxForm | null>(null)
  const onInitialized = useCallback(({ component }: { component?: dxForm }) => { formRef.current = component ?? null }, [])

  useEffect(() => registerFormValidation?.((row) => {
    const form = formRef.current
    if (!form) return [{ dataField: "", message: t("FORM_NOT_READY", "Form chưa sẵn sàng. Vui lòng thử lưu lại.") }]
    const data = { ...row, ...(form.option("formData") as Record<string, unknown> ?? {}) }
    const errors = collectMasterFormRequiredErrors(form.option("items") as FormItem[] ?? [], data)
    for (const error of errors) {
      form.getEditor(error.dataField)?.option({ validationStatus: "invalid", validationErrors: [{ message: error.message }] })
    }
    if (errors.length) form.getEditor(errors[0].dataField)?.focus()
    return errors
  }), [registerFormValidation, t])

  const required = useCallback((field: string, fallback = field): ValidationRule[] => [
    { type: "required", message: requiredMasterMessage(t, t(field, fallback)) },
  ], [t])
  const code = useCallback((field: string, idField: string, exists: (id: number | undefined, value: string) => Promise<boolean>, fallback = field): ValidationRule[] => {
    const validate = createDuplicateCodeValidator({ idField, exists })
    return [
      ...required(field, fallback),
      {
        type: "async", message: duplicateMasterMessage(t, t(field, fallback)),
        validationCallback: async (event) => {
          return validate({ value: event.value, data: {
              ...popupRef.current?.getEditingData?.(),
              ...(formRef.current?.option("formData") as Record<string, unknown> ?? {}),
            } })
        },
      },
    ]
  }, [required, t])
  const onFieldDataChanged = useCallback((event: { dataField?: string }) => {
    if (!event.dataField) return
    popupRef.current?.clearFieldError?.(event.dataField)
    formRef.current?.getEditor(event.dataField)?.option({ validationStatus: "valid", validationErrors: [] })
  }, [])
  // Validate composite editors in rowValidating, not on their first nested widget.
  const customizeItem = useCallback((item: FormItem) => {
    if (item.cssClass?.includes("master-custom-validation")) {
      item.isRequired = item.validationRules?.some(rule => rule.type === "required") ?? false
      item.validationRules = []
    }
  }, [])
  return useMemo(() => ({ required, code, onInitialized, onFieldDataChanged, customizeItem }),
    [required, code, onInitialized, onFieldDataChanged, customizeItem])
}
