import { useCallback, useEffect, useState, type ReactNode } from "react"
import type dxForm from "devextreme/ui/form"

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
  popupTitle,
  buttonHint,
  filterFocusField,
  searchExpr,
  noDataText,
  renderPopupContent,
}: MasterLookupFormFieldProps<T>) {
  const [value, setValue] = useState<LookupValue>(() => readFormValue(form, dataField))

  useEffect(() => {
    setValue(readFormValue(form, dataField))

    const handleFieldDataChanged = (event: FormFieldChangedEvent) => {
      if (event.dataField !== dataField) {
        return
      }

      const nextValue = event.value
      setValue(
        nextValue === null || nextValue === undefined || nextValue === ""
          ? null
          : typeof nextValue === "string" || typeof nextValue === "number"
            ? nextValue
            : String(nextValue),
      )
    }

    form.on("fieldDataChanged", handleFieldDataChanged)
    return () => {
      form.off("fieldDataChanged", handleFieldDataChanged)
    }
  }, [dataField, form])

  const commitValue = useCallback(
    (nextValue: LookupValue) => {
      const normalizedValue = nextValue === undefined || nextValue === "" ? null : nextValue
      setValue(normalizedValue)
      form.updateData(dataField, normalizedValue)
    },
    [dataField, form],
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
  )
}
