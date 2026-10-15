import CheckBox from "devextreme-react/check-box"
import DateRangeBox, { type DateRangeBoxProps } from "./DateRangeBox"

export type OptionalFromDateRangeBoxProps = Omit<DateRangeBoxProps, "fromDateDisabled"> & {
  fromDateEnabled: boolean
  onFromDateEnabledChange: (enabled: boolean) => void
  checkboxText?: string
}

/**
 * Uses the exact report date-range control, adding an opt-in lower date bound.
 * When unchecked, the From editor stays populated but is disabled.
 * The caller sends p_FROM_YMD = "" to represent no start-date restriction.
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
    <div className="flex min-w-0 flex-nowrap items-end gap-2">
      <CheckBox style={{ paddingBottom: "0.3rem" }}
        value={fromDateEnabled}
        text={checkboxText}
        onValueChanged={event => onFromDateEnabledChange(Boolean(event.value))}
      />
      <DateRangeBox
        {...rangeProps}
        fromDate={fromDate}
        fromDateDisabled={!fromDateEnabled}
        className={className ?? "page-toolbar__date-range flex flex-nowrap gap-2"}
      />
    </div>
  )
}
