import { useCallback } from "react"
import ManagementInfoPage from "@/pages/Module/ManagementInfo/ManagementInfoPage"
import type { ManagementInfo } from "@/types/managementInfo"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { managementLookupStore } from "./managementLookupStore"
import {
  firstLookupText,
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
  managementIdField?: string
  managementCdField?: string
  managementNmField?: string
  managementRootCdField?: string
  managementCdFieldCaption?: string
  managementNmFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function ManagementLookupCellEditor({
  dataSource = managementLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  valueMode = "id",
  managementIdField = "MG_ID",
  managementCdField = "MG_CD",
  managementNmField = "MG_DESC_VIET",
  managementRootCdField = "MG_CD_ROOT",
  managementCdFieldCaption = "Mã quản lý",
  managementNmFieldCaption = "Tên quản lý",
  placeholder = "Chọn mã quản lý",
  popupTitle = "Chọn mã quản lý",
  buttonHint = "Mở danh sách mã quản lý",
}: Props) {
  const getManagementName = useCallback(
    (item?: Partial<ManagementInfo> | null) =>
      firstLookupText(item?.MG_DESC_VIET, item?.MG_DESC_ENG, item?.MG_DESC_KOR),
    [],
  )

  const displayExpr = useCallback(
    (item: ManagementInfo | null) => {
      const managementCd = trimLookupText(item?.MG_CD)
      const managementName = getManagementName(item)

      if (managementCd && managementName) {
        return `${managementCd} - ${managementName}`
      }

      return managementCd || managementName
    },
    [getManagementName],
  )

  const applyManagement = useCallback(
    (management: ManagementInfo) => {
      const managementId = toLookupNumber(management.MG_ID)
      const managementCd = trimLookupText(management.MG_CD)
      const managementName = getManagementName(management)

      setValue(valueMode === "code" ? managementCd || null : managementId)
      setLookupGridCellValue(grid, rowIndex, managementIdField, managementId)
      setLookupGridCellValue(grid, rowIndex, managementCdField, managementCd)
      setLookupGridCellValue(grid, rowIndex, managementNmField, managementName)
      setLookupGridCellValue(grid, rowIndex, managementRootCdField, trimLookupText(management.MG_CD_ROOT))
    },
    [
      getManagementName,
      grid,
      managementCdField,
      managementIdField,
      managementNmField,
      managementRootCdField,
      rowIndex,
      setValue,
      valueMode,
    ],
  )

  const clearManagement = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, managementIdField, null)
    setLookupGridCellValue(grid, rowIndex, managementCdField, "")
    setLookupGridCellValue(grid, rowIndex, managementNmField, "")
    setLookupGridCellValue(grid, rowIndex, managementRootCdField, "")
  }, [grid, managementCdField, managementIdField, managementNmField, managementRootCdField, rowIndex, setValue])

  return (
    <BaseLookupCellEditor<ManagementInfo>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "MG_CD" : "MG_ID"}
      displayExpr={displayExpr}
      filterFocusField="MG_CD"
      searchExpr={["MG_CD", "MG_DESC_VIET", "MG_DESC_ENG", "MG_DESC_KOR", "MG_CD_ROOT"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      onApply={applyManagement}
      onClear={clearManagement}
      renderPopupContent={({ closePopup }) => (
        <ManagementInfoPage
          mode="lookup"
          onPickManagement={applyManagement}
          onCloseLookup={closePopup}
        />
      )}
      columns={[
        { dataField: "MG_CD", caption: managementCdFieldCaption, width: 160 },
        {
          dataField: "MG_DESC_VIET",
          caption: managementNmFieldCaption,
          minWidth: 260,
          calculateCellValue: (row) => getManagementName(row),
        },
        { dataField: "MG_CD_ROOT", caption: "Mã cha", width: 160 },
      ]}
    />
  )
}
