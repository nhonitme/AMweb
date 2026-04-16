import ExcelJS from "exceljs"
import { saveAs } from "file-saver"

import type { BankInfoApi } from "@/types/bankInfo"
import type { BankDepositBookRow } from "@/types/bankDepositBook"

import { formatYmdForDisplay } from "./accountingDateUtils"

export const formatFilterDateForApi = (value: Date | null): string | null => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return null
  }

  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}-${month}-${day}`
}

export const formatBankDepositYmdForDisplay = (value: string | null | undefined): string =>
  formatYmdForDisplay(value ?? null)

export const formatBankDepositAmount = (value: number | null | undefined, fractionDigits = 2): string =>
  new Intl.NumberFormat("en-US", {
    minimumFractionDigits: fractionDigits,
    maximumFractionDigits: fractionDigits,
  }).format(Number.isFinite(value ?? NaN) ? Number(value) : 0)

export const buildBankOptionLabel = (bank: Pick<BankInfoApi, "BANK_CD" | "BANK_NM">): string =>
  [bank.BANK_CD?.trim(), bank.BANK_NM?.trim()].filter(Boolean).join(" - ")

const buildTimestamp = (): string => new Date().toISOString().replace(/[:.-]/g, "")

export async function exportBankDepositBookToExcel(rows: BankDepositBookRow[]) {
  const workbook = new ExcelJS.Workbook()
  const worksheet = workbook.addWorksheet("Bank Deposit Book")

  worksheet.columns = [
    { header: "Date", key: "CHIT_YMD", width: 14 },
    { header: "Module", key: "MODULE_CD", width: 10 },
    { header: "Chit No", key: "CHIT_NO", width: 18 },
    { header: "Chit Type", key: "CHIT_TYPE", width: 16 },
    { header: "Description", key: "DESCRIPTION", width: 36 },
    { header: "Debit", key: "DEBIT", width: 16 },
    { header: "Credit", key: "CREDIT", width: 16 },
    { header: "Receipt", key: "RECEIPT_AMOUNT", width: 18 },
    { header: "Payment", key: "PAYMENT_AMOUNT", width: 18 },
    { header: "Running Amount", key: "RUNNING_AMOUNT", width: 18 },
    { header: "Currency", key: "FC_TYPE", width: 12 },
    { header: "Receipt FC", key: "RECEIPT_FC_AMOUNT", width: 18 },
    { header: "Payment FC", key: "PAYMENT_FC_AMOUNT", width: 18 },
    { header: "FC Rate", key: "FC_RATE", width: 16 },
    { header: "Running FC Amount", key: "RUNNING_FC_AMOUNT", width: 20 },
    { header: "Bank Cd", key: "BANK_CD", width: 16 },
    { header: "Bank Own Cd", key: "BANK_OWN_CD", width: 16 },
    { header: "Customer Cd", key: "CUSTOMER_CD", width: 16 },
  ]

  rows.forEach((row) => {
    const worksheetRow = worksheet.addRow({
      CHIT_YMD: row.ROW_TYPE === "DETAIL" ? formatBankDepositYmdForDisplay(row.CHIT_YMD) : "",
      MODULE_CD: row.MODULE_CD,
      CHIT_NO: row.CHIT_NO,
      CHIT_TYPE: row.CHIT_TYPE,
      DESCRIPTION: row.DESCRIPTION,
      DEBIT: row.DEBIT,
      CREDIT: row.CREDIT,
      RECEIPT_AMOUNT: row.RECEIPT_AMOUNT,
      PAYMENT_AMOUNT: row.PAYMENT_AMOUNT,
      RUNNING_AMOUNT: row.RUNNING_AMOUNT,
      FC_TYPE: row.FC_TYPE,
      RECEIPT_FC_AMOUNT: row.RECEIPT_FC_AMOUNT,
      PAYMENT_FC_AMOUNT: row.PAYMENT_FC_AMOUNT,
      FC_RATE: row.FC_RATE,
      RUNNING_FC_AMOUNT: row.RUNNING_FC_AMOUNT,
      BANK_CD: row.BANK_CD,
      BANK_OWN_CD: row.BANK_OWN_CD,
      CUSTOMER_CD: row.CUSTOMER_CD,
    })

    if (row.ROW_TYPE !== "DETAIL") {
      worksheetRow.font = { bold: true }
    }
  })

  const buffer = await workbook.xlsx.writeBuffer()
  saveAs(new Blob([buffer]), `bank_deposit_book_${buildTimestamp()}.xlsx`)
}
