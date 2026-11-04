import type { CashflowFormulaOptionRow } from "@/api/reportFormulaOptionApi"

export type DataSourceOption = {
  value: string
  label: string
}

export type FlowSignOption = {
  value: number
  label: string
}

export type TranslateFn = (key: string, fallback: string) => string
export type DataSourceMode = "cashflow" | "accountRule" | "vat"
export type ReportKind = "balance" | "profit" | "cost"
export const EMPTY_ACCOUNT_PREFIXES = "111,112,113"

export function getDataSourceOptions(t: TranslateFn, mode: "cashflow" | "accountRule" | "vat"): DataSourceOption[] {
  if (mode === "vat") {
    return [
      { value: "MANUAL", label: t("DATA_SOURCE_MANUAL_VAT", "Nhập tay / lấy từ dữ liệu") },
      { value: "FORMULA", label: t("DATA_SOURCE_FORMULA", "Cộng trừ các chỉ tiêu khác") },
      { value: "HEADER", label: t("DATA_SOURCE_HEADER", "Tiêu đề nhóm") },
    ]
  }

  if (mode === "accountRule") {
    return [
      { value: "ACCOUNT_RULE", label: t("DATA_SOURCE_ACCOUNT_RULE", "Lấy số từ sổ cái theo tài khoản") },
      { value: "FORMULA", label: t("DATA_SOURCE_FORMULA", "Cộng trừ các chỉ tiêu khác") },
      { value: "MANUAL", label: t("DATA_SOURCE_MANUAL", "Tiêu đề / không lấy số") },
    ]
  }

  return [
    { value: "PROCEDURE", label: t("DATA_SOURCE_PROCEDURE", "Lấy số từ sổ cái theo tài khoản") },
    { value: "FORMULA", label: t("DATA_SOURCE_FORMULA", "Cộng trừ các chỉ tiêu khác") },
    { value: "MANUAL", label: t("DATA_SOURCE_MANUAL", "Tiêu đề / không lấy số") },
  ]
}

export function getVatCalcMethodOptions(t: TranslateFn): DataSourceOption[] {
  return [
    { value: "MANUAL", label: t("VAT_CALC_MANUAL", "Nhập tay") },
    { value: "FORMULA", label: t("VAT_CALC_FORMULA", "Công thức") },
    { value: "FORMULA_POSITIVE", label: t("VAT_CALC_FORMULA_POSITIVE", "Công thức (≥0)") },
    { value: "FORMULA_NEGATIVE", label: t("VAT_CALC_FORMULA_NEGATIVE", "Công thức (≤0)") },
  ]
}

export function getElementTypeOptions(t: TranslateFn): DataSourceOption[] {
  return [
    { value: "DETAIL", label: t("ROW_TYPE_DETAIL", "Chỉ tiêu thường") },
    { value: "TOTAL", label: t("ROW_TYPE_TOTAL", "Chỉ tiêu tổng") },
    { value: "SECTION", label: t("ROW_TYPE_SECTION", "Tiêu đề nhóm") },
  ]
}

export function getCalcMethodOptions(t: TranslateFn, reportKind: "balance" | "profit" | "cost"): DataSourceOption[] {
  if (reportKind === "profit") {
    return [
      {
        value: "CREDIT_MINUS_DEBIT",
        label: t("CALC_METHOD_CREDIT_MINUS_DEBIT_PL", "Phát sinh Có − Nợ"),
      },
      {
        value: "DEBIT_MINUS_CREDIT",
        label: t("CALC_METHOD_DEBIT_MINUS_CREDIT_PL", "Phát sinh Nợ − Có"),
      },
      {
        value: "CREDIT_ONLY",
        label: t("CALC_METHOD_CREDIT_ONLY_PL", "Chỉ lấy phát sinh Có"),
      },
      {
        value: "DEBIT_ONLY",
        label: t("CALC_METHOD_DEBIT_ONLY_PL", "Chỉ lấy phát sinh Nợ"),
      },
    ]
  }

  if (reportKind === "cost") {
    return [
      {
        value: "DEBIT_MINUS_CREDIT",
        label: t("CALC_METHOD_DEBIT_MINUS_CREDIT_PL", "Phát sinh Nợ − Có"),
      },
      {
        value: "CREDIT_MINUS_DEBIT",
        label: t("CALC_METHOD_CREDIT_MINUS_DEBIT_PL", "Phát sinh Có − Nợ"),
      },
      {
        value: "DEBIT_ONLY",
        label: t("CALC_METHOD_DEBIT_ONLY_PL", "Chỉ lấy phát sinh Nợ"),
      },
      {
        value: "CREDIT_ONLY",
        label: t("CALC_METHOD_CREDIT_ONLY_PL", "Chỉ lấy phát sinh Có"),
      },
      {
        value: "OPENING_BALANCE",
        label: t("CALC_METHOD_OPENING_BALANCE", "Số dư đầu kỳ"),
      },
      {
        value: "CLOSING_BALANCE",
        label: t("CALC_METHOD_CLOSING_BALANCE", "Số dư cuối kỳ"),
      },
    ]
  }

  return [
    {
      value: "DEBIT_MINUS_CREDIT",
      label: t("CALC_METHOD_DEBIT_MINUS_CREDIT_BS", "Dư Nợ (Nợ − Có)"),
    },
    {
      value: "CREDIT_MINUS_DEBIT",
      label: t("CALC_METHOD_CREDIT_MINUS_DEBIT_BS", "Dư Có (Có − Nợ)"),
    },
    {
      value: "DEBIT_ONLY",
      label: t("CALC_METHOD_DEBIT_ONLY_BS", "Chỉ lấy dư Nợ"),
    },
    {
      value: "CREDIT_ONLY",
      label: t("CALC_METHOD_CREDIT_ONLY_BS", "Chỉ lấy dư Có"),
    },
  ]
}

export function getCalcMethodLabel(calcMethod: string, t: TranslateFn, reportKind: "balance" | "profit" | "cost"): string {
  const normalized = calcMethod.trim().toUpperCase()
  if (!normalized) {
    return ""
  }

  return getCalcMethodOptions(t, reportKind).find((option) => option.value === normalized)?.label
    || normalized
}

export function formatAccountRuleDisplay(
  accountRule: string,
  calcMethod: string,
  t: TranslateFn,
  reportKind: "balance" | "profit" | "cost",
): string {
  const accounts = accountRule.trim()
  if (!accounts) {
    return t("DATA_SOURCE_ACCOUNT_RULE", "Lấy số từ sổ cái theo tài khoản")
  }

  const methodLabel = getCalcMethodLabel(calcMethod, t, reportKind)
  return methodLabel ? `${accounts} (${methodLabel})` : accounts
}

export function getFlowSignOptions(t: TranslateFn): FlowSignOption[] {
  return [
    {
      value: 1,
      label: t("CASHFLOW_FLOW_IN", "Thu tiền: Nợ TK tiền / Có TK đối ứng"),
    },
    {
      value: -1,
      label: t("CASHFLOW_FLOW_OUT", "Chi tiền: Có TK tiền / Nợ TK đối ứng"),
    },
  ]
}

export function getDataSourceLabel(sourceType: string, t: TranslateFn, mode: "cashflow" | "accountRule" | "vat"): string {
  const normalized = sourceType.trim().toUpperCase()
  if (mode === "accountRule" && (normalized === "PROCEDURE" || normalized === "ACCOUNT_RULE")) {
    return t("DATA_SOURCE_ACCOUNT_RULE", "Lấy số từ sổ cái theo tài khoản")
  }

  return getDataSourceOptions(t, mode).find((option) => option.value === normalized)?.label
    || normalized
    || "—"
}

export function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

export function normalizeFlag(value: unknown, fallback = "0"): string {
  if (value === "1" || value === 1 || value === true) {
    return "1"
  }

  if (value === "0" || value === 0 || value === false) {
    return "0"
  }

  return fallback
}

export function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback
}

export function normalizeRow(row: CashflowFormulaOptionRow, index: number): CashflowFormulaOptionRow {
  const itemKey = normalizeText(row.ITEM_KEY) || `ROW_${index + 1}`
  const itemCode = normalizeText(row.ITEM_CODE)
  const rawAccountRule = normalizeText(row.ACCOUNT_RULE)
  const signedFromLegacy = parseDirectRuleAccountPayload(rawAccountRule)
  const accountRule = signedFromLegacy
    ? buildSignedAccountRule(signedFromLegacy.plus.join(","), signedFromLegacy.minus.join(","))
    : rawAccountRule

  return {
    ...row,
    ID: typeof row.ID === "number" && Number.isFinite(row.ID) ? row.ID : null,
    ITEM_KEY: itemKey,
    ITEM_CODE: itemCode,
    CAPTION: normalizeText(row.CAPTION) || normalizeText(row.ITEM_NAME),
    LABEL_TEXT: normalizeText(row.LABEL_TEXT),
    ELEMENT_TYPE: normalizeText(row.ELEMENT_TYPE).toUpperCase() || "DETAIL",
    LEVEL_NO: toPositiveInteger(row.LEVEL_NO, 1),
    DATA_SOURCE_TYPE: normalizeText(row.DATA_SOURCE_TYPE).toUpperCase() || "MANUAL",
    FORMULA_EXPR: normalizeText(row.FORMULA_EXPR),
    CODE_NO1: normalizeText(row.CODE_NO1),
    CODE_NO2: normalizeText(row.CODE_NO2),
    FORMULA_NO1: normalizeText(row.FORMULA_NO1),
    FORMULA_NO2: normalizeText(row.FORMULA_NO2),
    CALC_METHOD_NO1: normalizeText(row.CALC_METHOD_NO1).toUpperCase(),
    CALC_METHOD_NO2: normalizeText(row.CALC_METHOD_NO2).toUpperCase(),
    ACCOUNT_RULE: accountRule,
    CALC_METHOD: normalizeText(row.CALC_METHOD),
    FORMULA_DISPLAY: normalizeText(row.FORMULA_DISPLAY),
    DIRECT_RULE_FLOW_SIGN: row.DIRECT_RULE_FLOW_SIGN === -1 || row.DIRECT_RULE_FLOW_SIGN === 1
      ? row.DIRECT_RULE_FLOW_SIGN
      : 1,
    DIRECT_RULE_ACC_PREFIX: normalizeText(row.DIRECT_RULE_ACC_PREFIX),
    DIRECT_RULE_PRIORITY: toPositiveInteger(row.DIRECT_RULE_PRIORITY, index + 1),
    DIRECT_RULE_FLOW_SIGN_2: row.DIRECT_RULE_FLOW_SIGN_2 === -1 || row.DIRECT_RULE_FLOW_SIGN_2 === 1
      ? row.DIRECT_RULE_FLOW_SIGN_2
      : -1,
    DIRECT_RULE_ACC_PREFIX_2: normalizeText(row.DIRECT_RULE_ACC_PREFIX_2),
    DIRECT_RULE_PRIORITY_2: toPositiveInteger(row.DIRECT_RULE_PRIORITY_2, index + 1),
    SORT_ORDER: toPositiveInteger(row.SORT_ORDER, (index + 1) * 10),
    FONT_BOLD: normalizeFlag(row.FONT_BOLD),
    FONT_ITALIC: normalizeFlag(row.FONT_ITALIC),
    IS_VISIBLE: normalizeFlag(row.IS_VISIBLE, "1"),
  }
}

export function cloneRows(rows: CashflowFormulaOptionRow[], allowDuplicateItemCodes = false): CashflowFormulaOptionRow[] {
  const seenKeys = new Set<string>()
  const seenCodes = new Set<string>()
  const uniqueRows: CashflowFormulaOptionRow[] = []

  rows.forEach((row, index) => {
    const normalized = normalizeRow(row, index)
    const itemKey = normalized.ITEM_KEY.toUpperCase()
    const itemCode = normalizeText(normalized.ITEM_CODE).toUpperCase()

    if (seenKeys.has(itemKey)) {
      return
    }

    if (!allowDuplicateItemCodes && itemCode && seenCodes.has(itemCode)) {
      return
    }

    seenKeys.add(itemKey)
    if (itemCode) {
      seenCodes.add(itemCode)
    }

    uniqueRows.push(normalized)
  })

  return uniqueRows
}

export function isUserValueChange(event: { event?: unknown }): boolean {
  return event.event != null
}

export function buildDraftSignature(rows: CashflowFormulaOptionRow[], cashAccountPrefixes: string): string {
  return JSON.stringify({
    cashAccountPrefixes: normalizeText(cashAccountPrefixes),
    rows: rows.map((row) => ({
      ...row,
      ID: row.ID ?? null,
    })),
  })
}

export function getCanonicalReportCode(reportCode: string): string {
  const normalized = reportCode.trim().toUpperCase()
  if (normalized.includes("GTGT") || normalized.includes("VAT_DECLARATION") || normalized === "TAX_VAT_DECLARATION") {
    return "GTGT_01"
  }

  if (normalized.includes("COST_LIST")) {
    return "COST_LIST"
  }

  if (normalized.includes("B01") || normalized.includes("BALANCE")) {
    return "B01_DN"
  }

  if (normalized.includes("B02") || normalized.includes("PROFIT_LOSS") || normalized.includes("_PL")) {
    return "B02_DN"
  }

  if (normalized.includes("_GT") || normalized.endsWith("B03DN_GT")) {
    return "B03_DN_GT"
  }

  if (normalized.includes("_TT") || normalized.includes("B03")) {
    return "B03_DN_TT"
  }

  return normalized
}

export function buildNewItemKey(): string {
  const uniquePart = globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 12)
    ?? `${Date.now()}${Math.floor(Math.random() * 10000)}`
  return `CUSTOM_${uniquePart}`.toUpperCase()
}

export function extractFormulaReferences(formula: string): string[] {
  const normalized = formula.trim()
  const expression = normalized.includes("=") ? normalized.slice(normalized.indexOf("=") + 1) : normalized

  return expression
    .split(/[+\-;]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => term.replace(/^[-+]/, "").trim())
    .filter(Boolean)
}

export function isVatFormulaMethod(calcMethod: string | null | undefined): boolean {
  const method = normalizeText(calcMethod).toUpperCase()
  return method === "FORMULA" || method === "FORMULA_POSITIVE" || method === "FORMULA_NEGATIVE"
}

export function isVatHeaderRow(row: CashflowFormulaOptionRow): boolean {
  const sourceType = normalizeText(row.DATA_SOURCE_TYPE).toUpperCase()
  const elementType = normalizeText(row.ELEMENT_TYPE).toUpperCase()
  return sourceType === "HEADER" || elementType === "HEADER" || elementType === "SECTION"
}

export function isStructuralFormulaRow(row: CashflowFormulaOptionRow): boolean {
  return isVatHeaderRow(row)
}

export function matchesLineFilter(row: CashflowFormulaOptionRow, filter: string): boolean {
  const query = filter.trim().toLowerCase()
  if (!query) {
    return true
  }

  const haystack = [
    row.ITEM_CODE,
    row.CAPTION,
    row.LABEL_TEXT,
    row.CODE_NO1,
    row.CODE_NO2,
    normalizeText(row.CODE_NO1) ? `[${row.CODE_NO1}]` : "",
    normalizeText(row.CODE_NO2) ? `[${row.CODE_NO2}]` : "",
  ]
    .map((value) => normalizeText(value).toLowerCase())
    .join(" ")

  return haystack.includes(query)
}

export function validateDraft(rows: CashflowFormulaOptionRow[], isVatDeclaration = false): string | null {
  if (isVatDeclaration) {
    return validateVatDraft(rows)
  }

  if (rows.length === 0) {
    return "Chưa có chỉ tiêu để xem trước. Hãy đợi tải xong hoặc bấm Tải lại."
  }

  const itemCodes = new Set<string>()

  for (const row of rows) {
    if (isStructuralFormulaRow(row)) {
      continue
    }

    const itemCode = normalizeText(row.ITEM_CODE).toUpperCase()
    if (!itemCode) {
      return "Mỗi chỉ tiêu phải có mã chỉ tiêu trên báo cáo."
    }

    if (itemCodes.has(itemCode)) {
      return `Mã chỉ tiêu ${itemCode} bị trùng. Vui lòng kiểm tra lại.`
    }

    itemCodes.add(itemCode)
  }

  const formulaReferences = new Map<string, string[]>()

  for (const row of rows) {
    if (normalizeText(row.DATA_SOURCE_TYPE).toUpperCase() !== "FORMULA") {
      continue
    }

    const formula = normalizeText(row.FORMULA_EXPR)
    if (!formula) {
      return `Chỉ tiêu ${row.ITEM_CODE} chưa nhập công thức cộng trừ.`
    }

    const itemCode = normalizeText(row.ITEM_CODE).toUpperCase()
    const references = extractFormulaReferences(formula).map((item) => item.toUpperCase())
    if (references.length === 0) {
      return `Công thức chỉ tiêu ${row.ITEM_CODE} chưa tham chiếu mã chỉ tiêu nào.`
    }

    for (const reference of references) {
      if (!itemCodes.has(reference)) {
        return `Công thức ${row.ITEM_CODE} đang tham chiếu mã ${reference} chưa có trong danh sách.`
      }
      if (reference === itemCode) {
        return `Công thức ${row.ITEM_CODE} không được tự tham chiếu chính nó.`
      }
    }

    formulaReferences.set(itemCode, references)
  }

  return validateFormulaCycles(formulaReferences)
}

export function validateVatDraft(rows: CashflowFormulaOptionRow[]): string | null {
  const cellCodes = new Set<string>()
  const formulaReferences = new Map<string, string[]>()

  for (const row of rows) {
    const codeNo1 = normalizeText(row.CODE_NO1).toUpperCase()
    const codeNo2 = normalizeText(row.CODE_NO2).toUpperCase()

    if (codeNo1) {
      if (cellCodes.has(codeNo1)) {
        return `Mã chỉ tiêu ${codeNo1} bị trùng. Vui lòng kiểm tra lại.`
      }
      cellCodes.add(codeNo1)
    }

    if (codeNo2) {
      if (cellCodes.has(codeNo2)) {
        return `Mã chỉ tiêu ${codeNo2} bị trùng. Vui lòng kiểm tra lại.`
      }
      cellCodes.add(codeNo2)
    }
  }

  for (const row of rows) {
    const sides: Array<{ code: string; method: string; formula: string; label: string }> = [
      {
        code: normalizeText(row.CODE_NO1).toUpperCase(),
        method: normalizeText(row.CALC_METHOD_NO1).toUpperCase(),
        formula: normalizeText(row.FORMULA_NO1),
        label: "HHDV",
      },
      {
        code: normalizeText(row.CODE_NO2).toUpperCase(),
        method: normalizeText(row.CALC_METHOD_NO2).toUpperCase(),
        formula: normalizeText(row.FORMULA_NO2),
        label: "Thuế GTGT",
      },
    ]

    for (const side of sides) {
      if (!isVatFormulaMethod(side.method)) {
        continue
      }

      if (!side.code) {
        return `Dòng "${row.CAPTION || row.ITEM_KEY}" cột ${side.label}: cần mã chỉ tiêu khi dùng công thức.`
      }

      if (!side.formula) {
        return `Chỉ tiêu [${side.code}] chưa nhập công thức.`
      }

      const references = extractFormulaReferences(side.formula).map((item) => item.toUpperCase())
      if (references.length === 0) {
        return `Công thức [${side.code}] chưa tham chiếu mã chỉ tiêu nào.`
      }

      for (const reference of references) {
        if (!cellCodes.has(reference)) {
          return `Công thức [${side.code}] đang tham chiếu mã ${reference} chưa có trong danh sách.`
        }
        if (reference === side.code) {
          return `Công thức [${side.code}] không được tự tham chiếu chính nó.`
        }
      }

      formulaReferences.set(side.code, references)
    }
  }

  return validateFormulaCycles(formulaReferences)
}

export function validateFormulaCycles(formulaReferences: Map<string, string[]>): string | null {
  const visiting = new Set<string>()
  const visited = new Set<string>()
  const hasCycle = (itemCode: string): boolean => {
    if (visiting.has(itemCode)) {
      return true
    }
    if (visited.has(itemCode)) {
      return false
    }

    visiting.add(itemCode)
    const cyclic = (formulaReferences.get(itemCode) ?? []).some((reference) => hasCycle(reference))
    visiting.delete(itemCode)
    visited.add(itemCode)
    return cyclic
  }

  for (const itemCode of formulaReferences.keys()) {
    if (hasCycle(itemCode)) {
      return "Các công thức đang tạo thành vòng lặp."
    }
  }

  return null
}

export function parseDirectRuleAccountPayload(value: string): { plus: string[]; minus: string[] } | null {
  const normalized = normalizeText(value)
  if (!normalized.toUpperCase().startsWith("DIRECT_RULE|")) {
    return null
  }

  // Legacy payload: DIRECT_RULE|<flowSign>|<accounts>|<priority>
  const parts = normalized.split("|").map((part) => part.trim())
  const flowSign = Number(parts[1])
  const accounts = (parts[2] ?? "")
    .split(/[,;]/)
    .map((item) => item.trim().replace(/^[+-]/, ""))
    .filter(Boolean)

  if (accounts.length === 0) {
    return { plus: [], minus: [] }
  }

  return flowSign === -1
    ? { plus: [], minus: accounts }
    : { plus: accounts, minus: [] }
}

export function parseSignedAccountRule(value: string | null | undefined): { plus: string; minus: string } {
  const plus: string[] = []
  const minus: string[] = []
  const raw = normalizeText(value)
  const directRule = parseDirectRuleAccountPayload(raw)
  if (directRule) {
    return {
      plus: directRule.plus.join(", "),
      minus: directRule.minus.join(", "),
    }
  }

  raw
    .split(/[,;]/)
    .map((item) => item.trim())
    .filter(Boolean)
    .forEach((item) => {
      // Skip leftover technical tokens that are not account codes.
      if (/^DIRECT_RULE$/i.test(item) || item.includes("|")) {
        return
      }

      const [rawCode, rawSign] = item.split(":").map((part) => part.trim())
      const isNegative = rawCode.startsWith("-") || rawSign === "-1"
      const code = rawCode.replace(/^[+-]/, "").trim()
      if (!code || !/^[0-9A-Za-z]+$/.test(code)) {
        return
      }

      if (isNegative) {
        minus.push(code)
        return
      }

      plus.push(code)
    })

  return { plus: plus.join(", "), minus: minus.join(", ") }
}

export function buildSignedAccountRule(plus: string, minus: string): string {
  const normalizeAccounts = (value: string, sign: "+" | "-") => value
    .split(/[,;]/)
    .map((item) => item.trim().replace(/^[+-]/, ""))
    .filter((item) => /^[0-9A-Za-z]+$/.test(item))
    .map((item) => `${sign}${item}`)

  return [...normalizeAccounts(plus, "+"), ...normalizeAccounts(minus, "-")].join(",")
}

export function formatIndirectAccountRuleDisplay(accountRule: string | null | undefined): string {
  const parsed = parseSignedAccountRule(accountRule)
  const parts: string[] = []
  if (parsed.plus) {
    parts.push(`Cộng: ${parsed.plus}`)
  }
  if (parsed.minus) {
    parts.push(`Trừ: ${parsed.minus}`)
  }

  return parts.join(" · ")
}

export function localizeCalcMethodTokens(text: string, t: TranslateFn, reportKind: "balance" | "profit" | "cost"): string {
  return text
    .replace(/\bDEBIT_MINUS_CREDIT\b/gi, getCalcMethodLabel("DEBIT_MINUS_CREDIT", t, reportKind))
    .replace(/\bCREDIT_MINUS_DEBIT\b/gi, getCalcMethodLabel("CREDIT_MINUS_DEBIT", t, reportKind))
    .replace(/\bDEBIT_ONLY\b/gi, getCalcMethodLabel("DEBIT_ONLY", t, reportKind))
    .replace(/\bCREDIT_ONLY\b/gi, getCalcMethodLabel("CREDIT_ONLY", t, reportKind))
    .replace(/\s*\[([^\]]+)\]\s*$/u, " ($1)")
}

export function buildFormulaDisplay(
  row: CashflowFormulaOptionRow,
  reportCode?: string,
  t?: TranslateFn,
): string {
  const sourceType = normalizeText(row.DATA_SOURCE_TYPE).toUpperCase()
  const translate = t ?? ((_: string, fallback: string) => fallback)
  const canonical = (reportCode ?? "").toUpperCase()
  const reportKind: "balance" | "profit" | "cost" =
    canonical === "B02_DN" ? "profit" : canonical === "COST_LIST" ? "cost" : "balance"

  if (canonical === "GTGT_01") {
    const parts: string[] = []
    if (isVatFormulaMethod(row.CALC_METHOD_NO1) && normalizeText(row.FORMULA_NO1)) {
      const suffix = normalizeText(row.CALC_METHOD_NO1).toUpperCase() === "FORMULA_POSITIVE"
        ? " (≥0)"
        : normalizeText(row.CALC_METHOD_NO1).toUpperCase() === "FORMULA_NEGATIVE"
          ? " (≤0)"
          : ""
      parts.push(`${normalizeText(row.FORMULA_NO1)}${suffix}`)
    }
    if (isVatFormulaMethod(row.CALC_METHOD_NO2) && normalizeText(row.FORMULA_NO2)) {
      const suffix = normalizeText(row.CALC_METHOD_NO2).toUpperCase() === "FORMULA_POSITIVE"
        ? " (≥0)"
        : normalizeText(row.CALC_METHOD_NO2).toUpperCase() === "FORMULA_NEGATIVE"
          ? " (≤0)"
          : ""
      parts.push(`${normalizeText(row.FORMULA_NO2)}${suffix}`)
    }
    return parts.join(" · ") || normalizeText(row.FORMULA_DISPLAY)
  }

  if (sourceType === "FORMULA") {
    const formula = normalizeText(row.FORMULA_EXPR) || normalizeText(row.FORMULA_DISPLAY)
    return formula === "PROCEDURE" ? translate("DATA_SOURCE_LEDGER", "Lấy số từ sổ cái") : formula
  }

  if (sourceType === "MANUAL" || sourceType === "HEADER" || sourceType === "SECTION") {
    return ""
  }

  const isIndirect = canonical.includes("GT")
  if (isIndirect && (sourceType === "ACCOUNT_RULE" || sourceType === "PROCEDURE")) {
    const formatted = formatIndirectAccountRuleDisplay(row.ACCOUNT_RULE)
    if (formatted) {
      return formatted
    }

    const fromApi = normalizeText(row.FORMULA_DISPLAY)
    if (fromApi && !fromApi.toUpperCase().startsWith("DIRECT_RULE")) {
      return fromApi === "PROCEDURE" ? translate("DATA_SOURCE_LEDGER", "Lấy số từ sổ cái") : fromApi
    }

    return translate("ACCOUNT_RULE_MISSING", "Chưa khai báo tài khoản")
  }

  const isAccountRuleReport = canonical === "B01_DN" || canonical === "B02_DN" || canonical === "COST_LIST"

  if (isAccountRuleReport && (sourceType === "ACCOUNT_RULE" || sourceType === "PROCEDURE")) {
    const accountRule = normalizeText(row.ACCOUNT_RULE)
    if (accountRule) {
      return formatAccountRuleDisplay(accountRule, row.CALC_METHOD ?? "", translate, reportKind)
    }
  }

  const fromApi = normalizeText(row.FORMULA_DISPLAY)
  if (fromApi) {
    if (fromApi === "PROCEDURE") {
      return translate("DATA_SOURCE_LEDGER", "Lấy số từ sổ cái")
    }

    return isAccountRuleReport
      ? localizeCalcMethodTokens(fromApi, translate, reportKind)
      : fromApi
  }

  if (sourceType === "ACCOUNT_RULE" || sourceType === "PROCEDURE") {
    return normalizeText(row.ACCOUNT_RULE) || translate("DATA_SOURCE_LEDGER", "Lấy số từ sổ cái")
  }

  return sourceType
}
