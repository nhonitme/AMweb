import React, { useContext } from "react"
import { AsyncRule, Column, RequiredRule } from "devextreme-react/data-grid"

import { checkCodeExists } from "@/api/lookupApi"
import { isDefaultLangField, useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { createDuplicateCodeValidator } from "@/utils/gridValidation"

const validateProductCd = createDuplicateCodeValidator({
  idField: "PRODUCT_ID",
  exists: (productId, productCd) => checkCodeExists("product", productCd, productId),
})

export const ProductColumns: React.FC = () => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  useCompanyLangRevision()

  return (
    <>
      <Column dataField="PRODUCT_CD" caption={t("PRODUCT_CD", "Product Code")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCT_CD is required")} />
        <AsyncRule message={t("MsgEqualCode", "PRODUCT_CD already exists")} validationCallback={validateProductCd} />
      </Column>
      <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM_VIET", "Product Name (VIET)")}>
        {isDefaultLangField("PRODUCT_NM_VIET") && <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCT_NM_VIET is required")} />}
      </Column>
      <Column dataField="PRODUCT_NM_ENG" caption={t("PRODUCT_NM_ENG", "Name (ENG)")}>
        {isDefaultLangField("PRODUCT_NM_ENG") && <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCT_NM_ENG is required")} />}
      </Column>
      <Column dataField="PRODUCT_NM_KOR" caption={t("PRODUCT_NM_KOR", "Name (KOR)")}>
        {isDefaultLangField("PRODUCT_NM_KOR") && <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCT_NM_KOR is required")} />}
      </Column>
      <Column dataField="PRODUCT_NM_CHINA" caption={t("PRODUCT_NM_CHINA", "Name (CHINA)")}>
        {isDefaultLangField("PRODUCT_NM_CHINA") && <RequiredRule message={t("MSG_MUST_ITEM", "PRODUCT_NM_CHINA is required")} />}
      </Column>
      <Column dataField="PRODUCT_KIND_ID" caption={t("PRODUCT_KIND_ID", "Kind")} />
      <Column dataField="PRODUCTKIND_NM_VIET" caption={t("PRODUCTKIND_NM_VIET", "Kind Name")} />
      <Column dataField="UNIT_ID" caption={t("UNIT_ID", "Unit")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "UNIT_ID is required")} />
      </Column>
      <Column dataField="UNIT_NM" caption={t("UNIT_NM", "Unit Name")} />
      <Column dataField="STORE_ID" caption={t("STORE_ID", "Store Code")} />
      <Column dataField="STORE_NM_VIET" caption={t("STORE_NM_VIET", "Store Name")} />
      <Column dataField="DIVISION" caption={t("DIVISION_CD", "Account Code")} />
      <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
    </>
  )
}
