import { useCallback, useContext, useMemo } from "react"
import { useSearchParams } from "react-router-dom"

import ReportFormulaOptionsPopup from "@/components/reports/ReportFormulaOptionsPopup"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"

function closeFormulaOptionsTab() {
  if (typeof window === "undefined") {
    return
  }

  window.close()
  // If the browser keeps the tab (no opener / policy), fall back to history.
  window.setTimeout(() => {
    if (!window.closed) {
      window.history.back()
    }
  }, 100)
}

export default function ReportFormulaOptionsPage() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const [searchParams] = useSearchParams()

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
      <div className="h-full min-h-0 bg-slate-50">
        <ReportFormulaOptionsPopup
          layout="page"
          visible={true}
          reportCode={reportCode}
          reportVersion={reportVersion}
          previewParams={previewParams}
          onClose={closeFormulaOptionsTab}
          onSaved={handleSaved}
        />
      </div>
    </DxPage>
  )
}
