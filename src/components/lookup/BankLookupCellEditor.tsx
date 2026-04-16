import { useCallback } from "react"
import BankManagementPage from "@/pages/Module/BankManagementPage/bankInfo"
import type { BankInfo } from "@/types/bankInfo"
import BaseLookupCellEditor, { type LookupDataSource, type LookupValue } from "./BaseLookupCellEditor"
import { bankLookupStore } from "./bankLookupStore"
import {
  firstLookupText,
  hasLookupRowField,
  setLookupGridCellValue,
  toLookupNumber,
  trimLookupText,
} from "./lookupHelpers"

type Props = {
  dataSource?: LookupDataSource
  value: LookupValue
  rowData?: object
  rowIndex: number
  grid: any
  setValue: (value: string | number | null) => void
  valueMode?: "id" | "code"
  bankIdField?: string
  bankCdField?: string
  bankNmField?: string
  accCdField?: string
  passbookNmField?: string
  accountNumField?: string
  citadCodeField?: string
  bankCdFieldCaption?: string
  bankNmFieldCaption?: string
  placeholder?: string
  popupTitle?: string
  buttonHint?: string
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
  bankCdFieldCaption = "Bank code",
  bankNmFieldCaption = "Bank name",
  placeholder = "Select bank",
  popupTitle = "Select bank",
  buttonHint = "Open bank list",
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
      onApply={applyBank}
      onClear={clearBank}
      renderPopupContent={({ closePopup }) => (
        <BankManagementPage
          mode="lookup"
          onPickBank={applyBank}
          onCloseLookup={closePopup}
        />
      )}
      columns={[
        { dataField: "BANK_CD", caption: bankCdFieldCaption, width: 160 },
        { dataField: "BANK_NM", caption: bankNmFieldCaption, minWidth: 260 },
        { dataField: "ACCOUNT_NUM", caption: "Account number", width: 180 },
        { dataField: "ACC_CD", caption: "Account code", width: 160 },
      ]}
    />
  )
}
