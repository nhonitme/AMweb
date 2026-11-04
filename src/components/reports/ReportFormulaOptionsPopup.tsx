import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"

import axios from "axios"
import Button from "devextreme-react/button"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import TextBox from "devextreme-react/text-box"
import notify from "devextreme/ui/notify"
import { confirm } from "devextreme/ui/dialog"
import { getApiErrorMessage } from "@/api/apiTypes"
import {
  getCashflowFormulaOptions,
  previewCashflowFormulaOptions,
  resetCashflowFormulaOptions,
  saveCashflowFormulaOptions,
  type CashflowFormulaOptions,
  type CashflowFormulaOptionRow,
  type FormulaOptionPreviewColumn,
  type FormulaOptionPreviewParams,
} from "@/api/reportFormulaOptionApi"
import { LanguageContext } from "@/lib/i18nLoader"

import { FormulaActionBar } from "./FormulaActionBar"
import { FormulaDetailEditor } from "./FormulaDetailEditor"
import { FormulaListGrid } from "./FormulaListGrid"
import "./reportFormulaOptionsPopup.css"
import {
  EMPTY_ACCOUNT_PREFIXES,
  buildDraftSignature,
  buildNewItemKey,
  cloneRows,
  getCalcMethodOptions,
  getCanonicalReportCode,
  getDataSourceOptions,
  getElementTypeOptions,
  getFlowSignOptions,
  getVatCalcMethodOptions,
  normalizeRow,
  normalizeText,
  validateDraft,
} from "./formulaOptionsShared"

type ReportFormulaOptionsPopupProps = {
  visible?: boolean
  layout?: "popup" | "page"
  /** Full-viewport modal. Used by the dedicated formula-options route. */
  fullScreen?: boolean
  reportCode: string
  reportVersion?: string | null
  /** Fully loaded template from parent; avoid a second GET and a blank first frame. */
  initialOptions?: CashflowFormulaOptions
  previewParams?: FormulaOptionPreviewParams
  onClose: () => void
  onSaved: () => void
  onOpenColumnSettings?: () => void
}
export default function ReportFormulaOptionsPopup({
  visible = true,
  layout = "popup",
  fullScreen = false,
  reportCode,
  reportVersion,
  initialOptions,
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
  const isCostList = canonicalReportCode === "COST_LIST"
  const isVatDeclaration = canonicalReportCode === "GTGT_01"
  const isAccountRuleReport = isBalanceSheet || isProfitLoss || isCostList
  const isCashflow = canonicalReportCode === "B03_DN_GT" || canonicalReportCode === "B03_DN_TT"
  const effectiveReportVersion = reportVersion?.trim() || "2025"
  const dataSourceMode = isVatDeclaration ? "vat" : isAccountRuleReport ? "accountRule" : "cashflow"
  const dataSourceOptions = useMemo(() => getDataSourceOptions(t, dataSourceMode), [t, dataSourceMode])
  const elementTypeOptions = useMemo(() => getElementTypeOptions(t), [t])
  const calcMethodOptions = useMemo(
    () => getCalcMethodOptions(t, isCostList ? "cost" : isProfitLoss ? "profit" : "balance"),
    [t, isCostList, isProfitLoss],
  )
  const vatCalcMethodOptions = useMemo(() => getVatCalcMethodOptions(t), [t])
  const flowSignOptions = useMemo(() => getFlowSignOptions(t), [t])

  // Normalize preloaded options before the initial paint so both panes are ready together.
  const preparedInitialOptions = useMemo(() => {
    if (!initialOptions) return null

    const preparedRows = cloneRows(initialOptions.ROWS ?? [], isVatDeclaration).map((row) => {
      if (isAccountRuleReport && normalizeText(row.DATA_SOURCE_TYPE).toUpperCase() === "PROCEDURE") {
        return { ...row, DATA_SOURCE_TYPE: "ACCOUNT_RULE" }
      }
      return row
    })
    const prefixes = normalizeText(initialOptions.CASH_ACCOUNT_PREFIXES) || EMPTY_ACCOUNT_PREFIXES
    return {
      rows: preparedRows,
      prefixes,
      companyCd: normalizeText(initialOptions.COMPANY_CD),
      sourceCompanyCd: normalizeText(initialOptions.SOURCE_COMPANY_CD),
      selectedItemKey: preparedRows[0]?.ITEM_KEY ?? "",
    }
  }, [initialOptions, isAccountRuleReport, isVatDeclaration])

  const [rows, setRows] = useState<CashflowFormulaOptionRow[]>(() => preparedInitialOptions?.rows ?? [])
  const [cashAccountPrefixes, setCashAccountPrefixes] = useState(() => preparedInitialOptions?.prefixes ?? EMPTY_ACCOUNT_PREFIXES)
  const [sourceCompanyCd, setSourceCompanyCd] = useState(() => preparedInitialOptions?.sourceCompanyCd ?? "")
  const [companyCd, setCompanyCd] = useState(() => preparedInitialOptions?.companyCd ?? "")
  const [selectedItemKey, setSelectedItemKey] = useState(() => preparedInitialOptions?.selectedItemKey ?? "")
  const [lineFilter, setLineFilter] = useState("")
  /** Direct route still uses the skeleton; prefetched popup opens already populated. */
  const [initialLoading, setInitialLoading] = useState(() => !preparedInitialOptions)
  /** Manual reload — keep existing grid/editor visible. */
  const [reloading, setReloading] = useState(false)
  const [optionsLoaded, setOptionsLoaded] = useState(() => Boolean(preparedInitialOptions))
  const [saving, setSaving] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)
  const [previewColumns, setPreviewColumns] = useState<FormulaOptionPreviewColumn[]>([])
  const [previewValuesByItemCode, setPreviewValuesByItemCode] = useState<Record<string, Record<string, unknown>>>({})
  const initialDraftSignatureRef = useRef(preparedInitialOptions
    ? buildDraftSignature(preparedInitialOptions.rows, preparedInitialOptions.prefixes)
    : "")
  /** Only set after a successful load so failures can retry. */
  const loadedTargetRef = useRef(preparedInitialOptions ? `${canonicalReportCode}:${effectiveReportVersion}` : "")
  const loadRequestIdRef = useRef(0)
  const loadAbortRef = useRef<AbortController | null>(null)
  const optionsLoadedRef = useRef(Boolean(preparedInitialOptions))

  const selectedRow = useMemo(
    () => rows.find((row) => row.ITEM_KEY === selectedItemKey) ?? null,
    [rows, selectedItemKey],
  )
  const dataBusy = initialLoading || reloading

  const sortedRows = useMemo(
    () => [...rows].sort((left, right) => left.SORT_ORDER - right.SORT_ORDER || left.ITEM_KEY.localeCompare(right.ITEM_KEY)),
    [rows],
  )

  const draftSignature = useMemo(
    () => buildDraftSignature(rows, cashAccountPrefixes),
    [rows, cashAccountPrefixes],
  )
  const isDirty = optionsLoaded && draftSignature !== initialDraftSignatureRef.current
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

  const loadOptions = useCallback(async (mode: "initial" | "reload" = "initial") => {
    loadAbortRef.current?.abort()
    const controller = new AbortController()
    loadAbortRef.current = controller
    const requestId = ++loadRequestIdRef.current
    const target = `${canonicalReportCode}:${effectiveReportVersion}`

    if (mode === "reload" && optionsLoadedRef.current) {
      setReloading(true)
    } else {
      setInitialLoading(true)
    }

    try {
      const data = await getCashflowFormulaOptions(
        canonicalReportCode,
        effectiveReportVersion,
        controller.signal,
      )
      if (requestId !== loadRequestIdRef.current) {
        return
      }

      applyLoadedOptions(data)
      loadedTargetRef.current = target
      optionsLoadedRef.current = true
      setOptionsLoaded(true)
    } catch (error) {
      if (
        controller.signal.aborted
        || axios.isCancel(error)
        || (axios.isAxiosError(error) && error.code === "ERR_CANCELED")
      ) {
        return
      }
      if (requestId !== loadRequestIdRef.current) {
        return
      }

      // Keep loadedTargetRef empty on failure so the same report can retry.
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Không thể tải cấu hình công thức")), "error", 4000)
    } finally {
      if (requestId === loadRequestIdRef.current) {
        setInitialLoading(false)
        setReloading(false)
      }
    }
  }, [applyLoadedOptions, canonicalReportCode, effectiveReportVersion, t])

  useEffect(() => {
    if (!visible) {
      loadAbortRef.current?.abort()
      loadedTargetRef.current = ""
      optionsLoadedRef.current = false
      return
    }

    const target = `${canonicalReportCode}:${effectiveReportVersion}`
    if (loadedTargetRef.current === target && optionsLoadedRef.current) {
      return
    }

    if (loadedTargetRef.current && loadedTargetRef.current !== target) {
      // Report/version changed — drop stale UI before the next payload arrives.
      setRows([])
      setSelectedItemKey("")
      setPreviewColumns([])
      setPreviewValuesByItemCode({})
      optionsLoadedRef.current = false
      setOptionsLoaded(false)
      void loadOptions("initial")
    } else {
      void loadOptions(optionsLoadedRef.current ? "reload" : "initial")
    }

    return () => {
      loadAbortRef.current?.abort()
    }
  }, [canonicalReportCode, effectiveReportVersion, loadOptions, visible])

  const updateSelectedRow = useCallback((updater: (current: CashflowFormulaOptionRow) => CashflowFormulaOptionRow) => {
    if (!selectedItemKey) {
      return
    }

    setRows((currentRows) => {
      let changed = false
      const nextRows = currentRows.map((row, index) => {
        if (row.ITEM_KEY !== selectedItemKey) {
          return row
        }

        const next = normalizeRow(updater(row), index)
        const unchanged = next.SORT_ORDER === row.SORT_ORDER
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
        if (unchanged) {
          return row
        }

        changed = true
        return next
      })

      return changed ? nextRows : currentRows
    })
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

  const handleSelectedItemKeyChange = useCallback((nextKey: string) => {
    setSelectedItemKey((current) => (current === nextKey ? current : nextKey))
  }, [])

  // Keep list + detail in the same render cycle (no deferred editorItemKey).
  const editorRow = selectedRow

  const handleReload = useCallback(() => {
    void loadOptions("reload")
  }, [loadOptions])

  const handleResetClick = useCallback(() => {
    void handleResetToDefault()
  }, [handleResetToDefault])

  const handleSaveClick = useCallback(() => {
    void handleSave()
  }, [handleSave])

  const title = isVatDeclaration
    ? t("VAT_FORMULA_CONFIG", "Khai báo chỉ tiêu — Tờ khai thuế GTGT")
    : isBalanceSheet
      ? t("BALANCE_FORMULA_CONFIG", "Khai báo chỉ tiêu — Bảng cân đối kế toán")
      : isProfitLoss
        ? t("PL_FORMULA_CONFIG", "Khai báo chỉ tiêu — Kết quả hoạt động kinh doanh")
        : isIndirect
          ? t("CASHFLOW_FORMULA_CONFIG_INDIRECT", "Khai báo chỉ tiêu — BCLCTT phương pháp gián tiếp")
          : t("CASHFLOW_FORMULA_CONFIG_DIRECT", "Khai báo chỉ tiêu — BCLCTT phương pháp trực tiếp")

  const showPageChrome = layout === "page" || fullScreen

  useEffect(() => {
    if (!showPageChrome) {
      return
    }

    document.title = title
  }, [showPageChrome, title])

  const editor = (
      <div className={`flex min-h-0 flex-col gap-4 ${showPageChrome ? "h-full p-4" : "h-full"}`}>
        {showPageChrome ? (
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
                disabled={dataBusy || saving}
                onClick={onOpenColumnSettings}
              />
            ) : null}
          </section>
        ) : null}

        {initialLoading ? (
          <div
            className={`report-formula-options-skeleton min-h-0 flex-1 ${isVatDeclaration ? "report-formula-options-skeleton--vat" : ""}`}
            aria-busy="true"
            aria-label={t("LOADING", "Đang tải...")}
          >
            <div className="report-formula-options-skeleton__panel">
              <div className="report-formula-options-skeleton__header" />
              <div className="report-formula-options-skeleton__body">
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--lg" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--md" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--lg" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--sm" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--md" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--lg" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--sm" />
              </div>
            </div>
            <div className="report-formula-options-skeleton__panel">
              <div className="report-formula-options-skeleton__header" />
              <div className="report-formula-options-skeleton__body">
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--md" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--lg" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--sm" />
                <div className="report-formula-options-skeleton__line report-formula-options-skeleton__line--lg" />
              </div>
            </div>
          </div>
        ) : (
          <div className={`grid min-h-0 flex-1 gap-3 ${isVatDeclaration ? "xl:grid-cols-[minmax(560px,1.35fr)_minmax(400px,0.85fr)]" : "xl:grid-cols-[minmax(500px,1.2fr)_minmax(430px,0.9fr)]"}`}>
            <section className="relative flex min-h-0 flex-col overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm">
              {reloading ? (
                <div className="pointer-events-none absolute inset-x-0 top-0 z-10 h-0.5 overflow-hidden bg-slate-100">
                  <div className="report-formula-options-skeleton__line h-full w-full" />
                </div>
              ) : null}
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
                    disabled={dataBusy || saving || previewLoading || !optionsLoaded || sortedRows.length === 0}
                    onClick={() => void handleLoadPreview()}
                  />
                  <Button
                    icon="plus"
                    stylingMode="outlined"
                    text={t("ADD_ROW", "Thêm chỉ tiêu")}
                    disabled={dataBusy || saving || previewLoading}
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
                <FormulaListGrid
                  rows={rows}
                  selectedItemKey={selectedItemKey}
                  onSelectedItemKeyChange={handleSelectedItemKeyChange}
                  previewColumns={previewColumns}
                  previewValuesByItemCode={previewValuesByItemCode}
                  lineFilter={lineFilter}
                  isVatDeclaration={isVatDeclaration}
                  canonicalReportCode={canonicalReportCode}
                  dataSourceMode={dataSourceMode}
                  t={t}
                />
              </div>
            </section>
            <FormulaDetailEditor
              selectedRow={editorRow}
              sortedRows={sortedRows}
              isVatDeclaration={isVatDeclaration}
              isAccountRuleReport={isAccountRuleReport}
              isCashflow={isCashflow}
              isIndirect={isIndirect}
              isProfitLoss={isProfitLoss}
              canonicalReportCode={canonicalReportCode}
              dataSourceOptions={dataSourceOptions}
              elementTypeOptions={elementTypeOptions}
              calcMethodOptions={calcMethodOptions}
              vatCalcMethodOptions={vatCalcMethodOptions}
              flowSignOptions={flowSignOptions}
              saving={saving}
              t={t}
              updateSelectedRow={updateSelectedRow}
              moveSelectedRow={moveSelectedRow}
              deleteSelectedRow={deleteSelectedRow}
            />
          </div>
        )}
        <FormulaActionBar
          isDirty={isDirty}
          isVatDeclaration={isVatDeclaration}
          busy={dataBusy}
          saving={saving}
          hasCompanyOverride={hasCompanyOverride}
          t={t}
          onReload={handleReload}
          onReset={handleResetClick}
          onClose={onClose}
          onSave={handleSaveClick}
        />
        {/* Saving only — initial uses skeleton; reload keeps content; preview uses button state. */}
        <LoadPanel visible={saving} showIndicator={true} showPane={true} shading={false} />
      </div>
  )

  if (layout === "page" && !fullScreen) {
    return editor
  }

  return (
    <Popup
      visible={visible}
      title={fullScreen ? undefined : title}
      showTitle={!fullScreen}
      showCloseButton={!fullScreen}
      fullScreen={fullScreen}
      dragEnabled={false}
      resizeEnabled={false}
      hideOnOutsideClick={false}
      shading={true}
      width={fullScreen ? "100vw" : "min(1440px, calc(100vw - 2rem))"}
      maxWidth={fullScreen ? "100vw" : 1440}
      height={fullScreen ? "100vh" : "min(88vh, 920px)"}
      maxHeight={fullScreen ? "100vh" : undefined}
      container={fullScreen ? "body" : undefined}
      position={fullScreen ? { my: "center", at: "center", of: window } : undefined}
      wrapperAttr={fullScreen ? { class: "report-formula-options-popup report-formula-options-popup--fullscreen" } : { class: "report-formula-options-popup" }}
      onHiding={onClose}
    >
      {editor}
    </Popup>
  )
}

