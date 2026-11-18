import axios from "./axiosClient"
import API_BASE_URL from "../config/apiConfig"

const BASE_URL = `${API_BASE_URL}/AiSystem`
const RULE_URL = `${API_BASE_URL}/AiPostingRule`

type ApiEnvelope<T> = {
  Data?: T
  data?: T
  Message?: string
  message?: string
}

export type AiLicenseStatus = {
  hasLicense: boolean
  isActive: boolean
  isInited: boolean
  canInit: boolean
  canUseAi: boolean
  beginDate?: string | null
  endDate?: string | null
  stopMsg?: string | null
  userLimit: number
}

export type AiInitStepResult = {
  step: string
  success: boolean
  message?: string | null
}

export type AiInitResult = {
  success: boolean
  message?: string | null
  steps: AiInitStepResult[]
  status?: AiLicenseStatus | null
}

export type AiSuggestAccountItemRequest = {
  lineKey: string
  tenHang: string
  tenKh?: string
  loaiHoaDon?: string
}

export type AiSuggestAccountItemResult = {
  lineKey: string
  debit?: string | null
  credit?: string | null
  reason?: string | null
}

export type AiSuggestAccountsResponse = {
  items: AiSuggestAccountItemResult[]
}

export type AiPostingRuleListItem = {
  ruleId: number
  ruleCd: string
  ruleNm: string
  ruleScope: string
  ruleLevel: string
  businessType: string
  priority: number
  isDefault: boolean
}

export type AiPostingRuleCondition = {
  conditionId?: number
  fieldNm: string
  operator: string
  value1?: string | null
  value2?: string | null
  matchCaseYn?: string
  requiredYn?: string
  score?: number
  sort?: number
  description?: string | null
}

export type AiPostingRuleAction = {
  actionId?: number
  actionType: string
  debitAccCd?: string | null
  creditAccCd?: string | null
  sort?: number
  description?: string | null
}

export type AiPostingRuleDetail = {
  ruleId: number
  ruleCd: string
  ruleNm: string
  ruleScope: string
  ruleLevel: string
  businessType: string
  priority: number
  confidenceMin: number
  processInventoryFlag: string
  needAssetProfileFlag: string
  note?: string | null
  isDefault: boolean
  conditions: AiPostingRuleCondition[]
  actions: AiPostingRuleAction[]
}

function unwrap<T>(payload: ApiEnvelope<T> | T): T {
  if (!payload || typeof payload !== "object") {
    throw new Error("Invalid API response")
  }
  const envelope = payload as ApiEnvelope<T>
  return (envelope.Data ?? envelope.data ?? payload) as T
}

function normalizeStatus(raw: Record<string, unknown>): AiLicenseStatus {
  return {
    hasLicense: Boolean(raw.hasLicense ?? raw.HasLicense),
    isActive: Boolean(raw.isActive ?? raw.IsActive),
    isInited: Boolean(raw.isInited ?? raw.IsInited),
    canInit: Boolean(raw.canInit ?? raw.CanInit),
    canUseAi: Boolean(raw.canUseAi ?? raw.CanUseAi),
    beginDate: (raw.beginDate ?? raw.BeginDate ?? null) as string | null,
    endDate: (raw.endDate ?? raw.EndDate ?? null) as string | null,
    stopMsg: (raw.stopMsg ?? raw.StopMsg ?? null) as string | null,
    userLimit: Number(raw.userLimit ?? raw.UserLimit ?? 0),
  }
}

export async function getAiLicenseStatus(): Promise<AiLicenseStatus> {
  const response = await axios.get(`${BASE_URL}/status`)
  return normalizeStatus(unwrap(response.data) as Record<string, unknown>)
}

export async function initAiSystem(): Promise<AiInitResult> {
  const response = await axios.post(`${BASE_URL}/init`)
  const raw = unwrap(response.data) as Record<string, unknown>
  const stepsRaw = (raw.steps ?? raw.Steps ?? []) as Array<Record<string, unknown>>
  return {
    success: Boolean(raw.success ?? raw.Success),
    message: (raw.message ?? raw.Message ?? null) as string | null,
    steps: stepsRaw.map((step) => ({
      step: String(step.step ?? step.Step ?? ""),
      success: Boolean(step.success ?? step.Success),
      message: (step.message ?? step.Message ?? null) as string | null,
    })),
    status: raw.status || raw.Status
      ? normalizeStatus((raw.status ?? raw.Status) as Record<string, unknown>)
      : null,
  }
}

export async function suggestAiAccounts(
  items: AiSuggestAccountItemRequest[],
): Promise<AiSuggestAccountsResponse> {
  const response = await axios.post(`${BASE_URL}/suggest-accounts`, { items })
  const raw = unwrap(response.data) as Record<string, unknown>
  const list = (raw.items ?? raw.Items ?? []) as Array<Record<string, unknown>>
  return {
    items: list.map((item) => ({
      lineKey: String(item.lineKey ?? item.LineKey ?? ""),
      debit: (item.debit ?? item.Debit ?? null) as string | null,
      credit: (item.credit ?? item.Credit ?? null) as string | null,
      reason: (item.reason ?? item.Reason ?? null) as string | null,
    })),
  }
}

export async function getAiPostingRules(): Promise<AiPostingRuleListItem[]> {
  const response = await axios.get(RULE_URL)
  const raw = unwrap(response.data) as Record<string, unknown>
  const list = (raw.data ?? raw.Data ?? raw) as Array<Record<string, unknown>>
  if (!Array.isArray(list)) return []
  return list.map((item) => ({
    ruleId: Number(item.ruleId ?? item.RuleId ?? 0),
    ruleCd: String(item.ruleCd ?? item.RuleCd ?? ""),
    ruleNm: String(item.ruleNm ?? item.RuleNm ?? ""),
    ruleScope: String(item.ruleScope ?? item.RuleScope ?? ""),
    ruleLevel: String(item.ruleLevel ?? item.RuleLevel ?? ""),
    businessType: String(item.businessType ?? item.BusinessType ?? ""),
    priority: Number(item.priority ?? item.Priority ?? 0),
    isDefault: Boolean(item.isDefault ?? item.IsDefault),
  }))
}

export async function getAiPostingRuleDetail(ruleId: number): Promise<AiPostingRuleDetail> {
  const response = await axios.get(`${RULE_URL}/${ruleId}`)
  return unwrap(response.data) as AiPostingRuleDetail
}

export async function saveAiPostingRule(rule: AiPostingRuleDetail): Promise<AiPostingRuleDetail> {
  const response = await axios.post(RULE_URL, rule)
  return unwrap(response.data) as AiPostingRuleDetail
}

export async function deleteAiPostingRule(ruleId: number): Promise<void> {
  await axios.delete(`${RULE_URL}/${ruleId}`)
}
