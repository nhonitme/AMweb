import { useCallback, useEffect, useRef } from "react"
import { filterActiveLangFields, pickLocalizedText } from "@/lib/companyLang"
import type { DepartmentInfo } from "@/types/departmentInfo"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import {
  formatDepartmentDisplay,
  findDepartmentLookupItemByCode,
  findDepartmentLookupItemById,
  getDepartmentLookupNames,
} from "./departmentLookupUtils"
import { departmentLookupStore } from "./departmentLookupStore"
import { renderSharedDepartmentLookupPage } from "./sharedMasterLookupPages"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import {
  restoreLookupGridCellFocus,
  type LookupGridCellValueHost,
  setLookupGridCellValues,
  toLookupNumber,
  trimLookupText,
} from "./lookupHelpers"
import type { SelectBoxTypes } from "devextreme-react/select-box"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData?: object
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  departmentIdField?: string
  departmentCdField?: string
  departmentNmField?: string
  multilingualNameFields?: boolean
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
}

export default function DepartmentLookupCellEditor({
  dataSource = departmentLookupStore,
  value,
  rowIndex,
  grid,
  setValue: _setValue,
  valueMode = "id",
  departmentIdField = "DEPARTMENT_ID",
  departmentCdField = "DEPARTMENT_CD",
  departmentNmField = "DEP_NAME_VIET",
  multilingualNameFields = false,
  placeholder = "Select department",
  popupTitle = "Select department",
  buttonHint = "Open department list",
  autoOpen,
}: Props) {
  const lastValidIdRef = useRef<number | null>(toLookupNumber(value))

  useEffect(() => {
    lastValidIdRef.current = toLookupNumber(value)
  }, [value])

  const getDepartmentName = useCallback(
    (item?: Partial<DepartmentInfo> | null) => pickLocalizedText(item, "DEP_NAME"),
    [],
  )

  const displayExpr = useCallback(
    (item: DepartmentInfo | null) => {
      const departmentCd = trimLookupText(item?.DEPARTMENT_CD)
      const departmentName = getDepartmentName(item)
      return formatDepartmentDisplay(departmentCd, departmentName)
    },
    [getDepartmentName],
  )

  const writeDepartmentValues = useCallback(
    (department: Partial<DepartmentInfo>) => {
      const departmentId = toLookupNumber(department.DEPARTMENT_ID)
      const departmentCd = trimLookupText(department.DEPARTMENT_CD)
      lastValidIdRef.current = departmentId

      const values: Record<string, unknown> = {
        [departmentIdField]: departmentId,
        [departmentCdField]: departmentCd,
      }

      if (multilingualNameFields) {
        const names = getDepartmentLookupNames(department)
        values.DEP_NAME_VIET = names.VIET
        values.DEP_NAME_ENG = names.ENG
        values.DEP_NAME_KOR = names.KOR
        values.DEP_NAME_CHINA = names.CHN
      } else {
        values[departmentNmField] = getDepartmentName(department)
      }

      setLookupGridCellValues(grid, rowIndex, values)
    },
    [
      departmentCdField,
      departmentIdField,
      departmentNmField,
      getDepartmentName,
      grid,
      multilingualNameFields,
      rowIndex,
    ],
  )

  const applyDepartment = useCallback(
    (department: DepartmentInfo) => {
      writeDepartmentValues(department)
      restoreLookupGridCellFocus(grid, rowIndex, departmentCdField)
    },
    [departmentCdField, grid, rowIndex, writeDepartmentValues],
  )

  const clearDepartmentValues = useCallback(() => {
    lastValidIdRef.current = null
    const values: Record<string, unknown> = {
      [departmentIdField]: null,
      [departmentCdField]: "",
    }

    if (multilingualNameFields) {
      values.DEP_NAME_VIET = ""
      values.DEP_NAME_ENG = ""
      values.DEP_NAME_KOR = ""
      values.DEP_NAME_CHINA = ""
    } else {
      values[departmentNmField] = ""
    }

    setLookupGridCellValues(grid, rowIndex, values)
  }, [departmentCdField, departmentIdField, departmentNmField, grid, multilingualNameFields, rowIndex])

  const clearDepartment = useCallback(() => {
    clearDepartmentValues()
    restoreLookupGridCellFocus(grid, rowIndex, departmentCdField)
  }, [clearDepartmentValues, departmentCdField, grid, rowIndex])

  const commitPendingInput = useCallback(
    async (component: SelectBoxTypes.Instance) => {
      const selectedItem = (component.option("selectedItem") ?? null) as DepartmentInfo | null
      if (selectedItem) {
        writeDepartmentValues(selectedItem)
        return
      }

      const typedText = trimLookupText(component.option("text"))
      if (!typedText) {
        return
      }

      const codeCandidate = trimLookupText(typedText.split(" - ")[0])
      const matched =
        (await findDepartmentLookupItemByCode(codeCandidate)) ??
        (codeCandidate !== typedText ? await findDepartmentLookupItemByCode(typedText) : null)

      if (matched) {
        writeDepartmentValues(matched)
        return
      }

      if (lastValidIdRef.current) {
        const previous = await findDepartmentLookupItemById(lastValidIdRef.current)
        if (previous) {
          writeDepartmentValues(previous)
          return
        }
      }

      clearDepartmentValues()
    },
    [clearDepartmentValues, writeDepartmentValues],
  )

  return (
    <BaseLookupCellEditor<DepartmentInfo>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "DEPARTMENT_CD" : "DEPARTMENT_ID"}
      displayExpr={displayExpr}
      filterFocusField="DEPARTMENT_CD"
      searchExpr={filterActiveLangFields(["DEPARTMENT_CD", "DEP_NAME_VIET", "DEP_NAME_ENG", "DEP_NAME_KOR", "DEP_NAME_CHINA"])}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      autoOpen={autoOpen}
      grid={grid}
      rowIndex={rowIndex}
      navigateField={departmentCdField}
      onBeforeTabNavigate={commitPendingInput}
      onApply={applyDepartment}
      onClear={clearDepartment}
      renderPopupContent={({ closePopup }) =>
        renderSharedDepartmentLookupPage({ closePopup, onPick: applyDepartment })
      }
    />
  )
}
