import type { SysCode } from "@/api/sysCodeService"
import {
  buildEInvoiceNumericSysCodeOptions,
  type EInvoiceNumericSysCodeOption,
} from "./einvoiceSysCodeOptions"

export type EInvoiceTextMatchOp = "contains" | "startsWith" | "equals"

export type EInvoiceAdvancedFilters = {
  khhdon: string
  khhdonOp: EInvoiceTextMatchOp
  shdonFrom: string
  shdonTo: string
  nmuaTen: string
  nmuaTenOp: EInvoiceTextMatchOp
  nmuaMst: string
  nmuaMstOp: EInvoiceTextMatchOp
  invoiceStatus: number | null
  cqtStatus: number | null
  isSigned: number | null
  tchdon: number | null
  mailStatus: number | null
}

export type EInvoiceAdvancedFilterChip = {
  key: keyof EInvoiceAdvancedFilters | "dateRange"
  label: string
}

export const EMPTY_EINVOICE_ADVANCED_FILTERS: EInvoiceAdvancedFilters = {
  khhdon: "",
  khhdonOp: "contains",
  shdonFrom: "",
  shdonTo: "",
  nmuaTen: "",
  nmuaTenOp: "contains",
  nmuaMst: "",
  nmuaMstOp: "startsWith",
  invoiceStatus: null,
  cqtStatus: null,
  isSigned: null,
  tchdon: null,
  mailStatus: null,
}

export const EINVOICE_TEXT_MATCH_OPS: Array<{ value: EInvoiceTextMatchOp; text: string }> = [
  { value: "contains", text: "Chứa" },
  { value: "startsWith", text: "Bắt đầu bằng" },
  { value: "equals", text: "Bằng" },
]

export const EINV_CQT_STATUS_CODE_TYPE = "EINV_CQT_STATUS"
export const EINV_SIGN_STATUS_CODE_TYPE = "EINV_SIGN_STATUS"

export type EInvoiceFilterOption = EInvoiceNumericSysCodeOption

type SysCodeTranslate = (key: string, fallback: string) => string

export function buildEInvoiceCqtStatusOptions(codes: SysCode[], translate: SysCodeTranslate): EInvoiceFilterOption[] {
  return buildEInvoiceNumericSysCodeOptions(codes, translate, (value) => value >= 0 && value <= 2)
}

export function buildEInvoiceSignStatusOptions(codes: SysCode[], translate: SysCodeTranslate): EInvoiceFilterOption[] {
  return buildEInvoiceNumericSysCodeOptions(codes, translate, (value) => value === 0 || value === 1)
}

function trimText(value: unknown): string {
  return String(value ?? "").trim()
}

export function createEmptyEInvoiceAdvancedFilters(): EInvoiceAdvancedFilters {
  return { ...EMPTY_EINVOICE_ADVANCED_FILTERS }
}

export function cloneEInvoiceAdvancedFilters(filters: EInvoiceAdvancedFilters): EInvoiceAdvancedFilters {
  return { ...filters }
}

export function normalizeEInvoiceAdvancedFilters(filters: EInvoiceAdvancedFilters): EInvoiceAdvancedFilters {
  return {
    ...filters,
    khhdon: trimText(filters.khhdon),
    shdonFrom: trimText(filters.shdonFrom),
    shdonTo: trimText(filters.shdonTo),
    nmuaTen: trimText(filters.nmuaTen),
    nmuaMst: trimText(filters.nmuaMst),
  }
}

export function hasEInvoiceAdvancedFilters(filters: EInvoiceAdvancedFilters): boolean {
  const normalized = normalizeEInvoiceAdvancedFilters(filters)
  return Boolean(
    normalized.khhdon
    || normalized.shdonFrom
    || normalized.shdonTo
    || normalized.nmuaTen
    || normalized.nmuaMst
    || normalized.invoiceStatus !== null
    || normalized.cqtStatus !== null
    || normalized.isSigned !== null
    || normalized.tchdon !== null
    || normalized.mailStatus !== null,
  )
}

export function serializeEInvoiceAdvancedFilters(filters: EInvoiceAdvancedFilters): string {
  const normalized = normalizeEInvoiceAdvancedFilters(filters)
  return JSON.stringify(normalized)
}

export function clearEInvoiceAdvancedFilterField(
  filters: EInvoiceAdvancedFilters,
  key: keyof EInvoiceAdvancedFilters,
): EInvoiceAdvancedFilters {
  const next = cloneEInvoiceAdvancedFilters(filters)
  switch (key) {
    case "khhdon":
      next.khhdon = ""
      break
    case "khhdonOp":
      next.khhdonOp = "contains"
      break
    case "shdonFrom":
      next.shdonFrom = ""
      break
    case "shdonTo":
      next.shdonTo = ""
      break
    case "nmuaTen":
      next.nmuaTen = ""
      break
    case "nmuaTenOp":
      next.nmuaTenOp = "contains"
      break
    case "nmuaMst":
      next.nmuaMst = ""
      break
    case "nmuaMstOp":
      next.nmuaMstOp = "startsWith"
      break
    case "invoiceStatus":
    case "cqtStatus":
    case "isSigned":
    case "tchdon":
    case "mailStatus":
      next[key] = null
      break
    default:
      break
  }
  return next
}

type ChipLabelContext = {
  t: (key: string, fallback: string) => string
  formatDateRange?: string
  invoiceStatusLabel?: string
  tchdonLabel?: string
  mailStatusLabel?: string
  signStatusLabel?: string
  cqtStatusLabel?: string
}

function opLabel(op: EInvoiceTextMatchOp, t: ChipLabelContext["t"]): string {
  if (op === "startsWith") {
    return t("MATCH_STARTS_WITH", "Bắt đầu bằng")
  }
  if (op === "equals") {
    return t("MATCH_EQUALS", "Bằng")
  }
  return t("MATCH_CONTAINS", "Chứa")
}

export function buildEInvoiceAdvancedFilterChips(
  filters: EInvoiceAdvancedFilters,
  context: ChipLabelContext,
): EInvoiceAdvancedFilterChip[] {
  const chips: EInvoiceAdvancedFilterChip[] = []
  const normalized = normalizeEInvoiceAdvancedFilters(filters)
  const { t } = context

  if (context.formatDateRange) {
    chips.push({ key: "dateRange", label: context.formatDateRange })
  }

  if (normalized.khhdon) {
    chips.push({
      key: "khhdon",
      label: `${t("KHHDON", "Ký hiệu")}: ${opLabel(normalized.khhdonOp, t)} "${normalized.khhdon}"`,
    })
  }

  if (normalized.shdonFrom || normalized.shdonTo) {
    const from = normalized.shdonFrom || "…"
    const to = normalized.shdonTo || "…"
    chips.push({
      key: "shdonFrom",
      label: `${t("SHDON", "Số HĐ")}: ${from} - ${to}`,
    })
  }

  if (normalized.nmuaTen) {
    chips.push({
      key: "nmuaTen",
      label: `${t("NMUA_TEN", "Người mua")}: ${opLabel(normalized.nmuaTenOp, t)} "${normalized.nmuaTen}"`,
    })
  }

  if (normalized.nmuaMst) {
    chips.push({
      key: "nmuaMst",
      label: `${t("NMUA_MST", "MST")}: ${opLabel(normalized.nmuaMstOp, t)} "${normalized.nmuaMst}"`,
    })
  }

  if (normalized.invoiceStatus !== null && context.invoiceStatusLabel) {
    chips.push({
      key: "invoiceStatus",
      label: `${t("INVOICE_STATUS", "Trạng thái")}: ${context.invoiceStatusLabel}`,
    })
  }

  if (normalized.cqtStatus !== null && context.cqtStatusLabel) {
    chips.push({
      key: "cqtStatus",
      label: `${t("CQT_STATUS", "Trạng thái CQT")}: ${context.cqtStatusLabel}`,
    })
  }

  if (normalized.isSigned !== null && context.signStatusLabel) {
    chips.push({
      key: "isSigned",
      label: `${t("IS_SIGNED", "Trạng thái ký")}: ${context.signStatusLabel}`,
    })
  }

  if (normalized.tchdon !== null && context.tchdonLabel) {
    chips.push({
      key: "tchdon",
      label: `${t("TCHDON", "Loại hóa đơn")}: ${context.tchdonLabel}`,
    })
  }

  if (normalized.mailStatus !== null && context.mailStatusLabel) {
    chips.push({
      key: "mailStatus",
      label: `${t("MAIL_STATUS", "Đã gửi email")}: ${context.mailStatusLabel}`,
    })
  }

  return chips
}

export function toEInvoiceSearchFilterParams(filters: EInvoiceAdvancedFilters): Record<string, string | number> {
  const normalized = normalizeEInvoiceAdvancedFilters(filters)
  const params: Record<string, string | number> = {}

  if (normalized.khhdon) {
    params.khhdon = normalized.khhdon
    params.khhdonOp = normalized.khhdonOp
  }
  if (normalized.shdonFrom) {
    params.shdonFrom = normalized.shdonFrom
  }
  if (normalized.shdonTo) {
    params.shdonTo = normalized.shdonTo
  }
  if (normalized.nmuaTen) {
    params.nmuaTen = normalized.nmuaTen
    params.nmuaTenOp = normalized.nmuaTenOp
  }
  if (normalized.nmuaMst) {
    params.nmuaMst = normalized.nmuaMst
    params.nmuaMstOp = normalized.nmuaMstOp
  }
  if (normalized.invoiceStatus !== null) {
    params.invoiceStatus = normalized.invoiceStatus
  }
  if (normalized.cqtStatus !== null) {
    params.cqtStatus = normalized.cqtStatus
  }
  if (normalized.isSigned !== null) {
    params.isSigned = normalized.isSigned
  }
  if (normalized.tchdon !== null) {
    params.tchdon = normalized.tchdon
  }
  if (normalized.mailStatus !== null) {
    params.mailStatus = normalized.mailStatus
  }

  return params
}
