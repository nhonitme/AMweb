import { type ReactNode, useCallback, useMemo, useRef, useState } from "react"
import Popup from "devextreme-react/popup"
import SelectBox, {
  Button as SelectBoxButton,
  DropDownOptions,
  type SelectBoxTypes,
} from "devextreme-react/select-box"
import DataGrid, {
  Column,
  FilterRow,
  Paging,
  Scrolling,
  Selection,
} from "devextreme-react/data-grid"
import { useLookupPopupHost } from "./LookupPopupHost"

export type LookupDataSource = SelectBoxTypes.Properties["dataSource"]
export type LookupValue = string | number | null | undefined

export type LookupGridColumn<T> = {
  dataField: string
  caption: string
  width?: number | string
  minWidth?: number
  visible?: boolean
  calculateCellValue?: (rowData: T) => unknown
}

type BaseLookupCellEditorProps<T> = {
  dataSource: LookupDataSource
  value: LookupValue
  valueExpr: string
  displayExpr: (item: T | null) => string
  columns: LookupGridColumn<T>[]
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
  renderPopupContent?: (options: { closePopup: () => void }) => ReactNode
}

export default function BaseLookupCellEditor<T extends Record<string, unknown>>({
  dataSource,
  value,
  valueExpr,
  displayExpr,
  columns,
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
  renderPopupContent,
}: BaseLookupCellEditorProps<T>) {
  const [opened, setOpened] = useState(false)
  const [popupVisible, setPopupVisible] = useState(false)
  const filterInputRef = useRef<HTMLInputElement | null>(null)
  const shouldFocusFilterRef = useRef(false)
  const lookupPopupHost = useLookupPopupHost()

  const selectedRowKeys = useMemo(() => {
    if (value === null || value === undefined || value === "") {
      return []
    }

    return [value]
  }, [value])

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
  }, [])

  const handleApply = useCallback(
    (item: T) => {
      onApply(item)
      lookupPopupHost?.closeLookupPopup()
      closeLookup()
    },
    [closeLookup, lookupPopupHost, onApply],
  )

  const handleValueChanged = useCallback(
    (event: any) => {
      if (event.value == null || event.value === "") {
        onClear?.()
        return
      }

      const selectedItem = (event.component?.option?.("selectedItem") ?? event.itemData) as T | null | undefined
      if (selectedItem) {
        handleApply(selectedItem)
      }
    },
    [handleApply, onClear],
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
        onEditorPrepared={(event: any) => {
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
    if (!renderPopupContent) {
      queueFocusFilter()
    }

    if (lookupPopupHost) {
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
  ])

  return (
    <>
      <SelectBox
        dataSource={dataSource}
        value={value ?? null}
        valueExpr={valueExpr}
        displayExpr={displayExpr as (item: unknown) => string}
        opened={opened}
        openOnFieldClick={true}
        deferRendering={false}
        showClearButton={true}
        showDataBeforeSearch={true}
        minSearchLength={0}
        searchEnabled={true}
        searchExpr={resolvedSearchExpr}
        searchMode="contains"
        searchTimeout={0}
        placeholder={placeholder}
        noDataText={noDataText}
        onOpenedChange={setOpened}
        onInput={() => {
          setOpened(true)
        }}
        onValueChanged={handleValueChanged}
      >
        <DropDownOptions width={dropDownWidth} maxHeight={dropDownHeight} />
        <SelectBoxButton name="dropDown" location="after" />
        <SelectBoxButton
          name="openLookupPopup"
          location="after"
          options={{
            icon: "search",
            stylingMode: "text",
            hint: buttonHint,
            onClick: handleOpenPopup,
          }}
        />
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
