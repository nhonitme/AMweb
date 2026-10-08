import React from "react"
import { Column } from "devextreme-react/data-grid"

import { useCompanyLangRevision } from "@/lib/companyLang"

export const ProductColumns: React.FC = () => {
  useCompanyLangRevision()

  return (
    <>
      <Column dataField="PRODUCT_CD" />
      <Column dataField="PRODUCT_NM_VIET" />
      <Column dataField="PRODUCT_NM_ENG" />
      <Column dataField="PRODUCT_NM_KOR" />
      <Column dataField="PRODUCT_NM_CHINA" />
      <Column dataField="PRODUCT_KIND_ID" />
      <Column dataField="PRODUCTKIND_NM_VIET" />
      <Column dataField="UNIT_ID" />
      <Column dataField="UNIT_NM" />
      <Column dataField="STORE_ID" />
      <Column dataField="STORE_NM_VIET" />
      <Column dataField="DIVISION" />
      <Column dataField="SUMMARY" />
    </>
  )
}
