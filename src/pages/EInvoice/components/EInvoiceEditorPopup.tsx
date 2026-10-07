import { LookupPopupProvider } from "@/components/lookup/LookupPopupHost"

import EInvoiceEditorPopupContent from "./EInvoiceEditorPopupContent"
import type { EInvoiceEditorPopupProps } from "./EInvoiceEditorTypes"

export default function EInvoiceEditorPopup(props: EInvoiceEditorPopupProps) {
  return (
    <LookupPopupProvider>
      <EInvoiceEditorPopupContent {...props} />
    </LookupPopupProvider>
  )
}
