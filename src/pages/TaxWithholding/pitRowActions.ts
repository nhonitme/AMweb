import type { PitDocument } from "./types"

export type PitRowAction = "transmission-history" | "send-mail" | "mail-history" | "print" | "download-xml"

export function pitDocumentLabel(row: PitDocument): string {
  const reference = row.DOC_NO ? `${row.SERIES ?? ""} / ${String(row.DOC_NO).padStart(8, "0")}` : `#${row.DOCUMENT_ID}`
  return [reference, row.DOC_DATE?.slice(0, 10), row.DISPLAY_NAME].filter(Boolean).join(" - ")
}

export function pitXmlFileName(row: PitDocument): string {
  return `PIT_${row.KIND}_${row.DOCUMENT_ID}${row.IS_SIGNED ? "" : "_draft"}.xml`
}
