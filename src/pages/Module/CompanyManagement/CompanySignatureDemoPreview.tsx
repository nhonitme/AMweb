import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DxReportViewer, type DxReportViewerRef, RequestOptions } from "devexpress-reporting-react/dx-report-viewer"
import Callbacks from "devexpress-reporting-react/dx-report-viewer/options/Callbacks"
import "@devexpress/analytics-core/dist/css/dx-analytics.common.css"
import "@devexpress/analytics-core/dist/css/dx-analytics.light.css"
import "devexpress-reporting/dist/css/dx-webdocumentviewer.css"

import { getChits } from "@/api/voucherApi"
import type { CompanySignatureInfo } from "@/types/companySignatureInfo"
import {
  buildConfiguredReportUrl,
  configureReportViewerRequests,
  getReportViewerHost,
} from "@/pages/Reports/reportViewerConfig"
import { normalizeReportLanguage } from "@/pages/Reports/reportLanguage"

import "./companySignatureDemo.css"

type TranslateFn = (key: string, fallback?: string) => string

type CompanySignatureDemoPreviewProps = {
  signatures: CompanySignatureInfo[]
  t: TranslateFn
  language?: string
}

const DEMO_REPORT_CODE = "RECEIPT_VOUCHER"

configureReportViewerRequests()

function buildSignaturesRevision(signatures: CompanySignatureInfo[]): string {
  return signatures
    .map(
      (row) =>
        [
          row.ID,
          row.SIGN_CODE,
          row.DISPLAY_LABEL,
          row.SIGN_NAME,
          row.SIGN_TITLE,
          row.SIGN_IMAGE_URL,
          row.SORT_ORDER,
          row.IS_ACTIVE ? 1 : 0,
          row.ISDEL ? 1 : 0,
        ].join(":"),
    )
    .join("|")
}

export default function CompanySignatureDemoPreview({
  signatures,
  t,
  language,
}: CompanySignatureDemoPreviewProps) {
  const viewerRef = useRef<DxReportViewerRef | null>(null)
  const [chitId, setChitId] = useState(0)
  const [loadingSample, setLoadingSample] = useState(true)
  const [sampleError, setSampleError] = useState("")
  const [viewerRevision, setViewerRevision] = useState(0)

  const reportLanguage = useMemo(() => normalizeReportLanguage(language), [language])
  const signaturesRevision = useMemo(() => buildSignaturesRevision(signatures), [signatures])

  useEffect(() => {
    let cancelled = false

    setLoadingSample(true)
    setSampleError("")

    void getChits("AR", "RC", { pageNumber: 1, pageSize: 1 })
      .then((response) => {
        if (cancelled) {
          return
        }

        const firstId = Number(response.data?.[0]?.CHIT_ID ?? 0)
        if (!Number.isFinite(firstId) || firstId <= 0) {
          setChitId(0)
          setSampleError(
            t(
              "SIGNATURE_DEMO_NO_RECEIPT",
              "Chưa có phiếu thu mẫu để xem report. Hãy tạo ít nhất một phiếu thu (RECEIPT_VOUCHER).",
            ),
          )
          return
        }

        setChitId(firstId)
      })
      .catch((error) => {
        if (cancelled) {
          return
        }

        setChitId(0)
        const message =
          error instanceof Error
            ? error.message
            : t("SIGNATURE_DEMO_LOAD_FAILED", "Không tải được phiếu thu mẫu cho demo report.")
        setSampleError(message)
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingSample(false)
        }
      })

    return () => {
      cancelled = true
    }
  }, [t])

  // Remount real report after signature edits settle (avoid reload on every keystroke).
  useEffect(() => {
    if (chitId <= 0) {
      return
    }

    const timerId = window.setTimeout(() => {
      setViewerRevision((current) => current + 1)
    }, 700)

    return () => window.clearTimeout(timerId)
  }, [chitId, signaturesRevision])

  const reportUrl = useMemo(() => {
    if (chitId <= 0) {
      return ""
    }

    return buildConfiguredReportUrl({
      reportCode: DEMO_REPORT_CODE,
      chitId: String(chitId),
      chitIds: String(chitId),
      language: reportLanguage,
      allSignatures: "1",
      blankVoucherData: "1",
    })
  }, [chitId, reportLanguage])

  const setPreviewOptions = useCallback(() => {
    const viewerInstance = viewerRef.current?.instance()
    if (!viewerInstance || typeof viewerInstance.GetReportPreview !== "function") {
      return
    }

    const reportPreview = viewerInstance.GetReportPreview()
    if (!reportPreview) {
      return
    }

    reportPreview.zoom = 1
    reportPreview.originalZoom = 1
    reportPreview.showMultipagePreview = true
  }, [])

  const handleDocumentReady = useCallback(() => {
    setPreviewOptions()
  }, [setPreviewOptions])

  useEffect(() => {
    if (!reportUrl) {
      return
    }

    const timer = window.setTimeout(() => setPreviewOptions(), 120)
    return () => window.clearTimeout(timer)
  }, [reportUrl, setPreviewOptions, viewerRevision])

  if (loadingSample) {
    return (
      <div className="company-signature-demo company-signature-demo--empty">
        <div className="company-signature-demo__empty-card">
          <p className="company-signature-demo__empty-text">
            {t("SIGNATURE_DEMO_LOADING_SAMPLE", "Đang tải phiếu thu mẫu để xem report...")}
          </p>
        </div>
      </div>
    )
  }

  if (!reportUrl || sampleError) {
    return (
      <div className="company-signature-demo company-signature-demo--empty">
        <div className="company-signature-demo__empty-card">
          <div className="company-signature-demo__title">
            {t("SIGNATURE_DEMO_EMPTY_TITLE", "Chưa có report mẫu")}
          </div>
          <p className="company-signature-demo__empty-text">
            {sampleError ||
              t(
                "SIGNATURE_DEMO_NO_RECEIPT",
                "Chưa có phiếu thu mẫu để xem report. Hãy tạo ít nhất một phiếu thu (RECEIPT_VOUCHER).",
              )}
          </p>
        </div>
      </div>
    )
  }

  const viewerKey = `${reportUrl}::${viewerRevision}`

  return (
    <div className="company-signature-demo">
      <div className="company-signature-demo__viewer">
        <DxReportViewer
          key={viewerKey}
          ref={viewerRef}
          reportUrl={reportUrl}
          width="100%"
          height="100%"
        >
          <RequestOptions host={getReportViewerHost()} invokeAction="DXXRDV" />
          <Callbacks DocumentReady={handleDocumentReady} />
        </DxReportViewer>
      </div>
    </div>
  )
}
