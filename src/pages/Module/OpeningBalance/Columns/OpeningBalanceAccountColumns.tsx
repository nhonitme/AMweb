import React from "react"
import { Column, CustomRule, RequiredRule } from "devextreme-react/data-grid"
import type { ColumnEditCellTemplateData } from "devextreme/ui/data_grid"

import AcclistLookupCellEditor from "@/components/lookup/AcclistLookupCellEditor"
import { LookupStore } from "@/components/lookup/AcclistLookupStore"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import type { BeforeState } from "@/types/openingBalance"
import { getCurrentLangCode } from "@/utils/language"

type Props = {
  t: (key: string, fallback?: string) => string
}

type OpeningBalanceEditCellInfo = ColumnEditCellTemplateData<BeforeState, string | number>

type BeforeStateStringValueField = {
  [K in keyof BeforeState]: BeforeState[K] extends string | null | undefined ? K : never
}[keyof BeforeState]

type AccountNameField = Extract<
  BeforeStateStringValueField,
  "ACC_NM_VIET" | "ACC_NM_ENG" | "ACC_NM_KOR" | "ACC_NM_CHINA"
>

type CreateAccEditorConfig = {
  valueField: BeforeStateStringValueField
  nameField: BeforeStateStringValueField
  idField?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

const FC_TYPE_OPTIONS = ["VND", "USD", "KRW", "EUR", "JPY", "CNY"]

function getAccountNameField(): AccountNameField {
  const langCode = getCurrentLangCode()

  switch (langCode) {
    case "ENG":
      return "ACC_NM_ENG"
    case "KOR":
      return "ACC_NM_KOR"
    case "CHINA":
      return "ACC_NM_CHINA"
    case "VIET":
    default:
      return "ACC_NM_VIET"
  }
}

export function OpeningBalanceAccountColumns(props: Props): React.JSX.Element {
  const { t } = props
  const { getFormat } = useDecimalColumnFormats()
  const accountNameField = getAccountNameField()

  const createAccEditor = ({
    valueField,
    nameField,
    idField,
    placeholder,
    popupTitle,
    buttonHint,
  }: CreateAccEditorConfig) =>
    (cellInfo: OpeningBalanceEditCellInfo) => (
      <AcclistLookupCellEditor
        dataSource={LookupStore}
        value={cellInfo.data?.[valueField] ?? null}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(accCd) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, valueField, accCd)
        }}
        ValueField={valueField}
        NameField={nameField}
        IdField={idField}
        LookupCodeField="ACC_CD"
        LookupNameField={`ACCTITLE_NM_${getCurrentLangCode()}`}
        placeholder={placeholder ?? t("ACC_SELECT", "Select account")}
        popupTitle={popupTitle ?? t("ACC_SELECT", "Select account")}
        buttonHint={buttonHint ?? t("lblACC", "Open account list")}
      />
    )

  return (
    <>
      <Column dataField="ACC_ID" visible={false} showInColumnChooser={false} allowHiding={false} />

      <Column
        dataField="ACC_CD"
        caption={t("ACC_CD", "Mã tài khoản")}
        width={130}
        editCellRender={createAccEditor({
          valueField: "ACC_CD",
          nameField: accountNameField,
          idField: "ACC_ID",
        })}
      >
        <RequiredRule message={t("ACC_CD_REQUIRED", "Mã tài khoản không được để trống")} />
      </Column>

      <Column
        dataField={accountNameField}
        caption={t("ACCTITLE_NM", "Tên tài khoản")}
        minWidth={220}
        allowEditing={false}
      />

      <Column
        dataField="FC_TYPE"
        caption={t("FC_TYPE", "Loại tiền")}
        width={110}
        alignment="center"
        lookup={{ dataSource: FC_TYPE_OPTIONS }}
      />

      <Column
        dataField="DEBIT"
        caption={t("DEBIT", "Nợ")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("DEBIT", "#,##0")}
        editorOptions={{ format: getFormat("DEBIT", "#,##0"), showClearButton: false }}
      >
        <CustomRule
          message={t("DEBIT_CREDIT_EXCLUSIVE", "Không được nhập đồng thời cả Nợ và Có")}
          validationCallback={(e) => {
            const data = e.data as BeforeState
            const debit = Number(e.value || 0)
            const credit = Number(data?.CREDIT || 0)
            return !(debit > 0 && credit > 0)
          }}
        />
      </Column>

      <Column
        dataField="CREDIT"
        caption={t("CREDIT", "Có")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("CREDIT", "#,##0")}
        editorOptions={{ format: getFormat("CREDIT", "#,##0"), showClearButton: false }}
      >
        <CustomRule
          message={t("DEBIT_CREDIT_EXCLUSIVE", "Không được nhập đồng thời cả Nợ và Có")}
          validationCallback={(e) => {
            const data = e.data as BeforeState
            const credit = Number(e.value || 0)
            const debit = Number(data?.DEBIT || 0)
            return !(debit > 0 && credit > 0)
          }}
        />
      </Column>

      <Column
        dataField="DEBIT_FC"
        caption={t("DEBIT_FC", "Nợ ngoại tệ")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("DEBIT_FC", "#,##0.##")}
        editorOptions={{ format: getFormat("DEBIT_FC", "#,##0.##"), showClearButton: false }}
      />

      <Column
        dataField="CREDIT_FC"
        caption={t("CREDIT_FC", "Có ngoại tệ")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("CREDIT_FC", "#,##0.##")}
        editorOptions={{ format: getFormat("CREDIT_FC", "#,##0.##"), showClearButton: false }}
      />

      <Column
        dataField="EXCHANGE_RATE"
        caption={t("FC_RATE", "Tỷ giá")}
        width={130}
        alignment="right"
        dataType="number"
        format={getFormat("EXCHANGE_RATE", "#,##0.####")}
        editorOptions={{ format: getFormat("EXCHANGE_RATE", "#,##0.####"), showClearButton: false }}
      />

      <Column dataField="SUMMARY" caption={t("SUMMARY", "Tóm tắt")} minWidth={180} />

      <Column
        type="buttons"
        caption={t("ACTION", "Thao tác")}
        width={100}
        buttons={[
          {
            name: "delete",
            hint: t("DELETE", "Xóa"),
          },
        ]}
      />
    </>
  )
}
