/** User-setting keys that decide OT → IR vs IO when opening Hàng tồn kho. */
export const OT_INVENTORY_RECEIPT_ACCOUNT_PAIRS = "OT_INVENTORY_RECEIPT_ACCOUNT_PAIRS"
export const OT_INVENTORY_ISSUE_ACCOUNT_PAIRS = "OT_INVENTORY_ISSUE_ACCOUNT_PAIRS"

export const OT_INVENTORY_ACCOUNT_PAIR_KEYS = [
  OT_INVENTORY_RECEIPT_ACCOUNT_PAIRS,
  OT_INVENTORY_ISSUE_ACCOUNT_PAIRS,
] as const

export type AccountPairToken = {
  debitPrefix: string | null
  creditPrefix: string | null
}

/** Parse VALUE like "621/152,624/,/156". Tokens without '/' or with both sides empty are skipped. */
export function parseAccountPairTokens(value?: string | null): AccountPairToken[] {
  if (!value || !String(value).trim()) {
    return []
  }

  const results: AccountPairToken[] = []
  for (const rawPart of String(value).split(",")) {
    const part = rawPart.trim()
    if (!part) continue

    const slashIndex = part.indexOf("/")
    if (slashIndex < 0) continue

    const debit = part.slice(0, slashIndex).trim()
    const credit = part.slice(slashIndex + 1).trim()
    if (!debit && !credit) continue

    results.push({
      debitPrefix: debit || null,
      creditPrefix: credit || null,
    })
  }
  return results
}

function startsWithPrefix(value: string, prefix: string | null): boolean {
  if (!prefix) return true
  return value.startsWith(prefix)
}

/** Match score: 0 = no match; 1 = one-side token; 2 = both-side token. */
export function accountPairMatchScore(
  token: AccountPairToken,
  debit: string,
  credit: string,
): number {
  const debitOk = startsWithPrefix(debit, token.debitPrefix)
  const creditOk = startsWithPrefix(credit, token.creditPrefix)
  if (!debitOk || !creditOk) return 0
  return (token.debitPrefix ? 1 : 0) + (token.creditPrefix ? 1 : 0)
}

export function bestAccountPairMatchScore(
  tokens: readonly AccountPairToken[],
  debit: string,
  credit: string,
): number {
  let best = 0
  for (const token of tokens) {
    const score = accountPairMatchScore(token, debit, credit)
    if (score > best) best = score
  }
  return best
}

/**
 * Resolve OT inventory direction from detail accounts vs the two user_setting keys.
 * Higher match score wins; equal positive scores → null (ambiguous).
 */
export function resolveOtInventoryChitType(
  debit: string | null | undefined,
  credit: string | null | undefined,
  receiptPairsValue: string | null | undefined,
  issuePairsValue: string | null | undefined,
): "IR" | "IO" | null {
  const normalizedDebit = String(debit ?? "").trim()
  const normalizedCredit = String(credit ?? "").trim()
  const receiptScore = bestAccountPairMatchScore(
    parseAccountPairTokens(receiptPairsValue),
    normalizedDebit,
    normalizedCredit,
  )
  const issueScore = bestAccountPairMatchScore(
    parseAccountPairTokens(issuePairsValue),
    normalizedDebit,
    normalizedCredit,
  )

  if (receiptScore <= 0 && issueScore <= 0) return null
  if (receiptScore > issueScore) return "IR"
  if (issueScore > receiptScore) return "IO"
  return null
}
