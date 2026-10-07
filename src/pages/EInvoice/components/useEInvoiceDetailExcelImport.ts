import { useCallback, type MutableRefObject } from "react"
import notify from "devextreme/ui/notify"
import type dxDataGrid from "devextreme/ui/data_grid"

import type { ClientExcelImportContext, ExcelImportResponse } from "@/api/excelApi"
import type { EInvoice } from "@/types/einvoice"
import { renumberEInvoiceDetails, type EInvoiceCalcSettings } from "../einvoiceModel"
import type { EInvoiceDecimalResolver } from "../einvoiceDecimalSettings"
import type { EInvoiceDetailRow, GridKey } from "./EInvoiceEditorTypes"

type UseEInvoiceDetailExcelImportOptions = {
  isReadOnly: boolean
  companyCd: string
  decimalResolver: EInvoiceDecimalResolver
  getUserCalcSettings: () => EInvoiceCalcSettings
  syncDetailRows: () => EInvoice
  emitDetailRowsChange: (details: EInvoiceDetailRow[]) => void
  detailGridRef: MutableRefObject<dxDataGrid<EInvoiceDetailRow, GridKey> | null>
  currentDetailRowKeyRef: MutableRefObject<string | null>
  commitDetailGridCell: (grid: dxDataGrid<EInvoiceDetailRow, GridKey> | null) => Promise<void>
  t: (key: string, fallback: string) => string
  lang?: string
  setDetailImportLoading: (loading: boolean) => void
}

export function useEInvoiceDetailExcelImport({
  isReadOnly,
  companyCd,
  decimalResolver,
  getUserCalcSettings,
  syncDetailRows,
  emitDetailRowsChange,
  detailGridRef,
  currentDetailRowKeyRef,
  commitDetailGridCell,
  t,
  lang,
  setDetailImportLoading,
}: UseEInvoiceDetailExcelImportOptions) {
  const handleImportDetailFile = useCallback(
    async (file: File, context: ClientExcelImportContext): Promise<ExcelImportResponse> => {
      if (isReadOnly) {
        return {
          success: false,
          totalRows: 0,
          successRows: 0,
          warningRows: 0,
          errorRows: 1,
          message: t("READ_ONLY", "Read only"),
        }
      }

      setDetailImportLoading(true)
      try {
        await commitDetailGridCell(detailGridRef.current)
        const currentForm = syncDetailRows()
        const { parseEInvoiceDetailExcelFile } = await import("../einvoiceDetailExcelImport")
        const importedDetails = await parseEInvoiceDetailExcelFile(
          file,
          currentForm.INVOICE_ID,
          companyCd,
          Number(currentForm.TGIA ?? 1) || 1,
          currentForm.DVTTE,
          context.sheetName,
          t,
          lang,
          currentForm.KHMSHDON,
        )

        if (importedDetails.length === 0) {
          throw new Error(t("IMPORT_NO_VALID_DETAIL_ROWS", "Excel file does not contain valid item lines"))
        }

        const firstImportedRowKey = importedDetails[0]?.ROW_KEY ?? null
        // Replace current draft grid with Excel rows; keep only soft-deleted rows for undelete.
        const keptDeletedRows = currentForm.DETAILS.filter((detail) => Number(detail.ISDEL ?? 0) === 1)
        const nextImportedRows = importedDetails.map((detail) => ({
          ...detail,
          INVOICE_ID: currentForm.INVOICE_ID,
          COMPANY_CD: currentForm.COMPANY_CD,
        }))
        emitDetailRowsChange(
          renumberEInvoiceDetails(
            [...keptDeletedRows, ...nextImportedRows],
            Number(currentForm.TGIA ?? 1),
            currentForm.DVTTE,
            decimalResolver,
            getUserCalcSettings(),
          ) as EInvoiceDetailRow[],
        )

        if (firstImportedRowKey) {
          currentDetailRowKeyRef.current = firstImportedRowKey
          requestAnimationFrame(() => {
            detailGridRef.current?.navigateToRow?.(firstImportedRowKey)
          })
        }

        const message = t("DETAIL_IMPORT_SUCCESS_COUNT", "Imported {0} detail line(s) successfully").replace(
          "{0}",
          String(importedDetails.length),
        )
        notify(message, "success", 3000)
        return {
          success: true,
          totalRows: importedDetails.length,
          successRows: importedDetails.length,
          warningRows: 0,
          errorRows: 0,
          message,
          sheetName: context.sheetName,
        }
      } finally {
        setDetailImportLoading(false)
      }
    },
    [
      commitDetailGridCell,
      companyCd,
      currentDetailRowKeyRef,
      decimalResolver,
      detailGridRef,
      emitDetailRowsChange,
      getUserCalcSettings,
      isReadOnly,
      setDetailImportLoading,
      syncDetailRows,
      t,
      lang,
    ],
  )

  return {
    handleImportDetailFile,
  }
}
