import { useCallback, useContext, useMemo } from "react";
import { useSearchParams } from "react-router-dom";

import { useWorkspaceTabRoute } from "@/components/workspaceTabs/WorkspaceTabs";
import { LanguageContext } from "@/lib/i18nLoader";
import ReportViewerShell from "./ReportViewerShell";
import type { ReportPageSettings } from "./ReportPageSetupPopup";
import { normalizeReportLanguage, type ReportLanguageCode } from "./reportLanguage";
import { buildConfiguredReportUrl, resolveReportCompanyCd } from "./reportViewerConfig";

function readReportPageSettings(params: URLSearchParams): ReportPageSettings {
  const orientation = params.get("printPageOrientation")?.toUpperCase();
  const paperKind = params.get("printPaperKind")?.toUpperCase();
  return {
    orientation: orientation === "AUTO" || orientation === "PORTRAIT" || orientation === "LANDSCAPE" ? orientation : "",
    paperKind: paperKind === "AUTO" || paperKind === "A4" || paperKind === "A3" ? paperKind : "",
  };
}

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

  const pageSettings = useMemo(() => readReportPageSettings(effectiveSearchParams), [effectiveSearchParams]);
  const handlePageSettingsChange = useCallback((settings: ReportPageSettings) => {
    const nextParams = new URLSearchParams(effectiveSearchParams);
    for (const [key, value] of [
      ["printPageOrientation", settings.orientation],
      ["printPaperKind", settings.paperKind],
    ]) {
      if (value) nextParams.set(key, value);
      else nextParams.delete(key);
    }
    setSearchParams(nextParams);
  }, [effectiveSearchParams, setSearchParams]);

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
      pageSettings={pageSettings}
      onPageSettingsChange={handlePageSettingsChange}
      pageSetupEnabled={effectiveSearchParams.get("printLayout")?.toUpperCase() === "DEFAULT_GRID"}
    />
  );
}
