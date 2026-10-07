import { useCallback, useContext, useEffect, useRef, useState } from "react"
import Popup, { ToolbarItem } from "devextreme-react/popup"
import {
  downloadSigningPluginSetup,
  formatSigningPluginSetupFileSize,
  getSigningPluginHealth,
  getSigningPluginSetupInfo,
  isSigningPluginOutdated,
  type EInvoicePluginSetupInfo,
} from "@/api/einvoiceSigningPluginApi"
import { LanguageContext } from "@/lib/i18nLoader"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"

interface EInvoicePluginSetupPopupProps {
  visible: boolean
  onClose: () => void
  onPluginConnected?: () => void
}

type PluginConnectionStatus = "unknown" | "connected" | "disconnected"

export default function EInvoicePluginSetupPopup({
  visible,
  onClose,
  onPluginConnected,
}: EInvoicePluginSetupPopupProps) {
  const { translate } = useContext(LanguageContext)
  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )
  const [setupInfo, setSetupInfo] = useState<EInvoicePluginSetupInfo | null>(null)
  const [runningVersion, setRunningVersion] = useState("")
  const [connectionStatus, setConnectionStatus] = useState<PluginConnectionStatus>("unknown")
  const [loadingInfo, setLoadingInfo] = useState(false)
  const [downloading, setDownloading] = useState(false)
  const [waitingForPlugin, setWaitingForPlugin] = useState(false)
  const [errorMessage, setErrorMessage] = useState("")
  const pollTimerRef = useRef<number | null>(null)

  const clearPollTimer = useCallback(() => {
    if (pollTimerRef.current !== null) {
      window.clearInterval(pollTimerRef.current)
      pollTimerRef.current = null
    }
  }, [])

  const handlePluginConnected = useCallback(
    (version: string) => {
      setRunningVersion(version)
      setConnectionStatus("connected")
      setWaitingForPlugin(false)
      setErrorMessage("")
      onPluginConnected?.()
    },
    [onPluginConnected],
  )

  const startConnectionPolling = useCallback(() => {
    clearPollTimer()
    setWaitingForPlugin(true)
    setErrorMessage("")

    pollTimerRef.current = window.setInterval(() => {
      void getSigningPluginHealth()
        .then((health) => {
          handlePluginConnected(health.version)
          clearPollTimer()
        })
        .catch(() => {
          // Keep polling until timeout or success.
        })
    }, 1_500)

    window.setTimeout(() => {
      clearPollTimer()
      setWaitingForPlugin(false)
      void getSigningPluginHealth()
        .then((health) => {
          handlePluginConnected(health.version)
        })
        .catch(() => {
          setErrorMessage(
            t(
              "PLUGIN_SETUP_NOT_CONNECTED",
              "Chua ket noi duoc plugin. Hay chay file cai dat va tai lai trang.",
            ),
          )
        })
    }, 30_000)
  }, [clearPollTimer, handlePluginConnected, t])

  useEffect(() => {
    if (!visible) {
      clearPollTimer()
      setWaitingForPlugin(false)
      return
    }

    let cancelled = false
    setLoadingInfo(true)
    setErrorMessage("")

    void Promise.all([
      getSigningPluginSetupInfo(),
      getSigningPluginHealth().catch(() => null),
    ])
      .then(([info, health]) => {
        if (!cancelled) {
          setSetupInfo(info)
          setRunningVersion(health?.version ?? "")
          setConnectionStatus(health ? "connected" : "disconnected")
        }
      })
      .catch((error: unknown) => {
        if (!cancelled) {
          setSetupInfo(null)
          setRunningVersion("")
          setConnectionStatus("disconnected")
          setErrorMessage(error instanceof Error ? error.message : String(error))
        }
      })
      .finally(() => {
        if (!cancelled) {
          setLoadingInfo(false)
        }
      })

    return () => {
      cancelled = true
      clearPollTimer()
    }
  }, [clearPollTimer, visible])

  const handleDownload = useCallback(async () => {
    setDownloading(true)
    setErrorMessage("")
    try {
      await downloadSigningPluginSetup()
      startConnectionPolling()
    } catch (error: unknown) {
      setErrorMessage(error instanceof Error ? error.message : String(error))
    } finally {
      setDownloading(false)
    }
  }, [startConnectionPolling])

  const pluginOutdated =
    setupInfo?.available === true
    && runningVersion.length > 0
    && setupInfo.version.length > 0
    && isSigningPluginOutdated(runningVersion, setupInfo.version)

  const pluginConnected = connectionStatus === "connected"

  return (
    <Popup
      visible={visible}
      onHiding={onClose}
      dragEnabled={false}
      hideOnOutsideClick={false}
      showCloseButton
      width={560}
      height="auto"
      title={t("PLUGIN_SETUP_TITLE", "Cai dat plugin ky so")}
      animation={POPUP_FADE_ANIMATION}
    >
      <div className="flex flex-col gap-4 p-1 text-sm leading-6 text-slate-700">
        <p>
          {t(
            "PLUGIN_SETUP_DESC",
            "Cai dat plugin ky so de ky va gui hoa don dien tu.",
          )}
        </p>

        <ol className="list-decimal space-y-2 pl-5">
          <li>{t("PLUGIN_SETUP_STEP_1", "Tai file cai dat.")}</li>
          <li>{t("PLUGIN_SETUP_STEP_2", "Chay file cai dat.")}</li>
          <li>{t("PLUGIN_SETUP_STEP_3", "Tai lai trinh duyet.")}</li>
          <li>{t("PLUGIN_SETUP_STEP_4", "Thu ky lai.")}</li>
        </ol>

        {loadingInfo ? (
          <div className="rounded-lg border border-slate-200 bg-slate-50 px-4 py-3 text-slate-600">
            {t("LOADING", "Dang tai...")}
          </div>
        ) : setupInfo ? (
          <div
            className={`rounded-lg border px-4 py-3 ${
              pluginConnected
                ? "border-emerald-200 bg-emerald-50"
                : "border-sky-200 bg-sky-50"
            }`}
          >
            <div className={`font-medium ${pluginConnected ? "text-emerald-900" : "text-sky-900"}`}>
              {pluginConnected
                ? t("PLUGIN_SETUP_CONNECTED", "Plugin da san sang.")
                : setupInfo.available
                  ? t("PLUGIN_SETUP_READY", "File cai dat san sang.")
                  : t("PLUGIN_SETUP_UNAVAILABLE", "Chua co file cai dat tren server")}
            </div>
            <div className={pluginConnected ? "mt-1 text-emerald-800" : "mt-1 text-sky-800"}>
              {t("VERSION", "Phien ban")}: {pluginConnected ? runningVersion : setupInfo.version || "-"}
            </div>
            {pluginConnected && runningVersion ? (
              <div className="text-emerald-800">
                {t("PLUGIN_SETUP_RUNNING_VERSION", "Phien ban dang chay")}: {runningVersion}
              </div>
            ) : null}
            {pluginOutdated ? (
              <div className="mt-2 font-medium text-amber-800">
                {t("PLUGIN_SETUP_OUTDATED", "Plugin dang chay da cu hon phien ban tren server. Hay tai va cai dat lai.")}
              </div>
            ) : null}
            {setupInfo.available ? (
              <div className={pluginConnected ? "text-emerald-800" : "text-sky-800"}>
                {setupInfo.fileName} ({formatSigningPluginSetupFileSize(setupInfo.fileSize)})
              </div>
            ) : null}
            {waitingForPlugin ? (
              <div className="mt-2 text-sky-800">
                {t("PLUGIN_SETUP_WAITING", "Dang cho plugin ket noi...")}
              </div>
            ) : null}
          </div>
        ) : null}

        {errorMessage ? <div className="rounded-lg border border-rose-200 bg-rose-50 px-4 py-3 text-rose-700">{errorMessage}</div> : null}
      </div>

      <ToolbarItem
        widget="dxButton"
        toolbar="bottom"
        location="after"
        options={{
          text: t("CLOSE", "Dong"),
          stylingMode: "outlined",
          onClick: onClose,
        }}
      />
      <ToolbarItem
        widget="dxButton"
        toolbar="bottom"
        location="after"
        options={{
          text: t("PLUGIN_SETUP_DOWNLOAD", "Tai plugin"),
          type: "default",
          icon: "download",
          disabled: downloading || loadingInfo || setupInfo?.available === false,
          onClick: () => {
            void handleDownload()
          },
        }}
      />
    </Popup>
  )
}
