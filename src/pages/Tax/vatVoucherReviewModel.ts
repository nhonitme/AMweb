import type { ChitDetail } from "@/types/voucher"

export type VatVoucherReviewDraft = {
  key: string
  label: string
  posting: ChitDetail[]
  cogs: ChitDetail[]
  postingLocked: boolean
  cogsLocked: boolean
}

export type VatVoucherReviewRow = ChitDetail & {
  reviewKey: string
  draftKey: string
  invoiceLabel: string
  locked: boolean
  amountRole: "taxable" | "vat" | "other"
}

export function createReviewRows(drafts: VatVoucherReviewDraft[], tab: "posting" | "cogs"): VatVoucherReviewRow[] {
  return drafts.flatMap((draft) => draft[tab].filter((row) => !row.ISDEL).map((row) => ({
    ...row,
    reviewKey: JSON.stringify([draft.key, tab, row.ROW_KEY]),
    draftKey: draft.key,
    invoiceLabel: draft.label,
    locked: tab === "posting" ? draft.postingLocked : draft.cogsLocked,
    amountRole: tab === "posting" && (Number(row.VAT_AMOUNT ?? 0) !== 0 || Number(row.FO_VAT_AMOUNT ?? 0) !== 0 || row.DETAIL_DESCRIPTION_VIET.endsWith("- Tiền thuế"))
      ? "vat" : tab === "posting" && (Number(row.VAT_TAXABLE_AMOUNT ?? 0) !== 0 || row.DETAIL_DESCRIPTION_VIET.endsWith("- Tiền hàng")) ? "taxable" : "other",
  })))
}

// The review edits domestic amount; keep currency and VAT companion fields in sync.
export function updateReviewAmount(row: ChitDetail & { amountRole?: VatVoucherReviewRow["amountRole"] }, amount: number): Partial<ChitDetail> {
  const foreign = Boolean(row.FC_TYPE && row.FC_TYPE.toUpperCase() !== "VND")
  const rate = foreign ? Number(row.FC_RATE) : 1
  if (!Number.isFinite(amount) || !Number.isFinite(rate) || rate <= 0) {
    throw new Error("Số tiền hoặc tỷ giá không hợp lệ.")
  }
  const fcAmount = amount / rate
  return {
    AMOUNT: amount,
    FC_AMOUNT: fcAmount,
    ...(row.amountRole === "taxable" || Number(row.VAT_TAXABLE_AMOUNT ?? 0) !== 0 ? { VAT_TAXABLE_AMOUNT: amount } : {}),
    ...(row.amountRole === "vat" || Number(row.VAT_AMOUNT ?? 0) !== 0 || Number(row.FO_VAT_AMOUNT ?? 0) !== 0
      ? { VAT_AMOUNT: amount, FO_VAT_AMOUNT: foreign ? fcAmount : 0 }
      : {}),
  }
}

export function applyReviewRows(source: ChitDetail[], draftKey: string, rows: VatVoucherReviewRow[]): ChitDetail[] {
  const changes = new Map(rows.filter((row) => row.draftKey === draftKey && !row.locked)
    .map((row) => [row.ROW_KEY, row]))
  return source.map((row) => {
    const change = changes.get(row.ROW_KEY)
    if (!change || row.ISDEL) return row
    // Never copy UI-only identifiers into voucher details.
    const { reviewKey: _key, draftKey: _draft, invoiceLabel: _label, locked: _locked, amountRole: _role, ...detail } = change
    return { ...row, ...detail }
  })
}
