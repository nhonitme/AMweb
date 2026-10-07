import { useCallback } from "react"

type UseEInvoiceEditorFormOptions = {
  isReadOnly: boolean
  isUpdate: boolean
  refetchInvoice: () => unknown
  refetchSellers: () => unknown
}

export function useEInvoiceEditorForm({
  isReadOnly,
  isUpdate,
  refetchInvoice,
  refetchSellers,
}: UseEInvoiceEditorFormOptions) {
  const handleReset = useCallback(() => {
    if (isReadOnly) {
      return
    }

    if (isUpdate) {
      void refetchInvoice()
      return
    }

    void refetchSellers()
  }, [isReadOnly, isUpdate, refetchInvoice, refetchSellers])

  return {
    handleReset,
  }
}
