import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import type { KeyboardEvent as ReactKeyboardEvent } from "react"
import DateBox, { CalendarOptions } from "devextreme-react/date-box"

import { createDateBoxEditorOptions, type DateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { formatDateToYmd, normalizeYmd } from "@/pages/Accounting/accountingDateUtils"
import { LanguageContext } from "@/lib/i18nLoader"

type DateRangeBoxValue = Date | string | number | null | undefined

type DateRangeBoxKeyDownEvent =
  | ReactKeyboardEvent<HTMLInputElement>
  | {
      event?: globalThis.KeyboardEvent
      key?: string
    }

export type DateRangeBoxProps = {
  fromDate?: Date | null
  toDate?: Date | null
  fromPlaceholder: string
  toPlaceholder: string
  labelMode?: "static" | "floating" | "hidden"
  onFromDateChange?: (value: Date | null) => void
  onToDateChange?: (value: Date | null) => void
  onFromDateFormattedChange?: (value: string | null) => void
  onToDateFormattedChange?: (value: string | null) => void
  onEnter?: () => void
  width?: number | string
  className?: string
  itemClassName?: string
  editorClassName?: string
  dateBoxOptions?: Partial<DateBoxEditorOptions>
  /**
   * "grouped" wraps both fields in a single bordered card with a calendar
   * icon and an arrow between From/To, instead of two separate boxed
   * inputs. Defaults to "plain" (the original two-separate-boxes look) so
   * existing callers (e.g. popups using a stacked grid layout) are unaffected.
   */
  variant?: "plain" | "grouped"
}

function normalizeDate(value: Date | null | undefined): Date | null {
  if (!value) {
    return null
  }

  const normalized = new Date(value)
  if (Number.isNaN(normalized.getTime())) {
    return null
  }

  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function parseDateBoxValue(value: DateRangeBoxValue): Date | null {
  if (value instanceof Date) {
    return normalizeDate(value)
  }

  if (typeof value === "number") {
    return normalizeDate(new Date(value))
  }

  if (typeof value === "string") {
    return normalizeDate(normalizeYmd(value))
  }

  return null
}

function isSameDate(left: Date | null, right: Date | null): boolean {
  if (!left || !right) {
    return false
  }

  return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth() && left.getDate() === right.getDate()
}

function isDateInRange(date: Date, start: Date, end: Date): boolean {
  return start.getTime() <= date.getTime() && date.getTime() <= end.getTime()
}

function lastDayOfMonth(year: number, monthIndex: number): Date {
  const date = new Date(year, monthIndex + 1, 0)
  date.setHours(0, 0, 0, 0)
  return date
}

function isLastDayOfMonth(date: Date): boolean {
  return date.getDate() === lastDayOfMonth(date.getFullYear(), date.getMonth()).getDate()
}

function clampDayInMonth(year: number, monthIndex: number, day: number): Date {
  const lastDay = lastDayOfMonth(year, monthIndex).getDate()
  const date = new Date(year, monthIndex, Math.min(day, lastDay))
  date.setHours(0, 0, 0, 0)
  return date
}

function ensureToDateNotBeforeFrom(fromDate: Date, toDate: Date): Date {
  if (toDate.getTime() >= fromDate.getTime()) {
    return toDate
  }

  const monthEnd = lastDayOfMonth(fromDate.getFullYear(), fromDate.getMonth())
  return monthEnd.getTime() >= fromDate.getTime() ? monthEnd : new Date(fromDate)
}

/**
 * When "from" changes:
 * - day 1 → "to" = last day of that month
 * - month changed → sync "to" month to that month (keep day; EOM stays EOM)
 * - year changed → sync "to" year to that year
 */
function alignToDateWithFromDate(
  nextFromDate: Date,
  previousFromDate: Date | null,
  previousToDate: Date | null,
): Date | null {
  if (nextFromDate.getDate() === 1) {
    return lastDayOfMonth(nextFromDate.getFullYear(), nextFromDate.getMonth())
  }

  if (!previousToDate) {
    return null
  }

  const monthChanged = !previousFromDate || previousFromDate.getMonth() !== nextFromDate.getMonth()
  const yearChanged = !previousFromDate || previousFromDate.getFullYear() !== nextFromDate.getFullYear()

  if (!monthChanged && !yearChanged) {
    return previousToDate
  }

  let year = previousToDate.getFullYear()
  let month = previousToDate.getMonth()
  const keepEndOfMonth = isLastDayOfMonth(previousToDate)

  if (yearChanged) {
    year = nextFromDate.getFullYear()
  }
  if (monthChanged) {
    month = nextFromDate.getMonth()
  }

  const aligned = keepEndOfMonth && monthChanged
    ? lastDayOfMonth(year, month)
    : clampDayInMonth(year, month, previousToDate.getDate())

  return ensureToDateNotBeforeFrom(nextFromDate, aligned)
}

export function DateRangeBox({
  fromDate,
  toDate,
  fromPlaceholder,
  toPlaceholder,
  labelMode,
  onFromDateChange,
  onToDateChange,
  onFromDateFormattedChange,
  onToDateFormattedChange,
  onEnter,
  width = 150,
  className = "flex flex-nowrap items-center gap-2",
  itemClassName = "flex-shrink-0",
  editorClassName,
  dateBoxOptions,
  variant = "plain",
}: DateRangeBoxProps) {
  const { lang } = useContext(LanguageContext)
  const isGrouped = variant === "grouped"
  const [calendarHoverDate, setCalendarHoverDate] = useState<Date | null>(null)
  const onEnterRef = useRef(onEnter)
  const enterSearchTimerRef = useRef<number | null>(null)
  const lastEnterKeyStampRef = useRef(0)
  onEnterRef.current = onEnter

  useEffect(() => {
    return () => {
      if (enterSearchTimerRef.current != null) {
        window.clearTimeout(enterSearchTimerRef.current)
      }
    }
  }, [])

  const normalizedFromDate = useMemo(() => normalizeDate(fromDate), [fromDate])
  const normalizedToDate = useMemo(() => normalizeDate(toDate), [toDate])
  const fromDateRef = useRef(normalizedFromDate)
  const toDateRef = useRef(normalizedToDate)
  fromDateRef.current = normalizedFromDate
  toDateRef.current = normalizedToDate

  const editorOptions = useMemo(
    () =>
      createDateBoxEditorOptions({
        stylingMode: "outlined",
        width,
        // Mask segment edits (day/month/year) should commit while typing, not only on blur.
        valueChangeEvent: "keyup",
        ...dateBoxOptions,
      }),
    [dateBoxOptions, width],
  )

  const previewRange = useMemo(() => {
    if (!normalizedFromDate || normalizedToDate || !calendarHoverDate) {
      return null
    }

    const normalizedHoverDate = normalizeDate(calendarHoverDate)
    if (!normalizedHoverDate) {
      return null
    }

    return normalizedHoverDate.getTime() < normalizedFromDate.getTime()
      ? { start: normalizedHoverDate, end: normalizedFromDate }
      : { start: normalizedFromDate, end: normalizedHoverDate }
  }, [calendarHoverDate, normalizedFromDate, normalizedToDate])

  const commitFromDate = useCallback(
    (value: Date | null) => {
      onFromDateChange?.(value)
      onFromDateFormattedChange?.(formatDateToYmd(value))
    },
    [onFromDateChange, onFromDateFormattedChange],
  )

  const commitToDate = useCallback(
    (value: Date | null) => {
      onToDateChange?.(value)
      onToDateFormattedChange?.(formatDateToYmd(value))
    },
    [onToDateChange, onToDateFormattedChange],
  )

  const handleFromDateChange = useCallback(
    (value: DateRangeBoxValue) => {
      const nextFromDate = parseDateBoxValue(value)
      if (!nextFromDate) {
        commitFromDate(null)
        return
      }

      const previousFromDate = fromDateRef.current
      const previousToDate = toDateRef.current

      // Same committed value (e.g. duplicate keyup) — skip.
      if (isSameDate(nextFromDate, previousFromDate)) {
        return
      }

      let nextToDate = alignToDateWithFromDate(nextFromDate, previousFromDate, previousToDate)
      if (!nextToDate && previousToDate) {
        nextToDate = ensureToDateNotBeforeFrom(nextFromDate, previousToDate)
      }

      // Keep the from-date the user just entered; push "to" forward if needed.
      if (nextToDate && nextFromDate.getTime() > nextToDate.getTime()) {
        nextToDate = ensureToDateNotBeforeFrom(nextFromDate, nextToDate)
      }

      fromDateRef.current = nextFromDate
      commitFromDate(nextFromDate)

      if (nextToDate && !isSameDate(nextToDate, previousToDate)) {
        toDateRef.current = nextToDate
        commitToDate(nextToDate)
      }
    },
    [commitFromDate, commitToDate],
  )

  const handleToDateChange = useCallback(
    (value: DateRangeBoxValue) => {
      const nextToDate = parseDateBoxValue(value)
      if (!nextToDate) {
        commitToDate(null)
        return
      }

      const previousFromDate = fromDateRef.current
      if (previousFromDate && nextToDate.getTime() < previousFromDate.getTime()) {
        // Editing "to" earlier than "from": clamp to from (do not steal the from value).
        toDateRef.current = previousFromDate
        commitToDate(previousFromDate)
        return
      }

      toDateRef.current = nextToDate
      commitToDate(nextToDate)
    },
    [commitToDate],
  )

  const renderCalendarCell = useCallback(
    (itemData: { date: Date; text: string; view: string }) => {
      const cellDate = normalizeDate(itemData.date)
      if (!cellDate || itemData.view !== "month") {
        return <span>{itemData.text}</span>
      }

      const selectedRangeActive = Boolean(normalizedFromDate && normalizedToDate && isDateInRange(cellDate, normalizedFromDate, normalizedToDate))
      const isStartEdge = isSameDate(cellDate, normalizedFromDate)
      const isEndEdge = isSameDate(cellDate, normalizedToDate)
      const isSelectedEdge = isStartEdge || isEndEdge
      const isPreviewRange = previewRange ? isDateInRange(cellDate, previewRange.start, previewRange.end) : false
      const isPreviewEdge = previewRange ? isSameDate(cellDate, previewRange.start) || isSameDate(cellDate, previewRange.end) : false

      const cellClasses = [
        "w-full h-full flex items-center justify-center rounded-full transition-all",
      ]

      if (selectedRangeActive) {
        cellClasses.push("bg-sky-100 text-slate-900")
      }

      if (isSelectedEdge) {
        cellClasses.push("bg-sky-700 text-white")
      }

      if (!selectedRangeActive && previewRange && isPreviewRange) {
        cellClasses.push("border border-dashed border-sky-500/80 text-sky-700")
      }

      if (!selectedRangeActive && previewRange && isPreviewEdge) {
        cellClasses.push("border border-dashed border-sky-600 text-sky-700")
      }

      return (
        <div
          className={cellClasses.join(" ")}
          onMouseEnter={() => setCalendarHoverDate(cellDate)}
          onMouseLeave={() => setCalendarHoverDate(null)}
        >
          {itemData.text}
        </div>
      )
    },
    [normalizedFromDate, normalizedToDate, previewRange],
  )

  const scheduleEnterSearch = useCallback(() => {
    // DateBox commits typed text in the same Enter turn (after keydown) via onValueChanged.
    // Defer search so parent state/refs see the new date — sync onEnter used the previous fromDate.
    if (enterSearchTimerRef.current != null) {
      window.clearTimeout(enterSearchTimerRef.current)
    }

    enterSearchTimerRef.current = window.setTimeout(() => {
      enterSearchTimerRef.current = null
      onEnterRef.current?.()
    }, 0)
  }, [])

  const handleDateBoxKeyDown = useCallback(
    (event: DateRangeBoxKeyDownEvent) => {
      const key = "event" in event ? event.event?.key ?? event.key : event.key
      if (key !== "Enter") {
        return
      }

      // onKeyDown + inputAttr.onKeyDown both fire for one Enter; debounce to a single search.
      const now = Date.now()
      if (now - lastEnterKeyStampRef.current < 50) {
        return
      }
      lastEnterKeyStampRef.current = now

      scheduleEnterSearch()
    },
    [scheduleEnterSearch],
  )

  return (
    <div className={isGrouped ? `date-range-box date-range-box--grouped ${className}` : className}>
      {isGrouped ? (
        <span className="date-range-box__icon" aria-hidden="true">
          <svg viewBox="0 0 24 24" focusable="false">
            <rect x="3" y="5" width="18" height="16" rx="2" />
            <path d="M3 9h18M8 3v4M16 3v4" />
          </svg>
        </span>
      ) : null}
      <div className={isGrouped ? `${itemClassName} date-range-box__field` : itemClassName}>
        <DateBox
          // DevExtreme caches calendar captions when the widget is created.
          key={`from-${lang}`}
          {...editorOptions}
          className={editorClassName}
          value={normalizedFromDate}
          label={labelMode === "floating" ? fromPlaceholder : undefined}
          labelMode={labelMode}
          placeholder={labelMode === "floating" ? undefined : fromPlaceholder}
          onValueChanged={(event) => handleFromDateChange(event.value)}
          onKeyDown={handleDateBoxKeyDown}
          inputAttr={{ onKeyDown: handleDateBoxKeyDown }}
        >
          <CalendarOptions cellRender={renderCalendarCell} />
        </DateBox>
      </div>
      {isGrouped ? (
        <span className="date-range-box__sep" aria-hidden="true">
          &#8594;
        </span>
      ) : null}
      <div className={isGrouped ? `${itemClassName} date-range-box__field` : itemClassName}>
        <DateBox
          key={`to-${lang}`}
          {...editorOptions}
          className={editorClassName}
          value={normalizedToDate}
          label={labelMode === "floating" ? toPlaceholder : undefined}
          labelMode={labelMode}
          placeholder={labelMode === "floating" ? undefined : toPlaceholder}
          onValueChanged={(event) => handleToDateChange(event.value)}
          onKeyDown={handleDateBoxKeyDown}
          inputAttr={{ onKeyDown: handleDateBoxKeyDown }}
        >
          <CalendarOptions cellRender={renderCalendarCell} />
        </DateBox>
      </div>
    </div>
  )
}

export default DateRangeBox
