import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import { Column } from "devextreme-react/data-grid"
import DateBox from "devextreme-react/date-box"
import LoadPanel from "devextreme-react/load-panel"
import SelectBox from "devextreme-react/select-box"
import TextBox from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import notify from "devextreme/ui/notify"

import { getBankDepositBookReport } from "@/api/bankDepositBookApi"
import { getBankInfos } from "@/api/bankInfoApi"
import PageGrid from "@/components/datagrid/PageGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { getCurrentCompanyCd } from "@/lib/login"
import type { BankInfoApi } from "@/types/bankInfo"
import type {
  BankDepositBookModule,
  BankDepositBookReportRequest,
  BankDepositBookRow,
} from "@/types/bankDepositBook"

import {
  buildBankOptionLabel,
  exportBankDepositBookToExcel,
  formatBankDepositAmount,
  formatBankDepositYmdForDisplay,
  formatFilterDateForApi,
} from "./bankDepositBookUtils"

type BankOption = {
  BANK_CD: string
  DISPLAY: string
}

const moduleOptions: Array<{ value: BankDepositBookModule; label: string }> = [
  { value: "ALL", label: "ALL" },
  { value: "AR", label: "AR" },
  { value: "AP", label: "AP" },
]

export default function BankDepositBookPage() {
  const gridRef = useRef<dxDataGrid | null>(null)
  const today = useMemo(() => {
    const date = new Date()
    date.setHours(0, 0, 0, 0)
    return date
  }, [])
  const firstDayOfMonth = useMemo(() => {
    const date = new Date(today)
    date.setDate(1)
    return date
  }, [today])

  const [loading, setLoading] = useState(false)
  const [lookupLoading, setLookupLoading] = useState(false)
  const [fromDate, setFromDate] = useState<Date | null>(firstDayOfMonth)
  const [toDate, setToDate] = useState<Date | null>(today)
  const [moduleCd, setModuleCd] = useState<BankDepositBookModule>("ALL")
  const [bankCd, setBankCd] = useState<string | null>(null)
  const [fcType, setFcType] = useState<string>("")
  const [bankOptions, setBankOptions] = useState<BankOption[]>([])
  const [rows, setRows] = useState<BankDepositBookRow[]>([])

  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const loadBanks = useCallback(async () => {
    setLookupLoading(true)

    try {
      const result = await getBankInfos()
      const items = Array.isArray(result.data) ? result.data : []

      setBankOptions(
        items
          .filter((item: BankInfoApi) => Boolean(item.BANK_CD))
          .map((item: BankInfoApi) => ({
            BANK_CD: item.BANK_CD ?? "",
            DISPLAY: buildBankOptionLabel(item),
          })),
      )
    } catch (error) {
      console.error("Failed to load bank lookup", error)
      notify(t("LOAD_FAILED", "Load failed"), "error", 3000)
    } finally {
      setLookupLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadBanks()
  }, [loadBanks])

  const validateFilter = useCallback(() => {
    const nextFromDate = formatFilterDateForApi(fromDate)
    if (!nextFromDate) {
      notify(t("MSG_FROMDATE", "From Date"), "warning", 2500)
      return false
    }

    const nextToDate = formatFilterDateForApi(toDate)
    if (!nextToDate) {
      notify(t("MSG_TODATE", "To Date"), "warning", 2500)
      return false
    }

    if (nextFromDate > nextToDate) {
      notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
      return false
    }

    return true
  }, [fromDate, t, toDate])

  const buildPayload = useCallback((): BankDepositBookReportRequest => {
    const normalizedFcType = fcType.trim()

    return {
      fromDate: formatFilterDateForApi(fromDate),
      toDate: formatFilterDateForApi(toDate),
      moduleCd: moduleCd === "ALL" ? null : moduleCd,
      bankCd: bankCd || null,
      fcType: normalizedFcType ? normalizedFcType.toUpperCase() : null,
    }
  }, [bankCd, fcType, fromDate, moduleCd, toDate])

  const handleSearch = useCallback(async () => {
    if (!validateFilter()) {
      return
    }

    setLoading(true)

    try {
      const response = await getBankDepositBookReport(buildPayload())
      setRows(Array.isArray(response.data) ? response.data : [])
    } catch (error) {
      console.error("Failed to load bank deposit book report", error)
      notify(t("LOAD_FAILED", "Load failed"), "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [buildPayload, t, validateFilter])

  const handleClear = useCallback(() => {
    setFromDate(firstDayOfMonth)
    setToDate(today)
    setModuleCd("ALL")
    setBankCd(null)
    setFcType("")
    setRows([])
  }, [firstDayOfMonth, today])

  const handleRefresh = useCallback(() => {
    void handleSearch()
  }, [handleSearch])

  const handleExportExcel = useCallback(async () => {
    if (!rows.length) {
      notify(t("NO_DATA_TO_EXPORT", "No data to export"), "warning", 2500)
      return
    }

    try {
      await exportBankDepositBookToExcel(rows)
    } catch (error) {
      console.error("Failed to export bank deposit book", error)
      notify(t("EXPORT_FAILED", "Export failed"), "error", 4000)
    }
  }, [rows, t])

  const handleExportPdf = useCallback(() => {
    if (!validateFilter()) {
      return
    }

    const companyCd = getCurrentCompanyCd()
    const payload = buildPayload()
    const params = new URLSearchParams()

    if (companyCd) {
      params.set("companyCd", companyCd)
    }

    if (payload.fromDate) {
      params.set("fromDate", payload.fromDate)
    }

    if (payload.toDate) {
      params.set("toDate", payload.toDate)
    }

    if (payload.moduleCd) {
      params.set("moduleCd", payload.moduleCd)
    }

    if (payload.bankCd) {
      params.set("bankCd", payload.bankCd)
    }

    if (payload.fcType) {
      params.set("fcType", payload.fcType)
    }

    params.set("reportCode", "BANK_DEPOSIT_BOOK")

    const targetUrl = `${window.location.origin}/report-viewer${params.toString() ? `?${params.toString()}` : ""}`
    const viewerWindow = window.open(targetUrl, "_blank", "noopener,noreferrer")

    if (!viewerWindow) {
      notify(t("Unable to open report viewer", "Unable to open report viewer"), "error", 3000)
    }
  }, [buildPayload, t, validateFilter])

  const toolbarItems = useMemo(
    () => [
      {
        key: "search",
        icon: "search",
        text: t("MSG_BTNSER", "Search"),
        hint: t("MSG_BTNSER", "Search"),
        type: "default" as const,
        stylingMode: "contained" as const,
        showText: "always" as const,
        onClick: () => void handleSearch(),
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
    [handleClear, handleSearch, t],
  )

  return (
    <DxPage>
      <div className="flex h-full flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t("MSG_FROMDATE", "From Date")}</label>
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
              <label className="text-sm font-medium text-slate-700">{t("MSG_TODATE", "To Date")}</label>
              <DateBox
                type="date"
                displayFormat="yyyy-MM-dd"
                stylingMode="outlined"
                value={toDate}
                onValueChanged={(event) => setToDate((event.value as Date) ?? null)}
                width="100%"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t("MODULE", "Module")}</label>
              <SelectBox
                dataSource={moduleOptions}
                displayExpr="label"
                valueExpr="value"
                stylingMode="outlined"
                value={moduleCd}
                onValueChanged={(event) => setModuleCd((event.value as BankDepositBookModule) ?? "ALL")}
                width="100%"
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t("BANK_CD", "Bank")}</label>
              <SelectBox
                dataSource={bankOptions}
                displayExpr="DISPLAY"
                valueExpr="BANK_CD"
                stylingMode="outlined"
                value={bankCd}
                onValueChanged={(event) => setBankCd((event.value as string) ?? null)}
                width="100%"
                searchEnabled
                showClearButton
                disabled={lookupLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700">{t("FC_TYPE", "Currency")}</label>
              <TextBox
                stylingMode="outlined"
                value={fcType}
                onValueChanged={(event) => setFcType(String(event.value ?? ""))}
                width="100%"
              />
            </div>
          </div>
        </section>

        <section className="flex min-h-0 flex-1 flex-col rounded-2xl border border-slate-200 bg-white shadow-sm">
          <GridToolbar
            title=""
            gridRef={gridRef}
            onRefresh={handleRefresh}
            onExportPdf={handleExportPdf}
            onExportXlsx={() => void handleExportExcel()}
            customItems={toolbarItems}
            showAdd={false}
            showDelete={false}
            showImport={false}
          />

          <div className="min-h-0 flex-1 px-4 pb-4">
            <PageGrid<BankDepositBookRow>
              dataSource={rows}
              keyExpr="ROW_KEY"
              selectMode="single"
              onInitialized={(event) => {
                gridRef.current = event.component ?? null
              }}
            >
              <Column
                dataField="CHIT_YMD"
                caption={t("CHIT_YMD", "Date")}
                width={130}
                cellRender={(cell: { data?: BankDepositBookRow; value?: unknown }) => (
                  <span>
                    {cell.data?.ROW_TYPE === "DETAIL" ? formatBankDepositYmdForDisplay(String(cell.value ?? "")) || "-" : ""}
                  </span>
                )}
              />
              <Column dataField="MODULE_CD" caption={t("MODULE", "Module")} width={90} />
              <Column dataField="CHIT_NO" caption={t("CHIT_NO", "Chit No")} width={150} />
              <Column dataField="CHIT_TYPE" caption={t("CHIT_TYPE", "Chit Type")} width={130} />
              <Column
                dataField="DESCRIPTION"
                caption={t("DESCRIPTION", "Description")}
                minWidth={260}
                cellRender={(cell: { data?: BankDepositBookRow; value?: unknown }) => (
                  <span className={cell.data?.ROW_TYPE === "DETAIL" ? undefined : "font-semibold text-slate-900"}>
                    {String(cell.value ?? "") || "-"}
                  </span>
                )}
              />
              <Column dataField="DEBIT" caption={t("DEBIT", "Debit")} width={120} />
              <Column dataField="CREDIT" caption={t("CREDIT", "Credit")} width={120} />
              <Column
                dataField="RECEIPT_AMOUNT"
                caption={t("RECEIPT_AMOUNT", "Receipt")}
                width={140}
                alignment="right"
                customizeText={(cell) => formatBankDepositAmount(Number(cell.value ?? 0))}
              />
              <Column
                dataField="PAYMENT_AMOUNT"
                caption={t("PAYMENT_AMOUNT", "Payment")}
                width={140}
                alignment="right"
                customizeText={(cell) => formatBankDepositAmount(Number(cell.value ?? 0))}
              />
              <Column
                dataField="RUNNING_AMOUNT"
                caption={t("RUNNING_AMOUNT", "Running Balance")}
                width={160}
                alignment="right"
                customizeText={(cell) => formatBankDepositAmount(Number(cell.value ?? 0))}
              />
              <Column dataField="FC_TYPE" caption={t("FC_TYPE", "Currency")} width={100} />
              <Column
                dataField="RECEIPT_FC_AMOUNT"
                caption={t("RECEIPT_FC_AMOUNT", "Receipt FC")}
                width={140}
                alignment="right"
                customizeText={(cell) => formatBankDepositAmount(Number(cell.value ?? 0))}
              />
              <Column
                dataField="PAYMENT_FC_AMOUNT"
                caption={t("PAYMENT_FC_AMOUNT", "Payment FC")}
                width={140}
                alignment="right"
                customizeText={(cell) => formatBankDepositAmount(Number(cell.value ?? 0))}
              />
              <Column
                dataField="FC_RATE"
                caption={t("FC_RATE", "FC Rate")}
                width={140}
                alignment="right"
                customizeText={(cell) => formatBankDepositAmount(Number(cell.value ?? 0), 6)}
              />
              <Column
                dataField="RUNNING_FC_AMOUNT"
                caption={t("RUNNING_FC_AMOUNT", "Running FC Balance")}
                width={180}
                alignment="right"
                customizeText={(cell) => formatBankDepositAmount(Number(cell.value ?? 0))}
              />
              <Column dataField="BANK_CD" caption={t("BANK_CD", "Bank Cd")} width={120} />
              <Column dataField="BANK_OWN_CD" caption={t("BANK_OWN_CD", "Bank Own Cd")} width={130} />
              <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER_CD", "Customer Cd")} width={130} />
            </PageGrid>
          </div>
        </section>

        <LoadPanel visible={loading || lookupLoading} />
      </div>
    </DxPage>
  )
}
