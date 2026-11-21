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
  pendingInventoryDeleteRowKeys?: string[]
  pendingInventoryDeleteChitIds?: number[]
  inventoryRefreshVersion?: number
  showInventoryLinkActions?: boolean
  canOpenInventoryRow?: (row: ChitDetail) => boolean
  inventoryLinkType?: "IR" | "IO"
  showVatDetailActions?: boolean
  hasVatDataForRow?: (rowKey: string) => boolean
  isVatActiveForRow?: (rowKey: string) => boolean
  onOpenVat?: (row: ChitDetail) => void
  renderDetailLink?: (row: ChitDetail) => ReactNode
  linkSlot?: ReactNode
  vatPanel?: ReactNode
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
  pendingInventoryDeleteRowKeys,
  pendingInventoryDeleteChitIds,
  inventoryRefreshVersion,
  showInventoryLinkActions,
  canOpenInventoryRow,
  inventoryLinkType,
  showVatDetailActions,
  hasVatDataForRow,
  isVatActiveForRow,
  onOpenVat,
  renderDetailLink,
  linkSlot,
  vatPanel,
}: ChitDocumentEditorPanelProps) {
  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden pt-2">
      <div className="min-h-0 flex-1 overflow-hidden">
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
          pendingInventoryDeleteRowKeys={pendingInventoryDeleteRowKeys}
          pendingInventoryDeleteChitIds={pendingInventoryDeleteChitIds}
          inventoryRefreshVersion={inventoryRefreshVersion}
          showInventoryLinkActions={showInventoryLinkActions}
          canOpenInventoryRow={canOpenInventoryRow}
          inventoryLinkType={inventoryLinkType}
          showVatDetailActions={showVatDetailActions}
          hasVatDataForRow={hasVatDataForRow}
          isVatActiveForRow={isVatActiveForRow}
          onOpenVat={onOpenVat}
          renderDetailLink={renderDetailLink}
          linkSlot={linkSlot}
        />
      </div>
      {vatPanel}
    </div>
  )
}
