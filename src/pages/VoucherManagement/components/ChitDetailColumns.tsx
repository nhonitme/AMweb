import { useContext, useMemo } from "react"
import { Column } from "devextreme-react/data-grid"

import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import { pickLocalizedText } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"

export function useChitNoteDetailColumns() {
  const { getFormat } = useDecimalColumnFormats()
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const amountFormat = getFormat("AMOUNT", "#,##0.00")
  const foreignAmountFormat = getFormat("FC_AMOUNT", "#,##0.00")
  const foreignRateFormat = getFormat("FC_RATE", "#,##0.000000")

  return useMemo(
    () => (
      <>
        <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER", "Khach hang")} />
        <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER_NM", "Ten khach hang")} calculateCellValue={(row) => pickLocalizedText(row, "CUSTOMER_NM")} />
        <Column dataField="DEBIT" caption={t("DEBIT", "TK Nợ")} />
        <Column dataField="DEBIT_NM_VIET" caption={t("ACC_NM_DEBIT", "Tên TK Nợ")} calculateCellValue={(row) => pickLocalizedText(row, "DEBIT_NM")} />
        <Column dataField="CREDIT" caption={t("CREDIT", "TK Có")} />
        <Column dataField="CREDIT_NM_VIET" caption={t("ACC_NM_CREDIT", "Tên TK Có")} calculateCellValue={(row) => pickLocalizedText(row, "CREDIT_NM")} />
        <Column
          dataField="AMOUNT"
          caption={t("AMOUNT", "So tien")}
          dataType="number"
          format={amountFormat}
          editorOptions={createNumberEditorOptions(amountFormat)}
          allowHiding={false}
        />
        <Column dataField="FC_TYPE" caption={t("FC_TYPE", "Loai tien")} />
        <Column dataField="FC_AMOUNT" caption={t("FC_AMOUNT", "So tien ngoai te")} dataType="number" format={foreignAmountFormat} editorOptions={createNumberEditorOptions(foreignAmountFormat)} />
        <Column dataField="FC_RATE" caption={t("FC_RATE", "Ty gia")} dataType="number" format={foreignRateFormat} editorOptions={createNumberEditorOptions(foreignRateFormat)} />
        <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Dien giai")} />
      </>
    ),
    [amountFormat, foreignAmountFormat, foreignRateFormat, t],
  )
}

