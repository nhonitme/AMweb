import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import Button from "devextreme-react/button"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { RowPreparedEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"
import { Column as DataGridColumn } from "devextreme-react/data-grid"
import Popup from "devextreme-react/popup"
import notify from "devextreme/ui/notify"

import PageGrid from "@/components/datagrid/PageGrid"
import { GridToolbar } from "@/components/toolbar/GridToolbar"
import { getInventoryLinkStatuses } from "@/api/inventoryLinkApi"
import { getChits } from "@/api/voucherApi"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import { createCurrentMonthDateRange } from "@/lib/dateRangeDefaults"
import { createDefaultChit, normalizeChitRows } from "../chitUtils"
import type { ChitInfo, ChitLedger, ChitType, InventoryLinkStatus } from "@/types/voucher"

type ReferenceSourceConfig = {
  ledger: ChitLedger
  chitType: ChitType
}

type LookupChitInfo = ChitInfo & {
  IS_LINKED_SOURCE?: boolean
  IS_LINKED_TO_CURRENT_SOURCE?: boolean
  REFERENCE_LINK_STATUS_TEXT?: string
  REFERENCE_LINKED_CHITDETAIL_IDS?: number[]
}

interface MultiReferencePopupProps {
  visible: boolean
  referenceConfig: ReferenceSourceConfig | null
  onClose: () => void
  onConfirm: (selectedSources: ChitInfo[], unlinkedSources: ChitInfo[], addedSources: ChitInfo[]) => Promise<void>
  translate: (key: string, fallback: string) => string
  selectedSourceIds?: number[]
  excludeLinkedSources?: boolean
  useGlobalLinkedStatus?: boolean
  currentLinkedChitId?: number | null
  currentLinkedChitType?: ChitType
  pendingUnlinkSourceIds?: number[]
}

const referencePageSize = 100
const statusChunkSize = 100

const formatDateToYmd = (value: Date | null): string | undefined => {
  if (!(value instanceof Date) || Number.isNaN(value.getTime())) {
    return undefined
  }

  const year = value.getFullYear()
  const month = `${value.getMonth() + 1}`.padStart(2, "0")
  const day = `${value.getDate()}`.padStart(2, "0")
  return `${year}${month}${day}`
}

const normalizeSourceId = (value: unknown): number | null => {
  const parsed = Number(value ?? 0)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null
}

const chunkIds = (ids: number[], chunkSize: number): number[][] => {
  const chunks: number[][] = []
  for (let index = 0; index < ids.length; index += chunkSize) {
    chunks.push(ids.slice(index, index + chunkSize))
  }
  return chunks
}

const normalizeSourceIds = (values: readonly unknown[]): number[] =>
  Array.from(
    new Set(
      values
        .map(normalizeSourceId)
        .filter((id): id is number => id !== null),
    ),
  ).sort((left, right) => left - right)

const hasLinkedInventoryVoucher = (status: InventoryLinkStatus | null | undefined): boolean =>
  Boolean(
    status &&
      ((status.LINKED_CHITDETAIL_IDS ?? []).length > 0 ||
        Number(status.LINKED_TOTAL_QUANTITY ?? 0) > 0 ||
        (status.INVENTORY_VOUCHERS ?? []).length > 0),
  )

const isLinkedToCurrentVoucher = (
  status: InventoryLinkStatus | null | undefined,
  currentLinkedChitId?: number | null,
  currentLinkedChitType?: ChitType,
): boolean => {
  const currentId = normalizeSourceId(currentLinkedChitId)
  if (!status || !currentId) {
    return false
  }

  const currentType = String(currentLinkedChitType ?? "").trim().toUpperCase()
  return (status.INVENTORY_VOUCHERS ?? []).some((voucher) => {
    const linkedId = normalizeSourceId(voucher.INVENTORY_CHIT_ID)
    const linkedType = String(voucher.INVENTORY_CHIT_TYPE ?? "").trim().toUpperCase()
    return linkedId === currentId && (!currentType || linkedType === currentType)
  })
}

const createSourceStub = (referenceConfig: ReferenceSourceConfig, sourceId: number): ChitInfo => ({
  ...createDefaultChit(referenceConfig.chitType, ""),
  CHIT_ID: sourceId,
  CHIT_TYPE: referenceConfig.chitType,
  DETAILS: [],
})

export default function MultiReferencePopup({
  visible,
  referenceConfig,
  onClose,
  onConfirm,
  translate: t,
  selectedSourceIds = [],
  excludeLinkedSources = false,
  useGlobalLinkedStatus = true,
  currentLinkedChitId = null,
  currentLinkedChitType,
  pendingUnlinkSourceIds = [],
}: MultiReferencePopupProps) {
  const { getFormat } = useDecimalColumnFormats()
  const gridRef = useRef<dxDataGrid | null>(null)
  const initialLinkedIdsRef = useRef<Set<number>>(new Set())
  const selectedIdsRef = useRef<Set<number>>(new Set())
  const touchedIdsRef = useRef<Set<number>>(new Set())
  const sourceByIdRef = useRef<Map<number, ChitInfo>>(new Map())
  const applyingSelectionRef = useRef(false)
  const [rows, setRows] = useState<LookupChitInfo[]>([])
  const [selectedCount, setSelectedCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const selectedSourceIdSet = useMemo(
    () =>
      new Set(
        selectedSourceIds
          .map(normalizeSourceId)
          .filter((id): id is number => id !== null),
      ),
    [selectedSourceIds],
  )
  const pendingUnlinkSourceIdSet = useMemo(
    () =>
      new Set(
        pendingUnlinkSourceIds
          .map(normalizeSourceId)
          .filter((id): id is number => id !== null),
      ),
    [pendingUnlinkSourceIds],
  )
  const defaultDateRange = useMemo(createCurrentMonthDateRange, [])
  const [fromDate, setFromDate] = useState<Date | null>(defaultDateRange.fromDate)
  const [toDate, setToDate] = useState<Date | null>(defaultDateRange.toDate)
  const fromDateRef = useRef(fromDate)
  const toDateRef = useRef(toDate)
  fromDateRef.current = fromDate
  toDateRef.current = toDate

  const syncGridSelection = useCallback((targetRows: LookupChitInfo[]) => {
    const grid = gridRef.current
    if (!grid) {
      return
    }

    const selectedVisibleIds = targetRows
      .map((item) => normalizeSourceId(item.CHIT_ID))
      .filter((id): id is number => id !== null && selectedIdsRef.current.has(id))

    applyingSelectionRef.current = true
    grid.clearSelection?.()
    const selectPromise =
      selectedVisibleIds.length > 0
        ? Promise.resolve(grid.selectRows?.(selectedVisibleIds, false))
        : Promise.resolve()

    selectPromise.finally(() => {
      applyingSelectionRef.current = false
      setSelectedCount(selectedIdsRef.current.size)
    })
  }, [])

  const loadRows = useCallback(async () => {
    if (!referenceConfig) {
      setRows([])
      return
    }

    setLoading(true)
    try {
      const requestFilters = {
        fromYmd: formatDateToYmd(fromDateRef.current),
        toYmd: formatDateToYmd(toDateRef.current),
      }
      const firstResponse = await getChits(referenceConfig.ledger, referenceConfig.chitType, {
        pageNumber: 1,
        pageSize: referencePageSize,
        ...requestFilters,
      })
      const pageResponses = [firstResponse]

      for (let page = 2; page <= firstResponse.totalPages; page += 1) {
        pageResponses.push(
          await getChits(referenceConfig.ledger, referenceConfig.chitType, {
            pageNumber: page,
            pageSize: referencePageSize,
            ...requestFilters,
          }),
        )
      }

      const normalized = normalizeChitRows(
        pageResponses.flatMap((response) => response.data || []),
        referenceConfig.chitType,
      )
      const ids = normalized
        .map((item) => normalizeSourceId(item.CHIT_ID))
        .filter((id): id is number => id !== null)
      const statusMap = new Map<number, InventoryLinkStatus>()

      if (useGlobalLinkedStatus && ids.length > 0) {
        const statusChunks = await Promise.all(
          chunkIds(ids, statusChunkSize).map((chunk) =>
            getInventoryLinkStatuses(referenceConfig.ledger, referenceConfig.chitType, chunk),
          ),
        )
        statusChunks.flat().forEach((status) => {
          const sourceId = normalizeSourceId(status.CHIT_ID)
          if (sourceId) {
            statusMap.set(sourceId, status)
          }
        })
      }

      const nextRows = normalized.reduce<LookupChitInfo[]>((accumulator, item) => {
        const sourceId = normalizeSourceId(item.CHIT_ID)
        if (!sourceId) {
          return accumulator
        }

        const status = statusMap.get(sourceId)
        const isLinked = useGlobalLinkedStatus && hasLinkedInventoryVoucher(status)
        const isLinkedToCurrent =
          useGlobalLinkedStatus && isLinkedToCurrentVoucher(status, currentLinkedChitId, currentLinkedChitType)
        const isLinkedToOther = isLinked && !isLinkedToCurrent
        const isPendingUnlink = pendingUnlinkSourceIdSet.has(sourceId)
        const linkedChitDetailIds = normalizeSourceIds(status?.LINKED_CHITDETAIL_IDS ?? [])

        if (isLinkedToCurrent && !isPendingUnlink) {
          initialLinkedIdsRef.current.add(sourceId)
          if (!touchedIdsRef.current.has(sourceId)) {
            selectedIdsRef.current.add(sourceId)
          }
        }

        if (excludeLinkedSources && isLinkedToOther) {
          return accumulator
        }

        const selected = selectedIdsRef.current.has(sourceId) || selectedSourceIdSet.has(sourceId)
        const nextItem: LookupChitInfo = {
          ...item,
          IS_LINKED_SOURCE: isLinked,
          IS_LINKED_TO_CURRENT_SOURCE: isLinkedToCurrent && !isPendingUnlink,
          REFERENCE_LINKED_CHITDETAIL_IDS: isLinkedToCurrent ? linkedChitDetailIds : [],
          REFERENCE_LINK_STATUS_TEXT: isPendingUnlink
            ? t("REFERENCE_PENDING_UNLINK", "Đã bỏ liên kết tạm")
            : isLinkedToCurrent
            ? t("REFERENCE_LINKED_CURRENT", "Đang liên kết chứng từ này")
            : isLinked
              ? t("REFERENCE_LINKED_OTHER", "Đã liên kết")
              : selected
                ? t("REFERENCE_SELECTED", "Đã chọn")
                : "",
        }

        sourceByIdRef.current.set(sourceId, nextItem)
        accumulator.push(nextItem)
        return accumulator
      }, [])

      setRows(nextRows)
      setSelectedCount(selectedIdsRef.current.size)
    } catch (error) {
      console.error("Load multi-reference vouchers failed", error)
      notify(t("LOAD_REFERENCE_FAILED", "Không tải được danh sách tham chiếu"), "error", 3000)
    } finally {
      setLoading(false)
    }
  }, [
    currentLinkedChitId,
    currentLinkedChitType,
    excludeLinkedSources,
    referenceConfig,
    pendingUnlinkSourceIdSet,
    selectedSourceIdSet,
    t,
    useGlobalLinkedStatus,
  ])

  useEffect(() => {
    if (visible) {
      const initialIds = new Set(selectedSourceIds.map(normalizeSourceId).filter((id): id is number => id !== null))
      selectedIdsRef.current = new Set(initialIds)
      initialLinkedIdsRef.current = new Set(initialIds)
      touchedIdsRef.current = new Set()
      sourceByIdRef.current = new Map()
      setSelectedCount(initialIds.size)
      void loadRows()
      return
    }

    initialLinkedIdsRef.current = new Set()
    selectedIdsRef.current = new Set()
    touchedIdsRef.current = new Set()
    sourceByIdRef.current = new Map()
    setRows([])
    setSelectedCount(0)
  }, [loadRows, selectedSourceIds, visible])

  useEffect(() => {
    syncGridSelection(rows)
  }, [rows, syncGridSelection])

  const handleSelectionChanged = useCallback((event: SelectionChangedEvent<LookupChitInfo, number | string>) => {
    if (applyingSelectionRef.current) {
      return
    }

    const selectedKeys = new Set(
      (event.selectedRowKeys ?? [])
        .map(normalizeSourceId)
        .filter((id): id is number => id !== null),
    )

    rows.forEach((row) => {
      const sourceId = normalizeSourceId(row.CHIT_ID)
      if (!sourceId) {
        return
      }

      const isSelected = selectedKeys.has(sourceId)
      if (selectedIdsRef.current.has(sourceId) !== isSelected) {
        touchedIdsRef.current.add(sourceId)
      }

      if (isSelected) {
        selectedIdsRef.current.add(sourceId)
        sourceByIdRef.current.set(sourceId, row)
      } else {
        selectedIdsRef.current.delete(sourceId)
      }
    })

    ;(event.selectedRowsData ?? []).forEach((row) => {
      const sourceId = normalizeSourceId(row.CHIT_ID)
      if (sourceId) {
        sourceByIdRef.current.set(sourceId, row)
      }
    })

    setSelectedCount(selectedIdsRef.current.size)
  }, [rows])

  const handleRowPrepared = useCallback((event: RowPreparedEvent<LookupChitInfo>) => {
    if (event.rowType !== "data" || !event.data?.IS_LINKED_TO_CURRENT_SOURCE) {
      return
    }

    event.rowElement?.classList.add("bg-emerald-50", "text-emerald-900")
  }, [])

  const handleConfirm = useCallback(async () => {
    if (!referenceConfig) {
      onClose()
      return
    }

    const selectedIds = new Set(selectedIdsRef.current)
    const selectedSources = Array.from(selectedIds)
      .sort((left, right) => left - right)
      .map((sourceId) => sourceByIdRef.current.get(sourceId) ?? createSourceStub(referenceConfig, sourceId))
    const unlinkedSources = Array.from(initialLinkedIdsRef.current)
      .filter((sourceId) => !selectedIds.has(sourceId))
      .sort((left, right) => left - right)
      .map((sourceId) => sourceByIdRef.current.get(sourceId) ?? createSourceStub(referenceConfig, sourceId))
    const addedSources = Array.from(selectedIds)
      .filter((sourceId) => !initialLinkedIdsRef.current.has(sourceId))
      .sort((left, right) => left - right)
      .map((sourceId) => sourceByIdRef.current.get(sourceId) ?? createSourceStub(referenceConfig, sourceId))

    if (selectedSources.length === 0 && unlinkedSources.length === 0) {
      onClose()
      return
    }

    await onConfirm(selectedSources, unlinkedSources, addedSources)
  }, [onClose, onConfirm, referenceConfig])

  return (
    <Popup
      visible={visible}
      title={t("REFERENCE_SELECT_MULTIPLE", "Chọn nhiều phiếu xuất kho")}
      showTitle={true}
      dragEnabled={false}
      hideOnOutsideClick={false}
      width="78vw"
      height="72vh"
      maxWidth="78vw"
      maxHeight="75vh"
      container="body"
      position={{ my: "center", at: "center", of: window }}
      onHiding={onClose}
    >
      <div className="flex h-full flex-col gap-2 p-3">
        <GridToolbar
          gridRef={gridRef}
          title={t("REFERENCE_SELECT_MULTIPLE", "Chọn nhiều phiếu xuất kho")}
          showDateRange={true}
          fromDate={fromDate}
          toDate={toDate}
          onFromDateChange={setFromDate}
          onToDateChange={setToDate}
          onRangeSearch={loadRows}
          showSearch={true}
          showRefresh={false}
          showAdd={false}
          showColumnChooser={false}
          showExportPdf={false}
          showExportXlsx={false}
          showDelete={false}
          showImport={false}
          shortcutsEnabled={false}
        />

        <div className="flex-1 overflow-hidden rounded-lg border border-gray-200 bg-white">
          <PageGrid<LookupChitInfo>
            dataSource={rows}
            keyExpr="CHIT_ID"
            screenCd="MULTI_REFERENCE_POPUP"
            gridId="multi-reference-popup-grid"
            persistColumnSettings={false}
            onInitialized={(event) => {
              gridRef.current = event.component ?? null
              syncGridSelection(rows)
            }}
            onRowPrepared={handleRowPrepared}
            onSelectionChanged={handleSelectionChanged}
            selectMode="multiple"
            selectByClick={true}
            pageSize={50}
            showPager={true}
            pagingEnabled={true}
          >
            <DataGridColumn dataField="CHIT_NO" caption={t("CHIT_NO", "Số chứng từ")} width={180} />
            <DataGridColumn dataField="CHIT_YMD" caption={t("CHIT_YMD", "Ngày giao dịch")} dataType="date" format="dd/MM/yyyy" width={140} />
            <DataGridColumn dataField="PAYER_INFO" caption={t("lblPayer", "Đối tượng")} />
            <DataGridColumn dataField="AMOUNT" caption={t("AMOUNT", "Tổng tiền")} dataType="number" format={getFormat("AMOUNT", "#,##0.00")} width={140} />
            <DataGridColumn dataField="REFERENCE_LINK_STATUS_TEXT" caption={t("STATUS", "Trạng thái")} width={190} />
          </PageGrid>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-gray-200 pt-2">
          <div className="text-sm font-medium text-slate-600">
            {t("REFERENCE_SELECTED_COUNT", "Đã chọn")}: {selectedCount}
          </div>
          <div className="flex justify-end gap-2">
            <Button
              text={t("CANCEL", "Cancel")}
              stylingMode="text"
              onClick={onClose}
              disabled={loading}
            />
            <Button
              text={t("OK", "OK")}
              type="default"
              stylingMode="contained"
              disabled={loading}
              onClick={handleConfirm}
            />
          </div>
        </div>
      </div>
    </Popup>
  )
}
