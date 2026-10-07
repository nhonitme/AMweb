import * as XLSX from "xlsx"

import { downloadFile } from "@/lib/fileUtils"
import { applyExcelColumnWidthsFromMatrix } from "@/lib/excelUtils"
import {
  buildEInvoiceDetailExcelTemplateMatrix,
  EINVOICE_DETAIL_EXCEL_HEADER_ROW_INDEX,
  EINVOICE_DETAIL_EXCEL_SAMPLE_ROW_INDEX,
  loadEInvoiceDetailExcelTemplateLookups,
} from "./einvoiceDetailExcelTemplateData"
import {
  EINVOICE_DETAIL_EXCEL_SHEET_NAME,
  getEInvoiceDetailExcelTemplateFileSuffix,
  resolveEInvoiceDetailExcelFormKind,
  type EInvoiceDetailExcelFormKind,
  type EInvoiceDetailExcelTranslate,
} from "./einvoiceDetailExcelColumns"

export {
  EINVOICE_DETAIL_EXCEL_SHEET_NAME,
  EINVOICE_DETAIL_EXCEL_COLUMNS,
  resolveEInvoiceDetailExcelFormKind,
} from "./einvoiceDetailExcelColumns"

export async function createEInvoiceDetailExcelTemplateBlob(
  translate: EInvoiceDetailExcelTranslate,
  lang: string,
  formKind: EInvoiceDetailExcelFormKind = "default",
): Promise<Blob> {
  const lookups = await loadEInvoiceDetailExcelTemplateLookups()
  const matrix = buildEInvoiceDetailExcelTemplateMatrix(translate, lang, lookups, formKind)
  const worksheet = XLSX.utils.aoa_to_sheet(matrix)
  applyExcelColumnWidthsFromMatrix(worksheet, matrix, [
    EINVOICE_DETAIL_EXCEL_HEADER_ROW_INDEX,
    EINVOICE_DETAIL_EXCEL_SAMPLE_ROW_INDEX,
  ])
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, EINVOICE_DETAIL_EXCEL_SHEET_NAME)

  const arrayBuffer = XLSX.write(workbook, { bookType: "xlsx", type: "array" })
  return new Blob([arrayBuffer], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  })
}

export async function downloadEInvoiceDetailExcelTemplate(
  translate: EInvoiceDetailExcelTranslate,
  lang: string,
  khmsHDON?: string | null,
  fileName?: string,
): Promise<boolean> {
  const formKind = resolveEInvoiceDetailExcelFormKind(khmsHDON)
  const suffix = getEInvoiceDetailExcelTemplateFileSuffix(formKind)
  const resolvedFileName = fileName ?? `EInvoiceDetail_${suffix}_${new Date().toISOString().replace(/[:.-]/g, "")}.xlsx`
  return downloadFile({ fileName: resolvedFileName, load: () => createEInvoiceDetailExcelTemplateBlob(translate, lang, formKind) })
}
