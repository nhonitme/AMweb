import { useCallback, useContext, useMemo } from "react"
import CustomStore from "devextreme/data/custom_store"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { currencyLookupStore, type CurrencyLookupItem } from "./currencyLookupStore"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import {
  hasLookupRowField,
  restoreLookupGridCellFocus,
  type LookupGridCellValueHost,
  setLookupGridCellValue,
  trimLookupText,
} from "./lookupHelpers"
import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"
import { LanguageContext } from "@/lib/i18nLoader"
import { formatSysCodeOptionText, getSysCodeDisplayText } from "@/lib/sysCodeUtils"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData?: object
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | number | null) => void
  currencyCdField?: string
  currencyNmField?: string
  symbolField?: string
  currencyCdFieldCaption?: string
  currencyNmFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
}

type CurrencyLookupLoadSource = {
  load: (options?: unknown) => Promise<unknown>
  byKey?: (key: unknown) => Promise<unknown>
}

function getCurrencyLookupLoadSource(dataSource: LookupDataSource): CurrencyLookupLoadSource | null {
  if (typeof dataSource !== "object" || dataSource === null) {
    return null
  }

  const candidate = dataSource as { load?: unknown }
  if (typeof candidate.load !== "function") {
    return null
  }

  return dataSource as CurrencyLookupLoadSource
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
  autoOpen,
}: Props) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const displayExpr = useCallback(
    (item: CurrencyLookupItem | null) => formatSysCodeOptionText(item, translate),
    [translate],
  )

  const sortCurrencyItems = useCallback((items: CurrencyLookupItem[]) => {
    return [...items].sort((left, right) => {
      const leftCode = trimLookupText(left.CODE_CD).toUpperCase()
      const rightCode = trimLookupText(right.CODE_CD).toUpperCase()

      if (leftCode === DEFAULT_CURRENCY_CODE && rightCode !== DEFAULT_CURRENCY_CODE) {
        return -1
      }
      if (leftCode !== DEFAULT_CURRENCY_CODE && rightCode === DEFAULT_CURRENCY_CODE) {
        return 1
      }

      return leftCode.localeCompare(rightCode)
    })
  }, [])

  const sortedDataSource = useMemo<LookupDataSource>(() => {
    if (Array.isArray(dataSource)) {
      return sortCurrencyItems(dataSource as CurrencyLookupItem[])
    }

    const source = getCurrencyLookupLoadSource(dataSource)
    if (source) {
      // Keep a real CustomStore. Spreading the original store drops its prototype,
      // and SelectBox then throws E4020 while tabbing into this cell.
      return new CustomStore({
        key: "CODE_CD",
        loadMode: "raw",
        load: async (options) => {
          const loaded = await source.load(options)
          if (Array.isArray(loaded)) {
            return sortCurrencyItems(loaded as CurrencyLookupItem[])
          }

          return loaded
        },
        byKey: async (key) => {
          if (typeof source.byKey === "function") {
            return source.byKey(key)
          }

          const loaded = await source.load()
          if (Array.isArray(loaded)) {
            return (loaded as CurrencyLookupItem[]).find((item) => trimLookupText(item.CODE_CD) === trimLookupText(String(key))) ?? null
          }

          return null
        },
      })
    }

    return dataSource
  }, [dataSource, sortCurrencyItems])

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
      restoreLookupGridCellFocus(grid, rowIndex, currencyCdField)
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
    restoreLookupGridCellFocus(grid, rowIndex, currencyCdField)
  }, [currencyCdField, currencyNmField, grid, rowData, rowIndex, setValue, symbolField])

  return (
    <BaseLookupCellEditor<CurrencyLookupItem>
      dataSource={sortedDataSource}
      value={value}
      valueExpr="CODE_CD"
      displayExpr={displayExpr}
      filterFocusField="CODE_CD"
      searchExpr={["CODE_CD", "CODE_NAME"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      autoOpen={autoOpen}
      onApply={applyCurrency}
      onClear={clearCurrency}
      columns={[
        { dataField: "CODE_CD", caption: currencyCdFieldCaption, width: 140 },
        {
          dataField: "CODE_NAME",
          caption: currencyNmFieldCaption,
          minWidth: 220,
          calculateCellValue: (row) => getSysCodeDisplayText(row, translate),
        },
      ]}
    />
  )
}
