import type { OffsetCurrency, OffsetVoucher } from "@/api/debtOffsetApi"

export type SelectedVoucher = OffsetVoucher & { OFFSET_AMOUNT: number; OFFSET_AMOUNT_FC: number }
export type OffsetSide = "source" | "debt"
export type OffsetAmountField = "OFFSET_AMOUNT" | "OFFSET_AMOUNT_FC"

export const toKey = (row: OffsetVoucher) => `${row.CUSTOMER_ID}:${row.CHIT_ID}`
export const decimals = (num: number) => Math.round(Math.max(0, num) * 100) / 100

export function selectVouchers(previous: SelectedVoucher[], rows: OffsetVoucher[], currency: OffsetCurrency): SelectedVoucher[] {
  const existing = new Map(previous.map(row => [toKey(row), row]))
  if (previous.length === rows.length && rows.every(row => existing.has(toKey(row)))) return previous
  return rows.map(row => existing.get(toKey(row)) ?? ({
    ...row,
    OFFSET_AMOUNT: decimals(Number(row.REMAINAMOUNT) || 0),
    OFFSET_AMOUNT_FC: currency === "VND" ? 0 : decimals(Number(row.REMAINAMOUNT_FC) || 0),
  }))
}

// Checking whether Save is available does not require allocating every pair.
export function hasOffsetPairs(sources: SelectedVoucher[], debts: SelectedVoucher[], currency: OffsetCurrency): boolean {
  const field = currency === "VND" ? "OFFSET_AMOUNT" : "OFFSET_AMOUNT_FC"
  const customers = new Set(debts.filter(row => decimals(row[field]) > 0).map(row => row.CUSTOMER_ID))
  return sources.some(row => decimals(row[field]) > 0 && customers.has(row.CUSTOMER_ID))
}

// Push only changed amounts to the grid; leave every other voucher object intact.
export function getSelectionChanges(previous: Map<string, SelectedVoucher>, next: Map<string, SelectedVoucher>) {
  const changes: { type: "update"; key: string; data: Pick<SelectedVoucher, OffsetAmountField> }[] = []
  const update = (key: string, before?: SelectedVoucher, after?: SelectedVoucher) => {
    const amount = after?.OFFSET_AMOUNT ?? 0
    const amountFc = after?.OFFSET_AMOUNT_FC ?? 0
    if ((before?.OFFSET_AMOUNT ?? 0) === amount && (before?.OFFSET_AMOUNT_FC ?? 0) === amountFc) return
    changes.push({ type: "update", key, data: { OFFSET_AMOUNT: amount, OFFSET_AMOUNT_FC: amountFc } })
  }
  for (const [key, row] of next) update(key, previous.get(key), row)
  for (const [key, row] of previous) {
    if (!next.has(key)) update(key, row)
  }
  return changes
}
