type OpenReportViewer = (target: string, options?: { title?: string }) => void

let openReportViewer: OpenReportViewer | null = null

export function registerReportViewerOpener(opener: OpenReportViewer): () => void {
  openReportViewer = opener
  return () => {
    if (openReportViewer === opener) {
      openReportViewer = null
    }
  }
}

/**
 * Opens the report viewer in a new browser tab (does not replace the current page).
 *
 * Do not pass "noopener" in windowFeatures: browsers then return null even when the
 * tab opens successfully, which falsely triggers UNABLE_TO_OPEN_REPORT_VIEWER.
 * Clear opener after open to keep the same isolation.
 */
export function openReportViewerPage(targetUrl: string, _title?: string): boolean {
  if (typeof window === "undefined") {
    return false
  }

  if (openReportViewer) {
    openReportViewer(targetUrl, _title?.trim() ? { title: _title.trim() } : undefined)
    return true
  }

  const viewerWindow = window.open(targetUrl, "_blank")
  if (!viewerWindow) {
    return false
  }

  try {
    viewerWindow.opener = null
  } catch {
    // Ignore if the browser disallows clearing opener.
  }

  return true
}
