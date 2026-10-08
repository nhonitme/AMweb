import { useCallback, useContext, useMemo, useRef, useState } from "react"
import type { KeyboardEvent, ReactNode } from "react"
import Button from "devextreme-react/button"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import { LanguageContext } from "@/lib/i18nLoader"
import MultiLookupCellEditor from "@/components/lookup/MultiLookupCellEditor"
import DateRangeBox from "@/components/toolbar/DateRangeBox"
import DateBox from "devextreme-react/date-box"
import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import ReportOptionLookup, { type ReportOptionLookupItem } from "@/components/toolbar/ReportOptionLookup"
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import { warehouseLookupStore } from "@/components/lookup/warehouseLookupStore"
import { departmentLookupStore } from "@/components/lookup/departmentLookupStore"
import { currencyLookupStore } from "@/components/lookup/currencyLookupStore"
import { faAssetStatusLookupStore } from "@/components/lookup/faAssetStatusLookupStore"
import { vatRateLookupStore } from "@/components/lookup/vatRateLookupStore"
import { bankLookupStore } from "@/components/lookup/bankLookupStore"
import { getAcclistLookupStore } from "@/components/lookup/AcclistLookupStore"
import {
  formatAccountDisplay,
  getAccountLookupCode,
  getAccountLookupNameBySuffix,
  type AccountLookupItem,
} from "@/components/lookup/accountLookupUtils"
import { EtcType } from "@/api/systemApi"
import type CustomStore from "devextreme/data/custom_store"
import { inventoryLookupStore } from "@/components/lookup/inventoryLookupStore"
import { trimLookupText } from "@/components/lookup/lookupHelpers"
import { normalizeCurrencyCodes } from "@/lib/currency"
import { getSysCodeDisplayText } from "@/lib/sysCodeUtils"
import { getFaStatusDisplayText } from "@/pages/Module/FixedAssetManagement/fixedAssetStatus"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import { createShortcutBindings, type ShortcutHandler } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS, type ShortcutActionCode } from "@/lib/shortcuts/shortcutDefinitions"
import type { CustomerExt } from "@/types/customerExt"
import type { StoreInfo } from "@/types/store"
import type { DepartmentInfo } from "@/types/departmentInfo"
import type { BankInfo } from "@/types/bankInfo"
import type { Product } from "@/types/product"
import type { SysCode } from "@/api/sysCodeService"
import { getDataLanguageSuffix } from "@/utils/language"

import "./PageToolbar.scss"

const TOOLBAR_FIELD = "page-toolbar__field"

type FilterOption = {
  value: string
  label: string
}

type ReportToolbarProps = {
  period?: string | null
  periodOptions?: FilterOption[]
  reportOption?: string | null
  reportOptions?: ReportOptionLookupItem[]
  reportOptionLookupVisible?: boolean
  reportOptionLoading?: boolean
  fromDate?: Date | null
  toDate?: Date | null
  customerCodes?: string[]
  accountCodes?: string[]
  bankCodes?: string[]
  currencyCodes?: string[]
  /** Display 'All' when the VAT reduction appendix has no currency restriction. */
  currencyAllOptionEnabled?: boolean
  vatRates?: string[]
  warehouseCodes?: string[]
  departmentCodes?: string[]
  productCodes?: string[]
  assetStatusCodes?: string[]
  onPeriodChange?: (value: string | null) => void
  onReportOptionChange?: (value: string | null) => void
  onFromDateChange?: (value: Date | null) => void
  onToDateChange?: (value: Date | null) => void
  onFromDateFormattedChange?: (value: string | null) => void
  onToDateFormattedChange?: (value: string | null) => void
  onCustomerCodesChange?: (value: string[]) => void
  onAccountCodesChange?: (value: string[]) => void
  onBankCodesChange?: (value: string[]) => void
  onCurrencyCodesChange?: (value: string[]) => void
  onVatRatesChange?: (value: string[]) => void
  onWarehouseCodesChange?: (value: string[]) => void
  onDepartmentCodesChange?: (value: string[]) => void
  onProductCodesChange?: (value: string[]) => void
  onAssetStatusCodesChange?: (value: string[]) => void
  searchText?: string
  onSearchTextChange?: (value: string) => void
  onSearch?: () => void
  onViewReport?: () => void
  onRefresh?: () => void
  onPrint?: () => void
  onExportPdf?: () => void
  onExportExcel?: () => void
  onSysGridColumnSettings?: () => void
  onFetchFromGdt?: () => void
  onFormulaSettings?: () => void
  showSearch?: boolean
  showRefresh?: boolean
  showPrint?: boolean
  showExportPdf?: boolean
  showExportExcel?: boolean
  showFetchFromGdt?: boolean
  shortcutsEnabled?: boolean
  accountLookupStore?: CustomStore
  accountLookupSingleSelect?: boolean
  accountFilterEtcType?: EtcType
  accountFilterParam1?: string
  accountFilterParam2?: string
  dateFilterMode?: "range" | "useStartYmd"
  useStartYmd?: Date | null
  onUseStartYmdChange?: (value: Date | null) => void
  initialFilters?: ReactNode
  leadingFilters?: ReactNode
  /** "flat" drops the bordered/shadowed toolbar card in favor of a borderless row (used by Sổ quỹ tiền mặt). */
  variant?: "boxed" | "flat"
}

function normalizeDate(value: Date | null): Date | null {
  if (!value) {
    return null
  }

  const normalized = new Date(value)
  normalized.setHours(0, 0, 0, 0)
  return normalized
}

function addMonths(value: Date, months: number): Date {
  const result = new Date(value)
  result.setMonth(result.getMonth() + months)
  result.setHours(0, 0, 0, 0)
  return result
}

function buildMonthRange(base: Date) {
  const start = new Date(base)
  start.setDate(1)
  start.setHours(0, 0, 0, 0)

  const end = addMonths(start, 1)
  end.setDate(end.getDate() - 1)
  end.setHours(0, 0, 0, 0)

  return { start, end }
}

function getLookupText(item: unknown, fields: string[]) {
  if (!item || typeof item !== "object") {
    return ""
  }

  const row = item as Record<string, unknown>

  for (const field of fields) {
    const raw = row[field]
    if (typeof raw === "string") {
      const trimmed = trimLookupText(raw)
      if (trimmed) {
        return trimmed
      }
    }
  }

  return ""
}

export function ReportToolbar({
  period,
  periodOptions,
  reportOption,
  reportOptions,
  reportOptionLookupVisible,
  reportOptionLoading,
  fromDate,
  toDate,
  customerCodes,
  accountCodes,
  bankCodes,
  currencyCodes,
  currencyAllOptionEnabled = false,
  vatRates,
  warehouseCodes,
  departmentCodes,
  productCodes,
  assetStatusCodes,
  onPeriodChange,
  onReportOptionChange,
  onFromDateChange,
  onToDateChange,
  onFromDateFormattedChange,
  onToDateFormattedChange,
  onCustomerCodesChange,
  onAccountCodesChange,
  onBankCodesChange,
  onCurrencyCodesChange,
  onVatRatesChange,
  onWarehouseCodesChange,
  onDepartmentCodesChange,
  onProductCodesChange,
  onAssetStatusCodesChange,
  searchText,
  onSearchTextChange,
  onSearch,
  onViewReport,
  onRefresh,
  onPrint,
  onExportPdf,
  onExportExcel,
  onSysGridColumnSettings,
  onFetchFromGdt,
  onFormulaSettings,
  showSearch = true,
  showRefresh = true,
  showPrint = true,
  showExportPdf = true,
  showExportExcel = true,
  showFetchFromGdt = false,
  shortcutsEnabled = true,
  accountFilterEtcType = EtcType.cbxAccountParent,
  accountFilterParam1,
  accountFilterParam2,
  dateFilterMode = "range",
  useStartYmd,
  onUseStartYmdChange,
  accountLookupStore: accountLookupStoreProp,
  accountLookupSingleSelect = false,
  initialFilters,
  leadingFilters,
  variant = "boxed",
}: ReportToolbarProps) {
  const { lang, translate } = useContext(LanguageContext) as {
    lang: string
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  // Memoize the synthetic selection so TagBox retains stable option references
  // while users tick multiple currencies with the dropdown open.
  const currencyAllOption = useMemo(
    () => currencyAllOptionEnabled
      ? { value: "__ALL_CURRENCIES__", text: t("ALL", "Tất cả") }
      : undefined,
    [currencyAllOptionEnabled, t],
  )
  const displayFaAssetStatus = useCallback(
    (item: SysCode) => getFaStatusDisplayText(item.CODE_CD, (key, fallback) => t(key, fallback ?? ""), [item]),
    [t],
  )
  const dataLanguageSuffix = useMemo(() => getDataLanguageSuffix(lang), [lang])
  const displayAccountName = useCallback(
    (item: AccountLookupItem) => getAccountLookupNameBySuffix(item, dataLanguageSuffix),
    [dataLanguageSuffix],
  )
  const displayAccountOption = useCallback(
    (item: AccountLookupItem) => formatAccountDisplay(getAccountLookupCode(item), displayAccountName(item)),
    [displayAccountName],
  )

  const toolbarLookupProps = useMemo(
    () => ({
      variant: "toolbar" as const,
      selectedCountLabel: (count: number) =>
        t("LOOKUP_SELECTED_COUNT", "{0} selected").replace("{0}", String(count)),
    }),
    [t],
  )

  const accountLookupStore = useMemo(
    () =>
      accountLookupStoreProp ??
      getAcclistLookupStore({
        etcType: accountFilterEtcType,
        param1: accountFilterParam1,
        param2: accountFilterParam2,
      }),
    [accountLookupStoreProp, accountFilterEtcType, accountFilterParam1, accountFilterParam2],
  )

  const today = useMemo(() => normalizeDate(new Date()) ?? new Date(), [])
  const currentMonthRange = useMemo(() => buildMonthRange(today), [today])

  const showCustomerFilter = Boolean(onCustomerCodesChange || (customerCodes && customerCodes.length > 0))
  const showAccountFilter = Boolean(onAccountCodesChange || (accountCodes && accountCodes.length > 0))
  const showBankFilter = Boolean(onBankCodesChange || (bankCodes && bankCodes.length > 0))
  const showCurrencyFilter = Boolean(onCurrencyCodesChange || (currencyCodes && currencyCodes.length > 0))
  const showVatRateFilter = Boolean(onVatRatesChange || (vatRates && vatRates.length > 0))
  const showWarehouseFilter = Boolean(onWarehouseCodesChange || (warehouseCodes && warehouseCodes.length > 0))
  const showDepartmentFilter = Boolean(onDepartmentCodesChange || (departmentCodes && departmentCodes.length > 0))
  const showProductFilter = Boolean(onProductCodesChange || (productCodes && productCodes.length > 0))
  const showAssetStatusFilter = Boolean(onAssetStatusCodesChange || (assetStatusCodes && assetStatusCodes.length > 0))

  const [localFromDate, setLocalFromDate] = useState<Date>(currentMonthRange.start)
  const [localToDate, setLocalToDate] = useState<Date>(currentMonthRange.end)

  const [localUseStartYmd, setLocalUseStartYmd] = useState<Date>(today)

  const effectiveFromDate = fromDate ?? localFromDate
  const effectiveToDate = toDate ?? localToDate
  const effectiveUseStartYmd = useStartYmd ?? localUseStartYmd
  const effectiveCurrencyCodes = useMemo(() => normalizeCurrencyCodes(currencyCodes), [currencyCodes])

  const handleFromDateChange = useCallback(
    (value: Date | null) => {
      if (!onFromDateChange) {
        setLocalFromDate(value ?? currentMonthRange.start)
        return
      }

      onFromDateChange(value)
    },
    [currentMonthRange.start, onFromDateChange],
  )

  const handleToDateChange = useCallback(
    (value: Date | null) => {
      if (!onToDateChange) {
        setLocalToDate(value ?? currentMonthRange.end)
        return
      }

      onToDateChange(value)
    },
    [currentMonthRange.end, onToDateChange],
  )

  const handleUseStartYmdChange = useCallback(
    (value: Date | null) => {
      if (!onUseStartYmdChange) {
        setLocalUseStartYmd(value ?? today)
        return
      }

      onUseStartYmdChange(value)
    },
    [onUseStartYmdChange, today],
  )

  const useStartYmdDateBoxOptions = useMemo(
    () => createDateBoxEditorOptions({ stylingMode: "outlined", width: 150, showClearButton: true }),
    [],
  )

  const handleCustomerApply = useCallback(
    (selectedKeys: string[]) => {
      onCustomerCodesChange?.(selectedKeys.map((value) => trimLookupText(value) || ""))
    },
    [onCustomerCodesChange],
  )

  const handleAccountApply = useCallback(
    (selectedKeys: string[]) => {
      onAccountCodesChange?.(selectedKeys.map((value) => trimLookupText(value) || ""))
    },
    [onAccountCodesChange],
  )

  const handleBankApply = useCallback(
    (selectedKeys: string[]) => {
      onBankCodesChange?.(selectedKeys.map((value) => trimLookupText(value) || ""))
    },
    [onBankCodesChange],
  )

  const areStringArraysEqual = useCallback((first: readonly string[], second: readonly string[]) => {
    if (first.length !== second.length) {
      return false
    }
    return first.every((value) => second.includes(value))
  }, [])

  const handleCurrencyApply = useCallback(
    (selectedKeys: string[]) => {
      const nextCurrencies = normalizeCurrencyCodes(selectedKeys.map((value) => trimLookupText(value)))
      if (currencyCodes && areStringArraysEqual(nextCurrencies, currencyCodes)) {
        return
      }
      onCurrencyCodesChange?.(nextCurrencies)
    },
    [areStringArraysEqual, currencyCodes, onCurrencyCodesChange],
  )

  const handleCurrencyClear = useCallback(
    () => {
      if (!currencyCodes || currencyCodes.length === 0) {
        return
      }
      onCurrencyCodesChange?.([])
    },
    [currencyCodes, onCurrencyCodesChange],
  )

  const handleVatRateApply = useCallback(
    (selectedKeys: string[]) => {
      onVatRatesChange?.(selectedKeys.map((value) => trimLookupText(value) || ""))
    },
    [onVatRatesChange],
  )

  const handleWarehouseApply = useCallback(
    (selectedKeys: string[]) => {
      onWarehouseCodesChange?.(selectedKeys.map((value) => trimLookupText(value) || ""))
    },
    [onWarehouseCodesChange],
  )

  const handleDepartmentApply = useCallback(
    (selectedKeys: string[]) => {
      onDepartmentCodesChange?.(selectedKeys.map((value) => trimLookupText(value) || ""))
    },
    [onDepartmentCodesChange],
  )

  const handleProductApply = useCallback(
    (selectedKeys: string[]) => {
      onProductCodesChange?.(selectedKeys.map((value) => trimLookupText(value) || ""))
    },
    [onProductCodesChange],
  )

  const handleAssetStatusApply = useCallback(
    (selectedKeys: string[]) => {
      onAssetStatusCodesChange?.(selectedKeys.map((value) => trimLookupText(value) || ""))
    },
    [onAssetStatusCodesChange],
  )

  const [localSearchText, setLocalSearchText] = useState<string>("")
  const effectiveSearchText = searchText ?? localSearchText

  const handleSearchTextChange = useCallback(
    (value: string) => {
      if (onSearchTextChange) {
        onSearchTextChange(value)
      }

      if (!searchText) {
        setLocalSearchText(value)
      }
    },
    [onSearchTextChange, searchText],
  )

  const searchHandler = onSearch ?? onViewReport
  const searchHandlerRef = useRef(searchHandler)
  searchHandlerRef.current = searchHandler

  const deferredSearchHandler = useCallback(() => {
    // DateBox may commit typed value after Enter keydown; wait one tick so parent sees new date.
    window.setTimeout(() => {
      searchHandlerRef.current?.()
    }, 0)
  }, [])

  const shortcutActions = useMemo(() => {
    const actions = [SHORTCUT_ACTIONS.HELP] as ShortcutActionCode[]

    if (showSearch && typeof searchHandler === "function") {
      actions.push(SHORTCUT_ACTIONS.RUN_REPORT)
    }

    if (showRefresh && typeof onRefresh === "function") {
      actions.push(SHORTCUT_ACTIONS.REFRESH)
    }

    if (typeof onSysGridColumnSettings === "function") {
      actions.push(SHORTCUT_ACTIONS.COLUMN_CHOOSER)
    }

    if (showPrint && typeof onPrint === "function") {
      actions.push(SHORTCUT_ACTIONS.PRINT)
    }

    if (showExportPdf && typeof onExportPdf === "function") {
      actions.push(SHORTCUT_ACTIONS.EXPORT_PDF)
    }

    if (showExportExcel && typeof onExportExcel === "function") {
      actions.push(SHORTCUT_ACTIONS.EXPORT_EXCEL)
    }

    return Array.from(new Set(actions))
  }, [
    onExportExcel,
    onExportPdf,
    onPrint,
    onRefresh,
    onSysGridColumnSettings,
    searchHandler,
    showExportExcel,
    showExportPdf,
    showPrint,
    showRefresh,
    showSearch,
  ])

  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions)

  const shortcutBindings = useMemo(() => {
    const handlers: Partial<Record<ShortcutActionCode, ShortcutHandler>> = {
      [SHORTCUT_ACTIONS.RUN_REPORT]: () => searchHandler?.(),
      [SHORTCUT_ACTIONS.REFRESH]: () => onRefresh?.(),
      [SHORTCUT_ACTIONS.COLUMN_CHOOSER]: () => onSysGridColumnSettings?.(),
      [SHORTCUT_ACTIONS.PRINT]: () => onPrint?.(),
      [SHORTCUT_ACTIONS.EXPORT_PDF]: () => onExportPdf?.(),
      [SHORTCUT_ACTIONS.EXPORT_EXCEL]: () => onExportExcel?.(),
      [SHORTCUT_ACTIONS.HELP]: () => openShortcutHelp(),
    }

    return createShortcutBindings(shortcutActions, handlers, {
      [SHORTCUT_ACTIONS.RUN_REPORT]: { allowInInput: true },
      [SHORTCUT_ACTIONS.REFRESH]: { allowInInput: true },
    })
  }, [
    onExportExcel,
    onExportPdf,
    onPrint,
    onRefresh,
    onSysGridColumnSettings,
    openShortcutHelp,
    searchHandler,
    shortcutActions,
  ])

  useShortcutBindings(shortcutBindings, { enabled: shortcutsEnabled })

  const handleSearchEnter = useCallback(() => {
    if (searchHandler) {
      searchHandler()
    }
  }, [searchHandler])

  const handleSearchKeyDown = useCallback(
    (event: KeyboardEvent<HTMLInputElement>) => {
      if (event.key === "Enter") {
        event.preventDefault()
        event.stopPropagation()
        handleSearchEnter()
      }
    },
    [handleSearchEnter],
  )

  const actionButtons = useMemo(
    () => [
      {
        key: "fetchGdt",
        icon: "download",
        hint: t("GDT_FETCH_FROM_TCT", "Lấy dữ liệu từ TCT"),
        text: t("GDT_FETCH_FROM_TCT", "Lấy dữ liệu từ TCT"),
        onClick: onFetchFromGdt,
        visible: showFetchFromGdt && typeof onFetchFromGdt === "function",
        stylingMode: "outlined" as const,
        type: "default" as const,
      },
      {
        key: "refresh",
        icon: "refresh",
        hint: t("REFRESH", "Refresh"),
        onClick: onRefresh,
        visible: showRefresh && typeof onRefresh === "function",
      },
      {
        key: "gridSettings",
        icon: "columnchooser",
        hint: t("SYS_GRID_COLUMN_SETTING", "Thiết lập cột hiển thị"),
        onClick: onSysGridColumnSettings,
        visible: typeof onSysGridColumnSettings === "function",
      },
      {
        key: "formulaSettings",
        icon: "edit",
        hint: t("CASHFLOW_FORMULA_CONFIG", "Khai báo chỉ tiêu / công thức"),
        onClick: onFormulaSettings,
        visible: typeof onFormulaSettings === "function",
      },
      {
        key: "print",
        icon: "print",
        hint: t("PRINT", "Print"),
        onClick: onPrint,
        visible: showPrint && typeof onPrint === "function",
      },
      {
        key: "exportPdf",
        icon: "exportpdf",
        hint: t("EXPORT_PDF", "Export PDF"),
        onClick: onExportPdf,
        visible: showExportPdf && typeof onExportPdf === "function",
      },
      {
        key: "exportExcel",
        icon: "xlsxfile",
        hint: t("EXPORT_EXCEL", "Export Excel"),
        onClick: onExportExcel,
        visible: showExportExcel && typeof onExportExcel === "function",
      },
    ],

    [
      onExportExcel,
      onExportPdf,
	  onFormulaSettings,
      onFetchFromGdt,
      onPrint,
      onRefresh,
      onSysGridColumnSettings,
      showExportExcel,
      showExportPdf,
      showFetchFromGdt,
      showPrint,
      showRefresh,
      t,
    ],
  )

  const visibleActionButtons = useMemo(
    () => actionButtons.filter((button) => button.visible !== false),
    [actionButtons],
  )

  return (
    <>
    <div className="page-toolbar report-toolbar">
      <div className={`page-toolbar__row${variant === "flat" ? " page-toolbar__row--flat" : ""}`}>
        <div className="page-toolbar__filters">
          {initialFilters}
          {periodOptions ? (
            <SelectBox
              className={TOOLBAR_FIELD}
              dataSource={periodOptions}
              displayExpr="label"
              valueExpr="value"
              value={period}
              stylingMode="outlined"
              label={t("REPORT_PERIOD", "Report period")}
              labelMode="floating"
              placeholder={t("REPORT_PERIOD", "Report period")}
              onValueChanged={(event) => onPeriodChange?.(String(event.value ?? "") || null)}
              width={150}
              showClearButton
            />
          ) : null}

          {reportOptionLookupVisible || (reportOptions && reportOptions.length > 0) ? (
            <ReportOptionLookup
              className={TOOLBAR_FIELD}
              value={reportOption}
              labelMode="floating"
              placeholder={t("REPORT_OPTION", "Report option")}
              noDataText={t("REPORT_OPTION_EMPTY", "No report option")}
              loadingText={t("LOADING", "Loading")}
              options={reportOptions}
              visible={reportOptionLookupVisible}
              loading={reportOptionLoading}
              onValueChange={onReportOptionChange}
            />
          ) : null}

          {showCustomerFilter ? (
            <MultiLookupCellEditor<CustomerExt>
              className={TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={customerLookupStore}
                values={customerCodes ?? []}
                valueExpr="CUSTOMER_CD"
                searchExpr={["CUSTOMER_CD", "CUSTOMER_NM_VIET", "CUSTOMER_NM_ENG", "CUSTOMER_NM_KOR", "CUSTOMER_NM_CHINA"]}
                placeholder={t("CUSTOMER_CODE", "Customer Code")}
                labelMode="floating"
                buttonHint={t("OPEN_CUSTOMER_LOOKUP", "Open customer lookup")}
                onApply={handleCustomerApply}
                onClear={() => onCustomerCodesChange?.([])}
                width={150}
                columns={[
                  { dataField: "CUSTOMER_CD", caption: t("CUSTOMER_CODE", "Customer Code"), width: 160 },
                  {
                    dataField: "CUSTOMER_NM_VIET",
                    caption: t("CUSTOMER_NAME", "Customer Name"),
                    minWidth: 260,
                    calculateCellValue: (row) => getLookupText(row, ["CUSTOMER_NM_VIET", "CUSTOMER_NM_ENG", "CUSTOMER_NM_KOR", "CUSTOMER_NM_CHINA"]),
                  },
                ]}
              />
          ) : null}

          {showProductFilter ? (
            <MultiLookupCellEditor<Product>
              className={TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={inventoryLookupStore}
                values={productCodes ?? []}
                valueExpr="PRODUCT_CD"
                searchExpr={["PRODUCT_CD", "PRODUCT_NM_VIET", "PRODUCT_NM_ENG", "PRODUCT_NM_KOR", "PRODUCT_NM_CHINA"]}
                placeholder={t("PRODUCT_CODE", "Product Code")}
                labelMode="floating"
                buttonHint={t("OPEN_PRODUCT_LOOKUP", "Open product lookup")}
                onApply={handleProductApply}
                onClear={() => onProductCodesChange?.([])}
                width={160}
                columns={[
                  { dataField: "PRODUCT_CD", caption: t("PRODUCT_CODE", "Product Code"), width: 160 },
                  {
                    dataField: "PRODUCT_NM_VIET",
                    caption: t("PRODUCT_NAME", "Product Name"),
                    minWidth: 260,
                    calculateCellValue: (row) => getLookupText(row, ["PRODUCT_NM_VIET", "PRODUCT_NM_ENG", "PRODUCT_NM_KOR", "PRODUCT_NM_CHINA"]),
                  },
                ]}
              />
          ) : null}

          {showAssetStatusFilter ? (
            <MultiLookupCellEditor<SysCode>
              key={`fa-status-${lang}`}
              className={TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={faAssetStatusLookupStore}
                values={assetStatusCodes ?? []}
                valueExpr="CODE_CD"
                searchExpr={["CODE_CD", "CODE_NAME"]}
                placeholder={t("STATUS", "Trạng thái TSCĐ")}
                labelMode="floating"
                buttonHint={t("OPEN_FA_STATUS_LOOKUP", "Chọn trạng thái TSCĐ")}
                toolbarSingleTagDisplayExpr={displayFaAssetStatus}
                onApply={handleAssetStatusApply}
                onClear={() => onAssetStatusCodesChange?.([])}
                width={170}
                columns={[
                  {
                    dataField: "CODE_NAME",
                    caption: t("FA_STATUS_NAME", "Tên trạng thái"),
                    minWidth: 220,
                    calculateCellValue: (row) => displayFaAssetStatus(row),
                  },
                ]}
              />
          ) : null}

          {showAccountFilter ? (
            <MultiLookupCellEditor<AccountLookupItem>
              key={`fa-account-${lang}`}
              className={TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={accountLookupStore}
                values={accountCodes ?? []}
                valueExpr="CD"
                maxSelection={accountLookupSingleSelect ? 1 : undefined}
                searchExpr={["CD", "ACC_CD", "NM_VIET", "NM_ENG", "NM_KOR", "NM_CHINA", "ACCTITLE_NM_VIET", "ACCTITLE_NM_ENG", "ACCTITLE_NM_KOR", "ACCTITLE_NM_CHINA"]}
                placeholder={t("ACCOUNT_CODE", "Account Code")}
                labelMode="floating"
                buttonHint={t("OPEN_ACCOUNT_LOOKUP", "Open account lookup")}
                toolbarSingleTagDisplayExpr={displayAccountOption}
                onApply={handleAccountApply}
                onClear={() => onAccountCodesChange?.([])}
                width={160}
                columns={[
                  { dataField: "CD", caption: t("ACCOUNT_CODE", "Account Code"), width: 160 },
                  {
                    dataField: "ACCTITLE_NM_VIET",
                    caption: t("ACCOUNT_NAME", "Account Name"),
                    minWidth: 260,
                    calculateCellValue: (row) => displayAccountName(row),
                  },
                ]}
              />
          ) : null}

          {showBankFilter ? (
            <MultiLookupCellEditor<BankInfo>
              className={TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={bankLookupStore}
                values={bankCodes ?? []}
                valueExpr="BANK_CD"
                searchExpr={["BANK_CD", "BANK_NM", "ACCOUNT_NUM", "ACC_CD", "PASSBOOK_NM", "CITAD_CODE"]}
                placeholder={t("BANK_CD", "Bank")}
                labelMode="floating"
                buttonHint={t("OPEN_BANK_LOOKUP", "Open bank lookup")}
                onApply={handleBankApply}
                onClear={() => onBankCodesChange?.([])}
                width={170}
                columns={[
                  { dataField: "BANK_CD", caption: t("BANK_CD", "Bank Code"), width: 150 },
                  { dataField: "BANK_NM", caption: t("BANK_NM", "Bank Name"), minWidth: 240 },
                  { dataField: "ACCOUNT_NUM", caption: t("ACCOUNT_NUM", "Account Number"), width: 180 },
                ]}
              />
          ) : null}

          {showCurrencyFilter ? (
            <MultiLookupCellEditor<SysCode>
              className={currencyAllOptionEnabled ? `${TOOLBAR_FIELD} report-toolbar__currency-filter` : TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={currencyLookupStore}
                values={effectiveCurrencyCodes}
                valueExpr="CODE_CD"
                searchExpr={["CODE_CD", "CODE_NAME"]}
                placeholder={t("CURRENCY", "Currency")}
                allOption={currencyAllOption}
                labelMode="floating"
                buttonHint={t("OPEN_CURRENCY_LOOKUP", "Open currency lookup")}
                onApply={handleCurrencyApply}
                onClear={handleCurrencyClear}
                width={140}
                height={currencyAllOptionEnabled ? 30 : 26}
                columns={[
                  { dataField: "CODE_CD", caption: t("CURRENCY", "Currency"), width: 140 },
                  {
                    dataField: "CODE_NAME",
                    caption: t("CURRENCY_NAME", "Currency Name"),
                    minWidth: 240,
                    calculateCellValue: (row) => getSysCodeDisplayText(row, t),
                  },
                ]}
              />
          ) : null}

          {showVatRateFilter ? (
            <MultiLookupCellEditor<SysCode>
              className={TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={vatRateLookupStore}
                values={vatRates ?? []}
                valueExpr="CODE_CD"
                searchExpr={["CODE_CD", "CODE_NAME"]}
                placeholder={t("VAT_RATE", "VAT Rate")}
                labelMode="floating"
                buttonHint={t("OPEN_VAT_RATE_LOOKUP", "Open VAT rate lookup")}
                onApply={handleVatRateApply}
                onClear={() => onVatRatesChange?.([])}
                width={140}
                columns={[
                  { dataField: "CODE_CD", caption: t("VAT_RATE", "VAT Rate"), width: 140 },
                  {
                    dataField: "CODE_NAME",
                    caption: t("VAT_RATE_NAME", "VAT Name"),
                    minWidth: 240,
                    calculateCellValue: (row) => getSysCodeDisplayText(row, t),
                  },
                ]}
              />
          ) : null}

          {showWarehouseFilter ? (
            <MultiLookupCellEditor<StoreInfo>
              className={TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={warehouseLookupStore}
                values={warehouseCodes ?? []}
                valueExpr="STORE_CD"
                searchExpr={["STORE_CD", "STORE_NM_VIET", "STORE_NM_ENG", "STORE_NM_KOR", "STORE_KIND_CD", "STORE_KIND_NM_VIET"]}
                placeholder={t("WAREHOUSE_CODE", "Warehouse Code")}
                labelMode="floating"
                buttonHint={t("OPEN_WAREHOUSE_LOOKUP", "Open warehouse lookup")}
                onApply={handleWarehouseApply}
                onClear={() => onWarehouseCodesChange?.([])}
                width={150}
                columns={[
                  { dataField: "STORE_CD", caption: t("WAREHOUSE_CODE", "Warehouse Code"), width: 160 },
                  { dataField: "STORE_NM_VIET", caption: t("WAREHOUSE_NAME", "Warehouse Name"), minWidth: 240 },
                  { dataField: "STORE_KIND_CD", caption: t("WAREHOUSE_TYPE", "Warehouse Type"), width: 160 },
                ]}
              />
          ) : null}

          {showDepartmentFilter ? (
            <MultiLookupCellEditor<DepartmentInfo>
              className={TOOLBAR_FIELD}
              {...toolbarLookupProps}
                dataSource={departmentLookupStore}
                values={departmentCodes ?? []}
                valueExpr="DEPARTMENT_CD"
                searchExpr={["DEPARTMENT_CD", "DEP_NAME_VIET", "DEP_NAME_ENG", "DEP_NAME_KOR", "DEP_NAME_CHINA"]}
                placeholder={t("DEPARTMENT_CODE", "Department Code")}
                labelMode="floating"
                buttonHint={t("OPEN_DEPARTMENT_LOOKUP", "Open department lookup")}
                onApply={handleDepartmentApply}
                onClear={() => onDepartmentCodesChange?.([])}
                width={150}
                columns={[
                  { dataField: "DEPARTMENT_CD", caption: t("DEPARTMENT_CODE", "Department Code"), width: 160 },
                  { dataField: "DEP_NAME_VIET", caption: t("DEPARTMENT_NAME", "Department Name"), minWidth: 260 },
                ]}
              />
          ) : null}

          {leadingFilters}

          <div className="page-toolbar__run-group">
            {dateFilterMode === "useStartYmd" ? (
              <DateBox
                key={`use-start-date-${lang}`}
                className={`${TOOLBAR_FIELD} page-toolbar__date-range`}
                value={effectiveUseStartYmd}
                label={t("USE_START_YMD", "Ngày sử dụng")}
                labelMode="floating"
                {...useStartYmdDateBoxOptions}
                onValueChanged={(event) => handleUseStartYmdChange((event.value as Date | null) ?? null)}
                onEnterKey={deferredSearchHandler}
              />
            ) : (
              <DateRangeBox
                fromDate={effectiveFromDate}
                toDate={effectiveToDate}
                fromPlaceholder={t("MSG_FROMDATE", "From Date")}
                toPlaceholder={t("MSG_TODATE", "To Date")}
                labelMode="floating"
                variant="grouped"
                onFromDateChange={handleFromDateChange}
                onToDateChange={handleToDateChange}
                onFromDateFormattedChange={onFromDateFormattedChange}
                onToDateFormattedChange={onToDateFormattedChange}
                onEnter={searchHandler}
                width={150}
                editorClassName={TOOLBAR_FIELD}
                className="page-toolbar__date-range flex flex-nowrap gap-2"
              />
            )}

            {showSearch && typeof searchHandler === "function" ? (
              <Button
                className="page-toolbar__search-btn"
                type="default"
                stylingMode="contained"
                icon="search"
                text={t("MSG_BTNSER", "Tìm kiếm")}
                hint={t("MSG_BTNSER", "Tìm kiếm")}
                onClick={searchHandler}
              />
            ) : null}
          </div>
        </div>

        <div className="page-toolbar__actions">
          {showSearch ? (
            <div className="page-toolbar__quick-search-group flex items-end gap-1">
              <TextBox
                className={`${TOOLBAR_FIELD} page-toolbar__field--search page-toolbar__quick-search`}
                stylingMode="outlined"
                label={t("FA_QUICK_SEARCH", "Tìm nhanh")}
                labelMode="floating"
                value={effectiveSearchText}
                width={200}
                showClearButton
                placeholder={t("Search...", "Tìm...")}
                onValueChanged={(event) => handleSearchTextChange(String(event.value ?? ""))}
                onEnterKey={handleSearchEnter}
                inputAttr={{ onKeyDown: handleSearchKeyDown }}
              />
              <Button
                className="page-toolbar__search-btn page-toolbar__search-btn--inline"
                stylingMode="text"
                icon="search"
                hint={t("MSG_BTNSER", "Tìm kiếm")}
                onClick={handleSearchEnter}
              />
            </div>
          ) : null}

          {visibleActionButtons.map((button) => (
            <Button
              key={button.key}
              className="page-toolbar__action-btn"
              stylingMode={"stylingMode" in button && button.stylingMode ? button.stylingMode : "text"}
              icon={button.icon}
              text={"text" in button ? button.text : undefined}
              hint={button.hint}
              type={"type" in button && button.type ? button.type : "normal"}
              onClick={button.onClick}
            />
          ))}
        </div>
      </div>
    </div>
      <ShortcutHelpPopup
        visible={shortcutHelpVisible}
        shortcuts={shortcutHelpItems}
        onClose={closeShortcutHelp}
      />
    </>
  )
}
