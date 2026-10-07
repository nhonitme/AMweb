import { useCallback, useEffect, useMemo, useState } from "react"
import SelectBox, {
  Button as SelectBoxButton,
  DropDownOptions,
  type SelectBoxTypes,
} from "devextreme-react/select-box"

import { getInventoryLinkStatuses } from "@/api/inventoryLinkApi"
import { getChits } from "@/api/voucherApi"
import { normalizeChitRows } from "@/pages/VoucherManagement/chitUtils"
import type { ChitInfo, ChitLedger, ChitType } from "@/types/voucher"

type LookupChitInfo = ChitInfo & {
  IS_LINKED_SOURCE?: boolean
}

type ReferenceLookupProps = {
  ledger: ChitLedger
  chitType: ChitType
  value?: number | null
  selectedSourceIds?: number[]
  onSelect: (item: ChitInfo) => Promise<void>
  placeholder?: string
  hintKey?: string
  hintFallback?: string
  multiReferenceHint?: string
  onOpenMultiReference?: () => void
  disabled?: boolean
  excludeLinkedSources?: boolean
  useGlobalLinkedStatus?: boolean
}

function formatReferenceText(item: ChitInfo | null) {
  if (!item) {
    return ""
  }

  const chitNo = String(item.CHIT_NO ?? "").trim()
  const payer = String(item.PAYER_INFO ?? "").trim()
  const dateValue = item.CHIT_YMD ? new Date(String(item.CHIT_YMD)) : null
  const dateText = dateValue?.toLocaleDateString("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  })

  return [chitNo, dateText, payer].filter(Boolean).join(" - ")
}

export default function ReferenceLookup({
  ledger,
  chitType,
  value,
  selectedSourceIds = [],
  onSelect,
  placeholder,
  hintKey,
  hintFallback,
  multiReferenceHint,
  onOpenMultiReference,
  excludeLinkedSources = false,
  disabled = false,
  useGlobalLinkedStatus = true,
}: ReferenceLookupProps) {
  const [items, setItems] = useState<LookupChitInfo[]>([])
  const [opened, setOpened] = useState(false)
  const [loading, setLoading] = useState(false)
  const [listLoaded, setListLoaded] = useState(false)
  const [selectedId, setSelectedId] = useState<number | null>(value ?? null)
  const selectedSourceIdSet = useMemo(
    () =>
      new Set(
        selectedSourceIds
          .map((id) => Number(id))
          .filter((id) => Number.isFinite(id) && id > 0),
      ),
    [selectedSourceIds],
  )

  useEffect(() => {
    setSelectedId(value ?? null)
  }, [value])

  useEffect(() => {
    setItems([])
    setOpened(false)
    setLoading(false)
    setListLoaded(false)
  }, [ledger, chitType])

  useEffect(() => {
    const selectedValue = Number(value ?? 0)
    if (!Number.isFinite(selectedValue) || selectedValue <= 0 || listLoaded) {
      return
    }

    if (items.some((item) => Number(item.CHIT_ID ?? 0) === selectedValue)) {
      return
    }

    let cancelled = false
    void getChits(ledger, chitType, {
      chitId: selectedValue,
      pageNumber: 1,
      pageSize: 1,
    })
      .then((response) => {
        if (cancelled || listLoaded) {
          return
        }
        const normalized = normalizeChitRows(response.data || [], chitType)
        if (normalized.length === 0) {
          return
        }
        setItems((current) => {
          if (current.some((item) => Number(item.CHIT_ID ?? 0) === selectedValue)) {
            return current
          }
          return [
            {
              ...normalized[0],
              IS_LINKED_SOURCE: true,
            },
            ...current,
          ]
        })
      })
      .catch((error: unknown) => {
        console.error("Load selected reference failed", error)
      })

    return () => {
      cancelled = true
    }
  }, [chitType, items, ledger, listLoaded, value])

  const displayExpr = useCallback((item: ChitInfo | null) => {
    return formatReferenceText(item)
  }, [])

  const loadItems = useCallback(async () => {
    if (listLoaded) {
      return
    }

    setLoading(true)
    try {
      const response = await getChits(ledger, chitType, {
        pageNumber: 1,
        pageSize: 50,
      })
      const normalized = normalizeChitRows(response.data || [], chitType)
      if (normalized.length === 0) {
        setItems([])
        setListLoaded(true)
        return
      }

      const sourceIds = normalized
        .map((item) => Number(item.CHIT_ID ?? 0))
        .filter((id) => Number.isFinite(id) && id > 0)

      let itemsWithStatus: LookupChitInfo[] = normalized.map((item) => ({
        ...item,
        IS_LINKED_SOURCE: selectedSourceIdSet.has(Number(item.CHIT_ID ?? 0)),
      }))

      if (useGlobalLinkedStatus) {
        const statuses = await getInventoryLinkStatuses(ledger, chitType, sourceIds)
        const linkedIds = new Set(
          statuses
            .filter((status) => (status.LINKED_CHITDETAIL_IDS ?? []).length > 0 || status.LINKED_TOTAL_QUANTITY > 0)
            .map((status) => Number(status.CHIT_ID ?? 0))
            .filter((id) => Number.isFinite(id) && id > 0),
        )
        itemsWithStatus = normalized.map((item) => ({
          ...item,
          IS_LINKED_SOURCE:
            selectedSourceIdSet.has(Number(item.CHIT_ID ?? 0)) ||
            linkedIds.has(Number(item.CHIT_ID ?? 0)),
        }))
      }

      if (excludeLinkedSources) {
        setItems(
          itemsWithStatus.filter((item) => {
            const sourceId = Number(item.CHIT_ID ?? 0)
            return !item.IS_LINKED_SOURCE || selectedSourceIdSet.has(sourceId)
          }),
        )
      } else {
        setItems(itemsWithStatus)
      }
      setListLoaded(true)
    } catch (error) {
      console.error("Load reference lookup failed", error)
    } finally {
      setLoading(false)
    }
  }, [chitType, excludeLinkedSources, ledger, listLoaded, selectedSourceIdSet, useGlobalLinkedStatus])

  const searchExpr = useMemo(
    () => ["CHIT_NO", "CHIT_YMD", "PAYER_INFO", "AMOUNT"],
    [],
  )

  const renderItem = useCallback(
    (item: LookupChitInfo | null) => {
      if (!item) {
        return null
      }

      const dateValue = item.CHIT_YMD ? new Date(String(item.CHIT_YMD)) : null
      const dateText = dateValue?.toLocaleDateString("vi-VN", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
      })
      const isSelectedReference = selectedSourceIdSet.has(Number(item.CHIT_ID ?? 0))
      const isLinked = useGlobalLinkedStatus ? item.IS_LINKED_SOURCE === true || isSelectedReference : isSelectedReference

      return (
        <div className="grid grid-cols-[160px_140px_1fr_160px] gap-3 px-3 py-2 text-sm text-slate-700">
          <div className="font-semibold text-slate-900">{String(item.CHIT_NO ?? "")}</div>
          <div className="text-slate-600">{dateText || ""}</div>
          <div className="text-slate-700">{String(item.PAYER_INFO ?? "")}</div>
          <div className="flex items-center justify-end gap-2 text-right">
            {isLinked ? (
              <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                <span className="h-2 w-2 rounded-full bg-emerald-500" />
                Da lien ket
              </span>
            ) : null}
            <span className="text-slate-700">{Number(item.AMOUNT ?? 0).toLocaleString("vi-VN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
        </div>
      )
    },
    [selectedSourceIdSet, useGlobalLinkedStatus],
  )

  const handleOpenedChange = useCallback(
    async (nextOpened: boolean) => {
      if (nextOpened) {
        await loadItems()
      }
      setOpened(nextOpened)
    },
    [loadItems],
  )

  const handleValueChanged = useCallback(
    async (event: SelectBoxTypes.ValueChangedEvent) => {
      const selectedItem = (event.component?.option("selectedItem") as ChitInfo | null) ?? null
      const selectedValue = event.value
      const selected =
        selectedItem ||
        (selectedValue != null
          ? items.find((item) => Number(item.CHIT_ID ?? 0) === Number(selectedValue)) ?? null
          : null)

      if (!selected) {
        setSelectedId(null)
        return
      }

      setSelectedId(Number(selected.CHIT_ID ?? 0) || null)
      await onSelect(selected)
    },
    [items, onSelect],
  )

  return (
    <div className="relative inline-flex w-full min-w-[320px] max-w-[420px]">
      <SelectBox
        dataSource={items}
        value={selectedId ?? null}
        valueExpr="CHIT_ID"
        displayExpr={displayExpr as (item: unknown) => string}
        itemRender={renderItem}
        opened={opened}
        openOnFieldClick={true}
        deferRendering={false}
        searchEnabled={true}
        showDataBeforeSearch={true}
        searchExpr={searchExpr}
        searchMode="contains"
        searchTimeout={0}
        minSearchLength={0}
        placeholder={placeholder ?? (hintKey ? hintFallback ?? "Chọn phiếu xuất kho" : "Chọn phiếu xuất kho")}
        noDataText="Không có dữ liệu"      
        disabled={disabled}
        onOpenedChange={handleOpenedChange}
        onInput={() => setOpened(true)}
        onValueChanged={handleValueChanged}
      >
        <DropDownOptions width={640} maxHeight={420} />
        <SelectBoxButton name="dropDown" location="after" />
        {onOpenMultiReference ? (
          <SelectBoxButton
            name="openLookupPopup"
            location="after"
            options={{
              icon: "search",
              stylingMode: "text",
              hint: multiReferenceHint,
              onClick: onOpenMultiReference,
              disabled,
            }}
          />
        ) : null}
      </SelectBox>
      {loading ? (
        <div className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin rounded-full border border-slate-300 border-t-blue-600" />
      ) : null}
    </div>
  )
}
