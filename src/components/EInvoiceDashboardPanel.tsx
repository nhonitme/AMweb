import { useCallback, useEffect, useMemo, useState, type ReactNode } from "react"
import { useLocation, useNavigate } from "react-router-dom"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import Button from "devextreme-react/button"
import { getEInvoicesPaged } from "@/api/einvoiceApi"
import {
  getSigningPluginCertificates,
  type EInvoicePluginCertificate,
} from "@/api/einvoiceSigningPluginApi"
import { getDevExtremeIconClass } from "@/lib/devexpressIcons"
import { buildAppPath, getCompanyCdFromPathname, getCurrentCompanyCd, resolveDefaultCompanyCd } from "@/lib/login"
import { formatDateToYmd } from "@/pages/Accounting/accountingDateUtils"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"

function fmtNum(n: number | null | undefined): string {
  if (n == null || !Number.isFinite(n)) return "—"
  return new Intl.NumberFormat("vi-VN").format(n)
}

function formatDateTimeVi(value: string): string {
  const text = String(value ?? "").trim()
  if (!text) return "—"
  const date = new Date(text)
  if (Number.isNaN(date.getTime())) {
    return text.length >= 19 ? text.slice(0, 19).replace("T", " ") : text
  }
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(date.getDate())}/${pad(date.getMonth() + 1)}/${date.getFullYear()} ${pad(date.getHours())}:${pad(date.getMinutes())}:${pad(date.getSeconds())}`
}

function formatIssuerName(issuer: string): string {
  const match = issuer.match(/(?:^|[,\n]\s*)CN=([^,\n]+)/i)
  return match ? match[1].trim() : issuer.trim() || "—"
}

function getDaysUntilExpiry(notAfter: string): number | null {
  const text = String(notAfter ?? "").trim()
  if (!text) return null
  const expiry = new Date(text.length >= 10 ? text.slice(0, 10) : text)
  if (Number.isNaN(expiry.getTime())) return null
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  expiry.setHours(0, 0, 0, 0)
  return Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))
}

function startOfWeek(date: Date): Date {
  const d = new Date(date)
  const day = d.getDay()
  const diff = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diff)
  d.setHours(0, 0, 0, 0)
  return d
}

function quarterStart(date: Date): Date {
  const month = date.getMonth()
  const qStart = Math.floor(month / 3) * 3
  return new Date(date.getFullYear(), qStart, 1)
}

type QuickLink = {
  id: string
  label: string
  hint: string
  path: string
  icon: string
  tone: string
}

function DxIcon({ name, className = "", size }: { name: string; className?: string; size?: number }) {
  return (
    <span
      className={`${getDevExtremeIconClass(name)} ${className}`.trim()}
      style={size ? { fontSize: size, width: size, height: size, lineHeight: 1 } : undefined}
      aria-hidden="true"
    />
  )
}

function SectionCard({
  title,
  children,
  action,
}: {
  title: string
  children: ReactNode
  action?: ReactNode
}) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
      <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-gray-100">
        <h2 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">{title}</h2>
        {action}
      </div>
      <div className="p-4">{children}</div>
    </div>
  )
}

function StatCard({
  title,
  value,
  icon,
  color,
  loading,
}: {
  title: string
  value: string
  icon: string
  color: string
  loading?: boolean
}) {
  return (
    <div className={`bg-white rounded-xl border-l-4 shadow-sm p-4 ${color}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">{title}</span>
        <DxIcon name={icon} size={48} className="text-gray-400" />
      </div>
      <div className="text-2xl font-bold text-gray-800">{loading ? "…" : value}</div>
    </div>
  )
}

export default function EInvoiceDashboardPanel() {
  const navigate = useNavigate()
  const location = useLocation()
  const companyCd =
    getCompanyCdFromPathname(location.pathname) ||
    getCompanyCdFromPathname(typeof window !== "undefined" ? window.location.pathname : "") ||
    getCurrentCompanyCd() ||
    resolveDefaultCompanyCd() ||
    ""

  const [stats, setStats] = useState({ week: null as number | null, month: null as number | null, quarter: null as number | null })
  const [statsLoading, setStatsLoading] = useState(false)
  const [certificate, setCertificate] = useState<EInvoicePluginCertificate | null>(null)
  const [certLoading, setCertLoading] = useState(false)
  const [certDetailOpen, setCertDetailOpen] = useState(false)

  const go = useCallback(
    (path: string) => {
      navigate(buildAppPath(companyCd, path))
    },
    [companyCd, navigate],
  )

  const periodLabels = useMemo(() => {
    const now = new Date()
    const month = String(now.getMonth() + 1).padStart(2, "0")
    const year = now.getFullYear()
    const quarter = Math.floor(now.getMonth() / 3) + 1
    return {
      month: `Tháng ${month}/${year}`,
      quarter: `Quý ${quarter}/${year}`,
    }
  }, [])

  const quickLinks: QuickLink[] = useMemo(
    () => [
      {
        id: "create",
        label: "Tạo hóa đơn",
        hint: "Lập hóa đơn mới",
        path: "/einvoice/manage?action=create",
        icon: "plus",
        tone: "bg-blue-50 text-blue-600 ring-blue-100",
      },
      {
        id: "manage",
        label: "Quản lý hóa đơn",
        hint: "Danh sách & phát hành",
        path: "/einvoice/manage",
        icon: "doc",
        tone: "bg-emerald-50 text-emerald-600 ring-emerald-100",
      },
      {
        id: "error-notice",
        label: "Thông báo sai sót",
        hint: "Xử lý sai sót HĐ",
        path: "/einvoice/error-notice",
        icon: "warning",
        tone: "bg-amber-50 text-amber-600 ring-amber-100",
      },
      {
        id: "declaration",
        label: "Đăng ký tờ khai",
        hint: "Tờ khai đăng ký",
        path: "/einvoice/declaration",
        icon: "textdocument",
        tone: "bg-violet-50 text-violet-600 ring-violet-100",
      },
    ],
    [],
  )

  const loadStats = useCallback(async () => {
    setStatsLoading(true)
    try {
      const now = new Date()
      const weekFrom = startOfWeek(now)
      const monthFrom = new Date(now.getFullYear(), now.getMonth(), 1)
      const qFrom = quarterStart(now)
      const toYmd = formatDateToYmd(now) ?? undefined

      const [weekRes, monthRes, quarterRes] = await Promise.all([
        getEInvoicesPaged({ pageNumber: 1, pageSize: 1, fromYmd: formatDateToYmd(weekFrom) ?? undefined, toYmd, includeDetails: false }),
        getEInvoicesPaged({ pageNumber: 1, pageSize: 1, fromYmd: formatDateToYmd(monthFrom) ?? undefined, toYmd, includeDetails: false }),
        getEInvoicesPaged({ pageNumber: 1, pageSize: 1, fromYmd: formatDateToYmd(qFrom) ?? undefined, toYmd, includeDetails: false }),
      ])

      setStats({
        week: weekRes.totalRecords,
        month: monthRes.totalRecords,
        quarter: quarterRes.totalRecords,
      })
    } catch {
      setStats({ week: null, month: null, quarter: null })
    } finally {
      setStatsLoading(false)
    }
  }, [])

  const loadCertificate = useCallback(async () => {
    setCertLoading(true)
    try {
      const list = await getSigningPluginCertificates()
      const active = list.find((c) => !c.isExpired) ?? list[0] ?? null
      setCertificate(active)
    } catch {
      setCertificate(null)
    } finally {
      setCertLoading(false)
    }
  }, [])

  const refreshAll = useCallback(() => {
    void loadStats()
    void loadCertificate()
  }, [loadStats, loadCertificate])

  useEffect(() => {
    refreshAll()
  }, [refreshAll])

  const daysLeft = certificate ? getDaysUntilExpiry(certificate.notAfter) : null
  const certExpiringSoon = daysLeft !== null && daysLeft >= 0 && daysLeft <= 30
  const certExpired = daysLeft !== null && daysLeft < 0
  const issuerLabel = certificate
    ? `${formatIssuerName(certificate.issuer)}${certificate.providerName ? ` · ${certificate.providerName}` : ""}`
    : ""

  const loading = statsLoading || certLoading
  const certStatusIcon = certExpired || certExpiringSoon ? "warning" : "key"

  return (
    <div className="space-y-4 p-1">
      <div className="flex flex-wrap items-center justify-end gap-2">
        <Button
          text="Làm mới"
          type="normal"
          stylingMode="outlined"
          icon="refresh"
          onClick={refreshAll}
          disabled={loading}
        />
        {loading ? <span className="text-xs font-medium text-blue-600">Đang tải...</span> : null}
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <StatCard
          title="Trong tuần"
          value={fmtNum(stats.week)}
          icon="doc"
          color="border-blue-500"
          loading={statsLoading}
        />
        <StatCard
          title={periodLabels.month}
          value={fmtNum(stats.month)}
          icon="textdocument"
          color="border-emerald-500"
          loading={statsLoading}
        />
        <StatCard
          title={periodLabels.quarter}
          value={fmtNum(stats.quarter)}
          icon="event"
          color="border-violet-500"
          loading={statsLoading}
        />
        <StatCard
          title="Hạn chữ ký số"
          value={daysLeft == null ? "—" : `${fmtNum(daysLeft)} ngày`}
          icon={certStatusIcon}
          color={certExpired ? "border-red-500" : certExpiringSoon ? "border-amber-500" : "border-sky-500"}
          loading={certLoading}
        />
      </div>

      <SectionCard title="Truy cập nhanh">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {quickLinks.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => go(item.path)}
              className="group flex items-start gap-3 rounded-xl border border-gray-200 bg-white px-4 py-4 text-left transition hover:border-blue-200 hover:bg-blue-50/40 hover:shadow-sm"
            >
              <span className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg ring-1 ${item.tone}`}>
                <DxIcon name={item.icon} size={44} />
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-gray-800 group-hover:text-blue-700">{item.label}</span>
                <span className="mt-0.5 block text-xs text-gray-500">{item.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </SectionCard>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <SectionCard
          title="Trạng thái sử dụng"
          action={
            <button
              type="button"
              onClick={() => go("/einvoice/setting")}
              className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
            >
              Chi tiết
            </button>
          }
        >
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-4 py-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Hóa đơn còn lại</div>
              <div className="mt-2 text-2xl font-bold text-gray-800">— / —</div>
              <div className="mt-1 text-xs text-gray-500">Số lượng còn lại / Tổng khả dụng</div>
            </div>
            <div className="rounded-xl border border-gray-100 bg-slate-50/80 px-4 py-4">
              <div className="text-xs font-medium text-gray-500 uppercase tracking-wide">Chứng từ khấu trừ thuế</div>
              <div className="mt-2 text-2xl font-bold text-gray-800">—</div>
              <div className="mt-1 text-xs text-gray-500">Thời hạn sử dụng</div>
            </div>
          </div>
        </SectionCard>

        <SectionCard
          title="Chữ ký số"
          action={
            certificate ? (
              <button
                type="button"
                onClick={() => setCertDetailOpen(true)}
                className="text-xs font-medium text-blue-600 hover:text-blue-700 hover:underline"
              >
                Chi tiết
              </button>
            ) : null
          }
        >
          {certLoading ? (
            <p className="text-sm text-gray-400 text-center py-6">Đang tải chứng thư số...</p>
          ) : certificate ? (
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 px-4 py-4">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-lg bg-violet-100 text-violet-600 ring-1 ring-violet-200">
                  <DxIcon name="key" size={44} />
                </span>
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="text-sm font-semibold text-gray-800 break-all">
                    {certificate.serialNumber || certificate.thumbprint}
                  </div>
                  <div className="text-xs text-gray-600">{issuerLabel}</div>
                  <div className="text-xs text-gray-500">
                    Hiệu lực: {formatDateTimeVi(certificate.notBefore)} → {formatDateTimeVi(certificate.notAfter)}
                  </div>
                  <div
                    className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${
                      certExpired
                        ? "bg-red-100 text-red-700"
                        : certExpiringSoon
                          ? "bg-amber-100 text-amber-700"
                          : "bg-emerald-100 text-emerald-700"
                    }`}
                  >
                    {certExpired ? "Đã hết hạn" : certExpiringSoon ? "Sắp hết hạn" : "Còn hiệu lực"}
                    <span>·</span>
                    <span>{daysLeft == null ? "—" : `${fmtNum(daysLeft)} ngày`}</span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="rounded-xl border border-dashed border-gray-200 bg-gray-50 px-4 py-6 text-center">
              <DxIcon name="warning" size={64} className="text-gray-300" />
              <p className="mt-2 text-sm text-gray-500">
                Không tìm thấy chữ ký số. Hãy mở AMNOTE Signing Plugin và chọn chứng thư.
              </p>
            </div>
          )}
        </SectionCard>
      </div>

      <p className="text-xs text-gray-400 px-1">* Số liệu được thống kê đến thời điểm hiện tại</p>

      <Popup
        visible={certDetailOpen && !!certificate}
        title="Chi tiết chữ ký số"
        showTitle
        showCloseButton={false}
        dragEnabled={false}
        resizeEnabled={false}
        hideOnOutsideClick
        width="min(560px, 92vw)"
        height="auto"
        maxHeight="min(680px, 88vh)"
        animation={POPUP_FADE_ANIMATION}
        onHiding={() => setCertDetailOpen(false)}
      >
        <ToolbarItem
          toolbar="top"
          location="after"
          render={() => (
            <Button icon="close" stylingMode="text" hint="Đóng" onClick={() => setCertDetailOpen(false)} />
          )}
        />
        {certificate ? (
          <div className="flex flex-col gap-3 p-4 text-sm text-slate-800">
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Serial</div>
              <div className="mt-1 break-all font-medium">{certificate.serialNumber || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Subject</div>
              <div className="mt-1 break-all">{certificate.subject || "—"}</div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Issuer</div>
              <div className="mt-1 break-all">{certificate.issuer || "—"}</div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Hiệu lực từ</div>
                <div className="mt-1">{formatDateTimeVi(certificate.notBefore)}</div>
              </div>
              <div>
                <div className="text-xs uppercase tracking-wide text-slate-400">Đến</div>
                <div className="mt-1">{formatDateTimeVi(certificate.notAfter)}</div>
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-wide text-slate-400">Thumbprint</div>
              <div className="mt-1 break-all font-mono text-xs">{certificate.thumbprint || "—"}</div>
            </div>
          </div>
        ) : null}
      </Popup>
    </div>
  )
}
