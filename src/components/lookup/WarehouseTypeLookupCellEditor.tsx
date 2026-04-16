import { useCallback } from "react"
import StoreKindPage from "@/pages/Module/StoreKindManagement/StoreKindPage"
import type { StoreKindInfo } from "@/types/storeKind"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { warehouseTypeLookupStore } from "./warehouseTypeLookupStore"
import { setLookupGridCellValue, toLookupNumber, trimLookupText } from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData: Record<string, unknown>
  rowIndex: number
  grid: any
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  warehouseTypeIdField?: string
  warehouseTypeCdField?: string
  warehouseTypeNmField?: string
  warehouseTypeCdFieldCaption?: string
  warehouseTypeNmFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function WarehouseTypeLookupCellEditor({
  dataSource = warehouseTypeLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  valueMode = "id",
  warehouseTypeIdField = "STORE_KIND_ID",
  warehouseTypeCdField = "STORE_KIND_CD",
  warehouseTypeNmField = "STORE_KIND_NM_VIET",
  warehouseTypeCdFieldCaption = "Mã loại kho",
  warehouseTypeNmFieldCaption = "Tên loại kho",
  placeholder = "Chọn loại kho",
  popupTitle = "Chọn loại kho",
  buttonHint = "Mở danh sách loại kho",
}: Props) {
  const displayExpr = useCallback((item: StoreKindInfo | null) => {
    const warehouseTypeCd = trimLookupText(item?.STORE_KIND_CD)
    const warehouseTypeName = trimLookupText(item?.STORE_KIND_NM_VIET)

    if (warehouseTypeCd && warehouseTypeName) {
      return `${warehouseTypeCd} - ${warehouseTypeName}`
    }

    return warehouseTypeCd || warehouseTypeName
  }, [])

  const applyWarehouseType = useCallback(
    (warehouseType: StoreKindInfo) => {
      const warehouseTypeId = toLookupNumber(warehouseType.STORE_KIND_ID)
      const warehouseTypeCd = trimLookupText(warehouseType.STORE_KIND_CD)

      setValue(valueMode === "code" ? warehouseTypeCd || null : warehouseTypeId)
      setLookupGridCellValue(grid, rowIndex, warehouseTypeIdField, warehouseTypeId)
      setLookupGridCellValue(grid, rowIndex, warehouseTypeCdField, warehouseTypeCd)
      setLookupGridCellValue(grid, rowIndex, warehouseTypeNmField, trimLookupText(warehouseType.STORE_KIND_NM_VIET))
    },
    [grid, rowIndex, setValue, valueMode, warehouseTypeCdField, warehouseTypeIdField, warehouseTypeNmField],
  )

  const clearWarehouseType = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, warehouseTypeIdField, null)
    setLookupGridCellValue(grid, rowIndex, warehouseTypeCdField, "")
    setLookupGridCellValue(grid, rowIndex, warehouseTypeNmField, "")
  }, [grid, rowIndex, setValue, warehouseTypeCdField, warehouseTypeIdField, warehouseTypeNmField])

  return (
    <BaseLookupCellEditor<StoreKindInfo>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "STORE_KIND_CD" : "STORE_KIND_ID"}
      displayExpr={displayExpr}
      filterFocusField="STORE_KIND_CD"
      searchExpr={["STORE_KIND_CD", "STORE_KIND_NM_VIET"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      onApply={applyWarehouseType}
      onClear={clearWarehouseType}
      renderPopupContent={({ closePopup }) => (
        <StoreKindPage
          mode="lookup"
          onPickStoreKind={applyWarehouseType}
          onCloseLookup={closePopup}
        />
      )}
      columns={[
        { dataField: "STORE_KIND_CD", caption: warehouseTypeCdFieldCaption, width: 180 },
        { dataField: "STORE_KIND_NM_VIET", caption: warehouseTypeNmFieldCaption, minWidth: 260 },
      ]}
    />
  )
}
