import React from "react"
import { Column, RequiredRule } from "devextreme-react/data-grid"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import type { BeforeState } from "@/types/openingBalance"
import { getCurrentLangCode } from "@/utils/language"

type Props = {
  t: (key: string, fallback?: string) => string
}

type BeforeStateStringValueField = {
  [K in keyof BeforeState]: BeforeState[K] extends string | null | undefined ? K : never
}[keyof BeforeState]

type AccountNameField = Extract<
  BeforeStateStringValueField,
  "ACC_NM_VIET" | "ACC_NM_ENG" | "ACC_NM_KOR" | "ACC_NM_CHINA"
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


export function OpeningBalanceAccountColumns(props: Props): React.JSX.Element {
  const { t } = props
  const { getFormat } = useDecimalColumnFormats()
  const accountNameField = getAccountNameField()

  const accField = "ACC_CD"

  return (
    <>
  <Column dataField="ROW_ID" visible={false} />
  <Column dataField="ACC_ID" visible={false} />

      <Column dataField={accField} caption={t("ACC_CD", "Mã tài khoản")} width={130}>
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
      >
      </Column>

      <Column
        dataField="CREDIT"
        caption={t("CREDIT", "Có")}
        width={140}
        alignment="right"
        dataType="number"
        format={getFormat("CREDIT", "#,##0")}
        editorOptions={{ format: getFormat("CREDIT", "#,##0"), showClearButton: false , showUndoButton: false}}
      >
      </Column>

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
        editorOptions={{ format: getFormat("CREDIT_FC", "#,##0.##"), showClearButton: false , showUndoButton: false}}
      />

      <Column
        dataField="EXCHANGE_RATE"
        caption={t("FC_RATE", "Tỷ giá")}
        width={130}
        alignment="right"
        dataType="number"
        format={getFormat("EXCHANGE_RATE", "#,##0.####")}
        editorOptions={{ format: getFormat("EXCHANGE_RATE", "#,##0.####"), showClearButton: false, showUndoButton: false }}
      />

      <Column dataField="NOTE" caption={t("NOTE", "Ghi chú")} minWidth={180} editorOptions={{ showUndoButton: false }}/>

    </>
  )
}
