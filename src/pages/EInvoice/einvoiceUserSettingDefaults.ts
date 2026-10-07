import { DEFAULT_CURRENCY_CODE, isForeignCurrencyCode, normalizeCurrencyCode } from "@/lib/currency"
import { loadEInvoiceUserSettings } from "@/lib/einvoiceUserSettingCache"
import type { EInvoice, EInvoiceDetail } from "@/types/einvoice"
import type { EInvoiceUserSetting } from "@/types/einvoiceSetting"
import { EINVOICE_USER_SETTING_KEYS, isBooleanSettingValueTrue } from "./einvoiceUserSettingModel"
import {
  type EInvoiceCalcSettings,
  isEInvoiceAdjustmentInvoice,
  isEInvoiceWithoutTaxRate,
  normalizeEInvoiceDetailRow,
  normalizeEInvoiceVatRateCode,
  recalculateInvoiceTotals,
} from "./einvoiceModel"

export interface EInvoiceUserSettingDefaults {
  defaultPayment: string
  defaultCurrency: string
  defaultVatRate: string
  defaultLineType: number
  showDiscountColumns: boolean
  autoCalcAmount: boolean
  autoCalcTax: boolean
  autoCalcPriceFromBeforeTaxAmount: boolean
  autoCalcPriceFromAfterTaxAmount: boolean
  afterTaxPrice: boolean
  enableExcelImport: boolean
}

export const EMPTY_EINVOICE_USER_SETTING_DEFAULTS: EInvoiceUserSettingDefaults = {
  defaultPayment: "",
  defaultCurrency: "",
  defaultVatRate: "",
  defaultLineType: 1,
  showDiscountColumns: true,
  autoCalcAmount: true,
  autoCalcTax: true,
  autoCalcPriceFromBeforeTaxAmount: false,
  autoCalcPriceFromAfterTaxAmount: false,
  afterTaxPrice: false,
  enableExcelImport: true,
}

function parseDefaultLineType(value: string | undefined): number {
  const parsed = Number(value ?? 1)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 1
}

export function toEInvoiceCalcSettings(defaults: EInvoiceUserSettingDefaults): EInvoiceCalcSettings {
  return resolveEInvoiceCalcSettings(defaults)
}

export function resolveEInvoiceCalcSettings(
  defaults: EInvoiceUserSettingDefaults,
  tchdon?: number | null,
): EInvoiceCalcSettings {
  return {
    autoCalcAmount: defaults.autoCalcAmount,
    autoCalcTax: defaults.autoCalcTax,
    autoCalcPriceFromBeforeTaxAmount: defaults.autoCalcPriceFromBeforeTaxAmount,
    autoCalcPriceFromAfterTaxAmount: defaults.autoCalcPriceFromAfterTaxAmount,
    allowNegativeValues: isEInvoiceAdjustmentInvoice(tchdon),
  }
}

function trimText(value: string | null | undefined): string {
  return typeof value === "string" ? value.trim() : ""
}

function pickEffectiveUserSettingRows(rows: EInvoiceUserSetting[], companyCd: string): EInvoiceUserSetting[] {
  const byKey = new Map<string, EInvoiceUserSetting>()

  const resolvePriority = (row: EInvoiceUserSetting): number => {
    const rowCompanyCd = trimText(row.COMPANY_CD)
    const rowUserId = trimText(row.USER_ID)
    let priority = 0
    if (rowCompanyCd === companyCd) {
      priority += 4
    } else if (rowCompanyCd === "") {
      priority += 2
    }
    if (rowUserId !== "") {
      priority += 1
    }
    return priority
  }

  for (const row of rows) {
    const key = trimText(row.SETTING_KEY)
    if (!key) {
      continue
    }

    const current = byKey.get(key)
    if (!current || resolvePriority(row) >= resolvePriority(current)) {
      byKey.set(key, row)
    }
  }

  return [...byKey.values()]
}

export function mapEInvoiceUserSettingDefaults(
  rows: EInvoiceUserSetting[],
  companyCd: string,
): EInvoiceUserSettingDefaults {
  const effectiveRows = pickEffectiveUserSettingRows(rows, companyCd)
  const byKey = new Map(effectiveRows.map((row) => [trimText(row.SETTING_KEY), trimText(row.SETTING_VALUE)]))

  const defaultCurrency = normalizeCurrencyCode(byKey.get(EINVOICE_USER_SETTING_KEYS.DEFAULT_CURRENCY) ?? "")
  const defaultVatRate = normalizeEInvoiceVatRateCode(byKey.get(EINVOICE_USER_SETTING_KEYS.DEFAULT_VAT_RATE) ?? "")

  const showDiscountSetting = byKey.get(EINVOICE_USER_SETTING_KEYS.SHOW_DISCOUNT_COLUMNS)
  const autoCalcAmountSetting = byKey.get(EINVOICE_USER_SETTING_KEYS.AUTO_CALC_AMOUNT)
  const autoCalcTaxSetting = byKey.get(EINVOICE_USER_SETTING_KEYS.AUTO_CALC_TAX)
  const autoCalcPriceFromBeforeTaxSetting = byKey.get(EINVOICE_USER_SETTING_KEYS.AUTO_CALC_PRICE_FROM_BEFORE_TAX_AMOUNT)
  const autoCalcPriceFromAfterTaxSetting = byKey.get(EINVOICE_USER_SETTING_KEYS.AUTO_CALC_PRICE_FROM_AFTER_TAX_AMOUNT)
  const afterTaxPriceSetting = byKey.get(EINVOICE_USER_SETTING_KEYS.AFTER_TAX_PRICE)
  const enableExcelImportSetting = byKey.get(EINVOICE_USER_SETTING_KEYS.ENABLE_EXCEL_IMPORT)

  return {
    defaultPayment: byKey.get(EINVOICE_USER_SETTING_KEYS.DEFAULT_PAYMENT) ?? "",
    defaultCurrency: defaultCurrency || "",
    defaultVatRate,
    defaultLineType: parseDefaultLineType(byKey.get(EINVOICE_USER_SETTING_KEYS.DEFAULT_LINE_TYPE)),
    showDiscountColumns: showDiscountSetting == null ? true : isBooleanSettingValueTrue(showDiscountSetting),
    autoCalcAmount: autoCalcAmountSetting == null ? true : isBooleanSettingValueTrue(autoCalcAmountSetting),
    autoCalcTax: autoCalcTaxSetting == null ? true : isBooleanSettingValueTrue(autoCalcTaxSetting),
    autoCalcPriceFromBeforeTaxAmount: autoCalcPriceFromBeforeTaxSetting == null
      ? false
      : isBooleanSettingValueTrue(autoCalcPriceFromBeforeTaxSetting),
    autoCalcPriceFromAfterTaxAmount: autoCalcPriceFromAfterTaxSetting == null
      ? false
      : isBooleanSettingValueTrue(autoCalcPriceFromAfterTaxSetting),
    afterTaxPrice: afterTaxPriceSetting == null ? false : isBooleanSettingValueTrue(afterTaxPriceSetting),
    enableExcelImport: enableExcelImportSetting == null ? true : isBooleanSettingValueTrue(enableExcelImportSetting),
  }
}

export async function loadEInvoiceUserSettingDefaults(
  companyCd: string,
  forceRefresh = false,
): Promise<EInvoiceUserSettingDefaults> {
  const rows = await loadEInvoiceUserSettings({}, forceRefresh)
  return mapEInvoiceUserSettingDefaults(rows, companyCd)
}

export function applyDefaultVatRateToDetail(
  detail: EInvoiceDetail,
  defaults: EInvoiceUserSettingDefaults,
  rate: number,
  currencyCode: string,
): EInvoiceDetail {
  if (!trimText(defaults.defaultVatRate)) {
    return normalizeEInvoiceDetailRow(detail, rate, currencyCode)
  }

  return normalizeEInvoiceDetailRow(
    {
      ...detail,
      TSUAT: normalizeEInvoiceVatRateCode(defaults.defaultVatRate),
    },
    rate,
    currencyCode,
    undefined,
    toEInvoiceCalcSettings(defaults),
  )
}

export function applyEInvoiceUserSettingDefaults(
  invoice: EInvoice,
  defaults: EInvoiceUserSettingDefaults | null | undefined,
): EInvoice {
  if (!defaults) {
    return invoice
  }

  const currencyCode = trimText(defaults.defaultCurrency)
    ? normalizeCurrencyCode(defaults.defaultCurrency)
    : normalizeCurrencyCode(invoice.DVTTE) || DEFAULT_CURRENCY_CODE
  const rate = isForeignCurrencyCode(currencyCode) ? Number(invoice.TGIA ?? 1) || 1 : 1

  const nextDetails = invoice.DETAILS.map((detail) => {
    if (Number(detail.ISDEL ?? 0) === 1) {
      return detail
    }

    const hasVatRate = trimText(detail.TSUAT).length > 0
    const nextDetail =
      !isEInvoiceWithoutTaxRate(invoice.KHMSHDON) &&
      !hasVatRate &&
      trimText(defaults.defaultVatRate).length > 0
        ? { ...detail, TSUAT: normalizeEInvoiceVatRateCode(defaults.defaultVatRate) }
        : detail

    return normalizeEInvoiceDetailRow(nextDetail, rate, currencyCode)
  })

  return recalculateInvoiceTotals(
    {
      ...invoice,
      DVTTE: currencyCode,
      HTTTOAN: trimText(defaults.defaultPayment).length > 0 ? defaults.defaultPayment : invoice.HTTTOAN,
      TGIA: rate,
      DETAILS: nextDetails,
    },
    undefined,
    toEInvoiceCalcSettings(defaults),
  )
}
