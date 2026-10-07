import React, { useContext } from "react"
import { AsyncRule, Column, RequiredRule } from "devextreme-react/data-grid"

import { checkCodeExists } from "@/api/lookupApi"
import { isDefaultLangField, useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { createDuplicateCodeValidator } from "@/utils/gridValidation"

const validateStoreKindCd = createDuplicateCodeValidator({
  idField: "STORE_KIND_ID",
  exists: (storeKindId, storeKindCd) => checkCodeExists("store-kind", storeKindCd, storeKindId),
})

export const StoreKindColumns: React.FC = () => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  useCompanyLangRevision()

  return (
    <>
      <Column dataField="STORE_KIND_CD" caption={t("StoreKindCD", "Kind")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "STORE_KIND_CD is required")} />
        <AsyncRule
          message={t("MsgEqualCode", "STORE_KIND_CD already exists")}
          validationCallback={validateStoreKindCd}
        />
      </Column>
      <Column dataField="STORE_KIND_ID" caption={t("StoreKindID", "Kind")} />
      <Column dataField="STORE_KIND_NM_VIET" caption={t("STORE_KIND_NM_VIET", "STORE_KIND_NM_VIET")}>
        {isDefaultLangField("STORE_KIND_NM_VIET") && <RequiredRule message={t("MSG_MUST_ITEM", "STORE_KIND_NM_VIET is required")} />}
      </Column>
      <Column dataField="STORE_KIND_NM_ENG" caption={t("STORE_KIND_NM_ENG", "STORE_KIND_NM_ENG")}>
        {isDefaultLangField("STORE_KIND_NM_ENG") && <RequiredRule message={t("MSG_MUST_ITEM", "STORE_KIND_NM_ENG is required")} />}
      </Column>
      <Column dataField="STORE_KIND_NM_KOR" caption={t("STORE_KIND_NM_KOR", "STORE_KIND_NM_KOR")}>
        {isDefaultLangField("STORE_KIND_NM_KOR") && <RequiredRule message={t("MSG_MUST_ITEM", "STORE_KIND_NM_KOR is required")} />}
      </Column>
      <Column dataField="STORE_KIND_NM_CHINA" caption={t("STORE_KIND_NM_CHINA", "STORE_KIND_NM_CHINA")}>
        {isDefaultLangField("STORE_KIND_NM_CHINA") && <RequiredRule message={t("MSG_MUST_ITEM", "STORE_KIND_NM_CHINA is required")} />}
      </Column>
    </>
  )
}
