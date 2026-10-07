import { ExtensionGdtConnector } from "./extensionGdtConnector"
import { isGdtExtensionAvailable } from "./isGdtExtensionAvailable"
import type { GdtDetailConnector, WebGdtConnectorConfig } from "./types"
import { WebGdtConnector } from "./webGdtConnector"

/**
 * Ưu tiên Extension (fast mode); không có / lỗi detect → Web fallback.
 */
export async function createGdtDetailConnector(
  webConfig: WebGdtConnectorConfig,
): Promise<GdtDetailConnector> {
  const web = new WebGdtConnector(webConfig)
  try {
    if (await isGdtExtensionAvailable()) {
      return new ExtensionGdtConnector(web)
    }
  } catch {
    // ignore — luôn fallback web
  }
  return web
}
