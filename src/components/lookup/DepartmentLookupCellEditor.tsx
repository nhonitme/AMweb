import { useCallback } from "react"
import DepartmentManagementPage from "@/pages/Module/DepartmentManagement"
import type { DepartmentInfo } from "@/types/departmentInfo"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { departmentLookupStore } from "./departmentLookupStore"
import {
  firstLookupText,
  setLookupGridCellValue,
  toLookupNumber,
  trimLookupText,
} from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData?: object
  rowIndex: number
  grid: any
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  departmentIdField?: string
  departmentCdField?: string
  departmentNmField?: string
  departmentCdFieldCaption?: string
  departmentNmFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function DepartmentLookupCellEditor({
  dataSource = departmentLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  valueMode = "id",
  departmentIdField = "DEPARTMENT_ID",
  departmentCdField = "DEPARTMENT_CD",
  departmentNmField = "DEP_NAME_VIET",
  departmentCdFieldCaption = "Department code",
  departmentNmFieldCaption = "Department name",
  placeholder = "Select department",
  popupTitle = "Select department",
  buttonHint = "Open department list",
}: Props) {
  const getDepartmentName = useCallback(
    (item?: Partial<DepartmentInfo> | null) =>
      firstLookupText(item?.DEP_NAME_VIET, item?.DEP_NAME_ENG, item?.DEP_NAME_KOR, item?.DEP_NAME_CHINA),
    [],
  )

  const displayExpr = useCallback(
    (item: DepartmentInfo | null) => {
      const departmentCd = trimLookupText(item?.DEPARTMENT_CD)
      const departmentName = getDepartmentName(item)

      if (departmentCd && departmentName) {
        return `${departmentCd} - ${departmentName}`
      }

      return departmentCd || departmentName
    },
    [getDepartmentName],
  )

  const applyDepartment = useCallback(
    (department: DepartmentInfo) => {
      const departmentId = toLookupNumber(department.DEPARTMENT_ID)
      const departmentCd = trimLookupText(department.DEPARTMENT_CD)
      const departmentName = getDepartmentName(department)

      setValue(valueMode === "code" ? departmentCd || null : departmentId)
      setLookupGridCellValue(grid, rowIndex, departmentIdField, departmentId)
      setLookupGridCellValue(grid, rowIndex, departmentCdField, departmentCd)
      setLookupGridCellValue(grid, rowIndex, departmentNmField, departmentName)
    },
    [departmentCdField, departmentIdField, departmentNmField, getDepartmentName, grid, rowIndex, setValue, valueMode],
  )

  const clearDepartment = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, departmentIdField, null)
    setLookupGridCellValue(grid, rowIndex, departmentCdField, "")
    setLookupGridCellValue(grid, rowIndex, departmentNmField, "")
  }, [departmentCdField, departmentIdField, departmentNmField, grid, rowIndex, setValue])

  return (
    <BaseLookupCellEditor<DepartmentInfo>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "DEPARTMENT_CD" : "DEPARTMENT_ID"}
      displayExpr={displayExpr}
      filterFocusField="DEPARTMENT_CD"
      searchExpr={["DEPARTMENT_CD", "DEP_NAME_VIET", "DEP_NAME_ENG", "DEP_NAME_KOR", "DEP_NAME_CHINA"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      onApply={applyDepartment}
      onClear={clearDepartment}
      renderPopupContent={({ closePopup }) => (
        <DepartmentManagementPage
          mode="lookup"
          onPickDepartment={applyDepartment}
          onCloseLookup={closePopup}
        />
      )}
      columns={[
        { dataField: "DEPARTMENT_CD", caption: departmentCdFieldCaption, width: 160 },
        {
          dataField: "DEP_NAME_VIET",
          caption: departmentNmFieldCaption,
          minWidth: 240,
          calculateCellValue: (row) => getDepartmentName(row),
        },
      ]}
    />
  )
}
