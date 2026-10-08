import { Column } from "devextreme-react/data-grid"

export function BankColumns() {

  return (
    <>
      <Column dataField="BANK_CD" />

      <Column dataField="BANK_NM" />

      <Column dataField="ACC_CD" />
      <Column dataField="PASSBOOK_NM" />
      <Column dataField="ACCOUNT_NUM" />
      <Column dataField="CITAD_CODE" />
      <Column dataField="REMARK" />
    </>
  )
}

export default BankColumns
