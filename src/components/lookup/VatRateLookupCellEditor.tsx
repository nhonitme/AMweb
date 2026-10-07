import { useCallback, useContext } from "react"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import { restoreLookupGridCellFocus, type LookupGridCellValueHost, setLookupGridCellValue, trimLookupText } from "./lookupHelpers"
import { vatRateLookupStore, type VatRateLookupItem } from "./vatRateLookupStore"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatSysCodeOptionText, getSysCodeDisplayText } from "@/lib/sysCodeUtils"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | number | null) => void
  taxRateField?: string
  taxRateFieldCaption?: string
  taxRateNameCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
}

export default function VatRateLookupCellEditor({
  dataSource = vatRateLookupStore,
  value,
  rowIndex,
  grid,
  setValue,
  taxRateField = "TSUAT",
  taxRateFieldCaption = "Tax rate",
  taxRateNameCaption = "Description",
  placeholder = "Select tax rate",
  popupTitle = "Select tax rate",
  buttonHint = "Open tax rate list",
  autoOpen,
}: Props) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const displayExpr = useCallback(
    (item: VatRateLookupItem | null) => formatSysCodeOptionText(item, translate),
    [translate],
  )

  const applyRate = useCallback(
    (item: VatRateLookupItem) => {
      const code = trimLookupText(item.CODE_CD)
      setValue(code || null)
      setLookupGridCellValue(grid, rowIndex, taxRateField, code)
      restoreLookupGridCellFocus(grid, rowIndex, taxRateField)
    },
    [grid, rowIndex, setValue, taxRateField],
  )

  const clearRate = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, taxRateField, "")
    restoreLookupGridCellFocus(grid, rowIndex, taxRateField)
  }, [grid, rowIndex, setValue, taxRateField])

  return (
    <BaseLookupCellEditor<VatRateLookupItem>
      dataSource={dataSource}
      value={value}
      valueExpr="CODE_CD"
      displayExpr={displayExpr}
      filterFocusField="CODE_CD"
      searchExpr={["CODE_CD", "CODE_NAME"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      autoOpen={autoOpen}
      dropDownWidth={420}
      dropDownHeight={280}
      popupWidth="min(720px, 96vw)"
      popupHeight="min(560px, 90vh)"
      popupGridHeight="calc(min(560px, 90vh) - 92px)"
      onApply={applyRate}
      onClear={clearRate}
      columns={[
        { dataField: "CODE_CD", caption: taxRateFieldCaption, width: 120 },
        {
          dataField: "CODE_NAME",
          caption: taxRateNameCaption,
          minWidth: 240,
          calculateCellValue: (row) => getSysCodeDisplayText(row, translate),
        },
      ]}
    />
  )
}
