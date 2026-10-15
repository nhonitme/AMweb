import DateRangeBox, { type DateRangeBoxProps } from "./DateRangeBox"

export type OptionalFromDateRangeBoxProps = Omit<DateRangeBoxProps, "fromDateDisabled" | "fromDateToggle"> & {
  fromDateEnabled: boolean
  onFromDateEnabledChange: (enabled: boolean) => void
  /** Accessible checkbox label; not rendered as visible text. */
  checkboxText?: string
}

/**
 * Keep the checkbox inside DateRangeBox, immediately before the From editor.
 * The From value remains visible while disabled; the caller sends p_FROM_YMD = ""
 * when unchecked, without clearing the retained date.
 */
export default function OptionalFromDateRangeBox({
  fromDateEnabled,
  onFromDateEnabledChange,
  checkboxText = "Lọc từ ngày",
  fromDate,
  className,
  ...rangeProps
}: OptionalFromDateRangeBoxProps) {
  return (
    <DateRangeBox
      {...rangeProps}
      fromDate={fromDate}
      fromDateDisabled={!fromDateEnabled}
      fromDateToggle={{
        checked: fromDateEnabled,
        onChange: onFromDateEnabledChange,
        ariaLabel: checkboxText,
      }}
      className={className ?? "page-toolbar__date-range flex flex-nowrap gap-2"}
    />
  )
}
