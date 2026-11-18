import type { RefObject } from "react"
import type dxDataGrid from "devextreme/ui/data_grid"

import { useVoucherSpreadsheetDetailSync } from "@/components/datagrid/useVoucherSpreadsheetDetailSync"
import { DETAIL_LIVE_INPUT_FIELDS, DETAIL_LOOKUP_FIELDS } from "./EInvoiceEditorConstants"
import type { EInvoiceDetailRow, EInvoiceFormData, GridKey } from "./EInvoiceEditorTypes"

type UseEInvoiceDetailCalcSyncOptions = {
  visible: boolean
  isReadOnly: boolean
  isLookupPopupOpen?: boolean
  detailGridRef: RefObject<dxDataGrid<EInvoiceDetailRow, GridKey> | null>
  detailGridContainerRef: RefObject<HTMLElement | null>
  syncDetailRows: () => EInvoiceFormData
  preserveScrollForSync: (syncFn: () => void) => void
}

export function useEInvoiceDetailCalcSync({
  visible,
  isReadOnly,
  isLookupPopupOpen = false,
  detailGridRef,
  detailGridContainerRef,
  syncDetailRows,
  preserveScrollForSync,
}: UseEInvoiceDetailCalcSyncOptions) {
  const { commitGridEdits, handleSaved, handleFocusedCellChanged } = useVoucherSpreadsheetDetailSync<
    EInvoiceDetailRow,
    GridKey
  >({
    visible,
    isReadOnly,
    isLookupPopupOpen,
    gridRef: detailGridRef,
    gridContainerRef: detailGridContainerRef,
    syncRows: () => {
      syncDetailRows()
    },
    preserveScrollForSync,
    liveInputFields: DETAIL_LIVE_INPUT_FIELDS,
    lookupFields: DETAIL_LOOKUP_FIELDS,
  })

  return {
    commitDetailGridEdits: commitGridEdits,
    handleDetailSaved: handleSaved,
    handleDetailFocusedCellChanged: handleFocusedCellChanged,
  }
}
