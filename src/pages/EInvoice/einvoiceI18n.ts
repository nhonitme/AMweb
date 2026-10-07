import { einvoiceTranslate, formatEinvoiceText } from "./einvoiceTranslate"

/** Shared translation keys used across EInvoice frontend */
export const EINV_KEY = {
  LOAD_FAILED: "LOAD_FAILED",
  LOADING: "LOADING",
  CANCEL: "CANCEL",
  YES: "YES",
  NO: "NO",
  REQUIRED: "REQUIRED",
  SEARCH: "SEARCH",
  SELECTED: "SELECTED",
  SAVE_SUCCESS: "SAVE_SUCCESS",
  DELETE_SUCCESS: "DELETE_SUCCESS",
  TAX_CD: "TAX_CD",
  MTRACUU: "MTRACUU",
  PRINT: "PRINT",
  PRINT_PDF: "PRINT_PDF",
  PREVIEW_OPEN_FAILED: "PREVIEW_OPEN_FAILED",
  PREVIEW_OPENED_HINT: "PREVIEW_OPENED_HINT",
  PREVIEW_OPENED_CONVERTED_HINT: "PREVIEW_OPENED_CONVERTED_HINT",
  PREVIEW_SINGLE: "PREVIEW_SINGLE",
  XML_PREVIEW_SINGLE: "XML_PREVIEW_SINGLE",
  XML_PREVIEW_TITLE: "XML_PREVIEW_TITLE",
  XML_TITLE: "XML_TITLE",
  XML_EMPTY: "XML_EMPTY",
  PDF_GENERATING: "PDF_GENERATING",
  PDF_EXPORT_FAILED: "PDF_EXPORT_FAILED",
  PDF_OPENED_TAB: "PDF_OPENED_TAB",
  PDF_DOWNLOADED: "PDF_DOWNLOADED",
  BATCH_DOWNLOAD_STARTED: "BATCH_DOWNLOAD_STARTED",
  BATCH_DOWNLOAD_SUCCESS: "BATCH_DOWNLOAD_SUCCESS",
  BATCH_DOWNLOAD_XML_STARTED: "BATCH_DOWNLOAD_XML_STARTED",
  BATCH_DOWNLOAD_XML_SUCCESS: "BATCH_DOWNLOAD_XML_SUCCESS",
  BATCH_DOWNLOAD_ITEM_FAILED: "BATCH_DOWNLOAD_ITEM_FAILED",
  XML_EXPORT_FAILED: "XML_EXPORT_FAILED",
  COMPANY_NOT_SELECTED: "COMPANY_NOT_SELECTED",
  SIGNED_YES: "IS_SIGNED",
  SIGNED_NO: "SIGNED_NO",
  SIGN_XML: "SIGN_XML",
  SIGN_SEND_CQT: "SIGN_SEND_CQT",
  SIGN_FAILED: "SIGN_FAILED",
  SIGN_CONFIRM_BATCH: "SIGN_CONFIRM_BATCH",
  SIGN_SUCCESS_COUNT: "SIGN_SUCCESS_COUNT",
  SIGN_SKIP_COUNT: "SIGN_SKIP_COUNT",
  SIGN_SKIP_SIGNED: "SIGN_SKIP_SIGNED",
  SIGN_SKIP_EMPTY_XML: "SIGN_SKIP_EMPTY_XML",
  SIGN_PARTIAL_SUCCESS: "SIGN_PARTIAL_SUCCESS",
  SIGNED_DELETE_BLOCKED: "SIGNED_DELETE_BLOCKED",
  CERTIFICATE_SELECT: "CERTIFICATE_SELECT",
  PROVIDER_DUPLICATE: "PROVIDER_DUPLICATE",
  PROVIDER_NOT_FOUND: "DECL_PROVIDER_NOT_FOUND",
  PREVIEW_HINT: "PREVIEW_HINT",
  SIGN_RECORD_COUNT: "SIGN_RECORD_COUNT",
  NO_ROWS_SELECTED: "NO_ROWS_SELECTED",
  LOOKUP_TITLE: "LOOKUP_TITLE",
  LOOKUP_NOT_FOUND: "LOOKUP_NOT_FOUND",
  LOOKUP_EMPTY: "LOOKUP_EMPTY",
  NQ204_CHECKBOX: "EINV_NQ204_CHECKBOX",
  NQ204_TTKHAC_LABEL: "EINV_NQ204_TTKHAC_LABEL",
  COMMERCIAL_DISCOUNT_DETAIL_BLOCKS_HEADER: "EINV_COMMERCIAL_DISCOUNT_DETAIL_BLOCKS_HEADER",
} as const

export function einvT(key: string, fallback: string): string {
  return einvoiceTranslate(key, fallback)
}

export function einvPreviewOpenFailed(): string {
  return einvT(EINV_KEY.PREVIEW_OPEN_FAILED, "Unable to open preview")
}

export function einvPdfExportFailed(): string {
  return einvT(EINV_KEY.PDF_EXPORT_FAILED, "Unable to export PDF")
}

export function einvXmlExportFailed(): string {
  return einvT(EINV_KEY.XML_EXPORT_FAILED, "Unable to export XML")
}

export function einvXmlEmpty(): string {
  return einvT(EINV_KEY.XML_EMPTY, "XML is empty")
}

export function einvCompanyNotSelected(): string {
  return einvT(EINV_KEY.COMPANY_NOT_SELECTED, "Company code is not selected")
}

export function einvXmlTitle(id: number | string): string {
  return formatEinvoiceText(einvT(EINV_KEY.XML_TITLE, "XML #{0}"), [id])
}

export function einvPreviewOpenedHint(exportPdfLabel?: string): string {
  const exportLabel = exportPdfLabel ?? einvT(EINV_KEY.PRINT_PDF, "Print PDF")
  return formatEinvoiceText(
    einvT(EINV_KEY.PREVIEW_OPENED_HINT, "Preview opened. Click {0} on preview to export."),
    [exportLabel],
  )
}

export function einvSignedYes(): string {
  return einvT(EINV_KEY.SIGNED_YES, "Signed")
}

export function einvSignedNo(): string {
  return einvT(EINV_KEY.SIGNED_NO, "Not signed")
}

export function fieldRequiredMessage(
  translate: (key: string, fallback: string) => string,
  fieldKey: string,
  fieldFallback: string,
): string {
  return `${translate(fieldKey, fieldFallback)} ${translate(EINV_KEY.REQUIRED, "is required")}`
}

export function einvFieldRequired(fieldKey: string, fieldFallback: string): string {
  return fieldRequiredMessage(einvT, fieldKey, fieldFallback)
}
