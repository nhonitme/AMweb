import { useMemo } from "react"
import { useSearchParams } from "react-router-dom"
import DashboardOverview from "@/components/DashboardOverview"
import EInvoiceDashboardPanel from "@/components/EInvoiceDashboardPanel"

type DashboardTabId = "overview" | "einvoice"

function parseTab(value: string | null): DashboardTabId {
  if (value === "einvoice" || value === "hoa-don") return "einvoice"
  return "overview"
}

export default function DashboardPage() {
  const [searchParams] = useSearchParams()
  const activeTab = useMemo(() => parseTab(searchParams.get("tab")), [searchParams])

  return (
    <div className="space-y-3">
      {activeTab === "overview" ? <DashboardOverview /> : <EInvoiceDashboardPanel />}
    </div>
  )
}
