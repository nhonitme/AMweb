import { useContext } from "react"
import { Column, Lookup, } from "devextreme-react/data-grid"

import type { SysCode } from "@/api/sysCodeService"
import { LanguageContext } from "@/lib/i18nLoader"
import { createSysCodeDisplayExpr } from "@/lib/sysCodeUtils"

type CustomerColumnsProps = {
  categoryCodes?: SysCode[]
  customerTypeCodes?: SysCode[]
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

  return (
    <>
      <Column dataField="CUSTOMER_CD" />

      <Column dataField="CATEGORY_CD">
        
        <Lookup dataSource={categoryCodes} displayExpr={sysCodeDisplayExpr} valueExpr="CODE_CD" />
      </Column>

      <Column dataField="CUSTOMER_TYPE">
        
        <Lookup dataSource={customerTypeCodes} displayExpr={sysCodeDisplayExpr} valueExpr="CODE_CD" />
      </Column>

      <Column dataField="CUSTOMER_NM_VIET" />

      <Column dataField="CUSTOMER_NM_ENG" />
      <Column dataField="ADDRESS" />
      <Column dataField="TEL" />
      <Column dataField="EMAIL" />
      <Column dataField="TAX_CD" />
      <Column dataField="BANK_ID" />
      <Column dataField="BANK_CD" />
      <Column dataField="BANK_NM" />
    </>
  )
}

export default CustomerColumns
