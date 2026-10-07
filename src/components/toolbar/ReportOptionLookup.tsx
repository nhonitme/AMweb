import { useCallback, useMemo } from "react"
import SelectBox, { type SelectBoxTypes } from "devextreme-react/select-box"

export type ReportOptionLookupItem = {
  value: string
  label: string
}

type ReportOptionLookupProps = {
  value?: string | null
  options?: ReportOptionLookupItem[]
  visible?: boolean
  loading?: boolean
  label?: string
  labelMode?: "static" | "floating" | "hidden"
  placeholder: string
  noDataText: string
  loadingText: string
  onValueChange?: (value: string | null) => void
  className?: string
}

function normalizeValue(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null
  }

  const text = String(value).trim()
  return text || null
}

export function ReportOptionLookup({
  value,
  options,
  visible,
  loading,
  label,
  labelMode,
  placeholder,
  noDataText,
  loadingText,
  onValueChange,
  className,
}: ReportOptionLookupProps) {
  const dataSource = useMemo(
    () => (options ?? []).filter((option) => option.value.trim() && option.label.trim()),
    [options],
  )

  const hasOptions = dataSource.length > 0
  const shouldRender = visible || hasOptions

  const handleValueChanged = useCallback(
    (event: SelectBoxTypes.ValueChangedEvent) => {
      const nextValue = normalizeValue(event.value)
      if (!nextValue || nextValue === normalizeValue(value)) {
        return
      }

      onValueChange?.(nextValue)
    },
    [onValueChange, value],
  )

  if (!shouldRender) {
    return null
  }

  return (
    <SelectBox
      className={className}
      dataSource={dataSource}
      displayExpr="label"
      valueExpr="value"
      value={normalizeValue(value)}
      stylingMode="outlined"
      label={label ?? (labelMode === "floating" ? placeholder : undefined)}
      labelMode={labelMode}
      placeholder={placeholder}
      noDataText={loading ? loadingText : noDataText}
      disabled={!hasOptions}
      searchEnabled={hasOptions}
      showClearButton={false}
      width={190}
      inputAttr={{ "aria-label": label ?? placeholder }}
      onValueChanged={handleValueChanged}
    />
  )
}

export default ReportOptionLookup
