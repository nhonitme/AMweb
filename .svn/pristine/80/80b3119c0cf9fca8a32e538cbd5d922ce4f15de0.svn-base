import { useCallback } from "react"
import StorePage from "@/pages/Module/StoreManagement/StorePage"
import type { StoreInfo } from "@/types/store"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { warehouseLookupStore } from "./warehouseLookupStore"
import {
  firstLookupText,
  hasLookupRowField,
  setLookupGridCellValue,
  toLookupNumber,
  trimLookupText,
} from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData: Record<string, unknown>
  rowIndex: number
  grid: any
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  warehouseIdField?: string
  warehouseCdField?: string
  warehouseNmField?: string
  warehouseTypeIdField?: string
  warehouseTypeCdField?: string
  warehouseTypeNmField?: string
  warehouseCdFieldCaption?: string
  warehouseNmFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function WarehouseLookupCellEditor({
  dataSource = warehouseLookupStore,
  value,
  rowData,
  rowIndex,
  grid,
  setValue,
  valueMode = "id",
  warehouseIdField = "STORE_ID",
  warehouseCdField = "STORE_CD",
  warehouseNmField = "STORE_NM_VIET",
  warehouseTypeIdField = "STORE_KIND_ID",
  warehouseTypeCdField = "STORE_KIND_CD",
  warehouseTypeNmField = "STORE_KIND_NM_VIET",
  warehouseCdFieldCaption = "Mã kho",
  warehouseNmFieldCaption = "Tên kho",
  placeholder = "Chọn kho",
  popupTitle = "Chọn kho",
  buttonHint = "Mở danh sách kho",
}: Props) {
  const getWarehouseName = useCallback(
    (item?: Partial<StoreInfo> | null) => firstLookupText(item?.STORE_NM_VIET, item?.STORE_NM_ENG, item?.STORE_NM_KOR),
    [],
  )

  const displayExpr = useCallback(
    (item: StoreInfo | null) => {
      const warehouseCd = trimLookupText(item?.STORE_CD)
      const warehouseName = getWarehouseName(item)

      if (warehouseCd && warehouseName) {
        return `${warehouseCd} - ${warehouseName}`
      }

      return warehouseCd || warehouseName
    },
    [getWarehouseName],
  )

  const applyWarehouse = useCallback(
    (warehouse: StoreInfo) => {
      const warehouseId = toLookupNumber(warehouse.STORE_ID)
      const warehouseCd = trimLookupText(warehouse.STORE_CD)

      setValue(valueMode === "code" ? warehouseCd || null : warehouseId)
      setLookupGridCellValue(grid, rowIndex, warehouseIdField, warehouseId)
      setLookupGridCellValue(grid, rowIndex, warehouseCdField, warehouseCd)
      setLookupGridCellValue(grid, rowIndex, warehouseNmField, trimLookupText(warehouse.STORE_NM_VIET))

      if (hasLookupRowField(rowData, warehouseTypeIdField)) {
        setLookupGridCellValue(grid, rowIndex, warehouseTypeIdField, toLookupNumber(warehouse.STORE_KIND_ID))
      }

      if (hasLookupRowField(rowData, warehouseTypeCdField)) {
        setLookupGridCellValue(grid, rowIndex, warehouseTypeCdField, trimLookupText(warehouse.STORE_KIND_CD))
      }

      if (hasLookupRowField(rowData, warehouseTypeNmField)) {
        setLookupGridCellValue(grid, rowIndex, warehouseTypeNmField, trimLookupText(warehouse.STORE_KIND_NM_VIET))
      }
    },
    [
      grid,
      rowData,
      rowIndex,
      setValue,
      valueMode,
      warehouseCdField,
      warehouseIdField,
      warehouseNmField,
      warehouseTypeCdField,
      warehouseTypeIdField,
      warehouseTypeNmField,
    ],
  )

  const clearWarehouse = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, warehouseIdField, null)
    setLookupGridCellValue(grid, rowIndex, warehouseCdField, "")
    setLookupGridCellValue(grid, rowIndex, warehouseNmField, "")

    if (hasLookupRowField(rowData, warehouseTypeIdField)) {
      setLookupGridCellValue(grid, rowIndex, warehouseTypeIdField, null)
    }

    if (hasLookupRowField(rowData, warehouseTypeCdField)) {
      setLookupGridCellValue(grid, rowIndex, warehouseTypeCdField, "")
    }

    if (hasLookupRowField(rowData, warehouseTypeNmField)) {
      setLookupGridCellValue(grid, rowIndex, warehouseTypeNmField, "")
    }
  }, [
    grid,
    rowData,
    rowIndex,
    setValue,
    warehouseCdField,
    warehouseIdField,
    warehouseNmField,
    warehouseTypeCdField,
    warehouseTypeIdField,
    warehouseTypeNmField,
  ])

  return (
    <BaseLookupCellEditor<StoreInfo>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "STORE_CD" : "STORE_ID"}
      displayExpr={displayExpr}
      filterFocusField="STORE_CD"
      searchExpr={["STORE_CD", "STORE_NM_VIET", "STORE_NM_ENG", "STORE_NM_KOR", "STORE_KIND_CD", "STORE_KIND_NM_VIET"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      onApply={applyWarehouse}
      onClear={clearWarehouse}
      renderPopupContent={({ closePopup }) => (
        <StorePage
          mode="lookup"
          onPickStore={applyWarehouse}
          onCloseLookup={closePopup}
        />
      )}
      columns={[
        { dataField: "STORE_CD", caption: warehouseCdFieldCaption, width: 160 },
        { dataField: "STORE_NM_VIET", caption: warehouseNmFieldCaption, minWidth: 240 },
        { dataField: "STORE_KIND_CD", caption: "Mã loại kho", width: 160 },
        { dataField: "STORE_KIND_NM_VIET", caption: "Tên loại kho", minWidth: 220 },
      ]}
    />
  )
}
