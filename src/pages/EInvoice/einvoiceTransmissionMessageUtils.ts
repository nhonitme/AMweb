import type { EInvoiceTransmissionMessage } from "@/types/einvoiceTransmission"

function trimText(value: unknown): string {
  return String(value ?? "").trim()
}

export function canPreviewTransmissionMessage(message: Pick<EInvoiceTransmissionMessage, "RECEIVE_ID">): boolean {
  const receiveId = Number(message.RECEIVE_ID ?? 0)
  return Number.isFinite(receiveId) && receiveId > 0
}

export function buildTransmissionMessageKey(message: EInvoiceTransmissionMessage): string {
  const existingKey = trimText(message.MESSAGE_KEY)
  if (existingKey) {
    return existingKey
  }

  const receiveId = Number(message.RECEIVE_ID ?? 0)
  if (Number.isFinite(receiveId) && receiveId > 0) {
    return `RECEIVE:${receiveId}`
  }

  return ""
}

export function normalizeTransmissionMessages(messages: EInvoiceTransmissionMessage[]): EInvoiceTransmissionMessage[] {
  return messages.map((message) => ({
    ...message,
    MESSAGE_KEY: buildTransmissionMessageKey(message),
    MESSAGE_KIND: "RECEIVE" as const,
  }))
}

export function shouldPassInvoiceIdForTransmissionPreview(message: Pick<EInvoiceTransmissionMessage, "MLTDIEP">): boolean {
  const mltdiep = trimText(message.MLTDIEP)
  return mltdiep === "200" || mltdiep === "202"
}
