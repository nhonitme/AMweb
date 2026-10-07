import type { ComponentType, MutableRefObject } from "react"

import type { GridColumnSettingState } from "@/components/datagrid/useGridColumnSettingState"
import type { ChitInfo, ChitType } from "@/types/voucher"

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
  screenCd: string
  gridId: string
  columnSettingStateRef: MutableRefObject<GridColumnSettingState | null>
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
  screenCd,
  gridId,
  columnSettingStateRef,
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
        screenCd={screenCd}
        gridId={gridId}
        persistColumnSettings={true}
        columnSettingStateRef={columnSettingStateRef}
      />
    </div>
  )
}
