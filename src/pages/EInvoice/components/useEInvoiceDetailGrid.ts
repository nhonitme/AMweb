import { useCallback, type Dispatch, type SetStateAction } from "react"

type UseEInvoiceDetailGridOptions = {
  isReadOnly: boolean
  isBusy: boolean
  setDetailImportVisible: Dispatch<SetStateAction<boolean>>
}

export function useEInvoiceDetailGrid({
  isReadOnly,
  isBusy,
  setDetailImportVisible,
}: UseEInvoiceDetailGridOptions) {
  const openDetailImport = useCallback(() => {
    if (!isReadOnly) {
      setDetailImportVisible(true)
    }
  }, [isReadOnly, setDetailImportVisible])

  const closeDetailImport = useCallback(() => {
    if (!isBusy) {
      setDetailImportVisible(false)
    }
  }, [isBusy, setDetailImportVisible])

  return {
    openDetailImport,
    closeDetailImport,
  }
}
