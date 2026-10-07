import React, { useContext } from "react"
import { AsyncRule, Column, RequiredRule } from "devextreme-react/data-grid"

import { checkCodeExists } from "@/api/lookupApi"
import { isDefaultLangField, useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { createDuplicateCodeValidator } from "@/utils/gridValidation"

const validateStoreCd = createDuplicateCodeValidator({
  idField: "STORE_ID",
  exists: (storeId, storeCd) => checkCodeExists("store", storeCd, storeId),
})

export const StoreColumns: React.FC = () => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  useCompanyLangRevision()

  return (
    <>
      <Column dataField="STORE_ID" caption={t("STORE_ID", "Store ID")} />
      <Column dataField="STORE_CD" caption={t("STORE_CD", "Store Code")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "STORE_CD is required")} />
        <AsyncRule message={t("MsgEqualCode", "STORE_CD already exists")} validationCallback={validateStoreCd} />
      </Column>
      <Column dataField="STORE_NM_VIET" caption={t("STORE_NM_VIET", "Store Name (VN)")}>
        {isDefaultLangField("STORE_NM_VIET") && <RequiredRule message={t("MSG_MUST_ITEM", "STORE_NM_VIET is required")} />}
      </Column>
      <Column dataField="STORE_NM_ENG" caption={t("STORE_NM_ENG", "Store Name (ENG)")}>
        {isDefaultLangField("STORE_NM_ENG") && <RequiredRule message={t("MSG_MUST_ITEM", "STORE_NM_ENG is required")} />}
      </Column>
      <Column dataField="STORE_NM_KOR" caption={t("STORE_NM_KOR", "Store Name (KOR)")}>
        {isDefaultLangField("STORE_NM_KOR") && <RequiredRule message={t("MSG_MUST_ITEM", "STORE_NM_KOR is required")} />}
      </Column>
      <Column dataField="STORE_NM_CHINA" caption={t("STORE_NM_CHINA", "Store Name (CHINA)")}>
        {isDefaultLangField("STORE_NM_CHINA") && <RequiredRule message={t("MSG_MUST_ITEM", "STORE_NM_CHINA is required")} />}
      </Column>
      <Column dataField="STORE_KIND_CD" caption={t("STORE_KIND_CD", "Kind")} />
      <Column dataField="STORE_KIND_ID" caption={t("MSG_STOREKINDID", "Kind")} />
      <Column dataField="STORE_KIND_NM_VIET" caption={t("STORE_KIND_NM_VIET", "STORE_KIND_NM_VIET")} />
      <Column dataField="STORE_KIND_NM_ENG" caption={t("STORE_KIND_NM_ENG", "STORE_KIND_NM_ENG")} />
      <Column dataField="STORE_KIND_NM_KOR" caption={t("STORE_KIND_NM_KOR", "STORE_KIND_NM_KOR")} />
      <Column dataField="STORE_KIND_NM_CHINA" caption={t("STORE_KIND_NM_CHINA", "STORE_KIND_NM_CHINA")} />
    </>
  )
}
