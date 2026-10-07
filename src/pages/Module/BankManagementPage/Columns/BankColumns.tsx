import { useContext } from "react"
import { AsyncRule, Column, RequiredRule } from "devextreme-react/data-grid"

import { checkCodeExists } from "@/api/lookupApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { createDuplicateCodeValidator } from "@/utils/gridValidation"

const validateBankCd = createDuplicateCodeValidator({
  idField: "BANK_ID",
  exists: (bankId, bankCd) => checkCodeExists("bank", bankCd, bankId),
})

export function BankColumns() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Column dataField="BANK_CD" caption={t("BANK_CD", "Bank Code")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "BANK_CD is required")} />
        <AsyncRule message={t("MsgEqualCode", "BANK_CD already exists")} validationCallback={validateBankCd} />
      </Column>

      <Column dataField="BANK_NM" caption={t("BANK_NM", "Bank Name")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "BANK_NM is required")} />
      </Column>

      <Column dataField="ACC_CD" caption={t("ACC_CD", "Account Code")} />
      <Column dataField="PASSBOOK_NM" caption={t("PASSBOOK_NM", "Account Name")} />
      <Column dataField="ACCOUNT_NUM" caption={t("ACCOUNT_NUM", "Account Number")} />
      <Column dataField="CITAD_CODE" caption={t("CITAD_CODE", "Citad Code")} />
      <Column dataField="REMARK" caption={t("REMARK", "Remark")} />
    </>
  )
}

export default BankColumns
