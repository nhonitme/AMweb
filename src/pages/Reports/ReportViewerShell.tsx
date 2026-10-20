import "@devexpress/analytics-core/dist/css/dx-analytics.common.css"
import "@devexpress/analytics-core/dist/css/dx-analytics.light.css"
import "devexpress-reporting/dist/css/dx-webdocumentviewer.css"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Popup from "devextreme-react/popup"
import { Settings } from "lucide-react"
import { DxReportViewer, DxReportViewerRef, RequestOptions, TemplateEngine } from "devexpress-reporting-react/dx-report-viewer"
import Callbacks from "devexpress-reporting-react/dx-report-viewer/options/Callbacks"
import { CustomAction } from "devexpress-reporting/common/customAction"
import { ActionId, ExportFormatID, PreviewElements } from "devexpress-reporting/viewer/constants"

import { useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { useMenuExportName } from "@/hooks/useMenuExportName"
import { getReportLanguageOptions, type ReportLanguageCode } from "./reportLanguage"
import ReportSignatureMappingEditor from "./ReportSignatureMappingEditor"
import ReportPageSetupPopup, { type ReportPageSettings } from "./ReportPageSetupPopup"
import { configureReportViewerRequests, getReportViewerHost, patchReportViewerSaveAs } from "./reportViewerConfig"

type ReportViewerShellProps = {
  companyCd: string
  reportCode?: string
  reportKey?: string
  reportLanguage: ReportLanguageCode
  reportUrl: string
  onReportLanguageChange: (language: ReportLanguageCode) => void
  pageSettings: ReportPageSettings
  onPageSettingsChange: (settings: ReportPageSettings) => void
  pageSetupEnabled: boolean
}

type ReportViewerToolbarAction = {
  id?: string
  text?: string
  container?: string
  imageTemplateName?: string
  clickAction?: (model?: unknown) => void
  hasSeparator?: boolean
  visible?: boolean
  disabled?: boolean
  selected?: boolean
}

type ReportViewerCustomizeActionsEventArgs = {
  Actions?: ReportViewerToolbarAction[]
  GetById?: (actionId: string) => ReportViewerToolbarAction | undefined
}

type ReportViewerCustomizeMenuActionsPayload = {
  args?: ReportViewerCustomizeActionsEventArgs
  sender?: {
    GetPreviewModel?: () => unknown
  }
}

type ReportViewerCustomizeExportOptionsPayload = {
  args?: {
    HideFormat?: (format: unknown) => void
  }
}

type ReportViewerCustomizeElementsPayload = {
  args?: {
    Elements?: Array<{ id?: string; templateName?: string }>
  }
}

const REFRESH_REPORT_ACTION_ID = "amnote-report-refresh"
const SETTINGS_ACTION_ID = "amnote-report-settings"
const SETTINGS_TEMPLATE_NAME = "amnote-report-settings-icon"

configureReportViewerRequests()

const reportViewerTemplateEngine = new TemplateEngine()
reportViewerTemplateEngine.setTemplate(SETTINGS_TEMPLATE_NAME, function SettingsToolbarIcon() {
  return <Settings aria-hidden="true" className="am-report-viewer-icon" />
})

export default function ReportViewerShell({
  companyCd,
  reportCode,
  reportKey,
  reportLanguage,
  reportUrl,
  onReportLanguageChange,
  pageSettings,
  onPageSettingsChange,
  pageSetupEnabled,
}: ReportViewerShellProps) {
  const viewerRef = useRef<DxReportViewerRef | null>(null)
  const companyLangRevision = useCompanyLangRevision()
  const languageOptions = useMemo(() => getReportLanguageOptions(), [companyLangRevision])
  const [settingsVisible, setSettingsVisible] = useState(false)
  const [signatureEditorVisible, setSignatureEditorVisible] = useState(false)
  const [languageSelectorVisible, setLanguageSelectorVisible] = useState(false)
  const [pageSetupVisible, setPageSetupVisible] = useState(false)
  const [viewerRevision, setViewerRevision] = useState(0)
  const [reportInstanceToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  )
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }
  const exportName = useMenuExportName(reportKey ?? "")

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const refreshViewer = useCallback(() => {
    setViewerRevision((current) => current + 1)
  }, [])

  const resolveExportFileName = useCallback((metadata: { contentFilename?: string | null }) => {
    const extension = metadata.contentFilename?.trim().match(/\.([a-z0-9]+)$/i)?.[1] || "pdf"
    return exportName.fileName(extension)
  }, [exportName])

  const versionedReportUrl = useMemo(() => {
    const [path, query = ""] = reportUrl.split("?", 2)
    const params = new URLSearchParams(query)
    params.set("_viewerRevision", `${reportInstanceToken}-${viewerRevision}`)
    return `${path}?${params.toString()}`
  }, [reportInstanceToken, reportUrl, viewerRevision])

  const handleSelectReportLanguage = useCallback(
    (nextLanguage: ReportLanguageCode) => {
      setLanguageSelectorVisible(false)
      onReportLanguageChange(nextLanguage)
    },
    [onReportLanguageChange],
  )

  const setPreviewOptions = useCallback(() => {
    const viewerInstance = viewerRef.current?.instance()
    if (!viewerInstance) {
      return
    }

    patchReportViewerSaveAs(viewerInstance, resolveExportFileName)

    if (typeof viewerInstance.GetReportPreview !== "function") {
      return
    }

    const reportPreview = viewerInstance.GetReportPreview()
    if (!reportPreview) {
      return
    }

    reportPreview.zoom = 1
    reportPreview.originalZoom = 1
    reportPreview.showMultipagePreview = true
  }, [resolveExportFileName])

  const handleDocumentReady = useCallback(() => {
    setPreviewOptions()
  }, [setPreviewOptions])

  useEffect(() => {
    const timer = window.setTimeout(() => setPreviewOptions(), 100)
    return () => window.clearTimeout(timer)
  }, [setPreviewOptions, versionedReportUrl])

  // exportHandler được DevExpress tạo lại mỗi khi nạp báo cáo -> phải vá lại sau mỗi lần đổi reportUrl.
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      patchReportViewerSaveAs(viewerRef.current?.instance(), resolveExportFileName)
    }, 400)

    return () => window.clearInterval(intervalId)
  }, [resolveExportFileName, versionedReportUrl])

  const handleCustomizeMenuActions = useCallback(({ args }: ReportViewerCustomizeMenuActionsPayload) => {
    const actions = args?.Actions
    if (!Array.isArray(actions)) {
      return
    }

    for (let index = actions.length - 1; index >= 0; index -= 1) {
      const itemId = actions[index]?.id
      if (
        itemId === REFRESH_REPORT_ACTION_ID ||
        itemId === SETTINGS_ACTION_ID ||
        itemId === ActionId.Design ||
        itemId === ActionId.HighlightEditingFields ||
        itemId === ActionId.PrintPage ||
        itemId === ActionId.FullScreen
      ) {
        actions.splice(index, 1)
      }
    }

    const exportAction = args?.GetById?.(ActionId.ExportTo)
    const exportActionIndex = exportAction ? actions.indexOf(exportAction) : -1
    const insertAt = exportActionIndex >= 0 ? exportActionIndex + 1 : actions.length
    actions.splice(insertAt, 0, new CustomAction({
      id: SETTINGS_ACTION_ID,
      text: t("SETTINGS", "Cài đặt"),
      container: "toolbar",
      imageTemplateName: SETTINGS_TEMPLATE_NAME,
      visible: true,
      disabled: false,
      clickAction: () => setSettingsVisible(true),
      hasSeparator: true,
    }))
  }, [t])

  const handleCustomizeExportOptions = useCallback(({ args }: ReportViewerCustomizeExportOptionsPayload) => {
    if (typeof args?.HideFormat !== "function") {
      return
    }

    Object.values(ExportFormatID)
      .filter(({ format }) => format !== ExportFormatID.PDF.format && format !== ExportFormatID.XLSX.format)
      .forEach(format => args.HideFormat?.(format))
  }, [])

  const handleCustomizeElements = useCallback(({ args }: ReportViewerCustomizeElementsPayload) => {
    const elements = args?.Elements
    if (!Array.isArray(elements)) {
      return
    }

    const rightPanelIndex = elements.findIndex(element =>
      element.id === PreviewElements.RightPanel || element.templateName === PreviewElements.RightPanel,
    )
    if (rightPanelIndex >= 0) {
      elements.splice(rightPanelIndex, 1)
    }
  }, [])

  const viewerKey = versionedReportUrl

  return (
    <div className="am-report-viewer flex h-full min-h-0 flex-col bg-slate-100">
     

      <div className="min-h-0 flex-1 bg-white">
        <DxReportViewer
          key={viewerKey}
          ref={viewerRef}
          reportUrl={versionedReportUrl}
          width="100%"
          height="100%"
          templateEngine={reportViewerTemplateEngine}
        >
          <RequestOptions host={getReportViewerHost()} invokeAction="DXXRDV" />
          <Callbacks
            CustomizeElements={handleCustomizeElements}
            CustomizeMenuActions={handleCustomizeMenuActions}
            CustomizeExportOptions={handleCustomizeExportOptions}
            DocumentReady={handleDocumentReady}
          />
        </DxReportViewer>
      </div>

      <Popup
        visible={settingsVisible}
        title={t("SETTINGS", "Cài đặt")}
        showTitle={true}
        dragEnabled={false}
        hideOnOutsideClick={true}
        showCloseButton={true}
        width={360}
        height="auto"
        maxWidth="95vw"
        onHiding={() => setSettingsVisible(false)}
      >
        <div className="space-y-2 bg-white p-4">
          {[
            { key: "signatures", label: t("EDIT_SIGNATURES", "Sửa chữ ký"), visible: Boolean(companyCd && reportKey?.trim()), open: () => setSignatureEditorVisible(true) },
            { key: "page", label: t("REPORT_PAGE_SETUP", "Cấu hình trang in"), visible: pageSetupEnabled, open: () => setPageSetupVisible(true) },
            { key: "language", label: t("REPORT_LANGUAGE_TOOLTIP", "Đổi ngôn ngữ report") + " (" + reportLanguage + ")", visible: true, open: () => setLanguageSelectorVisible(true) },
          ].filter((item) => item.visible).map((item) => (
            <button
              key={item.key}
              type="button"
              className="w-full rounded-lg border border-slate-200 px-4 py-3 text-left text-sm text-slate-700 transition hover:border-blue-300 hover:bg-blue-50 focus-visible:outline focus-visible:outline-2 focus-visible:outline-blue-600"
              onClick={() => {
                setSettingsVisible(false)
                item.open()
              }}
            >
              {item.label}
            </button>
          ))}
        </div>
      </Popup>

      <Popup
        visible={signatureEditorVisible}
        title={t("EDIT_SIGNATURES", "Sửa chữ ký")}
        showTitle={true}
        dragEnabled={false}
        hideOnOutsideClick={false}
        showCloseButton={true}
        width="min(1040px, 96vw)"
        height="min(650px, 90vh)"
        onHiding={() => setSignatureEditorVisible(false)}
      >
        <div className="h-full min-h-0 overflow-hidden bg-white">
          {reportKey ? (
            <ReportSignatureMappingEditor
              reportKey={reportKey}
              reportCode={reportCode}
              onClose={() => setSignatureEditorVisible(false)}
              onSaved={() => {
                setSignatureEditorVisible(false)
                refreshViewer()
              }}
            />
          ) : null}
        </div>
      </Popup>

      {pageSetupVisible && (
        <ReportPageSetupPopup
          settings={pageSettings}
          onClose={() => setPageSetupVisible(false)}
          onApply={(settings) => {
            setPageSetupVisible(false)
            onPageSettingsChange(settings)
          }}
        />
      )}

      <Popup
        visible={languageSelectorVisible}
        title={t("REPORT_LANGUAGE_TOOLTIP", "Đổi ngôn ngữ report")}
        showTitle={true}
        dragEnabled={false}
        hideOnOutsideClick={true}
        showCloseButton={true}
        width={360}
        height="auto"
        maxWidth={420}
        onHiding={() => setLanguageSelectorVisible(false)}
      >
        <div className="space-y-4 bg-white p-4">
          <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            {t("CURRENT_LANGUAGE", "Ngôn ngữ hiện tại")}: <span className="font-semibold text-slate-900">{reportLanguage}</span>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {languageOptions.map((option) => {
              const selected = option.code === reportLanguage

              return (
                <button
                  key={option.code}
                  type="button"
                  className={`rounded-xl border px-4 py-3 text-left transition ${
                    selected
                      ? "border-blue-600 bg-blue-50 text-blue-700 shadow-sm"
                      : "border-slate-200 bg-white text-slate-700 hover:border-blue-300 hover:bg-blue-50/40"
                  }`}
                  onClick={() => handleSelectReportLanguage(option.code)}
                >
                  <div className="text-base font-semibold">{option.label}</div>
                  <div className="mt-1 text-xs text-slate-500">{option.backendCode}</div>
                </button>
              )
            })}
          </div>
        </div>
      </Popup>
    </div>
  )
}
