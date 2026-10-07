import { useCallback } from "react"
import type { BankInfo } from "@/types/bankInfo"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { bankLookupStore } from "./bankLookupStore"
import { renderSharedBankLookupPage } from "./sharedMasterLookupPages"
import type { LookupOpenMode } from "./LookupGridCellDisplay"
import {
  firstLookupText,
  hasLookupRowField,
  restoreLookupGridCellFocus,
  type LookupGridCellValueHost,
  setLookupGridCellValue,
  toLookupNumber,
  trimLookupText,
} from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData?: object
  rowIndex: number
  grid: LookupGridCellValueHost
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  bankIdField?: string
  bankCdField?: string
  bankNmField?: string
  accCdField?: string
  passbookNmField?: string
  accountNumField?: string
  citadCodeField?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
  autoOpen?: LookupOpenMode | null
}

export default function BankLookupCellEditor({
  dataSource = bankLookupStore,
  value,
  rowData,
  rowIndex,
  grid,
  setValue,
  valueMode = "id",
  bankIdField = "BANK_ID",
  bankCdField = "BANK_CD",
  bankNmField = "BANK_NM",
  accCdField = "ACC_CD",
  passbookNmField = "PASSBOOK_NM",
  accountNumField = "ACCOUNT_NUM",
  citadCodeField = "CITAD_CODE",
  placeholder = "Select bank",
  popupTitle = "Select bank",
  buttonHint = "Open bank list",
  autoOpen,
}: Props) {
  const displayExpr = useCallback((item: BankInfo | null) => {
    const bankCd = trimLookupText(item?.BANK_CD)
    const bankName = firstLookupText(item?.BANK_NM)

    if (bankCd && bankName) {
      return `${bankCd} - ${bankName}`
    }

    return bankCd || bankName
  }, [])

  const applyBank = useCallback(
    (bank: BankInfo) => {
      const bankId = toLookupNumber(bank.BANK_ID)
      const bankCd = trimLookupText(bank.BANK_CD)
      const bankName = trimLookupText(bank.BANK_NM)

      setValue(valueMode === "code" ? bankCd || null : bankId)
      setLookupGridCellValue(grid, rowIndex, bankIdField, bankId)
      setLookupGridCellValue(grid, rowIndex, bankCdField, bankCd)
      setLookupGridCellValue(grid, rowIndex, bankNmField, bankName)

      if (hasLookupRowField(rowData, accCdField)) {
        setLookupGridCellValue(grid, rowIndex, accCdField, trimLookupText(bank.ACC_CD))
      }

      if (hasLookupRowField(rowData, passbookNmField)) {
        setLookupGridCellValue(grid, rowIndex, passbookNmField, trimLookupText(bank.PASSBOOK_NM))
      }

      if (hasLookupRowField(rowData, accountNumField)) {
        setLookupGridCellValue(grid, rowIndex, accountNumField, trimLookupText(bank.ACCOUNT_NUM))
      }

      if (hasLookupRowField(rowData, citadCodeField)) {
        setLookupGridCellValue(grid, rowIndex, citadCodeField, trimLookupText(bank.CITAD_CODE))
      }
      restoreLookupGridCellFocus(grid, rowIndex, bankCdField)
    },
    [
      accCdField,
      accountNumField,
      bankCdField,
      bankIdField,
      bankNmField,
      citadCodeField,
      grid,
      passbookNmField,
      rowData,
      rowIndex,
      setValue,
      valueMode,
    ],
  )

  const clearBank = useCallback(() => {
    setValue(null)
    setLookupGridCellValue(grid, rowIndex, bankIdField, null)
    setLookupGridCellValue(grid, rowIndex, bankCdField, "")
    setLookupGridCellValue(grid, rowIndex, bankNmField, "")

    if (hasLookupRowField(rowData, accCdField)) {
      setLookupGridCellValue(grid, rowIndex, accCdField, "")
    }

    if (hasLookupRowField(rowData, passbookNmField)) {
      setLookupGridCellValue(grid, rowIndex, passbookNmField, "")
    }

    if (hasLookupRowField(rowData, accountNumField)) {
      setLookupGridCellValue(grid, rowIndex, accountNumField, "")
    }

    if (hasLookupRowField(rowData, citadCodeField)) {
      setLookupGridCellValue(grid, rowIndex, citadCodeField, "")
    }
    restoreLookupGridCellFocus(grid, rowIndex, bankCdField)
  }, [
    accCdField,
    accountNumField,
    bankCdField,
    bankIdField,
    bankNmField,
    citadCodeField,
    grid,
    passbookNmField,
    rowData,
    rowIndex,
    setValue,
  ])

  return (
    <BaseLookupCellEditor<BankInfo>
      dataSource={dataSource}
      value={value}
      valueExpr={valueMode === "code" ? "BANK_CD" : "BANK_ID"}
      displayExpr={displayExpr}
      filterFocusField="BANK_CD"
      searchExpr={["BANK_CD", "BANK_NM", "ACCOUNT_NUM", "ACC_CD", "PASSBOOK_NM", "CITAD_CODE"]}
      placeholder={placeholder}
      popupTitle={popupTitle}
      buttonHint={buttonHint}
      autoOpen={autoOpen}
      onApply={applyBank}
      onClear={clearBank}
      renderPopupContent={({ closePopup }) =>
        renderSharedBankLookupPage({ closePopup, onPick: applyBank })
      }
    />
  )
}
