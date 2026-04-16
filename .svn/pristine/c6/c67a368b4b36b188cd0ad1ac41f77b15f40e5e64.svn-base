import { useContext } from "react"
import { AsyncRule, Column, Lookup, RequiredRule } from "devextreme-react/data-grid"

import { checkCustomerCdExists } from "@/api/customerExtApi"
import type { SysCode } from "@/api/sysCodeService"
import { LanguageContext } from "@/lib/i18nLoader"
import { resolveGridValidationRowId } from "@/utils/gridValidation"

type CustomerColumnsProps = {
  customerTypeCodes?: SysCode[]
}

type CustomerValidationEvent = {
  data?: {
    CUSTOMER_ID?: number | null
  }
  value: unknown
  row?: {
    key?: number | string
    data?: {
      CUSTOMER_ID?: number | null
    }
  }
}

const validateCustomerCd = async (event: CustomerValidationEvent) => {
  const customerCd = String(event.value ?? "").trim()

  if (!customerCd) {
    return true
  }

  try {
    const customerId = resolveGridValidationRowId(event, "CUSTOMER_ID")
    const exists = await checkCustomerCdExists(customerId, customerCd)
    return { isValid: !exists }
  } catch {
    return {
      isValid: false,
      message: "Không kiểm tra được dữ liệu",
    }
  }
}

export function CustomerColumns({ customerTypeCodes = [] }: CustomerColumnsProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  return (
    <>
      <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER_CD", "Customer Code")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "CUSTOMER_CD không được để trống")} />
        <AsyncRule message={t("MsgEqualCode", "CUSTOMER_CD đã tồn tại")} validationCallback={validateCustomerCd} />
      </Column>

      <Column dataField="CATEGORY_CD" caption={t("CATEGORY_CD", "Category")} />

      <Column dataField="CUSTOMER_TYPE" caption={t("CUSTOMER_TYPE", "Customer Type")}>
        <Lookup
          dataSource={customerTypeCodes}
          displayExpr={(item: SysCode) => {
            const rawName = (item?.CODE_NAME ?? "") as string
            return rawName ? t(rawName, rawName) : ""
          }}
          valueExpr="CODE_CD"
        />
      </Column>

      <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER_NM_VIET", "Customer Name (VI)")}>
        <RequiredRule message={t("MSG_MUST_ITEM", "CUSTOMER_NM_VIET không được để trống")} />
      </Column>

      <Column dataField="CUSTOMER_NM_ENG" caption={t("CUSTOMER_NM_ENG", "Customer Name (ENG)")} />
      <Column dataField="TEL" caption={t("TEL", "Telephone")} />
      <Column dataField="EMAIL" caption={t("EMAIL", "Email")} />
      <Column dataField="TAX_CD" caption={t("TAX_CD", "Tax Code")} />
      <Column dataField="BANK_CD" caption={t("BANK_CD", "Bank Code")} />
    </>
  )
}

export default CustomerColumns
