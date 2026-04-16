import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Column } from "devextreme-react/data-grid"
import DateBox from "devextreme-react/date-box"
import LoadPanel from "devextreme-react/load-panel"
import SelectBox from "devextreme-react/select-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import { confirm } from "devextreme/ui/dialog"
import notify from "devextreme/ui/notify"

import {
  getExchangeRevaluationCurrencies,
  getExchangeRevaluationHistory,
  previewExchangeRevaluation,
  saveExchangeRevaluation,
} from "@/api/exchangeRevaluationApi"
import PageGrid from "@/components/datagrid/PageGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import type {
  ExchangeRevaluationCurrencyItem,
  ExchangeRevaluationHistoryItem,
  ExchangeRevaluationModule,
  ExchangeRevaluationPreviewItem,
} from "@/types/exchangeRevaluation"
import {
  buildChitYmdPayload,
  exportExchangeHistoryToExcel,
  exportExchangePreviewToExcel,
  formatChitYmdForDisplay,
  formatCurrencyNumber,
  formatRateDateForApi,
  formatRateDateForDisplay,
  formatSignedNumber,
  getDiffTypeClassName,
  getRateStatusClassName,
} from "./exchangeRevaluationUtils"

type ViewMode = "preview" | "history"

const moduleOptions: Array<{ value: ExchangeRevaluationModule; label: string }> = [
  { value: "ALL", label: "ALL" },
  { value: "AR", label: "AR" },
  { value: "AP", label: "AP" },
]

const filterLabelClassName = "text-sm font-medium text-slate-700"

export default function ExchangeRateRecalculationPage() {
  const gridRef = useRef<dxDataGrid | null>(null)
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])

  const [loading, setLoading] = useState(false)
  const [currencyLoading, setCurrencyLoading] = useState(false)
  const [activeView, setActiveView] = useState<ViewMode>("preview")
  const [rateDate, setRateDate] = useState<Date | null>(today)
  const [fromDate, setFromDate] = useState<Date | null>(today)
  const [toDate, setToDate] = useState<Date | null>(today)
  const [moduleCd, setModuleCd] = useState<ExchangeRevaluationModule>("ALL")
  const [fcType, setFcType] = useState<string | null>(null)
  const [currencies, setCurrencies] = useState<ExchangeRevaluationCurrencyItem[]>([])
  const [previewRows, setPreviewRows] = useState<ExchangeRevaluationPreviewItem[]>([])
  const [historyRows, setHistoryRows] = useState<ExchangeRevaluationHistoryItem[]>([])

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const currentRows = activeView === "preview" ? previewRows : historyRows
  const currentKeyExpr = activeView === "preview" ? "CHITDETAIL_ID" : "RESULT_ID"

  const loadCurrencies = useCallback(async () => {
    setCurrencyLoading(true)

    try {
      const data = await getExchangeRevaluationCurrencies(getCurrentCompanyCd(), moduleCd === "ALL" ? null : moduleCd)
      setCurrencies(data)

      if (fcType && !data.some((item) => item.FC_TYPE === fcType)) {
        setFcType(null)
      }
    } catch (error) {
      console.error("Failed to load exchange currencies", error)
      notify(t("LOAD_FAILED", "Load failed"), "error", 3000)
    } finally {
      setCurrencyLoading(false)
    }
  }, [fcType, moduleCd, t])

  useEffect(() => {
    void loadCurrencies()
  }, [loadCurrencies])

  const buildPreviewPayload = useCallback(() => {
    return {
      COMPANY_CD: getCurrentCompanyCd(),
      MODULE_CD: moduleCd,
      RATE_DATE: formatRateDateForApi(rateDate),
      FC_TYPE: fcType || null,
      CHIT_YMD_FROM: buildChitYmdPayload(fromDate),
      CHIT_YMD_TO: buildChitYmdPayload(toDate),
    }
  }, [fcType, fromDate, moduleCd, rateDate, toDate])

  const validateRateDate = useCallback(() => {
    const nextRateDate = formatRateDateForApi(rateDate)
    if (!nextRateDate) {
      notify(t("RATE_DATE_REQUIRED", "Rate date is required"), "warning", 3000)
      return false
    }

    return true
  }, [rateDate, t])

  const validatePreviewFilter = useCallback(() => {
    if (!validateRateDate()) {
      return false
    }

    const fromYmd = buildChitYmdPayload(fromDate)
    const toYmd = buildChitYmdPayload(toDate)
    if (fromYmd && toYmd && fromYmd > toYmd) {
      notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
      return false
    }

    return true
  }, [fromDate, t, toDate, validateRateDate])

  const handlePreview = useCallback(async () => {
    if (!validatePreviewFilter()) {
      return
    }

    setLoading(true)

    try {
      const response = await previewExchangeRevaluation(buildPreviewPayload())
      setPreviewRows(Array.isArray(response.data.data) ? response.data.data : [])
      setActiveView("preview")
    } catch (error) {
      console.error("Failed to preview exchange revaluation", error)
      notify(t("LOAD_FAILED", "Load failed"), "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [buildPreviewPayload, t, validatePreviewFilter])

  const handleSave = useCallback(async () => {
    if (!validatePreviewFilter()) {
      return
    }

    const isConfirmed = await confirm(
      t("SAVE_RESULT_CONFIRM", "Do you want to save the exchange revaluation result?"),
      t("MSG_CONFIRM_DELETE", "Confirm"),
    )
    if (!isConfirmed) {
      return
    }

    setLoading(true)

    try {
      const response = await saveExchangeRevaluation(buildPreviewPayload())
      setHistoryRows(Array.isArray(response.data.data) ? response.data.data : [])
      setActiveView("history")
      notify(response.message || t("SAVE_SUCCESS", "Saved successfully"), "success", 3000)
    } catch (error) {
      console.error("Failed to save exchange revaluation", error)
      notify(t("SAVE_FAILED", "Save failed"), "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [buildPreviewPayload, t, validatePreviewFilter])

  const handleLoadHistory = useCallback(async () => {
    if (!validateRateDate()) {
      return
    }

    setLoading(true)

    try {
      const rateDateText = formatRateDateForApi(rateDate)
      const response = await getExchangeRevaluationHistory({
        COMPANY_CD: getCurrentCompanyCd(),
        MODULE_CD: moduleCd === "ALL" ? null : moduleCd,
        RATE_DATE_FROM: rateDateText,
        RATE_DATE_TO: rateDateText,
        FC_TYPE: fcType || null,
      })
      setHistoryRows(Array.isArray(response.data.data) ? response.data.data : [])
      setActiveView("history")
    } catch (error) {
      console.error("Failed to load exchange revaluation history", error)
      notify(t("LOAD_FAILED", "Load failed"), "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [fcType, moduleCd, rateDate, t, validateRateDate])

  const handleRefresh = useCallback(() => {
    if (activeView === "history") {
      void handleLoadHistory()
      return
    }

    void handlePreview()
  }, [activeView, handleLoadHistory, handlePreview])

  const handleExportExcel = useCallback(async () => {
    if (!currentRows.length) {
      notify(t("NO_DATA_TO_EXPORT", "No data to export"), "warning", 2500)
      return
    }

    try {
      if (activeView === "preview") {
        await exportExchangePreviewToExcel(previewRows)
      } else {
        await exportExchangeHistoryToExcel(historyRows)
      }
    } catch (error) {
      console.error("Failed to export exchange revaluation", error)
      notify(t("EXPORT_FAILED", "Export failed"), "error", 4000)
    }
  }, [activeView, currentRows.length, historyRows, previewRows, t])

  const handleClear = useCallback(() => {
    setRateDate(today)
    setFromDate(today)
    setToDate(today)
    setModuleCd("ALL")
    setFcType(null)
    setPreviewRows([])
    setHistoryRows([])
    setActiveView("preview")
  }, [today])

  const toolbarItems = useMemo(
    () => [
      {
        key: "preview",
        icon: "search",
        text: t("PREVIEW", "Preview"),
        hint: t("PREVIEW", "Preview"),
        type: "default" as const,
        stylingMode: "contained" as const,
        showText: "always" as const,
        onClick: () => void handlePreview(),
      },
      {
        key: "save",
        icon: "save",
        text: t("SAVE_RESULT", "Save Result"),
        hint: t("SAVE_RESULT", "Save Result"),
        stylingMode: "outlined" as const,
        showText: "always" as const,
        onClick: () => void handleSave(),
      },
      {
        key: "history",
        icon: "event",
        text: t("LOAD_HISTORY", "History"),
        hint: t("LOAD_HISTORY", "History"),
        stylingMode: "text" as const,
        showText: "always" as const,
        onClick: () => void handleLoadHistory(),
      },
      {
        key: "clear",
        icon: "clear",
        text: t("CLEAR", "Clear"),
        hint: t("CLEAR", "Clear"),
        stylingMode: "text" as const,
        showText: "always" as const,
        onClick: handleClear,
      },
    ],
    [handleClear, handleLoadHistory, handlePreview, handleSave, t],
  )

  return (
    <DxPage>
      <div className="flex h-full flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <label className={filterLabelClassName}>{t("RATE_DATE", "Rate Date")}</label>
              <DateBox
                type="date"
                displayFormat="yyyy-MM-dd"
                stylingMode="outlined"
                value={rateDate}
                onValueChanged={(event) => setRateDate((event.value as Date) ?? null)}
                width="100%"
              />
            </div>

            <div className="space-y-2">
              <label className={filterLabelClassName}>{t("MODULE", "Module")}</label>
              <SelectBox
                dataSource={moduleOptions}
                displayExpr="label"
                valueExpr="value"
                stylingMode="outlined"
                value={moduleCd}
                onValueChanged={(event) => setModuleCd((event.value as ExchangeRevaluationModule) ?? "ALL")}
                width="100%"
              />
            </div>

            <div className="space-y-2">
              <label className={filterLabelClassName}>{t("FC_TYPE", "Currency")}</label>
              <SelectBox
                dataSource={currencies}
                displayExpr="FC_TYPE"
                valueExpr="FC_TYPE"
                stylingMode="outlined"
                value={fcType}
                onValueChanged={(event) => setFcType((event.value as string) ?? null)}
                width="100%"
                searchEnabled
                showClearButton
                disabled={currencyLoading}
              />
            </div>

            <div className="space-y-2">
              <label className={filterLabelClassName}>{t("MSG_FROMDATE", "From Date")}</label>
              <DateBox
                type="date"
                displayFormat="yyyy-MM-dd"
                stylingMode="outlined"
                value={fromDate}
                onValueChanged={(event) => setFromDate((event.value as Date) ?? null)}
                width="100%"
              />
            </div>

            <div className="space-y-2">
              <label className={filterLabelClassName}>{t("MSG_TODATE", "To Date")}</label>
              <DateBox
                type="date"
                displayFormat="yyyy-MM-dd"
                stylingMode="outlined"
                value={toDate}
                onValueChanged={(event) => setToDate((event.value as Date) ?? null)}
                width="100%"
              />
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <GridToolbar
            title={activeView === "preview" ? t("PREVIEW_RESULT", "Preview Result") : t("HISTORY_RESULT", "History Result")}
            gridRef={gridRef}
            onRefresh={handleRefresh}
            onExportXlsx={() => void handleExportExcel()}
            customItems={toolbarItems}
            showAdd={false}
            showDelete={false}
            showImport={false}
            showExportPdf={false}
          />

          <div className="min-h-0 flex-1 px-4 pb-4">
            <PageGrid
              dataSource={currentRows}
              keyExpr={currentKeyExpr}
              selectMode="single"
              onInitialized={(event) => {
                gridRef.current = event.component ?? null
              }}
            >
              {activeView === "history" && (
                <Column dataField="BATCH_ID" caption={t("BATCH_ID", "Batch ID")} width={120} visible={false} showInColumnChooser={false} allowHiding={false} />
              )}
              {activeView === "history" && (
                <Column
                  dataField="RATE_DATE"
                  caption={t("RATE_DATE", "Rate Date")}
                  width={130}
                  cellRender={(cell) => <span>{formatRateDateForDisplay(String(cell.value ?? "")) || "-"}</span>}
                />
              )}
              <Column dataField="MODULE_CD" caption={t("MODULE", "Module")} width={90} />
              <Column dataField="CHIT_NO" caption={t("CHIT_NO", "Chit No")} width={150} />
              <Column
                dataField="CHIT_YMD"
                caption={t("CHIT_YMD", "Chit Date")}
                width={130}
                cellRender={(cell: { value?: unknown }) => <span>{formatChitYmdForDisplay(String(cell.value ?? "")) || "-"}</span>}
              />
              <Column dataField="CHIT_TYPE" caption={t("CHIT_TYPE", "Chit Type")} width={120} />
              <Column dataField="FC_TYPE" caption={t("FC_TYPE", "Currency")} width={100} />
              <Column
                dataField="FC_AMOUNT"
                caption={t("FC_AMOUNT", "FC Amount")}
                width={140}
                alignment="right"
                customizeText={(cell) => formatCurrencyNumber(Number(cell.value ?? 0))}
              />
              <Column
                dataField="OLD_RATE"
                caption={t("OLD_RATE", "Old Rate")}
                width={130}
                alignment="right"
                customizeText={(cell) => formatCurrencyNumber(Number(cell.value ?? 0), 6)}
              />
              <Column
                dataField="NEW_RATE"
                caption={t("NEW_RATE", "New Rate")}
                width={130}
                alignment="right"
                cellRender={(cell: { value?: unknown }) => <span>{cell.value == null || cell.value === "" ? "-" : formatCurrencyNumber(Number(cell.value), 6)}</span>}
              />
              <Column
                dataField="OLD_AMOUNT"
                caption={t("OLD_AMOUNT", "Old Amount")}
                width={150}
                alignment="right"
                customizeText={(cell) => formatCurrencyNumber(Number(cell.value ?? 0))}
              />
              <Column
                dataField="NEW_AMOUNT"
                caption={t("NEW_AMOUNT", "New Amount")}
                width={150}
                alignment="right"
                cellRender={(cell: { value?: unknown }) => <span>{cell.value == null || cell.value === "" ? "-" : formatCurrencyNumber(Number(cell.value))}</span>}
              />
              <Column
                dataField="EXCHANGE_DIFF"
                caption={t("EXCHANGE_DIFF", "Diff")}
                width={150}
                alignment="right"
                cellRender={(cell: { value?: unknown }) => (
                  <span className={Number(cell.value ?? 0) > 0 ? "text-emerald-600" : Number(cell.value ?? 0) < 0 ? "text-rose-600" : "text-slate-700"}>
                    {cell.value == null || cell.value === "" ? "-" : formatSignedNumber(Number(cell.value))}
                  </span>
                )}
              />
              <Column
                dataField="DIFF_TYPE"
                caption={t("DIFF_TYPE", "Diff Type")}
                width={120}
                cellRender={(cell: { value?: unknown }) => <span className={getDiffTypeClassName(String(cell.value ?? ""))}>{String(cell.value ?? "NONE")}</span>}
              />
              <Column
                dataField="RATE_STATUS"
                caption={t("RATE_STATUS", "Rate Status")}
                width={130}
                cellRender={(cell: { value?: unknown }) => <span className={getRateStatusClassName(String(cell.value ?? ""))}>{String(cell.value ?? "MISSING")}</span>}
              />
              {activeView === "history" && (
                <Column dataField="CREATED_BY" caption={t("CREATE_BY", "Created By")} width={140} />
              )}
            </PageGrid>
          </div>
        </section>

        <LoadPanel visible={loading || currencyLoading} />
      </div>
    </DxPage>
  )
}
