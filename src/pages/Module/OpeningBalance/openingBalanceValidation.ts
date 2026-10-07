/** Shared opening-balance amount rules (mirrors API OpeningBalanceValidation). */
export type OpeningBalanceAmountFields = {
  DEBIT?: number | null
  CREDIT?: number | null
  DEBIT_FC?: number | null
  CREDIT_FC?: number | null
  EXCHANGE_RATE?: number | null
}

export const getOpeningBalanceAmountErrorKey = (
  row: OpeningBalanceAmountFields,
): string | null => {
  const debit = Number(row.DEBIT || 0)
  const credit = Number(row.CREDIT || 0)
  const debitFc = Number(row.DEBIT_FC || 0)
  const creditFc = Number(row.CREDIT_FC || 0)
  const exchangeRate = Number(row.EXCHANGE_RATE || 0)

  if (debit > 0 && credit > 0) return "DEBIT_CREDIT_EXCLUSIVE"
  if (debit < 0 || credit < 0) return "AMOUNT_NOT_NEGATIVE"
  if (debitFc < 0 || creditFc < 0) return "FC_AMOUNT_NOT_NEGATIVE"
  if (exchangeRate < 0) return "EXCHANGE_RATE_NOT_NEGATIVE"
  return null
}

export const openingBalanceAmountErrorMessage = (
  t: (key: string, fallback: string) => string,
  row: OpeningBalanceAmountFields,
): string | null => {
  const key = getOpeningBalanceAmountErrorKey(row)
  if (!key) return null
  const fallbacks: Record<string, string> = {
    DEBIT_CREDIT_EXCLUSIVE: "Không được nhập đồng thời cả Nợ và Có",
    AMOUNT_NOT_NEGATIVE: "Số tiền không được âm",
    FC_AMOUNT_NOT_NEGATIVE: "Số tiền ngoại tệ không được âm",
    EXCHANGE_RATE_NOT_NEGATIVE: "Tỷ giá không được âm",
  }
  return t(key, fallbacks[key] ?? key)
}
