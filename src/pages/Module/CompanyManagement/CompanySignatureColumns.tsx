import { useContext } from "react"
import { Column, RequiredRule } from "devextreme-react/data-grid"

import { LanguageContext } from "@/lib/i18nLoader"

export default function CompanySignatureColumns() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Column dataField="SIGN_CODE" caption={t("SIGN_CODE", "Sign Code")} allowEditing={false} />

      <Column dataField="DISPLAY_LABEL" caption={t("DISPLAY_LABEL", "Display Label")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "DISPLAY_LABEL khong duoc de trong")} />
      </Column>

      <Column dataField="SIGN_NAME" caption={t("SIGN_NAME", "Signer Name")} />

      <Column dataField="SIGN_TITLE" caption={t("SIGN_TITLE", "Signer Title")} />
      <Column dataField="SIGN_IMAGE_URL" caption={t("SIGN_IMAGE_URL", "Image URL")} />
      <Column dataField="SORT_ORDER" caption={t("SORT_ORDER", "Sort Order")} dataType="number" />
      <Column dataField="IS_ACTIVE" caption={t("IS_ACTIVE", "Active")} dataType="boolean" />
    </>
  )
}
