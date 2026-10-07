import React from "react"
import { Column, RequiredRule } from "devextreme-react/data-grid"
import { departmentLookupStore } from "@/components/lookup/departmentLookupStore"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import type { BeforeStateDepartment } from "@/types/openingBalance"
import type { DepartmentInfo } from "@/types/departmentInfo"
import { getCurrentLangCode } from "@/utils/language"

type Props = {
  t: (key: string, fallback?: string) => string
}

type BeforeStateStringValueField = {
  [K in keyof BeforeStateDepartment]: BeforeStateDepartment[K] extends string | null | undefined ? K : never
}[keyof BeforeStateDepartment]

type AccountNameField = Extract<
  BeforeStateStringValueField,
  "ACC_NM_VIET" | "ACC_NM_ENG" | "ACC_NM_KOR" | "ACC_NM_CHINA"
>

type DepartmentNameField = Extract<
  BeforeStateStringValueField,
  "DEP_NM_VIET" | "DEP_NM_ENG" | "DEP_NM_KOR" | "DEP_NM_CHINA"
>

function getAccountNameField(): AccountNameField {
  const langCode = getCurrentLangCode()

  switch (langCode) {
    case "ENG":
      return "ACC_NM_ENG"
    case "KOR":
      return "ACC_NM_KOR"
    case "CHN":
    case "THA":
      return "ACC_NM_CHINA"
    case "VIET":
    default:
      return "ACC_NM_VIET"
  }
}

function getDepartmentNameField(): DepartmentNameField {
  const langCode = getCurrentLangCode()

  switch (langCode) {
    case "ENG":
      return "DEP_NM_ENG"
    case "KOR":
      return "DEP_NM_KOR"
    case "CHN":
    case "THA":
      return "DEP_NM_CHINA"
    case "VIET":
    default:
      return "DEP_NM_VIET"
  }
}

export function OpeningBalanceCostObjectColumns(props: Props): React.JSX.Element {
  const { t } = props
  const { getFormat } = useDecimalColumnFormats()
  const accountNameField = getAccountNameField()
  const departmentNameField = getDepartmentNameField()

  return (
    <>
      <Column dataField="ROW_ID" visible={false} />
      <Column visible={false}
        dataField="DEPARTMENT_ID"
        setCellValue={(newData: Partial<BeforeStateDepartment>, value: number | null) => {
          newData.DEPARTMENT_ID = Number(value || 0)

          if (!value) {
            newData.DEPARTMENT_CD = ""
            newData.DEPARTMENT_NM = ""
            newData.DEP_NM_VIET = ""
            newData.DEP_NM_ENG = ""
            newData.DEP_NM_KOR = ""
            newData.DEP_NM_CHINA = ""
            return
          }

          return departmentLookupStore.byKey(value).then((item: DepartmentInfo | null) => {
            if (!item) return
            const departmentNm =
              item.DEP_NAME_VIET ||
              item.DEP_NAME_ENG ||
              item.DEP_NAME_KOR ||
              item.DEP_NAME_CHINA ||
              ""
            newData.DEPARTMENT_CD = item.DEPARTMENT_CD ?? ""
            newData.DEPARTMENT_NM = departmentNm
            newData.DEP_NM_VIET = item.DEP_NAME_VIET ?? departmentNm
            newData.DEP_NM_ENG = item.DEP_NAME_ENG ?? departmentNm
            newData.DEP_NM_KOR = item.DEP_NAME_KOR ?? departmentNm
            newData.DEP_NM_CHINA = item.DEP_NAME_CHINA ?? departmentNm
          })
        }}
      />

      <Column dataField="ACC_CD" caption={t("ACC_CD", "Mã tài khoản")} width={130}>
        <RequiredRule message={t("ACC_CD_REQUIRED", "Mã tài khoản không được để trống")} />
      </Column>

      <Column
        dataField={accountNameField}
        caption={t("ACCTITLE_NM", "Tên tài khoản")}
        minWidth={220}
        allowEditing={false}
        editorOptions={{ showUndoButton: false }}
      />

      <Column
        dataField="DEPARTMENT_CD"
        caption={t("DEPARTMENT_CD", "Mã đối tượng THCP")}
        width={220}
        allowEditing={false}
      >
        <RequiredRule message={t("DEPARTMENT_CD_REQUIRED", "Mã đối tượng THCP không được để trống")} />
      </Column>

      <Column
        dataField={departmentNameField}
        caption={t("DEP_NM", "Tên đối tượng THCP")}
        minWidth={220}
        allowEditing={false}
        editorOptions={{ showUndoButton: false }}
      />

      <Column
        dataField="FC_TYPE"
        caption={t("FC_TYPE", "Loại tiền")}
        width={130}
        editorOptions={{ showUndoButton: false }}
      />

      <Column
        dataField="DEBIT"
        caption={t("DEBIT", "Nợ")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("DEBIT", "#,##0")}
        editorOptions={{ format: getFormat("DEBIT", "#,##0"), showClearButton: false, showUndoButton: false }}
      />

      <Column
        dataField="CREDIT"
        caption={t("CREDIT", "Có")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("CREDIT", "#,##0")}
        editorOptions={{ format: getFormat("CREDIT", "#,##0"), showClearButton: false, showUndoButton: false }}
      />

      <Column
        dataField="DEBIT_FC"
        caption={t("DEBIT_FC", "Nợ ngoại tệ")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("DEBIT_FC", "#,##0.##")}
        editorOptions={{ format: getFormat("DEBIT_FC", "#,##0.##"), showClearButton: false, showUndoButton: false }}
      />

      <Column
        dataField="CREDIT_FC"
        caption={t("CREDIT_FC", "Có ngoại tệ")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("CREDIT_FC", "#,##0.##")}
        editorOptions={{ format: getFormat("CREDIT_FC", "#,##0.##"), showClearButton: false, showUndoButton: false }}
      />

      <Column
        dataField="EXCHANGE_RATE"
        caption={t("FC_RATE", "Tỷ giá")}
        width={130}
        alignment="right"
        dataType="number"
        format={getFormat("EXCHANGE_RATE", "#,##0.####")}
        editorOptions={{
          format: getFormat("EXCHANGE_RATE", "#,##0.####"),
          showClearButton: false,
          showUndoButton: false,
        }}
      />

      <Column dataField="NOTE" caption={t("NOTE", "Ghi chú")} minWidth={180} editorOptions={{ showUndoButton: false }} />
    </>
  )
}
