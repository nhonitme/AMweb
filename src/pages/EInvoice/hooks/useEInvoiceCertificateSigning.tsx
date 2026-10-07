import { lazy, useCallback, useRef, useState, type ReactNode } from "react"
import notify from "devextreme/ui/notify"
import {
  getSigningPluginCertificates,
  getSigningPluginHealth,
  isSigningPluginNotRunningError,
  type EInvoicePluginCertificate,
} from "@/api/einvoiceSigningPluginApi"
import { getApiErrorMessage } from "@/api/apiTypes"
import { EINV_KEY, fieldRequiredMessage } from "../einvoiceI18n"

const EInvoiceCertificateSelectPopup = lazy(() => import("../components/EInvoiceCertificateSelectPopup"))

export type EInvoiceCertificateSigningPopupOptions = {
  compact?: boolean
  targetLabel?: string
  confirmText?: string
  confirmIcon?: string
  title?: string
  signingCount?: number
}

export type UseEInvoiceCertificateSigningOptions<TItem> = {
  t: (key: string, fallback: string) => string
  promptIfPluginMissing: (error: unknown) => Promise<boolean>
  onRefresh: () => void | Promise<void>
  signBatch?: (items: TItem[], certificateThumbprint: string) => Promise<number>
  setActionLoading?: (loading: boolean) => void
  popupOptions?: EInvoiceCertificateSigningPopupOptions
  loadErrorMessage?: string
}

type PickerConfirmHandler = (certificate: EInvoicePluginCertificate) => boolean | void

function formatText(template: string, values: Array<string | number>): string {
  return values.reduce((text, value, index) => text.replace(`{${index}}`, String(value)), template)
}

async function loadPluginCertificates(
  t: (key: string, fallback: string) => string,
  promptIfPluginMissing: (error: unknown) => Promise<boolean>,
  loadErrorMessage?: string,
): Promise<EInvoicePluginCertificate[] | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    try {
      await getSigningPluginHealth()
      const pluginCertificates = await getSigningPluginCertificates()
      if (pluginCertificates.length === 0) {
        notify(
          t("CERT_VN_NOT_FOUND", "No Vietnam digital certificate (C=VN) with private key was found"),
          "warning",
          4000,
        )
        return null
      }

      return pluginCertificates
    } catch (error) {
      if (await promptIfPluginMissing(error)) {
        return null
      }

      if (isSigningPluginNotRunningError(error) && attempt === 0) {
        continue
      }

      notify(getApiErrorMessage(error, loadErrorMessage ?? t("SIGN_FAILED", "Sign XML failed")), "error", 5000)
      return null
    }
  }

  return null
}

export function useEInvoiceCertificateSigning<TItem>({
  t,
  promptIfPluginMissing,
  onRefresh,
  signBatch,
  setActionLoading,
  popupOptions: defaultPopupOptions,
  loadErrorMessage,
}: UseEInvoiceCertificateSigningOptions<TItem>) {
  const [certificates, setCertificates] = useState<EInvoicePluginCertificate[]>([])
  const [certificatePopupVisible, setCertificatePopupVisible] = useState(false)
  const [selectedCertificateThumbprint, setSelectedCertificateThumbprint] = useState("")
  const [pendingItems, setPendingItems] = useState<TItem[]>([])
  const [popupLoading, setPopupLoading] = useState(false)
  const [activePopupOptions, setActivePopupOptions] = useState<EInvoiceCertificateSigningPopupOptions>({})

  const pendingItemsRef = useRef<TItem[]>([])
  const pickerConfirmRef = useRef<PickerConfirmHandler | null>(null)
  const signBatchRef = useRef(signBatch)

  signBatchRef.current = signBatch

  const closeCertificatePopup = useCallback(() => {
    setCertificatePopupVisible(false)
    setPendingItems([])
    pendingItemsRef.current = []
    pickerConfirmRef.current = null
    setSelectedCertificateThumbprint("")
    setActivePopupOptions({})
  }, [])

  const openWithCertificates = useCallback(
    (
      pluginCertificates: EInvoicePluginCertificate[],
      options: {
        items?: TItem[]
        pickerConfirm?: PickerConfirmHandler | null
        popupOptions?: EInvoiceCertificateSigningPopupOptions
      },
    ) => {
      pendingItemsRef.current = options.items ?? []
      setPendingItems(options.items ?? [])
      pickerConfirmRef.current = options.pickerConfirm ?? null
      setCertificates(pluginCertificates)
      setSelectedCertificateThumbprint(pluginCertificates[0]?.thumbprint ?? "")
      setActivePopupOptions(options.popupOptions ?? {})
      setCertificatePopupVisible(true)
    },
    [],
  )

  const openSigningPopup = useCallback(
    async (items: TItem[], popupOptions?: EInvoiceCertificateSigningPopupOptions): Promise<boolean> => {
      if (items.length === 0) {
        return false
      }

      setActionLoading?.(true)
      setPopupLoading(true)
      try {
        const pluginCertificates = await loadPluginCertificates(t, promptIfPluginMissing, loadErrorMessage)
        if (!pluginCertificates) {
          return false
        }

        openWithCertificates(pluginCertificates, {
          items,
          popupOptions: { ...defaultPopupOptions, ...popupOptions },
        })
        return true
      } finally {
        setActionLoading?.(false)
        setPopupLoading(false)
      }
    },
    [defaultPopupOptions, loadErrorMessage, openWithCertificates, promptIfPluginMissing, setActionLoading, t],
  )

  const openCertificatePicker = useCallback(
    async (options: {
      onPick: PickerConfirmHandler
      popupOptions?: EInvoiceCertificateSigningPopupOptions
    }): Promise<boolean> => {
      setActionLoading?.(true)
      setPopupLoading(true)
      try {
        const pluginCertificates = await loadPluginCertificates(t, promptIfPluginMissing, loadErrorMessage)
        if (!pluginCertificates) {
          return false
        }

        openWithCertificates(pluginCertificates, {
          pickerConfirm: options.onPick,
          popupOptions: {
            signingCount: 1,
            ...defaultPopupOptions,
            ...options.popupOptions,
          },
        })
        return true
      } finally {
        setActionLoading?.(false)
        setPopupLoading(false)
      }
    },
    [defaultPopupOptions, loadErrorMessage, openWithCertificates, promptIfPluginMissing, setActionLoading, t],
  )

  const handleConfirm = useCallback(async () => {
    const certificateThumbprint = selectedCertificateThumbprint.trim()
    if (!certificateThumbprint) {
      notify(fieldRequiredMessage(t, EINV_KEY.CERTIFICATE_SELECT, "Select digital certificate"), "warning", 3000)
      return
    }

    const pickerConfirm = pickerConfirmRef.current
    if (pickerConfirm) {
      const certificate = certificates.find((item) => item.thumbprint === certificateThumbprint)
      if (!certificate) {
        notify(fieldRequiredMessage(t, EINV_KEY.CERTIFICATE_SELECT, "Select digital certificate"), "warning", 3000)
        return
      }

      const shouldClose = pickerConfirm(certificate)
      if (shouldClose !== false) {
        closeCertificatePopup()
      }
      return
    }

    const items = pendingItemsRef.current
    if (items.length === 0) {
      return
    }

    if (!signBatchRef.current) {
      return
    }

    setActionLoading?.(true)
    setPopupLoading(true)
    let successCount = 0
    try {
      successCount = await signBatchRef.current(items, certificateThumbprint)
      notify(formatText(t("SIGN_SUCCESS_COUNT", "Signed {0} record(s) successfully"), [successCount]), "success", 3000)
      closeCertificatePopup()
      await onRefresh()
    } catch (error) {
      const remaining = items.slice(successCount)
      pendingItemsRef.current = remaining
      setPendingItems(remaining)

      if (successCount > 0) {
        await onRefresh()
      }

      if (await promptIfPluginMissing(error)) {
        return
      }

      const message = getApiErrorMessage(error, t("SIGN_FAILED", "Sign XML failed"))
      const partialMessage =
        successCount > 0
          ? `${formatText(t("SIGN_PARTIAL_SUCCESS", "Signed {0} record(s)."), [successCount])} ${message}`
          : message
      notify(partialMessage, "error", 5000)
    } finally {
      setActionLoading?.(false)
      setPopupLoading(false)
    }
  }, [
    certificates,
    closeCertificatePopup,
    onRefresh,
    promptIfPluginMissing,
    selectedCertificateThumbprint,
    setActionLoading,
    t,
  ])

  const mergedPopupOptions = { ...defaultPopupOptions, ...activePopupOptions }
  const signingCount = mergedPopupOptions.signingCount ?? pendingItems.length

  const certificateSelectPopup: ReactNode = certificatePopupVisible ? (
    <EInvoiceCertificateSelectPopup
      visible={certificatePopupVisible}
      certificates={certificates}
      selectedThumbprint={selectedCertificateThumbprint}
      signingCount={signingCount}
      targetLabel={mergedPopupOptions.targetLabel}
      confirmText={mergedPopupOptions.confirmText}
      confirmIcon={mergedPopupOptions.confirmIcon}
      title={mergedPopupOptions.title}
      compact={mergedPopupOptions.compact}
      loading={popupLoading}
      onClose={closeCertificatePopup}
      onSelect={setSelectedCertificateThumbprint}
      onConfirm={() => void handleConfirm()}
    />
  ) : null

  return {
    certificatePopupVisible,
    closeCertificatePopup,
    openSigningPopup,
    openCertificatePicker,
    certificateSelectPopup,
  }
}
