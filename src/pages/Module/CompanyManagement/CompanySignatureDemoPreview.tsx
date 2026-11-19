import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { DxReportViewer, type DxReportViewerRef, RequestOptions } from "devexpress-reporting-react/dx-report-viewer"
import Callbacks from "devexpress-reporting-react/dx-report-viewer/options/Callbacks"
import { PreviewElements } from "devexpress-reporting/viewer/constants"
import "@devexpress/analytics-core/dist/css/dx-analytics.common.css"
import "@devexpress/analytics-core/dist/css/dx-analytics.light.css"
import "devexpress-reporting/dist/css/dx-webdocumentviewer.css"

import { getChits } from "@/api/voucherApi"
import {
  buildConfiguredReportUrl,
  configureReportViewerRequests,
  getReportViewerHost,
} from "@/pages/Reports/reportViewerConfig"
import { normalizeReportLanguage } from "@/pages/Reports/reportLanguage"

import "./companySignatureDemo.css"

type TranslateFn = (key: string, fallback?: string) => string

type CompanySignatureDemoPreviewProps = {
  previewToken: number
  t: TranslateFn
  language?: string
}

type CustomizeElementsPayload = {
  args?: {
    Elements?: Array<{ id?: string; templateName?: string }>
  }
}

const DEMO_REPORT_CODE = "RECEIPT_VOUCHER"

configureReportViewerRequests()

export default function CompanySignatureDemoPreview({
  previewToken,
  t,
  language,
}: CompanySignatureDemoPreviewProps) {
  const viewerRef = useRef<DxReportViewerRef | null>(null)
  const [chitId, setChitId] = useState(0)
  const [loadingSample, setLoadingSample] = useState(true)
  const [sampleError, setSampleError] = useState("")

  const reportLanguage = useMemo(() => normalizeReportLanguage(language), [language])

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

  const handleCustomizeElements = useCallback(({ args }: CustomizeElementsPayload) => {
    const elements = args?.Elements
    if (!Array.isArray(elements)) {
      return
    }

    for (let index = elements.length - 1; index >= 0; index -= 1) {
      const element = elements[index]
      const id = element?.id ?? element?.templateName
      if (id === PreviewElements.Toolbar || id === PreviewElements.RightPanel) {
        elements.splice(index, 1)
      }
    }
  }, [])

  useEffect(() => {
    if (!reportUrl) {
      return
    }

    const timer = window.setTimeout(() => setPreviewOptions(), 120)
    return () => window.clearTimeout(timer)
  }, [reportUrl, setPreviewOptions, previewToken])

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

  const viewerKey = `${reportUrl}::${previewToken}`

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
          <Callbacks
            CustomizeElements={handleCustomizeElements}
            DocumentReady={handleDocumentReady}
          />
        </DxReportViewer>
      </div>
    </div>
  )
}
