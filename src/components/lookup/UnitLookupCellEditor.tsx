import { useCallback } from "react"
import ProductUnitPage from "@/pages/Module/ProductUnitManagement/ProductUnitPage"
import type { Unit } from "@/types/unit"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { unitLookupStore } from "./unitLookupStore"
import { setLookupGridCellValue, toLookupNumber, trimLookupText } from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData: Record<string, unknown>
  rowIndex: number
  grid: any
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  unitIdField?: string
  unitCdField?: string
  unitNmField?: string
  unitCdFieldCaption?: string
  unitNmFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function UnitLookupCellEditor({
  dataSource = unitLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  valueMode = "id",
  unitIdField = "UNIT_ID",
  unitCdField = "UNIT_CD",
  unitNmField = "UNIT_NM",
  unitCdFieldCaption = "Mã đơn vị tính",
  unitNmFieldCaption = "Tên đơn vị tính",
  placeholder = "Chọn đơn vị tính",
  popupTitle = "Chọn đơn vị tính",
  buttonHint = "Mở danh sách đơn vị tính",
}: Props) {
  const displayExpr = useCallback((item: Unit | null) => {
    const unitCd = trimLookupText(item?.UNIT_CD)
    const unitName = trimLookupText(item?.UNIT_NM)

    if (unitCd && unitName) {
      return `${unitCd} - ${unitName}`
    }

    return unitCd || unitName
  }, [])

  const applyUnit = useCallback(
    (unit: Unit) => {
      const unitId = toLookupNumber(unit.UNIT_ID)
      const unitCd = trimLookupText(unit.UNIT_CD)

      setValue(valueMode === "code" ? unitCd || null : unitId)
      setLookupGridCellValue(grid, rowIndex, unitIdField, unitId)
      setLookupGridCellValue(grid, rowIndex, unitCdField, unitCd)
      setLookupGridCellValue(grid, rowIndex, unitNmField, trimLookupText(unit.UNIT_NM))
    },
    [grid, rowIndex, setValue, unitCdField, unitIdField, unitNmField, valueMode],
  )

  const clearUnit = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, unitIdField, null)
    setLookupGridCellValue(grid, rowIndex, unitCdField, "")
    setLookupGridCellValue(grid, rowIndex, unitNmField, "")
  }, [grid, rowIndex, setValue, unitCdField, unitIdField, unitNmField])

  return (
    <BaseLookupCellEditor<Unit>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "UNIT_CD" : "UNIT_ID"}
      displayExpr={displayExpr}
      filterFocusField="UNIT_CD"
      searchExpr={["UNIT_CD", "UNIT_NM"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      onApply={applyUnit}
      onClear={clearUnit}
      renderPopupContent={({ closePopup }) => (
        <ProductUnitPage
          mode="lookup"
          onPickUnit={applyUnit}
          onCloseLookup={closePopup}
        />
      )}
      columns={[
        { dataField: "UNIT_CD", caption: unitCdFieldCaption, width: 180 },
        { dataField: "UNIT_NM", caption: unitNmFieldCaption, minWidth: 240 },
      ]}
    />
  )
}
