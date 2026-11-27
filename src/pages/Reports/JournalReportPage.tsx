import { lazy, Suspense, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import notify from "devextreme/ui/notify"
import LoadPanel from "devextreme-react/load-panel"
import SelectBox from "devextreme-react/select-box"
import CheckBox from "devextreme-react/check-box"
import type { RowDblClickEvent } from "devextreme/ui/data_grid"
import { useLocation } from "react-router-dom"

import {
  getConfiguredReportPreview,
  type ConfiguredReportPreview,
  type ConfiguredReportPreviewRequest,
} from "@/api/configuredReportPreviewApi"
import { EtcType } from "@/api/systemApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import type { ReportOption } from "@/api/reportOptionApi"
import ReportDataGrid, {
  type ReportDataGridGroupConfig,
  type ReportDataGridHandle,
  type ReportDataGridRow,
} from "@/components/datagrid/ReportDataGrid"
import ReportTreeList, { type ReportTreeListHandle } from "@/components/datagrid/ReportTreeList"
import { ReportToolbar } from "@/components/toolbar/ReportToolbar"
import {
  getAcclistLookupStore,
  reportAccountLookupStoreInstance,
} from "@/components/lookup/AcclistLookupStore"
import DxPage from "@/dx/DxPage"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { useReportOptionsQuery } from "@/hooks/queries/useReportQueries"
import { DEFAULT_CURRENCY_CODE, getPrimaryCurrencyCode } from "@/lib/currency"
import { LanguageContext } from "@/lib/i18nLoader"
import { createMonthStartDate } from "@/lib/dateRangeDefaults"
import { getCurrentCompanyCd, buildAppPath } from "@/lib/login"
import { getStoredGridTemplateId } from "@/lib/sysGridColumnTemplateStorage"
import {
  JOURNAL_REPORT_TAB_STATE_KEY,
  readWorkspaceTabState,
  writeWorkspaceTabState,
} from "@/lib/workspaceTabStateCache"
import { formatDateToYmd, normalizeYmd } from "@/pages/Accounting/accountingDateUtils"
import {
  joinReportFilterValues,
  splitReportFilterValues,
} from "@/pages/Accounting/reportFilterValues"
import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import { normalizeReportLanguage, type ReportLanguageCode } from "@/pages/Reports/reportLanguage"
import ReportPdfExportPopup, { type ReportPrintTemplateCode } from "@/components/reports/ReportPdfExportPopup"
import { getCashflowFormulaOptions, type CashflowFormulaOptions, type FormulaOptionPreviewParams } from "@/api/reportFormulaOptionApi"
import { getCanonicalReportCode } from "@/components/reports/formulaOptionsShared"
import FetchGdtVatPopup from "@/pages/Reports/components/FetchGdtVatPopup"

const ReportFormulaOptionsPopup = lazy(() => import("@/components/reports/ReportFormulaOptionsPopup"))
import { VAT_INVOICE_STATUS_OPTIONS } from "@/pages/Tax/vatInvoiceStatus"
import {
  ReportVoucherEditorHost,
  resolveAccountingLedger,
  type ReportVoucherEditorHostHandle,
} from "@/pages/Reports/ReportVoucherEditorHost"
import type { etcData } from "@/types/etcData"
import { resolveReportOptionCaption } from "@/utils/resolveConfigCaption"
import { EInvoiceTableShell } from "@/pages/EInvoice/components/EInvoiceTableShell"
import { useWorkspaceTabRoute, useWorkspaceTabs } from "@/components/workspaceTabs/WorkspaceTabs"

type JournalReportPageProps = {
  reportCode:
    | "AR_SALES_JOURNAL"
    | "AR_SALES_DETAIL"
    | "AP_PURCHASE_JOURNAL"
    | "GL_GENERAL_JOURNAL"
    | "BANK_DEPOSIT_BOOK"
    | "CASH_BOOK"
    | "INVENTORY_DETAIL_PRODUCT"
    | "INVENTORY_DETAIL_DEPARTMENT"
    | "INVENTORY_DETAIL_ACCOUNT"
    | "INVENTORY_DETAIL_STORE"
    | "INVENTORY_QUANTITY_REPORT"
    | "INVENTORY_SOURCE_DOCUMENT_REPORT"
    | "GL_GENERAL_LEDGER_S02C1DN"
    | "GL_ACCOUNT_DETAIL_S38DN"
    | "GL_AR_SUMMARY_S31DN"
    | "GL_AR_AGING"
    | "GL_AR_AGING_DETAIL"
    | "GL_AR_DETAIL_S31DN"
    | "GL_BOOK_AR_INVOICE"
    | "GL_MANAGEMENT_CODE_BOOK"
    | "GL_PL_SUMMARY"
    | "GL_PL_BY_OBJECT"
    | "GL_BALANCE_SHEET_B01DN"
    | "GL_PROFIT_LOSS_B02DN"
    | "GL_PROFIT_LOSS_B02DNTT"
    | "GL_COST_LIST"
    | "GL_TRIAL_BALANCE_S06DN"
    | "GL_CASHFLOW_B03DN_TT"
    | "GL_CASHFLOW_B03DN_GT"
    | "FA_DEPRECIATION_REPORT"
    | "FA_ASSET_BOOK_REPORT"
    | "FA_DEPRECIATION_PERIOD_REPORT"
    | "EINV_REPORT"
    | "TAX_VAT_INOUT_LIST"
    | "TAX_VAT_INVOICE_LIST"
    | "TAX_VAT_ALLOCATION"
    | "TAX_VAT_REDUCTION_APPENDIX"
    | "TAX_VAT_DECLARATION"
  menuCode:
    | "AR_REPORT_SALES_JOURNAL"
    | "AR_REPORT_SALES_DETAIL"
    | "GL_BOOK_SALES_DETAIL"
    | "AP_REPORT_PURCHASE_JOURNAL"
    | "GL_BOOK_JOURNAL"
    | "GL_BOOK_LEDGER"
    | "GL_BOOK_ACC_DETAIL"
    | "GL_BOOK_AR_SUM"
    | "GL_BOOK_AR_AGING"
    | "GL_BOOK_AR_AGING_DETAIL"
    | "GL_BOOK_AR_DETAIL"
    | "GL_BOOK_AR_INVOICE"
    | "GL_BOOK_MNG_REPORT"
    | "GL_BOOK_PL_SUM"
    | "GL_BOOK_PL_OBJ"
    | "BA_BANK_BOOK"
    | "CA_CASH_BOOK"
    | "GL_BOOK_TRIAL"
    | "GL_BOOK_COST_LIST"
    | "GL_FS_BALANCE"
    | "GL_FS_PL"
    | "GL_PROFIT_LOSS_B02DNTT"
    | "GL_FS_CASHFLOW"
    | "GL_CASHFLOW_B03DN_TT"
    | "GL_CASHFLOW_B03DN_GT"
    | "INV_REPORT_DETAIL_PRODUCT"
    | "INV_REPORT_DETAIL_DEPT"
    | "INV_REPORT_DETAIL_ACCOUNT"
    | "INV_REPORT_DETAIL_STORE"
    | "INV_REPORT_QUANTITY"
    | "INV_REPORT_SOURCE_DOC"
    | "FA_REPORT_DEPRECIATION"
    | "FA_REPORT_ASSET_BOOK"
    | "FA_REPORT_DEPRECIATION_PERIOD"
    | "EINV_REPORT"
    | "VAT_INOUT_LIST"
    | "VAT_INVOICE_LIST"
    | "VAT_ALLOCATION"
    | "VAT_REDUCTION_APPENDIX"
    | "TAX_VAT_INOUT_LIST"
    | "VAT_DECLARATION"
  titleKey: string
  titleFallback: string
  accountCd?: string
  customerCd?: string
  bankCd?: string
  fcType?: string
  productCd?: string
  storeCd?: string
  moduleCd?: string
  showAccountFilter?: boolean
  accountLookupMode?: "parent" | "parentChild"
  showCustomerFilter?: boolean
  showBankFilter?: boolean
  showCurrencyFilter?: boolean
  showWarehouseFilter?: boolean
  showProductFilter?: boolean
  showAssetStatusFilter?: boolean
  showInvoiceKindFilter?: boolean
  showInvoiceTypeFilter?: boolean
  /** Default BUY/SELL when URL has no `type` (VAT invoice list → SELL). */
  defaultInvoiceType?: "BUY" | "SELL"
  showInvoiceStatusFilter?: boolean
  showFetchFromGdt?: boolean
  accountQueryParamKey?: "accountCd" | "accCd"
  accountFilterEtcType?: EtcType
  accountFilterParam1?: string
  accountFilterParam2?: string
  includeEmptyFilterParams?: boolean
  reportVersion?: string
  unitDivisor?: string
  reportOptionGroupCode?: string
  useUseStartYmdFilter?: boolean
  /** Cost-list toolbar: In chi tiết (lọc LEVEL_NO). */
  costListToolbarOptions?: boolean
  enableCostListAccountDrill?: boolean
  arInvoiceToolbarOptions?: boolean
  /** Khi false: ẩn lookup "Mẫu in sổ", luôn in DEFAULT_GRID. */
  showBookPrintTemplate?: boolean
  /** Khi false: ẩn option "In mặc định" (DEFAULT_GRID), chỉ giữ mẫu in sổ. */
  showDefaultGridPrintTemplate?: boolean
}

type ReportRouteFilterState = {
  fromDate: Date | null
  toDate: Date | null
  useStartYmd: Date | null
  accountCodes: string[]
  customerCodes: string[]
  bankCodes: string[]
  currencyCodes: string[]
  warehouseCodes: string[]
  productCodes: string[]
  assetStatusCodes: string[]
  invoiceType: "BUY" | "SELL"
  invoiceStatus: string
  invoiceKind: string
  extraParams: Record<string, string>
}

type VatInvoiceType = "BUY" | "SELL"
function readInventoryFilters(params: Record<string, string>) {
  return {
    departmentCodes: splitFilterCodes(params.departmentCd ?? null),
    quantityOnly: params.quantityOnly === "1",
    hideNoMovement: params.hideNoMovement === "1",
  }
}

type JournalReportTabState = {
  routeIdentity: string
  reportCode: JournalReportPageProps["reportCode"]
  menuCode: JournalReportPageProps["menuCode"]
  fromDate: Date | null
  toDate: Date | null
  useStartYmd: Date | null
  accountCodes: string[]
  customerCodes: string[]
  bankCodes: string[]
  currencyCodes: string[]
  warehouseCodes: string[]
  productCodes: string[]
  assetStatusCodes: string[]
  invoiceType: VatInvoiceType
  /** Chiều VAT đã áp dụng cho preview/grid — chỉ cập nhật khi tìm kiếm/refresh. */
  appliedInvoiceType?: VatInvoiceType
  invoiceStatus: string
  invoiceKind: string
  searchText: string
  preview: ConfiguredReportPreview | null
  selectedReportOptionCode: string
  /** Option đã áp dụng cho preview/grid — chỉ cập nhật khi tìm kiếm/refresh. */
  appliedReportOptionCode: string
  exportLanguage: ReportLanguageCode
  exportPrintTemplate: ReportPrintTemplateCode
  showDetailRows?: boolean
  includeOpeningInvoices?: boolean
  inventoryFilters?: ReturnType<typeof readInventoryFilters>
}

const TOOLBAR_FIELD = "page-toolbar__field"

const ACCOUNT_FIELD_CANDIDATES = ["ACC_CD", "ACCOUNT_CD", "ACCOUNT_CODE", "AR_ACC_CD"]
const CUSTOMER_FIELD_CANDIDATES = ["CUSTOMER_CD", "CUSTOMER_CODE", "CUST_CD", "CUST_CODE", "OBJECT_CD", "PARTNER_CD"]
const BANK_FIELD_CANDIDATES = ["BANK_CD", "BANK_CODE", "BANK_OWN_CD"]
const CURRENCY_FIELD_CANDIDATES = ["FC_TYPE", "CURRENCY_CD", "CURRENCY_CODE", "CURR_CD"]
const WAREHOUSE_FIELD_CANDIDATES = ["STORE_CD", "STORE_CODE", "WAREHOUSE_CD", "WAREHOUSE_CODE"]
const PRODUCT_FIELD_CANDIDATES = ["PRODUCT_CD", "PRODUCT_CODE", "ITEM_CD", "ITEM_CODE", "MATERIAL_CD"]
const SOURCE_DOC_TYPE_FIELD_CANDIDATES = ["__CHIT_TYPE", "__SOURCE_DOC_TYPE"]
const SOURCE_DOC_ID_FIELD_CANDIDATES = ["__CHIT_ID", "__SOURCE_DOC_ID", "__DOC_ID"]
const MODULE_CD_FIELD_CANDIDATES = ["__MODULE_CD"]
const DRILL_TYPE_FIELD_CANDIDATES = ["__LINK_TYPE"]
const NON_NAVIGABLE_ROW_TYPES = new Set([
  "TOTAL",
  "SUBTOTAL",
  "GROUP_HEADER",
  "GROUP_FOOTER",
  "BALANCE_ONLY",
  "OPENING_BALANCE",
  "CLOSING_BALANCE",
  "OPENING",
  "CLOSING",
  "OPENING_TOTAL",
  "ENDING_TOTAL",
  "TOTAL_PERIOD",
  "TOTAL_RECEIPT",
  "TOTAL_PAYMENT",
  "TOTAL_FOOTER",
  "GRAND_TOTAL",
  "SUMMARY",
  "HEADER",
  "SECTION",
  "GROUP",
  "PERIOD_AVERAGE",
  "MONTH_AVERAGE",
  "BLANK",
  "EMPTY",
])
const STANDARD_ROUTE_PARAM_KEYS = new Set([
  "fromYmd",
  "toYmd",
  "useStartYmd",
  "accountCd",
  "accCd",
  "assetStatus",
  "customerCd",
  "bankCd",
  "fcType",
  "storeCd",
  "productCd",
  "companyCd",
  "reportCode",
  "menuCode",
  "reportGroupCode",
  "reportOptionCode",
  "moduleCd",
  "reportVersion",
  "unitDivisor",
  "language",
  "gridId",
  "templateId",
  "keyword",
  "searchText",
  "type",
  "status",
])
const SOURCE_DOC_TYPE_ALIASES: Record<string, string> = {
  RECEIPT: "RC",
  CASH_RECEIPT: "RC",
  PAYMENT: "PM",
  CASH_PAYMENT: "PM",
  DEBIT_NOTE: "DN",
  BANK_DEBIT: "DN",
  CREDIT_NOTE: "CN",
  BANK_CREDIT: "CN",
  PURCHASE: "PO",
  PURCHASE_GOODS: "PO",
  PURCHASE_SERVICE: "PS",
  PURCHASE_DISCOUNT: "PD",
  PURCHASE_RETURN: "PR",
  SALE: "SO",
  SALES: "SO",
  SALES_INVOICE: "SO",
  SALE_DISCOUNT: "SD",
  SALES_DISCOUNT: "SD",
  SALE_RETURN: "SR",
  SALES_RETURN: "SR",
  INVENTORY_INPUT: "IR",
  INVENTORY_RECEIPT: "IR",
  INVENTORY_OUTPUT: "IO",
  INVENTORY_ISSUE: "IO",
  INVENTORY_ADJUST: "IA",
  TRANSFER: "IA",
  INVENTORY_TRANSFER: "IA",
  INVENTORY_TRANSFER_VOUCHER: "IA",
  OFFSET: "CO",
  OTHER: "OT",
}
const REPORT_DRILL_ROUTES = [
  { reportCode: "AR_SALES_JOURNAL", menuCode: "AR_REPORT_SALES_JOURNAL", route: "/ar/report/sales-journal" },
  { reportCode: "AR_SALES_DETAIL", menuCode: "AR_REPORT_SALES_DETAIL", route: "/ar/report/sales-detail" },
  { reportCode: "AP_PURCHASE_JOURNAL", menuCode: "AP_REPORT_PURCHASE_JOURNAL", route: "/ap/report/purchase-journal" },
  { reportCode: "GL_GENERAL_JOURNAL", menuCode: "GL_BOOK_JOURNAL", route: "/gl/book/general-journal" },
  { reportCode: "GL_GENERAL_LEDGER_S02C1DN", menuCode: "GL_BOOK_LEDGER", route: "/gl/book/general-ledger" },
  { reportCode: "GL_ACCOUNT_DETAIL_S38DN", menuCode: "GL_BOOK_ACC_DETAIL", route: "/gl/book/account-detail" },
  { reportCode: "GL_AR_DETAIL_S31DN", menuCode: "GL_BOOK_AR_DETAIL", route: "/gl/book/ar-detail" },
  { reportCode: "GL_AR_SUMMARY_S31DN", menuCode: "GL_BOOK_AR_SUM", route: "/gl/book/ar-summary" },
  { reportCode: "GL_AR_AGING", menuCode: "GL_BOOK_AR_AGING", route: "/gl/book/ar-aging" },
  { reportCode: "GL_AR_AGING_DETAIL", menuCode: "GL_BOOK_AR_AGING_DETAIL", route: "/gl/book/ar-aging-detail" },
  { reportCode: "GL_TRIAL_BALANCE_S06DN", menuCode: "GL_BOOK_TRIAL", route: "/gl/book/trial-balance" },
  { reportCode: "INVENTORY_DETAIL_PRODUCT", menuCode: "INV_REPORT_DETAIL_PRODUCT", route: "/inventory/report/detail-product" },
  { reportCode: "INVENTORY_DETAIL_DEPARTMENT", menuCode: "INV_REPORT_DETAIL_DEPT", route: "/inventory/report/detail-department" },
  { reportCode: "INVENTORY_DETAIL_ACCOUNT", menuCode: "INV_REPORT_DETAIL_ACCOUNT", route: "/inventory/report/detail-account" },
  { reportCode: "INVENTORY_DETAIL_STORE", menuCode: "INV_REPORT_DETAIL_STORE", route: "/inventory/report/detail-store" },
  { reportCode: "INVENTORY_QUANTITY_REPORT", menuCode: "INV_REPORT_QUANTITY", route: "/inventory/report/quantity" },
  { reportCode: "INVENTORY_SOURCE_DOCUMENT_REPORT", menuCode: "INV_REPORT_SOURCE_DOC", route: "/inventory/report/source-doc" },
  { reportCode: "BANK_DEPOSIT_BOOK", menuCode: "BA_BANK_BOOK", route: "/bank/bank-book" },
  { reportCode: "CASH_BOOK", menuCode: "CA_CASH_BOOK", route: "/cash/cash-book" },
  { reportCode: "FA_DEPRECIATION_REPORT", menuCode: "FA_REPORT_DEPRECIATION", route: "/fa/report/depreciation" },
  { reportCode: "FA_ASSET_BOOK_REPORT", menuCode: "FA_REPORT_ASSET_BOOK", route: "/fa/report/asset-book" },
  { reportCode: "FA_DEPRECIATION_PERIOD_REPORT", menuCode: "FA_REPORT_DEPRECIATION_PERIOD", route: "/fa/report/depreciation-period" },
  { reportCode: "TAX_VAT_INOUT_LIST", menuCode: "VAT_INOUT_LIST", route: "/tax/vat/inout-list" },
  { reportCode: "TAX_VAT_INVOICE_LIST", menuCode: "VAT_INVOICE_LIST", route: "/tax/vat/invoice-list" },
  { reportCode: "TAX_VAT_ALLOCATION", menuCode: "VAT_ALLOCATION", route: "/tax/vat/allocation" },
  { reportCode: "TAX_VAT_REDUCTION_APPENDIX", menuCode: "VAT_REDUCTION_APPENDIX", route: "/tax/vat/reduction-appendix" },
  { reportCode: "TAX_VAT_DECLARATION", menuCode: "VAT_DECLARATION", route: "/tax/vat/declaration" },
] as const
const FALLBACK_REPORT_DRILL_ROUTES: Partial<Record<JournalReportPageProps["reportCode"], string>> = {
  GL_AR_SUMMARY_S31DN: "/gl/book/ar-detail",
  GL_AR_AGING: "/gl/book/ar-aging-detail",
  GL_TRIAL_BALANCE_S06DN: "/gl/book/account-detail",
  INVENTORY_QUANTITY_REPORT: "/inventory/report/detail-product",
}
function splitFilterCodes(value: string | null | undefined): string[] {
  return splitReportFilterValues(value)
}

function buildRouteFilterState(
  search: string,
  defaultInvoiceType: VatInvoiceType = "BUY",
): ReportRouteFilterState {
  const params = new URLSearchParams(search)
  const extraParams: Record<string, string> = {}

  params.forEach((value, key) => {
    const normalizedValue = value.trim()
    if (normalizedValue && !STANDARD_ROUTE_PARAM_KEYS.has(key)) {
      extraParams[key] = normalizedValue
    }
  })

  const rawInvoiceType = params.get("type") ?? params.get("vatDirection")

  return {
    fromDate: normalizeYmd(params.get("fromYmd")),
    toDate: normalizeYmd(params.get("toYmd")),
    useStartYmd: normalizeYmd(params.get("useStartYmd")),
    accountCodes: splitFilterCodes(params.get("accountCd") ?? params.get("accCd")),
    customerCodes: splitFilterCodes(params.get("customerCd")),
    bankCodes: splitFilterCodes(params.get("bankCd")),
    currencyCodes: splitFilterCodes(params.get("fcType")),
    warehouseCodes: splitFilterCodes(params.get("storeCd")),
    productCodes: splitFilterCodes(params.get("productCd")),
    assetStatusCodes: splitFilterCodes(params.get("assetStatus")),
	invoiceKind: (params.get("invoiceKind") ?? "").trim(),
    invoiceType: rawInvoiceType != null && rawInvoiceType.trim() !== ""
      ? normalizeInvoiceType(rawInvoiceType, defaultInvoiceType)
      : defaultInvoiceType,
    invoiceStatus: (params.get("status") ?? "").trim(),
    extraParams,
  }
}

function normalizeInvoiceType(
  value: string | null | undefined,
  fallback: VatInvoiceType = "BUY",
): VatInvoiceType {
  const normalized = (value ?? "").trim().toUpperCase()
  if (normalized === "SELL" || normalized === "OUT" || normalized === "2" || normalized === "0") {
    return "SELL"
  }
  if (normalized === "BUY" || normalized === "IN" || normalized === "1") {
    return "BUY"
  }

  return fallback
}

/** PDF/tab title for VAT invoice list — mirrors SP REPORT_TITLE_TEXT / TSvat_list_BUY|SELL. */
function resolveVatInvoiceListTitle(
  invoiceType: VatInvoiceType,
  translate: (key: string, fallback: string) => string,
): string {
  if (invoiceType === "BUY") {
    return translate(
      "TSvat_list_BUY",
      "BẢNG KÊ HOÁ ĐƠN, CHỨNG TỪ HÀNG HOÁ, DỊCH VỤ MUA VÀO",
    )
  }

  return translate(
    "TSvat_list_SELL",
    "BẢNG KÊ HÓA ĐƠN, CHỨNG TỪ HÀNG HÓA, DỊCH VỤ BÁN RA",
  )
}

function resolveInitialFilterCodes(routeCodes: string[], propValue?: string): string[] {
  return routeCodes.length > 0 ? routeCodes : splitFilterCodes(propValue)
}

function readReportRowText(row: ReportDataGridRow, fieldCandidates: readonly string[]): string | null {
  const rowFieldMap = new Map(Object.keys(row).map((key) => [key.trim().toUpperCase(), key]))

  for (const fieldName of fieldCandidates) {
    const actualFieldName = rowFieldMap.get(fieldName)
    if (!actualFieldName) {
      continue
    }

    const value = row[actualFieldName]
    if (typeof value === "string") {
      const normalized = value.trim()
      if (normalized) {
        return normalized
      }
    }

    if (typeof value === "number" && Number.isFinite(value)) {
      return String(value)
    }
  }

  return null
}

function isNavigableSummaryRow(row: ReportDataGridRow): boolean {
  const rowType = readReportRowText(row, ["__ROW_TYPE", "ROW_TYPE"])?.toUpperCase()
  return !rowType || !NON_NAVIGABLE_ROW_TYPES.has(rowType)
}

function parseReportDetailRowKey(rowKey: string | null): { moduleCd: string; chitId: number } | null {
  const match = /^DETAIL_([A-Z]+)_(\d+)_/i.exec(String(rowKey ?? "").trim())
  if (!match) {
    return null
  }

  const chitId = Number(match[2])
  if (!Number.isFinite(chitId) || chitId <= 0) {
    return null
  }

  return {
    moduleCd: match[1].toUpperCase(),
    chitId,
  }
}

function readReportRowNumber(row: ReportDataGridRow, fieldCandidates: readonly string[]): number | null {
  const text = readReportRowText(row, fieldCandidates)
  if (!text) {
    return null
  }

  const parsed = Number(text)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

function normalizeSourceDocType(value: string | null): string | null {
  const normalized = value?.trim().toUpperCase()
  if (!normalized) {
    return null
  }

  return SOURCE_DOC_TYPE_ALIASES[normalized] ?? normalized
}

function resolveReportDrillRoute(row: ReportDataGridRow): string | null {
  const targetReportCode = readReportRowText(row, ["__TARGET_REPORT_CODE"])?.toUpperCase()
  const targetMenuCode = readReportRowText(row, ["__TARGET_MENU_CODE"])?.toUpperCase()
  const routeConfig = REPORT_DRILL_ROUTES.find((route) => route.menuCode === targetMenuCode)
    ?? REPORT_DRILL_ROUTES.find((route) => route.reportCode === targetReportCode)

  return routeConfig?.route ?? null
}

function parseJsonDrillParams(value: string): Record<string, string> | null {
  try {
    const parsed: unknown = JSON.parse(value)
    if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
      return null
    }

    const result: Record<string, string> = {}
    Object.entries(parsed as Record<string, unknown>).forEach(([key, item]) => {
      if (typeof item === "string" || typeof item === "number" || typeof item === "boolean") {
        const normalizedValue = String(item).trim()
        if (key.trim() && normalizedValue) {
          result[key.trim()] = normalizedValue
        }
      }
    })

    return result
  } catch {
    return null
  }
}

function parseDrillParams(value: string | null): Record<string, string> {
  const normalized = value?.trim()
  if (!normalized) {
    return {}
  }

  if (normalized.startsWith("{")) {
    return parseJsonDrillParams(normalized) ?? {}
  }

  if (!normalized.includes("=")) {
    return {}
  }

  const result: Record<string, string> = {}
  const params = new URLSearchParams(normalized.replace(/;/g, "&").replace(/\|/g, "&"))
  params.forEach((paramValue, key) => {
    const normalizedKey = key.trim()
    const normalizedValue = paramValue.trim()
    if (normalizedKey && normalizedValue) {
      result[normalizedKey] = normalizedValue
    }
  })

  return result
}

function setQueryValue(query: URLSearchParams, key: string, value: string | null): void {
  const normalized = value?.trim()
  if (normalized) {
    query.set(key, normalized)
  }
}

function setQueryCodes(query: URLSearchParams, key: string, values: string[]): void {
  const normalized = joinReportFilterValues(values)
  if (normalized) {
    query.set(key, normalized)
  }
}

function getToday(): Date {
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  return today
}

function resolveFilterParam(value: string, includeEmpty: boolean): string | undefined {
  const trimmed = value.trim()
  return trimmed || (includeEmpty ? "" : undefined)
}

function resolveDefaultReportOptionCode(options: ReportOption[]): string {
  const defaultOption = options.find((option) => option.IS_DEFAULT === "1") ?? options[0]
  return defaultOption?.OPTION_CODE ?? ""
}

function buildReportPrintParams(
  params: ConfiguredReportPreviewRequest,
  printTemplate: ReportPrintTemplateCode,
): ConfiguredReportPreviewRequest {
  const { gridId, templateId, ...reportParams } = params

  if (printTemplate === "DEFAULT_GRID") {
    return {
      ...reportParams,
      printLayout: "DEFAULT_GRID",
      printGridId: gridId,
      printTemplateId: templateId,
    }
  }

  return {
    ...reportParams,
    printLayout: printTemplate,
  }
}

function isCanceledPreviewRequest(error: unknown): boolean {
  if (typeof error !== "object" || error === null) {
    return false
  }

  const candidate = error as { code?: unknown; name?: unknown }
  return candidate.code === "ERR_CANCELED" || candidate.name === "CanceledError" || candidate.name === "AbortError"
}

export default function JournalReportPage({
  reportCode,
  menuCode,
  titleKey,
  titleFallback,
  accountCd,
  customerCd,
  bankCd,
  fcType,
  productCd,
  storeCd,
  moduleCd,
  showAccountFilter = false,
  accountLookupMode = "parent",
  showCustomerFilter = false,
  showBankFilter = false,
  showCurrencyFilter = false,
  showWarehouseFilter = false,
  showProductFilter = false,
  showAssetStatusFilter = false,
  showInvoiceKindFilter = false,
  showInvoiceTypeFilter = false,
  defaultInvoiceType = "BUY",
  showInvoiceStatusFilter = false,
  showFetchFromGdt = false,
  accountQueryParamKey = "accountCd",
  accountFilterEtcType,
  accountFilterParam1,
  accountFilterParam2,
  includeEmptyFilterParams = false,
  reportVersion,
  unitDivisor,
  reportOptionGroupCode,
  useUseStartYmdFilter = false,
  costListToolbarOptions = false,
  enableCostListAccountDrill = false,
  arInvoiceToolbarOptions = false,
  showBookPrintTemplate = true,
  showDefaultGridPrintTemplate = true,
}: JournalReportPageProps) {
  const location = useLocation()
  const tabRoute = useWorkspaceTabRoute()
  const cacheTabId = tabRoute?.tabId ?? location.key
  const routeSearch = tabRoute?.search ?? location.search
  const routePathname = tabRoute?.pathname ?? location.pathname
  const { openWorkspacePath } = useWorkspaceTabs()
  const today = useMemo(() => getToday(), [])
  const routeFilterState = useMemo(
    () => buildRouteFilterState(routeSearch, defaultInvoiceType),
    [defaultInvoiceType, routeSearch],
  )
  const isInventoryDetail = reportCode.startsWith("INVENTORY_DETAIL_")
  const canOpenInventoryVoucher = isInventoryDetail || reportCode === "INVENTORY_SOURCE_DOCUMENT_REPORT"
  const isInventoryDepartment = reportCode === "INVENTORY_DETAIL_DEPARTMENT"
  const initialCurrencyCode = fcType ?? (showCurrencyFilter ? DEFAULT_CURRENCY_CODE : undefined)
  const routeIdentity = `${routePathname}${routeSearch}`
  const restoredTabStateRef = useRef<JournalReportTabState | null | undefined>(undefined)
  if (restoredTabStateRef.current === undefined) {
    const cached = readWorkspaceTabState<JournalReportTabState>(cacheTabId, JOURNAL_REPORT_TAB_STATE_KEY)
    const restored =
      cached
      && cached.reportCode === reportCode
      && cached.menuCode === menuCode
        ? cached
        : null
    restoredTabStateRef.current = restored
  }
  const restoredTabState = restoredTabStateRef.current ?? undefined
  const lastHandledPageIdentityRef = useRef(`${routeIdentity}|${reportCode}|${menuCode}`)
  const [fromDate, setFromDateState] = useState<Date | null>(
    () => restoredTabState?.fromDate ?? routeFilterState.fromDate ?? createMonthStartDate(today),
  )
  const [toDate, setToDateState] = useState<Date | null>(
    () => restoredTabState?.toDate ?? routeFilterState.toDate ?? today,
  )
  const [useStartYmd, setUseStartYmdState] = useState<Date | null>(
    () => restoredTabState?.useStartYmd ?? routeFilterState.useStartYmd ?? today,
  )
  const fromDateRef = useRef(fromDate)
  const toDateRef = useRef(toDate)
  const useStartYmdRef = useRef(useStartYmd)
  fromDateRef.current = fromDate
  toDateRef.current = toDate
  useStartYmdRef.current = useStartYmd

  const setFromDate = useCallback((value: Date | null) => {
    fromDateRef.current = value
    setFromDateState(value)
  }, [])
  const setToDate = useCallback((value: Date | null) => {
    toDateRef.current = value
    setToDateState(value)
  }, [])
  const setUseStartYmd = useCallback((value: Date | null) => {
    useStartYmdRef.current = value
    setUseStartYmdState(value)
  }, [])
  const [accountCodes, setAccountCodes] = useState<string[]>(
    () => restoredTabState?.accountCodes ?? resolveInitialFilterCodes(routeFilterState.accountCodes, accountCd),
  )
  const [customerCodes, setCustomerCodes] = useState<string[]>(
    () => restoredTabState?.customerCodes ?? resolveInitialFilterCodes(routeFilterState.customerCodes, customerCd),
  )
  const [bankCodes, setBankCodes] = useState<string[]>(
    () => restoredTabState?.bankCodes ?? resolveInitialFilterCodes(routeFilterState.bankCodes, bankCd),
  )
  const [currencyCodes, setCurrencyCodes] = useState<string[]>(
    () => restoredTabState?.currencyCodes ?? resolveInitialFilterCodes(routeFilterState.currencyCodes, initialCurrencyCode),
  )
  const [warehouseCodes, setWarehouseCodes] = useState<string[]>(
    () => restoredTabState?.warehouseCodes ?? resolveInitialFilterCodes(routeFilterState.warehouseCodes, storeCd),
  )
  const [productCodes, setProductCodes] = useState<string[]>(
    () => restoredTabState?.productCodes ?? resolveInitialFilterCodes(routeFilterState.productCodes, productCd),
  )
  const [inventoryFilters, setInventoryFilters] = useState(
    () => restoredTabState?.inventoryFilters ?? readInventoryFilters(routeFilterState.extraParams),
  )
  const changeReportCurrencyCodes = (codes: string[]) => {
    setCurrencyCodes(isInventoryDetail ? [getPrimaryCurrencyCode(codes)] : codes)
  }
  const [assetStatusCodes, setAssetStatusCodes] = useState<string[]>(
    () => restoredTabState?.assetStatusCodes ?? routeFilterState.assetStatusCodes,
  )
  const [invoiceType, setInvoiceType] = useState<VatInvoiceType>(
    () => restoredTabState?.invoiceType ?? routeFilterState.invoiceType,
  )
  const invoiceTypeRef = useRef(invoiceType)
  invoiceTypeRef.current = invoiceType
  const [appliedInvoiceType, setAppliedInvoiceType] = useState<VatInvoiceType>(
    () =>
      restoredTabState?.appliedInvoiceType ??
      restoredTabState?.invoiceType ??
      routeFilterState.invoiceType,
  )
  const [invoiceKind, setInvoiceKind] = useState(() => restoredTabState?.invoiceKind ?? routeFilterState.invoiceKind)
  const [invoiceStatus, setInvoiceStatus] = useState(
    () => restoredTabState?.invoiceStatus ?? routeFilterState.invoiceStatus,
  )
  const [searchText, setSearchText] = useState(() => restoredTabState?.searchText ?? "")
  const [preview, setPreview] = useState<ConfiguredReportPreview | null>(() => restoredTabState?.preview ?? null)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [selectedReportOptionCode, setSelectedReportOptionCode] = useState(
    () => restoredTabState?.selectedReportOptionCode ?? "",
  )
  const [appliedReportOptionCode, setAppliedReportOptionCode] = useState(
    () => restoredTabState?.appliedReportOptionCode ?? restoredTabState?.selectedReportOptionCode ?? "",
  )
  const [autoLoadVersion, setAutoLoadVersion] = useState(() => (restoredTabState?.preview ? 0 : 1))
  const lastAutoLoadedVersionRef = useRef(0)
  const autoLoadInFlightRef = useRef(false)
  const pendingDefaultAccountRef = useRef(false)
  const previewRequestSequenceRef = useRef(0)
  const previewRequestRef = useRef<{ controller: AbortController; requestId: number } | null>(null)
  const accountLookupStore = useMemo(() => {
    if (accountFilterEtcType !== undefined) {
      return getAcclistLookupStore({
        etcType: accountFilterEtcType,
        param1: accountFilterParam1,
        param2: accountFilterParam2,
      })
    }

    return reportAccountLookupStoreInstance
  }, [accountFilterEtcType, accountFilterParam1, accountFilterParam2])
  const accountLookupSingleSelect = accountLookupMode === "parentChild"
  const { lang, translate } = useContext(LanguageContext) as {
    lang?: string
    translate?: (key: string, fallback?: string) => string
  }

  const [exportPopupVisible, setExportPopupVisible] = useState(false)
  const [gdtPopupVisible, setGdtPopupVisible] = useState(false)
  const [exportLanguage, setExportLanguage] = useState<ReportLanguageCode>(
    () => restoredTabState?.exportLanguage ?? normalizeReportLanguage(lang ?? "VIET"),
  )
  const [exportPrintTemplate, setExportPrintTemplate] = useState<ReportPrintTemplateCode>(
    () => {
      if (!showBookPrintTemplate) {
        return "DEFAULT_GRID"
      }
      const restored = restoredTabState?.exportPrintTemplate ?? "BOOK"
      if (!showDefaultGridPrintTemplate && restored === "DEFAULT_GRID") {
        return "BOOK"
      }
      return restored
    },
  )
  const [showDetailRows, setShowDetailRows] = useState(
    () => !costListToolbarOptions || restoredTabState?.showDetailRows !== false,
  )
  const [includeOpeningInvoices, setIncludeOpeningInvoices] = useState(
    () =>
      !arInvoiceToolbarOptions ||
      restoredTabState?.includeOpeningInvoices !== false,
  )

  useEffect(() => {
    if (restoredTabState) {
      return
    }
    setExportLanguage(normalizeReportLanguage(lang ?? "VIET"))
  }, [lang, restoredTabState])

  useEffect(() => {
    const existing = readWorkspaceTabState<JournalReportTabState>(cacheTabId, JOURNAL_REPORT_TAB_STATE_KEY)
    writeWorkspaceTabState<JournalReportTabState>(cacheTabId, JOURNAL_REPORT_TAB_STATE_KEY, {
      routeIdentity,
      reportCode,
      menuCode,
      fromDate,
      toDate,
      useStartYmd,
      accountCodes,
      customerCodes,
      bankCodes,
      currencyCodes,
      warehouseCodes,
      productCodes,
      assetStatusCodes,
      invoiceType,
      appliedInvoiceType,
      invoiceStatus,
	  invoiceKind,
      searchText,
      preview: preview ?? existing?.preview ?? null,
      selectedReportOptionCode,
      appliedReportOptionCode,
      exportLanguage,
      exportPrintTemplate,
      showDetailRows,
      includeOpeningInvoices,
      inventoryFilters,
    })
  }, [
    accountCodes,
    appliedReportOptionCode,
    assetStatusCodes,
    bankCodes,
    currencyCodes,
    customerCodes,
    exportLanguage,
    exportPrintTemplate,
    fromDate,
    includeOpeningInvoices,
    inventoryFilters,
    invoiceStatus,
	invoiceKind,
    invoiceType,
    appliedInvoiceType,
    cacheTabId,
    menuCode,
    preview,
    productCodes,
    reportCode,
    routeIdentity,
    searchText,
    selectedReportOptionCode,
    showDetailRows,
    toDate,
    useStartYmd,
    warehouseCodes,
  ])

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const invoiceTypeOptions = useMemo(
    () => [
      { value: "SELL", label: t("SELL", "Hóa đơn đầu ra") },
      { value: "BUY", label: t("BUY", "Hóa đơn đầu vào") }
    ],
    [t],
  )
  const exportReportTitle = useMemo(() => {
    if (!showInvoiceTypeFilter) {
      return t(titleKey, titleFallback)
    }

    return resolveVatInvoiceListTitle(appliedInvoiceType, t)
  }, [appliedInvoiceType, showInvoiceTypeFilter, t, titleFallback, titleKey])

  const invoiceKindOptions = useMemo(() => [
    { value: "", label: t("ALL", "Tất cả") },
    ...[
      "Hóa đơn giá trị gia tăng",
      "Hóa đơn bán hàng",
      "Hóa đơn bán tài sản công",
      "Hóa đơn bán hàng dự trữ quốc gia",
      "Hóa đơn khác",
      "Phiếu xuất kho kiêm vận chuyển nội bộ",
      "Phiếu xuất kho hàng gửi bán đại lý",
    ].map((label, index) => ({ value: String(index + 1), label: t(`EInvoiceKind_${index + 1}`, label) })),
  ], [t])
  const invoiceStatusOptions = useMemo(
    () =>
      VAT_INVOICE_STATUS_OPTIONS.map((option) => ({
        value: option.value,
        label: t(option.langKey, option.fallback),
      })),
    [t],
  )

  const printTemplateOptions = useMemo(() => {
    const options: { code: ReportPrintTemplateCode; label: string }[] = []
    if (showBookPrintTemplate) {
      options.push({ code: "BOOK", label: t("REPORT_PRINT_TEMPLATE_BOOK", "Mẫu in sổ") })
    }
    if (showDefaultGridPrintTemplate || !showBookPrintTemplate) {
      options.push({
        code: "DEFAULT_GRID",
        label: t("REPORT_PRINT_TEMPLATE_DEFAULT_GRID", "In mặc định"),
      })
    }
    return options
  }, [showBookPrintTemplate, showDefaultGridPrintTemplate, t])

  const abortPreviewRequest = useCallback(() => {
    previewRequestRef.current?.controller.abort()
    previewRequestRef.current = null
  }, [])

  const effectiveReportOptionGroupCode = useMemo(
    () => reportOptionGroupCode ?? (menuCode === "GL_FS_CASHFLOW" ? "GL_FS_CASHFLOW" : undefined),
    [menuCode, reportOptionGroupCode],
  )

  const reportOptionsQueryEnabled = Boolean(effectiveReportOptionGroupCode)
  const {
    data: reportOptions = [],
    isLoading: reportOptionsLoading,
    isFetching: reportOptionsFetching,
    isError: reportOptionsError,
    error: reportOptionsLoadError,
  } = useReportOptionsQuery(effectiveReportOptionGroupCode, reportOptionsQueryEnabled)
  const reportOptionsLoaded = !reportOptionsQueryEnabled || (!reportOptionsLoading && !reportOptionsFetching)

  useMasterListLoadError(
    reportOptionsError,
    reportOptionsLoadError,
    t,
    "JournalReportPage.reportOptions",
  )

  useEffect(() => {
    return () => {
      lastAutoLoadedVersionRef.current = 0
      autoLoadInFlightRef.current = false
      abortPreviewRequest()
    }
  }, [abortPreviewRequest])

  useEffect(() => {
    if (restoredTabState) {
      return
    }
    setSelectedReportOptionCode("")
    setAppliedReportOptionCode("")
  }, [reportCode, restoredTabState])

  useEffect(() => {
    if (!effectiveReportOptionGroupCode || reportOptions.length === 0) {
      return
    }

    const defaultOptionCode = resolveDefaultReportOptionCode(reportOptions)
    setSelectedReportOptionCode((current) => current || defaultOptionCode)
    setAppliedReportOptionCode((current) => current || defaultOptionCode)
  }, [effectiveReportOptionGroupCode, reportOptions])

  useEffect(() => {
    const pageIdentity = `${routeIdentity}|${reportCode}|${menuCode}`
    if (lastHandledPageIdentityRef.current === pageIdentity) {
      return
    }

    lastHandledPageIdentityRef.current = pageIdentity
    abortPreviewRequest()
    setFromDate(routeFilterState.fromDate ?? createMonthStartDate(today))
    setToDate(routeFilterState.toDate ?? today)
    setUseStartYmd(routeFilterState.useStartYmd ?? today)
    const resolvedAccountCodes = resolveInitialFilterCodes(routeFilterState.accountCodes, accountCd)
    setAccountCodes(resolvedAccountCodes)
    pendingDefaultAccountRef.current =
      showAccountFilter && accountLookupSingleSelect && resolvedAccountCodes.length === 0
    setCustomerCodes(resolveInitialFilterCodes(routeFilterState.customerCodes, customerCd))
    setBankCodes(resolveInitialFilterCodes(routeFilterState.bankCodes, bankCd))
    setCurrencyCodes(resolveInitialFilterCodes(routeFilterState.currencyCodes, initialCurrencyCode))
    setWarehouseCodes(resolveInitialFilterCodes(routeFilterState.warehouseCodes, storeCd))
    setProductCodes(resolveInitialFilterCodes(routeFilterState.productCodes, productCd))
    setInventoryFilters(readInventoryFilters(routeFilterState.extraParams))
    setAssetStatusCodes(routeFilterState.assetStatusCodes)
    setInvoiceType(routeFilterState.invoiceType)
    setAppliedInvoiceType(routeFilterState.invoiceType)
    setInvoiceStatus(routeFilterState.invoiceStatus)
	setInvoiceKind(routeFilterState.invoiceKind)
    setSearchText("")
    setPreview(null)
    setPreviewLoading(false)
    setAutoLoadVersion((version) => version + 1)
  }, [abortPreviewRequest, accountCd, accountLookupSingleSelect, bankCd, customerCd, initialCurrencyCode, menuCode, productCd, reportCode, routeFilterState, routeIdentity, showAccountFilter, storeCd, today])

  useEffect(() => {
    if (restoredTabState) {
      pendingDefaultAccountRef.current = false
      return
    }
    if (!showAccountFilter || !accountLookupSingleSelect) {
      pendingDefaultAccountRef.current = false
      return
    }

    const resolvedAccountCodes = resolveInitialFilterCodes(routeFilterState.accountCodes, accountCd)
    if (resolvedAccountCodes.length > 0) {
      pendingDefaultAccountRef.current = false
      return
    }

    let cancelled = false
    pendingDefaultAccountRef.current = true

    void (async () => {
      try {
        const rows = (await accountLookupStore.load()) as etcData[]
        if (cancelled) {
          return
        }

        const firstCode = String(rows[0]?.CD ?? "").trim()
        if (firstCode) {
          setAccountCodes([firstCode])
        }
      } catch {
        // Keep empty selection when lookup fails; user can pick manually.
      } finally {
        if (!cancelled) {
          pendingDefaultAccountRef.current = false
          setAutoLoadVersion((version) => version + 1)
        }
      }
    })()

    return () => {
      cancelled = true
    }
  }, [accountCd, accountLookupSingleSelect, accountLookupStore, restoredTabState, routeFilterState.accountCodes, showAccountFilter])

  const validateFilter = useCallback((showMessage: boolean) => {
    if (useUseStartYmdFilter) {
      const normalizedUseStartYmd = formatDateToYmd(useStartYmdRef.current)
      if (!normalizedUseStartYmd) {
        if (showMessage) {
          notify(t("USE_START_YMD", "Ngày sử dụng"), "warning", 2500)
        }
        return false
      }

      return true
    }

    const normalizedFromYmd = formatDateToYmd(fromDateRef.current)
    if (!normalizedFromYmd) {
      if (showMessage) {
        notify(t("MSG_FROMDATE", "From Date"), "warning", 2500)
      }
      return false
    }

    const normalizedToYmd = formatDateToYmd(toDateRef.current)
    if (!normalizedToYmd) {
      if (showMessage) {
        notify(t("MSG_TODATE", "To Date"), "warning", 2500)
      }
      return false
    }

    if (normalizedFromYmd > normalizedToYmd) {
      if (showMessage) {
        notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
      }
      return false
    }

    return true
  }, [t, useUseStartYmdFilter])

  const buildReportParams = useCallback(
    (
      selectedReportLanguage?: ReportLanguageCode,
      overrides?: { vatDirection?: VatInvoiceType },
    ): ConfiguredReportPreviewRequest | null => {
      const companyCd = getCurrentCompanyCd()
      const fromDate = fromDateRef.current
      const toDate = toDateRef.current
      const useStartYmd = useStartYmdRef.current
      const normalizedFromYmd = formatDateToYmd(fromDate)
      const normalizedToYmd = formatDateToYmd(toDate)
      const normalizedUseStartYmd = formatDateToYmd(useStartYmd)
      const reportLanguage = selectedReportLanguage ?? normalizeReportLanguage(lang ?? "VIET")
      const language = normalizeReportLanguage(reportLanguage)
      const selectedReportOption = effectiveReportOptionGroupCode
        ? reportOptions.find((option) => option.OPTION_CODE === selectedReportOptionCode)
        : undefined
      const effectiveReportCode = selectedReportOption?.REPORT_CODE || reportCode
      const storedTemplateId = getStoredGridTemplateId(effectiveReportCode)
      const keyword = searchText.trim()
      const resolvedInvoiceType = overrides?.vatDirection ?? appliedInvoiceType

      if (useUseStartYmdFilter) {
        if (!normalizedUseStartYmd) {
          return null
        }
      } else if (!normalizedFromYmd || !normalizedToYmd) {
        return null
      }

      const accountFilterValue = showAccountFilter
        ? resolveFilterParam(joinReportFilterValues(accountCodes), includeEmptyFilterParams)
        : accountCd || undefined

      return {
        ...routeFilterState.extraParams,
        companyCd: companyCd || undefined,
        ...(useUseStartYmdFilter
          ? { useStartYmd: normalizedUseStartYmd ?? undefined }
          : {
              fromYmd: normalizedFromYmd ?? undefined,
              toYmd: normalizedToYmd ?? undefined,
            }),
        reportCode: effectiveReportCode,
        menuCode: effectiveReportOptionGroupCode ? effectiveReportCode : menuCode,
        reportGroupCode: effectiveReportOptionGroupCode,
        reportOptionCode: selectedReportOption?.OPTION_CODE,
        moduleCd: moduleCd ?? undefined,
        ...(accountQueryParamKey === "accCd"
          ? { accCd: accountFilterValue }
          : { accountCd: accountFilterValue }),
        customerCd: showCustomerFilter
          ? resolveFilterParam(joinReportFilterValues(customerCodes), includeEmptyFilterParams)
          : customerCd || undefined,
        bankCd: showBankFilter
          ? resolveFilterParam(joinReportFilterValues(bankCodes), includeEmptyFilterParams)
          : bankCd || undefined,
        fcType: showCurrencyFilter
          ? resolveFilterParam(joinReportFilterValues(currencyCodes), includeEmptyFilterParams)
          : fcType || undefined,
        storeCd: showWarehouseFilter
          ? resolveFilterParam(joinReportFilterValues(warehouseCodes), includeEmptyFilterParams)
          : storeCd || undefined,
        productCd: showProductFilter
          ? resolveFilterParam(joinReportFilterValues(productCodes), includeEmptyFilterParams)
          : productCd || undefined,
        keyword,
        searchText: keyword,
        assetStatus: showAssetStatusFilter
          ? resolveFilterParam(joinReportFilterValues(assetStatusCodes), includeEmptyFilterParams)
          : undefined,
        // rpt_fa_depreciation_period requires @p_DEPARTMENT_CD (blank = all)
        ...(reportCode === "FA_DEPRECIATION_PERIOD_REPORT"
          ? { departmentCd: resolveFilterParam("", includeEmptyFilterParams) ?? "" }
          : {}),
        ...(isInventoryDetail ? {
          quantityOnly: inventoryFilters.quantityOnly ? "1" : "0",
          hideNoMovement: inventoryFilters.hideNoMovement ? "1" : "0",
          fcType: getPrimaryCurrencyCode(currencyCodes),
        } : {}),
        ...(isInventoryDepartment ? { departmentCd: joinReportFilterValues(inventoryFilters.departmentCodes) } : {}),
		invoiceKind: showInvoiceKindFilter ? invoiceKind : undefined,
        type: showInvoiceTypeFilter ? resolvedInvoiceType : undefined,
        // SP rpt_vat_invoice_list(@p_VAT_DIRECTION) — sync BUY/SELL with Vat Detail Panel
        vatDirection: showInvoiceTypeFilter ? resolvedInvoiceType : undefined,
        status: showInvoiceStatusFilter
          ? resolveFilterParam(invoiceStatus, includeEmptyFilterParams)
          : undefined,
        reportVersion: reportVersion || undefined,
        unitDivisor: unitDivisor || undefined,
        language,
        ...(costListToolbarOptions
          ? { includeDetail: showDetailRows ? "1" : "0" }
          : {}),
        ...(arInvoiceToolbarOptions
          ? { includeOpening: includeOpeningInvoices ? "1" : "0" }
          : {}),
        gridId: effectiveReportCode,
        templateId: storedTemplateId > 0 ? String(storedTemplateId) : undefined,
      }
    },
    [accountCd, accountCodes, accountQueryParamKey, appliedInvoiceType, arInvoiceToolbarOptions, assetStatusCodes, bankCd, bankCodes, costListToolbarOptions, currencyCodes, customerCd, customerCodes, effectiveReportOptionGroupCode, fcType, includeEmptyFilterParams, includeOpeningInvoices, inventoryFilters, invoiceKind, showInvoiceKindFilter, invoiceStatus, isInventoryDepartment, isInventoryDetail, lang, menuCode, moduleCd, productCd, productCodes, reportCode, reportOptions, reportVersion, routeFilterState.extraParams, searchText, selectedReportOptionCode, showAccountFilter, showAssetStatusFilter, showBankFilter, showCurrencyFilter, showCustomerFilter, showDetailRows, showInvoiceStatusFilter, showInvoiceTypeFilter, showProductFilter, showWarehouseFilter, storeCd, unitDivisor, useUseStartYmdFilter, warehouseCodes],
  )

  const releaseAutoLoadInFlight = useCallback((requestId: number) => {
    const currentRequestId = previewRequestRef.current?.requestId
    if (currentRequestId === undefined || currentRequestId === requestId) {
      autoLoadInFlightRef.current = false
    }
  }, [])

  const loadPreview = useCallback(
    async (options?: { showValidationMessage?: boolean; trigger?: string; autoLoadVersion?: number }) => {
      const showValidationMessage = options?.showValidationMessage ?? false
      const trigger = options?.trigger ?? "manual"
      const requestedAutoLoadVersion = options?.autoLoadVersion
      const releaseAutoLoadIfNeeded = () => {
        if (trigger === "auto-load") {
          autoLoadInFlightRef.current = false
        }
      }

      if (effectiveReportOptionGroupCode && !reportOptionsLoaded) {
        releaseAutoLoadIfNeeded()
        return
      }

      if (!validateFilter(showValidationMessage)) {
        releaseAutoLoadIfNeeded()
        abortPreviewRequest()
        setPreviewLoading(false)
        return
      }

      // Combobox report option chỉ áp dụng filter khi tìm kiếm/refresh.
      if (effectiveReportOptionGroupCode && selectedReportOptionCode !== appliedReportOptionCode) {
        setAppliedReportOptionCode(selectedReportOptionCode)
        setPreview(null)
      }

      // Combobox chiều VAT (Doanh thu/Mua hàng): chỉ áp dụng khi tìm kiếm/refresh.
      const selectedInvoiceType = invoiceTypeRef.current
      const invoiceTypeToApply = showInvoiceTypeFilter ? selectedInvoiceType : appliedInvoiceType
      if (showInvoiceTypeFilter && selectedInvoiceType !== appliedInvoiceType) {
        setAppliedInvoiceType(selectedInvoiceType)
        setPreview(null)
      }

      const params = buildReportParams(
        undefined,
        showInvoiceTypeFilter ? { vatDirection: invoiceTypeToApply } : undefined,
      )
      if (!params) {
        releaseAutoLoadIfNeeded()
        abortPreviewRequest()
        setPreviewLoading(false)
        return
      }

      const previousRequest = previewRequestRef.current
      previousRequest?.controller.abort()
      const requestId = previewRequestSequenceRef.current + 1
      previewRequestSequenceRef.current = requestId
      const controller = new AbortController()
      previewRequestRef.current = { controller, requestId }

      setPreviewLoading(true)
      try {
        const data = await getConfiguredReportPreview(params, { signal: controller.signal })
        if (controller.signal.aborted || previewRequestRef.current?.requestId !== requestId) {
          if (trigger === "auto-load") {
            releaseAutoLoadInFlight(requestId)
          }
          return
        }

        setPreview(data)
        if (trigger === "auto-load" && typeof requestedAutoLoadVersion === "number") {
          lastAutoLoadedVersionRef.current = requestedAutoLoadVersion
          autoLoadInFlightRef.current = false
        }
      } catch (error) {
        const canceled = controller.signal.aborted || previewRequestRef.current?.requestId !== requestId || isCanceledPreviewRequest(error)
        if (canceled) {
          if (trigger === "auto-load") {
            releaseAutoLoadInFlight(requestId)
          }
          return
        }

        const message = getApiErrorMessage(error, t("LOAD_REPORT_PREVIEW_FAILED", "Không thể tải dữ liệu xem trước"))
        notify(message, "error", 3000)
      } finally {
        if (previewRequestRef.current?.requestId === requestId) {
          previewRequestRef.current = null
          setPreviewLoading(false)
        }
      }
    },
    [
      abortPreviewRequest,
      appliedInvoiceType,
      appliedReportOptionCode,
      buildReportParams,
      effectiveReportOptionGroupCode,
      fromDate,
      menuCode,
      releaseAutoLoadInFlight,
      reportOptionsLoaded,
      selectedReportOptionCode,
      showInvoiceTypeFilter,
      t,
      validateFilter,
    ],
  )

  const reportGridRef = useRef<ReportDataGridHandle | null>(null)
  const reportTreeRef = useRef<ReportTreeListHandle | null>(null)
  const voucherEditorHostRef = useRef<ReportVoucherEditorHostHandle | null>(null)

  const effectiveReportOptions = reportOptions

  const toolbarReportOptions = useMemo(
    () =>
      effectiveReportOptions.map((option) => ({
        value: option.OPTION_CODE,
        label: resolveReportOptionCaption(option, t),
      })),
    [effectiveReportOptions, t],
  )

  const effectiveDashboardReportCode = useMemo(
    () => {
      if (!effectiveReportOptionGroupCode) {
        return reportCode
      }

      return reportOptions.find((option) => option.OPTION_CODE === appliedReportOptionCode)?.REPORT_CODE || reportCode
    },
    [appliedReportOptionCode, effectiveReportOptionGroupCode, reportCode, reportOptions],
  )

  const formulaOptionsEnabled = useMemo(
    () => ["GL_CASHFLOW_B03DN_TT", "GL_CASHFLOW_B03DN_GT", "B03_DN_TT", "B03_DN_GT", "GL_BALANCE_SHEET_B01DN", "B01_DN", "GL_PROFIT_LOSS_B02DN", "GL_PROFIT_LOSS_B02DNTT", "B02_DN", "GL_COST_LIST", "COST_LIST", "TAX_VAT_DECLARATION", "GTGT_01"].includes(
      effectiveDashboardReportCode.trim().toUpperCase(),
    ),
    [effectiveDashboardReportCode],
  )

  const useEInvoiceTableLayout = useMemo(
    () =>
      reportCode === "EINV_REPORT" ||
      effectiveDashboardReportCode.trim().toUpperCase() === "EINV_REPORT",
    [effectiveDashboardReportCode, reportCode],
  )

  const vatInOutListGroupConfig = useMemo<ReportDataGridGroupConfig | undefined>(() => {
    const normalizedReportCode = effectiveDashboardReportCode.trim().toUpperCase()
    // VAT reduction appendix groups by purchase (1) / sale (2), unlike the
    // VAT in/out list which groups by invoice form (KHMSHDON).
    if (reportCode === "TAX_VAT_REDUCTION_APPENDIX" ||
        normalizedReportCode === "TAX_VAT_REDUCTION_APPENDIX") {
      return {
        groupField: "TYPE",
        labelField: "ITEM_KIND",
        labelPrefixKey: "VAT_INOUT_TYPE",
        labelPrefixFallback: "Loại hóa đơn",
        labelOnly: true,
      }
    }

    // Bảng kê hóa đơn: group by phân loại bảng kê (VAT_INFO_TYPE), same section UI.
    if (reportCode === "TAX_VAT_INVOICE_LIST" ||
        normalizedReportCode === "TAX_VAT_INVOICE_LIST") {
      return {
        groupField: "VAT_INFO_TYPE",
        labelField: "VAT_INFO_TYPE_NM",
        labelPrefixKey: "VAT_INFO_TYPE",
        labelPrefixFallback: "Phân loại bảng kê",
        labelOnly: true,
      }
    }

    if (reportCode !== "TAX_VAT_INOUT_LIST" && normalizedReportCode !== "TAX_VAT_INOUT_LIST") {
      return undefined
    }

    return {
      groupField: "KHMSHDON",
      labelField: "KHMSHDON_TEN",
      labelPrefixKey: "VAT_INOUT_TYPE",
      labelPrefixFallback: "Loại hóa đơn",
    }
  }, [effectiveDashboardReportCode, reportCode])

  const handleReportOptionChange = useCallback((value: string | null) => {
    const nextOptionCode = value?.trim()
    if (!nextOptionCode) {
      return
    }

    setSelectedReportOptionCode(nextOptionCode)
  }, [])

  const useReportTreeList = preview?.VIEW_TYPE?.trim().toUpperCase() === "TREE_LIST"

  const handleOpenGridSettings = useCallback(() => {
    if (useReportTreeList) {
      void reportTreeRef.current?.openColumnSettings()
      return
    }

    void reportGridRef.current?.openColumnSettings()
  }, [useReportTreeList])

  const [formulaOptionsVisible, setFormulaOptionsVisible] = useState(false)
  const [formulaOptionsOpening, setFormulaOptionsOpening] = useState(false)
  const [formulaPopupShown, setFormulaPopupShown] = useState(false)
  const [formulaOptionsInitialData, setFormulaOptionsInitialData] = useState<CashflowFormulaOptions | null>(null)
  const formulaOptionsOpeningRef = useRef(false)
  const formulaOptionsOpenControllerRef = useRef<AbortController | null>(null)

  // Cancel a pending prefetch if the report changes or this screen unmounts.
  useEffect(() => () => {
    formulaOptionsOpenControllerRef.current?.abort()
  }, [effectiveDashboardReportCode, reportVersion])

  const formulaPreviewParams = useMemo<FormulaOptionPreviewParams>(() => ({
    previewReportCode: effectiveDashboardReportCode,
    fromYmd: formatDateToYmd(fromDate) || "",
    toYmd: formatDateToYmd(toDate) || "",
    unitDivisor: unitDivisor?.trim() || "1",
    menuCode: menuCode?.trim() || "",
  }), [effectiveDashboardReportCode, fromDate, menuCode, toDate, unitDivisor])

  useEffect(() => {
    if (!formulaOptionsEnabled) {
      return
    }
    // Warm the formula editor chunk while the report stays open.
    void import("@/components/reports/ReportFormulaOptionsPopup")
  }, [formulaOptionsEnabled])

  const handleOpenFormulaSettings = useCallback(async () => {
    if (formulaOptionsVisible || formulaOptionsOpeningRef.current) return

    formulaOptionsOpeningRef.current = true
    setFormulaPopupShown(false)
    setFormulaOptionsOpening(true)
    const controller = new AbortController()
    formulaOptionsOpenControllerRef.current = controller

    try {
      // Only mount Popup after the template is ready, avoiding a skeleton-to-grid flash.
      const options = await getCashflowFormulaOptions(
        getCanonicalReportCode(effectiveDashboardReportCode),
        reportVersion,
        controller.signal,
      )
      if (controller.signal.aborted) return

      setFormulaOptionsInitialData(options)
      setFormulaOptionsVisible(true)
    } catch (error) {
      if (!controller.signal.aborted) {
        notify(getApiErrorMessage(error, t("LOAD_FAILED", "Không thể tải cấu hình công thức")), "error", 4000)
      }
    } finally {
      if (formulaOptionsOpenControllerRef.current === controller) {
        formulaOptionsOpenControllerRef.current = null
        formulaOptionsOpeningRef.current = false
        setFormulaOptionsOpening(false)
      }
    }
  }, [effectiveDashboardReportCode, formulaOptionsVisible, reportVersion, t])

  const handleCloseFormulaSettings = useCallback(() => {
    formulaOptionsOpenControllerRef.current?.abort()
    setFormulaOptionsVisible(false)
    setFormulaOptionsInitialData(null)
    setFormulaPopupShown(false)
  }, [])

  const handleFormulaPopupShown = useCallback(() => {
    setFormulaPopupShown(true)
  }, [])

  const handleFormulaSettingsSaved = useCallback(() => {
    void loadPreview({ showValidationMessage: false })
  }, [loadPreview])

  const openReportDrillInBrowserTab = useCallback(
    (route: string, query: URLSearchParams) => {
      const targetPath = buildAppPath(getCurrentCompanyCd(), `${route}?${query.toString()}`)
      const targetUrl = new URL(targetPath, window.location.origin).toString()
      const opened = openReportViewerPage(targetUrl)
      if (!opened) {
        notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
      }
    },
    [t],
  )

  const handleReportRowDblClick = useCallback(
    (event: RowDblClickEvent<ReportDataGridRow, string>) => {
      const row = event.data
      if (!row || (reportCode === "GL_COST_LIST" && !enableCostListAccountDrill)) {
        return
      }

      if (reportCode === "INVENTORY_QUANTITY_REPORT") {
        const quantityProductCd = readReportRowText(row, PRODUCT_FIELD_CANDIDATES)
        if (!quantityProductCd) {
          return
        }

        const query = new URLSearchParams()
        setQueryValue(query, "fromYmd", formatDateToYmd(fromDate))
        setQueryValue(query, "toYmd", formatDateToYmd(toDate))
        setQueryValue(query, "productCd", quantityProductCd)
        setQueryCodes(query, "storeCd", warehouseCodes)
        setQueryCodes(query, "accountCd", accountCodes)
        openReportDrillInBrowserTab("/inventory/report/detail-product", query)
        return
      }

      if (!isNavigableSummaryRow(row)) {
        return
      }

      const drillType = readReportRowText(row, DRILL_TYPE_FIELD_CANDIDATES)?.toUpperCase() ?? ""
      if (reportCode === "GL_COST_LIST") {
        const targetRoute = resolveReportDrillRoute(row)
        if (drillType !== "REPORT" || !targetRoute) {
          return
        }

        const query = new URLSearchParams(parseDrillParams(readReportRowText(row, ["__DRILL_PARAMS"])))
        const accountCd = query.get("accountCd")
        const fromYmd = query.get("fromYmd")
        const toYmd = query.get("toYmd")
        if (!accountCd || !fromYmd || !toYmd) {
          return
        }

        openReportDrillInBrowserTab(targetRoute, query)
        return
      }

      const parsedRowKey = parseReportDetailRowKey(readReportRowText(row, ["__ROW_KEY", "ROW_KEY"]))
      const sourceDocType = normalizeSourceDocType(readReportRowText(row, SOURCE_DOC_TYPE_FIELD_CANDIDATES))
      const sourceDocId = readReportRowNumber(row, SOURCE_DOC_ID_FIELD_CANDIDATES) ?? parsedRowKey?.chitId ?? null
      const canOpenDocument = Boolean(sourceDocId)

      if (drillType === "NONE") {
        return
      }

      if ((drillType === "DOCUMENT" || (!drillType && canOpenDocument)) && sourceDocId) {
        const inventoryVoucherRoute = sourceDocType === "IR" ? "/inventory/receipt"
          : sourceDocType === "IO" ? "/inventory/issue"
          : sourceDocType === "IA" ? "/inventory/adjust" : null
        if (canOpenInventoryVoucher && inventoryVoucherRoute) {
          const query = new URLSearchParams({ openChitId: String(sourceDocId) })
          openWorkspacePath(buildAppPath(getCurrentCompanyCd(), `${inventoryVoucherRoute}?${query.toString()}`))
          return
        }
        if (canOpenInventoryVoucher && sourceDocType === "IRO") return

        const resolved = resolveAccountingLedger(
          sourceDocType,
          readReportRowText(row, MODULE_CD_FIELD_CANDIDATES) ?? parsedRowKey?.moduleCd,
        )
        if (!resolved) {
          notify(t("UNABLE_TO_OPEN_VOUCHER", "Không mở được phiếu này"), "warning", 3000)
          return
        }

        const voucherHost = voucherEditorHostRef.current
        void voucherHost?.open(resolved.ledger, resolved.chitType, sourceDocId)
        return
      }

      const targetRoute = resolveReportDrillRoute(row) ?? (!drillType ? FALLBACK_REPORT_DRILL_ROUTES[reportCode] ?? null : null)
      if (drillType && drillType !== "REPORT") {
        return
      }

      if (!targetRoute) {
        return
      }

      const query = new URLSearchParams(parseDrillParams(readReportRowText(row, ["__DRILL_PARAMS"])))
      const normalizedFromYmd = formatDateToYmd(fromDate)
      const normalizedToYmd = formatDateToYmd(toDate)

      if (!query.has("fromYmd")) {
        setQueryValue(query, "fromYmd", normalizedFromYmd)
      }

      if (!query.has("toYmd")) {
        setQueryValue(query, "toYmd", normalizedToYmd)
      }

      if (!query.has("accountCd")) {
        setQueryValue(query, "accountCd", readReportRowText(row, ACCOUNT_FIELD_CANDIDATES))
      }

      if (!query.has("customerCd")) {
        setQueryValue(query, "customerCd", readReportRowText(row, CUSTOMER_FIELD_CANDIDATES))
      }

      if (!query.has("bankCd")) {
        setQueryValue(query, "bankCd", readReportRowText(row, BANK_FIELD_CANDIDATES))
      }

      if (!query.has("fcType")) {
        setQueryValue(query, "fcType", readReportRowText(row, CURRENCY_FIELD_CANDIDATES))
      }

      if (!query.has("storeCd")) {
        setQueryValue(query, "storeCd", readReportRowText(row, WAREHOUSE_FIELD_CANDIDATES))
      }

      if (!query.has("productCd")) {
        setQueryValue(query, "productCd", readReportRowText(row, PRODUCT_FIELD_CANDIDATES))
      }

      if (!query.has("accountCd")) {
        setQueryCodes(query, "accountCd", accountCodes)
      }

      if (!query.has("customerCd")) {
        setQueryCodes(query, "customerCd", customerCodes)
      }

      if (!query.has("bankCd")) {
        setQueryCodes(query, "bankCd", bankCodes)
      }

      if (!query.has("fcType")) {
        setQueryCodes(query, "fcType", currencyCodes)
      }

      if (!query.has("storeCd")) {
        setQueryCodes(query, "storeCd", warehouseCodes)
      }

      if (!query.has("productCd")) {
        setQueryCodes(query, "productCd", productCodes)
      }

      const queryText = query.toString()
      const targetPath = queryText ? `${targetRoute}?${queryText}` : targetRoute
      openWorkspacePath(buildAppPath(getCurrentCompanyCd(), targetPath))
    },
    [accountCodes, bankCodes, canOpenInventoryVoucher, currencyCodes, customerCodes, enableCostListAccountDrill, fromDate, openReportDrillInBrowserTab, openWorkspacePath, productCodes, reportCode, t, toDate, warehouseCodes],
  )

  const openExportPopup = useCallback(() => {
    setExportPopupVisible(true)
  }, [])

  const closeExportPopup = useCallback(() => {
    setExportPopupVisible(false)
  }, [])

  const handleExportPdf = useCallback(
    (selectedReportLanguage: ReportLanguageCode, selectedPrintTemplate: ReportPrintTemplateCode) => {
      if (!validateFilter(true)) {
        return
      }

      const reportParams = buildReportParams(selectedReportLanguage)
      if (!reportParams) {
        return
      }

      const printTemplate: ReportPrintTemplateCode = !showBookPrintTemplate
        ? "DEFAULT_GRID"
        : !showDefaultGridPrintTemplate
          ? "BOOK"
          : selectedPrintTemplate

      setExportPopupVisible(false)
      setExportLanguage(selectedReportLanguage)
      setExportPrintTemplate(printTemplate)

      const targetUrl = buildReportViewerPageUrl(buildReportPrintParams(reportParams, printTemplate))
      if (!openReportViewerPage(targetUrl, exportReportTitle)) {
        notify(t("UNABLE_TO_OPEN_REPORT_VIEWER", "Không mở được trình xem báo cáo"), "error", 3000)
      }
    },
    [buildReportParams, exportReportTitle, showBookPrintTemplate, showDefaultGridPrintTemplate, t, validateFilter],
  )

  useEffect(() => {
    if (autoLoadVersion <= 0 || lastAutoLoadedVersionRef.current === autoLoadVersion || autoLoadInFlightRef.current) {
      return
    }

    if (effectiveReportOptionGroupCode && !reportOptionsLoaded) {
      return
    }

    if (effectiveReportOptionGroupCode && !selectedReportOptionCode.trim()) {
      return
    }

    if (showAccountFilter && accountLookupSingleSelect && pendingDefaultAccountRef.current) {
      return
    }

    autoLoadInFlightRef.current = true
    void loadPreview({ trigger: "auto-load", autoLoadVersion })
  }, [
    accountLookupSingleSelect,
    autoLoadVersion,
    effectiveReportOptionGroupCode,
    loadPreview,
    reportOptionsLoaded,
    selectedReportOptionCode,
    showAccountFilter,
  ])

  return (
    <DxPage key={reportCode}>
      <div className="flex h-full min-h-0 flex-col overflow-hidden">
        <section className="flex min-h-0 flex-1 flex-col gap-2 overflow-hidden">
          <div className="flex-shrink-0 overflow-visible">
            <ReportToolbar
              accountCodes={showAccountFilter ? accountCodes : undefined}
              accountLookupStore={accountLookupStore}
              accountLookupSingleSelect={accountLookupSingleSelect}
              customerCodes={showCustomerFilter ? customerCodes : undefined}
              bankCodes={showBankFilter ? bankCodes : undefined}
              currencyCodes={showCurrencyFilter ? currencyCodes : undefined}
              currencyLookupSingleSelect={isInventoryDetail}
              currencyAllOptionEnabled={reportCode === "TAX_VAT_REDUCTION_APPENDIX"}
              warehouseCodes={showWarehouseFilter ? warehouseCodes : undefined}
              productCodes={showProductFilter ? productCodes : undefined}
              departmentCodes={isInventoryDepartment ? inventoryFilters.departmentCodes : undefined}
              assetStatusCodes={showAssetStatusFilter ? assetStatusCodes : undefined}
              fromDate={useUseStartYmdFilter ? undefined : fromDate}
              toDate={useUseStartYmdFilter ? undefined : toDate}
              useStartYmd={useUseStartYmdFilter ? useStartYmd : undefined}
              dateFilterMode={useUseStartYmdFilter ? "useStartYmd" : "range"}
              reportOption={selectedReportOptionCode}
              reportOptions={toolbarReportOptions}
              reportOptionLookupVisible={Boolean(effectiveReportOptionGroupCode)}
              reportOptionLoading={!reportOptionsLoaded && toolbarReportOptions.length === 0}
              searchText={searchText}
              onAccountCodesChange={showAccountFilter ? setAccountCodes : undefined}
              onCustomerCodesChange={showCustomerFilter ? setCustomerCodes : undefined}
              onBankCodesChange={showBankFilter ? setBankCodes : undefined}
              onCurrencyCodesChange={showCurrencyFilter ? changeReportCurrencyCodes : undefined}
              onWarehouseCodesChange={showWarehouseFilter ? setWarehouseCodes : undefined}
              onProductCodesChange={showProductFilter ? setProductCodes : undefined}
              onDepartmentCodesChange={isInventoryDepartment
                ? (departmentCodes) => setInventoryFilters((filters) => ({ ...filters, departmentCodes }))
                : undefined}
              onAssetStatusCodesChange={showAssetStatusFilter ? setAssetStatusCodes : undefined}
              onReportOptionChange={handleReportOptionChange}
              onFromDateChange={useUseStartYmdFilter ? undefined : setFromDate}
              onToDateChange={useUseStartYmdFilter ? undefined : setToDate}
              onUseStartYmdChange={useUseStartYmdFilter ? setUseStartYmd : undefined}
              costListOptionsVisible={costListToolbarOptions}
              showDetailRows={showDetailRows}
              onShowDetailRowsChange={costListToolbarOptions ? setShowDetailRows : undefined}
              arInvoiceOptionsVisible={arInvoiceToolbarOptions}
              includeOpeningInvoices={includeOpeningInvoices}
              onIncludeOpeningInvoicesChange={
                arInvoiceToolbarOptions ? setIncludeOpeningInvoices : undefined
              }
              onSearchTextChange={setSearchText}
              onSearch={() => void loadPreview({ showValidationMessage: true })}
              onRefresh={() => void loadPreview({ showValidationMessage: true })}
              onPrint={openExportPopup}
              onExportPdf={openExportPopup}
              onSysGridColumnSettings={handleOpenGridSettings}
              onFetchFromGdt={showFetchFromGdt ? () => setGdtPopupVisible(true) : undefined}
              onFormulaSettings={formulaOptionsEnabled ? handleOpenFormulaSettings : undefined}
              showSearch={true}
              showRefresh={true}
              showPrint={false}
              showExportPdf={true}
              showFetchFromGdt={showFetchFromGdt}
              shortcutsEnabled={!exportPopupVisible && !gdtPopupVisible}
              accountFilterEtcType={accountFilterEtcType}
              accountFilterParam1={accountFilterParam1}
              accountFilterParam2={accountFilterParam2}
			  initialFilters={showInvoiceKindFilter ? (
                <>
                  {showInvoiceStatusFilter ? (
                    <SelectBox className={TOOLBAR_FIELD} dataSource={invoiceStatusOptions}
                      displayExpr="label" valueExpr="value" value={invoiceStatus}
                      stylingMode="outlined" label={t("TTHAI", "Trạng thái")}
                      labelMode="floating" width={220} showClearButton={false}
                      onValueChanged={(event) => setInvoiceStatus(String(event.value ?? ""))} />
                  ) : null}
                  <SelectBox className={TOOLBAR_FIELD} dataSource={invoiceKindOptions}
                    displayExpr="label" valueExpr="value" value={invoiceKind}
                    stylingMode="outlined" label={t("labelBillSymbolType", "Loại hóa đơn")}
                    labelMode="floating" width={220} showClearButton={false}
                    onValueChanged={(event) => setInvoiceKind(String(event.value ?? ""))} />
                </>
              ) : undefined}
              leadingFilters={
                isInventoryDetail ? (
                  <>
                    <CheckBox text={t("QUANTITY_ONLY", "Chỉ số lượng")} value={inventoryFilters.quantityOnly}
                      onValueChanged={(event) => setInventoryFilters((filters) => ({ ...filters, quantityOnly: Boolean(event.value) }))} />
                    <CheckBox text={t("HIDE_NO_INVENTORY_MOVEMENT", "Ẩn mã hàng không phát sinh")} value={inventoryFilters.hideNoMovement}
                      onValueChanged={(event) => setInventoryFilters((filters) => ({ ...filters, hideNoMovement: Boolean(event.value) }))} />
                  </>
                ) : !showInvoiceKindFilter && (showInvoiceTypeFilter || showInvoiceStatusFilter) ? (
                  <>
                    {showInvoiceTypeFilter ? (
                      <SelectBox
                        className={TOOLBAR_FIELD}
                        dataSource={invoiceTypeOptions}
                        displayExpr="label"
                        valueExpr="value"
                        value={invoiceType}
                        stylingMode="outlined"
                        label={t("VAT_DIRECTION", "Chiều VAT")}
                        labelMode="floating"
                        width={220}
                        showClearButton={false}
                        onValueChanged={(event) =>
                          setInvoiceType(normalizeInvoiceType(String(event.value ?? defaultInvoiceType), defaultInvoiceType))
                        }
                      />
                    ) : null}
                    {showInvoiceStatusFilter ? (
                      <SelectBox
                        className={TOOLBAR_FIELD}
                        dataSource={invoiceStatusOptions}
                        displayExpr="label"
                        valueExpr="value"
                        value={invoiceStatus}
                        stylingMode="outlined"
                        label={t("TTHAI", "Trạng thái")}
                        labelMode="floating"
                        width={220}
                        showClearButton={false}
                        onValueChanged={(event) => setInvoiceStatus(String(event.value ?? ""))}
                      />
                    ) : null}
                  </>
                ) : undefined
              }
            />
            <FetchGdtVatPopup
              visible={gdtPopupVisible}
              invoiceType={invoiceType}
              fromDate={fromDate}
              toDate={toDate}
              onClose={() => setGdtPopupVisible(false)}
              onFetched={async () => {
                // Không tự đóng popup — để user xem kết quả; reload lưới phía sau.
                await loadPreview({ showValidationMessage: false })
              }}
            />
            <ReportPdfExportPopup
              visible={exportPopupVisible}
              defaultLanguage={exportLanguage}
              defaultPrintTemplate={
                !showBookPrintTemplate
                  ? "DEFAULT_GRID"
                  : !showDefaultGridPrintTemplate
                    ? "BOOK"
                    : exportPrintTemplate
              }
              onHide={closeExportPopup}
              onConfirm={handleExportPdf}
              description={exportReportTitle}
              printTemplateOptions={printTemplateOptions}
              printTemplateLookupVisible={showBookPrintTemplate}
              onPrintTemplateChange={setExportPrintTemplate}
              reportOption={selectedReportOptionCode}
              reportOptions={toolbarReportOptions}
              reportOptionLookupVisible={Boolean(effectiveReportOptionGroupCode)}
              reportOptionLoading={!reportOptionsLoaded && toolbarReportOptions.length === 0}
              onReportOptionChange={handleReportOptionChange}
              fromDate={useUseStartYmdFilter ? undefined : fromDate}
              toDate={useUseStartYmdFilter ? undefined : toDate}
              useStartYmd={useUseStartYmdFilter ? useStartYmd : undefined}
              dateFilterMode={useUseStartYmdFilter ? "useStartYmd" : "range"}
              onFromDateChange={useUseStartYmdFilter ? undefined : setFromDate}
              onToDateChange={useUseStartYmdFilter ? undefined : setToDate}
              onUseStartYmdChange={useUseStartYmdFilter ? setUseStartYmd : undefined}
              showAccountFilter={showAccountFilter}
              showCustomerFilter={showCustomerFilter}
              showBankFilter={showBankFilter}
              showCurrencyFilter={showCurrencyFilter}
              currencyLookupSingleSelect={isInventoryDetail}
              showWarehouseFilter={showWarehouseFilter}
              showProductFilter={showProductFilter}
              accountCodes={accountCodes}
              customerCodes={customerCodes}
              bankCodes={bankCodes}
              currencyCodes={currencyCodes}
              warehouseCodes={warehouseCodes}
              productCodes={productCodes}
              onAccountCodesChange={setAccountCodes}
              onCustomerCodesChange={setCustomerCodes}
              onBankCodesChange={setBankCodes}
              onCurrencyCodesChange={changeReportCurrencyCodes}
              onWarehouseCodesChange={setWarehouseCodes}
              onProductCodesChange={setProductCodes}
              accountFilterEtcType={accountFilterEtcType}
              accountFilterParam1={accountFilterParam1}
              accountFilterParam2={accountFilterParam2}
            />
          </div>

          <div
            className={
              useEInvoiceTableLayout
                ? "min-h-0 flex-1 overflow-hidden"
                : "min-h-0 flex-1 overflow-hidden rounded-lg border border-slate-200 bg-white shadow-sm"
            }
          >
            {useReportTreeList ? (
              <ReportTreeList
                key={effectiveDashboardReportCode}
                ref={reportTreeRef}
                preview={preview}
                loading={previewLoading}
                searchText={searchText}
                reportCode={effectiveDashboardReportCode}
                menuCode={menuCode}
                onRowDblClick={handleReportRowDblClick}
              />
            ) : useEInvoiceTableLayout ? (
              <EInvoiceTableShell className="h-full">
                <ReportDataGrid
                  key={effectiveDashboardReportCode}
                  ref={reportGridRef}
                  menuCode={menuCode}
                  reportCode={effectiveDashboardReportCode}
                  preview={preview}
                  loading={previewLoading}
                  searchText={searchText}
                  fromDate={fromDate}
                  toDate={toDate}
                  defaultOutlineExpanded={true}
                  outlineIndentFieldCandidates={[]}
                  outlineIndentFallbackToFirstString={false}
                  groupConfig={vatInOutListGroupConfig}
                  vatDirection={
                    String(effectiveDashboardReportCode).trim().toUpperCase() === "TAX_VAT_INVOICE_LIST"
                      ? appliedInvoiceType
                      : null
                  }
                  onRowDblClick={handleReportRowDblClick}
                />
              </EInvoiceTableShell>
            ) : (
              <div className="h-full min-h-0">
                <ReportDataGrid
                  key={effectiveDashboardReportCode}
                  ref={reportGridRef}
                  menuCode={menuCode}
                  reportCode={effectiveDashboardReportCode}
                  preview={preview}
                  loading={previewLoading}
                  searchText={searchText}
                  fromDate={fromDate}
                  toDate={toDate}
                  defaultOutlineExpanded={true}
                  outlineIndentFieldCandidates={[]}
                  outlineIndentFallbackToFirstString={false}
                  groupConfig={vatInOutListGroupConfig}
                  vatDirection={
                    String(effectiveDashboardReportCode).trim().toUpperCase() === "TAX_VAT_INVOICE_LIST"
                      ? appliedInvoiceType
                      : null
                  }
                  onRowDblClick={handleReportRowDblClick}
                />
              </div>
            )}
          </div>
        </section>
      </div>
      <ReportVoucherEditorHost
        ref={voucherEditorHostRef}
        onSaved={() => void loadPreview({ showValidationMessage: false })}
      />
      <LoadPanel
        visible={formulaOptionsOpening || (formulaOptionsVisible && !formulaPopupShown)}
        showIndicator
        showPane
        shading
        shadingColor="rgba(0, 0, 0, 0.15)"
        message={t("LOADING", "Đang tải...")}
      />
      {formulaOptionsVisible && formulaOptionsInitialData ? (
        <Suspense fallback={null}>
          <ReportFormulaOptionsPopup
            layout="popup"
            fullScreen={true}
            visible={true}
            reportCode={effectiveDashboardReportCode}
            reportVersion={reportVersion}
            initialOptions={formulaOptionsInitialData}
            previewParams={formulaPreviewParams}
            onClose={handleCloseFormulaSettings}
            onShown={handleFormulaPopupShown}
            onSaved={handleFormulaSettingsSaved}
          />
        </Suspense>
      ) : null}
    </DxPage>
  )
}

