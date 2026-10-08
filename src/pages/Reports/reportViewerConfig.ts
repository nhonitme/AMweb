import { fetchSetup } from "@devexpress/analytics-core/analytics-utils";
import API_BASE_URL from "@/config/apiConfig";
import { downloadBlobFile } from "@/lib/fileUtils";
import { buildAppPath, getCurrentCompanyCd } from "@/lib/login";
import { getStoredGridTemplateId } from "@/lib/sysGridColumnTemplateStorage";
import { getCurrentLang } from "@/utils/language";

export const REPORT_TYPE_MASTER_GRID = "MASTER_GRID";
export const REPORT_TYPE_ACCOUNTING = "ACCOUNTING";

type ReportExportFileMetadata = {
  url?: string | null;
  contentFilename?: string | null;
  contentType?: string | null;
  contentLength?: number | null;
};

type ReportExportHandler = {
  _handleFile?: (fileMetadata: ReportExportFileMetadata, urlApi?: ReportExportUrlApi) => void;
  __amnoteSaveAsPatched?: boolean;
};

type ReportExportUrlApi = {
  revokeObjectURL: (url: string) => void;
};

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

// Override DevExpress export to use the shared Save As flow.
export function patchReportViewerSaveAs(viewerInstance: unknown): boolean {
  const candidates = collectExportHandlerCandidates(viewerInstance);
  const handler = candidates.find(
    (item) => typeof (item as ReportExportHandler | undefined)?._handleFile === "function",
  ) as ReportExportHandler | undefined;

  if (!handler || typeof handler._handleFile !== "function") {
    return false;
  }

  if (handler.__amnoteSaveAsPatched) {
    return true;
  }

  const previousHandleFile = handler._handleFile;

  handler._handleFile = (fileMetadata: ReportExportFileMetadata, urlApi?: ReportExportUrlApi) => {
    const url = fileMetadata?.url;
    if (!url) {
      return;
    }
    void fetch(url)
      .then((response) => response.blob())
      .then((blob) => {
        urlApi?.revokeObjectURL(url);
        return downloadBlobFile(blob, resolveExportFileName(fileMetadata));
      })
      .catch(() => {
        previousHandleFile?.call(handler, fileMetadata, urlApi);
      });
  };

  handler.__amnoteSaveAsPatched = true;
  return true;
}

function resolveExportFileName(fileMetadata: ReportExportFileMetadata): string {
  const contentFilename = fileMetadata?.contentFilename?.trim();
  return contentFilename && contentFilename.length > 0 ? contentFilename : "report";
}

function collectExportHandlerCandidates(viewerInstance: unknown): Array<unknown> {
  if (!viewerInstance || typeof viewerInstance !== "object") {
    return [];
  }

  const root = viewerInstance as Record<string, unknown>;
  const candidates: Array<unknown> = [root.exportHandler];

  for (const key of ["previewModel", "reportPreview", "_previewModel", "_reportPreview", "preview"]) {
    const nested = root[key];
    if (!nested || typeof nested !== "object") {
      continue;
    }

    const nestedRecord = nested as Record<string, unknown>;
    candidates.push(nestedRecord.exportHandler);

    for (const innerKey of ["reportPreview", "_reportPreview"]) {
      const inner = nestedRecord[innerKey];
      if (inner && typeof inner === "object") {
        candidates.push((inner as Record<string, unknown>).exportHandler);
      }
    }
  }

  return candidates;
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
