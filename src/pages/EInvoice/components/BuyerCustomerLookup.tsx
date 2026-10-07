import { useCallback, useContext, useMemo, useRef } from "react"

import BaseLookupCellEditor from "@/components/lookup/BaseLookupCellEditor"
import {
  buildCustomerLookupSearchExpr,
  getCustomerLookupName,
  renderCustomerLookupItem,
} from "@/components/lookup/customerLookupUtils"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import { renderSharedCustomerLookupPage } from "@/components/lookup/sharedMasterLookupPages"
import { toLookupNumber, trimLookupText } from "@/components/lookup/lookupHelpers"
import { LanguageContext } from "@/lib/i18nLoader"
import type { CustomerExt } from "@/types/customerExt"

type Props = {
  value: number | null | undefined
  onChange: (customer: CustomerExt | null) => void
  readOnly?: boolean
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function BuyerCustomerLookup({
  value,
  onChange,
  readOnly = false,
  placeholder,
  popupTitle,
  buttonHint,
}: Props) {
  const applyingRef = useRef(false)
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const displayExpr = useCallback((item: CustomerExt | null) => {
    const customerCd = trimLookupText(item?.CUSTOMER_CD)
    const customerName = getCustomerLookupName(item)
    return customerCd && customerName ? `${customerCd} - ${customerName}` : customerCd || customerName
  }, [])

  const searchExpr = useMemo(() => buildCustomerLookupSearchExpr("CUSTOMER_NM_VIET", true), [])

  const applyCustomer = useCallback(
    (customer: CustomerExt) => {
      applyingRef.current = true
      onChange(customer)
      window.requestAnimationFrame(() => {
        applyingRef.current = false
      })
    },
    [onChange],
  )

  return (
    <BaseLookupCellEditor<CustomerExt>
      dataSource={customerLookupStore}
      value={toLookupNumber(value)}
      valueExpr="CUSTOMER_ID"
      displayExpr={displayExpr}
      itemRender={(item) =>
        renderCustomerLookupItem(item, {
          taxCodeCaption: t("TAX_CD", "Tax code"),
          addressCaption: t("ADDRESS", "Address"),
        })
      }
      searchExpr={searchExpr}
      placeholder={placeholder ?? t("CustomerSelect", "Select customer")}
      popupTitle={popupTitle ?? t("CustomerSelect", "Select customer")}
      buttonHint={buttonHint ?? t("LIST_CUSTOMER", "Open customer list")}
      noDataText={t("NO_MATCHING_CUSTOMERS", "No matching customers")}
      dropDownHeight={360}
      className="w-full"
      readOnly={readOnly}
      onApply={applyCustomer}
      onClear={() => onChange(null)}
      shouldHandleValueChange={(event) => {
        if (applyingRef.current) {
          return false
        }

        const nextId = toLookupNumber(event.value)
        const currentId = toLookupNumber(value)
        return nextId == null || currentId == null || nextId !== currentId
      }}
      renderPopupContent={({ closePopup }) =>
        renderSharedCustomerLookupPage({ closePopup, onPick: applyCustomer })
      }
    />
  )
}
