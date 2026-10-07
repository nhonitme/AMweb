import "@devexpress/analytics-core/dist/css/dx-analytics.common.css"
import "@devexpress/analytics-core/dist/css/dx-analytics.light.css"
import "devexpress-reporting/dist/css/dx-webdocumentviewer.css"
import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Popup from "devextreme-react/popup"
import { DxReportViewer, DxReportViewerRef, RequestOptions, TemplateEngine } from "devexpress-reporting-react/dx-report-viewer"
import Callbacks from "devexpress-reporting-react/dx-report-viewer/options/Callbacks"
import { CustomAction } from "devexpress-reporting/common/customAction"
import { ActionId } from "devexpress-reporting/viewer/constants"

import { useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { getReportLanguageOptions, normalizeReportLanguage, type ReportLanguageCode } from "./reportLanguage"
import ReportSignatureMappingEditor from "./ReportSignatureMappingEditor"
import { configureReportViewerRequests, getReportViewerHost } from "./reportViewerConfig"

type ReportViewerShellProps = {
  companyCd: string
  reportCode?: string
  reportKey?: string
  reportLanguage: ReportLanguageCode
  reportUrl: string
  onReportLanguageChange: (language: ReportLanguageCode) => void
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

const REFRESH_REPORT_ACTION_ID = "amnote-report-refresh"
const EDIT_SIGNATURES_ACTION_ID = "amnote-report-edit-signatures"
const REPORT_LANGUAGE_ACTION_ID = "amnote-report-language"
const REFRESH_TEMPLATE_NAME = "amnote-report-refresh-icon"
const EDIT_SIGNATURES_TEMPLATE_NAME = "amnote-report-edit-signatures-icon"
const LANGUAGE_TEMPLATE_NAME_VI = "amnote-report-language-icon-vi"
const LANGUAGE_TEMPLATE_NAME_EN = "amnote-report-language-icon-en"
const LANGUAGE_TEMPLATE_NAME_KOR = "amnote-report-language-icon-kor"
const LANGUAGE_TEMPLATE_NAME_JPN = "amnote-report-language-icon-jpn"
const LANGUAGE_TEMPLATE_NAME_THA = "amnote-report-language-icon-tha"
const LANGUAGE_TEMPLATE_NAME_CHN = "amnote-report-language-icon-chn"

configureReportViewerRequests()

const reportViewerTemplateEngine = new TemplateEngine()

function createReportLanguageToolbarIcon(label: string) {
  return function ReportLanguageToolbarIcon() {
    const fontSize = label.length > 2 ? 4.6 : 6.25

    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path
          className="dxd-icon-fill"
          d="M12 2a10 10 0 1 0 10 10A10 10 0 0 0 12 2Zm6.9 9h-2.1a15 15 0 0 0-1.6-5 8.1 8.1 0 0 1 3.7 5ZM12 4.1c1.1 1.3 2 3.9 2.4 6.9H9.6c.4-3 1.3-5.6 2.4-6.9ZM8.8 6a15 15 0 0 0-1.6 5H5.1a8.1 8.1 0 0 1 3.7-5Zm-3.7 7h2.1a15 15 0 0 0 1.6 5 8.1 8.1 0 0 1-3.7-5Zm6.9 6.9c-1.1-1.3-2-3.9-2.4-6.9h4.8c-.4 3-1.3 5.6-2.4 6.9Zm3.2-1.9a15 15 0 0 0 1.6-5h2.1a8.1 8.1 0 0 1-3.7 5Z"
        />
        <rect x="3" y="13.2" width="18" height="7" rx="3.5" fill="currentColor" opacity="0.18" />
        <text
          x="12"
          y="18.4"
          textAnchor="middle"
          fontSize={fontSize}
          fontWeight="700"
          fill="currentColor"
        >
          {label}
        </text>
      </svg>
    )
  }
}

reportViewerTemplateEngine.setTemplate(REFRESH_TEMPLATE_NAME, function RefreshToolbarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="dxd-icon-fill"
        d="M12 4a8 8 0 0 1 7.2 4.5V6h2v6h-6v-2h2.8A6 6 0 1 0 18 15h2a8 8 0 1 1-8-11Z"
      />
    </svg>
  )
})

reportViewerTemplateEngine.setTemplate(EDIT_SIGNATURES_TEMPLATE_NAME, function EditSignaturesToolbarIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        className="dxd-icon-fill"
        d="m3 17.3 8.9-8.9 3.7 3.7-8.9 8.9H3v-3.7Zm10.3-10.4 1.3-1.3a2 2 0 0 1 2.8 0l1 1a2 2 0 0 1 0 2.8l-1.3 1.3-3.8-3.8Z"
      />
    </svg>
  )
})

reportViewerTemplateEngine.setTemplate(LANGUAGE_TEMPLATE_NAME_VI, createReportLanguageToolbarIcon("VI"))
reportViewerTemplateEngine.setTemplate(LANGUAGE_TEMPLATE_NAME_EN, createReportLanguageToolbarIcon("EN"))
reportViewerTemplateEngine.setTemplate(LANGUAGE_TEMPLATE_NAME_KOR, createReportLanguageToolbarIcon("KOR"))
reportViewerTemplateEngine.setTemplate(LANGUAGE_TEMPLATE_NAME_JPN, createReportLanguageToolbarIcon("JPN"))
reportViewerTemplateEngine.setTemplate(LANGUAGE_TEMPLATE_NAME_THA, createReportLanguageToolbarIcon("THA"))
reportViewerTemplateEngine.setTemplate(LANGUAGE_TEMPLATE_NAME_CHN, createReportLanguageToolbarIcon("CHN"))

const languageTemplateNames: Record<ReportLanguageCode, string> = {
  VIET: LANGUAGE_TEMPLATE_NAME_VI,
  ENG: LANGUAGE_TEMPLATE_NAME_EN,
  KOR: LANGUAGE_TEMPLATE_NAME_KOR,
  JPN: LANGUAGE_TEMPLATE_NAME_JPN,
  THA: LANGUAGE_TEMPLATE_NAME_THA,
  CHN: LANGUAGE_TEMPLATE_NAME_CHN,
}

export default function ReportViewerShell({
  companyCd,
  reportCode,
  reportKey,
  reportLanguage,
  reportUrl,
  onReportLanguageChange,
}: ReportViewerShellProps) {
  const viewerRef = useRef<DxReportViewerRef | null>(null)
  const companyLangRevision = useCompanyLangRevision()
  const languageOptions = useMemo(() => getReportLanguageOptions(), [companyLangRevision])
  const [signatureEditorVisible, setSignatureEditorVisible] = useState(false)
  const [languageSelectorVisible, setLanguageSelectorVisible] = useState(false)
  const [viewerRevision, setViewerRevision] = useState(0)
  const [reportInstanceToken] = useState(
    () => `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`,
  )
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const refreshViewer = useCallback(() => {
    setViewerRevision((current) => current + 1)
  }, [])

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
    const timer = window.setTimeout(() => setPreviewOptions(), 100)
    return () => window.clearTimeout(timer)
  }, [setPreviewOptions, versionedReportUrl])

  const currentLanguageTemplateName = useMemo(
    () => languageTemplateNames[normalizeReportLanguage(reportLanguage)],
    [reportLanguage],
  )

  const handleCustomizeMenuActions = useCallback(({ args }: ReportViewerCustomizeMenuActionsPayload) => {
    const actions = args?.Actions
    if (!Array.isArray(actions)) {
      return
    }

    const normalizedReportKey = reportKey?.trim() ?? ""

    for (let index = actions.length - 1; index >= 0; index -= 1) {
      const itemId = actions[index]?.id
      if (
        itemId === REFRESH_REPORT_ACTION_ID ||
        itemId === EDIT_SIGNATURES_ACTION_ID ||
        itemId === REPORT_LANGUAGE_ACTION_ID
      ) {
        actions.splice(index, 1)
      }
    }

    const exportAction = args?.GetById?.(ActionId.ExportTo)
    const exportActionIndex = exportAction ? actions.indexOf(exportAction) : -1
    let insertAt = exportActionIndex >= 0 ? exportActionIndex + 1 : actions.length

    const refreshAction = new CustomAction({
      id: REFRESH_REPORT_ACTION_ID,
      text: t("btnRefresh", "Refresh"),
      container: "toolbar",
      imageTemplateName: REFRESH_TEMPLATE_NAME,
      visible: true,
      disabled: false,
      selected: false,
      clickAction: () => refreshViewer(),
    })

    actions.splice(insertAt, 0, refreshAction)
    insertAt += 1

    if (companyCd && normalizedReportKey) {
      const editAction = new CustomAction({
        id: EDIT_SIGNATURES_ACTION_ID,
        text: t("EDIT_SIGNATURES", "Edit signatures"),
        container: "toolbar",
        imageTemplateName: EDIT_SIGNATURES_TEMPLATE_NAME,
        visible: true,
        disabled: false,
        selected: false,
        clickAction: () => setSignatureEditorVisible(true),
      })

      actions.splice(insertAt, 0, editAction)
      insertAt += 1
    }

    const languageAction = new CustomAction({
      id: REPORT_LANGUAGE_ACTION_ID,
      text: `${t("REPORT_LANGUAGE_TOOLTIP", "Đổi ngôn ngữ report")} (${reportLanguage})`,
      container: "toolbar",
      imageTemplateName: currentLanguageTemplateName,
      visible: true,
      disabled: false,
      selected: false,
      clickAction: () => setLanguageSelectorVisible(true),
      hasSeparator: true,
    })

    actions.splice(insertAt, 0, languageAction)
  }, [companyCd, currentLanguageTemplateName, refreshViewer, reportKey, reportLanguage, t])

  const viewerKey = versionedReportUrl

  return (
    <div className="flex h-full min-h-0 flex-col bg-slate-100">
     

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
          <Callbacks CustomizeMenuActions={handleCustomizeMenuActions} DocumentReady={handleDocumentReady} />
        </DxReportViewer>
      </div>

      <Popup
        visible={signatureEditorVisible}
        title={t("EDIT_SIGNATURES", "Edit signatures")}
        showTitle={true}
        dragEnabled={false}
        hideOnOutsideClick={false}
        showCloseButton={true}
        width="96vw"
        height="92vh"
        maxWidth={1500}
        maxHeight={980}
        onHiding={() => setSignatureEditorVisible(false)}
      >
        <div className="h-full overflow-auto bg-slate-50 p-4 sm:p-5">
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
