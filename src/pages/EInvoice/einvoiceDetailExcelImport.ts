import * as XLSX from "xlsx"

import type { Product } from "@/types/product"
import type { SysCode } from "@/api/sysCodeService"
import type { EInvoiceDetail } from "@/types/einvoice"
import {
  applyEInvoiceDetailSpecialLhhdtrung,
  createDefaultEInvoiceDetail,
  createDefaultEInvoiceDetailSpecial,
  hasEInvoiceDetailSpecialData,
  inferEInvoiceDetailLhhdtrungFromSpecialFields,
  renumberEInvoiceDetails,
  type EInvoiceDetailSpecialFieldValues,
} from "./einvoiceModel"
import {
  buildEInvoiceDetailExcelColumnAliases,
  getEInvoiceDetailExcelColumnByKey,
  getEInvoiceDetailExcelColumnsForForm,
  EINVOICE_DETAIL_EXCEL_SHEET_NAME,
  resolveEInvoiceDetailExcelFormKind,
  type EInvoiceDetailExcelFormKind,
  type EInvoiceDetailExcelTranslate,
} from "./einvoiceDetailExcelColumns"
import {
  isEInvoiceDetailExcelProductExplanationRow,
  isEInvoiceDetailExcelExplanationLabelRow,
  isEInvoiceDetailExcelTchatExplanationValue,
  loadEInvoiceDetailExcelTemplateLookups,
  looksLikeExcelLookupExplanationValue,
} from "./einvoiceDetailExcelTemplateData"
import {
  isEInvoiceDetailExcelRecord,
  normalizeExcelRecord,
  readExcelNullableNumber,
  readExcelNumber,
  readExcelText,
  readExcelWorksheetRows,
  resolveExcelWorksheetName,
  type ExcelCellValue,
} from "./einvoiceExcelImportUtils"

const SPECIAL_GOODS_TCHAT = 5

type EInvoiceDetailStringField = "MHHDVU" | "THHDVU" | "DVTINH" | "TSUAT"
type EInvoiceDetailNumberField = "TCHAT" | "SLUONG" | "DGIA" | "TLCKHAU" | "STCKHAU" | "THTIEN" | "TTHUE" | "TSAUTHUE"
type EInvoiceDetailSpecialField = keyof EInvoiceDetailSpecialFieldValues

const DETAIL_STRING_KEYS = new Set<EInvoiceDetailStringField>(["MHHDVU", "THHDVU", "DVTINH", "TSUAT"])
const DETAIL_NUMBER_KEYS = new Set<EInvoiceDetailNumberField>([
  "TCHAT",
  "SLUONG",
  "DGIA",
  "TLCKHAU",
  "STCKHAU",
  "THTIEN",
  "TTHUE",
  "TSAUTHUE",
])
const DETAIL_SPECIAL_KEYS = new Set<EInvoiceDetailSpecialField>([
  "SKHUNG",
  "SMAY",
  "BKSPT_VCHUYEN",
  "TNG_HANG",
  "DCNG_HANG",
  "MSTNG_HANG",
  "MDDNG_HANG",
])

function buildDetailStringAliases(
  formKind: EInvoiceDetailExcelFormKind,
  translate?: EInvoiceDetailExcelTranslate,
): Array<[EInvoiceDetailStringField, string[]]> {
  return getEInvoiceDetailExcelColumnsForForm(formKind)
    .filter((column) => DETAIL_STRING_KEYS.has(column.key as EInvoiceDetailStringField))
    .map((column) => [column.key as EInvoiceDetailStringField, buildEInvoiceDetailExcelColumnAliases(column, translate)])
}

function buildDetailNumberAliases(
  formKind: EInvoiceDetailExcelFormKind,
  translate?: EInvoiceDetailExcelTranslate,
): Array<[EInvoiceDetailNumberField, string[]]> {
  return getEInvoiceDetailExcelColumnsForForm(formKind)
    .filter((column) => DETAIL_NUMBER_KEYS.has(column.key as EInvoiceDetailNumberField))
    .map((column) => [column.key as EInvoiceDetailNumberField, buildEInvoiceDetailExcelColumnAliases(column, translate)])
}

function buildDetailSpecialStringAliases(
  formKind: EInvoiceDetailExcelFormKind,
  translate?: EInvoiceDetailExcelTranslate,
): Array<[EInvoiceDetailSpecialField, string[]]> {
  return getEInvoiceDetailExcelColumnsForForm(formKind)
    .filter((column) => DETAIL_SPECIAL_KEYS.has(column.key as EInvoiceDetailSpecialField))
    .map((column) => [column.key as EInvoiceDetailSpecialField, buildEInvoiceDetailExcelColumnAliases(column, translate)])
}

function isEInvoiceDetailExcelExplanationRow(
  record: Record<string, ExcelCellValue>,
  products: Product[],
  tchatOptions: SysCode[],
  lang: string,
  formKind: EInvoiceDetailExcelFormKind,
  translate?: EInvoiceDetailExcelTranslate,
): boolean {
  const formColumns = getEInvoiceDetailExcelColumnsForForm(formKind)
  const hasColumn = (key: string) => formColumns.some((column) => column.key === key)

  const mhhdvuColumn = getEInvoiceDetailExcelColumnByKey("MHHDVU")
  const thhdvuColumn = getEInvoiceDetailExcelColumnByKey("THHDVU")
  const tchatColumn = getEInvoiceDetailExcelColumnByKey("TCHAT")
  const tsuatColumn = hasColumn("TSUAT") ? getEInvoiceDetailExcelColumnByKey("TSUAT") : undefined
  const sluongColumn = getEInvoiceDetailExcelColumnByKey("SLUONG")
  const dgiaColumn = getEInvoiceDetailExcelColumnByKey("DGIA")
  const thtienColumn = getEInvoiceDetailExcelColumnByKey("THTIEN")

  const mhhdvu = mhhdvuColumn ? readExcelText(record, buildEInvoiceDetailExcelColumnAliases(mhhdvuColumn, translate)) : ""
  const thhdvu = thhdvuColumn ? readExcelText(record, buildEInvoiceDetailExcelColumnAliases(thhdvuColumn, translate)) : ""
  const tchat = tchatColumn ? readExcelText(record, buildEInvoiceDetailExcelColumnAliases(tchatColumn, translate)) : ""
  const tsuat = tsuatColumn ? readExcelText(record, buildEInvoiceDetailExcelColumnAliases(tsuatColumn, translate)) : ""
  const sluong = sluongColumn ? readExcelText(record, buildEInvoiceDetailExcelColumnAliases(sluongColumn, translate)) : ""
  const dgia = dgiaColumn ? readExcelText(record, buildEInvoiceDetailExcelColumnAliases(dgiaColumn, translate)) : ""
  const thtien = thtienColumn ? readExcelText(record, buildEInvoiceDetailExcelColumnAliases(thtienColumn, translate)) : ""

  if (sluong || dgia || thtien) {
    return false
  }

  if (isEInvoiceDetailExcelExplanationLabelRow(mhhdvu, thhdvu, translate)) {
    return true
  }

  if (isEInvoiceDetailExcelProductExplanationRow(mhhdvu, thhdvu, products, lang)) {
    return true
  }

  if (isEInvoiceDetailExcelTchatExplanationValue(tchat, tchatOptions)) {
    return true
  }

  return tsuatColumn ? looksLikeExcelLookupExplanationValue(tsuat) : false
}

function readSpecialFieldValues(
  record: Record<string, ExcelCellValue>,
  detailSpecialStringAliases: Array<[EInvoiceDetailSpecialField, string[]]>,
): EInvoiceDetailSpecialFieldValues {
  const values = {} as EInvoiceDetailSpecialFieldValues

  for (const [field, aliases] of detailSpecialStringAliases) {
    values[field] = readExcelText(record, aliases)
  }

  return values
}

function resolveLhhdtrungForImport(
  specialFieldValues: EInvoiceDetailSpecialFieldValues,
  record: Record<string, ExcelCellValue>,
  translate?: EInvoiceDetailExcelTranslate,
): number {
  const inferred = inferEInvoiceDetailLhhdtrungFromSpecialFields(specialFieldValues)
  if (inferred >= 1 && inferred <= 3) {
    return inferred
  }

  const lhhdtrungColumn = getEInvoiceDetailExcelColumnByKey("LHHDTRUNG")
  const explicitLhhdtrung = readExcelNumber(
    record,
    lhhdtrungColumn ? buildEInvoiceDetailExcelColumnAliases(lhhdtrungColumn, translate) : ["LHHDTRUNG"],
    0,
  )

  return explicitLhhdtrung >= 1 && explicitLhhdtrung <= 3 ? explicitLhhdtrung : 0
}

function createDetailFromRecord(
  record: Record<string, ExcelCellValue>,
  index: number,
  invoiceId: number,
  companyCd: string,
  rate: number,
  currencyCode: string,
  formKind: EInvoiceDetailExcelFormKind,
  translate?: EInvoiceDetailExcelTranslate,
): EInvoiceDetail {
  const detailStringAliases = buildDetailStringAliases(formKind, translate)
  const detailNumberAliases = buildDetailNumberAliases(formKind, translate)
  const detailSpecialStringAliases = buildDetailSpecialStringAliases(formKind, translate)
  const specialFieldValues = readSpecialFieldValues(record, detailSpecialStringAliases)
  const lhhdtrung = resolveLhhdtrungForImport(specialFieldValues, record, translate)
  const detail = createDefaultEInvoiceDetail(index + 1, invoiceId, companyCd)

  for (const [field, aliases] of detailStringAliases) {
    const value = readExcelText(record, aliases)
    if (value) {
      detail[field] = value
    }
  }

  for (const [field, aliases] of detailNumberAliases) {
    const value = readExcelNullableNumber(record, aliases)
    if (value !== null) {
      detail[field] = value
    }
  }

  if (lhhdtrung >= 1 && lhhdtrung <= 3) {
    detail.TCHAT = SPECIAL_GOODS_TCHAT

    let special = applyEInvoiceDetailSpecialLhhdtrung(
      createDefaultEInvoiceDetailSpecial(invoiceId, 0, companyCd),
      lhhdtrung,
    )

    for (const [field, aliases] of detailSpecialStringAliases) {
      const value = readExcelText(record, aliases)
      if (value) {
        special[field] = value
      }
    }

    detail.SPECIAL = hasEInvoiceDetailSpecialData(special) ? special : null
  }

  return renumberEInvoiceDetails([detail], rate, currencyCode)[0]
}

export async function parseEInvoiceDetailExcelFile(
  file: File,
  invoiceId: number,
  companyCd: string,
  rate: number,
  currencyCode: string,
  sheetName?: string,
  translate?: EInvoiceDetailExcelTranslate,
  lang?: string,
  khmsHDON?: string | null,
): Promise<EInvoiceDetail[]> {
  const buffer = await file.arrayBuffer()
  const workbook = XLSX.read(buffer, { type: "array", cellDates: true })
  const resolvedSheetName = resolveExcelWorksheetName(workbook, sheetName, [EINVOICE_DETAIL_EXCEL_SHEET_NAME, "DETAILS", "CHI_TIET", "CHITIET", "DONG_HANG"])
  const rows = readExcelWorksheetRows(workbook.Sheets[resolvedSheetName])
  const { products, tchatOptions } = await loadEInvoiceDetailExcelTemplateLookups()
  const resolvedLang = lang ?? "vi"
  const formKind = resolveEInvoiceDetailExcelFormKind(khmsHDON)

  return rows
    .map(normalizeExcelRecord)
    .filter((record) => !isEInvoiceDetailExcelExplanationRow(record, products, tchatOptions, resolvedLang, formKind, translate))
    .filter(isEInvoiceDetailExcelRecord)
    .map((record, index) => createDetailFromRecord(record, index, invoiceId, companyCd, rate, currencyCode, formKind, translate))
}

export function isBlankEInvoiceDetail(detail: EInvoiceDetail): boolean {
  const special = detail.SPECIAL
  const specialTextEmpty = !special
    || [
      special.SKHUNG,
      special.SMAY,
      special.BKSPT_VCHUYEN,
      special.TNG_HANG,
      special.DCNG_HANG,
      special.MSTNG_HANG,
      special.MDDNG_HANG,
    ].every((value) => String(value ?? "").trim().length === 0)
  const textEmpty = [detail.MHHDVU, detail.THHDVU, detail.DVTINH, detail.TSUAT]
    .every((value) => String(value ?? "").trim().length === 0) && specialTextEmpty
  const amountEmpty =
    Number(detail.DGIA ?? 0) === 0 &&
    Number(detail.STCKHAU ?? 0) === 0 &&
    Number(detail.THTIEN ?? 0) === 0 &&
    Number(detail.TTHUE ?? 0) === 0 &&
    Number(detail.TSAUTHUE ?? 0) === 0 &&
    Number(detail.TLCKHAU ?? 0) === 0

  return textEmpty && amountEmpty
}
