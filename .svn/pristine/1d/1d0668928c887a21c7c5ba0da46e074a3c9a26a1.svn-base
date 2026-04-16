import { useCallback } from "react"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { currencyLookupStore, type CurrencyLookupItem } from "./currencyLookupStore"
import {
  firstLookupText,
  hasLookupRowField,
  setLookupGridCellValue,
  trimLookupText,
} from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData?: object
  rowIndex: number
  grid: any
  setValue: (value: string | number | null) => void
  currencyCdField?: string
  currencyNmField?: string
  symbolField?: string
  currencyCdFieldCaption?: string
  currencyNmFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
}

export default function CurrencyLookupCellEditor({
  dataSource = currencyLookupStore,
  value,
  rowData,
  rowIndex,
  grid,
  setValue,
  currencyCdField = "FC_TYPE",
  currencyNmField,
  symbolField,
  currencyCdFieldCaption = "Currency code",
  currencyNmFieldCaption = "Currency name",
  placeholder = "Select currency",
  popupTitle = "Select currency",
  buttonHint = "Open currency list",
}: Props) {
  const displayExpr = useCallback((item: CurrencyLookupItem | null) => {
    const currencyCd = trimLookupText(item?.CODE_CD)
    const currencyName = firstLookupText(item?.CODE_NAME)

    if (currencyCd && currencyName) {
      return `${currencyCd} - ${currencyName}`
    }

    return currencyCd || currencyName
  }, [])

  const applyCurrency = useCallback(
    (currency: CurrencyLookupItem) => {
      const currencyCd = trimLookupText(currency.CODE_CD)
      const currencyName = trimLookupText(currency.CODE_NAME)

      setValue(currencyCd || null)
      setLookupGridCellValue(grid, rowIndex, currencyCdField, currencyCd)

      if (hasLookupRowField(rowData, currencyNmField)) {
        setLookupGridCellValue(grid, rowIndex, currencyNmField, currencyName)
      }

      if (hasLookupRowField(rowData, symbolField)) {
        setLookupGridCellValue(grid, rowIndex, symbolField, "")
      }
    },
    [currencyCdField, currencyNmField, grid, rowData, rowIndex, setValue, symbolField],
  )

  const clearCurrency = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, currencyCdField, "")

    if (hasLookupRowField(rowData, currencyNmField)) {
      setLookupGridCellValue(grid, rowIndex, currencyNmField, "")
    }

    if (hasLookupRowField(rowData, symbolField)) {
      setLookupGridCellValue(grid, rowIndex, symbolField, "")
    }
  }, [currencyCdField, currencyNmField, grid, rowData, rowIndex, setValue, symbolField])

  return (
    <BaseLookupCellEditor<CurrencyLookupItem>
      dataSource={dataSource}
      value={value}
      valueExpr="CODE_CD"
      displayExpr={displayExpr}
      filterFocusField="CODE_CD"
      searchExpr={["CODE_CD", "CODE_NAME"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      onApply={applyCurrency}
      onClear={clearCurrency}
      columns={[
        { dataField: "CODE_CD", caption: currencyCdFieldCaption, width: 140 },
        { dataField: "CODE_NAME", caption: currencyNmFieldCaption, minWidth: 220 },
      ]}
    />
  )
}
