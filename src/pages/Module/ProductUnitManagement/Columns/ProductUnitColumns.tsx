import React from "react"
import { Column } from "devextreme-react/data-grid"

export const ProductUnitColumns: React.FC = () => {

  return (
    <>
      <Column dataField="UNIT_CD" />
      <Column dataField="UNIT_NM" />
    </>
  )
}
