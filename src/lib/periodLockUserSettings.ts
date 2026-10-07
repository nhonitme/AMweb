import type { CogsTransferRuleCode, PeriodLockStepCode, ProfitLossBalanceMethod } from "@/api/periodLockApi"
import type { UserSettingSaveItem } from "@/api/userSettingApi"

export const PERIOD_LOCK_USER_SETTING_KEYS = {
  STEP_CODES: "PERIOD_LOCK_STEP_CODES",
  COGS_RULE: "PERIOD_LOCK_COGS_RULE",
  PL_BALANCE_METHOD: "PERIOD_LOCK_PL_BALANCE_METHOD",
} as const

export const PERIOD_LOCK_USER_SETTING_NOTES = {
  STEP_CODES:
    "Khóa sổ - Bước đã chọn (1-3): FA_PREPAID_LOCK=Bước1 TSCĐ/CP trả trước; COGS_SUMMARY=Bước2 Giá vốn; PROFIT_LOSS_REPORT=Bước3 Lãi lỗ. VALUE: mã cách nhau dấu phẩy",
  COGS_RULE:
    "Khóa sổ - Bước 2 (COGS_SUMMARY): cách chuyển giá vốn. VALUE: 154_TO_155 | 154_TO_632 | 154_TO_155_TO_632",
  PL_BALANCE_METHOD:
    "Khóa sổ - Bước 3 (PROFIT_LOSS_REPORT): cách tính báo cáo lãi lỗ. VALUE: BALANCE_ACCOUNT | BALANCE_ACCOUNT_TWO_SIDE",
} as const

const VALID_STEP_CODES: PeriodLockStepCode[] = [
  "FA_PREPAID_LOCK",
  "COGS_SUMMARY",
  "PROFIT_LOSS_REPORT",
]

const STEP_ORDER: Record<PeriodLockStepCode, number> = {
  FA_PREPAID_LOCK: 1,
  COGS_SUMMARY: 2,
  PROFIT_LOSS_REPORT: 3,
}

const VALID_COGS_RULES: CogsTransferRuleCode[] = ["154_TO_155", "154_TO_155_TO_632", "154_TO_632"]

const VALID_PL_METHODS: ProfitLossBalanceMethod[] = ["BALANCE_ACCOUNT", "BALANCE_ACCOUNT_TWO_SIDE"]

export const DEFAULT_PERIOD_LOCK_STEP_CODES: PeriodLockStepCode[] = [...VALID_STEP_CODES]

export const DEFAULT_PERIOD_LOCK_COGS_RULE: CogsTransferRuleCode = "154_TO_632"

export const DEFAULT_PERIOD_LOCK_PL_BALANCE_METHOD: ProfitLossBalanceMethod =
  "BALANCE_ACCOUNT_TWO_SIDE"

export type PeriodLockResolvedUserSettings = {
  stepCodes: PeriodLockStepCode[]
  cogsRule: CogsTransferRuleCode
  plBalanceMethod: ProfitLossBalanceMethod
}

export function parsePeriodLockStepCodes(value: string | undefined | null): PeriodLockStepCode[] {
  if (!value?.trim()) return []

  const seen = new Set<PeriodLockStepCode>()
  const result: PeriodLockStepCode[] = []

  for (const part of value.split(",")) {
    const code = part.trim() as PeriodLockStepCode
    if (!VALID_STEP_CODES.includes(code) || seen.has(code)) continue
    seen.add(code)
    result.push(code)
  }

  return result.sort((a, b) => STEP_ORDER[a] - STEP_ORDER[b])
}

export function serializePeriodLockStepCodes(codes: PeriodLockStepCode[]): string {
  return [...codes]
    .filter((code) => VALID_STEP_CODES.includes(code))
    .sort((a, b) => STEP_ORDER[a] - STEP_ORDER[b])
    .join(",")
}

export function resolvePeriodLockStepCodes(
  value: string | undefined | null,
  source: string | undefined | null,
): PeriodLockStepCode[] {
  const parsed = parsePeriodLockStepCodes(value)
  if (parsed.length > 0) return parsed
  if (source?.toUpperCase() === "USER") return []
  return [...DEFAULT_PERIOD_LOCK_STEP_CODES]
}

export function resolvePeriodLockCogsRule(
  value: string | undefined | null,
): CogsTransferRuleCode {
  const normalized = value?.trim() as CogsTransferRuleCode | undefined
  if (normalized && VALID_COGS_RULES.includes(normalized)) return normalized
  return DEFAULT_PERIOD_LOCK_COGS_RULE
}

export function resolvePeriodLockPlBalanceMethod(
  value: string | undefined | null,
): ProfitLossBalanceMethod {
  const normalized = value?.trim() as ProfitLossBalanceMethod | undefined
  if (normalized && VALID_PL_METHODS.includes(normalized)) return normalized
  return DEFAULT_PERIOD_LOCK_PL_BALANCE_METHOD
}

export function buildPeriodLockUserSettingSaveItems(input: {
  stepCodes: PeriodLockStepCode[]
  cogsRule: CogsTransferRuleCode
  plBalanceMethod: ProfitLossBalanceMethod
}): UserSettingSaveItem[] {
  return [
    {
      KEY_NAME: PERIOD_LOCK_USER_SETTING_KEYS.STEP_CODES,
      VALUE: serializePeriodLockStepCodes(input.stepCodes),
      NOTE: PERIOD_LOCK_USER_SETTING_NOTES.STEP_CODES,
    },
    {
      KEY_NAME: PERIOD_LOCK_USER_SETTING_KEYS.COGS_RULE,
      VALUE: input.cogsRule,
      NOTE: PERIOD_LOCK_USER_SETTING_NOTES.COGS_RULE,
    },
    {
      KEY_NAME: PERIOD_LOCK_USER_SETTING_KEYS.PL_BALANCE_METHOD,
      VALUE: input.plBalanceMethod,
      NOTE: PERIOD_LOCK_USER_SETTING_NOTES.PL_BALANCE_METHOD,
    },
  ]
}
