import type { EInvoice } from "@/types/einvoice"
import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"

import type { EInvoiceDecimalResolver } from "./einvoiceDecimalSettings"

export const EINV_NQ204_VAT_REDUCTION_FACTOR = 0.2
const NQ204_EXTRA_FLAG = "NQ204"

function trimText(value: unknown): string {
  return typeof value === "string" ? value.trim() : String(value ?? "").trim()
}

function toNumber(value: unknown, fallback = 0): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : fallback
}

function roundHeaderNumber(
  decimalResolver: EInvoiceDecimalResolver | null | undefined,
  fieldKey: string,
  value: number,
  currencyCode: string,
): number {
  return decimalResolver?.round("HEADER", fieldKey, value, currencyCode) ?? value
}

export function isEInvoiceSalesForm(khmsHDON: string | null | undefined): boolean {
  const match = trimText(khmsHDON).match(/^(\d+)/)
  if (!match) {
    return false
  }

  const parsed = Number(match[1])
  return Number.isFinite(parsed) && parsed === 2
}

function parseEInvoiceExtraJson(extraJson: string | null | undefined): Record<string, unknown> {
  const text = trimText(extraJson)
  if (!text) {
    return {}
  }

  try {
    const parsed = JSON.parse(text) as unknown
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
      return {}
    }

    return { ...(parsed as Record<string, unknown>) }
  } catch {
    return {}
  }
}

function serializeEInvoiceExtraJson(extra: Record<string, unknown>): string | null {
  const entries = Object.entries(extra).filter(([, value]) => value !== undefined && value !== null && value !== "")
  if (entries.length === 0) {
    return null
  }

  return JSON.stringify(Object.fromEntries(entries))
}

function isTruthyExtraFlag(value: unknown): boolean {
  if (value === true || value === 1) {
    return true
  }

  const text = trimText(String(value ?? "")).toLowerCase()
  return text === "1" || text === "true" || text === "yes"
}

export function isEInvoiceNq204Active(
  invoice: Pick<EInvoice, "EXTRA_JSON" | "KHMSHDON" | "TGTKHAC">,
): boolean {
  if (!isEInvoiceSalesForm(invoice.KHMSHDON)) {
    return false
  }

  const extra = parseEInvoiceExtraJson(invoice.EXTRA_JSON)
  if (isTruthyExtraFlag(extra[NQ204_EXTRA_FLAG])) {
    return true
  }

  return toNumber(invoice.TGTKHAC, 0) > 0
}

export function setEInvoiceNq204Extra(extraJson: string | null | undefined, active: boolean): string | null {
  const extra = parseEInvoiceExtraJson(extraJson)
  if (active) {
    extra[NQ204_EXTRA_FLAG] = true
  } else {
    delete extra[NQ204_EXTRA_FLAG]
    delete extra.NQ204_TSUAT
  }

  return serializeEInvoiceExtraJson(extra)
}

export function calculateEInvoiceNq204ReductionAmount(
  taxableRevenue: number,
  vatRatePercent: number,
  currencyCode: string,
  decimalResolver?: EInvoiceDecimalResolver | null,
): number {
  if (vatRatePercent <= 0 || taxableRevenue <= 0) {
    return 0
  }

  const reduction = taxableRevenue * (vatRatePercent / 100) * EINV_NQ204_VAT_REDUCTION_FACTOR
  return roundHeaderNumber(decimalResolver, "TGTKHAC", reduction, currencyCode)
}

export type EInvoiceNq204TotalsOptions = {
  preferInvoiceReduction?: boolean
  vatRatePercent?: number
}

export function applyEInvoiceNq204SalesTotals(
  invoice: EInvoice,
  taxableRevenue: number,
  taxableRevenueVnd: number,
  foreignCurrency: boolean,
  exchangeRate: number,
  decimalResolver?: EInvoiceDecimalResolver | null,
  options?: EInvoiceNq204TotalsOptions,
): Pick<EInvoice, "TGTKHAC" | "TGTKHAC_VND" | "TGTCTHUE" | "TGTCTHUE_VND" | "TGTTTBSO" | "TGTTTBSO_VND"> {
  if (!isEInvoiceSalesForm(invoice.KHMSHDON) || !isEInvoiceNq204Active(invoice)) {
    return {
      TGTKHAC: 0,
      TGTKHAC_VND: 0,
      TGTCTHUE: 0,
      TGTCTHUE_VND: 0,
      TGTTTBSO: taxableRevenue,
      TGTTTBSO_VND: taxableRevenueVnd,
    }
  }

  const currencyCode = invoice.DVTTE || DEFAULT_CURRENCY_CODE
  const reduction = options?.preferInvoiceReduction
    ? roundHeaderNumber(decimalResolver, "TGTKHAC", Math.max(toNumber(invoice.TGTKHAC, 0), 0), currencyCode)
    : calculateEInvoiceNq204ReductionAmount(
        taxableRevenue,
        options?.vatRatePercent ?? 0,
        currencyCode,
        decimalResolver,
      )
  const goodsTotal = Math.max(taxableRevenue - reduction, 0)
  const reductionVnd = foreignCurrency
    ? roundHeaderNumber(decimalResolver, "TGTKHAC_VND", reduction * exchangeRate, DEFAULT_CURRENCY_CODE)
    : reduction
  const goodsTotalVnd = Math.max(taxableRevenueVnd - reductionVnd, 0)

  return {
    TGTKHAC: reduction,
    TGTKHAC_VND: reductionVnd,
    TGTCTHUE: goodsTotal,
    TGTCTHUE_VND: goodsTotalVnd,
    TGTTTBSO: goodsTotal,
    TGTTTBSO_VND: goodsTotalVnd,
  }
}
