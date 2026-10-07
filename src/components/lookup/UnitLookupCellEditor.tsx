import { useCallback } from "react"
import type { Unit } from "@/types/unit"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { unitLookupStore } from "./unitLookupStore"
import { renderSharedUnitLookupPage } from "./sharedMasterLookupPages"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import { restoreLookupGridCellFocus, type LookupGridCellValueHost, setLookupGridCellValue, toLookupNumber, trimLookupText } from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData: Record<string, unknown>
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  unitIdField?: string
  unitCdField?: string
  unitNmField?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
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
  placeholder = "Chọn đơn vị tính",
  popupTitle = "Chọn đơn vị tính",
  buttonHint = "Mở danh sách đơn vị tính",
  autoOpen,
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
      restoreLookupGridCellFocus(grid, rowIndex, unitCdField)
    },
    [grid, rowIndex, setValue, unitCdField, unitIdField, unitNmField, valueMode],
  )

  const clearUnit = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, unitIdField, null)
    setLookupGridCellValue(grid, rowIndex, unitCdField, "")
    setLookupGridCellValue(grid, rowIndex, unitNmField, "")
    restoreLookupGridCellFocus(grid, rowIndex, unitCdField)
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
      autoOpen={autoOpen}
      onApply={applyUnit}
      onClear={clearUnit}
      renderPopupContent={({ closePopup }) =>
        renderSharedUnitLookupPage({ closePopup, onPick: applyUnit })
      }
    />
  )
}
