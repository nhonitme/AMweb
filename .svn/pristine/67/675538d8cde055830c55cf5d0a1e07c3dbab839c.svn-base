import { useContext } from "react"
import { Column } from "devextreme-react/data-grid"

import { LanguageContext } from "@/lib/i18nLoader"

export function ChitNoteDetailColumns() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Column dataField="CHIT_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
      <Column dataField="CHITDETAIL_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
      <Column dataField="CHITDETAIL_CD" visible={false} />
      <Column dataField="CHIT_YMD" visible={false} />
      <Column dataField="CUSTOMER_ID" visible={false} showInColumnChooser={false} allowHiding={false} />
      <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER", "Khach hang")} />
      <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER_NM", "Ten khach hang")} />
      <Column dataField="DEBIT" caption={t("DEBIT", "Tai khoan no")} />
      <Column dataField="DEBIT_NM_VIET" caption={t("ACC_NM_DEBIT", "Ten TK no")} />
      <Column dataField="CREDIT" caption={t("CREDIT", "Tai khoan co")} />
      <Column dataField="CREDIT_NM_VIET" caption={t("ACC_NM_CREDIT", "Ten TK co")} />
      <Column dataField="AMOUNT" caption={t("AMOUNT", "So tien")} dataType="number" format="#,##0.00" />
      <Column dataField="DETAIL_DESCRIPTION_VIET" caption={t("DESCRIPTION2", "Dien giai")} />
    </>
  )
}

export default ChitNoteDetailColumns
