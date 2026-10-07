import { useCallback, useMemo } from "react"
import { useLocation, useNavigate, useSearchParams } from "react-router-dom"
import DashboardOverview from "@/components/DashboardOverview"
import EInvoiceDashboardPanel from "@/components/EInvoiceDashboardPanel"
import { getDevExtremeIconClass } from "@/lib/devexpressIcons"
import { buildAppPath, getCompanyCdFromPathname, getCurrentCompanyCd, resolveDefaultCompanyCd } from "@/lib/login"

type DashboardTabId = "overview" | "einvoice"

const TABS: { id: DashboardTabId; label: string; icon: string }[] = [
  { id: "overview", label: "Tổng quan", icon: "home" },
  { id: "einvoice", label: "Hóa đơn chứng từ điện tử", icon: "doc" },
]

function parseTab(value: string | null): DashboardTabId {
  if (value === "einvoice" || value === "hoa-don") return "einvoice"
  return "overview"
}

function resolveCompanyCd(pathname: string): string {
  return (
    getCompanyCdFromPathname(pathname) ||
    getCompanyCdFromPathname(typeof window !== "undefined" ? window.location.pathname : "") ||
    getCurrentCompanyCd() ||
    resolveDefaultCompanyCd() ||
    ""
  )
}

export default function DashboardPage() {
  // Reading search is fine under scoped <Routes location>; writing must use full /app/{company} path
  // because LocationContext pathname is stripped to "/" and setSearchParams would navigate to "/?tab=...".
  const [searchParams] = useSearchParams()
  const location = useLocation()
  const navigate = useNavigate()
  const activeTab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams])

  const setTab = useCallback(
    (tab: DashboardTabId) => {
      const companyCd = resolveCompanyCd(location.pathname)
      const search = tab === "einvoice" ? "?tab=einvoice" : ""
      navigate(
        {
          pathname: buildAppPath(companyCd, "/"),
          search,
        },
        { replace: true },
      )
    },
    [location.pathname, navigate],
  )

  return (
    <div className="space-y-3">
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 px-2 py-1.5">
        <div className="flex flex-wrap gap-1" role="tablist" aria-label="Dashboard tabs">
          {TABS.map((tab) => {
            const selected = activeTab === tab.id
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(tab.id)}
                className={`inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg transition ${
                  selected
                    ? "bg-blue-600 text-white shadow-sm"
                    : "text-gray-600 hover:bg-gray-100"
                }`}
              >
                <span
                  className={`${getDevExtremeIconClass(tab.icon)} leading-none`}
                  style={{ fontSize: 44, width: 44, height: 44, lineHeight: 1 }}
                  aria-hidden="true"
                />
                {tab.label}
              </button>
            )
          })}
        </div>
      </div>

      {activeTab === "overview" ? <DashboardOverview /> : <EInvoiceDashboardPanel />}
    </div>
  )
}
