import { useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import ReportViewerShell from "./ReportViewerShell";
import { buildConfiguredReportUrl, resolveReportCompanyCd } from "./reportViewerConfig";

export default function ConfiguredReportViewer() {
  const [searchParams] = useSearchParams();

  const reportUrl = useMemo(() => {
    const params: Record<string, string> = {};

    searchParams.forEach((value, key) => {
      const normalizedValue = value.trim();
      if (!normalizedValue) {
        return;
      }

      params[key] = normalizedValue;
    });

    params.companyCd = resolveReportCompanyCd(searchParams.get("companyCd"));
    return buildConfiguredReportUrl(params);
  }, [searchParams]);

  return <ReportViewerShell reportUrl={reportUrl} />;
}
