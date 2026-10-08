import React, { useCallback, useEffect, useRef, useState } from "react"
import { Bar, Line } from "react-chartjs-2"
import {
  Chart as ChartJS,
  BarElement,
  CategoryScale,
  LinearScale,
  Tooltip,
  Legend,
  LineElement,
  PointElement,
  Filler,
} from "chart.js"
import SelectBox from "devextreme-react/select-box"
import Button from "devextreme-react/button"
import DataGrid, { Column, Paging, Scrolling } from "devextreme-react/data-grid"
import { getDashboardOverview } from "@/api/dashboardApi"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import { getDevExtremeIconClass } from "@/lib/devexpressIcons"
import type {
  DashboardKpi,
  DashboardChartItem,
  DashboardTaskItem,
  DashboardReceivable,
  DashboardPayable,
  DashboardTaxDeadline,
  DashboardPeriodLock,
  DashboardOverviewData,
  DashboardRecentVoucher,
  DashboardFilter,
} from "@/types/dashboard"

ChartJS.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend, LineElement, PointElement, Filler)

const fmt = (n: number) =>
  new Intl.NumberFormat("vi-VN", { notation: "compact", maximumFractionDigits: 1 }).format(n)

const fmtFull = (n: number) =>
  new Intl.NumberFormat("vi-VN", { maximumFractionDigits: 0 }).format(n)

function pctChange(current: number, prev: number): string {
  if (prev === 0) return ""
  const pct = ((current - prev) / Math.abs(prev)) * 100
  return (pct >= 0 ? "+" : "") + pct.toFixed(1) + "%"
}

function fmtPeriod(ym: string): string {
  if (!ym || ym.length < 6) return ym
  return `${ym.slice(4, 6)}/${ym.slice(0, 4)}`
}

const MONTH_LABELS: Record<string, string> = {
  "01": "T1", "02": "T2", "03": "T3", "04": "T4",
  "05": "T5", "06": "T6", "07": "T7", "08": "T8",
  "09": "T9", "10": "T10", "11": "T11", "12": "T12",
}

const SEVERITY_STYLES: Record<string, string> = {
  warning: "bg-amber-50 border-amber-400 text-amber-800",
  danger:  "bg-red-50   border-red-400   text-red-800",
  info:    "bg-blue-50  border-blue-400  text-blue-800",
}

const TAX_STATUS_STYLES: Record<string, string> = {
  PENDING:    "bg-gray-100   text-gray-600",
  PROCESSING: "bg-blue-100   text-blue-700",
  SUBMITTED:  "bg-green-100  text-green-700",
  OVERDUE:    "bg-red-100    text-red-700",
}

const TAX_STATUS_LABELS: Record<string, string> = {
  PENDING:    "Chưa lập",
  PROCESSING: "Đang xử lý",
  SUBMITTED:  "Đã nộp",
  OVERDUE:    "Quá hạn",
}

const LOCK_STATUS_LABELS: Record<string, string> = {
  OPEN:       "Chưa khóa",
  PARTIAL:    "Khóa một phần",
  LOCKED:     "Đã khóa",
  PROCESSING: "Đang xử lý",
  ERROR:      "Lỗi",
}

const LOCK_STATUS_STYLES: Record<string, string> = {
  OPEN:       "bg-amber-100 text-amber-700",
  PARTIAL:    "bg-blue-100  text-blue-700",
  LOCKED:     "bg-green-100 text-green-700",
  PROCESSING: "bg-purple-100 text-purple-700",
  ERROR:      "bg-red-100   text-red-700",
}

const currentYear  = new Date().getFullYear()
const currentMonth = new Date().getMonth() + 1
const yearOptions  = Array.from({ length: 6 }, (_, i) => currentYear - i)
const monthOptions = Array.from({ length: 12 }, (_, i) => ({ value: i + 1, label: `Tháng ${i + 1}` }))

function getDefaultFilter(): DashboardFilter {
  const now    = new Date()
  const year   = now.getFullYear()
  const month  = now.getMonth() + 1
  const pad    = (n: number) => String(n).padStart(2, "0")
  const fromYmd = `${year}${pad(month)}01`
  const lastDay = new Date(year, month, 0).getDate()
  const toYmd   = `${year}${pad(month)}${pad(lastDay)}`
  return {
    fromYmd,
    toYmd,
    year:     String(year),
    periodYm: `${year}${pad(month)}`,
  }
}

type KpiCardProps = {
  title: string
  value: number
  prevValue: number
  color: string
  icon: string
}

function KpiCard({ title, value, prevValue, color, icon }: KpiCardProps) {
  const change = pctChange(value, prevValue)
  const isUp   = !change.startsWith("-")
  return (
    <div className={`bg-white rounded-xl border-l-4 shadow-sm p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <span
          className={`${getDevExtremeIconClass(icon)} text-gray-400`}
          style={{ fontSize: 48, width: 48, height: 48, lineHeight: 1 }}
          aria-hidden="true"
        />
      </div>
      <div className="text-2xl font-bold text-gray-800">{fmt(value)}</div>
      {change && (
        <div className={`text-xs mt-1 font-medium ${isUp ? "text-green-600" : "text-red-500"}`}>
          {isUp ? "▲" : "▼"} {change} so với tháng trước
        </div>
      )}
    </div>
  )
}

function SectionCard({ title, children, action }: { title: string; children: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

export default function DashboardOverview() {
  const [filter, setFilter] = useState<DashboardFilter>(getDefaultFilter)
  const [selectedYear, setSelectedYear]   = useState(currentYear)
  const [selectedMonth, setSelectedMonth] = useState(currentMonth)

  const [kpi,          setKpi]          = useState<DashboardKpi | null>(null)
  const [chartData,    setChartData]    = useState<DashboardChartItem[]>([])
  const [tasks,        setTasks]        = useState<DashboardTaskItem[]>([])
  const [receivables,  setReceivables]  = useState<DashboardReceivable[]>([])
  const [payables,        setPayables]        = useState<DashboardPayable[]>([])
  const [taxDeadlines,    setTaxDeadlines]    = useState<DashboardTaxDeadline[]>([])
  const [periodLock,      setPeriodLock]      = useState<DashboardPeriodLock | null>(null)
  const [recentVouchers,  setRecentVouchers]  = useState<DashboardRecentVoucher[]>([])  
  const [voucherFilter,   setVoucherFilter]   = useState<string>("ALL")

  const [loading, setLoading] = useState(false)
  const mountedRef = useRef(true)
  const requestSeqRef = useRef(0)

  const applyFilter = useCallback(() => {
    const pad     = (n: number) => String(n).padStart(2, "0")
    const lastDay = new Date(selectedYear, selectedMonth, 0).getDate()
    const nextFilter: DashboardFilter = {
      fromYmd:  `${selectedYear}${pad(selectedMonth)}01`,
      toYmd:    `${selectedYear}${pad(selectedMonth)}${pad(lastDay)}`,
      year:     String(selectedYear),
      periodYm: `${selectedYear}${pad(selectedMonth)}`,
    }
    setFilter((previous) =>
      previous.fromYmd === nextFilter.fromYmd &&
      previous.toYmd === nextFilter.toYmd &&
      previous.year === nextFilter.year &&
      previous.periodYm === nextFilter.periodYm
        ? previous
        : nextFilter
    )
  }, [selectedYear, selectedMonth])

  const applyDashboardData = useCallback((data: DashboardOverviewData) => {
    setKpi(data.kpi)
    setChartData(data.chartData)
    setTasks(data.tasks)
    setReceivables(data.receivables)
    setPayables(data.payables)
    setTaxDeadlines(Array.isArray(data.taxDeadlines) ? data.taxDeadlines : [])
    setPeriodLock(data.periodLock)
    setRecentVouchers(Array.isArray(data.recentVouchers) ? data.recentVouchers : [])
  }, [])

  const loadAll = useCallback(async (f: DashboardFilter, forceRefresh = false) => {
    const requestSeq = requestSeqRef.current + 1
    requestSeqRef.current = requestSeq
    setLoading(true)
    try {
      const data = await getDashboardOverview(f, forceRefresh)
      if (!mountedRef.current || requestSeq !== requestSeqRef.current) {
        return
      }

      applyDashboardData(data)
    } finally {
      if (mountedRef.current && requestSeq === requestSeqRef.current) {
        setLoading(false)
      }
    }
  }, [applyDashboardData])

  useEffect(() => {
    mountedRef.current = true
    return () => {
      mountedRef.current = false
      requestSeqRef.current += 1
    }
  }, [])

  useEffect(() => {
    mountedRef.current = true
    void loadAll(filter)
  }, [filter, loadAll])

  const months12 = Array.from({ length: 12 }, (_, i) => {
    const mm     = String(i + 1).padStart(2, "0")
    const key    = `${filter.year}${mm}`
    const match  = chartData.find(d => d.Month === key)
    return {
      label:   MONTH_LABELS[mm] ?? mm,
      revenue: match?.Revenue  ?? 0,
      expense: match?.Expense  ?? 0,
      profit:  match?.Profit   ?? 0,
    }
  })

  const barChartData = {
    labels: months12.map(m => m.label),
    datasets: [
      {
        label:           "Doanh thu",
        data:            months12.map(m => m.revenue),
        backgroundColor: "rgba(37,99,235,0.75)",
        borderRadius:    4,
        maxBarThickness: 28,
      },
      {
        label:           "Chi phí",
        data:            months12.map(m => m.expense),
        backgroundColor: "rgba(220,38,38,0.65)",
        borderRadius:    4,
        maxBarThickness: 28,
      },
    ],
  }

  const lineChartData = {
    labels: months12.map(m => m.label),
    datasets: [
      {
        label:              "Lợi nhuận",
        data:               months12.map(m => m.profit),
        borderColor:        "rgba(16,185,129,1)",
        backgroundColor:    "rgba(16,185,129,0.1)",
        tension:            0.4,
        fill:               true,
        pointBackgroundColor: "rgba(16,185,129,1)",
        pointRadius:        4,
      },
    ],
  }

  const chartOptions = {
    responsive:  true,
    plugins:     { legend: { position: "top" as const }, tooltip: { enabled: true } },
    scales: {
      x: { grid: { display: false } },
      y: { beginAtZero: true, grid: { color: "#e5e7eb" } },
    },
    animation: { duration: 800 },
  }

  const lock       = periodLock
  const lockStatus = lock?.Status ?? "OPEN"

  const totalReceivables = receivables.reduce((s, r) => s + r.TotalAmount, 0)
  const overdueReceivables = receivables.reduce((s, r) => s + r.OverdueAmount, 0)
  const totalPayables    = payables.reduce((s, r) => s + r.TotalAmount, 0)
  const overduePayables  = payables.reduce((s, r) => s + r.OverdueAmount, 0)

  return (
    <div className="space-y-4 p-1">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-4 py-3">
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">Năm:</span>
            <SelectBox
              dataSource={yearOptions}
              value={selectedYear}
              onValueChanged={e => setSelectedYear(e.value as number)}
              width={90}
              stylingMode="outlined"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">Kỳ:</span>
            <SelectBox
              dataSource={monthOptions}
              displayExpr="label"
              valueExpr="value"
              value={selectedMonth}
              onValueChanged={e => setSelectedMonth(e.value as number)}
              width={110}
              stylingMode="outlined"
            />
          </div>
          <div className="flex items-center gap-1">
            <span className="text-xs text-gray-500 font-medium">Từ:</span>
            <span className="text-sm font-medium text-gray-700">{formatYmdForDisplay(filter.fromYmd)}</span>
            <span className="text-xs text-gray-400 mx-1">→</span>
            <span className="text-sm font-medium text-gray-700">{formatYmdForDisplay(filter.toYmd)}</span>
          </div>
          <Button
            text="Áp dụng"
            type="default"
            stylingMode="contained"
            onClick={applyFilter}
            icon="refresh"
          />
          <Button
            text="Làm mới"
            type="normal"
            stylingMode="outlined"
            onClick={() => void loadAll(filter, true)}
            icon="refresh"
            disabled={loading}
          />
          {loading && (
            <span className="text-xs font-medium text-blue-600">Loading...</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <KpiCard title="Tiền mặt / Ngân hàng"   value={kpi?.CashBalance    ?? 0} prevValue={0}                  color="border-blue-500"   icon="money" />
        <KpiCard title="Doanh thu kỳ"            value={kpi?.Revenue        ?? 0} prevValue={kpi?.PrevRevenue   ?? 0} color="border-green-500"  icon="chart" />
        <KpiCard title="Chi phí kỳ"              value={kpi?.Expense        ?? 0} prevValue={kpi?.PrevExpense   ?? 0} color="border-red-400"    icon="decrease" />
        <KpiCard title="Lợi nhuận tạm tính"      value={kpi?.Profit         ?? 0} prevValue={kpi?.PrevProfit    ?? 0} color="border-emerald-500" icon="increase" />
        <KpiCard title="Phải thu KH"             value={kpi?.Receivables    ?? 0} prevValue={0}                  color="border-sky-400"    icon="group" />
        <KpiCard title="Phải trả NCC"            value={kpi?.Payables       ?? 0} prevValue={0}                  color="border-orange-400" icon="card" />
        <KpiCard title="Thuế GTGT phải nộp"      value={kpi?.VatPayable     ?? 0} prevValue={0}                  color="border-violet-400" icon="percent" />
        <div className="bg-white rounded-xl border-l-4 border-amber-500 shadow-sm p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">CT chưa ghi sổ</span>
            <span
              className={`${getDevExtremeIconClass("doc")} text-gray-400`}
              style={{ fontSize: 48, width: 48, height: 48, lineHeight: 1 }}
              aria-hidden="true"
            />
          </div>
          <div className="text-3xl font-bold text-amber-600">{kpi?.PendingVouchers ?? 0}</div>
          <div className="text-xs text-gray-400 mt-1">chứng từ cần xử lý</div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title={`Doanh thu – Chi phí theo tháng (${selectedYear})`}>
          <Bar data={barChartData} options={chartOptions} height={110} />
        </SectionCard>
        <SectionCard title={`Lợi nhuận theo tháng (${selectedYear})`}>
          <Line data={lineChartData} options={chartOptions} height={110} />
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Công việc cần xử lý">
          {tasks.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Không có việc cần xử lý</p>
          ) : (
            <div className="space-y-2">
              {tasks.map((task, i) => (
                <div
                  key={i}
                  className={`flex items-center justify-between rounded-lg border-l-4 px-3 py-2 ${SEVERITY_STYLES[task.Severity] ?? SEVERITY_STYLES.info}`}
                >
                  <div>
                    <span className="text-sm font-medium">{task.Label}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-lg font-bold">{task.Count}</span>
                    {task.ActionUrl && (
                      <a
                        href={task.ActionUrl}
                        className="text-xs underline opacity-70 hover:opacity-100"
                      >
                        Xử lý
                      </a>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </SectionCard>

        <SectionCard title="Cảnh báo dữ liệu">
          <div className="space-y-2 text-sm">
            {(kpi?.PendingVouchers ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-amber-700 bg-amber-50 rounded px-3 py-2">
                <span>⚠️</span>
                <span>{kpi?.PendingVouchers} chứng từ chưa ghi sổ trong kỳ</span>
              </div>
            )}
            {(kpi?.VatPayable ?? 0) > 0 && (
              <div className="flex items-center gap-2 text-violet-700 bg-violet-50 rounded px-3 py-2">
                <span>🏛️</span>
                <span>Thuế GTGT chưa nộp: {fmtFull(kpi?.VatPayable ?? 0)} VND</span>
              </div>
            )}
            {overdueReceivables > 0 && (
              <div className="flex items-center gap-2 text-red-700 bg-red-50 rounded px-3 py-2">
                <span>🔴</span>
                <span>Phải thu quá hạn: {fmtFull(overdueReceivables)} VND</span>
              </div>
            )}
            {overduePayables > 0 && (
              <div className="flex items-center gap-2 text-orange-700 bg-orange-50 rounded px-3 py-2">
                <span>🔶</span>
                <span>Phải trả quá hạn: {fmtFull(overduePayables)} VND</span>
              </div>
            )}
            {lockStatus !== "LOCKED" && (
              <div className="flex items-center gap-2 text-blue-700 bg-blue-50 rounded px-3 py-2">
                <span>🔓</span>
                <span>Kỳ {fmtPeriod(filter.periodYm)} chưa khóa sổ</span>
              </div>
            )}
            {(kpi?.PendingVouchers ?? 0) === 0 &&
              (kpi?.VatPayable ?? 0) === 0 &&
              overdueReceivables === 0 &&
              overduePayables === 0 &&
              lockStatus === "LOCKED" && (
                <p className="text-sm text-green-600 text-center py-4">✅ Không có cảnh báo</p>
              )}
          </div>
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Công nợ phải thu"
          action={
            <div className="text-xs text-gray-500 text-right">
              <div>Tổng: <span className="font-semibold text-gray-800">{fmtFull(totalReceivables)}</span></div>
              <div>Quá hạn: <span className="font-semibold text-red-600">{fmtFull(overdueReceivables)}</span></div>
            </div>
          }
        >
          {receivables.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Không có dữ liệu</p>
          ) : (
            <DataGrid
              dataSource={receivables}
              showBorders={false}
              showColumnLines={false}
              showRowLines
              rowAlternationEnabled
              height={230}
            >
              <Scrolling mode="virtual" />
              <Paging enabled={false} />
              <Column dataField="CustomerNm"    caption="Khách hàng"       minWidth={120} />
              <Column dataField="TotalAmount"   caption="Phải thu (VND)"   dataType="number" format="#,##0" width={130} />
              <Column
                dataField="OverdueAmount"
                caption="Quá hạn (VND)"
                dataType="number"
                format="#,##0"
                width={120}
                cellRender={({ data }: { data: DashboardReceivable }) =>
                  data.OverdueAmount > 0 ? (
                    <span className="text-red-600 font-medium">{fmtFull(data.OverdueAmount)}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )
                }
              />
              <Column
                dataField="LastVoucherYmd"
                caption="Phiếu gần nhất"
                width={110}
                cellRender={({ data }: { data: DashboardReceivable }) =>
                  <span>{formatYmdForDisplay(data.LastVoucherYmd)}</span>
                }
              />
            </DataGrid>
          )}
        </SectionCard>

        <SectionCard
          title="Công nợ phải trả"
          action={
            <div className="text-xs text-gray-500 text-right">
              <div>Tổng: <span className="font-semibold text-gray-800">{fmtFull(totalPayables)}</span></div>
              <div>Quá hạn: <span className="font-semibold text-red-600">{fmtFull(overduePayables)}</span></div>
            </div>
          }
        >
          {payables.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Không có dữ liệu</p>
          ) : (
            <DataGrid
              dataSource={payables}
              showBorders={false}
              showColumnLines={false}
              showRowLines
              rowAlternationEnabled
              height={230}
            >
              <Scrolling mode="virtual" />
              <Paging enabled={false} />
              <Column dataField="VendorNm"      caption="Nhà cung cấp"     minWidth={120} />
              <Column dataField="TotalAmount"   caption="Phải trả (VND)"   dataType="number" format="#,##0" width={130} />
              <Column
                dataField="OverdueAmount"
                caption="Quá hạn (VND)"
                dataType="number"
                format="#,##0"
                width={120}
                cellRender={({ data }: { data: DashboardPayable }) =>
                  data.OverdueAmount > 0 ? (
                    <span className="text-red-600 font-medium">{fmtFull(data.OverdueAmount)}</span>
                  ) : (
                    <span className="text-gray-400">—</span>
                  )
                }
              />
              <Column
                dataField="LastVoucherYmd"
                caption="Phiếu gần nhất"
                width={110}
                cellRender={({ data }: { data: DashboardPayable }) =>
                  <span>{formatYmdForDisplay(data.LastVoucherYmd)}</span>
                }
              />
            </DataGrid>
          )}
        </SectionCard>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard title="Trạng thái khóa sổ">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Kỳ hiện tại:</span>
              <span className="font-semibold text-gray-800">{fmtPeriod(lock?.CurrentPeriod ?? filter.periodYm)}</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-600">Trạng thái:</span>
              <span className={`text-xs font-semibold px-2 py-1 rounded-full ${LOCK_STATUS_STYLES[lockStatus] ?? LOCK_STATUS_STYLES.OPEN}`}>
                {LOCK_STATUS_LABELS[lockStatus] ?? lockStatus}
              </span>
            </div>
            {lock?.Message && (
              <div className="text-xs text-red-600 bg-red-50 rounded p-2">{lock.Message}</div>
            )}
            {lock?.Steps && lock.Steps.length > 0 && (
              <div className="mt-3 space-y-1">
                {lock.Steps.map(step => (
                  <div key={step.StepCode} className="flex items-center gap-2 text-sm">
                    <span className={`w-5 h-5 rounded-full text-center text-[10px] leading-5 ${
                      step.Status === "DONE"       ? "bg-green-500 text-white"   :
                      step.Status === "PROCESSING" ? "bg-blue-400  text-white"   :
                      step.Status === "ERROR"      ? "bg-red-500   text-white"   :
                      "bg-gray-200 text-gray-500"
                    }`}>
                      {step.StepOrder}
                    </span>
                    <span className="text-gray-700 flex-1">{step.StepName}</span>
                    <span className={`text-xs ${
                      step.Status === "DONE"       ? "text-green-600"  :
                      step.Status === "PROCESSING" ? "text-blue-600"   :
                      step.Status === "ERROR"      ? "text-red-600"    :
                      "text-gray-400"
                    }`}>
                      {LOCK_STATUS_LABELS[step.Status] ?? step.Status}
                    </span>
                  </div>
                ))}
              </div>
            )}
            {(!lock?.Steps || lock.Steps.length === 0) && (
              <p className="text-xs text-gray-400 text-center py-2">Chưa có bước khóa sổ nào</p>
            )}
          </div>
        </SectionCard>

        <SectionCard title="Hạn nộp báo cáo thuế">
          {taxDeadlines.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-4">Không có dữ liệu</p>
          ) : (
            <div className="space-y-2">
              {taxDeadlines.map((item, i) => (
                <div key={i} className="flex items-center justify-between text-sm py-1 border-b border-gray-50 last:border-0">
                  <div>
                    <div className="font-medium text-gray-800">{item.ReportNm}</div>
                    <div className="text-xs text-gray-400">Kỳ: {item.Period} • Hạn: {item.DueDate}</div>
                  </div>
                  <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${TAX_STATUS_STYLES[item.Status] ?? TAX_STATUS_STYLES.PENDING}`}>
                    {TAX_STATUS_LABELS[item.Status] ?? item.Status}
                  </span>
                </div>
              ))}
            </div>
          )}
        </SectionCard>
      </div>

      <SectionCard
        title="Chứng từ gần đây"
        action={
          <div className="flex gap-1">
            {(["ALL", "PENDING", "CONFIRMED", "LOCKED"] as const).map(s => (
              <button
                key={s}
                onClick={() => setVoucherFilter(s)}
                className={`text-xs px-2 py-1 rounded-full border ${
                  voucherFilter === s
                    ? "bg-blue-600 text-white border-blue-600"
                    : "text-gray-500 border-gray-200 hover:bg-gray-100"
                }`}
              >
                {s === "ALL" ? "Tất cả" : s === "PENDING" ? "Chưa ghi" : s === "CONFIRMED" ? "Đã xác nhận" : "Đã khóa"}
              </button>
            ))}
          </div>
        }
      >
        <DataGrid
          dataSource={recentVouchers.filter(v =>
            voucherFilter === "ALL" || v.Status === voucherFilter
          )}
          showBorders={false}
          rowAlternationEnabled
          hoverStateEnabled
          height={280}
          noDataText="Không có chứng từ"
        >
          <Paging pageSize={20} />
          <Scrolling mode="virtual" />
          <Column dataField="ChitYmd" caption="Ngày CT" width={90}
            cellRender={({ data }: { data: DashboardRecentVoucher }) =>
              <span>{formatYmdForDisplay(data.ChitYmd)}</span>
            }
          />
          <Column dataField="ChitNo"   caption="Số CT"  width={110} />
          <Column dataField="ChitCd"   caption="Loại"   width={80}  />
          <Column dataField="Description" caption="Diễn giải" minWidth={160} />
          <Column dataField="Amount" caption="Số tiền" width={120} alignment="right"
            cellRender={({ data }: { data: DashboardRecentVoucher }) =>
              <span>{fmtFull(data.Amount)}</span>
            }
          />
          <Column dataField="Status" caption="Trạng thái" width={110}
            cellRender={({ data }: { data: DashboardRecentVoucher }) => {
              const styles: Record<string, string> = {
                LOCKED:    "bg-green-100 text-green-700",
                CONFIRMED: "bg-blue-100  text-blue-700",
                PENDING:   "bg-amber-100 text-amber-700",
              }
              const labels: Record<string, string> = {
                LOCKED:    "Đã khóa",
                CONFIRMED: "Đã xác nhận",
                PENDING:   "Chưa ghi sổ",
              }
              return (
                <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${styles[data.Status] ?? "bg-gray-100 text-gray-500"}`}>
                  {labels[data.Status] ?? data.Status}
                </span>
              )
            }}
          />
        </DataGrid>
      </SectionCard>
    </div>
  )
}

