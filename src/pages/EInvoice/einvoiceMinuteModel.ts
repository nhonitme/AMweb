import type { EInvoice, EInvoiceDetail } from "@/types/einvoice"
import { normalizeEInvoiceVatRateCode } from "./einvoiceModel"
import type {
  EInvoiceMinute,
  EInvoiceMinuteApi,
  EInvoiceMinuteLine,
  EInvoiceMinuteLineApi,
  EInvoiceMinuteLineTotals,
  EInvoiceMinuteReason,
  EInvoiceMinuteReasonApi,
} from "@/types/einvoiceMinute"
import {
  EINVOICE_MINUTE_LINE_SIDE_AFTER,
  EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL,
  EINVOICE_MINUTE_LINE_SIDE_BEFORE,
  EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL,
} from "@/types/einvoiceMinute"

import type { SysCode } from "@/api/sysCodeService"
import {
  buildEInvoiceNumericSysCodeOptions,
  formatEInvoiceNumericSysCodeText,
  type EInvoiceNumericSysCodeOption,
} from "./einvoiceSysCodeOptions"
import {
  buildEInvoiceMailStatusOptions,
  EINV_MAIL_STATUS_CODE_TYPE,
  type EInvoiceMailStatusOption,
} from "./einvoiceModel"
import { EINV_SIGN_STATUS_CODE_TYPE } from "./einvoiceAdvancedSearch"
import { DEFAULT_CURRENCY_CODE, isForeignCurrencyCode, normalizeCurrencyCode } from "@/lib/currency"
import { einvT } from "./einvoiceI18n"
import type { EInvoiceTranslateFn } from "./einvoiceTranslate"

export const EINV_BBAN_TYPE_CODE_TYPE = "EINV_BBAN_TYPE"

export type EInvoiceMinuteTypeOption = EInvoiceNumericSysCodeOption
export type EInvoiceMinuteSignStatusOption = EInvoiceNumericSysCodeOption
export type EInvoiceMinuteMailStatusOption = EInvoiceMailStatusOption

type MinuteLabelTranslate = EInvoiceTranslateFn

const trimText = (value: string | null | undefined): string => (typeof value === "string" ? value.trim() : "")

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

export function defaultMinuteTitle(tchdon: number, translate?: MinuteLabelTranslate): string {
  const t = translate ?? einvT
  return tchdon === 1
    ? t("BBAN_TBBAN_REPLACEMENT", "Biên bản thay thế")
    : t("BBAN_TBBAN_ADJUSTMENT", "Biên bản điều chỉnh")
}

export function buildMinuteTypeOptions(
  codes: SysCode[],
  translate: MinuteLabelTranslate = einvT,
): EInvoiceMinuteTypeOption[] {
  return buildEInvoiceNumericSysCodeOptions(codes, translate, (value) => value === 1 || value === 2)
}

export function buildMinuteSignStatusOptions(
  codes: SysCode[],
  translate: MinuteLabelTranslate = einvT,
): EInvoiceMinuteSignStatusOption[] {
  return buildEInvoiceNumericSysCodeOptions(codes, translate, (value) => value === 0 || value === 1)
}

export { EINV_MAIL_STATUS_CODE_TYPE, EINV_SIGN_STATUS_CODE_TYPE, buildEInvoiceMailStatusOptions }

export function toMinuteDateText(value: string | Date | null | undefined): string {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const month = `${value.getMonth() + 1}`.padStart(2, "0")
    const day = `${value.getDate()}`.padStart(2, "0")
    return `${year}-${month}-${day}`
  }

  const text = trimText(value)
  return text.length > 0 ? text.slice(0, 10) : ""
}

export function parseMinuteDate(value: string | Date | null | undefined): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  const text = toMinuteDateText(value)
  if (!text) {
    return null
  }

  const date = new Date(`${text}T00:00:00`)
  return Number.isNaN(date.getTime()) ? null : date
}

export function createMinuteToday(): string {
  return toMinuteDateText(new Date())
}

export function formatMinuteDateForApi(value: Date | null): string | undefined {
  const text = toMinuteDateText(value)
  return text || undefined
}

export function isMinuteSigned(record: Pick<EInvoiceMinute, "IS_SIGNED"> | null | undefined): boolean {
  return toNumber(record?.IS_SIGNED, 0) === 1
}

export function isMinuteReadyToSendMail(
  record: Pick<EInvoiceMinute, "IS_SIGNED" | "SBBAN"> | null | undefined,
): boolean {
  if (!record || !isMinuteSigned(record)) {
    return false
  }

  return trimText(record.SBBAN).length > 0
}

export function formatMinuteDisplayNo(
  record: Pick<EInvoiceMinute, "SBBAN" | "BBAN_ID"> | null | undefined,
): string {
  const sbban = trimText(record?.SBBAN)
  if (sbban) {
    return sbban
  }

  const bbanId = toNumber(record?.BBAN_ID, 0)
  return bbanId > 0 ? `#${bbanId}` : ""
}

function buildRowKey(): string {
  return `einv-bban-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`
}

export function createDefaultMinuteReason(index: number, bbanId = 0): EInvoiceMinuteReason {
  return {
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    BBAN_ID: bbanId,
    SORT_ORDER: index,
    LDO: "",
    CREATE_DT: "",
    ISDEL: 0,
  }
}

export function createDefaultMinuteLine(index: number, lineSide: number, bbanId = 0): EInvoiceMinuteLine {
  return {
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    BBAN_ID: bbanId,
    DETAIL_ID: 0,
    LINE_SIDE: lineSide,
    SORT_ORDER: index,
    LDO: "",
    TCHAT: 1,
    STT: index,
    MHHDVU: "",
    THHDVU: "",
    DVTINH: "",
    SLUONG: null,
    DGIA: null,
    TLCKHAU: null,
    STCKHAU: null,
    THTIEN: null,
    TSUAT: "",
    TTHUE: null,
    TSAUTHUE: null,
    EXTRA_JSON: "",
    CREATE_DT: "",
    ISDEL: 0,
  }
}

function mapInvoiceDetailToMinuteLine(detail: EInvoiceDetail, index: number, lineSide: number, bbanId = 0): EInvoiceMinuteLine {
  return {
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    BBAN_ID: bbanId,
    DETAIL_ID: detail.DETAIL_ID,
    LINE_SIDE: lineSide,
    SORT_ORDER: index,
    LDO: "",
    TCHAT: detail.TCHAT ?? 1,
    STT: detail.STT ?? index,
    MHHDVU: trimText(detail.MHHDVU),
    THHDVU: trimText(detail.THHDVU),
    DVTINH: trimText(detail.DVTINH),
    SLUONG: detail.SLUONG,
    DGIA: detail.DGIA,
    TLCKHAU: detail.TLCKHAU,
    STCKHAU: detail.STCKHAU,
    THTIEN: detail.THTIEN,
    TSUAT: trimText(detail.TSUAT),
    TTHUE: detail.TTHUE,
    TSAUTHUE: detail.TSAUTHUE,
    EXTRA_JSON: trimText(detail.EXTRA_JSON),
    CREATE_DT: "",
    ISDEL: 0,
  }
}

export function mapInvoiceDetailsToMinuteLines(
  details: EInvoiceDetail[],
  lineSide: number,
  bbanId = 0,
): EInvoiceMinuteLine[] {
  return details
    .filter((detail) => detail.ISDEL !== 1)
    .map((detail, index) => mapInvoiceDetailToMinuteLine(detail, index + 1, lineSide, bbanId))
}

export function renumberMinuteLines(lines: EInvoiceMinuteLine[]): EInvoiceMinuteLine[] {
  let activeIndex = 0
  return lines.map((line) => {
    if (line.ISDEL === 1) {
      return { ...line }
    }

    activeIndex += 1
    return {
      ...line,
      SORT_ORDER: activeIndex,
    }
  })
}

export function calcMinuteLinesTotals(lines: EInvoiceMinuteLine[]): EInvoiceMinuteLineTotals {
  const active = lines.filter((line) => line.ISDEL !== 1)
  return {
    THTIEN: active.reduce((sum, line) => sum + (line.THTIEN ?? 0), 0),
    TTHUE: active.reduce((sum, line) => sum + (line.TTHUE ?? 0), 0),
    TSAUTHUE: active.reduce((sum, line) => sum + (line.TSAUTHUE ?? 0), 0),
  }
}

export function createDefaultMinuteTotalLine(lineSide: number, bbanId = 0): EInvoiceMinuteLine {
  return {
    ...createDefaultMinuteLine(9999, lineSide, bbanId),
    SORT_ORDER: 9999,
    THHDVU: "Tổng cộng",
    THTIEN: 0,
    TTHUE: 0,
    TSAUTHUE: 0,
  }
}

export function minuteTotalLineToTotals(total: EInvoiceMinuteLine | null | undefined): EInvoiceMinuteLineTotals {
  return {
    THTIEN: total?.THTIEN ?? null,
    TTHUE: total?.TTHUE ?? null,
    TSAUTHUE: total?.TSAUTHUE ?? null,
  }
}

export function applyTotalsToMinuteTotalLine(
  total: EInvoiceMinuteLine | null | undefined,
  totals: EInvoiceMinuteLineTotals,
  lineSide: number,
  bbanId = 0,
): EInvoiceMinuteLine {
  const base = total ?? createDefaultMinuteTotalLine(lineSide, bbanId)
  return {
    ...base,
    LINE_SIDE: lineSide,
    THHDVU: trimText(base.THHDVU) || "Tổng cộng",
    THTIEN: totals.THTIEN,
    TTHUE: totals.TTHUE,
    TSAUTHUE: totals.TSAUTHUE,
  }
}

export function recalcMinuteLineAmounts(line: EInvoiceMinuteLine): EInvoiceMinuteLine {
  const quantity = line.SLUONG ?? 0
  const unitPrice = line.DGIA ?? 0
  const discountAmount = line.STCKHAU ?? 0
  const amountBeforeTax = quantity * unitPrice - discountAmount
  const taxRateText = trimText(line.TSUAT).replace("%", "")
  const taxRate = Number(taxRateText)
  const taxAmount = Number.isFinite(taxRate) && taxRate > 0 ? (amountBeforeTax * taxRate) / 100 : 0

  return {
    ...line,
    THTIEN: amountBeforeTax,
    TTHUE: taxAmount,
    TSAUTHUE: amountBeforeTax + taxAmount,
  }
}

const MINUTE_LINE_AUTO_CALC_FIELDS = new Set<keyof EInvoiceMinuteLine>([
  "SLUONG",
  "DGIA",
  "TLCKHAU",
  "STCKHAU",
  "TSUAT",
])

export function patchMinuteLineField(
  line: EInvoiceMinuteLine,
  field: keyof EInvoiceMinuteLine,
  value: EInvoiceMinuteLine[keyof EInvoiceMinuteLine],
): EInvoiceMinuteLine {
  const nextValue =
    field === "TSUAT"
      ? (normalizeEInvoiceVatRateCode(String(value ?? "")) as EInvoiceMinuteLine[keyof EInvoiceMinuteLine])
      : value
  const next = { ...line, [field]: nextValue } as EInvoiceMinuteLine
  return MINUTE_LINE_AUTO_CALC_FIELDS.has(field) ? recalcMinuteLineAmounts(next) : next
}

export function createDefaultMinute(companyCd: string): EInvoiceMinute {
  return {
    BBAN_ID: 0,
    COMPANY_CD: companyCd,
    SELLER_ID: 0,
    INVOICE_ID: 0,
    REF_INVOICE_ID: 0,
    PBAN: "",
    TBBAN: defaultMinuteTitle(2),
    SBBAN: "",
    NBBAN: createMinuteToday(),
    TCHDON: 2,
    NBAN: "",
    MSTNBAN: "",
    DCNBAN: "",
    NMUA: "",
    MSTNMUA: "",
    DCNMUA: "",
    KHMSHDON: "",
    KHHDON: "",
    SHDON: "",
    NLAP: "",
    DVTTE: DEFAULT_CURRENCY_CODE,
    TGIA: 1,
    MTRACUU: "",
    TTKHAC_XML: "",
    NDBBAN_XML: "",
    SIGNED_XML: "",
    IS_SIGNED: 0,
    NMUA_IS_SIGNED: 0,
    NMUA_SIGN_DT: "",
    IS_MAIL: 0,
    CHECKSUM: "",
    CREATE_BY: "",
    CREATE_DT: "",
    UPDATE_BY: "",
    UPDATE_DT: "",
    ISDEL: 0,
    REASONS: [createDefaultMinuteReason(1)],
    LINES_BEFORE: [],
    LINES_AFTER: [],
    TOTAL_BEFORE: createDefaultMinuteTotalLine(EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL),
    TOTAL_AFTER: createDefaultMinuteTotalLine(EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL),
  }
}

export function normalizeMinuteLine(record: EInvoiceMinuteLineApi, index: number, bbanId = 0, lineSide = 0): EInvoiceMinuteLine {
  return {
    ROW_KEY: buildRowKey(),
    REASON_ID: toNumber(record.REASON_ID, 0),
    BBAN_ID: toNumber(record.BBAN_ID, bbanId),
    DETAIL_ID: toNumber(record.DETAIL_ID, 0),
    LINE_SIDE: toNumber(record.LINE_SIDE, lineSide),
    SORT_ORDER: toNumber(record.SORT_ORDER, index + 1),
    LDO: trimText(record.LDO),
    TCHAT: toNumber(record.TCHAT, 1),
    STT: toNumber(record.STT, index + 1),
    MHHDVU: trimText(record.MHHDVU),
    THHDVU: trimText(record.THHDVU),
    DVTINH: trimText(record.DVTINH),
    SLUONG: record.SLUONG ?? null,
    DGIA: record.DGIA ?? null,
    TLCKHAU: record.TLCKHAU ?? null,
    STCKHAU: record.STCKHAU ?? null,
    THTIEN: record.THTIEN ?? null,
    TSUAT: trimText(record.TSUAT),
    TTHUE: record.TTHUE ?? null,
    TSAUTHUE: record.TSAUTHUE ?? null,
    EXTRA_JSON: trimText(record.EXTRA_JSON),
    CREATE_DT: trimText(record.CREATE_DT),
    ISDEL: toNumber(record.ISDEL, 0),
  }
}

export function normalizeMinuteReason(record: EInvoiceMinuteReasonApi, index: number, bbanId = 0): EInvoiceMinuteReason {
  return {
    ROW_KEY: buildRowKey(),
    REASON_ID: toNumber(record.REASON_ID, 0),
    BBAN_ID: toNumber(record.BBAN_ID, bbanId),
    SORT_ORDER: toNumber(record.SORT_ORDER, index + 1),
    LDO: trimText(record.LDO),
    CREATE_DT: trimText(record.CREATE_DT),
    ISDEL: toNumber(record.ISDEL, 0),
  }
}

export function normalizeMinute(record: EInvoiceMinuteApi, companyCd: string): EInvoiceMinute {
  const bbanId = toNumber(record.BBAN_ID, 0)
  const reasons = Array.isArray(record.REASONS)
    ? record.REASONS.map((reason, index) => normalizeMinuteReason(reason, index, bbanId))
    : []
  const linesBefore = Array.isArray(record.LINES_BEFORE)
    ? record.LINES_BEFORE.map((line, index) => normalizeMinuteLine(line, index, bbanId, EINVOICE_MINUTE_LINE_SIDE_BEFORE))
    : []
  const linesAfter = Array.isArray(record.LINES_AFTER)
    ? record.LINES_AFTER.map((line, index) => normalizeMinuteLine(line, index, bbanId, EINVOICE_MINUTE_LINE_SIDE_AFTER))
    : []
  const totalBefore = record.TOTAL_BEFORE
    ? normalizeMinuteLine(record.TOTAL_BEFORE, 0, bbanId, EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL)
    : createDefaultMinuteTotalLine(EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL, bbanId)
  const totalAfter = record.TOTAL_AFTER
    ? normalizeMinuteLine(record.TOTAL_AFTER, 0, bbanId, EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL)
    : createDefaultMinuteTotalLine(EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL, bbanId)
  const totalAfterTax = record.TOTAL_AFTER?.TTHUE ?? record.TOTAL_AFTER_TTHUE ?? totalAfter.TTHUE

  return {
    ...createDefaultMinute(companyCd),
    ...record,
    BBAN_ID: bbanId,
    COMPANY_CD: trimText(record.COMPANY_CD) || companyCd,
    SELLER_ID: toNumber(record.SELLER_ID, 0),
    INVOICE_ID: toNumber(record.INVOICE_ID, 0),
    REF_INVOICE_ID: toNumber(record.REF_INVOICE_ID, 0),
    PBAN: trimText(record.PBAN),
    TBBAN: trimText(record.TBBAN) || defaultMinuteTitle(toNumber(record.TCHDON, 2)),
    SBBAN: trimText(record.SBBAN),
    NBBAN: toMinuteDateText(record.NBBAN),
    TCHDON: toNumber(record.TCHDON, 2) === 1 ? 1 : 2,
    NBAN: trimText(record.NBAN),
    MSTNBAN: trimText(record.MSTNBAN),
    DCNBAN: trimText(record.DCNBAN),
    NMUA: trimText(record.NMUA),
    MSTNMUA: trimText(record.MSTNMUA),
    DCNMUA: trimText(record.DCNMUA),
    KHMSHDON: trimText(record.KHMSHDON),
    KHHDON: trimText(record.KHHDON),
    SHDON: trimText(record.SHDON),
    NLAP: toMinuteDateText(record.NLAP),
    DVTTE: normalizeCurrencyCode(record.DVTTE) || DEFAULT_CURRENCY_CODE,
    TGIA: (() => {
      const currencyCode = normalizeCurrencyCode(record.DVTTE) || DEFAULT_CURRENCY_CODE
      if (!isForeignCurrencyCode(currencyCode)) {
        return 1
      }

      const rate = toNumber(record.TGIA, 0)
      return rate > 0 ? rate : 1
    })(),
    MTRACUU: trimText(record.MTRACUU),
    TTKHAC_XML: trimText(record.TTKHAC_XML),
    NDBBAN_XML: trimText(record.NDBBAN_XML),
    SIGNED_XML: trimText(record.SIGNED_XML),
    IS_SIGNED: toNumber(record.IS_SIGNED, 0) === 1 ? 1 : 0,
    NMUA_IS_SIGNED: toNumber(record.NMUA_IS_SIGNED, 0) === 1 ? 1 : 0,
    NMUA_SIGN_DT: trimText(record.NMUA_SIGN_DT),
    IS_MAIL: toNumber(record.IS_MAIL, 0) === 1 ? 1 : 0,
    CHECKSUM: trimText(record.CHECKSUM),
    CREATE_BY: trimText(record.CREATE_BY),
    CREATE_DT: trimText(record.CREATE_DT),
    UPDATE_BY: trimText(record.UPDATE_BY),
    UPDATE_DT: trimText(record.UPDATE_DT),
    ISDEL: toNumber(record.ISDEL, 0),
    REASONS: reasons.length > 0 ? reasons : [createDefaultMinuteReason(1, bbanId)],
    LINES_BEFORE: renumberMinuteLines(linesBefore),
    LINES_AFTER: renumberMinuteLines(linesAfter),
    TOTAL_BEFORE: {
      ...totalBefore,
      THHDVU: trimText(totalBefore.THHDVU) || "Tổng cộng",
    },
    TOTAL_AFTER: {
      ...totalAfter,
      THHDVU: trimText(totalAfter.THHDVU) || "Tổng cộng",
      TTHUE: totalAfterTax ?? null,
    },
  }
}

export function normalizeMinuteRows(records: EInvoiceMinuteApi[], companyCd: string): EInvoiceMinute[] {
  return records.map((record) => normalizeMinute(record, companyCd))
}

export function renumberMinuteReasons(reasons: EInvoiceMinuteReason[]): EInvoiceMinuteReason[] {
  let activeIndex = 0
  return reasons.map((reason) => {
    if (reason.ISDEL === 1) {
      return { ...reason }
    }

    activeIndex += 1
    return {
      ...reason,
      SORT_ORDER: activeIndex,
      LDO: trimText(reason.LDO),
    }
  })
}

export function mapMinuteToApiPayload(record: EInvoiceMinute): EInvoiceMinuteApi {
  const reasons = renumberMinuteReasons(record.REASONS)
    .filter((reason) => reason.ISDEL !== 1)
    .map<EInvoiceMinuteReasonApi>((reason) => ({
      REASON_ID: reason.REASON_ID,
      BBAN_ID: record.BBAN_ID,
      SORT_ORDER: reason.SORT_ORDER,
      LDO: trimText(reason.LDO),
      ISDEL: 0,
    }))

  const linesBefore = renumberMinuteLines(record.LINES_BEFORE)
    .filter((line) => line.ISDEL !== 1)
    .map<EInvoiceMinuteLineApi>((line) => ({
      REASON_ID: line.REASON_ID,
      BBAN_ID: record.BBAN_ID,
      DETAIL_ID: line.DETAIL_ID > 0 ? line.DETAIL_ID : null,
      LINE_SIDE: EINVOICE_MINUTE_LINE_SIDE_BEFORE,
      SORT_ORDER: line.SORT_ORDER,
      TCHAT: line.TCHAT,
      STT: line.STT,
      MHHDVU: nullableText(line.MHHDVU),
      THHDVU: nullableText(line.THHDVU),
      DVTINH: nullableText(line.DVTINH),
      SLUONG: line.SLUONG,
      DGIA: line.DGIA,
      TLCKHAU: line.TLCKHAU,
      STCKHAU: line.STCKHAU,
      THTIEN: line.THTIEN,
      TSUAT: nullableText(line.TSUAT),
      TTHUE: line.TTHUE,
      TSAUTHUE: line.TSAUTHUE,
      EXTRA_JSON: nullableText(line.EXTRA_JSON),
      ISDEL: 0,
    }))

  const linesAfter = renumberMinuteLines(record.LINES_AFTER)
    .filter((line) => line.ISDEL !== 1)
    .map<EInvoiceMinuteLineApi>((line) => ({
      REASON_ID: line.REASON_ID,
      BBAN_ID: record.BBAN_ID,
      DETAIL_ID: line.DETAIL_ID > 0 ? line.DETAIL_ID : null,
      LINE_SIDE: EINVOICE_MINUTE_LINE_SIDE_AFTER,
      SORT_ORDER: line.SORT_ORDER,
      TCHAT: line.TCHAT,
      STT: line.STT,
      MHHDVU: nullableText(line.MHHDVU),
      THHDVU: nullableText(line.THHDVU),
      DVTINH: nullableText(line.DVTINH),
      SLUONG: line.SLUONG,
      DGIA: line.DGIA,
      TLCKHAU: line.TLCKHAU,
      STCKHAU: line.STCKHAU,
      THTIEN: line.THTIEN,
      TSUAT: nullableText(line.TSUAT),
      TTHUE: line.TTHUE,
      TSAUTHUE: line.TSAUTHUE,
      EXTRA_JSON: nullableText(line.EXTRA_JSON),
      ISDEL: 0,
    }))

  const mapTotalLine = (line: EInvoiceMinuteLine, lineSide: number): EInvoiceMinuteLineApi => ({
    REASON_ID: line.REASON_ID,
    BBAN_ID: record.BBAN_ID,
    LINE_SIDE: lineSide,
    SORT_ORDER: line.SORT_ORDER,
    THHDVU: nullableText(line.THHDVU) ?? "Tổng cộng",
    THTIEN: line.THTIEN,
    TTHUE: line.TTHUE,
    TSAUTHUE: line.TSAUTHUE,
    ISDEL: 0,
  })

  return {
    BBAN_ID: record.BBAN_ID,
    COMPANY_CD: record.COMPANY_CD,
    SELLER_ID: record.SELLER_ID || null,
    INVOICE_ID: record.INVOICE_ID || null,
    REF_INVOICE_ID: record.REF_INVOICE_ID || null,
    PBAN: trimText(record.PBAN),
    TBBAN: trimText(record.TBBAN) || defaultMinuteTitle(record.TCHDON === 1 ? 1 : 2),
    SBBAN: trimText(record.SBBAN),
    NBBAN: toMinuteDateText(record.NBBAN),
    TCHDON: record.TCHDON === 1 ? 1 : 2,
    NBAN: trimText(record.NBAN),
    MSTNBAN: trimText(record.MSTNBAN),
    DCNBAN: nullableText(record.DCNBAN),
    NMUA: trimText(record.NMUA),
    MSTNMUA: nullableText(record.MSTNMUA),
    DCNMUA: nullableText(record.DCNMUA),
    KHMSHDON: trimText(record.KHMSHDON),
    KHHDON: nullableText(record.KHHDON),
    SHDON: nullableText(record.SHDON),
    NLAP: nullableText(record.NLAP) || null,
    DVTTE: normalizeCurrencyCode(record.DVTTE) || DEFAULT_CURRENCY_CODE,
    TGIA: isForeignCurrencyCode(record.DVTTE) ? toNumber(record.TGIA, 1) || 1 : 1,
    MTRACUU: nullableText(record.MTRACUU),
    TTKHAC_XML: nullableText(record.TTKHAC_XML),
    IS_SIGNED: 0,
    NMUA_IS_SIGNED: 0,
    NMUA_SIGN_DT: null,
    IS_MAIL: record.IS_MAIL === 1 ? 1 : 0,
    ISDEL: 0,
    REASONS: reasons,
    LINES_BEFORE: linesBefore,
    LINES_AFTER: linesAfter,
    TOTAL_BEFORE: mapTotalLine(record.TOTAL_BEFORE, EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL),
    TOTAL_AFTER: mapTotalLine(record.TOTAL_AFTER, EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL),
  }
}

export function applyInvoiceToMinute(record: EInvoiceMinute, invoice: EInvoice): EInvoiceMinute {
  const buyerName = trimText(invoice.NMUA_TEN) || trimText(invoice.NMUA_HVTNMHANG)
  const beforeLines = mapInvoiceDetailsToMinuteLines(invoice.DETAILS ?? [], EINVOICE_MINUTE_LINE_SIDE_BEFORE, record.BBAN_ID)
  const afterLines = beforeLines.map((line) => ({
    ...line,
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    DETAIL_ID: line.DETAIL_ID,
    LINE_SIDE: EINVOICE_MINUTE_LINE_SIDE_AFTER,
  }))
  const beforeTotals = calcMinuteLinesTotals(beforeLines)
  const afterTotals = calcMinuteLinesTotals(afterLines)
  return {
    ...record,
    SELLER_ID: toNumber(invoice.SELLER_ID, 0),
    REF_INVOICE_ID: toNumber(invoice.INVOICE_ID, 0),
    NBAN: trimText(invoice.SELLER_NM) || record.NBAN,
    MSTNBAN: trimText(invoice.SELLER_TAX_CD) || record.MSTNBAN,
    NMUA: buyerName || record.NMUA,
    MSTNMUA: trimText(invoice.NMUA_MST),
    DCNMUA: trimText(invoice.NMUA_DCHI),
    KHMSHDON: trimText(invoice.KHMSHDON),
    KHHDON: trimText(invoice.KHHDON),
    SHDON: trimText(invoice.SHDON),
    NLAP: toMinuteDateText(invoice.NLAP),
    DVTTE: normalizeCurrencyCode(invoice.DVTTE) || DEFAULT_CURRENCY_CODE,
    TGIA: isForeignCurrencyCode(invoice.DVTTE) ? toNumber(invoice.TGIA, 1) || 1 : 1,
    LINES_BEFORE: beforeLines,
    LINES_AFTER: afterLines,
    TOTAL_BEFORE: applyTotalsToMinuteTotalLine(
      record.TOTAL_BEFORE,
      {
        THTIEN: invoice.TGTCTHUE ?? beforeTotals.THTIEN,
        TTHUE: invoice.TGTTTHUE ?? beforeTotals.TTHUE,
        TSAUTHUE: invoice.TGTTTBSO ?? beforeTotals.TSAUTHUE,
      },
      EINVOICE_MINUTE_LINE_SIDE_BEFORE_TOTAL,
      record.BBAN_ID,
    ),
    TOTAL_AFTER: applyTotalsToMinuteTotalLine(
      record.TOTAL_AFTER,
      afterTotals,
      EINVOICE_MINUTE_LINE_SIDE_AFTER_TOTAL,
      record.BBAN_ID,
    ),
  }
}

export function createMinuteMonthStartDate(): Date {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

export function createMinuteTodayDate(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

export function formatMinuteTypeText(
  value: number,
  options: EInvoiceMinuteTypeOption[],
): string {
  return formatEInvoiceNumericSysCodeText(value, options, String(value))
}

export function formatMinuteStatusText(
  isSigned: number | null | undefined,
  options: EInvoiceMinuteSignStatusOption[],
): string {
  return formatEInvoiceNumericSysCodeText(toNumber(isSigned, 0), options, String(toNumber(isSigned, 0)))
}

export function formatMinuteInvoiceRefSummaryText(
  record: Pick<EInvoiceMinute, "KHMSHDON" | "KHHDON" | "SHDON" | "NLAP"> | null | undefined,
): string {
  if (!record) {
    return ""
  }

  const parts = [trimText(record.KHMSHDON), trimText(record.KHHDON), trimText(record.SHDON)]
  const nlap = trimText(record.NLAP)
  if (nlap) {
    parts.push(nlap)
  }

  return parts.filter((line) => line.length > 0).join(" · ")
}

export function hasMinuteRefInvoice(
  record: Pick<EInvoiceMinute, "REF_INVOICE_ID" | "KHMSHDON" | "KHHDON" | "SHDON"> | null | undefined,
): boolean {
  if (!record) {
    return false
  }

  if (toNumber(record.REF_INVOICE_ID, 0) > 0) {
    return true
  }

  return [record.KHMSHDON, record.KHHDON, record.SHDON].some((value) => trimText(value).length > 0)
}

export function formatMinuteBuyerSignStatusText(
  nmuaIsSigned: number | null | undefined,
  options: EInvoiceMinuteSignStatusOption[],
): string {
  return formatEInvoiceNumericSysCodeText(toNumber(nmuaIsSigned, 0), options, String(toNumber(nmuaIsSigned, 0)))
}

export function formatMinuteMailStatusText(
  isMail: number | null | undefined,
  options: EInvoiceMinuteMailStatusOption[],
): string {
  return formatEInvoiceNumericSysCodeText(toNumber(isMail, 0), options, String(toNumber(isMail, 0)))
}

export function formatMinutePartySummaryText(
  record: Pick<EInvoiceMinute, "NBAN" | "MSTNBAN" | "NMUA" | "MSTNMUA" | "MTRACUU"> | null | undefined,
): string {
  if (!record) {
    return ""
  }

  return [
    trimText(record.MTRACUU),
    trimText(record.NBAN),
    trimText(record.MSTNBAN),
    trimText(record.NMUA),
    trimText(record.MSTNMUA),
  ]
    .filter((line) => line.length > 0)
    .join("\n")
}

export function formatMinuteStatusSummary(
  record: Pick<EInvoiceMinute, "TCHDON" | "IS_SIGNED" | "NMUA_IS_SIGNED" | "IS_MAIL"> | null | undefined,
  typeOptions: EInvoiceMinuteTypeOption[],
  signStatusOptions: EInvoiceMinuteSignStatusOption[],
  mailStatusOptions: EInvoiceMinuteMailStatusOption[],
): string {
  if (!record) {
    return ""
  }

  return [
    formatMinuteTypeText(record.TCHDON, typeOptions),
    formatMinuteStatusText(record.IS_SIGNED, signStatusOptions),
    formatMinuteBuyerSignStatusText(record.NMUA_IS_SIGNED, signStatusOptions),
    formatMinuteMailStatusText(record.IS_MAIL, mailStatusOptions),
  ].join(" · ")
}

export function isMinuteEditable(record: Pick<EInvoiceMinute, "IS_SIGNED"> | null | undefined): boolean {
  return !isMinuteSigned(record)
}

export function createDraftMinuteNumber(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = `${now.getMonth() + 1}`.padStart(2, "0")
  const day = `${now.getDate()}`.padStart(2, "0")
  const time = `${now.getHours()}${now.getMinutes()}${now.getSeconds()}`.padStart(6, "0")
  return `BB-${year}${month}${day}-${time}`
}

export function createMinuteCopy(source: EInvoiceMinute, companyCd: string): EInvoiceMinute {
  const copy = normalizeMinute(source, companyCd)
  copy.BBAN_ID = 0
  copy.IS_SIGNED = 0
  copy.NMUA_IS_SIGNED = 0
  copy.NMUA_SIGN_DT = ""
  copy.IS_MAIL = 0
  copy.SIGNED_XML = ""
  copy.NDBBAN_XML = ""
  copy.CHECKSUM = ""
  copy.MTRACUU = ""
  copy.SBBAN = createDraftMinuteNumber()
  copy.NBBAN = createMinuteToday()
  copy.REASONS = copy.REASONS.map((reason, index) => ({
    ...reason,
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    BBAN_ID: 0,
    SORT_ORDER: index + 1,
    ISDEL: 0,
  }))
  copy.LINES_BEFORE = copy.LINES_BEFORE.map((line, index) => ({
    ...line,
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    BBAN_ID: 0,
    SORT_ORDER: index + 1,
    ISDEL: 0,
  }))
  copy.LINES_AFTER = copy.LINES_AFTER.map((line, index) => ({
    ...line,
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    BBAN_ID: 0,
    SORT_ORDER: index + 1,
    ISDEL: 0,
  }))
  copy.TOTAL_BEFORE = {
    ...copy.TOTAL_BEFORE,
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    BBAN_ID: 0,
    ISDEL: 0,
  }
  copy.TOTAL_AFTER = {
    ...copy.TOTAL_AFTER,
    ROW_KEY: buildRowKey(),
    REASON_ID: 0,
    BBAN_ID: 0,
    ISDEL: 0,
  }

  return copy
}
