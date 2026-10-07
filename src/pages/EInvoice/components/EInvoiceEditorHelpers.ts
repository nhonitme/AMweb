import React, { type ReactElement } from "react"
import type dxDataGrid from "devextreme/ui/data_grid"

import { fetchCustomerLookup } from "@/api/lookupApi"
import { LookupGridCellEditor } from "@/components/lookup/LookupGridCellDisplay"
import { currencyLookupStore, type CurrencyLookupItem } from "@/components/lookup/currencyLookupStore"
import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"
import { formatSysCodeOptionText } from "@/lib/sysCodeUtils"
import type { EInvoice, EInvoiceSeller } from "@/types/einvoice"
import type { EInvoiceCalcSettings } from "../einvoiceModel"
import {
  applySellerToEInvoice,
  createDefaultEInvoice,
  recalculateInvoiceTotals,
  renumberEInvoiceDetails,
} from "../einvoiceModel"
import type { EInvoiceDecimalResolver } from "../einvoiceDecimalSettings"
import {
  applyEInvoiceUserSettingDefaults,
  EMPTY_EINVOICE_USER_SETTING_DEFAULTS,
  type EInvoiceUserSettingDefaults,
} from "../einvoiceUserSettingDefaults"
import { createDefaultWarehouseFields } from "../einvoiceWarehouseModel"
import {
  applyEInvoiceDetailTchatChange,
  isCommercialDiscountTchat,
} from "../einvoiceModel"
import {
  autoCalculatedHeaderTotalFields,
  dateFields,
  DEFAULT_TCHAT,
  headerCommercialDiscountBlockedFields,
  manualTotalFields,
  numberFields,
  SPECIAL_TCHAT,
} from "./EInvoiceEditorConstants"
import type {
  EInvoiceDetailDisplayCellInfo,
  EInvoiceDetailRow,
  EInvoiceFormData,
  GridKey,
} from "./EInvoiceEditorTypes"

export { currencyLookupStore }

export function isSpecialTchat(tchat: unknown): boolean {
  return Number(tchat) === SPECIAL_TCHAT
}

export function cloneEInvoiceDetailRow(row: EInvoiceDetailRow): EInvoiceDetailRow {
  return { ...row }
}

export function readGridDetailRows(
  grid: dxDataGrid<EInvoiceDetailRow, GridKey> | null | undefined,
): EInvoiceDetailRow[] | null {
  if (!grid) {
    return null
  }

  const rows = grid
    .getVisibleRows()
    .filter((row) => row.rowType === "data" && row.data)
    .map((row) => cloneEInvoiceDetailRow(row.data as EInvoiceDetailRow))

  return rows.length > 0 ? rows : null
}

export function hasActiveDetailCommercialDiscount(
  details: ReadonlyArray<Pick<EInvoiceDetailRow, "ISDEL" | "TCHAT">>,
): boolean {
  return details.some(
    (detail) => Number(detail.ISDEL ?? 0) !== 1 && isCommercialDiscountTchat(detail.TCHAT),
  )
}

export function createDetailTchatSetCellValue(
  prepareTchatChange?: (currentRow: EInvoiceDetailRow, nextTchat: number) => EInvoiceDetailRow,
) {
  return (newData: EInvoiceDetailRow, value: unknown, currentRowData?: EInvoiceDetailRow) => {
    const parsed = Number(value)
    const nextTchat = Number.isFinite(parsed) ? parsed : DEFAULT_TCHAT
    const currentRow = currentRowData ?? ({ ...newData } as EInvoiceDetailRow)
    const nextRow = prepareTchatChange
      ? prepareTchatChange(currentRow, nextTchat)
      : applyEInvoiceDetailTchatChange(currentRow, nextTchat)
    Object.assign(newData, nextRow)
  }
}

export async function commitDetailGridCell(
  grid: dxDataGrid<EInvoiceDetailRow, GridKey> | null | undefined,
): Promise<void> {
  if (!grid) {
    return
  }

  try {
    await grid.closeEditCell()
  } catch {
  }

  try {
    if (grid.hasEditData()) {
      await grid.saveEditData()
    }
  } catch {
  }
}

export function isDevExtremeDropdownOverlayTarget(target: EventTarget | null): boolean {
  if (!(target instanceof Element)) {
    return false
  }

  return Boolean(target.closest(".dx-dropdowneditor-overlay"))
}

export function createInvoiceFormData(
  companyCd: string,
  seller: EInvoiceSeller | null = null,
  userDefaults: EInvoiceUserSettingDefaults = EMPTY_EINVOICE_USER_SETTING_DEFAULTS,
): EInvoiceFormData {
  const base = recalculateInvoiceTotals(applySellerToEInvoice(createDefaultEInvoice(companyCd), seller))
  const withDefaults = applyEInvoiceUserSettingDefaults(base, userDefaults)
  const warehouseDefaults = createDefaultWarehouseFields()
  return {
    ...withDefaults,
    ...warehouseDefaults,
    NBAN_DCHI: String(seller?.SELLER_ADDRESS ?? "").trim() || warehouseDefaults.NBAN_DCHI,
    BUYER_CUSTOMER_ID: 0,
    TEMPLATE_XSL_ID: Number(seller?.XSL_ID ?? 0) || 0,
  }
}

export async function resolveBuyerCustomerId(invoice: EInvoice): Promise<number> {
  const customerCd = String(invoice.NMUA_MKHANG ?? "").trim()
  const taxCd = String(invoice.NMUA_MST ?? "").trim()
  if (!customerCd && !taxCd) {
    return 0
  }

  const customers = await fetchCustomerLookup()
  if (customerCd) {
    const matched = customers.find((item) => String(item.CUSTOMER_CD ?? "").trim() === customerCd)
    if (matched) {
      return Number(matched.CUSTOMER_ID ?? 0)
    }
  }

  if (taxCd) {
    const matched = customers.find((item) => String(item.TAX_CD ?? "").trim() === taxCd)
    if (matched) {
      return Number(matched.CUSTOMER_ID ?? 0)
    }
  }

  return 0
}

export function renderLookupCell(dataField: string) {
  return (cellInfo: EInvoiceDetailDisplayCellInfo) =>
    React.createElement(LookupGridCellEditor, { mode: "display", cellInfo, dataField })
}

export function renderLookupEditor(children: ReactElement) {
  return React.createElement(LookupGridCellEditor, { mode: "edit" }, children)
}

export function normalizeFormValue(field: string, value: unknown): string | number | null {
  if (dateFields.has(field)) {
    if (value instanceof Date && !Number.isNaN(value.getTime())) {
      const year = value.getFullYear()
      const month = `${value.getMonth() + 1}`.padStart(2, "0")
      const day = `${value.getDate()}`.padStart(2, "0")
      return `${year}-${month}-${day}`
    }

    const text = String(value ?? "").trim()
    return text.length > 0 ? text.slice(0, 10) : null
  }

  if (numberFields.has(field)) {
    const parsed = Number(value ?? 0)
    return Number.isFinite(parsed) ? parsed : 0
  }

  return String(value ?? "").trim()
}

export function normalizeManualTotalValue(
  field: string,
  value: unknown,
  current: EInvoiceFormData,
  decimalResolver: EInvoiceDecimalResolver,
): string | number | null {
  const normalizedValue = normalizeFormValue(field, value)

  if (typeof normalizedValue !== "number") {
    return normalizedValue
  }

  const currencyCode = field.endsWith("_VND") ? DEFAULT_CURRENCY_CODE : current.DVTTE
  return decimalResolver.round("HEADER", field, normalizedValue, currencyCode)
}

export function applyManualTotalValues<TRecord extends EInvoice>(
  record: TRecord,
  values: Partial<Record<string, unknown>>,
): TRecord {
  const hasDetailCommercialDiscount = hasActiveDetailCommercialDiscount(record.DETAILS)
  const next = { ...record } as Record<string, unknown>

  Object.entries(values).forEach(([field, value]) => {
    if (!manualTotalFields.has(field)) {
      return
    }

    if (hasDetailCommercialDiscount && headerCommercialDiscountBlockedFields.has(field)) {
      return
    }

    next[field] = value
  })

  return next as TRecord
}

export function clearAutoCalculatedHeaderTotalOverrides(
  overrides: Partial<Record<string, unknown>>,
  details: EInvoice["DETAILS"] = [],
): Partial<Record<string, unknown>> {
  if (!hasActiveDetailCommercialDiscount(details)) {
    return overrides
  }

  const next = { ...overrides }
  let changed = false

  autoCalculatedHeaderTotalFields.forEach((field) => {
    if (field in next) {
      delete next[field]
      changed = true
    }
  })

  if ("CKTMAI_GCHU" in next) {
    delete next.CKTMAI_GCHU
    changed = true
  }

  return changed ? next : overrides
}

export function formatCurrencyOption(
  currency: CurrencyLookupItem | null,
  translate?: (key: string, fallback?: string) => string,
): string {
  return formatSysCodeOptionText(currency, translate)
}

export function normalizeEInvoiceDetailGridRows(
  rows: EInvoiceDetailRow[],
  rate: number,
  currencyCode: string,
  decimalResolver: EInvoiceDecimalResolver,
  calcSettings?: EInvoiceCalcSettings,
): EInvoiceDetailRow[] {
  return renumberEInvoiceDetails(rows, rate, currencyCode, decimalResolver, calcSettings) as EInvoiceDetailRow[]
}
