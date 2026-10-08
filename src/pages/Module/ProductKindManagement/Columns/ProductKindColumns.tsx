import React from "react"
import { Column } from "devextreme-react/data-grid"

import { useCompanyLangRevision } from "@/lib/companyLang"

export const ProductKindColumns: React.FC = () => {
  useCompanyLangRevision()

  return (
    <>
      <Column dataField="PRODUCT_KIND_CD" />
      <Column dataField="PRODUCTKIND_NM_VIET" />
      <Column dataField="PRODUCTKIND_NM_ENG" />
      <Column dataField="PRODUCTKIND_NM_KOR" />
      <Column dataField="PRODUCTKIND_NM_CHINA" />
      <Column dataField="REMARK" />
    </>
  )
}
