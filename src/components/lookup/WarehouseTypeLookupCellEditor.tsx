import { useCallback } from "react"
import { filterActiveLangFields, pickLocalizedText } from "@/lib/companyLang"
import type { StoreKindInfo } from "@/types/storeKind"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { warehouseTypeLookupStore } from "./warehouseTypeLookupStore"
import { renderSharedWarehouseTypeLookupPage } from "./sharedMasterLookupPages"
import { restoreLookupGridCellFocus, type LookupGridCellValueHost, setLookupGridCellValue, toLookupNumber, trimLookupText } from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData: Record<string, unknown>
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  warehouseTypeIdField?: string
  warehouseTypeCdField?: string
  warehouseTypeNmField?: string
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
  placeholder = "Chọn loại kho",
  popupTitle = "Chọn loại kho",
  buttonHint = "Mở danh sách loại kho",
}: Props) {
  const displayExpr = useCallback((item: StoreKindInfo | null) => {
    const warehouseTypeCd = trimLookupText(item?.STORE_KIND_CD)
    const warehouseTypeName = pickLocalizedText(item, "STORE_KIND_NM")

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
      restoreLookupGridCellFocus(grid, rowIndex, warehouseTypeCdField)
    },
    [grid, rowIndex, setValue, valueMode, warehouseTypeCdField, warehouseTypeIdField, warehouseTypeNmField],
  )

  const clearWarehouseType = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, warehouseTypeIdField, null)
    setLookupGridCellValue(grid, rowIndex, warehouseTypeCdField, "")
    setLookupGridCellValue(grid, rowIndex, warehouseTypeNmField, "")
    restoreLookupGridCellFocus(grid, rowIndex, warehouseTypeCdField)
  }, [grid, rowIndex, setValue, warehouseTypeCdField, warehouseTypeIdField, warehouseTypeNmField])

  return (
    <BaseLookupCellEditor<StoreKindInfo>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "STORE_KIND_CD" : "STORE_KIND_ID"}
      displayExpr={displayExpr}
      filterFocusField="STORE_KIND_CD"
      searchExpr={filterActiveLangFields(["STORE_KIND_CD", "STORE_KIND_NM_VIET", "STORE_KIND_NM_ENG", "STORE_KIND_NM_KOR", "STORE_KIND_NM_CHINA"])}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      onApply={applyWarehouseType}
      onClear={clearWarehouseType}
      renderPopupContent={({ closePopup }) =>
        renderSharedWarehouseTypeLookupPage({ closePopup, onPick: applyWarehouseType })
      }
    />
  )
}
