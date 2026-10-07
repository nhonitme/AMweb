import { useCallback, useState } from "react"
import {
  isSigningPluginNotRunningError,
  tryAutoLaunchSigningPlugin,
} from "@/api/einvoiceSigningPluginApi"
import EInvoicePluginSetupPopup from "@/pages/EInvoice/components/EInvoicePluginSetupPopup"

export function useEInvoiceSigningPluginSetupPrompt() {
  const [setupPopupVisible, setSetupPopupVisible] = useState(false)

  const promptIfPluginMissing = useCallback(async (error: unknown): Promise<boolean> => {
    if (!isSigningPluginNotRunningError(error)) {
      return false
    }

    const connected = await tryAutoLaunchSigningPlugin()
    if (connected) {
      return false
    }

    setSetupPopupVisible(true)
    return true
  }, [])

  const closeSetupPopup = useCallback(() => {
    setSetupPopupVisible(false)
  }, [])

  const setupPopup = (
    <EInvoicePluginSetupPopup
      visible={setupPopupVisible}
      onClose={closeSetupPopup}
      onPluginConnected={closeSetupPopup}
    />
  )

  return {
    setupPopupVisible,
    promptIfPluginMissing,
    closeSetupPopup,
    setupPopup,
  }
}
