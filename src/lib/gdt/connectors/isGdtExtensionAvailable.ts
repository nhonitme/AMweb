import { hasChromeRuntime, sendExtensionMessage } from "./chromeRuntime"
import {
  CONNECTOR_PING_NAME,
  EXTENSION_PING_TIMEOUT_MS,
  GDT_EXTENSION_ID,
} from "./extensionConfig"

type PingResponse = {
  success?: boolean
  connector?: string
  version?: string
}

/**
 * Detect AMnote GDT Extension — timeout ~800ms, không throw.
 */
export async function isGdtExtensionAvailable(): Promise<boolean> {
  if (!GDT_EXTENSION_ID || !hasChromeRuntime()) {
    return false
  }
  try {
    const response = await sendExtensionMessage<PingResponse>(
      GDT_EXTENSION_ID,
      { type: "PING" },
      EXTENSION_PING_TIMEOUT_MS,
    )
    return (
      response?.success === true &&
      response.connector === CONNECTOR_PING_NAME
    )
  } catch {
    return false
  }
}
