import { useCallback, useContext, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useWorkspaceTabRoute } from "@/components/workspaceTabs/WorkspaceTabs";
import { LanguageContext } from "@/lib/i18nLoader";
import ReportViewerShell from "./ReportViewerShell";
import { normalizeReportLanguage, type ReportLanguageCode } from "./reportLanguage";
import { buildConfiguredReportUrl, resolveReportCompanyCd } from "./reportViewerConfig";

export default function ConfiguredReportViewer() {
  const tabRoute = useWorkspaceTabRoute();
  const [searchParams, setSearchParams] = useSearchParams();
  const effectiveSearchParams = useMemo(() => {
    if (!tabRoute) {
      return searchParams;
    }

    return new URLSearchParams(tabRoute.search);
  }, [searchParams, tabRoute]);
  const companyCd = useMemo(
    () => resolveReportCompanyCd(effectiveSearchParams.get("companyCd")),
    [effectiveSearchParams],
  );
  const reportCode = useMemo(() => effectiveSearchParams.get("reportCode")?.trim() ?? "", [effectiveSearchParams]);
  const reportKey = useMemo(
    () => effectiveSearchParams.get("menuCode")?.trim() || reportCode,
    [effectiveSearchParams, reportCode],
  );
  const { lang } = useContext(LanguageContext) as { lang?: string };
  const reportLanguage = useMemo(
    () => normalizeReportLanguage(effectiveSearchParams.get("language") ?? effectiveSearchParams.get("lang") ?? lang),
    [effectiveSearchParams, lang],
  );

  const handleReportLanguageChange = useCallback(
    (nextLanguage: ReportLanguageCode) => {
      const normalizedLanguage = normalizeReportLanguage(nextLanguage);
      setSearchParams((currentParams) => {
        const nextParams = new URLSearchParams(currentParams);
        nextParams.delete("lang");
        nextParams.set("language", normalizedLanguage);
        return nextParams;
      });
    },
    [setSearchParams],
  );

  const reportUrl = useMemo(() => {
    const params: Record<string, string> = {};

    effectiveSearchParams.forEach((value, key) => {
      if (key.toLowerCase() === "companycd") {
        return;
      }

      const normalizedValue = value.trim();
      params[key] = normalizedValue;
    });

    params.language = reportLanguage;
    return buildConfiguredReportUrl(params);
  }, [companyCd, effectiveSearchParams, reportLanguage]);

  return (
    <ReportViewerShell
      companyCd={companyCd}
      reportCode={reportCode}
      reportKey={reportKey}
      reportLanguage={reportLanguage}
      reportUrl={reportUrl}
      onReportLanguageChange={handleReportLanguageChange}
    />
  );
}
