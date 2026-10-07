import { useCallback, useContext } from "react"
import BaseLookupCellEditor from "@/components/lookup/BaseLookupCellEditor"
import { trimLookupText } from "@/components/lookup/lookupHelpers"
import { vatRateLookupStore, type VatRateLookupItem } from "@/components/lookup/vatRateLookupStore"
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

export default function EInvoiceVatRateLookup({
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

  const resolvedPlaceholder = placeholder ?? t("VAT_RATE_SELECT", "Select tax rate")
  const resolvedPopupTitle = popupTitle ?? t("VAT_RATE_SELECT", "Select tax rate")
  const resolvedButtonHint = buttonHint ?? t("VAT_RATE_LOOKUP", "Open tax rate list")

  const displayExpr = useCallback(
    (item: VatRateLookupItem | null) => formatSysCodeOptionText(item, t),
    [t],
  )

  const applyTaxRate = useCallback(
    (item: VatRateLookupItem) => {
      onChange(trimLookupText(item.CODE_CD))
    },
    [onChange],
  )

  const clearTaxRate = useCallback(() => {
    onChange("")
  }, [onChange])

  return (
    <div className={readOnly ? "pointer-events-none w-full opacity-80" : "w-full"}>
      <BaseLookupCellEditor<VatRateLookupItem>
        dataSource={vatRateLookupStore}
        value={trimLookupText(value) || null}
        valueExpr="CODE_CD"
        displayExpr={displayExpr}
        filterFocusField="CODE_CD"
        searchExpr={["CODE_CD", "CODE_NAME"]}
        placeholder={resolvedPlaceholder}
        popupTitle={resolvedPopupTitle}
        buttonHint={resolvedButtonHint}
        dropDownWidth={420}
        dropDownHeight={280}
        popupWidth="min(720px, 96vw)"
        popupHeight="min(560px, 90vh)"
        popupGridHeight="calc(min(560px, 90vh) - 92px)"
        onApply={applyTaxRate}
        onClear={clearTaxRate}
        columns={[
          { dataField: "CODE_CD", caption: t("TSUAT", "Tax rate"), width: 120 },
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
