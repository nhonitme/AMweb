import React from "react"
import { Column } from "devextreme-react/data-grid"

import { useCompanyLangRevision } from "@/lib/companyLang"

export const StoreKindColumns: React.FC = () => {
  useCompanyLangRevision()

  return (
    <>
      <Column dataField="STORE_KIND_CD" />
      <Column dataField="STORE_KIND_ID" />
      <Column dataField="STORE_KIND_NM_VIET" />
      <Column dataField="STORE_KIND_NM_ENG" />
      <Column dataField="STORE_KIND_NM_KOR" />
      <Column dataField="STORE_KIND_NM_CHINA" />
    </>
  )
}
