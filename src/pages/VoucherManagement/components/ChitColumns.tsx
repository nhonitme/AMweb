import { useContext } from "react"
import { Column } from "devextreme-react/data-grid"

import { LanguageContext } from "@/lib/i18nLoader"

export function ChitNoteColumns() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Column dataField="CHIT_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
      <Column dataField="CHIT_TYPE" caption={t("CHIT_TYPE", "Loai phieu")} />
      <Column dataField="CHIT_CD" caption={t("CHIT_CD", "Ma chung tu")} visible={false} />
      <Column dataField="CHIT_YMD" caption={t("CHIT_YMD", "Ngay chung tu")} dataType="date" format="dd/MM/yyyy" />
      <Column dataField="CHIT_NO" caption={t("CHIT_NO", "So chung tu")} />
      <Column dataField="DESCRIPTION_VIET" caption={t("DESCRIPTION", "Dien giai")} />
      <Column dataField="AMOUNT" caption={t("AMOUNT", "So tien")} dataType="number" format="#,##0.00" />
      <Column dataField="PAYER_INFO" caption={t("lblPayer", "Doi tuong lien quan")} />
    </>
  )
}

export default ChitNoteColumns
