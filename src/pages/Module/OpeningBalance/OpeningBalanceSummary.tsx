import React, { useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useNavigate } from "react-router-dom"
import Button from "devextreme-react/button"
import SelectBox from "devextreme-react/select-box"
import LoadPanel from "devextreme-react/load-panel"
import notify from "devextreme/ui/notify"
import Summary, { TotalItem } from "devextreme-react/data-grid"

import { LanguageContext } from "@/lib/i18nLoader";
import { BaseDataGrid } from "@/components/datagrid/BaseDataGrid";
import { OpeningBalanceSummaryColumns } from "./Columns/OpeningBalanceSummaryColumns"
import { formatNumber, SummaryCard } from "@/utils/openingBalanceHelpers"
import type { OpeningBalanceSummaryModel } from "@/types/openingBalance"
import { getCurrentDataLanguageSuffix } from "@/utils/language"
import { useOpeningBalanceSummaryQuery } from "@/hooks/queries/openingBalanceQueries"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import { useWorkspaceTabs } from "@/components/workspaceTabs/WorkspaceTabs"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"
import { GetFiscalStartYear } from "@/api/openingBalanceApi"
import { getApiErrorMessage } from "@/api/apiTypes"
const YEAR_OPTIONS = [2024, 2025, 2026, 2027]
const MONTH_OPTIONS = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]

function MiniCard(props: {
  label: string
  value: number
  className: string
}): React.JSX.Element {
  return (
    <div className={`rounded-2xl border p-4 shadow-sm ${props.className}`}>
      <div className="text-sm font-medium">{props.label}</div>
      <div className="mt-2 text-2xl font-bold">{formatNumber(props.value)}</div>
    </div>
  )
}

function OpeningBalanceSummaryPage(): React.JSX.Element {
  const navigate = useNavigate()
  const { openWorkspacePath } = useWorkspaceTabs()
  const { translate } = useContext(LanguageContext)
  const t = translate

  const [year, setYear] = useState<number | null>(null)
  const [month, setMonth] = useState<number | null>(null)
  const [openYmd, setOpenYmd] = useState("")
  const [loadingFiscalStart, setLoadingFiscalStart] = useState(true)
  const [companyName] = useState<string>("AM ACCOUNTING")

  const yearOptions = useMemo(
    () => year === null ? YEAR_OPTIONS : [...new Set([...YEAR_OPTIONS, year])].sort((a, b) => a - b),
    [year]
  )

  useEffect(() => {
    let cancelled = false
    void (async () => {
      try {
        const resp = await GetFiscalStartYear()
        if (cancelled) return
        const fiscalYmd = String(resp.Data ?? "").trim()
        if (!/^\d{8}$/.test(fiscalYmd)) {
          throw new Error("Invalid fiscal start date")
        }
        const fiscalYear = Number(fiscalYmd.slice(0, 4))
        const fiscalMonth = Number(fiscalYmd.slice(4, 6))
        const fiscalDay = Number(fiscalYmd.slice(6, 8))
        const fiscalDate = new Date(fiscalYear, fiscalMonth - 1, fiscalDay)
        if (fiscalDate.getFullYear() !== fiscalYear || fiscalDate.getMonth() !== fiscalMonth - 1 || fiscalDate.getDate() !== fiscalDay) {
          throw new Error("Invalid fiscal start date")
        }
        setYear(fiscalYear)
        setMonth(fiscalMonth)
        setOpenYmd(fiscalYmd)
      } catch (error) {
        if (!cancelled) {
          notify(getApiErrorMessage(error, t("LOAD_FAILED", "Tải dữ liệu thất bại")), "error", 2500)
        }
      } finally {
        if (!cancelled) setLoadingFiscalStart(false)
      }
    })()
    return () => { cancelled = true }
  }, [t])

  const {
    data: rows = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch,
  } = useOpeningBalanceSummaryQuery(openYmd)
  const loading = loadingFiscalStart || isLoading || isFetching

  useMasterListLoadError(isError, loadError, t, "Failed to load opening balance summary")

  const totalDebit = useMemo(
    () => rows.reduce((sum, item) => sum + Number(item.TOTAL_DEBIT || 0), 0),
    [rows]
  )

  const totalCredit = useMemo(
    () => rows.reduce((sum, item) => sum + Number(item.TOTAL_CREDIT || 0), 0),
    [rows]
  )

  const diffAmount = useMemo(
    () => Math.abs(totalDebit - totalCredit),
    [totalCredit, totalDebit]
  )

  const balancedCount = useMemo(
    () => rows.filter((item) => item.STATUS === "BALANCED").length,
    [rows]
  )

const handleOpenDetail = useCallback(
  (row: OpeningBalanceSummaryModel, openInNewTab = false) => {
    if (!openYmd || month === null || year === null) return
    const itemNameKey = `ITEM_NAME_${getCurrentDataLanguageSuffix()}` as keyof OpeningBalanceSummaryModel
    const itemName = String(row[itemNameKey] ?? row.ITEM_CD)
    const targetPath = buildAppPath(getCurrentCompanyCd(), row.ROUTE)

    if (openInNewTab) {
      const params = new URLSearchParams({
        openingMonth: String(month),
        openingYear: String(year),
        openingYmd: openYmd,
        itemCode: row.ITEM_CD,
        itemName,
      })

      openWorkspacePath(`${targetPath}?${params.toString()}`, {
        title: itemName || t("OPENING_BALANCE_DETAIL", "Chi tiết số dư đầu kỳ"),
      })
      return
    }

    navigate(targetPath, {
      state: {
        openingYear: year,
        openingMonth: month,
        openingYmd: openYmd,
        itemCode: row.ITEM_CD,
        itemName,
      },
    })
  },
  [month, navigate, openWorkspacePath, openYmd, t, year]
)

  return (
    <div className="min-h-full bg-gray-50 p-0">
      <LoadPanel
        visible={loading}
        shading={true}
        showPane={true}
        hideOnOutsideClick={false}
        message={t("LOADING", "Đang tải dữ liệu...")}
      />

      <div className="space-y-4">
        <div className="rounded-2xl border border-red-100 bg-white shadow-sm">
          <div className="flex flex-col gap-4 p-4 md:flex-row md:items-center md:justify-between md:p-5">

            <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
              <div className="min-w-[140px]">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("lblMONTH", "Tháng")}</div>
                <SelectBox
                  items={MONTH_OPTIONS}
                  value={month}
                  disabled={!openYmd || loadingFiscalStart}
                  readOnly={true}
                  stylingMode="outlined"
                />
              </div>
              <div className="min-w-[140px]">
                <div className="mb-1 text-xs font-medium uppercase tracking-wide text-gray-500">
                  {t("lblYEAR", "Năm")}</div>
                <SelectBox
                  items={yearOptions}
                  value={year}
                  disabled={!openYmd || loadingFiscalStart}
                  readOnly={true}
                  stylingMode="outlined"
                />
              </div>

              <Button
                text={t("RELOAD_PAGE", "Tải lại")}
                stylingMode="contained"
                type="default"
                disabled={!openYmd || loadingFiscalStart}
                onClick={() => void refetch()}
              />
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
          <SummaryCard
            title={t("AMOUNT_DEBT_TOTAL", "Tổng Nợ")}
            value={formatNumber(totalDebit)}
            subtitle={t("TOTAL_DEBIT_DESC", "Tổng phát sinh Nợ đầu kỳ")}
            tone="red"
          />
          <SummaryCard
            title={t("TOTAL_CREDIT", "Tổng Có")}
            value={formatNumber(totalCredit)}
            subtitle={t("TOTAL_CREDIT_DESC", "Tổng phát sinh Có đầu kỳ")}
            tone="blue"
          />
          <SummaryCard
            title={t("DIFF_CC", "Chênh lệch")}
            value={formatNumber(diffAmount)}
            subtitle={diffAmount === 0 ? t("BALANCED", "Cân đối") : t("NEED_RECHECK", "Cần kiểm tra lại")}
            tone={diffAmount === 0 ? "green" : "amber"}
          />
          <SummaryCard
            title={t("STATUS", "Trạng thái")}
            value={diffAmount === 0 ? t("BALANCED", "CÂN ĐỐI") : t("UNBALANCED", "CHƯA CÂN ĐỐI")}
            subtitle={`${t("COMPLETED", "Hoàn thành")} ${balancedCount}/${rows.length} ${t("ITEM", "mục")}`}
            tone={diffAmount === 0 ? "green" : "amber"}
          />
        </div>

        <div className="rounded-2xl border border-red-100 bg-white shadow-sm">
          <div className="border-b border-gray-100 px-4 py-3 md:px-5">
            <div className="text-base font-semibold text-gray-900">
              {t("OPENING_TRANSACTION_LIST", "Danh sách nghiệp vụ đầu kỳ")}
            </div>
            <div className="mt-1 text-sm text-gray-500">
              {t("CLICK_OPEN_INPUT_TO_GO_DETAIL_SCREEN", "Bấm mở nhập liệu để đi tới màn hình chi tiết")}
            </div>
          </div>

          <div className="p-3 md:p-4">
            <BaseDataGrid
              dataSource={rows}
              keyExpr="ID"
              selectMode="single"
              showPager={false}
              onContextMenuPreparing={(e) => {
                e.items = [];
                e.event?.preventDefault();
              }}
            >
              <OpeningBalanceSummaryColumns t={t} onOpenDetail={handleOpenDetail} />

              <Summary>
                <TotalItem
                  column="ITEM_NAME"
                  summaryType="count"
                  displayFormat={`${t("TOTAL", "Tổng")}: {0} ${t("ITEM", "mục")}`}
                />
                <TotalItem
                  column="RECORD_COUNT"
                  summaryType="sum"
                  valueFormat="#,##0"
                  displayFormat="{0}"
                />
                <TotalItem
                  column="TOTAL_DEBIT"
                  summaryType="sum"
                  valueFormat="#,##0"
                  displayFormat="{0}"
                />
                <TotalItem
                  column="TOTAL_CREDIT"
                  summaryType="sum"
                  valueFormat="#,##0"
                  displayFormat="{0}"
                />
                <TotalItem
                  column="DIFF_AMOUNT"
                  summaryType="sum"
                  valueFormat="#,##0"
                  displayFormat="{0}"
                />
              </Summary>
            </BaseDataGrid>
          </div>
        </div>
      </div>
    </div>
  )
}

export default OpeningBalanceSummaryPage
