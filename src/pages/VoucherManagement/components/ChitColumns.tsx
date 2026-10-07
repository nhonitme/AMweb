import { useContext } from "react"
import { Column } from "devextreme-react/data-grid"

import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ChitType } from "@/types/voucher"
import { getChitTypeLabel } from "../chitUtils"

export function ChitNoteColumns() {
  const { getFormat } = useDecimalColumnFormats()
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const amountFormat = getFormat("AMOUNT", "#,##0.00")

  return (
    <>
      <Column dataField="CHIT_ID" />
      <Column
        dataField="CHIT_TYPE"
        caption={t("CHIT_TYPE", "Loại")}
        customizeText={(cell) => {
          const code = String(cell.value ?? "").trim().toUpperCase() as ChitType
          return getChitTypeLabel(code, t) || code
        }}
      />
      <Column dataField="CHIT_CD" caption={t("CHIT_CD", "Ma chung tu")} />
      <Column dataField="CHIT_YMD" caption={t("CHIT_YMD", "Ngay chung tu")} dataType="date" format="dd/MM/yyyy" />
      <Column dataField="CHIT_NO" caption={t("CHIT_NO", "So chung tu")} />
      <Column dataField="DESCRIPTION_VIET" caption={t("DESCRIPTION", "Dien giai")} />
      <Column
        dataField="AMOUNT"
        caption={t("AMOUNT", "So tien")}
        dataType="number"
        format={amountFormat}
        editorOptions={createNumberEditorOptions(amountFormat)}
      />
      <Column dataField="PAYER_INFO" caption={t("lblPayer", "Doi tuong lien quan")} />
    </>
  )
}

export default ChitNoteColumns
