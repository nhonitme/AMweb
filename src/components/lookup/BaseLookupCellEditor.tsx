import { type ReactNode, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Popup from "devextreme-react/popup"
import SelectBox, {
  Button as SelectBoxButton,
  DropDownOptions,
  type SelectBoxTypes,
} from "devextreme-react/select-box"
import DataGrid, {
  Column,
  type DataGridTypes,
  FilterRow,
  Paging,
  Scrolling,
  Selection,
} from "devextreme-react/data-grid"
import type dxOverlay from "devextreme/ui/overlay"
import type dxSelectBox from "devextreme/ui/select_box"
import {
  disableBuiltInPopupEscape,
  usePopupEscapeLayer,
} from "@/components/popup/popupEscapeStack"
import { useLookupPopupCommands } from "./LookupPopupHost"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import {
  overlayWrapperFromPopupContent,
  raiseOverlayAboveSiblings,
} from "@/components/popup/raiseOverlayZIndex"
import {
  focusNextEditableGridCell,
  focusPreviousEditableGridCell,
  getLookupOverlayContainer,
  type LookupGridCellValueHost,
} from "./lookupHelpers"

type LookupGridFocusHost = LookupGridCellValueHost & {
  editCell?: (rowIndex: number, fieldName: string) => void
  focus?: (element?: Element) => void
  getCellElement?: (rowIndex: number, visibleColumnIndex: number) => unknown
  getVisibleColumns?: () => Array<{ dataField?: string; name?: string; index?: number; visibleIndex?: number }>
}

export type LookupDataSource = SelectBoxTypes.Properties["dataSource"]
export type LookupValue = string | number | null | undefined

const LOOKUP_DROPDOWN_PAGE_SIZE = 40
const LOOKUP_DROPDOWN_ROW_HEIGHT = 32

function sameLookupValue(left: LookupValue, right: LookupValue): boolean {
  const leftEmpty = left === null || left === undefined || left === ""
  const rightEmpty = right === null || right === undefined || right === ""
  if (leftEmpty || rightEmpty) return leftEmpty && rightEmpty
  return String(left) === String(right)
}

function readCssPx(value: string): number {
  const parsed = Number.parseFloat(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function longestRenderedLookupRowWidth(overlay: HTMLElement): number {
  const list = overlay.querySelector(".dx-list-items") ?? overlay.querySelector(".dx-list")
  if (!list) {
    return 0
  }

  const probe = list.cloneNode(true) as HTMLElement
  probe.style.position = "fixed"
  probe.style.left = "-10000px"
  probe.style.top = "0"
  probe.style.width = "max-content"
  probe.style.maxWidth = "none"
  probe.style.height = "auto"
  probe.style.visibility = "hidden"
  document.body.appendChild(probe)

  let max = 0
  for (const row of probe.querySelectorAll(".dx-list-item-content")) {
    const item = row as HTMLElement
    item.style.width = "max-content"
    item.style.maxWidth = "none"
    max = Math.max(max, item.scrollWidth)
  }

  probe.remove()
  return max
}

function lookupDropDownTargetWidth(overlay: HTMLElement, editor: HTMLElement, cap: number, maxHeight: number): number | null {
  const rows = overlay.querySelectorAll(".dx-list-item-content")
  const contentWidth = longestRenderedLookupRowWidth(overlay)
  if (rows.length === 0 || contentWidth < 8) {
    return null
  }

  const sample = rows[0] as HTMLElement
  const itemStyle = sample.parentElement ? getComputedStyle(sample.parentElement) : null
  const popupContent = overlay.querySelector(".dx-popup-content")
  const popupStyle = popupContent ? getComputedStyle(popupContent) : null
  const chrome =
    (itemStyle ? readCssPx(itemStyle.paddingLeft) + readCssPx(itemStyle.paddingRight) : 0) +
    (popupStyle ? readCssPx(popupStyle.paddingLeft) + readCssPx(popupStyle.paddingRight) : 0) +
    2
  const scrollable = overlay.querySelector(".dx-scrollable-container")
  const needsScrollbar = scrollable
    ? scrollable.scrollHeight > Math.min(scrollable.clientHeight, maxHeight) + 1
    : rows.length * LOOKUP_DROPDOWN_ROW_HEIGHT > maxHeight
  const editorWidth = Math.ceil(editor.getBoundingClientRect().width)
  const fitted = Math.ceil(contentWidth + chrome + (needsScrollbar ? 16 : 0))
  const viewportCap = Math.max(editorWidth, window.innerWidth - 24)

  return Math.min(cap, viewportCap, Math.max(editorWidth, fitted))
}

function toSelectBoxDataSource(dataSource: LookupDataSource): LookupDataSource {
  if (!dataSource || Array.isArray(dataSource) || typeof dataSource === "string") {
    return dataSource
  }

  if (typeof dataSource === "object" && "store" in dataSource && !("load" in dataSource)) {
    return dataSource
  }

  if (typeof dataSource === "object" && typeof (dataSource as { load?: unknown }).load === "function") {
    return {
      store: dataSource,
      paginate: true,
      pageSize: LOOKUP_DROPDOWN_PAGE_SIZE,
    } as LookupDataSource
  }

  return dataSource
}

export type LookupGridColumn<T> = {
  dataField: string
  caption: string
  width?: number | string
  minWidth?: number
  visible?: boolean
  calculateCellValue?: (rowData: T) => unknown
}

type BaseLookupCellEditorProps<T extends object> = {
  dataSource: LookupDataSource
  value: LookupValue
  valueExpr: string
  displayExpr: (item: T | null) => string
  columns?: LookupGridColumn<T>[]
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  filterFocusField?: string
  searchExpr?: string[]
  noDataText?: string
  onApply: (item: T) => void
  onClear?: () => void
  dropDownWidth?: number
  dropDownHeight?: number
  popupWidth?: number | string
  popupHeight?: number | string
  popupGridHeight?: number | string
  popupPageSize?: number
  deferDropdownRendering?: boolean
  renderPopupContent?: (options: { closePopup: () => void }) => ReactNode
  autoOpen?: LookupOpenMode | null
  grid?: LookupGridFocusHost
  rowIndex?: number
  navigateField?: string
  onBeforeTabNavigate?: (component: dxSelectBox) => void | Promise<void>
  itemRender?: (item: T | null) => ReactNode
  className?: string
  readOnly?: boolean
  disabled?: boolean
  showClearButton?: boolean
  searchTimeout?: number
  acceptCustomValue?: boolean
  stylingMode?: SelectBoxTypes.Properties["stylingMode"]
  validationMessageMode?: SelectBoxTypes.Properties["validationMessageMode"]
  onInput?: (event: SelectBoxTypes.InputEvent) => void
  onClosed?: (event: SelectBoxTypes.ClosedEvent) => void
  onOpenedChange?: (opened: boolean) => void
  opened?: boolean
  resolveSelectedItem?: (event: SelectBoxTypes.ValueChangedEvent) => Promise<T | null>
  shouldHandleValueChange?: (event: SelectBoxTypes.ValueChangedEvent) => boolean
}

export default function BaseLookupCellEditor<T extends object>({
  dataSource,
  value,
  valueExpr,
  displayExpr,
  columns = [],
  placeholder = "",
  popupTitle = "",
  buttonHint = "",
  filterFocusField,
  searchExpr,
  noDataText = "No matching data",
  onApply,
  onClear,
  dropDownWidth = 920,
  dropDownHeight = 320,
  popupWidth = "95vw",
  popupHeight = "90vh",
  popupGridHeight = "calc(90vh - 92px)",
  popupPageSize = 20,
  deferDropdownRendering = false,
  renderPopupContent,
  autoOpen,
  grid,
  rowIndex = -1,
  navigateField,
  onBeforeTabNavigate,
  itemRender,
  className = "",
  readOnly = false,
  disabled = false,
  showClearButton = true,
  searchTimeout = 0,
  acceptCustomValue,
  stylingMode,
  validationMessageMode,
  onInput,
  onClosed,
  onOpenedChange,
  opened: openedOverride,
  resolveSelectedItem: resolveSelectedItemOverride,
  shouldHandleValueChange,
}: BaseLookupCellEditorProps<T>) {
  // Start closed; open after SelectBox init so production creates a real overlay.
  const [opened, setOpened] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)
  const [dropDownAnchor, setDropDownAnchor] = useState<HTMLElement | null>(null)
  const filterInputRef = useRef<HTMLInputElement | null>(null)
  const selectBoxRef = useRef<dxSelectBox | null>(null)
  const dropDownPopupRef = useRef<dxOverlay | null>(null)
  const popupWrapperRef = useRef<HTMLElement | null>(null)
  const shouldFocusFilterRef = useRef(false)
  const autoOpenHandledRef = useRef(false)
  const pendingAutoOpenDropdownRef = useRef(autoOpen === "dropdown")
  const tabNavigationRef = useRef(false)
  const pendingAppliedValueRef = useRef<LookupValue>(undefined)
  const lookupPopupHost = useLookupPopupCommands()

  useEffect(() => {
    if (pendingAppliedValueRef.current !== undefined && !sameLookupValue(value, pendingAppliedValueRef.current)) {
      pendingAppliedValueRef.current = undefined
    }
  }, [value])

  const selectedRowKeys = useMemo(() => {
    if (value === null || value === undefined || value === "") {
      return []
    }

    return [value]
  }, [value])

  const selectBoxDataSource = useMemo(() => toSelectBoxDataSource(dataSource), [dataSource])

  const resolvedSearchExpr = useMemo(() => {
    const fields = Array.isArray(searchExpr) && searchExpr.length > 0
      ? searchExpr
      : columns
          .filter((column) => column.visible !== false)
          .map((column) => column.dataField)

    return Array.from(new Set(fields.filter((field) => typeof field === "string" && field.trim().length > 0)))
  }, [columns, searchExpr])

  const focusFilter = useCallback(() => {
    const input = filterInputRef.current
    if (!input) {
      return
    }

    requestAnimationFrame(() => {
      input.focus()
      input.select?.()
    })

    shouldFocusFilterRef.current = false
  }, [])

  const queueFocusFilter = useCallback(() => {
    shouldFocusFilterRef.current = true

    setTimeout(() => {
      focusFilter()
    }, 0)
  }, [focusFilter])

  const closeLookup = useCallback(() => {
    setOpened(false)
    setPopupVisible(false)
    onOpenedChange?.(false)
  }, [onOpenedChange])

  const closeDropdown = useCallback(() => {
    setOpened(false)
    onOpenedChange?.(false)
  }, [onOpenedChange])

  usePopupEscapeLayer(openedOverride ?? opened, closeDropdown)
  usePopupEscapeLayer(!lookupPopupHost && popupVisible, closeLookup, () => popupWrapperRef.current)

  const handleApply = useCallback(
    (item: T) => {
      const itemValue = item[valueExpr] as LookupValue
      if (itemValue !== undefined && itemValue !== null && itemValue !== "") {
        if (sameLookupValue(itemValue, value)) {
          return
        }
        if (sameLookupValue(itemValue, pendingAppliedValueRef.current)) {
          return
        }
        pendingAppliedValueRef.current = itemValue
      }
      onApply(item)
      lookupPopupHost?.closeLookupPopup()
      closeLookup()
    },
    [closeLookup, lookupPopupHost, onApply, value, valueExpr],
  )

  const resolveSelectedItemDefault = useCallback(
    async (event: SelectBoxTypes.ValueChangedEvent): Promise<T | null> => {
      const directItem = event.component?.option?.("selectedItem") as T | null | undefined
      if (directItem) {
        return directItem
      }

      const dataSource = event.component?.getDataSource?.()
      const store = dataSource?.store?.()
      if (!store || typeof store.byKey !== "function") {
        return null
      }

      try {
        const loadedItem = (await store.byKey(event.value)) as T | null | undefined
        if (loadedItem) {
          return loadedItem
        }
      } catch {
        // Ignore lookup resolution errors and fall through.
      }

      return null
    },
    [],
  )

  const handleValueChanged = useCallback(
    (event: SelectBoxTypes.ValueChangedEvent) => {
      if (shouldHandleValueChange && !shouldHandleValueChange(event)) {
        return
      }

      if (lookupPopupHost?.isLookupPopupOpenRef.current) {
        return
      }

      if (event.value == null || event.value === "") {
        onClear?.()
        return
      }

      const resolver = resolveSelectedItemOverride ?? resolveSelectedItemDefault
      void resolver(event).then((selectedItem) => {
        if (selectedItem) {
          handleApply(selectedItem)
        }
      })
    },
    [
      handleApply,
      lookupPopupHost,
      onClear,
      resolveSelectedItemDefault,
      resolveSelectedItemOverride,
      shouldHandleValueChange,
    ],
  )

  const handleTabNavigation = useCallback(
    (event: SelectBoxTypes.KeyDownEvent) => {
      if (!grid || rowIndex < 0 || !navigateField) {
        return
      }

      const nativeEvent = event.event
      if (!nativeEvent || nativeEvent.key !== "Tab") {
        return
      }

      nativeEvent.preventDefault()
      nativeEvent.stopPropagation()
      nativeEvent.stopImmediatePropagation?.()

      tabNavigationRef.current = true
      setOpened(false)

      const moveFocus = nativeEvent.shiftKey
        ? () => focusPreviousEditableGridCell(grid, rowIndex, navigateField)
        : () => focusNextEditableGridCell(grid, rowIndex, navigateField)

      void Promise.resolve(onBeforeTabNavigate?.(event.component)).finally(() => {
        window.requestAnimationFrame(() => {
          tabNavigationRef.current = false
          moveFocus()
        })
      })
    },
    [grid, navigateField, onBeforeTabNavigate, rowIndex],
  )

  const fitDropDownWidth = useCallback(() => {
    const popup = dropDownPopupRef.current
    const editor = selectBoxRef.current?.element() as HTMLElement | undefined
    const content = popup?.content() as HTMLElement | undefined
    const overlay = content?.closest(".dx-overlay-content") as HTMLElement | null

    if (!popup || !editor || !overlay) {
      return
    }

    const next = lookupDropDownTargetWidth(overlay, editor, dropDownWidth, dropDownHeight)
    if (next == null) {
      return
    }

    const applied = Number(overlay.dataset.amDropDownWidth)
    if (!Number.isFinite(applied) || Math.abs(applied - next) >= 2) {
      overlay.dataset.amDropDownWidth = String(next)
      popup.option("width", next)
    }

    overlay.dataset.amFitted = "1"
  }, [dropDownHeight, dropDownWidth])

  const handleOpenedChange = useCallback(
    (nextOpened: boolean) => {
      if (!nextOpened && tabNavigationRef.current) {
        setOpened(false)
        return
      }

      setOpened(nextOpened)
      onOpenedChange?.(nextOpened)
    },
    [onOpenedChange],
  )

  const renderLookupGrid = useCallback(
    (height: string | number) => (
      <DataGrid
        dataSource={dataSource}
        keyExpr={valueExpr}
        selectedRowKeys={selectedRowKeys}
        hoverStateEnabled={true}
        focusedRowEnabled={true}
        height={height}
        showBorders={true}
        onContentReady={() => {
          if (shouldFocusFilterRef.current) {
            focusFilter()
          }
        }}
        onEditorPrepared={(event: DataGridTypes.EditorPreparedEvent) => {
          if (event.parentType !== "filterRow") {
            return
          }

          if (event.dataField !== filterFocusField) {
            return
          }

          const input = event.editorElement?.querySelector?.("input") as HTMLInputElement | null
          filterInputRef.current = input

          if (shouldFocusFilterRef.current) {
            focusFilter()
          }
        }}
        onSelectionChanged={(event) => {
          const selected = event.selectedRowsData?.[0] as T | undefined
          if (selected) {
            handleApply(selected)
          }
        }}
        onRowDblClick={(event) => {
          if (event.data) {
            handleApply(event.data as T)
          }
        }}
      >
        <Selection mode="single" />
        <FilterRow visible={true} />
        <Scrolling mode="virtual" />
        <Paging enabled={true} pageSize={popupPageSize} />

        {columns.map((column, index) => (
          <Column
            key={`${column.dataField}-${index}`}
            dataField={column.dataField}
            caption={column.caption}
            width={column.width}
            minWidth={column.minWidth}
            visible={column.visible}
            calculateCellValue={column.calculateCellValue}
          />
        ))}
      </DataGrid>
    ),
    [
      columns,
      dataSource,
      filterFocusField,
      focusFilter,
      handleApply,
      popupPageSize,
      selectedRowKeys,
      valueExpr,
    ],
  )

  const handleOpenPopup = useCallback(() => {
    if (readOnly || disabled) {
      return
    }

    if (!renderPopupContent) {
      queueFocusFilter()
    }

    if (lookupPopupHost) {
      selectBoxRef.current?.close()
      lookupPopupHost.openLookupPopup({
        title: popupTitle,
        width: popupWidth,
        height: popupHeight,
        renderContent: ({ closePopup }) =>
          renderPopupContent ? (
            renderPopupContent({ closePopup })
          ) : (
            <div style={{ height: popupGridHeight }}>{renderLookupGrid("100%")}</div>
          ),
      })
      return
    }

    setPopupVisible(true)
  }, [
    lookupPopupHost,
    popupHeight,
    popupGridHeight,
    popupTitle,
    popupWidth,
    queueFocusFilter,
    renderLookupGrid,
    renderPopupContent,
    readOnly,
    disabled,
  ])

  const openDropdownNow = useCallback(
    (component: dxSelectBox | null | undefined) => {
      const instance = component ?? selectBoxRef.current
      setOpened(true)
      onOpenedChange?.(true)
      try {
        instance?.open?.()
      } catch {
        // Controlled `opened` still applies if imperative open fails.
      }
    },
    [onOpenedChange],
  )

  const dropDownOpen = (openedOverride ?? opened) === true

  useEffect(() => {
    if (!dropDownOpen) {
      return
    }

    let frame = 0
    let attempts = 0
    const scheduleFit = () => {
      window.cancelAnimationFrame(frame)
      frame = window.requestAnimationFrame(() => {
        fitDropDownWidth()
        const overlay = (selectBoxRef.current?.content() as HTMLElement | undefined)?.closest(".dx-overlay-content") as HTMLElement | null
        if (overlay?.dataset.amFitted !== "1" && attempts < 24) {
          attempts += 1
          scheduleFit()
        }
      })
    }

    scheduleFit()

    const content = selectBoxRef.current?.content() as HTMLElement | undefined
    const observer = content
      ? new MutationObserver(scheduleFit)
      : null
    observer?.observe(content as HTMLElement, { childList: true, subtree: true, characterData: true })

    const fallback = window.setTimeout(() => {
      fitDropDownWidth()
      const overlay = (selectBoxRef.current?.content() as HTMLElement | undefined)?.closest(".dx-overlay-content") as HTMLElement | null
      if (overlay && overlay.dataset.amFitted !== "1") {
        overlay.dataset.amFitted = "1"
      }
    }, 500)

    return () => {
      window.cancelAnimationFrame(frame)
      observer?.disconnect()
      window.clearTimeout(fallback)
    }
  }, [dropDownOpen, fitDropDownWidth])

  useEffect(() => {
    if (!autoOpen || autoOpenHandledRef.current) {
      return
    }

    if (autoOpen === "popup") {
      autoOpenHandledRef.current = true
      handleOpenPopup()
    }
    // dropdown: open from onInitialized after the widget can create an overlay
  }, [autoOpen, handleOpenPopup])

  return (
    <>
      <SelectBox
        className={`am-grid-lookup-editor ${className}`.trim()}
        dataSource={selectBoxDataSource}
        value={value ?? null}
        valueExpr={valueExpr}
        displayExpr={displayExpr as (item: unknown) => string}
        itemRender={itemRender as ((item: unknown) => ReactNode) | undefined}
        opened={openedOverride ?? opened}
        openOnFieldClick={!readOnly && !disabled}
        deferRendering={deferDropdownRendering}
        showClearButton={showClearButton && !readOnly && !disabled}
        disabled={disabled}
        readOnly={readOnly}
        acceptCustomValue={acceptCustomValue}
        stylingMode={stylingMode}
        validationMessageMode={validationMessageMode}
        showDataBeforeSearch={true}
        minSearchLength={0}
        searchEnabled={true}
        searchExpr={resolvedSearchExpr}
        searchMode="contains"
        searchTimeout={searchTimeout}
        placeholder={placeholder}
        noDataText={noDataText}
        onInitialized={(event) => {
          selectBoxRef.current = event.component ?? null
          setDropDownAnchor((event.component?.element() as HTMLElement | undefined) ?? null)

          if (!pendingAutoOpenDropdownRef.current || autoOpenHandledRef.current) {
            return
          }

          autoOpenHandledRef.current = true
          pendingAutoOpenDropdownRef.current = false

          // After layout in grid cell — production needs a frame; DEV is fast enough either way.
          window.requestAnimationFrame(() => {
            openDropdownNow(event.component ?? null)
          })
        }}
        onOpenedChange={handleOpenedChange}
        onClosed={onClosed}
        onKeyDown={navigateField ? handleTabNavigation : undefined}
        onInput={(event) => {
          selectBoxRef.current = event.component ?? null
          openDropdownNow(event.component ?? null)
          onInput?.(event)
        }}
        onValueChanged={handleValueChanged}
      >
        <DropDownOptions
          maxWidth={Math.min(dropDownWidth, window.innerWidth - 24)}
          maxHeight={dropDownHeight}
          onShowing={(event) => {
            dropDownPopupRef.current = event.component
            fitDropDownWidth()
          }}
          hideOnParentScroll={false}
          container={getLookupOverlayContainer()}
          position={{
            my: "left top",
            at: "left bottom",
            of: dropDownAnchor ?? undefined,
            boundary: window,
            boundaryOffset: "12 12",
            collision: { x: "fit", y: "flip" },
          }}
          wrapperAttr={{ class: "am-grid-lookup-dropdown" }}
        />
        <SelectBoxButton
          name="openLookupPopup"
          location="after"
          options={{
            icon: "search",
            stylingMode: "text",
            hint: buttonHint,
            disabled: readOnly || disabled,
            onClick: handleOpenPopup,
          }}
        />
        <SelectBoxButton name="dropDown" location="after" />
      </SelectBox>

      {!lookupPopupHost && popupVisible ? (
        <Popup
          visible={popupVisible}
          title={popupTitle}
          showTitle={true}
          width={popupWidth}
          height={popupHeight}
          dragEnabled={false}
          hideOnOutsideClick={false}
          container={getLookupOverlayContainer()}
          position={{ my: "center", at: "center", of: window }}
          wrapperAttr={{ class: "am-lookup-popup" }}
          onShown={(event) => {
            disableBuiltInPopupEscape(event.component)
            popupWrapperRef.current = overlayWrapperFromPopupContent(event.component.content())
            raiseOverlayAboveSiblings(popupWrapperRef.current)
          }}
          onHiding={closeLookup}
        >
          {renderPopupContent ? (
            renderPopupContent({ closePopup: closeLookup })
          ) : (
            <div style={{ height: popupGridHeight }}>{renderLookupGrid("100%")}</div>
          )}
        </Popup>
      ) : null}
    </>
  )
}
