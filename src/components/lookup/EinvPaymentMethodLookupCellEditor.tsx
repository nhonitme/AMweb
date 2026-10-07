import { useCallback, useContext } from "react"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import { restoreLookupGridCellFocus, type LookupGridCellValueHost, setLookupGridCellValue, trimLookupText } from "./lookupHelpers"
import { einvPaymentMethodLookupStore, type EinvPaymentMethodLookupItem } from "./einvPaymentMethodLookupStore"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatSysCodeOptionText, getSysCodeDisplayText } from "@/lib/sysCodeUtils"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | number | null) => void
  paymentMethodField?: string
  paymentMethodFieldCaption?: string
  paymentMethodNameCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
}

export default function EinvPaymentMethodLookupCellEditor({
  dataSource = einvPaymentMethodLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  paymentMethodField = "HTTTOAN",
  paymentMethodFieldCaption = "Payment method",
  paymentMethodNameCaption = "Description",
  placeholder = "Select payment method",
  popupTitle = "Select payment method",
  buttonHint = "Open payment method list",
  autoOpen,
}: Props) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const displayExpr = useCallback(
    (item: EinvPaymentMethodLookupItem | null) => formatSysCodeOptionText(item, translate),
    [translate],
  )

  const applyPaymentMethod = useCallback(
    (item: EinvPaymentMethodLookupItem) => {
      const code = trimLookupText(item.CODE_CD)
      setValue(code || null)
      setLookupGridCellValue(grid, rowIndex, paymentMethodField, code)
      restoreLookupGridCellFocus(grid, rowIndex, paymentMethodField)
    },
    [grid, paymentMethodField, rowIndex, setValue],
  )

  const clearPaymentMethod = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, paymentMethodField, "")
    restoreLookupGridCellFocus(grid, rowIndex, paymentMethodField)
  }, [grid, paymentMethodField, rowIndex, setValue])

  return (
    <BaseLookupCellEditor<EinvPaymentMethodLookupItem>
      dataSource={dataSource}
      value={value}
      valueExpr="CODE_CD"
      displayExpr={displayExpr}
      filterFocusField="CODE_CD"
      searchExpr={["CODE_CD", "CODE_NAME", "NOTE"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      autoOpen={autoOpen}
      dropDownWidth={420}
      dropDownHeight={280}
      popupWidth="min(720px, 96vw)"
      popupHeight="min(560px, 90vh)"
      popupGridHeight="calc(min(560px, 90vh) - 92px)"
      onApply={applyPaymentMethod}
      onClear={clearPaymentMethod}
      columns={[
        { dataField: "CODE_CD", caption: paymentMethodFieldCaption, width: 120 },
        {
          dataField: "CODE_NAME",
          caption: paymentMethodNameCaption,
          minWidth: 240,
          calculateCellValue: (row) => getSysCodeDisplayText(row, translate),
        },
      ]}
    />
  )
}
