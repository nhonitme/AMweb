import React, { useContext } from "react"
import { AsyncRule, Column, RequiredRule } from "devextreme-react/data-grid"

import { checkCodeExists } from "@/api/lookupApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { createDuplicateCodeValidator } from "@/utils/gridValidation"

const validateUnitCd = createDuplicateCodeValidator({
  idField: "UNIT_ID",
  exists: (unitId, unitCd) => checkCodeExists("unit", unitCd, unitId),
})

export const ProductUnitColumns: React.FC = () => {
  const { translate } = useContext(LanguageContext) as { translate: (k: string, f?: string) => string }
  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Column dataField="UNIT_CD" caption={t("UNIT_CD", "UNIT_CD")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "UNIT_CD is required")} />
        <AsyncRule message={t("MsgEqualCode", "UNIT_CD already exists")} validationCallback={validateUnitCd} />
      </Column>
      <Column dataField="UNIT_NM" caption={t("UNIT_NM", "UNIT_NM")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "UNIT_NM is required")} />
      </Column>
    </>
  )
}
