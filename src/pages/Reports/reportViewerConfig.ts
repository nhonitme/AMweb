import { fetchSetup } from "@devexpress/analytics-core/analytics-utils";
import API_BASE_URL from "@/config/apiConfig";
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login";
import { getStoredGridTemplateId } from "@/lib/sysGridColumnTemplateStorage";
import { getCurrentLang } from "@/utils/language";

/** Catalog/master PDF: columns come from sys_grid_column overlay. */
export const REPORT_TYPE_MASTER_GRID = "MASTER_GRID";
/** Accounting PDF: multi print layouts (BOOK, DEFAULT_GRID, ...). */
export const REPORT_TYPE_ACCOUNTING = "ACCOUNTING";

let reportViewerRequestsConfigured = false;
const reportViewerClientParamKeys = new Set(["companycd", "screencd", "gridid", "templateid"]);
const companyHeaderName = "X-Company-CD";

export function getReportViewerHost(): string {
  const host = API_BASE_URL.replace(/\/api\/?$/, "") || window.location.origin;
  return host.endsWith("/") ? host : `${host}/`;
}

export function configureReportViewerRequests(): void {
  if (reportViewerRequestsConfigured) {
    return;
  }

  const previousSettings = fetchSetup.fetchSettings ?? {};
  const previousBeforeSend = previousSettings.beforeSend;

  fetchSetup.fetchSettings = {
    ...previousSettings,
    beforeSend: async (settings: RequestInit) => {
      if (previousBeforeSend) {
        await previousBeforeSend(settings);
      }

      settings.credentials = "include";
      settings.mode ??= "cors";
      const companyCd = getCurrentCompanyCd().trim();
      if (companyCd) {
        const headers = new Headers(settings.headers);
        headers.set(companyHeaderName, companyCd);
        settings.headers = headers;
      }
    },
  };

  reportViewerRequestsConfigured = true;
}

export function resolveReportCompanyCd(companyCd?: string | null): string {
  const value = (companyCd ?? "").trim();
  return value || getCurrentCompanyCd() || "";
}

export function buildReportUrl(
  reportName: string,
  params: Record<string, string | number | null | undefined>,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined) {
      return;
    }

    const text = String(value).trim();
    searchParams.set(key, text);
  });

  const query = searchParams.toString();
  return query ? `${reportName}?${query}` : reportName;
}

export function buildConfiguredReportUrl(
  params: Record<string, string | number | null | undefined>,
): string {
  return buildReportUrl("configured", params);
}

export function buildReportViewerPageUrl(
  params: Record<string, string | number | null | undefined>,
): string {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (reportViewerClientParamKeys.has(key.toLowerCase())) {
      return;
    }

    if (value === null || value === undefined) {
      return;
    }

    const text = String(value).trim();
    searchParams.set(key, text);
  });

  const query = searchParams.toString();
  return `${window.location.origin}${buildAppPath(getCurrentCompanyCd(), "/report-viewer")}${query ? `?${query}` : ""}`;
}

export type MasterGridReportViewerParams = {
  reportCode: string
  menuCode: string
  gridId: string
  screenCd?: string
  templateId?: number | string | null
} & Record<string, string | number | null | undefined>

export function buildMasterGridReportViewerPageUrl(params: MasterGridReportViewerParams): string {
  const { reportCode, menuCode, gridId, screenCd: _screenCd, templateId, ...rest } = params
  const parsedTemplateId =
    typeof templateId === "number"
      ? templateId
      : typeof templateId === "string"
        ? Number.parseInt(templateId, 10)
        : Number.NaN
  const resolvedTemplateId =
    (Number.isFinite(parsedTemplateId) && parsedTemplateId > 0 ? parsedTemplateId : 0) ||
    getStoredGridTemplateId(gridId)

  const explicitLanguage = [rest.language, rest.lang].find(
    (value) => value !== null && value !== undefined && String(value).trim().length > 0,
  )

  return buildReportViewerPageUrl({
    ...rest,
    language: explicitLanguage ?? getCurrentLang(),
    reportCode,
    menuCode,
    printLayout: "DEFAULT_GRID",
    printGridId: gridId,
    printTemplateId: resolvedTemplateId > 0 ? resolvedTemplateId : undefined,
  })
}
