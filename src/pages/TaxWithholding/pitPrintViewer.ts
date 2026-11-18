import { openDocumentPdf } from "@/pages/EInvoice/documentPdfViewer"
import { pitApi } from "./api"
import type { PitKind } from "./types"

export async function openPitPrintPreview(kind: PitKind, id: number): Promise<boolean> {
  await openDocumentPdf(() => pitApi.printPdf(kind, id))
  return true
}
