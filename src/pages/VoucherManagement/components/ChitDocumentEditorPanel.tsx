import type { ComponentType, MutableRefObject, ReactNode } from "react"

import type { GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import type { ChitDetail, ChitInfo, ChitType } from "@/types/voucher"
import type { LinkedInventoryTarget } from "@/pages/Inventory/inventoryAccountingLinkUtils"

import { ChitDetailGridPopup, type ChitDetailGridHandle } from "./ChitDetailGridPopup"
import type { VoucherDetailColumnsProps } from "./ChitDetailColumnsPopup"

interface ChitDocumentEditorPanelProps {
  gridRef: MutableRefObject<ChitDetailGridHandle | null>
  companyCd: string
  chitType: ChitType
  baseDate?: ChitInfo["CHIT_YMD"]
  details: ChitInfo["DETAILS"]
  onChange: (rows: ChitInfo["DETAILS"], amount: number) => void
  isVisible: boolean
  readOnly?: boolean
  layoutVersion: number
  DetailColumns?: ComponentType<VoucherDetailColumnsProps>
  quickCreateCustomer?: boolean
  screenCd: string
  gridId: string
  columnSettingStateRef: MutableRefObject<GridColumnSettingState | null>
  onOpenInventory?: (row: ChitDetail, target?: LinkedInventoryTarget) => Promise<void>
  inventoryBusy?: boolean
  pendingInventoryRowKeys?: string[]
  inventoryRefreshVersion?: number
  showInventoryLinkActions?: boolean
  linkSlot?: ReactNode
}

export default function ChitDocumentEditorPanel({
  gridRef,
  companyCd,
  chitType,
  baseDate,
  details,
  onChange,
  isVisible,
  readOnly = false,
  layoutVersion,
  DetailColumns,
  quickCreateCustomer = false,
  screenCd,
  gridId,
  columnSettingStateRef,
  onOpenInventory,
  inventoryBusy,
  pendingInventoryRowKeys,
  inventoryRefreshVersion,
  showInventoryLinkActions,
  linkSlot,
}: ChitDocumentEditorPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pt-2">
      <ChitDetailGridPopup
        ref={gridRef}
        companyCd={companyCd}
        chitType={chitType}
        baseDate={baseDate}
        details={details}
        onChange={onChange}
        height="100%"
        isVisible={isVisible}
        readOnly={readOnly}
        layoutVersion={layoutVersion}
        ChitDetailColumns={DetailColumns}
        quickCreateCustomer={quickCreateCustomer}
        screenCd={screenCd}
        gridId={gridId}
        persistColumnSettings={true}
        columnSettingStateRef={columnSettingStateRef}
        onOpenInventory={onOpenInventory}
        inventoryBusy={inventoryBusy}
        pendingInventoryRowKeys={pendingInventoryRowKeys}
        inventoryRefreshVersion={inventoryRefreshVersion}
        showInventoryLinkActions={showInventoryLinkActions}
        linkSlot={linkSlot}
      />
    </div>
  )
}
