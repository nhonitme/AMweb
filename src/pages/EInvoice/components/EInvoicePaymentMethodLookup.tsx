import { useCallback, useContext } from "react"
import BaseLookupCellEditor from "@/components/lookup/BaseLookupCellEditor"
import { trimLookupText } from "@/components/lookup/lookupHelpers"
import { einvPaymentMethodLookupStore, type EinvPaymentMethodLookupItem } from "@/components/lookup/einvPaymentMethodLookupStore"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatSysCodeOptionText, getSysCodeDisplayText } from "@/lib/sysCodeUtils"

type Props = {
  value: string | null | undefined
  onChange: (code: string) => void
  readOnly?: boolean
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function EInvoicePaymentMethodLookup({
  value,
  onChange,
  readOnly = false,
  placeholder,
  popupTitle,
  buttonHint,
}: Props) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const resolvedPlaceholder = placeholder ?? t("PAYMENT_METHOD_SELECT", "Select payment method")
  const resolvedPopupTitle = popupTitle ?? t("PAYMENT_METHOD_SELECT", "Select payment method")
  const resolvedButtonHint = buttonHint ?? t("PAYMENT_METHOD_LOOKUP", "Open payment method list")

  const displayExpr = useCallback(
    (item: EinvPaymentMethodLookupItem | null) => formatSysCodeOptionText(item, t),
    [t],
  )

  const applyPaymentMethod = useCallback(
    (item: EinvPaymentMethodLookupItem) => {
      onChange(trimLookupText(item.CODE_CD))
    },
    [onChange],
  )

  const clearPaymentMethod = useCallback(() => {
    onChange("")
  }, [onChange])

  return (
    <div className={readOnly ? "pointer-events-none w-full opacity-80" : "w-full"}>
      <BaseLookupCellEditor<EinvPaymentMethodLookupItem>
        dataSource={einvPaymentMethodLookupStore}
        value={trimLookupText(value) || null}
        valueExpr="CODE_CD"
        displayExpr={displayExpr}
        filterFocusField="CODE_CD"
        searchExpr={["CODE_CD", "CODE_NAME", "NOTE"]}
        placeholder={resolvedPlaceholder}
        popupTitle={resolvedPopupTitle}
        buttonHint={resolvedButtonHint}
        dropDownWidth={420}
        dropDownHeight={280}
        popupWidth="min(720px, 96vw)"
        popupHeight="min(560px, 90vh)"
        popupGridHeight="calc(min(560px, 90vh) - 92px)"
        onApply={applyPaymentMethod}
        onClear={clearPaymentMethod}
        columns={[
          { dataField: "CODE_CD", caption: t("HTTTOAN", "Payment method"), width: 100 },
          {
            dataField: "CODE_NAME",
            caption: t("CODE_NAME", "Name"),
            minWidth: 240,
            calculateCellValue: (row) => getSysCodeDisplayText(row, t),
          },
        ]}
      />
    </div>
  )
}
