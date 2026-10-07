import { useCallback } from "react"

type UseEInvoiceEditorSaveOptions = {
  handleSave: (createNext?: boolean) => Promise<boolean>
  handleClosePopup: () => void
}

export function useEInvoiceEditorSave({
  handleSave,
  handleClosePopup,
}: UseEInvoiceEditorSaveOptions) {
  const handleSaveAndClose = useCallback(async () => {
    const saved = await handleSave(false)
    if (saved) {
      handleClosePopup()
    }
  }, [handleClosePopup, handleSave])

  return {
    handleSaveAndClose,
  }
}
