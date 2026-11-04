import { useCallback, useContext, useMemo } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"

import ReportFormulaOptionsPopup from "@/components/reports/ReportFormulaOptionsPopup"
import { useWorkspaceTabRoute, useWorkspaceTabs } from "@/components/workspaceTabs/WorkspaceTabs"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login"

export default function ReportFormulaOptionsPage() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const tabRoute = useWorkspaceTabRoute()
  const { closeTab } = useWorkspaceTabs()

  const reportCode = useMemo(() => searchParams.get("reportCode")?.trim() || "", [searchParams])
  const reportVersion = useMemo(() => searchParams.get("reportVersion")?.trim() || "2025", [searchParams])
  const previewParams = useMemo(() => ({
    previewReportCode: searchParams.get("previewReportCode")?.trim()
      || searchParams.get("reportCode")?.trim()
      || "",
    fromYmd: searchParams.get("fromYmd")?.trim() || "",
    toYmd: searchParams.get("toYmd")?.trim() || "",
    unitDivisor: searchParams.get("unitDivisor")?.trim() || "1",
    menuCode: searchParams.get("menuCode")?.trim() || "",
  }), [searchParams])

  const handleClose = useCallback(() => {
    if (tabRoute?.tabId) {
      closeTab(tabRoute.tabId)
      return
    }

    // Workspace tabs disabled / deep-link without a tab: stay in-app instead of window.close().
    if (typeof window !== "undefined" && window.history.length > 1) {
      navigate(-1)
      return
    }

    navigate(buildAppPath(getCurrentCompanyCd(), "/"), { replace: true })
  }, [closeTab, navigate, tabRoute?.tabId])

  const handleSaved = useCallback(() => {
    // Save already notifies inside the editor.
  }, [])

  if (!reportCode) {
    return (
      <DxPage>
        <div className="flex h-full items-center justify-center p-6 text-sm text-slate-600">
          {t("REPORT_CODE_REQUIRED", "Thiếu mã báo cáo (reportCode) để mở thiết lập công thức.")}
        </div>
      </DxPage>
    )
  }

  return (
    <DxPage>
      <ReportFormulaOptionsPopup
        layout="page"
        visible={true}
        reportCode={reportCode}
        reportVersion={reportVersion}
        previewParams={previewParams}
        onClose={handleClose}
        onSaved={handleSaved}
      />
    </DxPage>
  )
}
