import { useCallback, useMemo } from "react"

import type { CustomerExt } from "@/types/customerExt"
import BaseLookupCellEditor, { type LookupDataSource } from "./BaseLookupCellEditor"
import {
  buildCustomerLookupSearchExpr,
  getCustomerLookupName,
  renderCustomerLookupItem,
} from "./customerLookupUtils"
import { customerLookupStore } from "./customerLookupStore"
import { renderSharedCustomerLookupPage } from "./sharedMasterLookupPages"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import {
  hasLookupRowField,
  restoreLookupGridCellFocus,
  type LookupGridCellValueHost,
  setLookupGridCellValue,
  toLookupNumber,
  trimLookupText,
} from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: number | null | undefined
  rowData?: object
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: number | null) => void
  customerIdField?: string
  customerCdField?: string
  customerNmField?: string
  taxCdField?: string
  taxCdFieldCaption?: string
  addressField?: string
  addressFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
}

export default function CustomerLookupCellEditor({
  dataSource = customerLookupStore,
  value,
  rowData,
  rowIndex,
  grid,
  setValue,
  customerIdField = "CUSTOMER_ID",
  customerCdField = "CUSTOMER_CD",
  customerNmField = "CUSTOMER_NM_VIET",
  taxCdField = "TAX_CD",
  taxCdFieldCaption = "Tax code",
  addressField = "ADDRESS",
  addressFieldCaption = "Address",
  placeholder = "Select customer",
  popupTitle = "Select customer",
  buttonHint = "Open customer list",
  autoOpen,
}: Props) {
  const displayExpr = useCallback(
    (item: CustomerExt | null) => {
      const customerCd = trimLookupText(item?.CUSTOMER_CD)
      const customerName = getCustomerLookupName(item, customerNmField)
      return customerCd || customerName
    },
    [customerNmField],
  )

  const searchExpr = useMemo(
    () => buildCustomerLookupSearchExpr(customerNmField),
    [customerNmField],
  )

  const applyCustomer = useCallback(
    (customer: CustomerExt) => {
      const customerId = toLookupNumber(customer.CUSTOMER_ID)
      const customerCd = trimLookupText(customer.CUSTOMER_CD)

      setValue(customerId)
      setLookupGridCellValue(grid, rowIndex, customerIdField, customerId)
      setLookupGridCellValue(grid, rowIndex, customerCdField, customerCd)
      setLookupGridCellValue(
        grid,
        rowIndex,
        customerNmField,
        getCustomerLookupName(customer, customerNmField),
      )

      if (hasLookupRowField(rowData, taxCdField)) {
        setLookupGridCellValue(grid, rowIndex, taxCdField, trimLookupText(customer.TAX_CD))
      }

      if (hasLookupRowField(rowData, addressField)) {
        setLookupGridCellValue(grid, rowIndex, addressField, trimLookupText(customer.ADDRESS))
      }

      restoreLookupGridCellFocus(grid, rowIndex, customerCdField)
    },
    [
      addressField,
      customerCdField,
      customerIdField,
      customerNmField,
      grid,
      rowData,
      rowIndex,
      setValue,
      taxCdField,
    ],
  )

  const clearCustomer = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, customerIdField, null)
    setLookupGridCellValue(grid, rowIndex, customerCdField, "")
    setLookupGridCellValue(grid, rowIndex, customerNmField, "")

    if (hasLookupRowField(rowData, taxCdField)) {
      setLookupGridCellValue(grid, rowIndex, taxCdField, "")
    }

    if (hasLookupRowField(rowData, addressField)) {
      setLookupGridCellValue(grid, rowIndex, addressField, "")
    }

    restoreLookupGridCellFocus(grid, rowIndex, customerCdField)
  }, [
    addressField,
    customerCdField,
    customerIdField,
    customerNmField,
    grid,
    rowData,
    rowIndex,
    setValue,
    taxCdField,
  ])

  return (
    <BaseLookupCellEditor<CustomerExt>
      dataSource={dataSource}
      value={value}
      valueExpr="CUSTOMER_ID"
      displayExpr={displayExpr}
      itemRender={(item) =>
        renderCustomerLookupItem(item, {
          preferredNameField: customerNmField,
          taxCodeCaption: taxCdFieldCaption,
          addressCaption: addressFieldCaption,
        })
      }
      searchExpr={searchExpr}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      noDataText="No matching customers"
      dropDownHeight={360}
      autoOpen={autoOpen}
      grid={grid}
      rowIndex={rowIndex}
      navigateField={customerCdField}
      onApply={applyCustomer}
      onClear={clearCustomer}
      renderPopupContent={({ closePopup }) =>
        renderSharedCustomerLookupPage({ closePopup, onPick: applyCustomer })
      }
    />
  )
}
