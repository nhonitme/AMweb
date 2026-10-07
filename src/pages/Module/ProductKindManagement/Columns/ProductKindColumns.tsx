import React, { useContext } from "react"
import { AsyncRule, Column, RequiredRule } from "devextreme-react/data-grid"

import { checkCodeExists } from "@/api/lookupApi"
import { isDefaultLangField, useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { createDuplicateCodeValidator } from "@/utils/gridValidation"

const validateProductKindCd = createDuplicateCodeValidator({
  idField: "PRODUCT_KIND_ID",
  exists: (productKindId, productKindCd) => checkCodeExists("product-kind", productKindCd, productKindId),
})

export const ProductKindColumns: React.FC = () => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  useCompanyLangRevision()

  return (
    <>
      <Column dataField="PRODUCT_KIND_CD" caption={t("PRODUCT_KIND_CD", "PRODUCT_KIND_CD")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCT_KIND_CD is required")} />
        <AsyncRule
          message={t("MsgEqualCode", "PRODUCT_KIND_CD already exists")}
          validationCallback={validateProductKindCd}
        />
      </Column>
      <Column dataField="PRODUCTKIND_NM_VIET" caption={t("PRODUCTKIND_NM_VIET", "PRODUCTKIND_NM_VIET")}>
        {isDefaultLangField("PRODUCTKIND_NM_VIET") && <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCTKIND_NM_VIET is required")} />}
      </Column>
      <Column dataField="PRODUCTKIND_NM_ENG" caption={t("PRODUCTKIND_NM_ENG", "PRODUCTKIND_NM_ENG")}>
        {isDefaultLangField("PRODUCTKIND_NM_ENG") && <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCTKIND_NM_ENG is required")} />}
      </Column>
      <Column dataField="PRODUCTKIND_NM_KOR" caption={t("PRODUCTKIND_NM_KOR", "PRODUCTKIND_NM_KOR")}>
        {isDefaultLangField("PRODUCTKIND_NM_KOR") && <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCTKIND_NM_KOR is required")} />}
      </Column>
      <Column dataField="PRODUCTKIND_NM_CHINA" caption={t("PRODUCTKIND_NM_CHINA", "PRODUCTKIND_NM_CHINA")}>
        {isDefaultLangField("PRODUCTKIND_NM_CHINA") && <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCTKIND_NM_CHINA is required")} />}
      </Column>
      <Column dataField="REMARK" caption={t("REMARK", "REMARK")} />
    </>
  )
}
