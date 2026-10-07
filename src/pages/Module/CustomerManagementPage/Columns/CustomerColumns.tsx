import { useContext } from "react"
import { AsyncRule, Column, Lookup, RequiredRule } from "devextreme-react/data-grid"

import { checkCodeExists } from "@/api/lookupApi"
import type { SysCode } from "@/api/sysCodeService"
import { LanguageContext } from "@/lib/i18nLoader"
import { createSysCodeDisplayExpr } from "@/lib/sysCodeUtils"
import { resolveGridValidationRowId, createDuplicateCodeValidator } from "@/utils/gridValidation"
import { requiredCustomerFields, type CustomerFieldKey } from "./CustomerFields"

type CustomerColumnsProps = {
  categoryCodes?: SysCode[]
  customerTypeCodes?: SysCode[]
}

const validateCustomerCd = async (event: Parameters<ReturnType<typeof createDuplicateCodeValidator>>[0]) => {
  const rowId = resolveGridValidationRowId(event, "CUSTOMER_ID")
  if (!rowId) {
    return true
  }

  return createDuplicateCodeValidator({
    idField: "CUSTOMER_ID",
    exists: (customerId, customerCd) => checkCodeExists("customer", customerCd, customerId),
  })(event)
}

export function CustomerColumns({
  categoryCodes = [],
  customerTypeCodes = [],
}: CustomerColumnsProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const sysCodeDisplayExpr = createSysCodeDisplayExpr(t)
  const renderRequiredRule = (fieldKey: CustomerFieldKey) =>
    requiredCustomerFields.has(fieldKey)
      ? <RequiredRule message={t("MSG_MUST_ITEM", `${fieldKey} is required`)} />
      : null

  return (
    <>
      <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER_CD", "Customer Code")}>
        {renderRequiredRule("CUSTOMER_CD")}
        <AsyncRule message={t("MsgEqualCode", "CUSTOMER_CD already exists")} validationCallback={validateCustomerCd} />
      </Column>

      <Column dataField="CATEGORY_CD" caption={t("CATEGORY_CD", "Category")}>
        {renderRequiredRule("CATEGORY_CD")}
        <Lookup dataSource={categoryCodes} displayExpr={sysCodeDisplayExpr} valueExpr="CODE_CD" />
      </Column>

      <Column dataField="CUSTOMER_TYPE" caption={t("CUSTOMER_TYPE", "Customer Type")}>
        {renderRequiredRule("CUSTOMER_TYPE")}
        <Lookup dataSource={customerTypeCodes} displayExpr={sysCodeDisplayExpr} valueExpr="CODE_CD" />
      </Column>

      <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER_NM_VIET", "Customer Name (VI)")}>
        {renderRequiredRule("CUSTOMER_NM_VIET")}
      </Column>

      <Column dataField="CUSTOMER_NM_ENG" caption={t("CUSTOMER_NM_ENG", "Customer Name (ENG)")} />
      <Column dataField="ADDRESS" caption={t("ADDRESS", "Address")} />
      <Column dataField="TEL" caption={t("TEL", "Telephone")} />
      <Column dataField="EMAIL" caption={t("EMAIL", "Email")} />
      <Column dataField="TAX_CD" caption={t("TAX_CD", "Tax Code")} />
      <Column dataField="BANK_ID" />
      <Column dataField="BANK_CD" caption={t("BANK_CD", "Bank Code")} />
      <Column dataField="BANK_NM" caption={t("BANK_NM", "Bank Name")} />
    </>
  )
}

export default CustomerColumns
