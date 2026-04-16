import { fetchSetup } from "@devexpress/analytics-core/analytics-utils";
import API_BASE_URL from "@/config/apiConfig";
import { getCurrentCompanyCd } from "@/lib/login";

let reportViewerRequestsConfigured = false;

export function getReportViewerHost(): string {
  const host = API_BASE_URL.replace(/\/api\/?$/, "");
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
    if (!text) {
      return;
    }

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
