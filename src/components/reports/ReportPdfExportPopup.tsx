import { useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react"
import Button from "devextreme-react/button"
import Popup from "devextreme-react/popup"
import SelectBox from "devextreme-react/select-box"
import MultiLookupCellEditor from "@/components/lookup/MultiLookupCellEditor"
import DateRangeBox from "@/components/toolbar/DateRangeBox"
import DateBox from "devextreme-react/date-box"
import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import ReportOptionLookup, { type ReportOptionLookupItem } from "@/components/toolbar/ReportOptionLookup"
import { useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { getReportLanguageOptions, type ReportLanguageCode } from "@/pages/Reports/reportLanguage"
import { customerLookupStore } from "@/components/lookup/customerLookupStore"
import { warehouseLookupStore } from "@/components/lookup/warehouseLookupStore"
import { departmentLookupStore } from "@/components/lookup/departmentLookupStore"
import { currencyLookupStore } from "@/components/lookup/currencyLookupStore"
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
import { inventoryLookupStore } from "@/components/lookup/inventoryLookupStore"
import type { CustomerExt } from "@/types/customerExt"
import type { StoreInfo } from "@/types/store"
import type { DepartmentInfo } from "@/types/departmentInfo"
import type { BankInfo } from "@/types/bankInfo"
import type { Product } from "@/types/product"
import type { SysCode } from "@/api/sysCodeService"
import { getSysCodeDisplayText } from "@/lib/sysCodeUtils"
import { getDataLanguageSuffix } from "@/utils/language"

export type ReportPrintTemplateCode = "BOOK" | "DEFAULT_GRID"

export type ReportPrintTemplateOption = {
  code: ReportPrintTemplateCode
  label: string
}

type ReportPdfExportPopupProps = {
  visible: boolean
  defaultLanguage: ReportLanguageCode
  defaultPrintTemplate?: ReportPrintTemplateCode
  onHide: () => void
  onConfirm: (language: ReportLanguageCode, printTemplate: ReportPrintTemplateCode) => void
  title?: string
  description?: string
  printTemplateOptions?: ReportPrintTemplateOption[]
  printTemplateLookupVisible?: boolean
  onPrintTemplateChange?: (value: ReportPrintTemplateCode) => void
  reportOption?: string | null
  reportOptions?: ReportOptionLookupItem[]
  reportOptionLookupVisible?: boolean
  reportOptionLoading?: boolean
  onReportOptionChange?: (value: string | null) => void
  fromDate?: Date | null
  toDate?: Date | null
  onFromDateChange?: (value: Date | null) => void
  onToDateChange?: (value: Date | null) => void
  showAccountFilter?: boolean
  showCustomerFilter?: boolean
  showBankFilter?: boolean
  showCurrencyFilter?: boolean
  showVatRateFilter?: boolean
  showWarehouseFilter?: boolean
  showDepartmentFilter?: boolean
  showProductFilter?: boolean
  accountCodes?: string[]
  customerCodes?: string[]
  bankCodes?: string[]
  currencyCodes?: string[]
  vatRates?: string[]
  warehouseCodes?: string[]
  departmentCodes?: string[]
  productCodes?: string[]
  onAccountCodesChange?: (value: string[]) => void
  onCustomerCodesChange?: (value: string[]) => void
  onBankCodesChange?: (value: string[]) => void
  onCurrencyCodesChange?: (value: string[]) => void
  onVatRatesChange?: (value: string[]) => void
  onWarehouseCodesChange?: (value: string[]) => void
  onDepartmentCodesChange?: (value: string[]) => void
  onProductCodesChange?: (value: string[]) => void
  children?: ReactNode
  accountFilterEtcType?: EtcType
  accountFilterParam1?: string
  accountFilterParam2?: string
  dateFilterMode?: "range" | "useStartYmd"
  useStartYmd?: Date | null
  onUseStartYmdChange?: (value: Date | null) => void
}

export default function ReportPdfExportPopup({
  visible,
  defaultLanguage,
  defaultPrintTemplate = "BOOK",
  onHide,
  onConfirm,
  title,
  description,
  printTemplateOptions,
  printTemplateLookupVisible,
  onPrintTemplateChange,
  reportOption,
  reportOptions,
  reportOptionLookupVisible,
  reportOptionLoading,
  onReportOptionChange,
  fromDate,
  toDate,
  onFromDateChange,
  onToDateChange,
  showAccountFilter,
  showCustomerFilter,
  showBankFilter,
  showCurrencyFilter,
  showVatRateFilter,
  showWarehouseFilter,
  showDepartmentFilter,
  showProductFilter,
  accountCodes,
  customerCodes,
  bankCodes,
  currencyCodes,
  vatRates,
  warehouseCodes,
  departmentCodes,
  productCodes,
  onAccountCodesChange,
  onCustomerCodesChange,
  onBankCodesChange,
  onCurrencyCodesChange,
  onVatRatesChange,
  onWarehouseCodesChange,
  onDepartmentCodesChange,
  onProductCodesChange,
  children,
  accountFilterEtcType = EtcType.cbxAccountParent,
  accountFilterParam1,
  accountFilterParam2,
  dateFilterMode = "range",
  useStartYmd,
  onUseStartYmdChange,
}: ReportPdfExportPopupProps) {
  const { lang, translate } = useContext(LanguageContext) as {
    lang: string
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
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
  const companyLangRevision = useCompanyLangRevision()

  const [selectedLanguage, setSelectedLanguage] = useState<ReportLanguageCode>(defaultLanguage)
  const [selectedPrintTemplate, setSelectedPrintTemplate] = useState<ReportPrintTemplateCode>(defaultPrintTemplate)

  useEffect(() => {
    setSelectedLanguage(defaultLanguage)
  }, [defaultLanguage])

  useEffect(() => {
    setSelectedPrintTemplate(defaultPrintTemplate)
  }, [defaultPrintTemplate])

  const handleConfirm = useCallback(() => {
    onConfirm(selectedLanguage, selectedPrintTemplate)
  }, [onConfirm, selectedLanguage, selectedPrintTemplate])

  const languageItems = useMemo(
    () =>
      getReportLanguageOptions().map((option) => ({
        code: option.code,
        label: `${option.label} (${option.backendCode})`,
      })),
    [companyLangRevision],
  )

  const printTemplateItems = useMemo(
    () => printTemplateOptions ?? [],
    [printTemplateOptions],
  )

  const hasFilterEditors =
    Boolean(onReportOptionChange) ||
    Boolean(onFromDateChange) ||
    Boolean(onToDateChange) ||
    Boolean(onCustomerCodesChange) ||
    Boolean(onAccountCodesChange) ||
    Boolean(onBankCodesChange) ||
    Boolean(onCurrencyCodesChange) ||
    Boolean(onVatRatesChange) ||
    Boolean(onWarehouseCodesChange) ||
    Boolean(onDepartmentCodesChange) ||
    Boolean(onProductCodesChange)

  const accountLookupStore = useMemo(
    () =>
      getAcclistLookupStore({
        etcType: accountFilterEtcType,
        param1: accountFilterParam1,
        param2: accountFilterParam2,
      }),
    [accountFilterEtcType, accountFilterParam1, accountFilterParam2],
  )

  const useStartYmdDateBoxOptions = useMemo(
    () => createDateBoxEditorOptions({ stylingMode: "outlined", width: "100%", showClearButton: true }),
    [],
  )

  return (
    <Popup
      visible={visible}
      showTitle
      title={t("REPORT_EXPORT_CONFIRM_TITLE", title ?? "Export PDF")}
      dragEnabled={false}
      hideOnOutsideClick={true}
      showCloseButton={true}
      width={720}
      height="auto"
      onHiding={onHide}
    >
      <div className="space-y-5 p-4 sm:p-6">
        <div className="space-y-4">
          {description ? <p className="text-sm text-slate-600">{t("REPORT_EXPORT_CONFIRM_DESCRIPTION", description)}</p> : null}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <SelectBox
                dataSource={languageItems}
                displayExpr="label"
                valueExpr="code"
                value={selectedLanguage}
                placeholder={t("REPORT_EXPORT_LANGUAGE_PLACEHOLDER", "Select language")}
                showClearButton={false}
                stylingMode="outlined"
                onValueChanged={(event) => {
                  const nextValue = event.value as ReportLanguageCode | undefined
                  if (nextValue) {
                    setSelectedLanguage(nextValue)
                  }
                }}
              />
            </div>

            {printTemplateLookupVisible ? (
              <div>
                <SelectBox
                  dataSource={printTemplateItems}
                  displayExpr="label"
                  valueExpr="code"
                  value={selectedPrintTemplate}
                  placeholder={t("REPORT_PRINT_TEMPLATE", "Mẫu in")}
                  showClearButton={false}
                  stylingMode="outlined"
                  onValueChanged={(event) => {
                    const nextValue = event.value as ReportPrintTemplateCode | undefined
                    if (nextValue) {
                      setSelectedPrintTemplate(nextValue)
                      onPrintTemplateChange?.(nextValue)
                    }
                  }}
                />
              </div>
            ) : null}

            {(Boolean(onFromDateChange) || Boolean(onToDateChange) || Boolean(onUseStartYmdChange)) && (
              dateFilterMode === "useStartYmd" ? (
                <DateBox
                  key={`use-start-date-${lang}`}
                  value={useStartYmd ?? null}
                  label={t("USE_START_YMD", "Ngày sử dụng")}
                  labelMode="floating"
                  {...useStartYmdDateBoxOptions}
                  onValueChanged={(event) => onUseStartYmdChange?.((event.value as Date | null) ?? null)}
                />
              ) : (
                <DateRangeBox
                  fromDate={fromDate}
                  toDate={toDate}
                  fromPlaceholder={t("MSG_FROMDATE", "From Date")}
                  toPlaceholder={t("MSG_TODATE", "To Date")}
                  onFromDateChange={onFromDateChange}
                  onToDateChange={onToDateChange}
                  width="100%"
                  className="grid gap-3 sm:grid-cols-2"
                  itemClassName=""
                  dateBoxOptions={{ showClearButton: true }}
                />
              )
            )}
          </div>
        </div>

        {hasFilterEditors ? (
          <div className="grid gap-4">
            {Boolean(onReportOptionChange) ? (
              <div>
                <ReportOptionLookup
                  value={reportOption}
                  placeholder={t("REPORT_OPTION", "Report option")}
                  noDataText={t("REPORT_OPTION_EMPTY", "No report option")}
                  loadingText={t("LOADING", "Loading")}
                  options={reportOptions}
                  visible={reportOptionLookupVisible}
                  loading={reportOptionLoading}
                  onValueChange={onReportOptionChange}
                />
              </div>
            ) : null}

            <div className="grid gap-3 sm:grid-cols-2">
              {showCustomerFilter && onCustomerCodesChange ? (
                <div>
                  <MultiLookupCellEditor<CustomerExt>
                    dataSource={customerLookupStore}
                    values={customerCodes ?? []}
                    valueExpr="CUSTOMER_CD"
                    searchExpr={["CUSTOMER_CD", "CUSTOMER_NM_VIET", "CUSTOMER_NM_ENG", "CUSTOMER_NM_KOR", "CUSTOMER_NM_CHINA"]}
                    placeholder={t("CUSTOMER_CODE", "Customer Code")}
                    buttonHint={t("OPEN_CUSTOMER_LOOKUP", "Open customer lookup")}
                    onApply={onCustomerCodesChange}
                    onClear={() => onCustomerCodesChange([])}
                    width="100%"
                    columns={[
                      { dataField: "CUSTOMER_CD", caption: t("CUSTOMER_CODE", "Customer Code"), width: 160 },
                      {
                        dataField: "CUSTOMER_NM_VIET",
                        caption: t("CUSTOMER_NAME", "Customer Name"),
                        minWidth: 260,
                        calculateCellValue: (row) => String(row["CUSTOMER_NM_VIET"] ?? row["CUSTOMER_NM_ENG"] ?? row["CUSTOMER_NM_KOR"] ?? row["CUSTOMER_NM_CHINA"] ?? ""),
                      },
                    ]}
                  />
                </div>
              ) : null}

              {showProductFilter && onProductCodesChange ? (
                <div>
                  <MultiLookupCellEditor<Product>
                    dataSource={inventoryLookupStore}
                    values={productCodes ?? []}
                    valueExpr="PRODUCT_CD"
                    searchExpr={["PRODUCT_CD", "PRODUCT_NM_VIET", "PRODUCT_NM_ENG", "PRODUCT_NM_KOR", "PRODUCT_NM_CHINA"]}
                    placeholder={t("PRODUCT_CODE", "Product Code")}
                    buttonHint={t("OPEN_PRODUCT_LOOKUP", "Open product lookup")}
                    onApply={onProductCodesChange}
                    onClear={() => onProductCodesChange([])}
                    width="100%"
                    columns={[
                      { dataField: "PRODUCT_CD", caption: t("PRODUCT_CODE", "Product Code"), width: 160 },
                      {
                        dataField: "PRODUCT_NM_VIET",
                        caption: t("PRODUCT_NAME", "Product Name"),
                        minWidth: 260,
                        calculateCellValue: (row) => String(row["PRODUCT_NM_VIET"] ?? row["PRODUCT_NM_ENG"] ?? row["PRODUCT_NM_KOR"] ?? row["PRODUCT_NM_CHINA"] ?? ""),
                      },
                    ]}
                  />
                </div>
              ) : null}

              {showAccountFilter && onAccountCodesChange ? (
                <div>
                  <MultiLookupCellEditor<AccountLookupItem>
                    key={`fa-account-${lang}`}
                    dataSource={accountLookupStore}
                    values={accountCodes ?? []}
                    valueExpr="CD"
                    searchExpr={["CD", "ACC_CD", "NM_VIET", "NM_ENG", "NM_KOR", "NM_CHINA", "ACCTITLE_NM_VIET", "ACCTITLE_NM_ENG", "ACCTITLE_NM_KOR", "ACCTITLE_NM_CHINA"]}
                    placeholder={t("ACCOUNT_CODE", "Account Code")}
                    buttonHint={t("OPEN_ACCOUNT_LOOKUP", "Open account lookup")}
                    toolbarSingleTagDisplayExpr={displayAccountOption}
                    onApply={onAccountCodesChange}
                    onClear={() => onAccountCodesChange([])}
                    width="100%"
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
                </div>
              ) : null}

              {showBankFilter && onBankCodesChange ? (
                <div>
                  <MultiLookupCellEditor<BankInfo>
                    dataSource={bankLookupStore}
                    values={bankCodes ?? []}
                    valueExpr="BANK_CD"
                    searchExpr={["BANK_CD", "BANK_NM", "ACCOUNT_NUM", "ACC_CD", "PASSBOOK_NM", "CITAD_CODE"]}
                    placeholder={t("BANK_CD", "Bank")}
                    buttonHint={t("OPEN_BANK_LOOKUP", "Open bank lookup")}
                    onApply={onBankCodesChange}
                    onClear={() => onBankCodesChange([])}
                    width="100%"
                    columns={[
                      { dataField: "BANK_CD", caption: t("BANK_CD", "Bank Code"), width: 150 },
                      { dataField: "BANK_NM", caption: t("BANK_NM", "Bank Name"), minWidth: 240 },
                      { dataField: "ACCOUNT_NUM", caption: t("ACCOUNT_NUM", "Account Number"), width: 180 },
                    ]}
                  />
                </div>
              ) : null}

              {showCurrencyFilter && onCurrencyCodesChange ? (
                <div>
                  <MultiLookupCellEditor<SysCode>
                    dataSource={currencyLookupStore}
                    values={currencyCodes ?? []}
                    valueExpr="CODE_CD"
                    searchExpr={["CODE_CD", "CODE_NAME"]}
                    placeholder={t("CURRENCY", "Currency")}
                    buttonHint={t("OPEN_CURRENCY_LOOKUP", "Open currency lookup")}
                    onApply={onCurrencyCodesChange}
                    onClear={() => onCurrencyCodesChange([])}
                    width="100%"
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
                </div>
              ) : null}

              {showVatRateFilter && onVatRatesChange ? (
                <div>
                  <MultiLookupCellEditor<SysCode>
                    dataSource={vatRateLookupStore}
                    values={vatRates ?? []}
                    valueExpr="CODE_CD"
                    searchExpr={["CODE_CD", "CODE_NAME"]}
                    placeholder={t("VAT_RATE", "VAT Rate")}
                    buttonHint={t("OPEN_VAT_RATE_LOOKUP", "Open VAT rate lookup")}
                    onApply={onVatRatesChange}
                    onClear={() => onVatRatesChange([])}
                    width="100%"
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
                </div>
              ) : null}

              {showWarehouseFilter && onWarehouseCodesChange ? (
                <div>
                  <MultiLookupCellEditor<StoreInfo>
                    dataSource={warehouseLookupStore}
                    values={warehouseCodes ?? []}
                    valueExpr="STORE_CD"
                    searchExpr={["STORE_CD", "STORE_NM_VIET", "STORE_NM_ENG", "STORE_NM_KOR", "STORE_KIND_CD", "STORE_KIND_NM_VIET"]}
                    placeholder={t("WAREHOUSE_CODE", "Warehouse Code")}
                    buttonHint={t("OPEN_WAREHOUSE_LOOKUP", "Open warehouse lookup")}
                    onApply={onWarehouseCodesChange}
                    onClear={() => onWarehouseCodesChange([])}
                    width="100%"
                    columns={[
                      { dataField: "STORE_CD", caption: t("WAREHOUSE_CODE", "Warehouse Code"), width: 160 },
                      { dataField: "STORE_NM_VIET", caption: t("WAREHOUSE_NAME", "Warehouse Name"), minWidth: 240 },
                      { dataField: "STORE_KIND_CD", caption: t("WAREHOUSE_TYPE", "Warehouse Type"), width: 160 },
                    ]}
                  />
                </div>
              ) : null}

              {showDepartmentFilter && onDepartmentCodesChange ? (
                <div>
                  <MultiLookupCellEditor<DepartmentInfo>
                    dataSource={departmentLookupStore}
                    values={departmentCodes ?? []}
                    valueExpr="DEPARTMENT_CD"
                    searchExpr={["DEPARTMENT_CD", "DEP_NAME_VIET", "DEP_NAME_ENG", "DEP_NAME_KOR", "DEP_NAME_CHINA"]}
                    placeholder={t("DEPARTMENT_CODE", "Department Code")}
                    buttonHint={t("OPEN_DEPARTMENT_LOOKUP", "Open department lookup")}
                    onApply={onDepartmentCodesChange}
                    onClear={() => onDepartmentCodesChange([])}
                    width="100%"
                    columns={[
                      { dataField: "DEPARTMENT_CD", caption: t("DEPARTMENT_CODE", "Department Code"), width: 160 },
                      { dataField: "DEP_NAME_VIET", caption: t("DEPARTMENT_NAME", "Department Name"), minWidth: 260 },
                    ]}
                  />
                </div>
              ) : null}
            </div>
          </div>
        ) : null}

        {children ? <div>{children}</div> : null}

        <div className="flex justify-end gap-3 pt-3">
          <Button stylingMode="text" text={t("CANCEL", "Cancel")} onClick={onHide} />
          <Button type="success" text={t("CONFIRM", "Confirm")} onClick={handleConfirm} />
        </div>
      </div>
    </Popup>
  )
}
