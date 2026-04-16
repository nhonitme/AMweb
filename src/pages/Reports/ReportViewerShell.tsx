import "@devexpress/analytics-core/dist/css/dx-analytics.common.css";
import "@devexpress/analytics-core/dist/css/dx-analytics.light.css";
import "devexpress-reporting/dist/css/dx-webdocumentviewer.css";
import { useCallback, useEffect, useRef } from "react";
import { DxReportViewer, DxReportViewerRef, RequestOptions } from "devexpress-reporting-react/dx-report-viewer";
import Callbacks from "devexpress-reporting-react/dx-report-viewer/options/Callbacks";

import { configureReportViewerRequests, getReportViewerHost } from "./reportViewerConfig";

type ReportViewerShellProps = {
  reportUrl: string;
};

configureReportViewerRequests();

export default function ReportViewerShell({ reportUrl }: ReportViewerShellProps) {
  const viewerRef = useRef<DxReportViewerRef | null>(null);

  const setPreviewOptions = useCallback(() => {
    const viewerInstance = viewerRef.current?.instance();
    if (!viewerInstance || typeof viewerInstance.GetReportPreview !== "function") {
      return;
    }

    const reportPreview = viewerInstance.GetReportPreview();
    if (!reportPreview) {
      return;
    }

    reportPreview.zoom = 1;
    reportPreview.originalZoom = 1;
    reportPreview.showMultipagePreview = false;
  }, []);

  const handleDocumentReady = useCallback(() => {
    setPreviewOptions();
  }, [setPreviewOptions]);

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewOptions(), 100);
    return () => window.clearTimeout(timer);
  }, [reportUrl, setPreviewOptions]);

  return (
    <div className="w-full h-screen">
      <DxReportViewer ref={viewerRef} reportUrl={reportUrl} width="100%" height="100%">
        <RequestOptions host={getReportViewerHost()} invokeAction="DXXRDV" />
        <Callbacks DocumentReady={handleDocumentReady} />
      </DxReportViewer>
    </div>
  );
}
