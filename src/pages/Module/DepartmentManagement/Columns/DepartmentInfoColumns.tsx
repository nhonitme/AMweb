import { useContext, useState } from "react"
import { AsyncRule, Button, Column, RequiredRule, TreeListTypes } from "devextreme-react/tree-list"
import type { SelectBoxTypes } from "devextreme-react/select-box"

import { checkCodeExists } from "@/api/lookupApi"
import BaseLookupCellEditor from "@/components/lookup/BaseLookupCellEditor"
import { departmentCodeLookupStore } from "@/components/lookup/departmentLookupStore"
import { formatDepartmentDisplay } from "@/components/lookup/departmentLookupUtils"
import { renderSharedDepartmentLookupPage } from "@/components/lookup/sharedMasterLookupPages"
import { filterActiveLangFields, isDefaultLangField, pickLocalizedText, useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import type { DepartmentInfo } from "@/types/departmentInfo"
import { createDuplicateCodeValidator } from "@/utils/gridValidation"
import { departmentFields } from "./DepartmentFields"

type ParentCodeEditCell = {
  value?: string | null
  data?: Partial<DepartmentInfo>
  setValue?: (value: string | null) => void
}

type DepartmentInfoColumnsProps = {
  onAddChild?: (rowData: DepartmentInfo) => void
}

const validateDepartmentCd = createDuplicateCodeValidator({
  idField: "DEPARTMENT_ID",
  exists: (departmentId, departmentCd) => checkCodeExists("department", departmentCd, departmentId),
})

const requiredDepartmentFields = new Set(["DEPARTMENT_CD"])

function readParentCode(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function ParentCodeLookupEditor({ value, data, setValue }: ParentCodeEditCell) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const incomingCode = readParentCode(value ?? data?.PARENT_CD)
  const [pickedCode, setPickedCode] = useState<string | null>(null)
  const parentCode = pickedCode ?? incomingCode

  const applyParent = (item: DepartmentInfo) => {
    const code = readParentCode(item.DEPARTMENT_CD)
    setPickedCode(code)
    setValue?.(code)
  }

  return (
    <BaseLookupCellEditor<DepartmentInfo>
      dataSource={departmentCodeLookupStore}
      value={parentCode || null}
      valueExpr="DEPARTMENT_CD"
      displayExpr={(item) =>
        formatDepartmentDisplay(item?.DEPARTMENT_CD, pickLocalizedText(item, "DEP_NAME"))
      }
      placeholder={t("SELECT", "Chọn")}
      popupTitle={t("DEPARTMENT_LIST", "Đối tượng")}
      buttonHint={t("SEARCH", "Mở danh sách đối tượng")}
      filterFocusField="DEPARTMENT_CD"
      searchExpr={filterActiveLangFields(["DEPARTMENT_CD", "DEP_NAME_VIET", "DEP_NAME_ENG", "DEP_NAME_KOR", "DEP_NAME_CHINA"])}
      onApply={applyParent}
      onClear={() => {
        setPickedCode("")
        setValue?.("")
      }}
      shouldHandleValueChange={(event: SelectBoxTypes.ValueChangedEvent) => {
        if ((event.value == null || event.value === "") && !event.event) {
          return false
        }
        return true
      }}
      renderPopupContent={({ closePopup }) =>
        renderSharedDepartmentLookupPage({
          closePopup,
          onPick: applyParent,
        })
      }
    />
  )
}

export function DepartmentInfoColumns({ onAddChild }: DepartmentInfoColumnsProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const companyLangRevision = useCompanyLangRevision()

  return (
    <>
      <Column
        type="buttons"
        width={100}
        fixed
        fixedPosition="left"
        showInColumnChooser={false}
      >
        <Button
          icon="add"
          hint={t("ADD", "Thêm phòng ban con")}
          onClick={(event: TreeListTypes.ColumnButtonClickEvent) => {
            if (event.row?.data) {
              onAddChild?.(event.row.data as DepartmentInfo)
            }
          }}
        />
        <Button name="edit" />
        <Button name="delete" />
      </Column>
      {departmentFields.map((field) => (
        <Column
          key={field.key}
          dataField={field.key}
          caption={t(field.key, field.caption)}
          editCellRender={
            field.key === "PARENT_CD"
              ? (cellInfo: ParentCodeEditCell) => <ParentCodeLookupEditor {...cellInfo} />
              : undefined
          }
        >
          {(requiredDepartmentFields.has(field.key) || isDefaultLangField(field.key)) && (
            <RequiredRule key={`${field.key}-${companyLangRevision}`} message={t("MSG_MUST_ITEM", `${field.key} is required`)} />
          )}
          {field.key === "DEPARTMENT_CD" && (
            <AsyncRule
              message={t("MsgEqualCode", "DEPARTMENT_CD already exists")}
              validationCallback={validateDepartmentCd}
            />
          )}
        </Column>
      ))}
    </>
  )
}

export default DepartmentInfoColumns
