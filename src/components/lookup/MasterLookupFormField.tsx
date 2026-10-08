import { useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react"
import type dxForm from "devextreme/ui/form"
import { MasterPopupFieldError, MasterPopupValidationContext } from "@/components/datagrid/masterPopupValidation"
import { patchMasterFormDraft, readMasterFormDraft } from "./masterFormDraft"

import BaseLookupCellEditor, {
  type LookupDataSource,
  type LookupGridColumn,
  type LookupValue,
} from "./BaseLookupCellEditor"

type FormFieldChangedEvent = {
  dataField?: string
  value?: unknown
}

export type MasterLookupFormFieldProps<T extends object> = {
  form: dxForm
  dataField: string
  dataSource: LookupDataSource
  valueExpr: string
  getValue: (item: T) => LookupValue
  onApplyItem?: (item: T) => void
  onClear?: () => void
  displayExpr: (item: T | null) => string
  columns?: LookupGridColumn<T>[]
  placeholder?: string
  draftValue?: LookupValue
  onDraftValueChange?: (value: LookupValue) => void
  popupTitle?: string
  buttonHint?: string
  filterFocusField?: string
  searchExpr?: string[]
  noDataText?: string
  renderPopupContent?: (options: {
    closePopup: () => void
    onPick: (item: T) => void
  }) => ReactNode
}

function readFormValue(form: dxForm, dataField: string): LookupValue {
  const formData = form.option("formData") as Record<string, unknown> | null | undefined
  const value = formData?.[dataField]

  if (value === null || value === undefined || value === "") {
    return null
  }

  return typeof value === "string" || typeof value === "number" ? value : String(value)
}

function readCurrentValue(form: dxForm, dataField: string, draftValue: LookupValue | undefined): LookupValue {
  if (draftValue !== undefined) {
    return draftValue
  }

  const fromForm = readFormValue(form, dataField)
  if (fromForm !== null) {
    return fromForm
  }

  const fromDraft = readMasterFormDraft(dataField)

  if (fromDraft === null || fromDraft === undefined || fromDraft === "") {
    return null
  }

  return typeof fromDraft === "string" || typeof fromDraft === "number" ? fromDraft : String(fromDraft)
}

function sameLookupValue(left: LookupValue, right: LookupValue): boolean {
  const leftEmpty = left === null || left === undefined || left === ""
  const rightEmpty = right === null || right === undefined || right === ""
  if (leftEmpty || rightEmpty) return leftEmpty && rightEmpty
  return String(left) === String(right)
}

export default function MasterLookupFormField<T extends object>({
  form,
  dataField,
  dataSource,
  valueExpr,
  getValue,
  onApplyItem,
  onClear,
  displayExpr,
  columns,
  placeholder,
  draftValue,
  onDraftValueChange,
  popupTitle,
  buttonHint,
  filterFocusField,
  searchExpr,
  noDataText,
  renderPopupContent,
}: MasterLookupFormFieldProps<T>) {
  const popupValidation = useContext(MasterPopupValidationContext)
  const [value, setValue] = useState<LookupValue>(() => readCurrentValue(form, dataField, draftValue))
  const committedValueRef = useRef(value)

  useEffect(() => {
    const currentValue = readCurrentValue(form, dataField, draftValue)
    committedValueRef.current = currentValue
    setValue(currentValue)

    const handleFieldDataChanged = (event: FormFieldChangedEvent) => {
      if (event.dataField !== dataField) {
        return
      }

      const nextValue = event.value
      const normalizedValue =
        nextValue === null || nextValue === undefined || nextValue === ""
          ? null
          : typeof nextValue === "string" || typeof nextValue === "number"
            ? nextValue
            : String(nextValue)
      committedValueRef.current = normalizedValue
      setValue(normalizedValue)
    }

    form.on("fieldDataChanged", handleFieldDataChanged)
    return () => {
      form.off("fieldDataChanged", handleFieldDataChanged)
    }
  }, [dataField, form, draftValue])

  const commitValue = useCallback(
    (nextValue: LookupValue) => {
      const normalizedValue = nextValue === undefined || nextValue === "" ? null : nextValue
      if (sameLookupValue(committedValueRef.current, normalizedValue)) {
        return
      }
      committedValueRef.current = normalizedValue
      setValue(normalizedValue)
      if (onDraftValueChange) {
        onDraftValueChange(normalizedValue)
        popupValidation?.clearFieldError?.(dataField)
        return
      }
      patchMasterFormDraft({ [dataField]: normalizedValue })
      const formData = form.option("formData")
      const hasFormData = formData !== null && typeof formData === "object"
      if (hasFormData) {
        form.updateData(dataField, normalizedValue)
      }
      popupValidation?.setEditingField?.(dataField, normalizedValue)
    },
    [dataField, form, onDraftValueChange, popupValidation],
  )

  const applyItem = useCallback(
    (item: T) => {
      commitValue(getValue(item))
      onApplyItem?.(item)
    },
    [commitValue, getValue, onApplyItem],
  )

  const clearValue = useCallback(() => {
    commitValue(null)
    onClear?.()
  }, [commitValue, onClear])

  return (
    <>
    <BaseLookupCellEditor<T>
      dataSource={dataSource}
      value={value}
      valueExpr={valueExpr}
      displayExpr={displayExpr}
      columns={columns}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      navigateField={dataField}
      filterFocusField={filterFocusField}
      searchExpr={searchExpr}
      noDataText={noDataText}
      deferDropdownRendering={Boolean(renderPopupContent)}
      onApply={applyItem}
      onClear={clearValue}
      renderPopupContent={
        renderPopupContent
          ? ({ closePopup }) =>
              renderPopupContent({
                closePopup,
                onPick: applyItem,
              })
          : undefined
      }
    />
    <MasterPopupFieldError dataField={dataField} />
    </>
  )
}
