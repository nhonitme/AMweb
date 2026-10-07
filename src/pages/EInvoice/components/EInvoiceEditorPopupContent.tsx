import { type ReactNode, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { useQueryClient } from "@tanstack/react-query"
import Button from "devextreme-react/button"
import type { Product } from "@/types/product"
import { isCashRegisterSeries } from "../einvoiceCashRegister"
import EInvoicePosProducts from "./EInvoicePosProducts"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import type { HidingEvent } from "devextreme/ui/popup"
import type dxDataGrid from "devextreme/ui/data_grid"
import type {
  CellClickEvent,
  CellPreparedEvent,
  EditorPreparingEvent,
  FocusedCellChangedEvent,
  ToolbarPreparingEvent,
} from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import {
  AM_GRID_READONLY_COLUMN_CELL_CLASS,
  createSpreadsheetContinueRowKeyDownHandler,
  formatSpreadsheetSummaryNumber,
  insertSpreadsheetTextAreaNewline,
  isReadonlySpreadsheetColumn,
  isSpreadsheetMultilineInsertKey,
  normalizeSpreadsheetMultilineText,
  prepareVoucherSpreadsheetToolbar,
  resolveSpreadsheetKeyboardEvent,
  shouldKeepCurrentRowKeyOnDataSourceChange,
} from "@/components/datagrid/voucherSpreadsheetGrid"
import { useVoucherSpreadsheetScrollPreserve } from "@/components/datagrid/useVoucherSpreadsheetScrollPreserve"
import { createEInvoice, getNextEInvoiceBkeNo, updateEInvoice } from "@/api/einvoiceApi"
import type { SysCode } from "@/api/sysCodeService"
import { getApiErrorMessage } from "@/api/apiTypes"
import ProductLookupCellEditor from "@/components/lookup/InventoryLookupCellEditor"
import { LookupGridCellEditor, consumeLookupCellOpen, queueLookupCellOpen, type LookupOpenMode } from "@/components/lookup/LookupGridCellDisplay"
import VatRateLookupCellEditor from "@/components/lookup/VatRateLookupCellEditor"
import EinvTchatLookupCellEditor, { formatEinvTchatDisplay } from "@/components/lookup/EinvTchatLookupCellEditor"
import type { EinvTchatLookupItem } from "@/components/lookup/einvTchatLookupStore"
import { formatEinvLhhdtrungDisplay } from "@/components/lookup/EinvLhhdtrungLookupCellEditor"
import type { EinvLhhdtrungLookupItem } from "@/components/lookup/einvLhhdtrungLookupStore"
import { LHHDTRUNG_CODE_TYPE } from "@/components/lookup/einvLhhdtrungLookupStore"
import ShortcutHelpPopup from "@/components/shortcuts/ShortcutHelpPopup"
import { useLookupPopupHost } from "@/components/lookup/LookupPopupHost"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import useShortcutHelp from "@/hooks/useShortcutHelp"
import {
  useEInvoiceDetailQuery,
  useEInvoiceSellersQuery,
  useEInvoiceUserSettingDefaultsQuery,
} from "@/hooks/queries/useEInvoiceEditorQueries"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { getCachedSysCodes } from "@/lib/sysCodeCache"
import {
  clearEInvoiceDetailCache,
  isEInvoiceVersionConflictError,
  saveEInvoiceDetailCache,
} from "@/lib/einvoiceDetailCache"
import { queryKeys } from "@/lib/query/queryKeys"
import { createSysCodeDisplayExpr, createSysCodeValueExpr } from "@/lib/sysCodeUtils"
import { DEFAULT_CURRENCY_CODE, isForeignCurrencyCode, normalizeCurrencyCode } from "@/lib/currency"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import { createPopupShortcutWrapperAttr, isPopupShortcutScopeTopMost, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import { flushActiveEditorValue } from "@/lib/shortcuts/shortcutUtils"
import type { CustomerExt } from "@/types/customerExt"
import { firstLookupText } from "@/components/lookup/lookupHelpers"
import type { TaxLookupInfo } from "@/types/taxLookup"
import type { EInvoice, EInvoiceBkeInfo, EInvoiceDetailSpecialInfo, EInvoiceRelatedInfo } from "@/types/einvoice"
import EInvoiceDetailSpecialPopup from "./EInvoiceDetailSpecialPopup"
import EInvoiceBkePopup from "./EInvoiceBkePopup"
import EInvoiceDetailExcelImportPopup from "./EInvoiceDetailExcelImportPopup"
import EInvoiceDetailGridSection from "./EInvoiceDetailGridSection"
import EInvoiceHeaderSection from "./EInvoiceHeaderSection"
import EInvoicePrintOptionsPopup from "./EInvoicePrintOptionsPopup"
import EInvoiceTotalsSection from "./EInvoiceTotalsSection"
import { useEInvoiceDetailGrid } from "./useEInvoiceDetailGrid"
import { useEInvoiceDetailExcelImport } from "./useEInvoiceDetailExcelImport"
import { useEInvoiceEditorForm } from "./useEInvoiceEditorForm"
import { useEInvoiceEditorSave } from "./useEInvoiceEditorSave"
import "./einvoiceEditor.css"
import type {
  EInvoiceDetailCellInfo,
  EInvoiceDetailDisplayCellInfo,
  EInvoiceDetailRow,
  EInvoiceEditorPopupProps,
  EInvoiceFormData,
  GridKey,
} from "./EInvoiceEditorTypes"
import {
  DEFAULT_TCHAT,
  DETAIL_GRID_FIRST_EDIT_FIELD,
  DETAIL_LIVE_INPUT_FIELDS,
  DETAIL_LOOKUP_FIELDS,
  manualTotalFields,
  type DetailCalcDriverField,
  type DetailTaxDriverField,
} from "./EInvoiceEditorConstants"
import {
  applyManualTotalValues,
  clearAutoCalculatedHeaderTotalOverrides,
  cloneEInvoiceDetailRow,
  commitDetailGridCell,
  createDetailTchatSetCellValue,
  createInvoiceFormData,
  hasActiveDetailCommercialDiscount,
  isDevExtremeDropdownOverlayTarget,
  isSpecialTchat,
  normalizeEInvoiceDetailGridRows,
  normalizeFormValue,
  normalizeManualTotalValue,
  readGridDetailRows,
  resolveBuyerCustomerId,
} from "./EInvoiceEditorHelpers"
import {
  COMMERCIAL_DISCOUNT_LINE_NAME,
  applyHeaderTaxRateToInvoiceDetails,
  applySellerToEInvoice,
  createDefaultEInvoice,
  createDefaultEInvoiceRelated,
  createDefaultEInvoiceBke,
  createEInvoiceCopy,
  createNextEInvoiceDetail,
  EINV_TCHDON_CODE_TYPE,
  findEInvoiceSeller,
  findEInvoiceSellerById,
  findEInvoiceSellerByXslId,
  resolveEInvoiceTemplateXslId,
  formatEInvoiceDetailSpecialSummary,
  formatEInvoiceBkeDateToday,
  getActiveEInvoiceDetails,
  getEInvoiceDetailAppendRequiredField,
  getEInvoiceTchdon,
  hasEInvoiceDetailSpecialData,
  hasActiveEInvoiceBkeDetails,
  hasEInvoiceBkeData,
  isEInvoiceMultiRelatedInvoice,
  isSameEInvoiceBuyerTaxCode,
  isEInvoiceNq204Active,
  migrateHeaderCommercialDiscountToDetailLine,
  isEInvoiceSalesForm,
  isEInvoiceSellerUseMultiTaxRate,
  isEInvoiceAdjustmentInvoice,
  isEInvoiceSigned,
  isEInvoiceWithoutTaxRate,
  type EInvoiceCalcSettings,
  isValidBuyerEmailList,
  mapEInvoiceToApiPayload,
  normalizeEInvoice,
  normalizeEInvoiceDetailRow,
  recalculateInvoiceTotals,
  renumberEInvoiceDetails,
  requiresEInvoiceRelatedInvoice,
  resolveAfterTaxUnitPrice,
  resolveEInvoiceDetailRowKey,
  resolveEInvoiceFormTchdon,
  resolveHeaderTaxRateFromDetails,
  setEInvoiceNq204Extra,
  shouldValidateEInvoiceDetailBeforeAppend,
  syncEInvoiceBkeWithRelated,
  validateEInvoiceForeignCurrencyRate,
} from "../einvoiceModel"
import { EINV_KEY, fieldRequiredMessage } from "../einvoiceI18n"
import {
  applyDefaultVatRateToDetail,
  EMPTY_EINVOICE_USER_SETTING_DEFAULTS,
  resolveEInvoiceCalcSettings,
  type EInvoiceUserSettingDefaults,
} from "../einvoiceUserSettingDefaults"
import {
  getEInvoiceDiscountRateFallbackPrecision,
  getEInvoiceMoneyFallbackPrecision,
  getEInvoiceQuantityFallbackPrecision,
  useEInvoiceDecimalResolver,
} from "../einvoiceDecimalSettings"
import {
  applyWarehouseFieldsToInvoice,
  createDefaultWarehouseFields,
  isEInvoiceWarehouseConsignment,
  isEInvoiceWarehouseForm,
  isEInvoiceWarehouseInternal,
  validateEInvoiceWarehouseFieldsBeforeSave,
} from "../einvoiceWarehouseModel"
import {
  applyPxkDetailQuantitySync,
  enrichWarehouseDetailRow,
  isPxkSyncThucXuatNhap,
  setPxkSyncThucXuatNhap,
} from "../einvoiceWarehouseDetailModel"
import {
  buildPrintRequestFromInvoice,
  downloadEInvoicesBatch,
  openEInvoiceReportViewer,
  type EInvoicePrintConfirmPayload,
} from "../einvoiceReportViewer"

type DetailSetCellValue = (
  newData: Partial<EInvoiceDetailRow>,
  value: unknown,
  currentRowData: EInvoiceDetailRow,
) => void

function InvoiceHeaderContainer({ cashRegister, ariaLabel, children }: { cashRegister?: boolean; ariaLabel: string; children: ReactNode }) {
  return cashRegister ? <section className="einvoice-pos-info" aria-label={ariaLabel}>{children}</section> : <>{children}</>
}

function getHeaderFormStamp(formData: EInvoiceFormData) {
  return [
    formData.BUYER_CUSTOMER_ID,
    formData.NMUA_TEN,
    formData.NMUA_MST,
    formData.NMUA_DCHI,
    formData.NMUA_DCTDTU,
    formData.NMUA_HVTNMHANG,
    formData.NMUA_MTINH,
    formData.NMUA_TTINH,
    formData.NMUA_MXA,
    formData.NMUA_TXA,
    formData.NMUA_STKNHANG,
    formData.NMUA_TNHANG,
    formData.NMUA_SDTHOAI,
    formData.NMUA_MDVQHNSACH,
    formData.NMUA_CCCDAN,
    formData.NMUA_SHCHIEU,
    formData.TEMPLATE_XSL_ID,
    formData.SELLER_ID,
    formData.NLAP,
    formData.DVTTE,
    formData.TGIA,
    formData.HTTTOAN,
    formData.TCHDON,
    formData.KHHDON,
    formData.KHMSHDON,
    formData.NBAN_DCHI,
    formData.HDKTSo,
    formData.HDKTNgay,
    formData.LDDNBo,
    formData.HVTNXHang,
    formData.TNVChuyen,
    formData.HDSo,
    formData.PTVChuyen,
    JSON.stringify(formData.RELATED ?? null),
  ].join("\u001f")
}

export default function EInvoiceEditorPopupContent({
  visible,
  cashRegister,
  invoiceId: invoiceIdProp,
  initialInvoice = null,
  copyFromInvoiceId = 0,
  readOnly = false,
  onClose,
  onSaved,
}: EInvoiceEditorPopupProps) {
  const lookupPopupHost = useLookupPopupHost()
  const queryClient = useQueryClient()
  const popupShortcutScopeId = usePopupShortcutScopeId("einvoice-editor")
  const companyCd = getCurrentCompanyCd()
  const detailGridRef = useRef<dxDataGrid<EInvoiceDetailRow, GridKey> | null>(null)
  const detailGridContainerRef = useRef<HTMLDivElement | null>(null)
  const editorScrollContainerRef = useRef<HTMLDivElement | null>(null)
  const currentDetailRowKeyRef = useRef<string | null>(null)
  const formDataRef = useRef<EInvoiceFormData>(createInvoiceFormData(companyCd))
  const headerStampRef = useRef("")
  const headerFormDataRef = useRef<EInvoiceFormData>(formDataRef.current)
  const manualTotalOverridesRef = useRef<Partial<Record<string, unknown>>>({})
  const userSettingDefaultsRef = useRef<EInvoiceUserSettingDefaults>(EMPTY_EINVOICE_USER_SETTING_DEFAULTS)
  const hydratedSessionRef = useRef<string | null>(null)
  const [userEditorSettings, setUserEditorSettings] = useState<EInvoiceUserSettingDefaults>(EMPTY_EINVOICE_USER_SETTING_DEFAULTS)
  const [currentInvoiceId, setCurrentInvoiceId] = useState(invoiceIdProp)
  const invoiceId = currentInvoiceId
  const isUpdate = invoiceId > 0
  const needsInvoiceFetch = (isUpdate && initialInvoice == null) || copyFromInvoiceId > 0
  const fetchInvoiceId = copyFromInvoiceId > 0 ? copyFromInvoiceId : invoiceId
  const editorSessionId = `${invoiceIdProp}:${copyFromInvoiceId}:${initialInvoice ? "prefetch" : "fetch"}`
  const [saving, setSaving] = useState(false)
  const [formData, setFormData] = useState<EInvoiceFormData>(() => createInvoiceFormData(companyCd))
  const [editorSessionKey, setEditorSessionKey] = useState(0)
  const [tchatOptions, setTchatOptions] = useState<EinvTchatLookupItem[]>([])
  const [lhhdtrungOptions, setLhhdtrungOptions] = useState<EinvLhhdtrungLookupItem[]>([])
  const [tchdonOptions, setTchdonOptions] = useState<SysCode[]>([])
  const [detailImportVisible, setDetailImportVisible] = useState(false)
  const [detailImportLoading, setDetailImportLoading] = useState(false)
  const [formHydrating, setFormHydrating] = useState(false)
  const [specialEditorRowKey, setSpecialEditorRowKey] = useState<string | null>(null)
  const [bkeEditorVisible, setBkeEditorVisible] = useState(false)
  const [nq204ReductionActive, setNq204ReductionActive] = useState(false)
  const [printOptionsVisible, setPrintOptionsVisible] = useState(false)
  const decimalResolver = useEInvoiceDecimalResolver(
    "UI",
    Number(formData.TEMPLATE_XSL_ID ?? formData.XSL_ID ?? 0),
  )
  const decimalResolverRef = useRef(decimalResolver)
  const decimalAppliedVersionRef = useRef(0)

  useEffect(() => {
    decimalResolverRef.current = decimalResolver
  }, [decimalResolver])

  const {
    data: allSellerOptions,
    isLoading: sellersLoading,
    isError: sellersError,
    error: sellersLoadError,
    refetch: refetchSellers,
  } = useEInvoiceSellersQuery("", visible)
  const sellerOptions = useMemo(() => (allSellerOptions ?? []).filter(seller =>
    cashRegister === undefined || isCashRegisterSeries(seller.KHHDON) === cashRegister
  ), [allSellerOptions, cashRegister])
  const {
    data: userDefaults,
    isLoading: userDefaultsLoading,
    isError: userDefaultsError,
    error: userDefaultsLoadError,
  } = useEInvoiceUserSettingDefaultsQuery(visible)
  const {
    data: invoiceData,
    isLoading: invoiceLoading,
    isError: invoiceError,
    error: invoiceLoadError,
    refetch: refetchInvoice,
  } = useEInvoiceDetailQuery(fetchInvoiceId, visible && needsInvoiceFetch)
  const loading =
    sellersLoading ||
    userDefaultsLoading ||
    formHydrating ||
    (needsInvoiceFetch && invoiceLoading)

  const { translate, lang } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
    lang?: string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  useMasterListLoadError(sellersError, sellersLoadError, t, "EInvoiceEditorPopup.sellers")
  useMasterListLoadError(userDefaultsError, userDefaultsLoadError, t, "EInvoiceEditorPopup.userDefaults")
  useMasterListLoadError(invoiceError, invoiceLoadError, t, "EInvoiceEditorPopup.invoice")

  useEffect(() => {
    formDataRef.current = formData
  }, [formData])

  const isForeignCurrency = isForeignCurrencyCode(formData.DVTTE)
  const moneyFallbackPrecision = useMemo(
    () => getEInvoiceMoneyFallbackPrecision(formData.DVTTE),
    [formData.DVTTE],
  )
  const vndMoneyFallbackPrecision = useMemo(() => getEInvoiceMoneyFallbackPrecision(DEFAULT_CURRENCY_CODE), [])
  const relatedTchdon = useMemo(() => resolveEInvoiceFormTchdon(formData), [formData])
  const isAdjustmentInvoice = isEInvoiceAdjustmentInvoice(relatedTchdon)
  const requiresRelatedInvoice = requiresEInvoiceRelatedInvoice(relatedTchdon)
  const isMultiRelatedInvoice = isEInvoiceMultiRelatedInvoice(relatedTchdon)
  const bkeSummary = useMemo(() => {
    if (!isMultiRelatedInvoice || !hasEInvoiceBkeData(formData.BKE_INFO)) {
      return null
    }
    const detailCount = (formData.BKE_INFO?.DETAILS ?? []).filter((detail) => detail.ISDEL !== 1).length
    return t("BKE_SUMMARY", "Bảng kê: {0} HĐ").replace("{0}", String(detailCount))
  }, [formData.BKE_INFO, isMultiRelatedInvoice, t])
  const tchdonDisplayExpr = useMemo(() => createSysCodeDisplayExpr(t), [t])
  const tchdonValueExpr = useMemo(() => createSysCodeValueExpr("number"), [])
  const visibleDetails = useMemo(() => getActiveEInvoiceDetails(formData.DETAILS), [formData.DETAILS])
  const selectedSeller = useMemo(
    () =>
      findEInvoiceSellerByXslId(sellerOptions, formData.TEMPLATE_XSL_ID) ??
      findEInvoiceSellerById(sellerOptions, formData.SELLER_ID) ??
      findEInvoiceSeller(sellerOptions, formData.KHHDON, formData.KHMSHDON),
    [formData.KHHDON, formData.KHMSHDON, formData.SELLER_ID, formData.TEMPLATE_XSL_ID, sellerOptions],
  )
  const withoutTaxRate = useMemo(() => isEInvoiceWithoutTaxRate(formData.KHMSHDON), [formData.KHMSHDON])
  const isSalesForm = useMemo(() => isEInvoiceSalesForm(formData.KHMSHDON), [formData.KHMSHDON])
  const isWarehouseForm = useMemo(() => isEInvoiceWarehouseForm(formData.KHMSHDON), [formData.KHMSHDON])
  const isWarehouseConsignment = useMemo(
    () => isEInvoiceWarehouseConsignment(formData.KHMSHDON, formData.KHHDON),
    [formData.KHHDON, formData.KHMSHDON],
  )
  const isWarehouseInternal = useMemo(
    () => isEInvoiceWarehouseInternal(formData.KHMSHDON, formData.KHHDON),
    [formData.KHHDON, formData.KHMSHDON],
  )
  const pxkSyncThucXuatNhap = useMemo(() => isPxkSyncThucXuatNhap(formData.EXTRA_JSON), [formData.EXTRA_JSON])
  const useMultiTaxRate = useMemo(
    () => !withoutTaxRate && isEInvoiceSellerUseMultiTaxRate(selectedSeller),
    [selectedSeller, withoutTaxRate],
  )
  const headerTaxRate = useMemo(
    () => resolveHeaderTaxRateFromDetails(formData.DETAILS, userEditorSettings.defaultVatRate),
    [formData.DETAILS, userEditorSettings.defaultVatRate],
  )
  const hasSpecialDetailColumn = useMemo(
    () => visibleDetails.some((detail) => isSpecialTchat(detail.TCHAT)),
    [visibleDetails],
  )
  const hasDetailCommercialDiscount = useMemo(
    () => hasActiveDetailCommercialDiscount(formData.DETAILS),
    [formData.DETAILS],
  )
  const specialEditorDetail = useMemo(() => {
    if (!specialEditorRowKey) {
      return null
    }

    return visibleDetails.find((detail) => detail.ROW_KEY === specialEditorRowKey) ?? null
  }, [specialEditorRowKey, visibleDetails])

  const getUserCalcSettings = useCallback(
    () =>
      resolveEInvoiceCalcSettings(
        userSettingDefaultsRef.current,
        getEInvoiceTchdon(formDataRef.current.RELATED ?? { TCHDON: formDataRef.current.TCHDON }),
      ),
    [],
  )

  const prepareDetailTchatChange = useCallback((row: EInvoiceDetailRow, nextTchat: number) => {
    const current = formDataRef.current
    const { detail, manualOverrides } = migrateHeaderCommercialDiscountToDetailLine(
      current,
      row,
      nextTchat,
      manualTotalOverridesRef.current,
      userSettingDefaultsRef.current.defaultVatRate,
    )
    manualTotalOverridesRef.current = manualOverrides
    return detail as EInvoiceDetailRow
  }, [])

  const detailTchatSetCellValue = useMemo(
    () => createDetailTchatSetCellValue(prepareDetailTchatChange),
    [prepareDetailTchatChange],
  )

  const softDeletedCount = useMemo(
    () => formData.DETAILS.reduce((count, item) => count + (Number(item.ISDEL ?? 0) === 1 ? 1 : 0), 0),
    [formData.DETAILS],
  )
  const isBusy = loading || saving || detailImportLoading
  const isReadOnly = readOnly || (isUpdate && isEInvoiceSigned(formData))
  const canEditInvoiceDate = !isReadOnly && !cashRegister
  const canSave = visible && !isBusy && !isReadOnly
  const { captureScrollPositions, scheduleDataSourceChange, preserveScrollForSync } = useVoucherSpreadsheetScrollPreserve({
    gridRef: detailGridRef,
    containerRef: editorScrollContainerRef,
    dataSource: visibleDetails,
  })
  const getHeaderNumberFormat = useCallback(
    (fieldKey: string, fallbackPrecision: number, currencyCode: string | null | undefined = formData.DVTTE) =>
      decimalResolver.getFormat("HEADER", fieldKey, currencyCode, fallbackPrecision),
    [decimalResolver, formData.DVTTE],
  )
  const getDetailNumberFormat = useCallback(
    (fieldKey: string, fallbackPrecision: number, currencyCode: string | null | undefined = formData.DVTTE) =>
      decimalResolver.getFormat("DETAIL", fieldKey, currencyCode, fallbackPrecision),
    [decimalResolver, formData.DVTTE],
  )
  const getDetailNumberEditorOptions = useCallback(
    (fieldKey: string, fallbackPrecision: number, currencyCode: string | null | undefined = formData.DVTTE) => ({
      format: getDetailNumberFormat(fieldKey, fallbackPrecision, currencyCode),
      useMaskBehavior: true,
      ...(isAdjustmentInvoice ? {} : { min: 0 }),
    }),
    [getDetailNumberFormat, formData.DVTTE, isAdjustmentInvoice],
  )

  useEffect(() => {
    const grid = detailGridRef.current
    if (!grid) {
      return
    }

    grid.columnOption("SPECIAL_SUMMARY", "visible", hasSpecialDetailColumn)
    grid.columnOption("TLCKHAU", "visible", !isWarehouseForm && userEditorSettings.showDiscountColumns)
    grid.columnOption("STCKHAU", "visible", !isWarehouseForm && userEditorSettings.showDiscountColumns)
    grid.columnOption("TSUAT", "visible", !withoutTaxRate && useMultiTaxRate)
    grid.columnOption("TTHUE", "visible", !isWarehouseForm && !withoutTaxRate && useMultiTaxRate)
    grid.columnOption("TSAUTHUE", "visible", !isWarehouseForm && !withoutTaxRate && useMultiTaxRate)
    grid.columnOption("DGIA_VND", "visible", !isWarehouseForm && isForeignCurrency)
    grid.columnOption("AFTER_TAX_UNIT_PRICE", "visible", !isWarehouseForm && userEditorSettings.afterTaxPrice && !withoutTaxRate)
    grid.columnOption("THTIEN_VND", "visible", !isWarehouseForm && isForeignCurrency)
    grid.columnOption("STCKHAU_VND", "visible", !isWarehouseForm && userEditorSettings.showDiscountColumns && isForeignCurrency)
    grid.columnOption("SLTHUCNHAP", "visible", isWarehouseInternal)
    grid.columnOption("SLUONG", "caption", isWarehouseInternal ? t("SLTHUCXUAT", "Actual export") : t("SLUONG", "Quantity"))
    grid.columnOption("THTIEN", "allowEditing", !isReadOnly && (!userEditorSettings.autoCalcAmount || userEditorSettings.autoCalcPriceFromBeforeTaxAmount))
    grid.columnOption("TTHUE", "allowEditing", !isReadOnly && !userEditorSettings.autoCalcTax)
    grid.columnOption("TSAUTHUE", "allowEditing", !isReadOnly && (!userEditorSettings.autoCalcTax || userEditorSettings.autoCalcPriceFromAfterTaxAmount))
  }, [hasSpecialDetailColumn, isForeignCurrency, isReadOnly, isWarehouseForm, isWarehouseInternal, t, useMultiTaxRate, userEditorSettings.afterTaxPrice, userEditorSettings.autoCalcAmount, userEditorSettings.autoCalcPriceFromAfterTaxAmount, userEditorSettings.autoCalcPriceFromBeforeTaxAmount, userEditorSettings.autoCalcTax, userEditorSettings.showDiscountColumns, withoutTaxRate])

  useEffect(() => {
    const grid = detailGridRef.current
    if (!grid) {
      return
    }

    DETAIL_LIVE_INPUT_FIELDS.forEach((fieldKey) => {
      const fallbackPrecision =
        fieldKey === "SLUONG"
          ? getEInvoiceQuantityFallbackPrecision()
          : fieldKey === "TLCKHAU"
            ? getEInvoiceDiscountRateFallbackPrecision()
            : moneyFallbackPrecision
      grid.columnOption(fieldKey, "editorOptions", getDetailNumberEditorOptions(fieldKey, fallbackPrecision))
    })
  }, [getDetailNumberEditorOptions, isAdjustmentInvoice, moneyFallbackPrecision])

  const summaryItems = useMemo(
    () => [
      {
        key: "rows",
        label: t("ROW_COUNT", "Rows"),
        value: formatSpreadsheetSummaryNumber(visibleDetails.length),
      },
      {
        key: "amount",
        label: t("TOTAL_AMOUNT", "Total Amount"),
        value: formatSpreadsheetSummaryNumber(Number(formData.TGTTTBSO ?? 0), decimalResolver.getPrecision("HEADER", "TGTTTBSO", formData.DVTTE, moneyFallbackPrecision)),
      },
    ],
    [decimalResolver, formData.DVTTE, formData.TGTTTBSO, moneyFallbackPrecision, t, visibleDetails.length],
  )

  const popupTitle = useMemo(
    () =>
      isReadOnly
        ? t("VIEW", "View e-invoice")
        : isUpdate
          ? t("EDIT", "Edit e-invoice")
          : t("CREATE", "Create e-invoice"),
    [isReadOnly, isUpdate, t],
  )

  const popupSubtitle = useMemo(() => {
    if (formData.SHDON) {
      return `${[formData.KHMSHDON, formData.KHHDON].filter(Boolean).join(" / ") || "-"} · ${formData.SHDON}`
    }

    return (
      [formData.KHMSHDON, formData.KHHDON, formData.THDON].filter(Boolean).join(" / ") ||
      (isUpdate ? t("NO_NUMBER", "No invoice number yet") : t("NEW_DOCUMENT", "New document"))
    )
  }, [formData.KHHDON, formData.KHMSHDON, formData.SHDON, formData.THDON, isUpdate, t])

  const shortcutActions = useMemo(
    () => [
      SHORTCUT_ACTIONS.SAVE,
      SHORTCUT_ACTIONS.SAVE_AND_NEW,
      SHORTCUT_ACTIONS.SAVE_AND_CLOSE,
      SHORTCUT_ACTIONS.PRINT,
      SHORTCUT_ACTIONS.CLOSE,
      SHORTCUT_ACTIONS.ADD_ROW,
      SHORTCUT_ACTIONS.DELETE_ROW,
      SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH,
      SHORTCUT_ACTIONS.HELP,
    ],
    [],
  )

  const {
    shortcutHelpVisible,
    shortcutHelpItems,
    openShortcutHelp,
    closeShortcutHelp,
  } = useShortcutHelp(shortcutActions)

  useEffect(() => {
    void getCachedSysCodes("EINV_TCHAT").then(setTchatOptions)
    void getCachedSysCodes(LHHDTRUNG_CODE_TYPE).then(setLhhdtrungOptions)
    void getCachedSysCodes(EINV_TCHDON_CODE_TYPE).then(setTchdonOptions)
  }, [])

  const lhhdtrungDisplayOptions = useMemo(
    () =>
      lhhdtrungOptions.map((item) => ({
        ...item,
        CODE_NAME: t(item.CODE_NAME, item.NOTE || item.CODE_NAME),
      })),
    [lhhdtrungOptions, t],
  )
  const resolveLhhdtrungLabel = useCallback(
    (lhhdtrung: number) => formatEinvLhhdtrungDisplay(lhhdtrung, lhhdtrungDisplayOptions),
    [lhhdtrungDisplayOptions],
  )
  const openSpecialEditor = useCallback((rowKey: string) => {
    setSpecialEditorRowKey(rowKey)
  }, [])
  const closeSpecialEditor = useCallback(() => {
    setSpecialEditorRowKey(null)
  }, [])

  useEffect(() => {
    if (visible) {
      if (hydratedSessionRef.current !== editorSessionId) {
        setFormHydrating(true)
      }
      return
    }

    hydratedSessionRef.current = null
    setFormHydrating(false)
    setSpecialEditorRowKey(null)
    setDetailImportVisible(false)
    setNq204ReductionActive(false)
    setPrintOptionsVisible(false)
    manualTotalOverridesRef.current = {}
  }, [editorSessionId, visible])

  useEffect(() => {
    if (!visible) {
      return
    }

    setCurrentInvoiceId(invoiceIdProp)
  }, [invoiceIdProp, visible])

  useEffect(() => {
    if (!visible) {
      return
    }

    if (hydratedSessionRef.current === editorSessionId) {
      return
    }

    if (sellersLoading || userDefaultsLoading) {
      return
    }

    if (!userDefaults) {
      return
    }

    if (needsInvoiceFetch && invoiceLoading) {
      return
    }

    let cancelled = false

    const hydrateForm = async () => {
      setFormHydrating(true)
      manualTotalOverridesRef.current = {}
      let hydrated = false
      try {
        userSettingDefaultsRef.current = userDefaults
        setUserEditorSettings(userDefaults)

        if (sellerOptions.length === 0) {
          notify(t("SELLER_NOT_CONFIGURED", "E-invoice seller is not configured"), "warning", 4000)
          return
        }

        const applyInvoiceSource = async (sourceInvoice: EInvoice) => {
          const seller =
            findEInvoiceSellerByXslId(sellerOptions, sourceInvoice.XSL_ID) ??
            findEInvoiceSeller(sellerOptions, sourceInvoice.KHHDON, sourceInvoice.KHMSHDON)
          const buyerCustomerId = await resolveBuyerCustomerId(sourceInvoice)
          if (cancelled) {
            return
          }

          if (isEInvoiceNq204Active(sourceInvoice) && Number(sourceInvoice.TGTKHAC ?? 0) > 0) {
            manualTotalOverridesRef.current.TGTKHAC = Number(sourceInvoice.TGTKHAC)
          }

          setFormData({
            ...applyWarehouseFieldsToInvoice(
              recalculateInvoiceTotals(
                applySellerToEInvoice(sourceInvoice, seller),
                decimalResolverRef.current,
                resolveEInvoiceCalcSettings(userDefaults, resolveEInvoiceFormTchdon(sourceInvoice)),
                {
                  preferInvoiceReduction: manualTotalOverridesRef.current.TGTKHAC !== undefined,
                  defaultVatRate: userDefaults.defaultVatRate,
                },
              ),
            ),
            BUYER_CUSTOMER_ID: buyerCustomerId,
            TEMPLATE_XSL_ID: resolveEInvoiceTemplateXslId(sellerOptions, sourceInvoice),
          })
          setNq204ReductionActive(isEInvoiceNq204Active(sourceInvoice))
          hydrated = true
        }

        if (!isUpdate) {
          if (copyFromInvoiceId > 0) {
            if (!invoiceData) {
              return
            }

            const copied = createEInvoiceCopy(normalizeEInvoice(invoiceData, companyCd), companyCd)
            await applyInvoiceSource(copied)
            return
          }

          if (initialInvoice) {
            await applyInvoiceSource(initialInvoice)
            return
          }

          const defaultSeller = findEInvoiceSeller(sellerOptions)
          if (cancelled) {
            return
          }

          setFormData(
            recalculateInvoiceTotals(
              createInvoiceFormData(companyCd, defaultSeller, userDefaults),
              decimalResolverRef.current,
              resolveEInvoiceCalcSettings(userDefaults),
            ),
          )
          setNq204ReductionActive(false)
          hydrated = true
          return
        }

        const sourceInvoice =
          initialInvoice != null
            ? normalizeEInvoice(initialInvoice, companyCd)
            : invoiceData
              ? normalizeEInvoice(invoiceData, companyCd)
              : null

        if (!sourceInvoice) {
          return
        }

        await applyInvoiceSource(sourceInvoice)
      } finally {
        if (!cancelled) {
          setFormHydrating(false)
          if (hydrated) {
            hydratedSessionRef.current = editorSessionId
          }
        }
      }
    }

    void hydrateForm()

    return () => {
      cancelled = true
    }
  }, [
    companyCd,
    copyFromInvoiceId,
    editorSessionId,
    initialInvoice,
    invoiceData,
    invoiceLoading,
    isUpdate,
    needsInvoiceFetch,
    sellerOptions,
    sellersLoading,
    t,
    userDefaults,
    userDefaultsLoading,
    visible,
  ])

  const getNq204RecalcOptions = useCallback(
    () => ({
      preferInvoiceReduction: manualTotalOverridesRef.current.TGTKHAC !== undefined,
      defaultVatRate: userSettingDefaultsRef.current.defaultVatRate,
    }),
    [],
  )

  useEffect(() => {
    if (!visible) {
      decimalAppliedVersionRef.current = 0
      return
    }

    if (decimalResolver.rules.length === 0) {
      return
    }

    if (decimalResolver.version <= decimalAppliedVersionRef.current) {
      return
    }

    decimalAppliedVersionRef.current = decimalResolver.version
    setFormData((current) => ({
      ...applyManualTotalValues(
        recalculateInvoiceTotals(current, decimalResolver, getUserCalcSettings(), getNq204RecalcOptions()),
        manualTotalOverridesRef.current,
      ),
      BUYER_CUSTOMER_ID: current.BUYER_CUSTOMER_ID,
    }))
  }, [decimalResolver, getNq204RecalcOptions, getUserCalcSettings, visible])

  const updateInvoice = useCallback((updater: (current: EInvoiceFormData) => EInvoiceFormData) => {
    setFormData((current) => {
      const next = updater(current)
      return {
        ...applyManualTotalValues(
          recalculateInvoiceTotals(next, decimalResolver, getUserCalcSettings(), getNq204RecalcOptions()),
          manualTotalOverridesRef.current,
        ),
        BUYER_CUSTOMER_ID: next.BUYER_CUSTOMER_ID,
      }
    })
  }, [decimalResolver, getNq204RecalcOptions, getUserCalcSettings])

  const buildMergedDetailRows = useCallback((): EInvoiceDetailRow[] => {
    const currentForm = formDataRef.current
    const rate = Number(currentForm.TGIA ?? 1)
    const currencyCode = currentForm.DVTTE
    const gridRows = readGridDetailRows(detailGridRef.current)
    const source = gridRows ?? detailGridRef.current?.option("dataSource")
    const calcSettings = getUserCalcSettings()
    const activeRows = Array.isArray(source)
      ? normalizeEInvoiceDetailGridRows(source as EInvoiceDetailRow[], rate, currencyCode, decimalResolver, calcSettings)
      : normalizeEInvoiceDetailGridRows(visibleDetails.map(cloneEInvoiceDetailRow), rate, currencyCode, decimalResolver, calcSettings)
    const activeRowMap = new Map(
      activeRows.map((item) => [item.ROW_KEY, { ...item, ISDEL: 0 }] as const),
    )
    const mergedRows: EInvoiceDetailRow[] = []

    currentForm.DETAILS.forEach((item) => {
      if (Number(item.ISDEL ?? 0) === 1) {
        mergedRows.push(cloneEInvoiceDetailRow(item as EInvoiceDetailRow))
        return
      }

      const activeRow = activeRowMap.get(item.ROW_KEY)
      if (!activeRow) {
        return
      }

      mergedRows.push(cloneEInvoiceDetailRow(activeRow))
      activeRowMap.delete(item.ROW_KEY)
    })

    activeRowMap.forEach((item) => {
      mergedRows.push(cloneEInvoiceDetailRow(item))
    })

    return normalizeEInvoiceDetailGridRows(mergedRows, rate, currencyCode, decimalResolver, calcSettings)
  }, [decimalResolver, getUserCalcSettings, visibleDetails])

  const emitDetailRowsChange = useCallback((rows: EInvoiceDetailRow[]): EInvoiceFormData => {
    const current = formDataRef.current
    const manualOverrides = clearAutoCalculatedHeaderTotalOverrides(manualTotalOverridesRef.current, rows)
    manualTotalOverridesRef.current = manualOverrides
    const next = {
      ...applyManualTotalValues(
        recalculateInvoiceTotals(
          {
            ...current,
            DETAILS: rows,
          },
          decimalResolver,
          getUserCalcSettings(),
          getNq204RecalcOptions(),
        ),
        manualOverrides,
      ),
      BUYER_CUSTOMER_ID: current.BUYER_CUSTOMER_ID,
    }

    formDataRef.current = next
    setFormData(next)
    return next
  }, [decimalResolver, getNq204RecalcOptions, getUserCalcSettings])

  const syncDetailRows = useCallback(() => emitDetailRowsChange(buildMergedDetailRows()), [buildMergedDetailRows, emitDetailRowsChange])

  const patchDetailRowTchat = useCallback(
    (rowKey: string, nextTchat: number, openEditor = false) => {
      const current = formDataRef.current
      const rows = current.DETAILS.map((row) => {
        if (row.ROW_KEY !== rowKey || Number(row.ISDEL ?? 0) === 1) {
          return row
        }

        const { detail, manualOverrides } = migrateHeaderCommercialDiscountToDetailLine(
          current,
          row,
          nextTchat,
          manualTotalOverridesRef.current,
          userSettingDefaultsRef.current.defaultVatRate,
        )
        manualTotalOverridesRef.current = manualOverrides
        return detail as EInvoiceDetailRow
      })

      emitDetailRowsChange(
        renumberEInvoiceDetails(
          rows,
          Number(current.TGIA ?? 1),
          current.DVTTE,
          decimalResolver,
          getUserCalcSettings(),
        ) as EInvoiceDetailRow[],
      )

      if (openEditor && isSpecialTchat(nextTchat)) {
        openSpecialEditor(rowKey)
      } else if (!isSpecialTchat(nextTchat)) {
        setSpecialEditorRowKey((current) => (current === rowKey ? null : current))
      }
    },
    [decimalResolver, emitDetailRowsChange, getUserCalcSettings, openSpecialEditor],
  )

  const patchDetailRowSpecial = useCallback(
    (rowKey: string, special: EInvoiceDetailSpecialInfo | null) => {
      const current = formDataRef.current
      const rows = current.DETAILS.map((row) => {
        if (row.ROW_KEY !== rowKey || Number(row.ISDEL ?? 0) === 1) {
          return row
        }

        return {
          ...row,
          SPECIAL: special,
        } as EInvoiceDetailRow
      })

      emitDetailRowsChange(rows as EInvoiceDetailRow[])

      const grid = detailGridRef.current
      if (!grid) {
        return
      }

      const rowIndex = grid.getRowIndexByKey(rowKey)
      if (rowIndex >= 0) {
        grid.cellValue(rowIndex, "SPECIAL", special)
      }
    },
    [emitDetailRowsChange],
  )

  const handleSpecialEditorSave = useCallback(
    (special: EInvoiceDetailSpecialInfo) => {
      if (!specialEditorRowKey) {
        return
      }

      patchDetailRowSpecial(specialEditorRowKey, special)
    },
    [patchDetailRowSpecial, specialEditorRowKey],
  )

  const getCurrentDetailRowKey = useCallback(() => {
    const editingRowKey = detailGridRef.current?.option("editing.editRowKey")
    if (typeof editingRowKey === "string" && visibleDetails.some((item) => item.ROW_KEY === editingRowKey)) {
      return editingRowKey
    }

    const currentRowKey = currentDetailRowKeyRef.current
    if (currentRowKey && visibleDetails.some((item) => item.ROW_KEY === currentRowKey)) {
      return currentRowKey
    }

    return visibleDetails[visibleDetails.length - 1]?.ROW_KEY ?? null
  }, [visibleDetails])

  const commitDetailGridEdits = useCallback(async () => {
    const grid = detailGridRef.current
    if (!grid?.hasEditData()) {
      return
    }

    await commitDetailGridCell(grid)
  }, [])

  const handleDetailSaved = useCallback(() => {
    preserveScrollForSync(syncDetailRows)
  }, [preserveScrollForSync, syncDetailRows])

  const handleDetailFocusedCellChanged = useCallback(
    (event: FocusedCellChangedEvent<EInvoiceDetailRow, GridKey>) => {
      if (event.prevRowIndex < 0) {
        return
      }

      const prevField = String(event.prevColumn?.dataField ?? event.prevColumn?.name ?? "")
      const nextField = String(event.column?.dataField ?? event.column?.name ?? "")
      const columnChanged = event.prevColumnIndex !== event.columnIndex
      const rowChangedBetweenDataRows =
        event.rowIndex !== event.prevRowIndex && event.rowIndex >= 0 && event.prevRowIndex >= 0
      const enteringLookup = columnChanged && DETAIL_LOOKUP_FIELDS.has(nextField)
      const leavingNumeric = columnChanged && DETAIL_LIVE_INPUT_FIELDS.has(prevField)

      if (rowChangedBetweenDataRows) {
        void commitDetailGridEdits()
        return
      }

      if (leavingNumeric && !enteringLookup) {
        void detailGridRef.current?.closeEditCell?.()
      }
    },
    [commitDetailGridEdits],
  )

  const assignNormalizedDetailRow = useCallback(
    (newData: Partial<EInvoiceDetailRow>, draftRow: EInvoiceDetailRow, calcSettings?: EInvoiceCalcSettings) => {
      const currentForm = formDataRef.current
      const normalized = normalizeEInvoiceDetailRow(
        draftRow,
        Number(currentForm.TGIA ?? 1),
        currentForm.DVTTE,
        decimalResolver,
        calcSettings ?? getUserCalcSettings(),
      )

      Object.assign(newData, {
        SLUONG: normalized.SLUONG,
        DGIA: normalized.DGIA,
        TLCKHAU: normalized.TLCKHAU,
        STCKHAU: normalized.STCKHAU,
        TSUAT: normalized.TSUAT,
        THTIEN: normalized.THTIEN,
        TTHUE: normalized.TTHUE,
        TSAUTHUE: normalized.TSAUTHUE,
        DGIA_VND: normalized.DGIA_VND,
        STCKHAU_VND: normalized.STCKHAU_VND,
        THTIEN_VND: normalized.THTIEN_VND,
        TTHUE_VND: normalized.TTHUE_VND,
        TSAUTHUE_VND: normalized.TSAUTHUE_VND,
      })
    },
    [decimalResolver, getUserCalcSettings],
  )

  const createDetailCalcSetCellValue = useCallback(
    (fieldKey: DetailCalcDriverField): DetailSetCellValue =>
      (newData, value, currentRowData) => {
        const settings = getUserCalcSettings()
        const preserveLineTax = settings.autoCalcTax === false
        const currencyCode = formDataRef.current.DVTTE
        const syncPxkQuantities =
          fieldKey === "SLUONG" &&
          isEInvoiceWarehouseInternal(formDataRef.current.KHMSHDON, formDataRef.current.KHHDON) &&
          isPxkSyncThucXuatNhap(formDataRef.current.EXTRA_JSON)

        if (fieldKey === "SLUONG" && userSettingDefaultsRef.current.afterTaxPrice) {
          const afterTaxUnitPrice = resolveAfterTaxUnitPrice(currentRowData)
          assignNormalizedDetailRow(
            newData,
            {
              ...currentRowData,
              ...newData,
              SLUONG: value,
              ...(syncPxkQuantities ? { SLTHUCNHAP: value } : {}),
            } as EInvoiceDetailRow,
            {
              ...settings,
              detailAmountDriver: "afterTaxUnitPrice",
              afterTaxUnitPriceValue: afterTaxUnitPrice,
            },
          )
          return
        }

        assignNormalizedDetailRow(newData, {
          ...currentRowData,
          ...newData,
          [fieldKey]: value,
          ...(syncPxkQuantities ? { SLTHUCNHAP: value } : {}),
          ...(preserveLineTax
            ? {}
            : {
                TTHUE: null,
                TSAUTHUE: null,
                TTHUE_VND: null,
                TSAUTHUE_VND: null,
              }),
        } as EInvoiceDetailRow)
      },
    [assignNormalizedDetailRow, decimalResolver, getUserCalcSettings],
  )

  const createDetailThucNhapSetCellValue = useCallback((): DetailSetCellValue => {
    return (newData, value, currentRowData) => {
      const syncEnabled = isPxkSyncThucXuatNhap(formDataRef.current.EXTRA_JSON)
      assignNormalizedDetailRow(newData, {
        ...currentRowData,
        ...newData,
        SLTHUCNHAP: value,
        ...(syncEnabled ? { SLUONG: value } : {}),
      } as EInvoiceDetailRow)
    }
  }, [assignNormalizedDetailRow])

  const handlePxkSyncThucXuatNhapToggle = useCallback((enabled: boolean) => {
    setFormData((current) => ({
      ...current,
      EXTRA_JSON: setPxkSyncThucXuatNhap(current.EXTRA_JSON, enabled) ?? "",
      DETAILS: enabled
        ? current.DETAILS.map((detail) => applyPxkDetailQuantitySync(enrichWarehouseDetailRow(detail), true))
        : current.DETAILS,
    }))
  }, [])

  const createDetailAfterTaxPriceSetCellValue = useCallback((): DetailSetCellValue => {
    return (newData, value, currentRowData) => {
      const settings = getUserCalcSettings()
      const afterTaxUnitPrice = Number(value ?? 0)

      assignNormalizedDetailRow(
        newData,
        {
          ...currentRowData,
          ...newData,
        } as EInvoiceDetailRow,
        {
          ...settings,
          detailAmountDriver: "afterTaxUnitPrice",
          afterTaxUnitPriceValue: afterTaxUnitPrice,
        },
      )
    }
  }, [assignNormalizedDetailRow, getUserCalcSettings])

  const createDetailAmountSetCellValue = useCallback((): DetailSetCellValue => {
    return (newData, value, currentRowData) => {
      const settings = getUserCalcSettings()
      const preserveLineTax = settings.autoCalcTax === false
      assignNormalizedDetailRow(
        newData,
        {
          ...currentRowData,
          ...newData,
          THTIEN: value,
          ...(preserveLineTax
            ? {}
            : {
                TTHUE: null,
                TSAUTHUE: null,
                TTHUE_VND: null,
                TSAUTHUE_VND: null,
              }),
        } as EInvoiceDetailRow,
        settings.autoCalcPriceFromBeforeTaxAmount
          ? { ...settings, detailAmountDriver: "beforeTaxAmount" }
          : settings,
      )
    }
  }, [assignNormalizedDetailRow, getUserCalcSettings])

  const createDetailTaxSetCellValue = useCallback(
    (fieldKey: DetailTaxDriverField): DetailSetCellValue =>
      (newData, value, currentRowData) => {
        const settings = getUserCalcSettings()
        if (fieldKey === "TSAUTHUE" && settings.autoCalcPriceFromAfterTaxAmount) {
          const preserveLineTax = settings.autoCalcTax === false
          assignNormalizedDetailRow(
            newData,
            {
              ...currentRowData,
              ...newData,
              TSAUTHUE: value,
              ...(preserveLineTax
                ? {}
                : {
                    TTHUE: null,
                    TTHUE_VND: null,
                  }),
            } as EInvoiceDetailRow,
            { ...settings, detailAmountDriver: "afterTaxAmount" },
          )
          return
        }

        const currentForm = formDataRef.current
        const rate = Number(currentForm.TGIA ?? 1)
        const currencyCode = currentForm.DVTTE
        const foreignCurrency = isForeignCurrencyCode(currencyCode)
        const effectiveRate = rate > 0 ? rate : 1
        const draftRow = {
          ...currentRowData,
          ...newData,
          [fieldKey]: value,
        } as EInvoiceDetailRow
        const amount = Number(draftRow.THTIEN ?? 0)
        const amountVnd = Number(draftRow.THTIEN_VND ?? 0)
        const taxAmount = fieldKey === "TTHUE"
          ? decimalResolver.round("DETAIL", "TTHUE", Number(value ?? 0), currencyCode)
          : decimalResolver.round("DETAIL", "TTHUE", Number(value ?? 0) - amount, currencyCode)
        const afterTaxAmount = fieldKey === "TSAUTHUE"
          ? decimalResolver.round("DETAIL", "TSAUTHUE", Number(value ?? 0), currencyCode)
          : decimalResolver.round("DETAIL", "TSAUTHUE", amount + taxAmount, currencyCode)
        const taxAmountVnd = decimalResolver.round(
          "DETAIL",
          "TTHUE_VND",
          foreignCurrency ? taxAmount * effectiveRate : taxAmount,
          DEFAULT_CURRENCY_CODE,
        )

        Object.assign(newData, {
          TTHUE: taxAmount,
          TSAUTHUE: afterTaxAmount,
          TTHUE_VND: taxAmountVnd,
          TSAUTHUE_VND: decimalResolver.round(
            "DETAIL",
            "TSAUTHUE_VND",
            amountVnd + taxAmountVnd,
            DEFAULT_CURRENCY_CODE,
          ),
        })
      },
    [decimalResolver, assignNormalizedDetailRow, getUserCalcSettings],
  )

  const handleDetailCellPrepared = useCallback(
    (event: CellPreparedEvent<EInvoiceDetailRow, GridKey>) => {
      if (event.rowType !== "data" || !event.cellElement) {
        return
      }

      event.cellElement.classList.toggle(
        AM_GRID_READONLY_COLUMN_CELL_CLASS,
        isReadonlySpreadsheetColumn(event.column, isReadOnly),
      )
    },
    [isReadOnly],
  )

  const handleDetailEditorPreparing = useCallback((event: EditorPreparingEvent<EInvoiceDetailRow, GridKey>) => {
    if (event.parentType !== "dataRow" || !event.dataField) {
      return
    }

    const dataField = String(event.dataField)

    // Tên hàng hóa: TextArea + Alt/Shift+Enter xuống dòng (kiểu Excel).
    if (dataField === "THHDVU") {
      event.editorName = "dxTextArea"
      const currentValue = normalizeSpreadsheetMultilineText(
        event.editorOptions?.value ?? event.value ?? "",
      )
      event.editorOptions = {
        ...(event.editorOptions ?? {}),
        value: currentValue,
        autoResizeEnabled: true,
        minHeight: 54,
        maxHeight: 160,
        valueChangeEvent: "input",
        inputAttr: {
          title: t("THHDVU_NEWLINE_HINT", "Alt+Enter: xuống dòng (giống Excel)"),
        },
        onKeyDown: (editorEvent: { event?: unknown; component?: Parameters<typeof insertSpreadsheetTextAreaNewline>[0] }) => {
          const keyEvent = resolveSpreadsheetKeyboardEvent(editorEvent.event)
          if (!keyEvent || !isSpreadsheetMultilineInsertKey(keyEvent)) {
            return
          }

          keyEvent.preventDefault()
          keyEvent.stopPropagation()
          keyEvent.stopImmediatePropagation?.()
          const rawEvent = editorEvent.event as { preventDefault?: () => void; stopPropagation?: () => void; stopImmediatePropagation?: () => void } | undefined
          rawEvent?.preventDefault?.()
          rawEvent?.stopPropagation?.()
          rawEvent?.stopImmediatePropagation?.()
          insertSpreadsheetTextAreaNewline(editorEvent.component)
        },
      }
      return
    }

    if (!DETAIL_LIVE_INPUT_FIELDS.has(dataField)) {
      return
    }

    event.editorOptions = {
      ...(event.editorOptions ?? {}),
      valueChangeEvent: "input",
      ...(isAdjustmentInvoice ? {} : { min: 0 }),
    }
  }, [isAdjustmentInvoice, t])

  const handleAddDetailRow = useCallback(async (): Promise<string | null> => {
    if (isReadOnly) {
      return null
    }

    await commitDetailGridCell(detailGridRef.current)
    const currentForm = syncDetailRows()

    const activeRows = getActiveEInvoiceDetails(currentForm.DETAILS)
    const currentRowKey = getCurrentDetailRowKey()
    const currentRow = activeRows.find((row) => row.ROW_KEY === currentRowKey) ?? activeRows[activeRows.length - 1]

    if (currentRow && shouldValidateEInvoiceDetailBeforeAppend(currentRow, activeRows.length)) {
      const requiredField = getEInvoiceDetailAppendRequiredField(currentRow)
      if (requiredField) {
        notify(fieldRequiredMessage(t, requiredField.fieldKey, requiredField.fieldFallback), "warning", 3000)
        return null
      }
    }

    const seller =
      findEInvoiceSellerByXslId(sellerOptions, currentForm.TEMPLATE_XSL_ID) ??
      findEInvoiceSellerById(sellerOptions, currentForm.SELLER_ID) ??
      findEInvoiceSeller(sellerOptions, currentForm.KHHDON, currentForm.KHMSHDON)
    const defaultsForNextRow = isEInvoiceWithoutTaxRate(seller?.KHMSHDON)
      ? {
          ...userSettingDefaultsRef.current,
          defaultVatRate: "",
        }
      : isEInvoiceSellerUseMultiTaxRate(seller)
      ? userSettingDefaultsRef.current
      : {
          ...userSettingDefaultsRef.current,
          defaultVatRate:
            resolveHeaderTaxRateFromDetails(currentForm.DETAILS, userSettingDefaultsRef.current.defaultVatRate) ||
            userSettingDefaultsRef.current.defaultVatRate,
        }
    const defaultLineType = userSettingDefaultsRef.current.defaultLineType || DEFAULT_TCHAT
    const createdRow = applyDefaultVatRateToDetail(
      {
        ...createNextEInvoiceDetail(currentForm.DETAILS, currentForm.INVOICE_ID, companyCd),
        TCHAT: defaultLineType,
      },
      defaultsForNextRow,
      Number(currentForm.TGIA ?? 1),
      currentForm.DVTTE,
    )
    const { detail: nextRow, manualOverrides } = migrateHeaderCommercialDiscountToDetailLine(
      currentForm,
      createdRow,
      Number(createdRow.TCHAT ?? DEFAULT_TCHAT),
      manualTotalOverridesRef.current,
      userSettingDefaultsRef.current.defaultVatRate,
    )
    manualTotalOverridesRef.current = manualOverrides
    currentDetailRowKeyRef.current = nextRow.ROW_KEY
    const scrollSnapshot = captureScrollPositions()
    scheduleDataSourceChange(scrollSnapshot, {
      type: "focusCell",
      rowKey: nextRow.ROW_KEY,
      dataField: DETAIL_GRID_FIRST_EDIT_FIELD,
    })
    emitDetailRowsChange(
      renumberEInvoiceDetails(
        [...currentForm.DETAILS, nextRow],
        Number(currentForm.TGIA ?? 1),
        currentForm.DVTTE,
        decimalResolver,
        getUserCalcSettings(),
      ) as EInvoiceDetailRow[],
    )
    return nextRow.ROW_KEY
  }, [captureScrollPositions, companyCd, decimalResolver, emitDetailRowsChange, getCurrentDetailRowKey, getUserCalcSettings, isReadOnly, scheduleDataSourceChange, sellerOptions, syncDetailRows, t])

  const softDeleteDetailRowByKey = useCallback(
    async (targetKey: string | null) => {
      if (!targetKey || isReadOnly) {
        return
      }

      await commitDetailGridCell(detailGridRef.current)
      const currentForm = syncDetailRows()
      let changed = false
      const nextRows = currentForm.DETAILS.map((item) => {
        if (item.ROW_KEY !== targetKey || Number(item.ISDEL ?? 0) === 1) {
          return item as EInvoiceDetailRow
        }

        changed = true
        return {
          ...(item as EInvoiceDetailRow),
          ISDEL: 1,
        }
      })

      if (!changed) {
        return
      }

      if (currentDetailRowKeyRef.current === targetKey) {
        currentDetailRowKeyRef.current = getActiveEInvoiceDetails(nextRows).at(-1)?.ROW_KEY ?? null
      }

      emitDetailRowsChange(nextRows)
    },
    [emitDetailRowsChange, isReadOnly, syncDetailRows],
  )

  const undeleteLastDetailRow = useCallback(async () => {
    if (isReadOnly) {
      return
    }

    await commitDetailGridCell(detailGridRef.current)

    const currentForm = syncDetailRows()
    const currentRows = currentForm.DETAILS
    const deletedRow = [...currentRows].reverse().find((item) => Number(item.ISDEL ?? 0) === 1)
    if (!deletedRow) {
      return
    }

    const nextRows = renumberEInvoiceDetails(
      currentRows.map((item) =>
        item.ROW_KEY === deletedRow.ROW_KEY
          ? {
              ...(item as EInvoiceDetailRow),
              ISDEL: 0,
            }
          : (item as EInvoiceDetailRow),
      ),
      Number(currentForm.TGIA ?? 1),
      currentForm.DVTTE,
      decimalResolver,
      getUserCalcSettings(),
    ) as EInvoiceDetailRow[]

    currentDetailRowKeyRef.current = deletedRow.ROW_KEY
    emitDetailRowsChange(nextRows)
    requestAnimationFrame(() => {
      detailGridRef.current?.navigateToRow?.(deletedRow.ROW_KEY)
    })
  }, [decimalResolver, emitDetailRowsChange, getUserCalcSettings, isReadOnly, syncDetailRows])

  const handleDetailCellClick = useCallback((event: CellClickEvent<EInvoiceDetailRow, GridKey>) => {
    if (event.rowType !== "data") {
      return
    }

    currentDetailRowKeyRef.current = resolveEInvoiceDetailRowKey(event.key, event.data)
  }, [])

  const handleDetailKeyDown = useMemo(
    () =>
      createSpreadsheetContinueRowKeyDownHandler<EInvoiceDetailRow>(() => {
        if (!isReadOnly) {
          void handleAddDetailRow()
        }
      }),
    [handleAddDetailRow, isReadOnly],
  )

  const handleDetailToolbarPreparing = useCallback((event: ToolbarPreparingEvent<EInvoiceDetailRow, GridKey>) => {
    prepareVoucherSpreadsheetToolbar(event)
  }, [])

  useEffect(() => {
    if (!visible) {
      currentDetailRowKeyRef.current = null
      return
    }

    const currentRowKey = currentDetailRowKeyRef.current
    const visibleRowKeys = visibleDetails.map((item) => item.ROW_KEY)
    if (shouldKeepCurrentRowKeyOnDataSourceChange(detailGridRef.current, currentRowKey, visibleRowKeys)) {
      return
    }

    currentDetailRowKeyRef.current = visibleDetails[0]?.ROW_KEY ?? null
  }, [visible, visibleDetails])

  useEffect(() => {
    if (!visible || isReadOnly) {
      return
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (lookupPopupHost?.isLookupPopupOpen) {
        return
      }

      const target = event.target
      if (isDevExtremeDropdownOverlayTarget(target)) {
        return
      }

      const gridContainer = detailGridContainerRef.current
      if (!gridContainer || !(target instanceof Node) || gridContainer.contains(target)) {
        return
      }

      void commitDetailGridEdits()
    }

    document.addEventListener("pointerdown", handlePointerDown, true)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown, true)
    }
  }, [commitDetailGridEdits, isReadOnly, lookupPopupHost?.isLookupPopupOpen, visible])

  const handleNq204ReductionToggle = useCallback(
    (enabled: boolean) => {
      setNq204ReductionActive(enabled)
      if (enabled) {
        delete manualTotalOverridesRef.current.TGTKHAC
      } else {
        delete manualTotalOverridesRef.current.TGTKHAC
      }
      updateInvoice((current) => ({
        ...current,
        EXTRA_JSON: setEInvoiceNq204Extra(current.EXTRA_JSON, enabled) ?? "",
        ...(enabled ? {} : { TGTKHAC: 0 }),
      }))
    },
    [updateInvoice],
  )

  const handleNq204ReductionAmountChange = useCallback(
    (value: number | null | undefined) => {
      const parsed = Number(value ?? 0)
      const nextAmount = Number.isFinite(parsed) && parsed >= 0 ? parsed : 0
      manualTotalOverridesRef.current = {
        ...manualTotalOverridesRef.current,
        TGTKHAC: nextAmount,
      }
      updateInvoice((current) => ({
        ...current,
        TGTKHAC: nextAmount,
      }))
    },
    [updateInvoice],
  )

  const confirmBuyerMstChangeIfNeeded = useCallback(
    async (current: EInvoice, nextMst: string) => {
      if (isSameEInvoiceBuyerTaxCode(current.NMUA_MST, nextMst)) {
        return true
      }
      if (!isEInvoiceMultiRelatedInvoice(getEInvoiceTchdon(current.RELATED))) {
        return true
      }
      if (!hasActiveEInvoiceBkeDetails(current.BKE_INFO)) {
        return true
      }

      return confirm(
        t(
          "BKE_BUYER_MST_CHANGE_CLEAR_DETAILS",
          "Đổi MST người mua sẽ xóa toàn bộ chi tiết bảng kê đã chọn. Bạn có muốn tiếp tục?",
        ),
        t("MSG_CONFIRM", "Confirm"),
      )
    },
    [t],
  )

  const handleFieldDataChanged = useCallback(
    (event: { dataField?: string; value?: unknown }) => {
      const field = event.dataField
      if (!field) {
        return
      }

      if (manualTotalFields.has(field)) {
        if (field === "TTCKTMAI" || field === "TTCKTMAI_VND") {
          if (hasActiveDetailCommercialDiscount(formDataRef.current.DETAILS)) {
            notify(
              t(
                EINV_KEY.COMMERCIAL_DISCOUNT_DETAIL_BLOCKS_HEADER,
                "Khong the nhap chiết khấu thương mại o tong khi co dong hang TCHAT = 3.",
              ),
              "warning",
              3500,
            )
            return
          }

          const nextValue = normalizeManualTotalValue(field, event.value, formDataRef.current, decimalResolver)
          const nextOverrides: Partial<Record<string, unknown>> = {
            ...manualTotalOverridesRef.current,
            [field]: nextValue,
          }
          let nextNote = String(formDataRef.current.CKTMAI_GCHU ?? "").trim()
          if (field === "TTCKTMAI" && typeof nextValue === "number") {
            if (nextValue > 0 && !nextNote) {
              nextNote = COMMERCIAL_DISCOUNT_LINE_NAME
              nextOverrides.CKTMAI_GCHU = nextNote
            } else if (nextValue <= 0) {
              nextOverrides.CKTMAI_GCHU = ""
            }
          }

          manualTotalOverridesRef.current = nextOverrides
          updateInvoice((current) => ({
            ...current,
            [field]: nextValue,
            ...(field === "TTCKTMAI" && nextOverrides.CKTMAI_GCHU !== undefined
              ? { CKTMAI_GCHU: String(nextOverrides.CKTMAI_GCHU) }
              : {}),
          }))
          return
        }

        if (field === "CKTMAI_GCHU") {
          if (hasActiveDetailCommercialDiscount(formDataRef.current.DETAILS)) {
            notify(
              t(
                EINV_KEY.COMMERCIAL_DISCOUNT_DETAIL_BLOCKS_HEADER,
                "Khong the nhap chiết khấu thương mại o tong khi co dong hang TCHAT = 3.",
              ),
              "warning",
              3500,
            )
            return
          }

          const nextValue = String(event.value ?? "").trim().slice(0, 1000)
          manualTotalOverridesRef.current = {
            ...manualTotalOverridesRef.current,
            CKTMAI_GCHU: nextValue,
          }
          updateInvoice((current) => ({
            ...current,
            CKTMAI_GCHU: nextValue,
          }))
          return
        }

        setFormData((current) => {
          const nextValue = normalizeManualTotalValue(field, event.value, current, decimalResolver)
          const next = {
            ...current,
            [field]: nextValue,
          } as EInvoiceFormData

          manualTotalOverridesRef.current = {
            ...manualTotalOverridesRef.current,
            [field]: nextValue,
          }
          formDataRef.current = next
          return next
        })
        return
      }

      if (field === "TEMPLATE_XSL_ID") {
        const xslId = Number(event.value ?? 0)
        const seller = findEInvoiceSellerByXslId(sellerOptions, xslId)
        updateInvoice((current) => {
          const next = applySellerToEInvoice({ ...current, TEMPLATE_XSL_ID: xslId }, seller)
          if (!isEInvoiceSalesForm(seller?.KHMSHDON)) {
            setNq204ReductionActive(false)
            delete manualTotalOverridesRef.current.TGTKHAC
            next.EXTRA_JSON = setEInvoiceNq204Extra(next.EXTRA_JSON, false) ?? ""
            next.TGTKHAC = 0
          }
          if (isEInvoiceWithoutTaxRate(seller?.KHMSHDON)) {
            const clearedDetails = next.DETAILS.map((detail) =>
              Number(detail.ISDEL ?? 0) === 1 ? detail : { ...detail, TSUAT: "" },
            )
            const warehouseFields = isEInvoiceWarehouseForm(seller?.KHMSHDON)
              ? {
                  ...createDefaultWarehouseFields(),
                  ...next,
                  NBAN_DCHI: String(seller?.SELLER_ADDRESS ?? "").trim() || next.NBAN_DCHI,
                }
              : next

            return recalculateInvoiceTotals(
              {
                ...warehouseFields,
                DETAILS: clearedDetails,
                BUYER_CUSTOMER_ID: current.BUYER_CUSTOMER_ID,
              },
              decimalResolver,
              getUserCalcSettings(),
              getNq204RecalcOptions(),
            )
          }

          if (isEInvoiceSellerUseMultiTaxRate(seller)) {
            return {
              ...next,
              BUYER_CUSTOMER_ID: current.BUYER_CUSTOMER_ID,
            }
          }

          const taxRate =
            resolveHeaderTaxRateFromDetails(current.DETAILS, userSettingDefaultsRef.current.defaultVatRate) ||
            userSettingDefaultsRef.current.defaultVatRate
          return {
            ...applyHeaderTaxRateToInvoiceDetails(next, taxRate, decimalResolver, getUserCalcSettings()),
            BUYER_CUSTOMER_ID: current.BUYER_CUSTOMER_ID,
          }
        })
        return
      }

      if (field === "DVTTE") {
        const currencyCode = normalizeCurrencyCode(event.value) || DEFAULT_CURRENCY_CODE
        const nextRate = isForeignCurrencyCode(currencyCode)
          ? decimalResolver.round("HEADER", "TGIA", Number(formDataRef.current.TGIA ?? 1), currencyCode)
          : 1
        updateInvoice((current) => {
          return {
            ...current,
            DVTTE: currencyCode,
            TGIA: nextRate,
            DETAILS: current.DETAILS.map((detail) => normalizeEInvoiceDetailRow(detail, nextRate, currencyCode, decimalResolver, getUserCalcSettings())),
          }
        })
        if (isForeignCurrencyCode(currencyCode) && !validateEInvoiceForeignCurrencyRate(currencyCode, nextRate)) {
          notify(fieldRequiredMessage(t, "TGIA", "Rate"), "warning", 2500)
        }
        return
      }

      if (field === "TGIA") {
        const rawRate = Number(normalizeFormValue(field, event.value) ?? 0)
        if (isForeignCurrencyCode(formDataRef.current.DVTTE) && (!Number.isFinite(rawRate) || rawRate <= 0)) {
          notify(fieldRequiredMessage(t, "TGIA", "Rate"), "warning", 2500)
        }
        updateInvoice((current) => {
          const rate = isForeignCurrencyCode(current.DVTTE)
            ? decimalResolver.round("HEADER", "TGIA", rawRate, current.DVTTE)
            : 1
          return {
            ...current,
            TGIA: rate,
            DETAILS: current.DETAILS.map((detail) => normalizeEInvoiceDetailRow(detail, rate, current.DVTTE, decimalResolver, getUserCalcSettings())),
          }
        })
        return
      }

      if (field === "NMUA_MST") {
        const nextMst = String(normalizeFormValue(field, event.value) ?? "").trim()
        void (async () => {
          const current = formDataRef.current
          const allowed = await confirmBuyerMstChangeIfNeeded(current, nextMst)
          if (!allowed) {
            setFormData((prev) => ({ ...prev }))
            return
          }

          updateInvoice((invoice) => {
            const next = {
              ...invoice,
              NMUA_MST: nextMst,
            }
            if (!isEInvoiceMultiRelatedInvoice(getEInvoiceTchdon(next.RELATED)) || !next.BKE_INFO) {
              return next
            }
            const buyerChanged = !isSameEInvoiceBuyerTaxCode(invoice.NMUA_MST, nextMst)
            const syncedBke = syncEInvoiceBkeWithRelated(next.BKE_INFO, next.RELATED, next)
            return {
              ...next,
              BKE_INFO: buyerChanged ? { ...syncedBke, DETAILS: [] } : syncedBke,
            }
          })
        })()
        return
      }

      updateInvoice((current) => ({
        ...current,
        [field]: normalizeFormValue(field, event.value),
      } as EInvoice))

      if (field === "PTVChuyen" && isEInvoiceWarehouseForm(formDataRef.current.KHMSHDON) && !String(event.value ?? "").trim()) {
        notify(fieldRequiredMessage(t, "PTVChuyen", "Transport means"), "warning", 2500)
      }

      if (
        field === "LDDNBo"
        && isEInvoiceWarehouseInternal(formDataRef.current.KHMSHDON, formDataRef.current.KHHDON)
        && !String(event.value ?? "").trim()
      ) {
        notify(fieldRequiredMessage(t, "LDDNBo", "Internal dispatch order"), "warning", 2500)
      }
    },
    [confirmBuyerMstChangeIfNeeded, decimalResolver, getNq204RecalcOptions, getUserCalcSettings, sellerOptions, t, updateInvoice],
  )

  const handleBuyerCustomerChange = useCallback(
    (customer: CustomerExt | null) => {
      const customerName = customer
        ? firstLookupText(
            customer.CUSTOMER_NM_VIET,
            customer.CUSTOMER_NM_ENG,
            customer.CUSTOMER_NM_KOR,
            customer.CUSTOMER_NM_CHINA,
          )
        : ""
      const nextMst = customer ? String(customer.TAX_CD ?? "").trim() : ""

      void (async () => {
        const current = formDataRef.current
        const allowed = await confirmBuyerMstChangeIfNeeded(current, nextMst)
        if (!allowed) {
          setFormData((prev) => ({ ...prev }))
          return
        }

        updateInvoice((invoice) => {
          const buyerChanged = !isSameEInvoiceBuyerTaxCode(invoice.NMUA_MST, nextMst)
          const next = {
            ...invoice,
            BUYER_CUSTOMER_ID: customer ? Number(customer.CUSTOMER_ID ?? 0) : 0,
            NMUA_MKHANG: customer ? String(customer.CUSTOMER_CD ?? "").trim() : "",
            NMUA_TEN: customerName,
            NMUA_MST: nextMst,
            NMUA_DCHI: customer ? String(customer.ADDRESS ?? "").trim() : "",
            NMUA_SDTHOAI: customer ? String(customer.TEL ?? "").trim() : "",
            NMUA_DCTDTU: customer ? String(customer.EMAIL ?? "").trim() : "",
            NMUA_CCCDAN: customer ? String(customer.IDNUMBER ?? "").trim() : "",
            NMUA_HVTNMHANG: customer ? String(customer.BUYER_NM ?? "").trim() : "",
            NMUA_TNHANG: customer
              ? [String(customer.BANK_CD ?? "").trim(), String(customer.BANK_NM ?? "").trim()]
                  .filter((value) => value.length > 0)
                  .join(" - ")
              : "",
          }

          if (!isEInvoiceMultiRelatedInvoice(getEInvoiceTchdon(next.RELATED)) || !next.BKE_INFO) {
            return next
          }

          const syncedBke = syncEInvoiceBkeWithRelated(next.BKE_INFO, next.RELATED, next)
          return {
            ...next,
            BKE_INFO: buyerChanged ? { ...syncedBke, DETAILS: [] } : syncedBke,
          }
        })
      })()
    },
    [confirmBuyerMstChangeIfNeeded, updateInvoice],
  )

  const handleBuyerTaxLookupApply = useCallback(
    (info: TaxLookupInfo) => {
      void (async () => {
        const current = formDataRef.current
        const nextMst = info.TaxID.trim() || String(current.NMUA_MST ?? "").trim()
        const allowed = await confirmBuyerMstChangeIfNeeded(current, nextMst)
        if (!allowed) {
          setFormData((prev) => ({ ...prev }))
          return
        }

        updateInvoice((invoice) => {
          const buyerChanged = !isSameEInvoiceBuyerTaxCode(invoice.NMUA_MST, nextMst)
          const next = {
            ...invoice,
            NMUA_MST: nextMst,
            NMUA_TEN: (info.Name ?? "").trim() || invoice.NMUA_TEN,
            NMUA_DCHI: (info.Address ?? "").trim() || invoice.NMUA_DCHI,
          }

          if (!isEInvoiceMultiRelatedInvoice(getEInvoiceTchdon(next.RELATED)) || !next.BKE_INFO) {
            return next
          }

          const syncedBke = syncEInvoiceBkeWithRelated(next.BKE_INFO, next.RELATED, next)
          return {
            ...next,
            BKE_INFO: buyerChanged ? { ...syncedBke, DETAILS: [] } : syncedBke,
          }
        })
      })()
    },
    [confirmBuyerMstChangeIfNeeded, updateInvoice],
  )

  const handlePaymentMethodChange = useCallback(
    (code: string) => {
      updateInvoice((current) => ({
        ...current,
        HTTTOAN: code,
      }))
    },
    [updateInvoice],
  )

  const handleHeaderTaxRateChange = useCallback(
    (taxRate: string) => {
      updateInvoice((current) =>
        applyHeaderTaxRateToInvoiceDetails(current, taxRate, decimalResolver, getUserCalcSettings()),
      )
    },
    [decimalResolver, getUserCalcSettings, updateInvoice],
  )

  const handleTchdonChange = useCallback(
    async (tchdon: number | null) => {
      const value = Number(tchdon ?? 0)
      const isMulti = isEInvoiceMultiRelatedInvoice(value)
      let autoSbke = ""
      if (isMulti) {
        try {
          autoSbke = await getNextEInvoiceBkeNo(new Date().getFullYear())
        } catch {
          autoSbke = ""
        }
      }
      const autoNbke = formatEInvoiceBkeDateToday()

      updateInvoice((current) => {
        const calcSettings = resolveEInvoiceCalcSettings(userSettingDefaultsRef.current, value)
        const rate = Number(current.TGIA ?? 1)
        const currencyCode = current.DVTTE
        const normalizedDetails = current.DETAILS.map((detail) =>
          normalizeEInvoiceDetailRow(detail, rate, currencyCode, decimalResolver, calcSettings),
        )

        if (!requiresEInvoiceRelatedInvoice(value)) {
          return recalculateInvoiceTotals(
            {
              ...current,
              TCHDON: value,
              RELATED: null,
              BKE_INFO: null,
              SOURCE_INVOICE_ID: null,
              DETAILS: normalizedDetails,
            },
            decimalResolver,
            calcSettings,
            getNq204RecalcOptions(),
          )
        }

        const related = current.RELATED ?? createDefaultEInvoiceRelated(current.INVOICE_ID, current.COMPANY_CD)
        const sbke = String(related.SBKCLQUAN ?? current.BKE_INFO?.SBKE ?? "").trim() || autoSbke
        const nbke = String(related.NBKCLQUAN ?? current.BKE_INFO?.NBKE ?? "").trim() || autoNbke
        const nextRelated = {
          ...related,
          TCHDON: value,
          ...(isMulti
            ? {
                SBKCLQUAN: sbke,
                NBKCLQUAN: nbke,
              }
            : {}),
        }
        const nextBke = isMulti
          ? syncEInvoiceBkeWithRelated(
              {
                ...(current.BKE_INFO ?? createDefaultEInvoiceBke(current.INVOICE_ID, current.COMPANY_CD, value)),
                SBKE: sbke,
                NBKE: nbke,
                TCHDON: value === 3 ? 1 : 2,
              },
              nextRelated,
              {
                ...current,
                RELATED: nextRelated,
              },
            )
          : null

        return recalculateInvoiceTotals(
          {
            ...current,
            TCHDON: value,
            SOURCE_INVOICE_ID: null,
            RELATED: nextRelated,
            BKE_INFO: nextBke,
            DETAILS: normalizedDetails,
          },
          decimalResolver,
          calcSettings,
          getNq204RecalcOptions(),
        )
      })
    },
    [decimalResolver, getNq204RecalcOptions, updateInvoice],
  )

  const handleRelatedInvoiceChange = useCallback(
    (related: EInvoiceRelatedInfo | null, options?: { sourceInvoiceId?: number | null }) => {
      const isExternal = Number(related?.IS_EXTERNAL ?? 0) === 1
      updateInvoice((current) => {
        const nextRelated = related
        let nextBke = current.BKE_INFO
        if (!isEInvoiceMultiRelatedInvoice(nextRelated?.TCHDON)) {
          nextBke = null
        } else if (nextBke) {
          nextBke = {
            ...nextBke,
            SBKE: String(nextRelated?.SBKCLQUAN ?? nextBke.SBKE ?? "").trim(),
            NBKE: String(nextRelated?.NBKCLQUAN ?? nextBke.NBKE ?? "").trim() || null,
          }
        }

        return {
          ...current,
          RELATED: nextRelated,
          BKE_INFO: nextBke,
          TCHDON: getEInvoiceTchdon(nextRelated),
          SOURCE_INVOICE_ID: options?.sourceInvoiceId !== undefined
            ? (options.sourceInvoiceId ?? null)
            : isExternal
              ? null
              : current.SOURCE_INVOICE_ID,
        }
      })
    },
    [updateInvoice],
  )

  const handleOpenBke = useCallback(async () => {
    const current = formDataRef.current
    if (!String(current.NMUA_MST ?? "").trim()) {
      notify(
        t(
          "BKE_REQUIRES_BUYER_MST",
          "Vui lòng chọn người mua (MST) trước khi mở bảng kê chi tiết",
        ),
        "warning",
        4000,
      )
      return
    }

    if (!isEInvoiceMultiRelatedInvoice(resolveEInvoiceFormTchdon(current))) {
      notify(fieldRequiredMessage(t, "EINV_TCHDON", "Tính chất hóa đơn"), "warning", 3000)
      return
    }

    // Ưu tiên số BK đã lưu; chỉ cấp mới khi thật sự trống (tránh nhảy BK-0001 → BK-0002).
    const existingSbke = String(current.RELATED?.SBKCLQUAN ?? current.BKE_INFO?.SBKE ?? "").trim()
    const existingNbke = String(current.RELATED?.NBKCLQUAN ?? current.BKE_INFO?.NBKE ?? "").trim()
    const needsNumber = !existingSbke

    let assignedSbke = ""
    let assignedNbke = ""
    if (needsNumber) {
      try {
        assignedSbke = await getNextEInvoiceBkeNo(new Date().getFullYear())
        assignedNbke = formatEInvoiceBkeDateToday()
      } catch {
        // Server will assign on save if still empty.
      }
    }

    updateInvoice((invoice) => {
      if (!isEInvoiceMultiRelatedInvoice(resolveEInvoiceFormTchdon(invoice))) {
        return invoice
      }

      const related = invoice.RELATED ?? createDefaultEInvoiceRelated(invoice.INVOICE_ID, invoice.COMPANY_CD)
      const nextRelated = {
        ...related,
        TCHDON: related.TCHDON || invoice.TCHDON,
        SBKCLQUAN: String(related.SBKCLQUAN ?? invoice.BKE_INFO?.SBKE ?? "").trim() || assignedSbke,
        NBKCLQUAN:
          String(related.NBKCLQUAN ?? invoice.BKE_INFO?.NBKE ?? "").trim()
          || existingNbke
          || assignedNbke
          || formatEInvoiceBkeDateToday(),
      }
      const bke = syncEInvoiceBkeWithRelated(
        {
          ...(invoice.BKE_INFO ?? createDefaultEInvoiceBke(invoice.INVOICE_ID, invoice.COMPANY_CD, nextRelated.TCHDON)),
          SBKE: String(invoice.BKE_INFO?.SBKE ?? nextRelated.SBKCLQUAN ?? "").trim() || assignedSbke,
          NBKE:
            String(invoice.BKE_INFO?.NBKE ?? nextRelated.NBKCLQUAN ?? "").trim()
            || assignedNbke
            || formatEInvoiceBkeDateToday(),
        },
        nextRelated,
        invoice,
      )
      return {
        ...invoice,
        RELATED: nextRelated,
        BKE_INFO: bke,
      }
    })
    setBkeEditorVisible(true)
  }, [t, updateInvoice])

  const handleBkeSave = useCallback(
    (bke: EInvoiceBkeInfo) => {
      updateInvoice((current) => {
        const related = current.RELATED ?? createDefaultEInvoiceRelated(current.INVOICE_ID, current.COMPANY_CD)
        const nextRelated = {
          ...related,
          TCHDON: related.TCHDON || current.TCHDON,
          SBKCLQUAN: bke.SBKE,
          NBKCLQUAN: bke.NBKE,
        }
        const syncedBke = syncEInvoiceBkeWithRelated(bke, nextRelated, current)
        return {
          ...current,
          BKE_INFO: syncedBke,
          RELATED: nextRelated,
        }
      })
      setBkeEditorVisible(false)
    },
    [updateInvoice],
  )

  const renderProductEditor = useCallback(
    (cellInfo: EInvoiceDetailCellInfo, autoOpen?: LookupOpenMode | null) => (
      <ProductLookupCellEditor
        value={cellInfo.data?.MHHDVU ?? ""}
        rowData={(cellInfo.data ?? {}) as Record<string, unknown>}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(productCd) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "MHHDVU", productCd)
        }}
        valueMode="code"
        productIdField="PRODUCT_ID"
        productCdField="MHHDVU"
        productNmField="THHDVU"
        unitCdField="DVTINH"
        unitNmField="DVTINH"
        placeholder={t("SelectProduct", "Select product")}
        popupTitle={t("SelectProduct", "Select product")}
        buttonHint={t("LIST_PRODUCT", "Open product list")}
        autoOpen={autoOpen}
      />
    ),
    [t],
  )

  const renderVatEditor = useCallback(
    (cellInfo: EInvoiceDetailCellInfo, autoOpen?: LookupOpenMode | null) => (
      <VatRateLookupCellEditor
        value={cellInfo.data?.TSUAT ?? ""}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(taxRate) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "TSUAT", taxRate)
        }}
        taxRateField="TSUAT"
        taxRateFieldCaption={t("TSUAT", "Tax")}
        taxRateNameCaption={t("CODE_NAME", "Name")}
        placeholder={t("VAT_RATE_SELECT", "Select tax rate")}
        popupTitle={t("VAT_RATE_SELECT", "Select tax rate")}
        buttonHint={t("VAT_RATE_LOOKUP", "Open tax rate list")}
        autoOpen={autoOpen}
      />
    ),
    [t],
  )

  const renderTchatCell = useCallback(
    (cellInfo: EInvoiceDetailDisplayCellInfo) => {
      const displayText = formatEinvTchatDisplay(cellInfo.data?.TCHAT ?? DEFAULT_TCHAT, tchatOptions, t)
      return (
        <LookupGridCellEditor
          mode="display"
          cellInfo={{
            ...cellInfo,
            text: displayText,
            displayValue: displayText,
            value: cellInfo.data?.TCHAT ?? DEFAULT_TCHAT,
          }}
          dataField="TCHAT"
        />
      )
    },
    [t, tchatOptions],
  )

  const renderTchatEditor = useCallback(
    (cellInfo: EInvoiceDetailCellInfo, autoOpen?: LookupOpenMode | null) => (
      <EinvTchatLookupCellEditor
        value={cellInfo.data?.TCHAT ?? DEFAULT_TCHAT}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(tchat) => {
          const nextTchat = tchat ?? DEFAULT_TCHAT
          const rowKey = cellInfo.data?.ROW_KEY
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "TCHAT", nextTchat)
          if (!isSpecialTchat(nextTchat)) {
            cellInfo.component.cellValue(cellInfo.row.rowIndex, "SPECIAL", null)
          }

          if (rowKey) {
            patchDetailRowTchat(rowKey, nextTchat, isSpecialTchat(nextTchat))
          }
        }}
        tchatField="TCHAT"
        tchatFieldCaption={t("TCHAT", "Line type")}
        tchatNameCaption={t("CODE_NAME", "Name")}
        placeholder={t("TCHAT_SELECT", "Select line type")}
        popupTitle={t("TCHAT_SELECT", "Select line type")}
        buttonHint={t("TCHAT_LOOKUP", "Open line type list")}
        autoOpen={autoOpen}
      />
    ),
    [patchDetailRowTchat, t],
  )

  const renderSpecialSummaryCell = useCallback(
    (cellInfo: EInvoiceDetailDisplayCellInfo) => {
      if (!isSpecialTchat(cellInfo.data?.TCHAT)) {
        return null
      }

      const rowKey = resolveEInvoiceDetailRowKey(cellInfo.row?.key, cellInfo.data)
      const summary = formatEInvoiceDetailSpecialSummary(cellInfo.data, resolveLhhdtrungLabel)
      const displayText = summary || t("SPECIAL_NOT_SET", "Chưa nhập")

      return (
        <div className="flex min-w-0 items-center gap-1">
          <button
            type="button"
            className="min-w-0 flex-1 truncate text-left text-sm text-slate-700 hover:text-blue-600 disabled:cursor-default disabled:hover:text-slate-700"
            title={displayText}
            disabled={!rowKey}
            onClick={(event) => {
              event.stopPropagation()
              if (rowKey) {
                openSpecialEditor(rowKey)
              }
            }}
          >
            {displayText}
          </button>
          {!isReadOnly && rowKey ? (
            <Button
              icon="edit"
              stylingMode="text"
              hint={t("SPECIAL_EDIT", "Nhập HHDV đặc thù")}
              onClick={(event) => {
                event.event?.stopPropagation()
                openSpecialEditor(rowKey)
              }}
            />
          ) : null}
        </div>
      )
    },
    [isReadOnly, openSpecialEditor, resolveLhhdtrungLabel, t],
  )

  const validateBeforeSave = useCallback((record: EInvoiceFormData): boolean => {
    if (!findEInvoiceSellerByXslId(sellerOptions, record.TEMPLATE_XSL_ID)) {
      notify(fieldRequiredMessage(t, "TEMPLATE", "Mẫu HĐ"), "warning", 3000)
      return false
    }

    if (!record.NLAP) {
      notify(fieldRequiredMessage(t, "NLAP", "Invoice date"), "warning", 3000)
      return false
    }

    const activeDetails = getActiveEInvoiceDetails(record.DETAILS)
    if (activeDetails.length === 0) {
      notify(fieldRequiredMessage(t, "DETAIL_LINE", "Detail line"), "warning", 3000)
      return false
    }

    const invalidLine = activeDetails.find((detail) => !String(detail.THHDVU ?? "").trim())
    if (invalidLine) {
      notify(fieldRequiredMessage(t, "THHDVU", "Item name"), "warning", 3000)
      return false
    }

    const missingSpecial = activeDetails.find(
      (detail) => isSpecialTchat(detail.TCHAT) && !hasEInvoiceDetailSpecialData(detail.SPECIAL),
    )
    if (missingSpecial) {
      notify(fieldRequiredMessage(t, "SPECIAL_SUMMARY", "HHDV đặc thù"), "warning", 4000)
      return false
    }

    const tchdon = getEInvoiceTchdon(record.RELATED)
    if (requiresEInvoiceRelatedInvoice(tchdon)) {
      const related = record.RELATED
      const isMulti = tchdon === 3 || tchdon === 4
      if (isMulti) {
        if (!related || !String(related.SBKCLQUAN ?? "").trim() || !String(related.NBKCLQUAN ?? "").trim()) {
          notify(fieldRequiredMessage(t, "RELATED_BANG_KE", "Số/Ngày bảng kê ĐC/TT nhiều HĐ"), "warning", 4000)
          return false
        }
        if (!hasEInvoiceBkeData(record.BKE_INFO)) {
          notify(fieldRequiredMessage(t, "BKE_DETAIL", "Chi tiết bảng kê 01/BK-ĐCTT"), "warning", 4000)
          return false
        }
        const reasons = (record.BKE_INFO?.REASONS ?? []).filter((reason) => reason.ISDEL !== 1 && String(reason.LDO ?? "").trim())
        const details = (record.BKE_INFO?.DETAILS ?? []).filter((detail) => detail.ISDEL !== 1)
        if (reasons.length === 0) {
          notify(fieldRequiredMessage(t, "BKE_LDO", "Lý do bảng kê"), "warning", 4000)
          return false
        }
        if (details.length === 0) {
          notify(fieldRequiredMessage(t, "BKE_DETAIL", "Chi tiết bảng kê"), "warning", 4000)
          return false
        }
        const missingSignedRef = details.find((detail) => !(Number(detail.REF_INVOICE_ID ?? 0) > 0))
        if (missingSignedRef) {
          notify(
            t("BKE_DETAIL_MUST_SELECT_SIGNED", "Chi tiết bảng kê phải chọn từ hóa đơn đã ký trong hệ thống"),
            "warning",
            4500,
          )
          return false
        }
      } else if (
        !related
        || !String(related.KHMSHDCLQUAN ?? "").trim()
        || !String(related.KHHDCLQUAN ?? "").trim()
        || !String(related.SHDCLQUAN ?? "").trim()
        || !String(related.NLHDCLQUAN ?? "").trim()
      ) {
        notify(fieldRequiredMessage(t, "RELATED_INVOICE", "Related invoice"), "warning", 4000)
        return false
      }
    }

    const buyerEmail = String(record.NMUA_DCTDTU ?? "").trim()
    if (buyerEmail && !isValidBuyerEmailList(buyerEmail)) {
      notify(t("INVALID_EMAIL", "Email is invalid"), "warning", 3000)
      return false
    }

    if (!validateEInvoiceForeignCurrencyRate(record.DVTTE, Number(record.TGIA ?? 0))) {
      notify(fieldRequiredMessage(t, "TGIA", "Rate"), "warning", 3000)
      return false
    }

    const warehouseValidation = validateEInvoiceWarehouseFieldsBeforeSave(record, record.KHMSHDON, record.KHHDON)
    if (warehouseValidation) {
      notify(fieldRequiredMessage(t, warehouseValidation.fieldKey, warehouseValidation.fieldFallback), "warning", 3000)
      return false
    }

    return true
  }, [sellerOptions, t])

  const resetForNewInvoice = useCallback(async () => {
    await commitDetailGridCell(detailGridRef.current)
    detailGridRef.current?.cancelEditData()
    currentDetailRowKeyRef.current = null

    const freshData = recalculateInvoiceTotals(
      createInvoiceFormData(companyCd, findEInvoiceSeller(sellerOptions), userSettingDefaultsRef.current),
      decimalResolver,
      getUserCalcSettings(),
      getNq204RecalcOptions(),
    )
    manualTotalOverridesRef.current = {}
    formDataRef.current = freshData
    setCurrentInvoiceId(0)
    setFormData(freshData)
    setEditorSessionKey((current) => current + 1)
  }, [companyCd, decimalResolver, getNq204RecalcOptions, getUserCalcSettings, sellerOptions])

  const handlePosProductSelect = useCallback(async (product: Product) => {
    if (isReadOnly || isBusy) return
    await commitDetailGridCell(detailGridRef.current)
    const current = syncDetailRows()
    const defaults = { ...userSettingDefaultsRef.current, defaultVatRate: withoutTaxRate ? "" : (headerTaxRate || userSettingDefaultsRef.current.defaultVatRate) }
    const row = applyDefaultVatRateToDetail({
      ...createNextEInvoiceDetail(current.DETAILS, Number(current.INVOICE_ID ?? 0), companyCd),
      MHHDVU: product.PRODUCT_CD, THHDVU: product.PRODUCT_NM_VIET || product.PRODUCT_CD,
      DVTINH: product.UNIT_NM || product.UNIT_CD || "", SLUONG: 1, TCHAT: 1,
    }, defaults, Number(current.TGIA ?? 1), current.DVTTE ?? "VND")
    const blank = current.DETAILS.find(d => !d.ISDEL && !d.THHDVU?.trim() && !d.MHHDVU?.trim() && !Number(d.THTIEN))
    const rows = blank ? current.DETAILS.map(d => d.ROW_KEY === blank.ROW_KEY ? { ...row, ROW_KEY: d.ROW_KEY, DETAIL_ID: d.DETAIL_ID } : d) : [...current.DETAILS, row]
    emitDetailRowsChange(renumberEInvoiceDetails(rows, Number(current.TGIA ?? 1), current.DVTTE ?? "VND", decimalResolver, getUserCalcSettings()))
  }, [companyCd, decimalResolver, emitDetailRowsChange, getUserCalcSettings, headerTaxRate, isBusy, isReadOnly, syncDetailRows, withoutTaxRate])

  const handleSave = useCallback(
    async (createNext = false): Promise<boolean> => {
      if (isReadOnly) {
        notify(t("SIGNED_READONLY", "Signed e-invoice cannot be edited"), "warning", 3000)
        return false
      }

      await flushActiveEditorValue()
      await commitDetailGridCell(detailGridRef.current)

      const currentForm = syncDetailRows()
      const manualTotals = clearAutoCalculatedHeaderTotalOverrides(manualTotalOverridesRef.current, currentForm.DETAILS)
      manualTotalOverridesRef.current = manualTotals
      const selectedSeller =
        findEInvoiceSellerByXslId(sellerOptions, currentForm.TEMPLATE_XSL_ID) ??
        findEInvoiceSellerById(sellerOptions, currentForm.SELLER_ID) ??
        findEInvoiceSeller(sellerOptions, currentForm.KHHDON, currentForm.KHMSHDON)
      if (!selectedSeller) {
        notify(fieldRequiredMessage(t, "TEMPLATE", "Mẫu HĐ"), "warning", 3000)
        return false
      }

      if (cashRegister !== undefined && isCashRegisterSeries(selectedSeller.KHHDON) !== cashRegister) {
        notify("Mẫu hóa đơn không thuộc loại hóa đơn của màn hình này", "error", 3000)
        return false
      }
      const prepared = applyManualTotalValues(
        recalculateInvoiceTotals(applySellerToEInvoice({
          ...currentForm,
          ...(cashRegister ? { PBAN: "2.1.1" } : {}),
          DETAILS: renumberEInvoiceDetails(
            currentForm.DETAILS,
            Number(currentForm.TGIA ?? 1),
            currentForm.DVTTE,
            decimalResolver,
            getUserCalcSettings(),
          ),
        }, selectedSeller), decimalResolver, getUserCalcSettings(), getNq204RecalcOptions()),
        manualTotals,
      )

      if (!validateBeforeSave(prepared)) {
        return false
      }

      setSaving(true)
      try {
        const payload = mapEInvoiceToApiPayload(prepared)
        const result = isUpdate ? await updateEInvoice(payload) : await createEInvoice(payload)
        const normalized = recalculateInvoiceTotals(
          normalizeEInvoice(result.data, companyCd),
          decimalResolver,
          getUserCalcSettings(),
          getNq204RecalcOptions(),
        )
        notify(t(isUpdate ? "MSG_EDIT_SUCCESS" : "CREATE_SUCCESS", "Saved successfully"), "success", 3000)

        saveEInvoiceDetailCache(result.data)
        if (normalized.INVOICE_ID > 0) {
          await queryClient.setQueryData(
            queryKeys.transaction.einvoiceDetail(companyCd, normalized.INVOICE_ID),
            result.data,
          )
        }
        await Promise.resolve(onSaved?.(normalized, createNext))

        if (createNext) {
          await resetForNewInvoice()
        }

        return true
      } catch (error) {
        const message = getApiErrorMessage(error, t("SAVE_FAILED", "Lưu thất bại"))
        if (isUpdate && isEInvoiceVersionConflictError(message)) {
          clearEInvoiceDetailCache(invoiceId, companyCd)
          hydratedSessionRef.current = null
          await refetchInvoice()
          notify(t("DOC_VERSION_CONFLICT", "Invoice was updated by another user. Data has been refreshed."), "warning", 5000)
          return false
        }

        notify(message, "error", 4000)
        return false
      } finally {
        setSaving(false)
      }
    },
    [cashRegister, companyCd, decimalResolver, getNq204RecalcOptions, getUserCalcSettings, invoiceId, isReadOnly, isUpdate, onSaved, queryClient, refetchInvoice, resetForNewInvoice, sellerOptions, syncDetailRows, t, validateBeforeSave],
  )

  const handleClosePopup = useCallback(() => {
    if (isBusy) {
      return
    }

    onClose()
  }, [isBusy, onClose])

  const handlePopupHiding = useCallback(
    (event: HidingEvent) => {
      const lookupPopupOpen = lookupPopupHost?.isLookupPopupOpen ?? false

      if (isBusy || lookupPopupOpen || specialEditorRowKey || bkeEditorVisible) {
        event.cancel = true
        return
      }

      onClose()
    },
    [bkeEditorVisible, isBusy, lookupPopupHost?.isLookupPopupOpen, onClose, specialEditorRowKey],
  )

  useEffect(() => {
    if (!visible) {
      setSpecialEditorRowKey(null)
      setBkeEditorVisible(false)
    }
  }, [visible])

  const { handleSaveAndClose } = useEInvoiceEditorSave({
    handleSave,
    handleClosePopup,
  })

  const handleDeleteDetailRow = useCallback(() => {
    void softDeleteDetailRowByKey(getCurrentDetailRowKey())
  }, [getCurrentDetailRowKey, softDeleteDetailRowByKey])

  const handleQuickItemSearch = useCallback(async () => {
    const grid = detailGridRef.current
    if (!grid) {
      return
    }

    const selectedKeys = grid.getSelectedRowKeys() as GridKey[]
    const focusedRowKey = grid.option("focusedRowKey") as GridKey | undefined
    let key = selectedKeys[0] ?? focusedRowKey
    let rowIndex = key !== undefined && key !== null ? grid.getRowIndexByKey(key) : -1

    if (rowIndex < 0) {
      const newRowKey = await handleAddDetailRow()
      if (!newRowKey) {
        return
      }

      await new Promise<void>((resolve) => {
        requestAnimationFrame(() => resolve())
      })
      key = newRowKey
      rowIndex = grid.getRowIndexByKey(newRowKey)
    }

    if (rowIndex < 0 || key === undefined || key === null) {
      return
    }

    queueLookupCellOpen(grid as unknown as object, key, rowIndex, "MHHDVU", "popup")
    grid.editCell(rowIndex, "MHHDVU")
  }, [handleAddDetailRow])

  const handlePrint = useCallback(() => {
    const resolvedInvoiceId = Number(formData.INVOICE_ID ?? invoiceId ?? 0)
    if (!Number.isFinite(resolvedInvoiceId) || resolvedInvoiceId <= 0) {
      notify(t("SAVE_BEFORE_PRINT", "Save the record before printing"), "warning", 2500)
      return
    }

    setPrintOptionsVisible(true)
  }, [formData.INVOICE_ID, invoiceId, t])

  const shortcutBindings = useMemo(
    () =>
      createShortcutBindings(
        shortcutActions,
        {
          [SHORTCUT_ACTIONS.SAVE]: () => {
            void handleSaveAndClose()
          },
          [SHORTCUT_ACTIONS.SAVE_AND_NEW]: () => {
            void handleSave(true)
          },
          [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: () => {
            void handleSaveAndClose()
          },
          [SHORTCUT_ACTIONS.PRINT]: () => {
            handlePrint()
          },
          [SHORTCUT_ACTIONS.CLOSE]: () => {
            if (shortcutHelpVisible) {
              closeShortcutHelp()
              return
            }
            handleClosePopup()
          },
          [SHORTCUT_ACTIONS.ADD_ROW]: () => handleAddDetailRow(),
          [SHORTCUT_ACTIONS.DELETE_ROW]: () => handleDeleteDetailRow(),
          [SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH]: () => {
            void handleQuickItemSearch()
          },
          [SHORTCUT_ACTIONS.HELP]: () => {
            if (shortcutHelpVisible) {
              closeShortcutHelp()
              return
            }
            openShortcutHelp()
          },
        },
        {
          [SHORTCUT_ACTIONS.SAVE]: { enabled: canSave, allowInInput: true },
          [SHORTCUT_ACTIONS.SAVE_AND_NEW]: { enabled: canSave, allowInInput: true },
          [SHORTCUT_ACTIONS.SAVE_AND_CLOSE]: { enabled: canSave, allowInInput: true },
          [SHORTCUT_ACTIONS.PRINT]: { enabled: !isBusy, allowInInput: true },
          [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
          [SHORTCUT_ACTIONS.ADD_ROW]: { enabled: canSave },
          [SHORTCUT_ACTIONS.DELETE_ROW]: { enabled: canSave },
          [SHORTCUT_ACTIONS.QUICK_ITEM_SEARCH]: { enabled: true, allowInInput: true },
          [SHORTCUT_ACTIONS.HELP]: { allowInInput: true },
        },
      ),
    [
      canSave,
      closeShortcutHelp,
      handleAddDetailRow,
      handleClosePopup,
      handleDeleteDetailRow,
      handlePrint,
      handleQuickItemSearch,
      handleSave,
      handleSaveAndClose,
      isBusy,
      openShortcutHelp,
      shortcutActions,
      shortcutHelpVisible,
    ],
  )

  const shouldHandleShortcutEvent = useCallback(
    () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
    [popupShortcutScopeId],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: visible && !detailImportVisible && !printOptionsVisible,
    shouldHandleEvent: shouldHandleShortcutEvent,
  })

  const { handleReset } = useEInvoiceEditorForm({
    isReadOnly,
    isUpdate,
    refetchInvoice,
    refetchSellers,
  })

  const { openDetailImport, closeDetailImport } = useEInvoiceDetailGrid({
    isReadOnly,
    isBusy,
    setDetailImportVisible,
  })

  const { handleImportDetailFile } = useEInvoiceDetailExcelImport({
    isReadOnly,
    companyCd,
    decimalResolver,
    getUserCalcSettings,
    syncDetailRows,
    emitDetailRowsChange,
    detailGridRef,
    currentDetailRowKeyRef,
    commitDetailGridCell,
    t,
    lang,
    setDetailImportLoading,
  })

  const closePrintOptionsPopup = useCallback(() => {
    if (isBusy) {
      return
    }

    setPrintOptionsVisible(false)
  }, [isBusy])

  const handleConfirmPrintOptions = useCallback(
    ({ format, printRequest }: EInvoicePrintConfirmPayload) => {
      const resolvedInvoiceId = Number(formData.INVOICE_ID ?? invoiceId ?? 0)
      if (!Number.isFinite(resolvedInvoiceId) || resolvedInvoiceId <= 0) {
        setPrintOptionsVisible(false)
        return
      }

      setPrintOptionsVisible(false)

      if (format === "xml") {
        void downloadEInvoicesBatch({
          items: [{
            invoiceId: resolvedInvoiceId,
            printRequest: buildPrintRequestFromInvoice(formData, printRequest),
          }],
          format,
          notifyUnableToOpen: (message) => notify(message, "error", 4000),
          notifyInfo: (message) => notify(message, "info", 8000),
          notifySuccess: (message) => notify(message, "success", 4000),
        })
        return
      }

      void openEInvoiceReportViewer({
        invoiceIds: [resolvedInvoiceId],
        companyCd,
        printRequest: buildPrintRequestFromInvoice(formData, printRequest),
        notifyUnableToOpen: (message) => notify(message, "error", 4000),
        notifyInfo: (message) => notify(message, "info", 8000),
        notifySuccess: (message) => notify(message, "success", 4000),
      })
    },
    [companyCd, formData, invoiceId],
  )

  const headerStamp = getHeaderFormStamp(formData)
  if (headerStampRef.current !== headerStamp) {
    headerStampRef.current = headerStamp
    headerFormDataRef.current = formData
  }
  const headerFormData = headerFormDataRef.current

  return (
    <>
    <Popup
      visible={visible}
      showTitle={false}
      showCloseButton={false}
      dragEnabled={false}
      resizeEnabled={false}
      hideOnOutsideClick={false}
      width="100vw"
      height="100vh"
      maxWidth="100vw"
      maxHeight="100vh"
      container="body"
      position={{ my: "center", at: "center", of: window }}
      wrapperAttr={{
        ...createPopupShortcutWrapperAttr(popupShortcutScopeId),
        class: cashRegister ? "einvoice-editor-popup einvoice-pos-popup" : "einvoice-editor-popup",
      }}
      animation={{ show: { type: "fade", duration: 0 }, hide: { type: "fade", duration: 0 } }}
      onHiding={handlePopupHiding}
    >
      <div className="einvoice-editor">
        <header className="einvoice-editor__header">
          <div className="einvoice-editor__header-main">
            <h1 className="einvoice-editor__title">{cashRegister ? `POS · ${popupTitle}` : popupTitle}</h1>
            <div className="einvoice-editor__subtitle">{popupSubtitle}</div>
          </div>
          <div className="einvoice-editor__header-actions">
            <Button
              icon="refresh"
              stylingMode="text"
              disabled={isBusy || isReadOnly}
              hint={t("RESET", "Reset")}
              onClick={handleReset}
            />
            <Button
              icon="close"
              stylingMode="text"
              disabled={isBusy}
              hint={t("CANCEL", "Cancel")}
              onClick={handleClosePopup}
            />
          </div>
        </header>

        <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
          <LoadPanel
            visible={isBusy}
            showIndicator={true}
            showPane={true}
            shading={true}
            shadingColor="rgba(15, 23, 42, 0.2)"
          />
          <ShortcutHelpPopup
            visible={shortcutHelpVisible}
            shortcuts={shortcutHelpItems}
            onClose={closeShortcutHelp}
          />
          {detailImportVisible ? (
            <EInvoiceDetailExcelImportPopup
              visible={detailImportVisible}
              khmsHDON={formData.KHMSHDON}
              title={t("DETAIL_IMPORT", "Import chi tiết")}
              description={t(
                "DETAIL_IMPORT_DESC",
                "Import các dòng hàng hóa, dịch vụ từ file Excel.",
              )}
              onClose={closeDetailImport}
              onImportFile={handleImportDetailFile}
            />
          ) : null}

          {specialEditorRowKey ? (
            <EInvoiceDetailSpecialPopup
              visible={Boolean(specialEditorRowKey)}
              invoiceId={Number(specialEditorDetail?.INVOICE_ID ?? currentInvoiceId)}
              detailId={Number(specialEditorDetail?.DETAIL_ID ?? 0)}
              companyCd={companyCd}
              lineLabel={[
                specialEditorDetail?.STT ? `${t("STT", "No")} ${specialEditorDetail.STT}` : "",
                specialEditorDetail?.THHDVU,
              ].filter((value) => String(value ?? "").trim().length > 0).join(" · ")}
              special={specialEditorDetail?.SPECIAL}
              lhhdtrungOptions={lhhdtrungDisplayOptions}
              readOnly={isReadOnly}
              onClose={closeSpecialEditor}
              onSave={handleSpecialEditorSave}
            />
          ) : null}

          {bkeEditorVisible ? (
            <EInvoiceBkePopup
              visible={bkeEditorVisible}
              invoice={formData}
              readOnly={isReadOnly}
              onClose={() => setBkeEditorVisible(false)}
              onSave={handleBkeSave}
            />
          ) : null}

          <div ref={editorScrollContainerRef} className="einvoice-editor__body">
            <div key={editorSessionKey} className="einvoice-editor__stack">
          <InvoiceHeaderContainer
            cashRegister={cashRegister}
            ariaLabel={t("POS_INVOICE_BUYER_INFO", "Thông tin hóa đơn và người mua")}
          >
          <EInvoiceHeaderSection
            vm={{
              t,
              cashRegister,
              tchdonOptions,
              relatedTchdon,
              tchdonValueExpr,
              tchdonDisplayExpr,
              isReadOnly,
              handleTchdonChange,
              requiresRelatedInvoice,
              formData: headerFormData,
              companyCd,
              currentInvoiceId,
              handleRelatedInvoiceChange,
              handleOpenBke,
              bkeSummary,
              handleFieldDataChanged,
              isWarehouseForm,
              handleBuyerCustomerChange,
              handleBuyerTaxLookupApply,
              isWarehouseConsignment,
              isWarehouseInternal,
              sellerOptions,
              canEditInvoiceDate,
              isForeignCurrency,
              getHeaderNumberFormat,
              handlePaymentMethodChange,
            }}
          />
          </InvoiceHeaderContainer>
          {cashRegister && <EInvoicePosProducts disabled={isReadOnly || isBusy} onSelect={handlePosProductSelect} />}
          <div className={cashRegister ? "einvoice-pos-cart" : "einvoice-standard-section"}>
          <EInvoiceDetailGridSection
            vm={{
              t,
              isReadOnly,
              isWarehouseInternal,
              cashRegister,
              pxkSyncThucXuatNhap,
              handlePxkSyncThucXuatNhapToggle,
              handleAddDetailRow,
              userEditorSettings,
              openDetailImport,
              softDeletedCount,
              undeleteLastDetailRow,
              detailGridContainerRef,
              visibleDetails,
              detailGridRef,
              handleDetailSaved,
              handleDetailCellClick,
              handleDetailFocusedCellChanged,
              handleDetailKeyDown,
              handleDetailCellPrepared,
              handleDetailEditorPreparing,
              handleDetailToolbarPreparing,
              softDeleteDetailRowByKey,
              renderTchatCell,
              renderTchatEditor,
              detailTchatSetCellValue,
              hasSpecialDetailColumn,
              renderSpecialSummaryCell,
              renderProductEditor,
              getDetailNumberFormat,
              getDetailNumberEditorOptions,
              moneyFallbackPrecision,
              createDetailCalcSetCellValue,
              createDetailThucNhapSetCellValue,
              createDetailAmountSetCellValue,
              withoutTaxRate,
              useMultiTaxRate,
              renderVatEditor,
              createDetailTaxSetCellValue,
              createDetailAfterTaxPriceSetCellValue,
              vndMoneyFallbackPrecision,
              isForeignCurrency,
              summaryItems,
            }}
          />
          </div>
          <div className={cashRegister ? "einvoice-pos-payment" : "einvoice-standard-section"}>
          {cashRegister && <div className="einvoice-pos-total"><span>Tổng thanh toán</span><strong>{Number(formData.TGTTTBSO ?? 0).toLocaleString("vi-VN")} {formData.DVTTE}</strong></div>}
          <EInvoiceTotalsSection
            vm={{
              t,
              formData,
              isWarehouseForm,
              isReadOnly,
              handleFieldDataChanged,
              withoutTaxRate,
              useMultiTaxRate,
              getHeaderNumberFormat,
              moneyFallbackPrecision,
              headerTaxRate,
              handleHeaderTaxRateChange,
              isSalesForm,
              nq204ReductionActive,
              handleNq204ReductionToggle,
              handleNq204ReductionAmountChange,
              isForeignCurrency,
              vndMoneyFallbackPrecision,
              isHeaderCommercialDiscountReadOnly: hasDetailCommercialDiscount,
            }}
          />
          </div>
            </div>
          </div>

          <footer className="einvoice-editor__footer">
            <div className="einvoice-editor__footer-actions">
              <Button
                text={t("PRINT", "Print")}
                icon="print"
                type="default"
                stylingMode="outlined"
                disabled={isBusy}
                onClick={handlePrint}
              />
              {!isReadOnly ? (
                <Button
                  text={saving ? t("SAVING", "Saving...") : t("SAVE", "Save")}
                  icon="save"
                  type="default"
                  stylingMode="contained"
                  disabled={isBusy}
                  onClick={() => void handleSaveAndClose()}
                />
              ) : null}
              {!isReadOnly ? (
                <Button
                  text={t("SAVE_AND_NEW", "Save and create new")}
                  icon="plus"
                  type="success"
                  stylingMode="contained"
                  disabled={isBusy}
                  onClick={() => void handleSave(true)}
                />
              ) : null}
              <Button
                text={t("CANCEL", "Cancel")}
                icon="close"
                type="danger"
                stylingMode="outlined"
                disabled={isBusy}
                onClick={handleClosePopup}
              />
            </div>
          </footer>
        </div>
      </div>
    </Popup>
    {printOptionsVisible ? (
      <EInvoicePrintOptionsPopup
        visible={printOptionsVisible}
        invoiceCount={1}
        loading={isBusy}
        onClose={closePrintOptionsPopup}
        onConfirm={handleConfirmPrintOptions}
      />
    ) : null}
    </>
  )
}
