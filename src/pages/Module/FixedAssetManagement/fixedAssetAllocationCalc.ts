import type { FixedAssetAllocationRow } from '@/types/fixedAsset'

/** Match FixedAssetDepreciationCalculator.RoundMoney (0 dp, AwayFromZero). */
export const FA_MONEY_DECIMALS = 0
export const FA_ALLOC_AMOUNT_TOLERANCE = 1
export const FA_ALLOC_RATE_TOLERANCE = 0.0001

export type DepreciationHeaderAmounts = {
  FIRST_DEPRE_AMT: number
  NORMAL_DEPRE_AMT: number
  LAST_DEPRE_AMT: number
}

export type AllocationAmountTotals = {
  firstTotal: number
  normalTotal: number
  lastTotal: number
  rateTotal: number
}

export type FaMessageTranslate = (key: string, fallback?: string) => string

export const formatFaMessage = (template: string, values: readonly (string | number)[]): string =>
  values.reduce<string>(
    (text, value, index) => text.split(`{${index}}`).join(String(value)),
    template,
  )

const tr = (translate: FaMessageTranslate, key: string, fallback: string): string =>
  translate(key, fallback) || fallback

const toNumber = (value: unknown): number => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    return Number.isFinite(parsed) ? parsed : 0
  }
  return 0
}

const getActiveRows = (rows: readonly FixedAssetAllocationRow[]): FixedAssetAllocationRow[] =>
  rows.filter((row) => !row.ISDEL)

export const roundFaMoney = (value: number): number => {
  if (!Number.isFinite(value)) return 0
  const sign = value < 0 ? -1 : 1
  return sign * Math.round(Math.abs(value))
}

export const formatFaMoney = (value: number): string =>
  roundFaMoney(value).toLocaleString('vi-VN')

export const calcAllocAmountsFromRate = (
  header: DepreciationHeaderAmounts,
  rate: number,
): { FIRST_ALLOC_AMT: number; NORMAL_ALLOC_AMT: number; LAST_ALLOC_AMT: number } => ({
  FIRST_ALLOC_AMT: roundFaMoney((toNumber(header.FIRST_DEPRE_AMT) * rate) / 100),
  NORMAL_ALLOC_AMT: roundFaMoney((toNumber(header.NORMAL_DEPRE_AMT) * rate) / 100),
  LAST_ALLOC_AMT: roundFaMoney((toNumber(header.LAST_DEPRE_AMT) * rate) / 100),
})

export const sumActiveAllocationAmounts = (
  rows: readonly FixedAssetAllocationRow[],
): AllocationAmountTotals => {
  const active = getActiveRows(rows)
  return active.reduce<AllocationAmountTotals>(
    (acc, row) => ({
      firstTotal: acc.firstTotal + toNumber(row.FIRST_ALLOC_AMT),
      normalTotal: acc.normalTotal + toNumber(row.NORMAL_ALLOC_AMT),
      lastTotal: acc.lastTotal + toNumber(row.LAST_ALLOC_AMT),
      rateTotal: acc.rateTotal + toNumber(row.ALLOC_RATE),
    }),
    { firstTotal: 0, normalTotal: 0, lastTotal: 0, rateTotal: 0 },
  )
}

const buildMismatchMessage = (
  translate: FaMessageTranslate,
  labelKey: string,
  labelFallback: string,
  allocated: number,
  required: number,
): string | null => {
  const diff = roundFaMoney(allocated - required)
  if (Math.abs(diff) <= FA_ALLOC_AMOUNT_TOLERANCE) {
    return null
  }

  const values = [
    tr(translate, labelKey, labelFallback),
    formatFaMoney(allocated),
    formatFaMoney(required),
    formatFaMoney(Math.abs(diff)),
  ]

  if (diff < 0) {
    return formatFaMessage(
      tr(
        translate,
        'FA_ALLOC_AMT_SHORT',
        'Tổng {0} đang phân bổ: {1}. Số tiền cần phân bổ: {2}. Còn thiếu: {3}.',
      ),
      values,
    )
  }

  return formatFaMessage(
    tr(
      translate,
      'FA_ALLOC_AMT_OVER',
      'Tổng {0} đang phân bổ: {1}. Số tiền cần phân bổ: {2}. Đang vượt: {3}.',
    ),
    values,
  )
}

export const getAllocationAmountMismatchMessages = (
  header: DepreciationHeaderAmounts,
  rows: readonly FixedAssetAllocationRow[],
  translate: FaMessageTranslate,
): string[] => {
  const totals = sumActiveAllocationAmounts(rows)
  return [
    buildMismatchMessage(
      translate,
      'FIRST_ALLOC_AMT',
      'Tiền đầu',
      totals.firstTotal,
      toNumber(header.FIRST_DEPRE_AMT),
    ),
    buildMismatchMessage(
      translate,
      'NORMAL_ALLOC_AMT',
      'Tiền giữa',
      totals.normalTotal,
      toNumber(header.NORMAL_DEPRE_AMT),
    ),
    buildMismatchMessage(
      translate,
      'LAST_ALLOC_AMT',
      'Tiền cuối',
      totals.lastTotal,
      toNumber(header.LAST_DEPRE_AMT),
    ),
  ].filter((message): message is string => Boolean(message))
}

export const applyRateToAllocationRow = (
  row: FixedAssetAllocationRow,
  header: DepreciationHeaderAmounts,
  rate: number,
): FixedAssetAllocationRow => {
  const amounts = calcAllocAmountsFromRate(header, rate)
  return {
    ...row,
    ALLOC_RATE: rate,
    ...amounts,
  }
}

/**
 * AMOUNT + exactly one active row: copy header KH đầu/giữa/cuối onto that row.
 * Returns null when the rule does not apply (keeps existing multi-row AMOUNT flow).
 */
export const applyHeaderAmountsToSingleAmountRow = (
  rows: readonly FixedAssetAllocationRow[],
  header: DepreciationHeaderAmounts,
): FixedAssetAllocationRow[] | null => {
  const active = getActiveRows(rows)
  if (active.length !== 1) {
    return null
  }

  const only = active[0]
  if (String(only.ALLOC_TYPE ?? '').trim().toUpperCase() !== 'AMOUNT') {
    return null
  }

  const updated: FixedAssetAllocationRow = {
    ...only,
    FIRST_ALLOC_AMT: roundFaMoney(toNumber(header.FIRST_DEPRE_AMT)),
    NORMAL_ALLOC_AMT: roundFaMoney(toNumber(header.NORMAL_DEPRE_AMT)),
    LAST_ALLOC_AMT: roundFaMoney(toNumber(header.LAST_DEPRE_AMT)),
  }

  return rows.map((row) => (row.ROW_KEY === only.ROW_KEY ? updated : { ...row }))
}

/** Recalculate amounts on existing active PERCENT rows only (never inserts rows).
 * Non-last rows use AwayFromZero rounding; last active row by ALLOC_SEQ receives remainder
 * so column totals match the header. If rounding would make the last row negative,
 * non-last rows are recomputed with truncation so the remainder stays >= 0.
 */
export const reallocatePercentRows = (
  rows: readonly FixedAssetAllocationRow[],
  header: DepreciationHeaderAmounts,
): FixedAssetAllocationRow[] => {
  const active = getActiveRows(rows)
    .slice()
    .sort((a, b) => a.ALLOC_SEQ - b.ALLOC_SEQ)

  if (active.length === 0) {
    return rows.map((row) => ({ ...row }))
  }

  const activeKeys = new Set(active.map((row) => row.ROW_KEY))
  const lastKey = active[active.length - 1].ROW_KEY
  const firstHeader = toNumber(header.FIRST_DEPRE_AMT)
  const normalHeader = toNumber(header.NORMAL_DEPRE_AMT)
  const lastHeader = toNumber(header.LAST_DEPRE_AMT)

  const buildUpdated = (
    allocNonLast: (headerAmt: number, rate: number) => number,
  ): Map<string, FixedAssetAllocationRow> => {
    let firstSum = 0
    let normalSum = 0
    let lastSum = 0
    const updatedByKey = new Map<string, FixedAssetAllocationRow>()

    for (const row of active) {
      const rate = toNumber(row.ALLOC_RATE)
      if (row.ROW_KEY === lastKey) {
        updatedByKey.set(row.ROW_KEY, {
          ...row,
          ALLOC_RATE: rate,
          FIRST_ALLOC_AMT: roundFaMoney(firstHeader - firstSum),
          NORMAL_ALLOC_AMT: roundFaMoney(normalHeader - normalSum),
          LAST_ALLOC_AMT: roundFaMoney(lastHeader - lastSum),
        })
        continue
      }

      const firstAmt = allocNonLast(firstHeader, rate)
      const normalAmt = allocNonLast(normalHeader, rate)
      const lastAmt = allocNonLast(lastHeader, rate)
      firstSum += firstAmt
      normalSum += normalAmt
      lastSum += lastAmt
      updatedByKey.set(row.ROW_KEY, {
        ...row,
        ALLOC_RATE: rate,
        FIRST_ALLOC_AMT: firstAmt,
        NORMAL_ALLOC_AMT: normalAmt,
        LAST_ALLOC_AMT: lastAmt,
      })
    }

    return updatedByKey
  }

  const truncMoney = (headerAmt: number, rate: number): number => {
    const raw = (headerAmt * rate) / 100
    if (!Number.isFinite(raw)) return 0
    return raw < 0 ? Math.ceil(raw) : Math.floor(raw)
  }

  let updatedByKey = buildUpdated((headerAmt, rate) =>
    roundFaMoney((headerAmt * rate) / 100),
  )
  const lastRow = updatedByKey.get(lastKey)
  if (
    lastRow &&
    (toNumber(lastRow.FIRST_ALLOC_AMT) < 0 ||
      toNumber(lastRow.NORMAL_ALLOC_AMT) < 0 ||
      toNumber(lastRow.LAST_ALLOC_AMT) < 0)
  ) {
    updatedByKey = buildUpdated(truncMoney)
  }

  return rows.map((row) => {
    if (!activeKeys.has(row.ROW_KEY)) {
      return { ...row }
    }
    return updatedByKey.get(row.ROW_KEY) ?? { ...row }
  })
}

export const formatAllocationSummaryPair = (
  allocated: number,
  required: number,
  translate: FaMessageTranslate,
): string => {
  const allocatedText = formatFaMoney(allocated)
  const diff = roundFaMoney(allocated - required)
  if (Math.abs(diff) <= FA_ALLOC_AMOUNT_TOLERANCE) {
    return allocatedText
  }
  if (diff < 0) {
    return formatFaMessage(tr(translate, 'FA_ALLOC_SUMMARY_SHORT', '{0} (thiếu {1})'), [
      allocatedText,
      formatFaMoney(-diff),
    ])
  }
  return formatFaMessage(tr(translate, 'FA_ALLOC_SUMMARY_OVER', '{0} (vượt {1})'), [
    allocatedText,
    formatFaMoney(diff),
  ])
}
