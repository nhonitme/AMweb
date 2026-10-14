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
import Button from "devextreme-react/button"
import { useState } from "react"
import { VatCustomerQuickCreatePopup } from "./VatQuickCreatePopups"
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
  quickCreateEnabled?: boolean
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
  quickCreateEnabled = false,
}: Props) {
  const [quickCreateVisible, setQuickCreateVisible] = useState(false)
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
      } else if (quickCreateEnabled && hasLookupRowField(rowData, "VAT_COMPANY_TAXCD")) {
        setLookupGridCellValue(grid, rowIndex, "VAT_COMPANY_TAXCD", trimLookupText(customer.TAX_CD))
      }

      if (hasLookupRowField(rowData, addressField)) {
        setLookupGridCellValue(grid, rowIndex, addressField, trimLookupText(customer.ADDRESS))
      } else if (quickCreateEnabled && hasLookupRowField(rowData, "UNDEFINE")) {
        const address = trimLookupText(customer.ADDRESS)
        const taxCode = trimLookupText(customer.TAX_CD)
        setLookupGridCellValue(grid, rowIndex, "UNDEFINE", [address, taxCode].filter(Boolean).join(" | "))
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
      quickCreateEnabled,
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

  const undefine = trimLookupText((rowData as Record<string, unknown> | undefined)?.UNDEFINE)
  const undefineParts = undefine.split("|").map((part) => part.trim())
  const seed = {
    name: trimLookupText((rowData as Record<string, unknown> | undefined)?.[customerNmField]),
    taxCode: undefineParts[undefineParts.length - 1] || trimLookupText((rowData as Record<string, unknown> | undefined)?.VAT_COMPANY_TAXCD),
    address: trimLookupText((rowData as Record<string, unknown> | undefined)?.ADDRESS) || undefineParts[0] || "",
  }

  return (
    <div className="flex min-w-0 items-center gap-1">
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
    {quickCreateEnabled ? <>
      <Button icon="plus" stylingMode="text" hint="Tạo nhanh khách hàng" elementAttr={{ "aria-label": "Tạo nhanh khách hàng" }} disabled={false} onClick={() => setQuickCreateVisible(true)} />
      <VatCustomerQuickCreatePopup
        visible={quickCreateVisible}
        seed={seed}
        onClose={() => setQuickCreateVisible(false)}
        onSaved={applyCustomer}
      />
    </> : null}
    </div>
  )
}
