import React from "react"
import { Column, RequiredRule } from "devextreme-react/data-grid"
import { bankLookupStore } from "@/components/lookup/bankLookupStore"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import type { BeforeStateBank } from "@/types/openingBalance"
import type { BankInfo } from "@/types/bankInfo"

type Props = {
  t: (key: string, fallback?: string) => string
}

type LocalizedNameColumn<TField extends string> = {
  dataField: TField
  captionKey: string
  captionFallback: string
}

const accountNameColumns: LocalizedNameColumn<"ACC_NM_VIET" | "ACC_NM_ENG" | "ACC_NM_KOR" | "ACC_NM_CHINA">[] = [
  { dataField: "ACC_NM_VIET", captionKey: "ACCTITLE_NM", captionFallback: "Tên tài khoản" },
  { dataField: "ACC_NM_ENG", captionKey: "ACCTITLE_NM_ENG", captionFallback: "Tên tài khoản (ENG)" },
  { dataField: "ACC_NM_KOR", captionKey: "ACCTITLE_NM_KOR", captionFallback: "Tên tài khoản (KOR)" },
  { dataField: "ACC_NM_CHINA", captionKey: "ACCTITLE_NM_CHINA", captionFallback: "Tên tài khoản (CHN)" },
]

const bankNameColumns: LocalizedNameColumn<"BANK_NM_VIET" | "BANK_NM_ENG" | "BANK_NM_KOR" | "BANK_NM_CHINA">[] = [
  { dataField: "BANK_NM_VIET", captionKey: "BANK_NM", captionFallback: "Tên ngân hàng" },
  { dataField: "BANK_NM_ENG", captionKey: "BANK_NM_ENG", captionFallback: "Tên ngân hàng (ENG)" },
  { dataField: "BANK_NM_KOR", captionKey: "BANK_NM_KOR", captionFallback: "Tên ngân hàng (KOR)" },
  { dataField: "BANK_NM_CHINA", captionKey: "BANK_NM_CHINA", captionFallback: "Tên ngân hàng (CHN)" },
]

export function useOpeningBalanceBankColumns(props: Props): React.JSX.Element {
  const { t } = props
  const { getFormat } = useDecimalColumnFormats()

  return (
    <>
      <Column dataField="ROW_ID" visible={false} />
      <Column visible={false}
        dataField="BANK_ID"
        setCellValue={(newData: Partial<BeforeStateBank>, value: number | null) => {
          newData.BANK_ID = Number(value || 0)

          if (!value) {
            newData.BANK_CD = ""
            newData.BANK_NM = ""
            newData.BANK_ACCOUNT_NO = ""
            newData.BANK_NM_VIET = ""
            newData.BANK_NM_ENG = ""
            newData.BANK_NM_KOR = ""
            newData.BANK_NM_CHINA = ""
            return
          }

          return bankLookupStore.byKey(value).then((item: BankInfo | null) => {
            if (!item) return
            const bankName = item.BANK_NM ?? ""
            newData.BANK_CD = item.BANK_CD ?? ""
            newData.BANK_NM = bankName
            newData.BANK_ACCOUNT_NO = item.ACCOUNT_NUM ?? ""
            newData.BANK_NM_VIET = bankName
            newData.BANK_NM_ENG = bankName
            newData.BANK_NM_KOR = bankName
            newData.BANK_NM_CHINA = bankName
            if (item.ACC_CD) {
              newData.ACC_CD = item.ACC_CD
            }
          })
        }}
      />

      <Column dataField="ACC_CD" caption={t("ACC_CD", "Mã tài khoản")} width={130}>
        <RequiredRule message={t("ACC_CD_REQUIRED", "Mã tài khoản không được để trống")} />
      </Column>

      {accountNameColumns.map((column) => (
        <Column
          key={column.dataField}
          dataField={column.dataField}
          caption={t(column.captionKey, column.captionFallback)}
          minWidth={220}
          allowEditing={false}
          editorOptions={{ showUndoButton: false }}
        />
      ))}

      <Column
        dataField="BANK_CD"
        caption={t("BANK_CD", "Mã ngân hàng")}
        width={130}
        allowEditing={false}
      >
        <RequiredRule message={t("BANK_CD_REQUIRED", "Mã ngân hàng không được để trống")} />
      </Column>

      {bankNameColumns.map((column) => (
        <Column
          key={column.dataField}
          dataField={column.dataField}
          caption={t(column.captionKey, column.captionFallback)}
          minWidth={220}
          allowEditing={false}
          editorOptions={{ showUndoButton: false }}
        />
      ))}

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
