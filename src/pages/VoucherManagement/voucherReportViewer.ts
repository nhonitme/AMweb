import notify from "devextreme/ui/notify"

import { openReportViewerPage } from "@/pages/Reports/openReportViewerPage"
import { buildReportViewerPageUrl } from "@/pages/Reports/reportViewerConfig"
import { getCurrentCompanyCd } from "@/lib/login"

export type OpenVoucherReportViewerOptions = {
  reportCode: string
  chitIds: readonly number[]
  companyCd?: string
  notifyUnableToOpen?: (message: string) => void
}

export function openVoucherReportViewer({
  reportCode,
  chitIds,
  companyCd,
  notifyUnableToOpen,
}: OpenVoucherReportViewerOptions): boolean {
  const normalizedIds = chitIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0)

  if (!normalizedIds.length) {
    return false
  }

  const resolvedCompanyCd = (companyCd ?? getCurrentCompanyCd()).trim()
  const params: Record<string, string> = {
    reportCode: reportCode.trim(),
    chitId: String(normalizedIds[0]),
    chitIds: normalizedIds.join(","),
  }

  if (resolvedCompanyCd) {
    params.companyCd = resolvedCompanyCd
  }

  const targetUrl = buildReportViewerPageUrl(params)
  if (!openReportViewerPage(targetUrl)) {
    const message = "Unable to open report viewer"
    if (notifyUnableToOpen) {
      notifyUnableToOpen(message)
    } else {
      notify(message, "error", 3000)
    }
    return false
  }

  return true
}
