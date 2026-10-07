import { fetchProductLookup } from "@/api/lookupApi"
import type { SysCode } from "@/api/sysCodeService"
import { firstLookupText } from "@/components/lookup/lookupHelpers"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import type { Product } from "@/types/product"
import {
  getEInvoiceDetailExcelColumnsForForm,
  type EInvoiceDetailExcelColumn,
  type EInvoiceDetailExcelFormKind,
  type EInvoiceDetailExcelTranslate,
} from "./einvoiceDetailExcelColumns"

export const EINVOICE_DETAIL_EXCEL_EXPLANATION_MAX_ROWS = 50

/** Excel row 1 (index 0) */
export const EINVOICE_DETAIL_EXCEL_HEADER_ROW_INDEX = 0

/** Excel row 2 (index 1) */
export const EINVOICE_DETAIL_EXCEL_SAMPLE_ROW_INDEX = 1

/** Excel row 4 (index 3) */
export const EINVOICE_DETAIL_EXCEL_EXPLANATION_LABEL_ROW_INDEX = 3

/** Excel row 5+ (index 4+) */
export const EINVOICE_DETAIL_EXCEL_EXPLANATION_START_ROW_INDEX = 4

export const EINVOICE_DETAIL_EXCEL_EXPLANATION_LABEL_KEY = "DETAIL_EXCEL_EXPLANATION_LABEL"

export const EINVOICE_DETAIL_EXCEL_EXPLANATION_LABEL_FALLBACK =
  "Giai thich du lieu (danh sach gia tri tham khao tu dong 5)"

export type EInvoiceDetailExcelExplanationLookup = "productCode" | "productName" | "vat" | "tchat"

export type EInvoiceDetailExcelTemplateLookups = {
  products: Product[]
  vatRates: SysCode[]
  tchatOptions: SysCode[]
}

function getTemplateColumns(formKind: EInvoiceDetailExcelFormKind = "default"): EInvoiceDetailExcelColumn[] {
  return getEInvoiceDetailExcelColumnsForForm(formKind)
}

function getLocalizedProductName(product: Product, lang: string): string {
  const normalizedLang = lang.trim().toUpperCase()

  if (normalizedLang === "ENG") {
    return firstLookupText(product.PRODUCT_NM_ENG, product.PRODUCT_NM_VIET, product.PRODUCT_CD)
  }

  if (normalizedLang === "KOR") {
    return firstLookupText(product.PRODUCT_NM_KOR, product.PRODUCT_NM_VIET, product.PRODUCT_CD)
  }

  if (normalizedLang === "CHN" || normalizedLang === "CHINA") {
    return firstLookupText(product.PRODUCT_NM_CHINA, product.PRODUCT_NM_VIET, product.PRODUCT_CD)
  }

  return firstLookupText(product.PRODUCT_NM_VIET, product.PRODUCT_CD)
}

export function buildProductCodeExplanationLines(products: Product[]): string[] {
  const lines: string[] = []

  for (const product of products) {
    const code = String(product.PRODUCT_CD ?? "").trim()
    if (!code) {
      continue
    }

    lines.push(code)
    if (lines.length >= EINVOICE_DETAIL_EXCEL_EXPLANATION_MAX_ROWS) {
      break
    }
  }

  return lines
}

export function buildProductNameExplanationLines(products: Product[], lang: string): string[] {
  const lines: string[] = []

  for (const product of products) {
    const code = String(product.PRODUCT_CD ?? "").trim()
    if (!code) {
      continue
    }

    const name = getLocalizedProductName(product, lang)
    if (!name) {
      continue
    }

    lines.push(name)
    if (lines.length >= EINVOICE_DETAIL_EXCEL_EXPLANATION_MAX_ROWS) {
      break
    }
  }

  return lines
}

function buildSysCodeExplanationLines(items: SysCode[], translate: EInvoiceDetailExcelTranslate): string[] {
  const lines: string[] = []

  for (const item of items) {
    const code = String(item.CODE_CD ?? "").trim()
    if (!code) {
      continue
    }

    const fallback = String(item.CODE_NAME ?? code).trim()
    const name = translate(fallback, fallback)
    lines.push(name ? `${code} - ${name}` : code)
    if (lines.length >= EINVOICE_DETAIL_EXCEL_EXPLANATION_MAX_ROWS) {
      break
    }
  }

  return lines
}

export function buildVatExplanationLines(vatRates: SysCode[], translate: EInvoiceDetailExcelTranslate): string[] {
  return buildSysCodeExplanationLines(vatRates, translate)
}

export function buildTchatExplanationLines(tchatOptions: SysCode[], translate: EInvoiceDetailExcelTranslate): string[] {
  return buildSysCodeExplanationLines(tchatOptions, translate)
}

export async function loadEInvoiceDetailExcelTemplateLookups(): Promise<EInvoiceDetailExcelTemplateLookups> {
  const [products, vatRates, tchatOptions] = await Promise.all([
    fetchProductLookup(),
    getCachedSysCodes("VAT_RATE"),
    getCachedSysCodes("EINV_TCHAT"),
  ])
  return { products, vatRates, tchatOptions }
}

export function buildEInvoiceDetailExcelExplanationLabel(
  translate: EInvoiceDetailExcelTranslate,
): string {
  return translate(
    EINVOICE_DETAIL_EXCEL_EXPLANATION_LABEL_KEY,
    EINVOICE_DETAIL_EXCEL_EXPLANATION_LABEL_FALLBACK,
  )
}

export function buildEInvoiceDetailExcelSampleRowValues(
  translate: EInvoiceDetailExcelTranslate,
  lang: string,
  lookups: EInvoiceDetailExcelTemplateLookups,
  formKind: EInvoiceDetailExcelFormKind = "default",
): string[] {
  const firstProduct = lookups.products.find((item) => String(item.PRODUCT_CD ?? "").trim())
  const productCode = firstProduct ? String(firstProduct.PRODUCT_CD).trim() : "VD001"
  const productName = firstProduct
    ? getLocalizedProductName(firstProduct, lang)
    : translate("DETAIL_EXCEL_SAMPLE_ITEM_NAME", "Hang hoa dich vu mau")
  const firstTchat = lookups.tchatOptions.find((item) => String(item.CODE_CD ?? "").trim())
  const firstVat = lookups.vatRates.find((item) => String(item.CODE_CD ?? "").trim())

  const valuesByKey: Record<string, string> = {
    MHHDVU: productCode,
    THHDVU: productName,
    DVTINH: translate("DETAIL_EXCEL_SAMPLE_UNIT", "Cai"),
    TCHAT: firstTchat ? String(firstTchat.CODE_CD).trim() : "1",
    SLUONG: "1",
    DGIA: "100000",
    TLCKHAU: "0",
    STCKHAU: "0",
    THTIEN: "100000",
    TSUAT: firstVat ? String(firstVat.CODE_CD).trim() : "10",
    TTHUE: "10000",
    TSAUTHUE: "110000",
  }

  return getTemplateColumns(formKind).map((column) => valuesByKey[column.key] ?? "")
}

export function isEInvoiceDetailExcelExplanationLabelRow(
  mhhdvu: string,
  thhdvu: string,
  translate?: EInvoiceDetailExcelTranslate,
): boolean {
  const label = (translate
    ? buildEInvoiceDetailExcelExplanationLabel(translate)
    : EINVOICE_DETAIL_EXCEL_EXPLANATION_LABEL_FALLBACK
  ).trim()

  if (!label) {
    return false
  }

  const normalizedLabel = label.toLowerCase()
  const candidates = [mhhdvu.trim(), thhdvu.trim()].filter(Boolean).map((value) => value.toLowerCase())

  return candidates.some(
    (value) => value === normalizedLabel || value.startsWith("giai thich du lieu") || value.startsWith("giải thích dữ liệu"),
  )
}

export function buildEInvoiceDetailExcelExplanationLinesByColumn(
  translate: EInvoiceDetailExcelTranslate,
  lang: string,
  lookups: EInvoiceDetailExcelTemplateLookups,
  formKind: EInvoiceDetailExcelFormKind = "default",
): string[][] {
  const productCodeLines = buildProductCodeExplanationLines(lookups.products)
  const productNameLines = buildProductNameExplanationLines(lookups.products, lang)
  const vatLines = buildVatExplanationLines(lookups.vatRates, translate)
  const tchatLines = buildTchatExplanationLines(lookups.tchatOptions, translate)

  return getTemplateColumns(formKind).map((column) => {
    if (column.explanationLookup === "productCode") {
      return productCodeLines
    }

    if (column.explanationLookup === "productName") {
      return productNameLines
    }

    if (column.explanationLookup === "vat") {
      return vatLines
    }

    if (column.explanationLookup === "tchat") {
      return tchatLines
    }

    return []
  })
}

export function buildEInvoiceDetailExcelTemplateMatrix(
  translate: EInvoiceDetailExcelTranslate,
  lang: string,
  lookups: EInvoiceDetailExcelTemplateLookups,
  formKind: EInvoiceDetailExcelFormKind = "default",
): string[][] {
  const templateColumns = getTemplateColumns(formKind)
  const headers = templateColumns.map((column) => {
    const label = translate(column.key, column.fallback)
    return column.required ? `${label} (*)` : label
  })
  const sampleRowValues = buildEInvoiceDetailExcelSampleRowValues(translate, lang, lookups, formKind)
  const explanationLabel = buildEInvoiceDetailExcelExplanationLabel(translate)
  const explanationsByColumn = buildEInvoiceDetailExcelExplanationLinesByColumn(translate, lang, lookups, formKind)
  const maxExplanationRows = Math.max(0, ...explanationsByColumn.map((lines) => lines.length))
  const minRows = EINVOICE_DETAIL_EXCEL_EXPLANATION_START_ROW_INDEX + 1
  const totalRows = Math.max(minRows, EINVOICE_DETAIL_EXCEL_EXPLANATION_START_ROW_INDEX + maxExplanationRows)
  const matrix: string[][] = []

  for (let rowIndex = 0; rowIndex < totalRows; rowIndex += 1) {
    matrix.push(
      templateColumns.map((_, columnIndex) => {
        if (rowIndex === EINVOICE_DETAIL_EXCEL_HEADER_ROW_INDEX) {
          return headers[columnIndex] ?? ""
        }

        if (rowIndex === EINVOICE_DETAIL_EXCEL_SAMPLE_ROW_INDEX) {
          return sampleRowValues[columnIndex] ?? ""
        }

        if (rowIndex === EINVOICE_DETAIL_EXCEL_EXPLANATION_LABEL_ROW_INDEX) {
          return columnIndex === 0 ? explanationLabel : ""
        }

        if (rowIndex < EINVOICE_DETAIL_EXCEL_EXPLANATION_START_ROW_INDEX) {
          return ""
        }

        const explanationIndex = rowIndex - EINVOICE_DETAIL_EXCEL_EXPLANATION_START_ROW_INDEX
        return explanationsByColumn[columnIndex]?.[explanationIndex] ?? ""
      }),
    )
  }

  return matrix
}

export function getLocalizedProductDisplayName(product: Product, lang: string): string {
  return getLocalizedProductName(product, lang)
}

export function isEInvoiceDetailExcelProductExplanationRow(
  mhhdvu: string,
  thhdvu: string,
  products: Product[],
  lang: string,
): boolean {
  const code = mhhdvu.trim()
  const name = thhdvu.trim()
  if (!code && !name) {
    return false
  }

  const productByCode = code
    ? products.find((item) => String(item.PRODUCT_CD ?? "").trim().toUpperCase() === code.toUpperCase())
    : undefined

  if (code && name) {
    return Boolean(productByCode && getLocalizedProductName(productByCode, lang) === name)
  }

  if (code) {
    return Boolean(productByCode)
  }

  return products.some((item) => getLocalizedProductName(item, lang) === name)
}

export function isEInvoiceDetailExcelTchatExplanationValue(tchat: string, tchatOptions: SysCode[]): boolean {
  const text = tchat.trim()
  if (!text || /^\d+$/.test(text)) {
    return false
  }

  if (!looksLikeExcelLookupExplanationValue(text)) {
    return false
  }

  const code = text.slice(0, text.indexOf(" - ")).trim()
  return tchatOptions.some((item) => String(item.CODE_CD ?? "").trim() === code)
}

export function looksLikeExcelLookupExplanationValue(value: string): boolean {
  const text = value.trim()
  if (!text.includes(" - ")) {
    return false
  }

  const separatorIndex = text.indexOf(" - ")
  return separatorIndex > 0 && text.slice(separatorIndex + 3).trim().length > 0
}
