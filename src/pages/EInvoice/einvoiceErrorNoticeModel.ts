import type { EInvoiceErrorNotice, EInvoiceErrorNoticeApi, EInvoiceErrorNoticeDetail, EInvoiceErrorNoticeDetailApi } from "@/types/einvoiceErrorNotice"
import type { EInvoice } from "@/types/einvoice"
import type { CompanyInfo } from "@/types/companyInfo"
import type { SysCode } from "@/api/sysCodeService"
import {
  buildEInvoiceNumericSysCodeOptions,
  formatEInvoiceNumericSysCodeText,
  type EInvoiceNumericSysCodeOption,
} from "./einvoiceSysCodeOptions"
import { EINV_SIGN_STATUS_CODE_TYPE } from "./einvoiceAdvancedSearch"
import {
  buildEInvoiceMailStatusOptions,
  EINV_MAIL_STATUS_CODE_TYPE,
  type EInvoiceMailStatusOption,
} from "./einvoiceModel"

export const EINV_TBAO_LOAI_CODE_TYPE = "EINV_TBAO_LOAI"
export const EINV_LADHDDT_CODE_TYPE = "EINV_LADHDDT"

export type TbaoLoaiOption = {
  value: number
  text: string
}

export type EinvoiceKindOption = EInvoiceNumericSysCodeOption
export type ErrorNoticeSignStatusOption = EInvoiceNumericSysCodeOption
export type ErrorNoticeMailStatusOption = EInvoiceMailStatusOption

export { EINV_MAIL_STATUS_CODE_TYPE, EINV_SIGN_STATUS_CODE_TYPE, buildEInvoiceMailStatusOptions }

type SysCodeTranslate = (key: string, fallback: string) => string

const trimText = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "")

export function buildErrorNoticeSignStatusOptions(
  codes: SysCode[],
  translate: SysCodeTranslate,
): ErrorNoticeSignStatusOption[] {
  return buildEInvoiceNumericSysCodeOptions(codes, translate, (value) => value === 0 || value === 1)
}

export function buildTbaoLoaiOptions(codes: SysCode[], translate: SysCodeTranslate): TbaoLoaiOption[] {
  return codes
    .filter((code) => Number(code.IS_ACTIVE ?? 0) === 1 && String(code.ISDEL ?? "0") !== "1")
    .sort((left, right) => Number(left.SORT_ORDER ?? 0) - Number(right.SORT_ORDER ?? 0))
    .map((code) => {
      const value = Number(code.CODE_CD)
      const langKey = trimText(code.CODE_NAME)
      return {
        value,
        text: langKey ? translate(langKey, langKey) : String(code.CODE_CD),
      }
    })
    .filter((option) => Number.isFinite(option.value) && option.value > 0)
}

export function buildEinvoiceKindOptions(codes: SysCode[], translate: SysCodeTranslate): EinvoiceKindOption[] {
  return buildEInvoiceNumericSysCodeOptions(codes, translate, (value) => value >= 1 && value <= 5)
}

const nullableText = (value: string | null | undefined): string | null => {
  const text = trimText(value)
  return text.length > 0 ? text : null
}

const toNumber = (value: number | string | null | undefined, fallback = 0): number => {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value
  }

  if (typeof value === "string" && value.trim().length > 0) {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : fallback
  }

  return fallback
}

const toDateText = (value: string | Date | null | undefined): string => {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = `${value.getMonth() + 1}`.padStart(2, "0")
    const day = `${value.getDate()}`.padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const text = trimText(value)
  return text.length > 0 ? text.slice(0, 10) : ""
}

const buildRowKey = (): string => `einv-tbao-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`

export function formatDateForApi(value: Date | null): string | undefined {
  const text = toDateText(value)
  return text || undefined
}

export function parseErrorNoticeDate(value: string | Date | null | undefined): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const text = toDateText(value)
  if (!text) {
    return null
  }

  const date = new Date(`${text}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function createErrorNoticeToday(): string {
  return toDateText(new Date())
}

export function isErrorNoticeSigned(record: Pick<EInvoiceErrorNotice, "IS_SIGNED"> | null | undefined): boolean {
  return toNumber(record?.IS_SIGNED, 0) === 1
}

export function isErrorNoticeReadyToSendMail(
  record: Pick<EInvoiceErrorNotice, "IS_SIGNED"> | null | undefined,
): boolean {
  return isErrorNoticeSigned(record)
}

export function formatErrorNoticeDisplayNo(
  record: Pick<EInvoiceErrorNotice, "SO" | "MSO" | "TBAO_ID"> | null | undefined,
): string {
  const so = trimText(record?.SO)
  if (so) {
    return so
  }

  const mso = trimText(record?.MSO)
  const tbaoId = toNumber(record?.TBAO_ID, 0)
  if (mso && tbaoId > 0) {
    return `${mso}#${tbaoId}`
  }

  return tbaoId > 0 ? `#${tbaoId}` : ""
}

export function formatErrorNoticeMailStatusText(
  isMail: number | null | undefined,
  options: ErrorNoticeMailStatusOption[],
): string {
  return formatEInvoiceNumericSysCodeText(toNumber(isMail, 0), options, String(toNumber(isMail, 0)))
}

export function formatErrorNoticeSignedLabel(
  record: Pick<EInvoiceErrorNotice, "IS_SIGNED"> | null | undefined,
  options: ErrorNoticeSignStatusOption[],
): string {
  return formatEInvoiceNumericSysCodeText(isErrorNoticeSigned(record) ? 1 : 0, options, isErrorNoticeSigned(record) ? "1" : "0")
}

export function formatErrorNoticeHeaderSummaryText(
  record: Pick<EInvoiceErrorNotice, "MSO" | "TEN" | "LOAI"> | null | undefined,
  loaiLabel = "",
): string {
  if (!record) {
    return ""
  }

  const lines = [trimText(record.MSO), trimText(record.TEN)]
  const loaiText = trimText(loaiLabel)
  if (loaiText) {
    lines.push(loaiText)
  }

  return lines.filter((line) => line.length > 0).join("\n")
}

export function formatErrorNoticeTaxpayerSummaryText(
  record: Pick<EInvoiceErrorNotice, "TNNT" | "MST" | "DDANH"> | null | undefined,
): string {
  if (!record) {
    return ""
  }

  return [trimText(record.TNNT), trimText(record.MST), trimText(record.DDANH)].filter((line) => line.length > 0).join("\n")
}

export function formatErrorNoticeTaxOfficeSummaryText(
  record: Pick<EInvoiceErrorNotice, "MCQT" | "TCQT" | "SO" | "NTBCCQT"> | null | undefined,
): string {
  if (!record) {
    return ""
  }

  return [trimText(record.MCQT), trimText(record.TCQT), trimText(record.SO), trimText(record.NTBCCQT)].filter((line) => line.length > 0).join("\n")
}

export function formatErrorNoticeStatusSummary(
  record: Pick<EInvoiceErrorNotice, "IS_SIGNED" | "IS_MAIL" | "ERROR_MESSAGE" | "MGDDTU"> | null | undefined,
  signStatusOptions: ErrorNoticeSignStatusOption[],
  mailStatusOptions: ErrorNoticeMailStatusOption[],
): string {
  if (!record) {
    return ""
  }

  const lines = [formatErrorNoticeSignedLabel(record, signStatusOptions)]
  lines.push(formatErrorNoticeMailStatusText(record.IS_MAIL, mailStatusOptions))
  const messageCode = trimText(record.MGDDTU)
  if (messageCode) {
    lines.push(messageCode)
  }

  const errorMessage = trimText(record.ERROR_MESSAGE)
  if (errorMessage) {
    lines.push(errorMessage)
  }

  return lines.join("\n")
}

export function createDefaultErrorNoticeDetail(index: number, tbaoId = 0, companyCd = ""): EInvoiceErrorNoticeDetail {
  return {
    ROW_KEY: buildRowKey(),
    SOURCE_INVOICE_ID: 0,
    DETAIL_ID: 0,
    TBAO_ID: tbaoId,
    COMPANY_CD: companyCd,
    STT: index,
    MCCQT: "",
    KHMSHDON: "",
    KHHDON: "",
    SHDON: "",
    NGAY: createErrorNoticeToday(),
    LADHDDT: 1,
    LDO: "",
    CREATE_BY: "",
    CREATE_AT: "",
    UPDATE_BY: "",
    UPDATE_AT: "",
    ISDEL: 0,
  }
}

export function createDefaultErrorNotice(companyCd: string): EInvoiceErrorNotice {
  return {
    TBAO_ID: 0,
    COMPANY_CD: companyCd,
    PBAN: "",
    MSO: "",
    TEN: "",
    LOAI: 1,
    MCQT: "",
    TCQT: "",
    SO: "",
    NTBCCQT: "",
    MST: "",
    TNNT: "",
    DDANH: "",
    NTBAO: createErrorNoticeToday(),
    XML: "",
    IS_SIGNED: 0,
    IS_MAIL: 0,
    MGDDTU: "",
    MTDIEP: "",
    ERROR_MESSAGE: "",
    CREATE_BY: "",
    CREATE_AT: "",
    UPDATE_BY: "",
    UPDATE_AT: "",
    ISDEL: 0,
    DETAILS: [createDefaultErrorNoticeDetail(1, 0, companyCd)],
  }
}

function buildErrorNoticePlaceFromCompanyInfo(companyInfo: CompanyInfo): string {
  return [trimText(companyInfo.SIDO), trimText(companyInfo.GUMYUN)].filter((value) => value.length > 0).join(", ")
}

export function applyCompanyInfoToErrorNotice(
  notice: EInvoiceErrorNotice,
  companyInfo: CompanyInfo | null | undefined,
): EInvoiceErrorNotice {
  if (!companyInfo) {
    return notice
  }

  const place = buildErrorNoticePlaceFromCompanyInfo(companyInfo)

  return {
    ...notice,
    TNNT: trimText(companyInfo.COMPANY_NM) || notice.TNNT,
    MST: trimText(companyInfo.TAX_CD) || notice.MST,
    MCQT: trimText(companyInfo.MCQTQLy) || notice.MCQT,
    TCQT: trimText(companyInfo.TCQTQLy) || notice.TCQT,
    DDANH: place || notice.DDANH,
  }
}

export function createDefaultErrorNoticeWithCompanyInfo(
  companyCd: string,
  companyInfo?: CompanyInfo | null,
): EInvoiceErrorNotice {
  return applyCompanyInfoToErrorNotice(createDefaultErrorNotice(companyCd), companyInfo)
}

export function normalizeErrorNoticeDetail(record: EInvoiceErrorNoticeDetailApi, index: number, companyCd: string, tbaoId = 0): EInvoiceErrorNoticeDetail {
  return {
    ROW_KEY: buildRowKey(),
    SOURCE_INVOICE_ID: 0,
    DETAIL_ID: toNumber(record.DETAIL_ID, 0),
    TBAO_ID: toNumber(record.TBAO_ID, tbaoId),
    COMPANY_CD: trimText(record.COMPANY_CD) || companyCd,
    STT: toNumber(record.STT, index + 1),
    MCCQT: trimText(record.MCCQT),
    KHMSHDON: trimText(record.KHMSHDON),
    KHHDON: trimText(record.KHHDON),
    SHDON: trimText(record.SHDON),
    NGAY: toDateText(record.NGAY),
    LADHDDT: toNumber(record.LADHDDT, 1),
    LDO: trimText(record.LDO),
    CREATE_BY: trimText(record.CREATE_BY),
    CREATE_AT: trimText(record.CREATE_AT),
    UPDATE_BY: trimText(record.UPDATE_BY),
    UPDATE_AT: trimText(record.UPDATE_AT),
    ISDEL: toNumber(record.ISDEL, 0),
  }
}

export function createErrorNoticeDetailFromInvoice(invoice: EInvoice, index: number, tbaoId = 0, companyCd = ""): EInvoiceErrorNoticeDetail {
  return {
    ...createDefaultErrorNoticeDetail(index, tbaoId, companyCd),
    SOURCE_INVOICE_ID: toNumber(invoice.INVOICE_ID, 0),
    MCCQT: trimText(invoice.MCCQT),
    KHMSHDON: trimText(invoice.KHMSHDON),
    KHHDON: trimText(invoice.KHHDON),
    SHDON: trimText(invoice.SHDON),
    NGAY: toDateText(invoice.NLAP),
    LADHDDT: 1,
  }
}

export function normalizeErrorNotice(record: EInvoiceErrorNoticeApi, companyCd: string): EInvoiceErrorNotice {
  const tbaoId = toNumber(record.TBAO_ID, 0)
  const details = Array.isArray(record.DETAILS)
    ? record.DETAILS.map((detail, index) => normalizeErrorNoticeDetail(detail, index, companyCd, tbaoId))
    : []

  return {
    ...createDefaultErrorNotice(companyCd),
    ...record,
    TBAO_ID: tbaoId,
    COMPANY_CD: trimText(record.COMPANY_CD) || companyCd,
    PBAN: trimText(record.PBAN),
    MSO: trimText(record.MSO),
    TEN: trimText(record.TEN),
    LOAI: toNumber(record.LOAI, 1),
    MCQT: trimText(record.MCQT),
    TCQT: trimText(record.TCQT),
    SO: trimText(record.SO),
    NTBCCQT: toDateText(record.NTBCCQT),
    MST: trimText(record.MST),
    TNNT: trimText(record.TNNT),
    DDANH: trimText(record.DDANH),
    NTBAO: toDateText(record.NTBAO) || null,
    XML: trimText(record.XML),
    IS_SIGNED: toNumber(record.IS_SIGNED, 0) === 1 ? 1 : 0,
    IS_MAIL: toNumber(record.IS_MAIL, 0) === 1 ? 1 : 0,
    MGDDTU: trimText(record.MGDDTU),
    MTDIEP: trimText(record.MTDIEP),
    ERROR_MESSAGE: trimText(record.ERROR_MESSAGE),
    CREATE_BY: trimText(record.CREATE_BY),
    CREATE_AT: trimText(record.CREATE_AT),
    UPDATE_BY: trimText(record.UPDATE_BY),
    UPDATE_AT: trimText(record.UPDATE_AT),
    ISDEL: toNumber(record.ISDEL, 0),
    DETAILS: details.length > 0 ? details : [createDefaultErrorNoticeDetail(1, tbaoId, companyCd)],
  }
}

export function normalizeErrorNoticeRows(records: EInvoiceErrorNoticeApi[], companyCd: string): EInvoiceErrorNotice[] {
  return records.map((record) => normalizeErrorNotice(record, companyCd))
}

export function getActiveErrorNoticeDetails(details: EInvoiceErrorNoticeDetail[]): EInvoiceErrorNoticeDetail[] {
  return details.filter((detail) => detail.ISDEL !== 1)
}

export function renumberErrorNoticeDetails(details: EInvoiceErrorNoticeDetail[]): EInvoiceErrorNoticeDetail[] {
  let activeIndex = 0
  return details.map((detail) => {
    if (detail.ISDEL === 1) {
      return { ...detail }
    }

    activeIndex += 1
    return {
      ...detail,
      STT: activeIndex,
      MCCQT: trimText(detail.MCCQT),
      KHMSHDON: trimText(detail.KHMSHDON),
      KHHDON: trimText(detail.KHHDON),
      SHDON: trimText(detail.SHDON),
      NGAY: toDateText(detail.NGAY),
      LADHDDT: toNumber(detail.LADHDDT, 1),
      LDO: trimText(detail.LDO),
    }
  })
}

export function normalizeErrorNoticeDetailPatch(patch: Partial<EInvoiceErrorNoticeDetail>): Partial<EInvoiceErrorNoticeDetail> {
  const nextPatch: Partial<EInvoiceErrorNoticeDetail> = { ...patch }
  const rawPatch = patch as Record<string, unknown>

  if ("NGAY" in rawPatch) {
    nextPatch.NGAY = toDateText(rawPatch.NGAY as string | Date | null | undefined)
  }

  if ("STT" in rawPatch) {
    nextPatch.STT = toNumber(rawPatch.STT as number | string | null | undefined, 0)
  }

  if ("LADHDDT" in rawPatch) {
    nextPatch.LADHDDT = toNumber(rawPatch.LADHDDT as number | string | null | undefined, 1)
  }

  return nextPatch
}

export function mapErrorNoticeToApiPayload(record: EInvoiceErrorNotice): EInvoiceErrorNoticeApi {
  const details = renumberErrorNoticeDetails(record.DETAILS)
    .filter((detail) => detail.ISDEL !== 1)
    .map<EInvoiceErrorNoticeDetailApi>((detail) => ({
      DETAIL_ID: detail.DETAIL_ID,
      TBAO_ID: record.TBAO_ID,
      COMPANY_CD: record.COMPANY_CD,
      STT: detail.STT,
      MCCQT: nullableText(detail.MCCQT),
      KHMSHDON: nullableText(detail.KHMSHDON),
      KHHDON: nullableText(detail.KHHDON),
      SHDON: nullableText(detail.SHDON),
      NGAY: toDateText(detail.NGAY),
      LADHDDT: toNumber(detail.LADHDDT, 1),
      LDO: nullableText(detail.LDO),
      ISDEL: 0,
    }))

  return {
    TBAO_ID: record.TBAO_ID,
    COMPANY_CD: record.COMPANY_CD,
    LOAI: toNumber(record.LOAI, 1),
    MCQT: trimText(record.MCQT),
    TCQT: trimText(record.TCQT),
    SO: nullableText(record.SO),
    NTBCCQT: toDateText(record.NTBCCQT) || null,
    MST: nullableText(record.MST),
    TNNT: trimText(record.TNNT),
    DDANH: trimText(record.DDANH),
    NTBAO: toDateText(record.NTBAO) || null,
    IS_SIGNED: 0,
    ERROR_MESSAGE: nullableText(record.ERROR_MESSAGE),
    ISDEL: 0,
    DETAILS: details,
  }
}

export function createErrorNoticeCopy(source: EInvoiceErrorNotice, companyCd: string): EInvoiceErrorNotice {
  const copy = normalizeErrorNotice(source, companyCd)

  copy.TBAO_ID = 0
  copy.COMPANY_CD = companyCd
  copy.XML = ""
  copy.IS_SIGNED = 0
  copy.IS_MAIL = 0
  copy.MGDDTU = ""
  copy.MTDIEP = ""
  copy.ERROR_MESSAGE = ""
  copy.CREATE_BY = ""
  copy.CREATE_AT = ""
  copy.UPDATE_BY = ""
  copy.UPDATE_AT = ""
  copy.NTBAO = createErrorNoticeToday()
  copy.DETAILS = renumberErrorNoticeDetails(copy.DETAILS.map((detail) => ({
    ...detail,
    ROW_KEY: buildRowKey(),
    DETAIL_ID: 0,
    TBAO_ID: 0,
    COMPANY_CD: companyCd,
    CREATE_BY: "",
    CREATE_AT: "",
    UPDATE_BY: "",
    UPDATE_AT: "",
    ISDEL: 0,
  })))

  return copy
}
