import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import TagBox from "devextreme-react/tag-box"

import type { LookupDataSource, LookupGridColumn } from "./BaseLookupCellEditor"

const TOOLBAR_TAGBOX_HEIGHT = 30

type MultiLookupCellEditorProps<T extends object> = {
  dataSource: LookupDataSource
  values: string[]
  valueExpr: string
  columns: LookupGridColumn<T>[]
  label?: string
  labelMode?: "static" | "floating" | "hidden"
  placeholder?: string
  buttonHint?: string
  searchExpr?: string[]
  noDataText?: string
  onApply: (values: string[]) => void
  onClear?: () => void
  width?: number | string
  height?: number
  dropdownWidth?: number
  dropdownHeight?: number
  className?: string
  variant?: "default" | "toolbar"
  selectedCountLabel?: (count: number) => string
  toolbarSingleTagDisplayExpr?: (item: T) => string
  maxSelection?: number
  /** Optional synthetic "all" choice; empty filter values still mean no restriction. */
  allOption?: { value: string; text: string }
}

type LoadableLookupSource = {
  load: (options?: unknown) => Promise<unknown>
}

function isLoadableSource(source: unknown): source is LoadableLookupSource {
  if (typeof source !== "object" || source === null) {
    return false
  }

  const candidate = source as { load?: unknown }
  return typeof candidate.load === "function"
}

function getRecordValue(item: object, field: string): unknown {
  return (item as Record<string, unknown>)[field]
}

function getItemLabel<T extends object>(item: T, columns: LookupGridColumn<T>[]): string {
  const values = columns
    .map((column) => {
      if (typeof column.calculateCellValue === "function") {
        const calculated = column.calculateCellValue(item)
        return calculated == null ? "" : String(calculated)
      }

      const raw = getRecordValue(item, column.dataField)
      return raw == null ? "" : String(raw)
    })
    .map((value) => value.trim())
    .filter(Boolean)

  return values.join(" - ")
}

function areStringArraysEqual(first: readonly string[], second: readonly string[]): boolean {
  if (first.length !== second.length) {
    return false
  }

  const secondValues = new Set(second)
  return first.every((value) => secondValues.has(value))
}

function normalizeSelectedValues(value: unknown): string[] {
  return Array.isArray(value) ? value.map((item) => String(item)) : []
}

function limitSelectedValues(
  nextValues: string[],
  previousValues: readonly string[],
  maxSelection?: number,
): string[] {
  if (!maxSelection || maxSelection <= 0 || nextValues.length <= maxSelection) {
    return nextValues
  }

  const newlyAdded = nextValues.filter((value) => !previousValues.includes(value))
  if (newlyAdded.length > 0) {
    return newlyAdded.slice(-maxSelection)
  }

  return nextValues.slice(-maxSelection)
}

export default function MultiLookupCellEditor<T extends object>({
  dataSource,
  values,
  valueExpr,
  columns,
  label,
  labelMode,
  placeholder = "",
  buttonHint = "Open lookup",
  searchExpr,
  noDataText = "No matching data",
  onApply,
  onClear,
  width,
  height,
  dropdownWidth = 360,
  dropdownHeight = 360,
  className,
  variant = "default",
  selectedCountLabel,
  toolbarSingleTagDisplayExpr,
  maxSelection,
  allOption,
}: MultiLookupCellEditorProps<T>) {
  const isToolbarVariant = variant === "toolbar"
  const [items, setItems] = useState<T[]>([])
  const [searchText, setSearchText] = useState("")
  const [selectedValues, setSelectedValues] = useState<string[]>(values)
  const selectedValuesRef = useRef(values)
  // Keep DevExtreme onValueChanged stable while the parent persists filters.
  // Recreating this handler on each checkbox click causes TagBox to rebind.
  const onApplyRef = useRef(onApply)
  const onClearRef = useRef(onClear)
  onApplyRef.current = onApply
  onClearRef.current = onClear
  const allOptionValue = allOption?.value
  const allOptionText = allOption?.text ?? ""
  const columnsRef = useRef(columns)
  columnsRef.current = columns

  const nextSearchFields = useMemo(() => {
    if (Array.isArray(searchExpr) && searchExpr.length > 0) {
      return searchExpr
    }

    return columns
      .filter((column) => column.visible !== false)
      .map((column) => column.dataField)
  }, [columns, searchExpr])
  const searchFieldsRef = useRef<string[]>(nextSearchFields)

  if (!areStringArraysEqual(searchFieldsRef.current, nextSearchFields)) {
    searchFieldsRef.current = nextSearchFields
  }

  const resolvedSearchFields = searchFieldsRef.current

  useEffect(() => {
    if (!areStringArraysEqual(values, selectedValuesRef.current)) {
      selectedValuesRef.current = values
      setSelectedValues(values)
      if (values.length === 0) {
        setSearchText("")
      }
    }
  }, [values])

  useEffect(() => {
    let cancelled = false

    const loadItems = async (): Promise<void> => {
      if (Array.isArray(dataSource)) {
        setItems(dataSource)
        return
      }

      if (isLoadableSource(dataSource)) {
        try {
          const loaded = await dataSource.load()
          if (!cancelled && Array.isArray(loaded)) {
            setItems(loaded as T[])
          }
        } catch {
          if (!cancelled) {
            setItems([])
          }
        }
        return
      }

      setItems([])
    }

    void loadItems()

    return () => {
      cancelled = true
    }
  }, [dataSource])

  const filteredItems = useMemo(
    () => {
      if (!searchText) {
        return items
      }

      const normalizedText = searchText.trim().toLowerCase()
      return items.filter((item) =>
        resolvedSearchFields.some((field) => {
          const raw = getRecordValue(item, field)
          return raw != null && String(raw).toLowerCase().includes(normalizedText)
        }),
      )
    },
    [items, resolvedSearchFields, searchText],
  )

  // Keep the persisted/API values empty for "All", but display it as a
  // selected option so the currency filter does not appear uninitialized.
  const displayItems = useMemo(
    () => allOptionValue
      ? [{ [valueExpr]: allOptionValue } as unknown as T, ...filteredItems]
      : filteredItems,
    [allOptionValue, filteredItems, valueExpr],
  )
  const displayValues = useMemo(
    () => allOptionValue && selectedValues.length === 0 ? [allOptionValue] : selectedValues,
    [allOptionValue, selectedValues],
  )

  const handleValueChanged = useCallback(
    (event: { value?: unknown }) => {
      const rawValues = normalizeSelectedValues(event.value)
      // "All" is a display-only sentinel. Never pass it to the API's fcType filter.
      // Selecting a real currency replaces "All"; selecting "All" clears a
      // previously selected currency filter.
      const valuesWithoutAll = allOptionValue
        ? rawValues.filter((value) => value !== allOptionValue)
        : rawValues
      const normalizedValues = allOptionValue && rawValues.includes(allOptionValue)
        && selectedValuesRef.current.length > 0
        ? []
        : valuesWithoutAll
      const nextValues = limitSelectedValues(
        normalizedValues,
        selectedValuesRef.current,
        maxSelection,
      )

      if (areStringArraysEqual(nextValues, selectedValuesRef.current)) {
        return
      }

      selectedValuesRef.current = nextValues
      setSelectedValues(nextValues)

      if (nextValues.length === 0) {
        startTransition(() => {
          if (onClearRef.current) {
            onClearRef.current()
            return
          }

          onApplyRef.current([])
        })
        return
      }

      startTransition(() => {
        onApplyRef.current(nextValues)
      })
    },
    [allOptionValue, maxSelection],
  )

  const handleSearchChange = useCallback((event: { value?: unknown }) => {
    setSearchText(String(event.value ?? ""))
  }, [])

  const displayExpr = useCallback((item: T | null) => {
    if (!item) return ""
    if (allOptionValue && String(getRecordValue(item, valueExpr) ?? "") === allOptionValue) {
      return allOptionText
    }
    return getItemLabel(item, columnsRef.current)
  }, [allOptionText, allOptionValue, valueExpr])

  const dropDownOptions = useMemo(
    () => ({
      closeOnOutsideClick: true,
      width: dropdownWidth,
      height: dropdownHeight,
    }),
    [dropdownHeight, dropdownWidth],
  )

  const tagBoxHeight = isToolbarVariant
    ? TOOLBAR_TAGBOX_HEIGHT
    : labelMode === "floating"
      ? undefined
      : 26

  const isSingleSelection = maxSelection === 1
  const maxDisplayedTags = isSingleSelection ? 1 : isToolbarVariant ? 0 : 1
  const showMultiTagOnly = isSingleSelection ? false : isToolbarVariant ? false : true

  const multiTagPlaceholder = useMemo(() => {
    if (isToolbarVariant || selectedValues.length === 0) {
      return undefined
    }

    return selectedValues.length > 1 ? `${selectedValues.length} selected` : undefined
  }, [isToolbarVariant, selectedValues.length])

  const handleMultiTagPreparing = useCallback(
    (event: { cancel?: boolean; selectedItems?: unknown[]; text?: string }) => {
      if (!isToolbarVariant) {
        return
      }

      const selectedItems = event.selectedItems ?? []
      const count = selectedItems.length
      if (count === 0) {
        event.cancel = true
        return
      }

      if (count === 1) {
        const item = selectedItems[0] as T | undefined
        if (item && allOptionValue && String(getRecordValue(item, valueExpr) ?? "") === allOptionValue) {
          event.text = allOptionText
          return
        }
        if (item && toolbarSingleTagDisplayExpr) {
          const displayText = toolbarSingleTagDisplayExpr(item).trim()
          if (displayText) {
            event.text = displayText
            return
          }
        }

        const codeFromItem = item ? getRecordValue(item, valueExpr) : undefined
        const code =
          codeFromItem != null && String(codeFromItem).trim()
            ? String(codeFromItem).trim()
            : selectedValuesRef.current[0] ?? ""
        event.text = code
        return
      }

      event.text = selectedCountLabel?.(count) ?? `${count} selected`
    },
    [allOptionText, allOptionValue, isToolbarVariant, selectedCountLabel, toolbarSingleTagDisplayExpr, valueExpr],
  )

  const resolvedClassName = useMemo(() => {
    const classes = [
      className,
      isToolbarVariant ? "page-toolbar__field--tagbox" : undefined,
      isToolbarVariant && displayValues.length > 0 ? "page-toolbar__field--tagbox-filled" : undefined,
    ].filter(Boolean)
    return classes.length > 0 ? classes.join(" ") : undefined
  }, [className, displayValues.length, isToolbarVariant])

  const resolvedLabel = label ?? (labelMode === "floating" ? placeholder : undefined)
  const resolvedPlaceholder =
    isToolbarVariant && labelMode === "floating" ? "" : placeholder

  return (
    <TagBox
      className={resolvedClassName}
      dataSource={displayItems}
      value={displayValues}
      valueExpr={valueExpr}
      displayExpr={displayExpr}
      searchExpr={resolvedSearchFields}
      searchEnabled={true}
      showSelectionControls={!isSingleSelection}
      showDropDownButton={true}
      selectAllMode={isSingleSelection ? undefined : "allPages"}
      applyValueMode="instantly"
      dropDownOptions={dropDownOptions}
      showClearButton={selectedValues.length > 0}
      label={resolvedLabel}
      labelMode={labelMode}
      placeholder={resolvedPlaceholder}
      hint={buttonHint}
      stylingMode="outlined"
      onValueChanged={handleValueChanged}
      onSearchValueChanged={handleSearchChange}
      width={width}
      height={height ?? tagBoxHeight}
      noDataText={noDataText}
      showMultiTagOnly={showMultiTagOnly}
      maxDisplayedTags={maxDisplayedTags}
      multiTagPlaceholder={multiTagPlaceholder}
      onMultiTagPreparing={handleMultiTagPreparing}
      useItemTextAsTitle={true}
    />
  )
}
