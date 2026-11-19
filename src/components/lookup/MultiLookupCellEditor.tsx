import { startTransition, useCallback, useEffect, useMemo, useRef, useState } from "react"
import TagBox from "devextreme-react/tag-box"

import type { LookupDataSource, LookupGridColumn } from "./BaseLookupCellEditor"

import "./MultiLookupCellEditor.scss"

const TOOLBAR_TAGBOX_HEIGHT = 30
const DISPLAY_CAP = 100
const SEARCH_DEBOUNCE_MS = 250
const DROPDOWN_SEARCH_HOST_CLASS = "multi-lookup-dropdown-search"
const DROPDOWN_SEARCH_INPUT_CLASS = "multi-lookup-dropdown-search__input"
const DROPDOWN_SEARCH_META_CLASS = "multi-lookup-dropdown-search__meta"

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
  searchPlaceholder?: string
  selectAllText?: string
  showingCountLabel?: (visible: number, filtered: number) => string
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

type TagBoxComponentLike = {
  content?: () => Element | undefined
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

function resolvePopupContent(component: TagBoxComponentLike | null | undefined): HTMLElement | null {
  const content = component?.content?.()
  if (!(content instanceof HTMLElement)) {
    return null
  }

  const popupContent = content.closest(".dx-popup-content")
  return popupContent instanceof HTMLElement ? popupContent : content
}

function buildVisibleItems<T extends object>(
  filteredItems: readonly T[],
  cap: number,
): T[] {
  // Keep filter order stable while ticking — do not move selected rows to the top.
  if (filteredItems.length <= cap) {
    return filteredItems as T[]
  }

  return filteredItems.slice(0, cap) as T[]
}

function getItemParts<T extends object>(
  item: T,
  columns: LookupGridColumn<T>[],
  valueExpr: string,
): { code: string; name: string } {
  const codeRaw = getRecordValue(item, valueExpr)
  const code = codeRaw == null ? "" : String(codeRaw).trim()
  const name = columns
    .filter((column) => column.dataField !== valueExpr)
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
    .join(" · ")

  if (code && name) {
    return { code, name }
  }

  const fallback = getItemLabel(item, columns)
  return { code: code || fallback, name }
}

function formatShowingMeta(
  visible: number,
  filtered: number,
  showingCountLabel?: (visible: number, filtered: number) => string,
): string {
  if (showingCountLabel) {
    return showingCountLabel(visible, filtered)
  }

  if (filtered <= visible) {
    return `${filtered} items`
  }

  return `Showing ${visible} / ${filtered}`
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
  searchPlaceholder = "Search",
  selectAllText = "Select All",
  showingCountLabel,
  noDataText = "No matching data",
  onApply,
  onClear,
  width,
  height,
  dropdownWidth = 480,
  dropdownHeight = 400,
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
  const searchTextRef = useRef(searchText)
  const searchInputRef = useRef<HTMLInputElement | null>(null)
  const searchMetaRef = useRef<HTMLElement | null>(null)
  const searchPlaceholderRef = useRef(searchPlaceholder)
  const showingCountLabelRef = useRef(showingCountLabel)
  const searchDebounceRef = useRef<number | null>(null)
  const filteredIdsRef = useRef<string[]>([])
  const visibleIdsRef = useRef<string[]>([])
  // Keep DevExtreme onValueChanged stable while the parent persists filters.
  // Recreating this handler on each checkbox click causes TagBox to rebind.
  const onApplyRef = useRef(onApply)
  const onClearRef = useRef(onClear)
  onApplyRef.current = onApply
  onClearRef.current = onClear
  searchTextRef.current = searchText
  searchPlaceholderRef.current = searchPlaceholder
  showingCountLabelRef.current = showingCountLabel
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

  useEffect(() => {
    return () => {
      if (searchDebounceRef.current != null) {
        window.clearTimeout(searchDebounceRef.current)
      }
    }
  }, [])

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

  const visibleItems = useMemo(
    () => buildVisibleItems(filteredItems, DISPLAY_CAP),
    [filteredItems],
  )

  filteredIdsRef.current = filteredItems.map((item) => String(getRecordValue(item, valueExpr) ?? ""))
  visibleIdsRef.current = visibleItems.map((item) => String(getRecordValue(item, valueExpr) ?? ""))

  // Keep the persisted/API values empty for "All", but display it as a
  // selected option so the currency filter does not appear uninitialized.
  const displayItems = useMemo(
    () => allOptionValue
      ? [{ [valueExpr]: allOptionValue } as unknown as T, ...visibleItems]
      : visibleItems,
    [allOptionValue, valueExpr, visibleItems],
  )
  const displayValues = useMemo(
    () => allOptionValue && selectedValues.length === 0 ? [allOptionValue] : selectedValues,
    [allOptionValue, selectedValues],
  )

  useEffect(() => {
    if (searchMetaRef.current) {
      searchMetaRef.current.textContent = formatShowingMeta(
        visibleItems.length,
        filteredItems.length,
        showingCountLabel,
      )
    }
  }, [filteredItems.length, showingCountLabel, visibleItems.length])

  const commitValues = useCallback(
    (nextValues: string[]) => {
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
    [],
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

      const previousValues = selectedValuesRef.current
      const visibleIds = visibleIdsRef.current
      const filteredIds = filteredIdsRef.current
      const filteredIdSet = new Set(filteredIds)
      const visibleIdSet = new Set(visibleIds)

      let resolvedValues = normalizedValues

      if (!maxSelection || maxSelection > 1) {
        const prevHadAllVisible =
          visibleIds.length > 0 && visibleIds.every((id) => previousValues.includes(id))
        const nextHasAllVisible =
          visibleIds.length > 0 && visibleIds.every((id) => normalizedValues.includes(id))
        const nextHasNoVisible =
          visibleIds.length > 0 && visibleIds.every((id) => !normalizedValues.includes(id))

        // Native Select All only sees the capped list — expand to the full filter set.
        if (nextHasAllVisible && !prevHadAllVisible && filteredIds.length > visibleIds.length) {
          const outsideFilter = previousValues.filter((id) => !filteredIdSet.has(id))
          resolvedValues = [...outsideFilter, ...filteredIds]
        } else if (prevHadAllVisible && nextHasNoVisible && filteredIds.length > 0) {
          // Native uncheck Select All — drop every id in the current filter.
          resolvedValues = previousValues.filter((id) => !filteredIdSet.has(id))
        } else if (filteredIds.length > visibleIds.length) {
          // Keep selected ids that are filtered but outside the capped visible page.
          const retainedHidden = previousValues.filter(
            (id) => filteredIdSet.has(id) && !visibleIdSet.has(id),
          )
          if (retainedHidden.length > 0) {
            const merged = new Set([...normalizedValues, ...retainedHidden])
            resolvedValues = [...merged]
          }
        }
      }

      const nextValues = limitSelectedValues(
        resolvedValues,
        previousValues,
        maxSelection,
      )

      // TagBox can emit an empty value while the lookup store is still loading;
      // keep the controlled selection so defaults like VND are not wiped.
      if (nextValues.length === 0 && previousValues.length > 0 && items.length === 0) {
        return
      }

      commitValues(nextValues)
    },
    [allOptionValue, commitValues, items.length, maxSelection],
  )

  const ensureDropdownSearch = useCallback((content: HTMLElement) => {
    let host = content.querySelector(`.${DROPDOWN_SEARCH_HOST_CLASS}`) as HTMLElement | null
    if (!host) {
      host = document.createElement("div")
      host.className = DROPDOWN_SEARCH_HOST_CLASS

      const input = document.createElement("input")
      input.type = "search"
      input.className = DROPDOWN_SEARCH_INPUT_CLASS
      input.autocomplete = "off"
      input.spellcheck = false
      input.addEventListener("mousedown", (event) => {
        event.stopPropagation()
      })
      input.addEventListener("click", (event) => {
        event.stopPropagation()
      })
      input.addEventListener("keydown", (event) => {
        event.stopPropagation()
      })
      input.addEventListener("input", () => {
        if (searchDebounceRef.current != null) {
          window.clearTimeout(searchDebounceRef.current)
        }
        searchDebounceRef.current = window.setTimeout(() => {
          setSearchText(input.value)
        }, SEARCH_DEBOUNCE_MS)
      })

      const meta = document.createElement("div")
      meta.className = DROPDOWN_SEARCH_META_CLASS
      meta.textContent = formatShowingMeta(
        visibleIdsRef.current.length,
        filteredIdsRef.current.length,
        showingCountLabelRef.current,
      )

      host.appendChild(input)
      host.appendChild(meta)
      content.insertBefore(host, content.firstChild)
      searchInputRef.current = input
      searchMetaRef.current = meta
    }

    const input = host.querySelector(`.${DROPDOWN_SEARCH_INPUT_CLASS}`) as HTMLInputElement | null
    const meta = host.querySelector(`.${DROPDOWN_SEARCH_META_CLASS}`) as HTMLElement | null
    if (!input) {
      return
    }

    searchInputRef.current = input
    searchMetaRef.current = meta
    input.placeholder = searchPlaceholderRef.current
    if (meta) {
      meta.textContent = formatShowingMeta(
        visibleIdsRef.current.length,
        filteredIdsRef.current.length,
        showingCountLabelRef.current,
      )
    }
    // Do not overwrite while the user is typing ahead of the debounced filter.
    if (document.activeElement !== input && input.value !== searchTextRef.current) {
      input.value = searchTextRef.current
    }
  }, [])

  const focusDropdownSearch = useCallback(() => {
    requestAnimationFrame(() => {
      const input = searchInputRef.current
      if (!input) {
        return
      }
      input.focus()
      input.select()
    })
  }, [])

  const handleOpened = useCallback(
    (event: { component?: TagBoxComponentLike }) => {
      const content = resolvePopupContent(event.component ?? null)
      if (!content) {
        return
      }
      ensureDropdownSearch(content)
      focusDropdownSearch()
    },
    [ensureDropdownSearch, focusDropdownSearch],
  )

  const handleClosed = useCallback(() => {
    if (searchDebounceRef.current != null) {
      window.clearTimeout(searchDebounceRef.current)
      searchDebounceRef.current = null
    }
    setSearchText("")
    if (searchInputRef.current) {
      searchInputRef.current.value = ""
    }
  }, [])

  const displayExpr = useCallback((item: T | null) => {
    if (!item) return ""
    if (allOptionValue && String(getRecordValue(item, valueExpr) ?? "") === allOptionValue) {
      return allOptionText
    }
    return getItemLabel(item, columnsRef.current)
  }, [allOptionText, allOptionValue, valueExpr])

  const itemRender = useCallback(
    (item: T) => {
      if (!item) {
        return null
      }
      if (allOptionValue && String(getRecordValue(item, valueExpr) ?? "") === allOptionValue) {
        return <span className="multi-lookup-item__text">{allOptionText}</span>
      }

      const parts = getItemParts(item, columnsRef.current, valueExpr)
      const text = parts.name ? `${parts.code} - ${parts.name}` : parts.code
      return (
        <span className="multi-lookup-item__text" title={text}>
          <span className="multi-lookup-item__code">{parts.code}</span>
          {parts.name ? <span className="multi-lookup-item__name"> - {parts.name}</span> : null}
        </span>
      )
    },
    [allOptionText, allOptionValue, valueExpr],
  )

  const dropDownOptions = useMemo(
    () => ({
      closeOnOutsideClick: true,
      width: dropdownWidth,
      height: dropdownHeight,
      wrapperAttr: { class: "multi-lookup-dropdown" },
      onContentReady: (event: { component?: { content?: () => Element | undefined } }) => {
        const mount = resolvePopupContent(event.component ?? null)
        if (mount) {
          ensureDropdownSearch(mount)
        }
      },
    }),
    [dropdownHeight, dropdownWidth, ensureDropdownSearch],
  )

  const tagBoxHeight = isToolbarVariant
    ? TOOLBAR_TAGBOX_HEIGHT
    : labelMode === "floating"
      ? undefined
      : 26

  const isSingleSelection = maxSelection === 1
  // Toolbar always collapses selected values through onMultiTagPreparing so the
  // input shows compact codes (e.g. "VND") instead of full "CODE - NAME" labels.
  const maxDisplayedTags = isToolbarVariant ? 0 : 1
  const showMultiTagOnly = isToolbarVariant || isSingleSelection ? false : true

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
      const pendingValues = selectedValuesRef.current
      if (count === 0) {
        // Controlled values can exist before TagBox resolves matching items.
        if (pendingValues.length === 1) {
          event.text = allOptionValue && pendingValues[0] === allOptionValue
            ? allOptionText
            : pendingValues[0]
          return
        }
        if (pendingValues.length > 1) {
          event.text = selectedCountLabel?.(pendingValues.length) ?? `${pendingValues.length} selected`
          return
        }
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
            : pendingValues[0] ?? ""
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
      searchEnabled={false}
      showSelectionControls={!isSingleSelection}
      showDropDownButton={true}
      selectAllMode={isSingleSelection ? undefined : "allPages"}
      selectAllText={selectAllText}
      applyValueMode="instantly"
      dropDownOptions={dropDownOptions}
      showClearButton={selectedValues.length > 0}
      label={resolvedLabel}
      labelMode={labelMode}
      placeholder={resolvedPlaceholder}
      hint={buttonHint}
      stylingMode="outlined"
      itemRender={itemRender}
      onValueChanged={handleValueChanged}
      onOpened={handleOpened}
      onClosed={handleClosed}
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
