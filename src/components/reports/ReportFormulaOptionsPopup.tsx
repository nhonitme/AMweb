import { useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from "react"

import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import DataGrid, { Column, Paging, Scrolling, Selection } from "devextreme-react/data-grid"
import LoadPanel from "devextreme-react/load-panel"
import NumberBox from "devextreme-react/number-box"
import Popup from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import TextArea from "devextreme-react/text-area"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import { getApiErrorMessage } from "@/api/apiTypes"
import {
  getCashflowFormulaOptions,
  previewCashflowFormulaOptions,
  resetCashflowFormulaOptions,
  saveCashflowFormulaOptions,
  type CashflowFormulaOptionRow,
  type FormulaOptionPreviewColumn,
  type FormulaOptionPreviewParams,
} from "@/api/reportFormulaOptionApi"
import { LanguageContext } from "@/lib/i18nLoader"

type ReportFormulaOptionsPopupProps = {
  visible?: boolean
  layout?: "popup" | "page"
  reportCode: string
  reportVersion?: string | null
  previewParams?: FormulaOptionPreviewParams
  onClose: () => void
  onSaved: () => void
  onOpenColumnSettings?: () => void
}

function CollapsibleSection({
  title,
  children,
}: {
  title: string
  children: ReactNode
}) {
  return (
    <details className="rounded-md border border-slate-200 bg-slate-50/80">
      <summary className="cursor-pointer select-none px-3 py-2 text-xs font-semibold uppercase tracking-wide text-slate-600">
        {title}
      </summary>
      <div className="space-y-2 border-t border-slate-200 px-3 py-2">
        {children}
      </div>
    </details>
  )
}

function formatPreviewCellValue(value: unknown): string {
  if (value == null || value === "") {
    return "—"
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(value)
  }

  const parsed = Number(value)
  if (Number.isFinite(parsed) && String(value).trim() !== "") {
    return new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(parsed)
  }

  return String(value)
}

type DataSourceOption = {
  value: string
  label: string
}

type FlowSignOption = {
  value: number
  label: string
}

const EMPTY_ACCOUNT_PREFIXES = "111,112,113"

type TranslateFn = (key: string, fallback: string) => string

function getDataSourceOptions(t: TranslateFn, mode: "cashflow" | "accountRule" | "vat"): DataSourceOption[] {
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

function getVatCalcMethodOptions(t: TranslateFn): DataSourceOption[] {
  return [
    { value: "MANUAL", label: t("VAT_CALC_MANUAL", "Nhập tay") },
    { value: "FORMULA", label: t("VAT_CALC_FORMULA", "Công thức") },
    { value: "FORMULA_POSITIVE", label: t("VAT_CALC_FORMULA_POSITIVE", "Công thức (≥0)") },
    { value: "FORMULA_NEGATIVE", label: t("VAT_CALC_FORMULA_NEGATIVE", "Công thức (≤0)") },
  ]
}

function getElementTypeOptions(t: TranslateFn): DataSourceOption[] {
  return [
    { value: "DETAIL", label: t("ROW_TYPE_DETAIL", "Chỉ tiêu thường") },
    { value: "TOTAL", label: t("ROW_TYPE_TOTAL", "Chỉ tiêu tổng") },
    { value: "SECTION", label: t("ROW_TYPE_SECTION", "Tiêu đề nhóm") },
  ]
}

function getCalcMethodOptions(t: TranslateFn, reportKind: "balance" | "profit"): DataSourceOption[] {
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

function getCalcMethodLabel(calcMethod: string, t: TranslateFn, reportKind: "balance" | "profit"): string {
  const normalized = calcMethod.trim().toUpperCase()
  if (!normalized) {
    return ""
  }

  return getCalcMethodOptions(t, reportKind).find((option) => option.value === normalized)?.label
    || normalized
}

function formatAccountRuleDisplay(
  accountRule: string,
  calcMethod: string,
  t: TranslateFn,
  reportKind: "balance" | "profit",
): string {
  const accounts = accountRule.trim()
  if (!accounts) {
    return t("DATA_SOURCE_ACCOUNT_RULE", "Lấy số từ sổ cái theo tài khoản")
  }

  const methodLabel = getCalcMethodLabel(calcMethod, t, reportKind)
  return methodLabel ? `${accounts} (${methodLabel})` : accounts
}

function getFlowSignOptions(t: TranslateFn): FlowSignOption[] {
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

function getDataSourceLabel(sourceType: string, t: TranslateFn, mode: "cashflow" | "accountRule" | "vat"): string {
  const normalized = sourceType.trim().toUpperCase()
  if (mode === "accountRule" && (normalized === "PROCEDURE" || normalized === "ACCOUNT_RULE")) {
    return t("DATA_SOURCE_ACCOUNT_RULE", "Lấy số từ sổ cái theo tài khoản")
  }

  return getDataSourceOptions(t, mode).find((option) => option.value === normalized)?.label
    || normalized
    || "—"
}

function normalizeText(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

function normalizeFlag(value: unknown, fallback = "0"): string {
  if (value === "1" || value === 1 || value === true) {
    return "1"
  }

  if (value === "0" || value === 0 || value === false) {
    return "0"
  }

  return fallback
}

function toPositiveInteger(value: unknown, fallback: number): number {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed >= 0 ? Math.round(parsed) : fallback
}

function normalizeRow(row: CashflowFormulaOptionRow, index: number): CashflowFormulaOptionRow {
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

function cloneRows(rows: CashflowFormulaOptionRow[], allowDuplicateItemCodes = false): CashflowFormulaOptionRow[] {
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

function isUserValueChange(event: { event?: unknown }): boolean {
  return event.event != null
}

function buildDraftSignature(rows: CashflowFormulaOptionRow[], cashAccountPrefixes: string): string {
  return JSON.stringify({
    cashAccountPrefixes: normalizeText(cashAccountPrefixes),
    rows: rows.map((row) => ({
      ...row,
      ID: row.ID ?? null,
    })),
  })
}

function getCanonicalReportCode(reportCode: string): string {
  const normalized = reportCode.trim().toUpperCase()
  if (normalized.includes("GTGT") || normalized.includes("VAT_DECLARATION") || normalized === "TAX_VAT_DECLARATION") {
    return "GTGT_01"
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

function buildNewItemKey(): string {
  const uniquePart = globalThis.crypto?.randomUUID?.().replace(/-/g, "").slice(0, 12)
    ?? `${Date.now()}${Math.floor(Math.random() * 10000)}`
  return `CUSTOM_${uniquePart}`.toUpperCase()
}

function extractFormulaReferences(formula: string): string[] {
  const normalized = formula.trim()
  const expression = normalized.includes("=") ? normalized.slice(normalized.indexOf("=") + 1) : normalized

  return expression
    .split(/[+\-;]/)
    .map((term) => term.trim())
    .filter(Boolean)
    .map((term) => term.replace(/^[-+]/, "").trim())
    .filter(Boolean)
}

function isVatFormulaMethod(calcMethod: string | null | undefined): boolean {
  const method = normalizeText(calcMethod).toUpperCase()
  return method === "FORMULA" || method === "FORMULA_POSITIVE" || method === "FORMULA_NEGATIVE"
}

function isVatHeaderRow(row: CashflowFormulaOptionRow): boolean {
  const sourceType = normalizeText(row.DATA_SOURCE_TYPE).toUpperCase()
  const elementType = normalizeText(row.ELEMENT_TYPE).toUpperCase()
  return sourceType === "HEADER" || elementType === "HEADER" || elementType === "SECTION"
}

function isStructuralFormulaRow(row: CashflowFormulaOptionRow): boolean {
  return isVatHeaderRow(row)
}

function matchesLineFilter(row: CashflowFormulaOptionRow, filter: string): boolean {
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

function validateDraft(rows: CashflowFormulaOptionRow[], isVatDeclaration = false): string | null {
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

function validateVatDraft(rows: CashflowFormulaOptionRow[]): string | null {
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

function validateFormulaCycles(formulaReferences: Map<string, string[]>): string | null {
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

function parseDirectRuleAccountPayload(value: string): { plus: string[]; minus: string[] } | null {
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

function parseSignedAccountRule(value: string | null | undefined): { plus: string; minus: string } {
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

function buildSignedAccountRule(plus: string, minus: string): string {
  const normalizeAccounts = (value: string, sign: "+" | "-") => value
    .split(/[,;]/)
    .map((item) => item.trim().replace(/^[+-]/, ""))
    .filter((item) => /^[0-9A-Za-z]+$/.test(item))
    .map((item) => `${sign}${item}`)

  return [...normalizeAccounts(plus, "+"), ...normalizeAccounts(minus, "-")].join(",")
}

function formatIndirectAccountRuleDisplay(accountRule: string | null | undefined): string {
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

function localizeCalcMethodTokens(text: string, t: TranslateFn, reportKind: "balance" | "profit"): string {
  return text
    .replace(/\bDEBIT_MINUS_CREDIT\b/gi, getCalcMethodLabel("DEBIT_MINUS_CREDIT", t, reportKind))
    .replace(/\bCREDIT_MINUS_DEBIT\b/gi, getCalcMethodLabel("CREDIT_MINUS_DEBIT", t, reportKind))
    .replace(/\bDEBIT_ONLY\b/gi, getCalcMethodLabel("DEBIT_ONLY", t, reportKind))
    .replace(/\bCREDIT_ONLY\b/gi, getCalcMethodLabel("CREDIT_ONLY", t, reportKind))
    .replace(/\s*\[([^\]]+)\]\s*$/u, " ($1)")
}

function buildFormulaDisplay(
  row: CashflowFormulaOptionRow,
  reportCode?: string,
  t?: TranslateFn,
): string {
  const sourceType = normalizeText(row.DATA_SOURCE_TYPE).toUpperCase()
  const translate = t ?? ((_: string, fallback: string) => fallback)
  const reportKind: "balance" | "profit" = (reportCode ?? "").toUpperCase() === "B02_DN" ? "profit" : "balance"
  const canonical = (reportCode ?? "").toUpperCase()

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

  const isAccountRuleReport = canonical === "B01_DN" || canonical === "B02_DN"

  if (isAccountRuleReport && (sourceType === "ACCOUNT_RULE" || sourceType === "PROCEDURE")) {
    const accountRule = normalizeText(row.ACCOUNT_RULE)
    if (accountRule) {
      return formatAccountRuleDisplay(accountRule, row.CALC_METHOD, translate, reportKind)
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

export default function ReportFormulaOptionsPopup({
  visible = true,
  layout = "popup",
  reportCode,
  reportVersion,
  previewParams,
  onClose,
  onSaved,
  onOpenColumnSettings,
}: ReportFormulaOptionsPopupProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const canonicalReportCode = useMemo(() => getCanonicalReportCode(reportCode), [reportCode])
  const isIndirect = canonicalReportCode === "B03_DN_GT"
  const isBalanceSheet = canonicalReportCode === "B01_DN"
  const isProfitLoss = canonicalReportCode === "B02_DN"
  const isVatDeclaration = canonicalReportCode === "GTGT_01"
  const isAccountRuleReport = isBalanceSheet || isProfitLoss
  const isCashflow = canonicalReportCode === "B03_DN_GT" || canonicalReportCode === "B03_DN_TT"
  const effectiveReportVersion = reportVersion?.trim() || "2025"
  const dataSourceMode = isVatDeclaration ? "vat" : isAccountRuleReport ? "accountRule" : "cashflow"
  const dataSourceOptions = useMemo(() => getDataSourceOptions(t, dataSourceMode), [t, dataSourceMode])
  const elementTypeOptions = useMemo(() => getElementTypeOptions(t), [t])
  const calcMethodOptions = useMemo(
    () => getCalcMethodOptions(t, isProfitLoss ? "profit" : "balance"),
    [t, isProfitLoss],
  )
  const vatCalcMethodOptions = useMemo(() => getVatCalcMethodOptions(t), [t])
  const flowSignOptions = useMemo(() => getFlowSignOptions(t), [t])

  const [rows, setRows] = useState<CashflowFormulaOptionRow[]>([])
  const [cashAccountPrefixes, setCashAccountPrefixes] = useState(EMPTY_ACCOUNT_PREFIXES)
  const [sourceCompanyCd, setSourceCompanyCd] = useState("")
  const [companyCd, setCompanyCd] = useState("")
  const [selectedItemKey, setSelectedItemKey] = useState("")
  const [lineFilter, setLineFilter] = useState("")
  const [loading, setLoading] = useState(() => layout === "page")
  const [optionsLoaded, setOptionsLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewColumns, setPreviewColumns] = useState<FormulaOptionPreviewColumn[]>([])
  const [previewValuesByItemCode, setPreviewValuesByItemCode] = useState<Record<string, Record<string, unknown>>>({})
  const initialDraftSignatureRef = useRef("")
  const loadedTargetRef = useRef("")

  const selectedRow = useMemo(
    () => rows.find((row) => row.ITEM_KEY === selectedItemKey) ?? null,
    [rows, selectedItemKey],
  )

  const sortedRows = useMemo(
    () => [...rows].sort((left, right) => left.SORT_ORDER - right.SORT_ORDER || left.ITEM_KEY.localeCompare(right.ITEM_KEY)),
    [rows],
  )

  const visibleRows = useMemo(() => {
    if (!isVatDeclaration || !lineFilter.trim()) {
      return sortedRows
    }

    return sortedRows.filter((row) => matchesLineFilter(row, lineFilter))
  }, [isVatDeclaration, lineFilter, sortedRows])

  const selectedIsVatHeader = Boolean(selectedRow && isVatDeclaration && isVatHeaderRow(selectedRow))
  const showVatFormulaBlock = Boolean(
    selectedRow
    && isVatDeclaration
    && !selectedIsVatHeader
    && ["MANUAL", "FORMULA"].includes(normalizeText(selectedRow.DATA_SOURCE_TYPE).toUpperCase()),
  )

  const isDirty = buildDraftSignature(rows, cashAccountPrefixes) !== initialDraftSignatureRef.current
  const hasCompanyOverride = Boolean(
    companyCd
    && sourceCompanyCd
    && sourceCompanyCd.trim().toUpperCase() === companyCd.trim().toUpperCase(),
  )

  const applyLoadedOptions = useCallback((
    data: Awaited<ReturnType<typeof getCashflowFormulaOptions>>,
    preferredItemKey?: string,
  ) => {
    const nextRows = cloneRows(data.ROWS ?? [], isVatDeclaration).map((row) => {
      if (isAccountRuleReport && normalizeText(row.DATA_SOURCE_TYPE).toUpperCase() === "PROCEDURE") {
        return { ...row, DATA_SOURCE_TYPE: "ACCOUNT_RULE" }
      }

      return row
    })
    const nextPrefixes = normalizeText(data.CASH_ACCOUNT_PREFIXES) || EMPTY_ACCOUNT_PREFIXES
    const nextSelectedKey = preferredItemKey && nextRows.some((row) => row.ITEM_KEY === preferredItemKey)
      ? preferredItemKey
      : (nextRows[0]?.ITEM_KEY ?? "")

    setCompanyCd(normalizeText(data.COMPANY_CD))
    setSourceCompanyCd(normalizeText(data.SOURCE_COMPANY_CD))
    setRows(nextRows)
    setCashAccountPrefixes(nextPrefixes)
    setSelectedItemKey(nextSelectedKey)
    initialDraftSignatureRef.current = buildDraftSignature(nextRows, nextPrefixes)
    return nextRows
  }, [isAccountRuleReport, isVatDeclaration])

  const loadOptions = useCallback(async () => {
    setLoading(true)
    setOptionsLoaded(false)
    try {
      const data = await getCashflowFormulaOptions(canonicalReportCode, effectiveReportVersion)
      applyLoadedOptions(data)
    } catch (error) {
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Không thể tải cấu hình công thức")), "error", 4000)
    } finally {
      setLoading(false)
      setOptionsLoaded(true)
    }
  }, [applyLoadedOptions, canonicalReportCode, effectiveReportVersion, t])

  useEffect(() => {
    if (!visible) {
      loadedTargetRef.current = ""
      return
    }

    const target = `${canonicalReportCode}:${effectiveReportVersion}`
    if (loadedTargetRef.current === target) {
      return
    }

    loadedTargetRef.current = target
    void loadOptions()
  }, [canonicalReportCode, effectiveReportVersion, loadOptions, visible])

  const updateSelectedRow = useCallback((updater: (current: CashflowFormulaOptionRow) => CashflowFormulaOptionRow) => {
    if (!selectedItemKey) {
      return
    }

    setRows((currentRows) => currentRows.map((row, index) => {
      if (row.ITEM_KEY !== selectedItemKey) {
        return row
      }

      const next = normalizeRow(updater(row), index)
      return next.SORT_ORDER === row.SORT_ORDER
        && next.LEVEL_NO === row.LEVEL_NO
        && next.ITEM_CODE === row.ITEM_CODE
        && next.CAPTION === row.CAPTION
        && next.LABEL_TEXT === row.LABEL_TEXT
        && next.DATA_SOURCE_TYPE === row.DATA_SOURCE_TYPE
        && next.ELEMENT_TYPE === row.ELEMENT_TYPE
        && next.FORMULA_EXPR === row.FORMULA_EXPR
        && next.CODE_NO1 === row.CODE_NO1
        && next.CODE_NO2 === row.CODE_NO2
        && next.FORMULA_NO1 === row.FORMULA_NO1
        && next.FORMULA_NO2 === row.FORMULA_NO2
        && next.CALC_METHOD_NO1 === row.CALC_METHOD_NO1
        && next.CALC_METHOD_NO2 === row.CALC_METHOD_NO2
        && next.ACCOUNT_RULE === row.ACCOUNT_RULE
        && next.CALC_METHOD === row.CALC_METHOD
        && next.DIRECT_RULE_FLOW_SIGN === row.DIRECT_RULE_FLOW_SIGN
        && next.DIRECT_RULE_ACC_PREFIX === row.DIRECT_RULE_ACC_PREFIX
        && next.DIRECT_RULE_PRIORITY === row.DIRECT_RULE_PRIORITY
        && next.DIRECT_RULE_FLOW_SIGN_2 === row.DIRECT_RULE_FLOW_SIGN_2
        && next.DIRECT_RULE_ACC_PREFIX_2 === row.DIRECT_RULE_ACC_PREFIX_2
        && next.DIRECT_RULE_PRIORITY_2 === row.DIRECT_RULE_PRIORITY_2
        && next.FONT_BOLD === row.FONT_BOLD
        && next.FONT_ITALIC === row.FONT_ITALIC
        && next.IS_VISIBLE === row.IS_VISIBLE
        ? row
        : next
    }))
  }, [selectedItemKey])

  const addRow = useCallback(() => {
    const nextSortOrder = Math.max(0, ...rows.map((row) => row.SORT_ORDER || 0)) + 10
    const itemKey = buildNewItemKey()
    const row: CashflowFormulaOptionRow = {
      ID: null,
      ITEM_KEY: itemKey,
      ITEM_CODE: "",
      CAPTION: "",
      LABEL_TEXT: "",
      ELEMENT_TYPE: isVatDeclaration ? "AMOUNT" : "DETAIL",
      LEVEL_NO: 1,
      DATA_SOURCE_TYPE: isVatDeclaration ? "MANUAL" : "FORMULA",
      FORMULA_EXPR: "",
      CODE_NO1: "",
      CODE_NO2: "",
      FORMULA_NO1: "",
      FORMULA_NO2: "",
      CALC_METHOD_NO1: isVatDeclaration ? "MANUAL" : "",
      CALC_METHOD_NO2: "",
      ACCOUNT_RULE: "",
      DIRECT_RULE_FLOW_SIGN: 1,
      DIRECT_RULE_ACC_PREFIX: "",
      DIRECT_RULE_PRIORITY: nextSortOrder,
      DIRECT_RULE_FLOW_SIGN_2: -1,
      DIRECT_RULE_ACC_PREFIX_2: "",
      DIRECT_RULE_PRIORITY_2: nextSortOrder,
      SORT_ORDER: nextSortOrder,
      FONT_BOLD: "0",
      FONT_ITALIC: "0",
      IS_VISIBLE: "1",
    }

    setRows((currentRows) => [...currentRows, row])
    setSelectedItemKey(itemKey)
  }, [isVatDeclaration, rows])

  const deleteSelectedRow = useCallback(() => {
    if (!selectedRow) {
      return
    }

    const selectedIndex = sortedRows.findIndex((row) => row.ITEM_KEY === selectedRow.ITEM_KEY)
    const nextRows = rows.filter((row) => row.ITEM_KEY !== selectedRow.ITEM_KEY)
    const fallbackRow = sortedRows[selectedIndex + 1] ?? sortedRows[selectedIndex - 1] ?? null

    setRows(nextRows)
    setSelectedItemKey(fallbackRow?.ITEM_KEY ?? "")
  }, [rows, selectedRow, sortedRows])

  const moveSelectedRow = useCallback((direction: -1 | 1) => {
    if (!selectedRow) {
      return
    }

    const currentIndex = sortedRows.findIndex((row) => row.ITEM_KEY === selectedRow.ITEM_KEY)
    const targetIndex = currentIndex + direction
    if (currentIndex < 0 || targetIndex < 0 || targetIndex >= sortedRows.length) {
      return
    }

    const nextSortedRows = [...sortedRows]
    const [movingRow] = nextSortedRows.splice(currentIndex, 1)
    nextSortedRows.splice(targetIndex, 0, movingRow)
    const reordered = nextSortedRows.map((row, index) => ({
      ...row,
      SORT_ORDER: (index + 1) * 10,
    }))

    setRows(reordered)
  }, [selectedRow, sortedRows])

  const handleSave = useCallback(async () => {
    const normalizedRows = sortedRows.map(normalizeRow)
    const validationError = validateDraft(normalizedRows, isVatDeclaration)
    if (validationError) {
      notify(validationError, "warning", 4000)
      return
    }

    setSaving(true)
    try {
      const saved = await saveCashflowFormulaOptions({
        REPORT_CODE: canonicalReportCode,
        REPORT_VERSION: effectiveReportVersion,
        CASH_ACCOUNT_PREFIXES: normalizeText(cashAccountPrefixes) || EMPTY_ACCOUNT_PREFIXES,
        ROWS: normalizedRows,
      })
      applyLoadedOptions(saved, selectedItemKey)
      notify(t("MSG_EDIT_SUCCESS", "Đã lưu khai báo chỉ tiêu báo cáo"), "success", 3000)
      onSaved()
    } catch (error) {
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Không thể lưu cấu hình công thức")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }, [applyLoadedOptions, canonicalReportCode, cashAccountPrefixes, effectiveReportVersion, isVatDeclaration, onSaved, selectedItemKey, sortedRows, t])

  const handleResetToDefault = useCallback(async () => {
    const confirmed = await confirm(
      t(
        "REPORT_FORMULA_RESET_CONFIRM",
        "Bạn có chắc muốn khôi phục về mẫu mặc định ban đầu?\nMọi thay đổi đã lưu cho công ty này sẽ bị hủy và không thể hoàn tác.",
      ),
      t("REPORT_FORMULA_RESET_TITLE", "Về mẫu mặc định"),
    )
    if (!confirmed) {
      return
    }

    setSaving(true)
    try {
      const reset = await resetCashflowFormulaOptions(canonicalReportCode, effectiveReportVersion)
      applyLoadedOptions(reset)
      notify(t("REPORT_FORMULA_RESET_SUCCESS", "Đã khôi phục về mẫu mặc định ban đầu"), "success", 3000)
      onSaved()
    } catch (error) {
      notify(getApiErrorMessage(error, t("REPORT_FORMULA_RESET_FAILED", "Không thể khôi phục mẫu mặc định")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }, [applyLoadedOptions, canonicalReportCode, effectiveReportVersion, onSaved, t])

  const handleLoadPreview = useCallback(async () => {
    if (!optionsLoaded || sortedRows.length === 0) {
      notify(
        t(
          "REPORT_FORMULA_PREVIEW_NO_ROWS",
          "Chưa có chỉ tiêu để tải báo cáo. Hãy đợi tải xong hoặc bấm Tải lại.",
        ),
        "warning",
        4000,
      )
      return
    }

    const fromYmd = previewParams?.fromYmd?.trim()
    const toYmd = previewParams?.toYmd?.trim()
    if (!fromYmd || !toYmd) {
      notify(
        t(
          "REPORT_FORMULA_PREVIEW_MISSING_PERIOD",
          "Thiếu kỳ báo cáo. Hãy mở từ trang báo cáo với bộ lọc ngày.",
        ),
        "warning",
        4000,
      )
      return
    }

    const validationError = validateDraft(sortedRows, isVatDeclaration)
    if (validationError) {
      notify(validationError, "warning", 4000)
      return
    }

    setPreviewLoading(true)
    try {
      const preview = await previewCashflowFormulaOptions({
        REPORT_CODE: canonicalReportCode,
        REPORT_VERSION: effectiveReportVersion,
        CASH_ACCOUNT_PREFIXES: normalizeText(cashAccountPrefixes) || EMPTY_ACCOUNT_PREFIXES,
        ROWS: sortedRows.map(normalizeRow),
        PreviewReportCode: previewParams?.previewReportCode?.trim() || reportCode.trim(),
        FromYmd: fromYmd,
        ToYmd: toYmd,
        UnitDivisor: previewParams?.unitDivisor?.trim() || "1",
        MenuCode: previewParams?.menuCode?.trim() || undefined,
      })

      const nextValues: Record<string, Record<string, unknown>> = {}
      preview.ROWS.forEach((row) => {
        const itemCode = normalizeText(row.ITEM_CODE).toUpperCase()
        if (!itemCode) {
          return
        }

        nextValues[itemCode] = row.VALUES ?? {}
      })

      setPreviewColumns(preview.COLUMNS ?? [])
      setPreviewValuesByItemCode(nextValues)
    } catch (error) {
      notify(
        getApiErrorMessage(error, t("LOAD_REPORT_PREVIEW_FAILED", "Không thể tải dữ liệu báo cáo")),
        "error",
        4000,
      )
    } finally {
      setPreviewLoading(false)
    }
  }, [
    canonicalReportCode,
    cashAccountPrefixes,
    effectiveReportVersion,
    isVatDeclaration,
    optionsLoaded,
    previewParams,
    reportCode,
    sortedRows,
    t,
  ])

  const resolvePreviewValue = useCallback((
    row: CashflowFormulaOptionRow,
    fieldName: string,
  ): unknown => {
    const itemCode = normalizeText(row.ITEM_CODE).toUpperCase()
    if (!itemCode) {
      return null
    }

    const values = previewValuesByItemCode[itemCode]
    if (!values) {
      return null
    }

    const direct = values[fieldName]
    if (direct != null && direct !== "") {
      return direct
    }

    const normalizedField = fieldName.toUpperCase()
    const matchedKey = Object.keys(values).find((key) => key.toUpperCase() === normalizedField)
    return matchedKey ? values[matchedKey] : null
  }, [previewValuesByItemCode])

  const signedAccountRule = useMemo(
    () => parseSignedAccountRule(selectedRow?.ACCOUNT_RULE),
    [selectedRow?.ACCOUNT_RULE],
  )

  const title = isVatDeclaration
    ? t("VAT_FORMULA_CONFIG", "Khai báo chỉ tiêu — Tờ khai thuế GTGT")
    : isBalanceSheet
      ? t("BALANCE_FORMULA_CONFIG", "Khai báo chỉ tiêu — Bảng cân đối kế toán")
      : isProfitLoss
        ? t("PL_FORMULA_CONFIG", "Khai báo chỉ tiêu — Kết quả hoạt động kinh doanh")
        : isIndirect
          ? t("CASHFLOW_FORMULA_CONFIG_INDIRECT", "Khai báo chỉ tiêu — BCLCTT phương pháp gián tiếp")
          : t("CASHFLOW_FORMULA_CONFIG_DIRECT", "Khai báo chỉ tiêu — BCLCTT phương pháp trực tiếp")

  useEffect(() => {
    if (layout !== "page") {
      return
    }

    document.title = title
  }, [layout, title])

  const editor = (
      <div className={`flex min-h-0 flex-col gap-4 ${layout === "page" ? "h-full p-4" : "h-full"}`}>
        {layout === "page" ? (
          <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 pb-3">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-lg font-semibold text-slate-900">{title}</h1>
                {isDirty ? (
                  <span className="rounded border border-amber-300 bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-800">
                    {t("UNSAVED_CHANGES", "Đã sửa — chưa lưu")}
                  </span>
                ) : null}
              </div>
            </div>
            <Button
              stylingMode="outlined"
              text={t("CLOSE", "Đóng")}
              disabled={saving}
              onClick={onClose}
            />
          </div>
        ) : null}

        {isCashflow || onOpenColumnSettings ? (
          <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 lg:grid-cols-[minmax(300px,1fr)_auto] lg:items-end">
            {isCashflow ? (
              <TextBox
                value={cashAccountPrefixes}
                stylingMode="outlined"
                label={t("CASHFLOW_CASH_ACCOUNTS", "Tài khoản tiền và tương đương tiền")}
                labelMode="floating"
                placeholder="111, 112, 113"
                hint={t(
                  "CASHFLOW_CASH_ACCOUNTS_HINT",
                  "Các đầu số tài khoản được xem là tiền và tương đương tiền khi xác định thu/chi",
                )}
                onValueChanged={(event) => setCashAccountPrefixes(String(event.value ?? ""))}
              />
            ) : (
              <div />
            )}
            {onOpenColumnSettings ? (
              <Button
                icon="columnchooser"
                stylingMode="outlined"
                text={t("CASHFLOW_EDIT_COLUMN_NAMES", "Đặt tên cột in")}
                disabled={loading || saving}
                onClick={onOpenColumnSettings}
              />
            ) : null}
          </section>
        ) : null}

        <div className={`grid min-h-0 flex-1 gap-3 ${isVatDeclaration ? "xl:grid-cols-[minmax(560px,1.35fr)_minmax(400px,0.85fr)]" : "xl:grid-cols-[minmax(500px,1.2fr)_minmax(430px,0.9fr)]"}`}>
          <section className="flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-300 bg-slate-50 px-3 py-2.5">
              <div className="min-w-0">
                <h2 className="text-sm font-semibold text-slate-900">{t("CASHFLOW_REPORT_LINES", "Danh sách chỉ tiêu")}</h2>
                <p className="mt-0.5 text-xs text-slate-500">
                  {t(
                    "CASHFLOW_REPORT_LINES_HINT",
                    isVatDeclaration
                      ? "Chọn chỉ tiêu để khai báo mã [21]/[22]… và công thức cột HHDV / thuế GTGT."
                      : isIndirect
                        ? "Chọn chỉ tiêu để khai báo tài khoản cộng/trừ hoặc công thức tổng hợp."
                        : "Chọn chỉ tiêu để khai báo công thức hoặc tài khoản đối ứng.",
                  )}
                </p>
              </div>
              <div className="flex flex-wrap gap-1">
                <Button
                  icon="chart"
                  stylingMode="contained"
                  type="default"
                  text={previewLoading
                    ? t("LOADING", "Đang tải...")
                    : t("LOAD_REPORT", "Tải báo cáo")}
                  disabled={loading || saving || previewLoading || !optionsLoaded || sortedRows.length === 0}
                  onClick={() => void handleLoadPreview()}
                />
                <Button
                  icon="plus"
                  stylingMode="outlined"
                  text={t("ADD_ROW", "Thêm chỉ tiêu")}
                  disabled={loading || saving || previewLoading}
                  onClick={addRow}
                />
              </div>
            </div>

            {isVatDeclaration ? (
              <div className="border-b border-slate-200 px-3 py-2">
                <TextBox
                  value={lineFilter}
                  stylingMode="outlined"
                  mode="search"
                  placeholder={t("VAT_LINE_FILTER_PLACEHOLDER", "Tìm mã CT, mã [ ], tên chỉ tiêu…")}
                  showClearButton={true}
                  valueChangeEvent="input"
                  onValueChanged={(event) => setLineFilter(String(event.value ?? ""))}
                />
              </div>
            ) : null}

            <div className="min-h-0 flex-1">
              <DataGrid
                dataSource={visibleRows}
                keyExpr="ITEM_KEY"
                selectedRowKeys={selectedItemKey ? [selectedItemKey] : []}
                focusedRowEnabled={false}
                onRowClick={(event) => {
                  const nextKey = String(event.key ?? event.data?.ITEM_KEY ?? "")
                  if (!nextKey || nextKey === selectedItemKey) {
                    return
                  }

                  setSelectedItemKey(nextKey)
                }}
                onSelectionChanged={(event) => {
                  // Keep selection in sync when user uses keyboard / API selection,
                  // but ignore empty clears that fire during click+drag.
                  const nextKey = String(event.selectedRowKeys[0] ?? "")
                  if (!nextKey || nextKey === selectedItemKey) {
                    return
                  }

                  setSelectedItemKey(nextKey)
                }}
                onRowPrepared={(event) => {
                  if (event.rowType !== "data" || !event.data || !isVatDeclaration) {
                    return
                  }

                  const row = event.data as CashflowFormulaOptionRow
                  if (isVatHeaderRow(row)) {
                    event.rowElement.style.backgroundColor = "#f1f5f9"
                    event.rowElement.style.fontWeight = "600"
                  }
                }}
                showBorders={isVatDeclaration}
                showRowLines={true}
                showColumnLines={isVatDeclaration}
                hoverStateEnabled={true}
                columnAutoWidth={false}
                height="100%"
                noDataText={loading
                  ? ""
                  : isVatDeclaration && lineFilter.trim()
                    ? t("NO_FILTER_MATCH", "Không có chỉ tiêu khớp bộ lọc")
                    : t("NO_DATA", "Chưa có chỉ tiêu")}
              >
                <Selection mode="single" showCheckBoxesMode="none" />
                <Scrolling mode="standard" />
                <Paging enabled={false} />
                <Column
                  caption={t("ORDER", "TT")}
                  dataField="SORT_ORDER"
                  width={56}
                  alignment="center"
                  allowSorting={false}
                />
                <Column
                  caption={t("ITEM_CODE", "Mã CT")}
                  dataField="ITEM_CODE"
                  width={72}
                  allowSorting={false}
                  cellRender={({ data }: { data: CashflowFormulaOptionRow }) => (
                    <span className={`font-semibold ${isVatHeaderRow(data) ? "text-slate-700" : "text-slate-800"}`}>
                      {data.ITEM_CODE || "—"}
                    </span>
                  )}
                />
                {isVatDeclaration ? (
                  <Column
                    caption={t("VAT_CODES", "Mã [ ]")}
                    width={110}
                    allowSorting={false}
                    cellRender={({ data }: { data: CashflowFormulaOptionRow }) => {
                      const codes = [normalizeText(data.CODE_NO1), normalizeText(data.CODE_NO2)].filter(Boolean)
                      if (codes.length === 0) {
                        return <span className="text-slate-400">—</span>
                      }

                      return (
                        <span className="inline-flex flex-wrap gap-1">
                          {codes.map((code) => (
                            <span
                              key={code}
                              className="rounded border border-slate-300 bg-white px-1 py-px font-mono text-[11px] font-semibold leading-4 text-slate-800"
                            >
                              [{code}]
                            </span>
                          ))}
                        </span>
                      )
                    }}
                  />
                ) : null}
                <Column
                  caption={t("CAPTION", "Tên chỉ tiêu")}
                  dataField="CAPTION"
                  minWidth={180}
                  allowSorting={false}
                  cellRender={({ data }: { data: CashflowFormulaOptionRow }) => {
                    const indent = Math.max(0, (data.LEVEL_NO || 1) - 1) * 12
                    const isHeader = isVatDeclaration && isVatHeaderRow(data)
                    return (
                      <div className="min-w-0 py-0.5" style={{ paddingLeft: indent }}>
                        <div
                          className={`truncate ${isHeader ? "font-semibold text-slate-900" : "font-medium text-slate-800"}`}
                          title={data.CAPTION || undefined}
                        >
                          {data.CAPTION || t("UNTITLED", "Chưa đặt tên")}
                        </div>
                      </div>
                    )
                  }}
                />
                {previewColumns.map((column) => (
                  <Column
                    key={column.FIELD_NAME}
                    caption={column.CAPTION || column.FIELD_NAME}
                    width={120}
                    alignment="right"
                    allowSorting={false}
                    cellRender={({ data }: { data: CashflowFormulaOptionRow }) => {
                      const value = resolvePreviewValue(data, column.FIELD_NAME)
                      const hasValue = value != null && value !== ""
                      return (
                        <span className={`font-mono text-xs tabular-nums ${hasValue ? "font-semibold text-emerald-700" : "text-slate-400"}`}>
                          {formatPreviewCellValue(value)}
                        </span>
                      )
                    }}
                  />
                ))}
                <Column
                  caption={t("FORMULA_EXPR", "Cách lấy số")}
                  dataField="FORMULA_DISPLAY"
                  minWidth={200}
                  allowSorting={false}
                  cellRender={({ data }: { data: CashflowFormulaOptionRow }) => {
                    if (isVatDeclaration && isVatHeaderRow(data)) {
                      return (
                        <span className="text-xs text-slate-500">
                          {t("DATA_SOURCE_HEADER", "Tiêu đề nhóm")}
                        </span>
                      )
                    }

                    const formulaText = buildFormulaDisplay(data, canonicalReportCode, t)
                    if (isVatDeclaration) {
                      if (!formulaText) {
                        return (
                          <span className="text-xs text-slate-500">
                            {getDataSourceLabel(normalizeText(data.DATA_SOURCE_TYPE), t, dataSourceMode)}
                          </span>
                        )
                      }

                      return (
                        <div className="min-w-0 truncate font-mono text-xs font-medium text-blue-800" title={formulaText}>
                          {formulaText}
                        </div>
                      )
                    }

                    return (
                      <div className="min-w-0 py-1">
                        <div className="truncate text-xs font-medium text-blue-700" title={formulaText}>
                          {formulaText || "—"}
                        </div>
                        <div className="truncate text-[11px] text-slate-500">
                          {getDataSourceLabel(normalizeText(data.DATA_SOURCE_TYPE), t, dataSourceMode)}
                        </div>
                      </div>
                    )
                  }}
                />
                <Column
                  caption={t("IS_VISIBLE", "Hiện")}
                  width={52}
                  alignment="center"
                  allowSorting={false}
                  cellRender={({ data }: { data: CashflowFormulaOptionRow }) => (
                    <span className={data.IS_VISIBLE === "1" ? "text-emerald-600" : "text-slate-400"}>
                      {data.IS_VISIBLE === "1" ? "✓" : "—"}
                    </span>
                  )}
                />
              </DataGrid>
            </div>
          </section>

          <section className={`flex min-h-0 flex-col overflow-auto border bg-white p-3 ${isVatDeclaration ? "rounded-lg border-slate-300 shadow-sm" : "rounded-xl border-slate-200 p-4"}`}>
            {selectedRow ? (
              <div className="space-y-3" key={selectedRow.ITEM_KEY}>
                <div className="border-b border-slate-200 pb-2">
                  <h2 className="text-sm font-semibold text-slate-900">
                    {isVatDeclaration && (normalizeText(selectedRow.CODE_NO1) || normalizeText(selectedRow.CODE_NO2))
                      ? [
                          normalizeText(selectedRow.CODE_NO1) ? `[${normalizeText(selectedRow.CODE_NO1)}]` : null,
                          normalizeText(selectedRow.CODE_NO2) ? `[${normalizeText(selectedRow.CODE_NO2)}]` : null,
                        ].filter(Boolean).join(" ")
                      : selectedRow.ITEM_CODE
                        ? `${t("ITEM_CODE_SHORT", "Chỉ tiêu")} ${selectedRow.ITEM_CODE}`
                        : t("NEW_ROW", "Chỉ tiêu mới")}
                  </h2>
                  <p className="mt-0.5 truncate text-xs text-slate-500">
                    {selectedRow.CAPTION || t("UNTITLED", "Chưa đặt tên")}
                  </p>
                </div>

                {isVatDeclaration ? (
                  <>
                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("VAT_IDENTITY_SECTION", "Định danh chỉ tiêu")}
                      </h3>
                      <div className="grid gap-2 sm:grid-cols-[100px_1fr]">
                        <TextBox
                          value={selectedRow.ITEM_CODE}
                          stylingMode="outlined"
                          label={t("ITEM_CODE_STT", "STT trên tờ khai")}
                          labelMode="floating"
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({ ...row, ITEM_CODE: String(event.value ?? "") }))
                          }}
                        />
                        <TextBox
                          value={selectedRow.CAPTION}
                          stylingMode="outlined"
                          label={t("CAPTION", "Tên chỉ tiêu (VN)")}
                          labelMode="floating"
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({ ...row, CAPTION: String(event.value ?? "") }))
                          }}
                        />
                      </div>
                      <div className="grid gap-2 sm:grid-cols-2">
                        <TextBox
                          value={selectedRow.CODE_NO1 ?? ""}
                          stylingMode="outlined"
                          label={t("VAT_CODE_NO1", "Mã chỉ tiêu HHDV [ ]")}
                          labelMode="floating"
                          placeholder="27"
                          inputAttr={{ class: "font-mono font-semibold tracking-wide" }}
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({ ...row, CODE_NO1: String(event.value ?? "") }))
                          }}
                        />
                        <TextBox
                          value={selectedRow.CODE_NO2 ?? ""}
                          stylingMode="outlined"
                          label={t("VAT_CODE_NO2", "Mã chỉ tiêu thuế GTGT [ ]")}
                          labelMode="floating"
                          placeholder="28"
                          inputAttr={{ class: "font-mono font-semibold tracking-wide" }}
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({ ...row, CODE_NO2: String(event.value ?? "") }))
                          }}
                        />
                      </div>
                    </section>

                    <section className="space-y-2">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500">
                        {t("VAT_CALC_SECTION", "Cách tính")}
                      </h3>
                      <SelectBox
                        dataSource={dataSourceOptions}
                        valueExpr="value"
                        displayExpr="label"
                        value={selectedRow.DATA_SOURCE_TYPE}
                        stylingMode="outlined"
                        label={t("DATA_SOURCE_TYPE", "Cách lấy số")}
                        labelMode="floating"
                        onValueChanged={(event) => {
                          if (!isUserValueChange(event)) {
                            return
                          }

                          updateSelectedRow((row) => {
                            const nextSource = String(event.value ?? "MANUAL").toUpperCase()
                            const next: CashflowFormulaOptionRow = {
                              ...row,
                              DATA_SOURCE_TYPE: nextSource,
                            }

                            if (nextSource === "HEADER") {
                              next.ELEMENT_TYPE = "HEADER"
                              next.CALC_METHOD_NO1 = ""
                              next.CALC_METHOD_NO2 = ""
                              next.FORMULA_NO1 = ""
                              next.FORMULA_NO2 = ""
                            } else if (nextSource === "FORMULA") {
                              next.ELEMENT_TYPE = "FORMULA"
                              if (!normalizeText(row.CALC_METHOD_NO1) && normalizeText(row.CODE_NO1)) {
                                next.CALC_METHOD_NO1 = "FORMULA"
                              }
                              if (!normalizeText(row.CALC_METHOD_NO2) && normalizeText(row.CODE_NO2)) {
                                next.CALC_METHOD_NO2 = "FORMULA"
                              }
                            } else if (nextSource === "MANUAL") {
                              next.ELEMENT_TYPE = "AMOUNT"
                            }

                            return next
                          })
                        }}
                      />
                    </section>

                    {showVatFormulaBlock ? (
                      <section className="space-y-2 rounded-md border border-slate-200 bg-slate-50 p-2.5">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {t("VAT_DUAL_FORMULA", "Công thức theo cột")}
                          </h3>
                          <p className="mt-0.5 text-xs leading-5 text-slate-600">
                            {t(
                              "VAT_DUAL_FORMULA_HINT_SHORT",
                              "Ví dụ HHDV: 27=29+30+32+32A · Thuế: 36=35-25",
                            )}
                          </p>
                        </div>
                        <div className="grid gap-3 lg:grid-cols-2">
                          <div className="space-y-2 rounded border border-slate-200 bg-white p-2">
                            <div className="text-xs font-semibold text-slate-700">
                              {t("VAT_COL_HHDV", "Cột HHDV")}
                              {normalizeText(selectedRow.CODE_NO1) ? (
                                <span className="ml-1 font-mono text-slate-500">[{normalizeText(selectedRow.CODE_NO1)}]</span>
                              ) : null}
                            </div>
                            <SelectBox
                              dataSource={vatCalcMethodOptions}
                              valueExpr="value"
                              displayExpr="label"
                              value={normalizeText(selectedRow.CALC_METHOD_NO1).toUpperCase() || null}
                              stylingMode="outlined"
                              label={t("VAT_CALC_METHOD_NO1", "Cách lấy số")}
                              labelMode="floating"
                              showClearButton={true}
                              searchEnabled={false}
                              onValueChanged={(event) => {
                                if (!isUserValueChange(event)) {
                                  return
                                }

                                updateSelectedRow((row) => ({
                                  ...row,
                                  CALC_METHOD_NO1: String(event.value ?? ""),
                                }))
                              }}
                            />
                            <TextArea
                              value={selectedRow.FORMULA_NO1 ?? ""}
                              stylingMode="outlined"
                              label={t("VAT_FORMULA_NO1", "Công thức")}
                              labelMode="floating"
                              height={88}
                              disabled={!isVatFormulaMethod(selectedRow.CALC_METHOD_NO1)}
                              placeholder={t("VAT_FORMULA_PLACEHOLDER", "Ví dụ: 27=29+30+32+32A")}
                              inputAttr={{ class: "font-mono text-xs" }}
                              onValueChanged={(event) => updateSelectedRow((row) => ({
                                ...row,
                                FORMULA_NO1: String(event.value ?? ""),
                              }))}
                            />
                          </div>
                          <div className="space-y-2 rounded border border-slate-200 bg-white p-2">
                            <div className="text-xs font-semibold text-slate-700">
                              {t("VAT_COL_TAX", "Cột thuế GTGT")}
                              {normalizeText(selectedRow.CODE_NO2) ? (
                                <span className="ml-1 font-mono text-slate-500">[{normalizeText(selectedRow.CODE_NO2)}]</span>
                              ) : null}
                            </div>
                            <SelectBox
                              dataSource={vatCalcMethodOptions}
                              valueExpr="value"
                              displayExpr="label"
                              value={normalizeText(selectedRow.CALC_METHOD_NO2).toUpperCase() || null}
                              stylingMode="outlined"
                              label={t("VAT_CALC_METHOD_NO2", "Cách lấy số")}
                              labelMode="floating"
                              showClearButton={true}
                              searchEnabled={false}
                              onValueChanged={(event) => {
                                if (!isUserValueChange(event)) {
                                  return
                                }

                                updateSelectedRow((row) => ({
                                  ...row,
                                  CALC_METHOD_NO2: String(event.value ?? ""),
                                }))
                              }}
                            />
                            <TextArea
                              value={selectedRow.FORMULA_NO2 ?? ""}
                              stylingMode="outlined"
                              label={t("VAT_FORMULA_NO2", "Công thức")}
                              labelMode="floating"
                              height={88}
                              disabled={!isVatFormulaMethod(selectedRow.CALC_METHOD_NO2)}
                              placeholder={t("VAT_FORMULA_PLACEHOLDER_2", "Ví dụ: 36=35-25")}
                              inputAttr={{ class: "font-mono text-xs" }}
                              onValueChanged={(event) => updateSelectedRow((row) => ({
                                ...row,
                                FORMULA_NO2: String(event.value ?? ""),
                              }))}
                            />
                          </div>
                        </div>
                      </section>
                    ) : null}

                    {buildFormulaDisplay(selectedRow, canonicalReportCode, t) ? (
                      <section className="rounded border border-slate-200 bg-white px-2.5 py-2 text-xs leading-5 text-slate-700">
                        <span className="font-semibold text-slate-900">{t("CURRENT_FORMULA", "Đang áp dụng")}: </span>
                        <span className="font-mono">{buildFormulaDisplay(selectedRow, canonicalReportCode, t)}</span>
                      </section>
                    ) : null}
                  </>
                ) : (
                  <>
                    <div className="grid gap-3 sm:grid-cols-[120px_1fr]">
                      <TextBox
                        value={selectedRow.ITEM_CODE}
                        stylingMode="outlined"
                        label={t("ITEM_CODE", "Mã chỉ tiêu")}
                        labelMode="floating"
                        onValueChanged={(event) => {
                          if (!isUserValueChange(event)) {
                            return
                          }

                          updateSelectedRow((row) => ({ ...row, ITEM_CODE: String(event.value ?? "") }))
                        }}
                      />
                      <TextBox
                        value={selectedRow.CAPTION}
                        stylingMode="outlined"
                        label={t("CAPTION", "Tên chỉ tiêu (VN)")}
                        labelMode="floating"
                        onValueChanged={(event) => {
                          if (!isUserValueChange(event)) {
                            return
                          }

                          updateSelectedRow((row) => ({ ...row, CAPTION: String(event.value ?? "") }))
                        }}
                      />
                    </div>

                    <SelectBox
                      dataSource={dataSourceOptions}
                      valueExpr="value"
                      displayExpr="label"
                      value={selectedRow.DATA_SOURCE_TYPE}
                      stylingMode="outlined"
                      label={t("DATA_SOURCE_TYPE", "Cách lấy số")}
                      labelMode="floating"
                      onValueChanged={(event) => {
                        if (!isUserValueChange(event)) {
                          return
                        }

                        updateSelectedRow((row) => {
                          const nextSource = String(event.value ?? "MANUAL").toUpperCase()
                          const next: CashflowFormulaOptionRow = {
                            ...row,
                            DATA_SOURCE_TYPE: nextSource,
                          }

                          if ((nextSource === "ACCOUNT_RULE" || nextSource === "PROCEDURE")
                            && !normalizeText(row.CALC_METHOD)) {
                            next.CALC_METHOD = isProfitLoss ? "CREDIT_MINUS_DEBIT" : "DEBIT_MINUS_CREDIT"
                          }

                          return next
                        })
                      }}
                    />

                    {selectedRow.DATA_SOURCE_TYPE === "FORMULA" ? (
                      <TextArea
                        value={selectedRow.FORMULA_EXPR ?? ""}
                        stylingMode="outlined"
                        label={t("FORMULA_EXPR", "Công thức cộng trừ chỉ tiêu")}
                        labelMode="floating"
                        height={86}
                        placeholder={t("FORMULA_EXPR_PLACEHOLDER", "Ví dụ: 10 = 01 - 02")}
                        onValueChanged={(event) => updateSelectedRow((row) => ({
                          ...row,
                          FORMULA_EXPR: String(event.value ?? ""),
                        }))}
                      />
                    ) : null}

                    {buildFormulaDisplay(selectedRow, canonicalReportCode, t) ? (
                      <section className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-xs leading-5 text-slate-700">
                        <span className="font-semibold text-slate-900">{t("CURRENT_FORMULA", "Đang áp dụng")}: </span>
                        {buildFormulaDisplay(selectedRow, canonicalReportCode, t)}
                      </section>
                    ) : null}

                    {isAccountRuleReport && (selectedRow.DATA_SOURCE_TYPE === "ACCOUNT_RULE" || selectedRow.DATA_SOURCE_TYPE === "PROCEDURE") ? (
                      <section className="space-y-3 rounded-lg border border-violet-100 bg-violet-50 p-3">
                        <TextBox
                          value={selectedRow.ACCOUNT_RULE ?? ""}
                          stylingMode="outlined"
                          label={t("ACCOUNT_RULE", "Tài khoản lấy số")}
                          labelMode="floating"
                          placeholder={t("ACCOUNT_RULE_PLACEHOLDER", "Ví dụ: 111, 112, 113")}
                          onValueChanged={(event) => updateSelectedRow((row) => ({
                            ...row,
                            ACCOUNT_RULE: String(event.value ?? ""),
                          }))}
                        />
                        <SelectBox
                          dataSource={calcMethodOptions}
                          valueExpr="value"
                          displayExpr="label"
                          value={normalizeText(selectedRow.CALC_METHOD).toUpperCase()
                            || (isProfitLoss ? "CREDIT_MINUS_DEBIT" : "DEBIT_MINUS_CREDIT")}
                          stylingMode="outlined"
                          label={isProfitLoss
                            ? t("CALC_METHOD_PL", "Cách lấy phát sinh")
                            : t("CALC_METHOD_BS", "Cách lấy số dư")}
                          labelMode="floating"
                          searchEnabled={false}
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            updateSelectedRow((row) => ({
                              ...row,
                              CALC_METHOD: String(event.value ?? ""),
                            }))
                          }}
                        />
                      </section>
                    ) : null}

                    {isCashflow && isIndirect ? (
                      <section className="space-y-3 rounded-lg border border-amber-100 bg-amber-50 p-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {t("CASHFLOW_INDIRECT_ACCOUNT_RULE", "Tài khoản lấy số cho chỉ tiêu")}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {t(
                              "CASHFLOW_INDIRECT_ACCOUNT_RULE_HINT",
                              "Nhập mã tài khoản (hoặc đầu số). Ví dụ cộng: 511, 515 — trừ: 632, 641. Nhiều tài khoản cách nhau bằng dấu phẩy.",
                            )}
                          </p>
                        </div>
                        <TextBox
                          value={signedAccountRule.plus}
                          stylingMode="outlined"
                          label={t("CASHFLOW_ACCOUNT_PLUS", "Tài khoản cộng vào chỉ tiêu (+)")}
                          labelMode="floating"
                          placeholder="511, 515, 711"
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            const plus = String(event.value ?? "")
                            updateSelectedRow((row) => ({
                              ...row,
                              ACCOUNT_RULE: buildSignedAccountRule(plus, parseSignedAccountRule(row.ACCOUNT_RULE).minus),
                            }))
                          }}
                        />
                        <TextBox
                          value={signedAccountRule.minus}
                          stylingMode="outlined"
                          label={t("CASHFLOW_ACCOUNT_MINUS", "Tài khoản trừ khỏi chỉ tiêu (−)")}
                          labelMode="floating"
                          placeholder="632, 641, 413"
                          onValueChanged={(event) => {
                            if (!isUserValueChange(event)) {
                              return
                            }

                            const minus = String(event.value ?? "")
                            updateSelectedRow((row) => ({
                              ...row,
                              ACCOUNT_RULE: buildSignedAccountRule(parseSignedAccountRule(row.ACCOUNT_RULE).plus, minus),
                            }))
                          }}
                        />
                      </section>
                    ) : isCashflow ? (
                      <section className="space-y-3 rounded-lg border border-emerald-100 bg-emerald-50 p-3">
                        <div>
                          <h3 className="text-sm font-semibold text-slate-900">
                            {t("CASHFLOW_DIRECT_ACCOUNT_RULE", "Quy tắc thu / chi theo đối ứng")}
                          </h3>
                          <p className="mt-1 text-xs leading-5 text-slate-600">
                            {t(
                              "CASHFLOW_DIRECT_ACCOUNT_RULE_HINT",
                              "Khai báo tài khoản đối ứng với tài khoản tiền. Số ưu tiên nhỏ hơn được chọn trước khi nhiều quy tắc cùng khớp.",
                            )}
                          </p>
                        </div>
                        <SelectBox
                          dataSource={flowSignOptions}
                          valueExpr="value"
                          displayExpr="label"
                          value={selectedRow.DIRECT_RULE_FLOW_SIGN ?? 1}
                          stylingMode="outlined"
                          label={t("CASHFLOW_RULE_1_DIRECTION", "Quy tắc thu/chi 1")}
                          labelMode="floating"
                          onValueChanged={(event) => updateSelectedRow((row) => ({
                            ...row,
                            DIRECT_RULE_FLOW_SIGN: Number(event.value) === -1 ? -1 : 1,
                          }))}
                        />
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                          <TextBox
                            value={selectedRow.DIRECT_RULE_ACC_PREFIX ?? ""}
                            stylingMode="outlined"
                            label={t("CASHFLOW_COUNTER_ACCOUNTS_1", "Tài khoản đối ứng 1")}
                            labelMode="floating"
                            placeholder="131, 511, 515"
                            onValueChanged={(event) => updateSelectedRow((row) => ({
                              ...row,
                              DIRECT_RULE_ACC_PREFIX: String(event.value ?? ""),
                            }))}
                          />
                          <NumberBox
                            value={selectedRow.DIRECT_RULE_PRIORITY ?? selectedRow.SORT_ORDER}
                            min={0}
                            showSpinButtons={true}
                            stylingMode="outlined"
                            label={t("PRIORITY", "Ưu tiên")}
                            labelMode="floating"
                            onValueChanged={(event) => updateSelectedRow((row) => ({
                              ...row,
                              DIRECT_RULE_PRIORITY: toPositiveInteger(event.value, row.SORT_ORDER),
                            }))}
                          />
                        </div>
                        <SelectBox
                          dataSource={flowSignOptions}
                          valueExpr="value"
                          displayExpr="label"
                          value={selectedRow.DIRECT_RULE_FLOW_SIGN_2 ?? -1}
                          stylingMode="outlined"
                          label={t("CASHFLOW_RULE_2_DIRECTION", "Quy tắc thu/chi 2")}
                          labelMode="floating"
                          onValueChanged={(event) => updateSelectedRow((row) => ({
                            ...row,
                            DIRECT_RULE_FLOW_SIGN_2: Number(event.value) === -1 ? -1 : 1,
                          }))}
                        />
                        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_130px]">
                          <TextBox
                            value={selectedRow.DIRECT_RULE_ACC_PREFIX_2 ?? ""}
                            stylingMode="outlined"
                            label={t("CASHFLOW_COUNTER_ACCOUNTS_2", "Tài khoản đối ứng 2")}
                            labelMode="floating"
                            placeholder="331, 152, 642"
                            onValueChanged={(event) => updateSelectedRow((row) => ({
                              ...row,
                              DIRECT_RULE_ACC_PREFIX_2: String(event.value ?? ""),
                            }))}
                          />
                          <NumberBox
                            value={selectedRow.DIRECT_RULE_PRIORITY_2 ?? selectedRow.SORT_ORDER}
                            min={0}
                            showSpinButtons={true}
                            stylingMode="outlined"
                            label={t("PRIORITY", "Ưu tiên")}
                            labelMode="floating"
                            onValueChanged={(event) => updateSelectedRow((row) => ({
                              ...row,
                              DIRECT_RULE_PRIORITY_2: toPositiveInteger(event.value, row.SORT_ORDER),
                            }))}
                          />
                        </div>
                      </section>
                    ) : null}
                  </>
                )}

                <CollapsibleSection title={t("FORMULA_ADVANCED_SECTION", "Định danh & thứ tự")}>
                  <TextBox
                    value={selectedRow.LABEL_TEXT ?? ""}
                    stylingMode="outlined"
                    label={t("LABEL_TEXT", "Khóa dịch (LABEL_TEXT)")}
                    labelMode="floating"
                    readOnly
                    hint={t("LABEL_TEXT_HINT", "Khóa dịch đa ngôn ngữ; ưu tiên t(LABEL_TEXT), miss thì CAPTION/ITEM_NAME.")}
                  />
                  <div className="grid gap-2 sm:grid-cols-3">
                    <SelectBox
                      dataSource={elementTypeOptions}
                      valueExpr="value"
                      displayExpr="label"
                      value={selectedRow.ELEMENT_TYPE || "DETAIL"}
                      stylingMode="outlined"
                      label={t("ROW_TYPE", "Kiểu dòng")}
                      labelMode="floating"
                      onValueChanged={(event) => {
                        if (!isUserValueChange(event)) {
                          return
                        }

                        updateSelectedRow((row) => ({
                          ...row,
                          ELEMENT_TYPE: String(event.value ?? "DETAIL"),
                        }))
                      }}
                    />
                    <NumberBox
                      value={selectedRow.SORT_ORDER}
                      min={0}
                      showSpinButtons={true}
                      stylingMode="outlined"
                      label={t("SORT_ORDER", "Thứ tự trên báo cáo")}
                      labelMode="floating"
                      onValueChanged={(event) => {
                        if (!isUserValueChange(event)) {
                          return
                        }

                        updateSelectedRow((row) => ({
                          ...row,
                          SORT_ORDER: toPositiveInteger(event.value, row.SORT_ORDER),
                        }))
                      }}
                    />
                    <NumberBox
                      value={selectedRow.LEVEL_NO}
                      min={0}
                      max={10}
                      showSpinButtons={true}
                      stylingMode="outlined"
                      label={t("LEVEL_NO", "Cấp thụt lề")}
                      labelMode="floating"
                      onValueChanged={(event) => {
                        if (!isUserValueChange(event)) {
                          return
                        }

                        updateSelectedRow((row) => ({
                          ...row,
                          LEVEL_NO: toPositiveInteger(event.value, row.LEVEL_NO),
                        }))
                      }}
                    />
                  </div>
                  <div className="flex flex-wrap gap-1">
                    <Button
                      icon="chevronup"
                      stylingMode="text"
                      hint={t("MOVE_UP", "Đưa lên trên")}
                      disabled={saving || sortedRows[0]?.ITEM_KEY === selectedRow.ITEM_KEY}
                      onClick={() => moveSelectedRow(-1)}
                    />
                    <Button
                      icon="chevrondown"
                      stylingMode="text"
                      hint={t("MOVE_DOWN", "Đưa xuống dưới")}
                      disabled={saving || sortedRows[sortedRows.length - 1]?.ITEM_KEY === selectedRow.ITEM_KEY}
                      onClick={() => moveSelectedRow(1)}
                    />
                    <Button
                      icon="trash"
                      stylingMode="text"
                      hint={t("DELETE", "Xóa chỉ tiêu")}
                      disabled={saving}
                      onClick={deleteSelectedRow}
                    />
                  </div>
                </CollapsibleSection>

                <CollapsibleSection title={t("FORMULA_DISPLAY_SECTION", "Hiển thị trên báo cáo")}>
                  <div className="flex flex-wrap gap-5">
                    <CheckBox
                      value={selectedRow.IS_VISIBLE === "1"}
                      text={t("IS_VISIBLE", "Hiện trên báo cáo")}
                      onValueChanged={(event) => updateSelectedRow((row) => ({
                        ...row,
                        IS_VISIBLE: event.value ? "1" : "0",
                      }))}
                    />
                    <CheckBox
                      value={selectedRow.FONT_BOLD === "1"}
                      text={t("FONT_BOLD", "In đậm")}
                      onValueChanged={(event) => updateSelectedRow((row) => ({
                        ...row,
                        FONT_BOLD: event.value ? "1" : "0",
                      }))}
                    />
                    <CheckBox
                      value={selectedRow.FONT_ITALIC === "1"}
                      text={t("FONT_ITALIC", "In nghiêng")}
                      onValueChanged={(event) => updateSelectedRow((row) => ({
                        ...row,
                        FONT_ITALIC: event.value ? "1" : "0",
                      }))}
                    />
                  </div>
                </CollapsibleSection>
              </div>
            ) : (
              <div className="flex h-full min-h-[240px] items-center justify-center text-center text-sm text-slate-500">
                {t("CASHFLOW_SELECT_REPORT_LINE", "Chọn một chỉ tiêu bên trái để khai báo, hoặc bấm Thêm chỉ tiêu.")}
              </div>
            )}
          </section>
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-slate-300 bg-white pt-3">
          {isVatDeclaration && isDirty ? (
            <span className="mr-auto text-xs font-medium text-amber-700">
              {t("UNSAVED_CHANGES_HINT", "Có thay đổi chưa lưu")}
            </span>
          ) : null}
          <Button
            stylingMode="outlined"
            text={t("btnRefresh", "Tải lại")}
            disabled={loading || saving}
            onClick={() => void loadOptions()}
          />
          <Button
            stylingMode="outlined"
            type="danger"
            text={t("REPORT_FORMULA_RESET", "Về mặc định")}
            hint={t(
              "REPORT_FORMULA_RESET_HINT",
              "Xóa bản tùy chỉnh của công ty và lấy lại mẫu mặc định ban đầu",
            )}
            disabled={loading || saving || (!hasCompanyOverride && !isDirty)}
            onClick={() => void handleResetToDefault()}
          />
          <Button
            stylingMode="outlined"
            text={t("MSG_BTNCAN", "Đóng")}
            disabled={saving}
            onClick={onClose}
          />
          <Button
            icon="save"
            type="default"
            stylingMode="contained"
            text={saving ? t("SAVING", "Đang lưu...") : t("dxDataGrid-editingSaveRowChanges", "Lưu cấu hình")}
            disabled={!isDirty || loading || saving}
            onClick={() => void handleSave()}
          />
        </div>

        <LoadPanel visible={loading || saving || previewLoading} showIndicator={true} showPane={true} shading={false} />
      </div>
  )

  if (layout === "page") {
    return editor
  }

  return (
    <Popup
      visible={visible}
      title={title}
      showTitle={true}
      dragEnabled={false}
      hideOnOutsideClick={false}
      width="min(1440px, calc(100vw - 2rem))"
      maxWidth={1440}
      height="min(88vh, 920px)"
      onHiding={onClose}
    >
      {editor}
    </Popup>
  )
}
