import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import DataGrid, {
  Column,
  Paging,
  Scrolling,
  Selection,
  type DataGridTypes,
} from "devextreme-react/data-grid"
import DropDownBox, { type DropDownBoxTypes } from "devextreme-react/drop-down-box"
import TextBox, { type TextBoxTypes } from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"

import { LanguageContext } from "@/lib/i18nLoader"
import { formatYmdForDisplay } from "@/pages/Accounting/accountingDateUtils"
import {
  loadFreeAccountingDetailsInDateRange,
  type LinkDetailCandidate,
} from "@/pages/Inventory/inventoryAccountingLinkUtils"
import type { InventoryAccountingReferenceOption } from "@/pages/VoucherManagement/components/chitEditorConstants"
import { getLookupOverlayContainer } from "./lookupHelpers"

type AccountingFreeDetailLookupProps = {
  options: InventoryAccountingReferenceOption[]
  fromYmd?: string
  toYmd?: string
  onSelect: (candidate: LinkDetailCandidate) => Promise<void> | void
  placeholder?: string
  disabled?: boolean
}

const DROPDOWN_WIDTH = 860
const DROPDOWN_HEIGHT = 420
const TAB_BAR_HEIGHT = 40
const GRID_PAGE_SIZE = 40

function formatDetailText(item: LinkDetailCandidate | null) {
  if (!item) {
    return ""
  }

  const chitNo = String(item.chitNo ?? "").trim()
  const dateText = formatYmdForDisplay(item.chitYmd)
  const customerNm = String(item.customerNm ?? "").trim()
  const amountText = Number(item.amount ?? 0).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })

  return [chitNo, dateText, customerNm, amountText].filter(Boolean).join(" - ")
}

function formatAmount(value: unknown) {
  return Number(value ?? 0).toLocaleString("vi-VN", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })
}

function optionsSignature(options: InventoryAccountingReferenceOption[]): string {
  return options.map((option) => option.optionKey).join("|")
}

export default function AccountingFreeDetailLookup({
  options,
  fromYmd,
  toYmd,
  onSelect,
  placeholder,
  disabled = false,
}: AccountingFreeDetailLookupProps) {
  const { translate } = useContext(LanguageContext)
  const t = useCallback((key: string, fallback: string) => translate(key, fallback), [translate])

  const cacheRef = useRef<Record<string, LinkDetailCandidate[]>>({})
  const loadSeqRef = useRef(0)
  const gridRef = useRef<dxDataGrid<LinkDetailCandidate, number> | null>(null)

  const [activeOptionKey, setActiveOptionKey] = useState(() => options[0]?.optionKey ?? "")
  const [items, setItems] = useState<LinkDetailCandidate[]>([])
  const [opened, setOpened] = useState(false)
  const [loading, setLoading] = useState(false)
  const [searchBoxKey, setSearchBoxKey] = useState(0)
  const [selectedDetailId, setSelectedDetailId] = useState<number | null>(null)
  const [selectedCandidate, setSelectedCandidate] = useState<LinkDetailCandidate | null>(null)

  const optionKeyList = optionsSignature(options)

  useEffect(() => {
    cacheRef.current = {}
    loadSeqRef.current += 1
    setItems([])
    setOpened(false)
    setLoading(false)
    setSearchBoxKey((value) => value + 1)
    setSelectedDetailId(null)
    setSelectedCandidate(null)
    setActiveOptionKey(optionKeyList ? optionKeyList.split("|")[0] ?? "" : "")
  }, [fromYmd, optionKeyList, toYmd])

  const activeOption = useMemo(
    () => options.find((option) => option.optionKey === activeOptionKey) ?? options[0] ?? null,
    [activeOptionKey, options],
  )

  const loadOption = useCallback(
    async (optionKey: string) => {
      const option = options.find((item) => item.optionKey === optionKey) ?? null
      if (!option) {
        setItems([])
        return
      }

      const cached = cacheRef.current[optionKey]
      if (cached) {
        setItems(cached)
        return
      }

      const seq = ++loadSeqRef.current
      setLoading(true)
      try {
        const candidates = await loadFreeAccountingDetailsInDateRange({
          ledger: option.ledger,
          chitType: option.chitType,
          fromYmd: fromYmd || undefined,
          toYmd: toYmd || undefined,
        })
        cacheRef.current[optionKey] = candidates
        if (seq !== loadSeqRef.current) {
          return
        }
        setItems(candidates)
      } catch (error) {
        console.error("Load free accounting detail lookup failed", error)
        if (seq !== loadSeqRef.current) {
          return
        }
        cacheRef.current[optionKey] = []
        setItems([])
      } finally {
        if (seq === loadSeqRef.current) {
          setLoading(false)
        }
      }
    },
    [fromYmd, options, toYmd],
  )

  const handleOpenedChange = useCallback(
    async (nextOpened: boolean) => {
      if (nextOpened) {
        const optionKey = activeOption?.optionKey || options[0]?.optionKey || ""
        if (optionKey) {
          if (optionKey !== activeOptionKey) {
            setActiveOptionKey(optionKey)
          }
          await loadOption(optionKey)
        }
      }
      setOpened(nextOpened)
    },
    [activeOption, activeOptionKey, loadOption, options],
  )

  const handleTabClick = useCallback(
    async (optionKey: string) => {
      if (!optionKey || optionKey === activeOptionKey) {
        return
      }
      setSearchBoxKey((value) => value + 1)
      gridRef.current?.searchByText?.("")
      setActiveOptionKey(optionKey)
      await loadOption(optionKey)
    },
    [activeOptionKey, loadOption],
  )

  const handleSearchValueChanged = useCallback((event: TextBoxTypes.ValueChangedEvent) => {
    gridRef.current?.searchByText?.(String(event.value ?? ""))
  }, [])

  const applyCandidate = useCallback(
    async (candidate: LinkDetailCandidate) => {
      const detailId = Number(candidate.chitDetailId ?? 0)
      if (!(detailId > 0)) {
        return
      }

      setSelectedDetailId(detailId)
      setSelectedCandidate(candidate)
      setOpened(false)
      await onSelect(candidate)
    },
    [onSelect],
  )

  const handleGridSelectionChanged = useCallback(
    (event: DataGridTypes.SelectionChangedEvent) => {
      const selected = (event.selectedRowsData?.[0] as LinkDetailCandidate | undefined) ?? null
      if (!selected) {
        return
      }
      if (Number(selected.chitDetailId ?? 0) === Number(selectedDetailId ?? 0) && selectedDetailId != null) {
        setOpened(false)
        return
      }
      void applyCandidate(selected)
    },
    [applyCandidate, selectedDetailId],
  )

  const handleValueChanged = useCallback((event: DropDownBoxTypes.ValueChangedEvent) => {
    if (event.value == null || event.value === "") {
      setSelectedDetailId(null)
      setSelectedCandidate(null)
    }
  }, [])

  const gridDataSource = useMemo(() => {
    if (!selectedCandidate) {
      return items
    }
    if (items.some((item) => Number(item.chitDetailId ?? 0) === Number(selectedCandidate.chitDetailId ?? 0))) {
      return items
    }
    return [selectedCandidate, ...items]
  }, [items, selectedCandidate])

  const selectedRowKeys = useMemo(
    () => (selectedDetailId != null ? [selectedDetailId] : []),
    [selectedDetailId],
  )

  const displayExpr = useCallback((item: LinkDetailCandidate | null) => formatDetailText(item), [])

  const showTabs = options.length > 1
  const gridHeight = DROPDOWN_HEIGHT - TAB_BAR_HEIGHT - 8

  const dropDownOptions = useMemo(
    () => ({
      width: DROPDOWN_WIDTH,
      maxHeight: DROPDOWN_HEIGHT,
      container: getLookupOverlayContainer(),
      hideOnParentScroll: false,
      wrapperAttr: { class: "accounting-free-detail-lookup-dropdown" },
    }),
    [],
  )

  const renderContent = useCallback(
    () => (
      <div className="flex h-full flex-col" style={{ height: DROPDOWN_HEIGHT - 4 }}>
        <div
          className="flex items-center gap-2 border-b border-slate-200 px-2 py-1.5"
          style={{ minHeight: TAB_BAR_HEIGHT }}
          onMouseDown={(event) => {
            // Keep DropDownBox open; allow TextBox to take focus.
            if ((event.target as HTMLElement | null)?.closest?.(".dx-texteditor")) {
              event.stopPropagation()
              return
            }
            event.preventDefault()
            event.stopPropagation()
          }}
        >
          {showTabs ? (
            <div className="flex min-w-0 flex-1 flex-wrap gap-1">
              {options.map((option) => {
                const isActive = option.optionKey === (activeOption?.optionKey ?? "")
                return (
                  <button
                    key={option.optionKey}
                    type="button"
                    className={`rounded px-2.5 py-1 text-sm transition-colors ${
                      isActive
                        ? "bg-slate-800 font-medium text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                    onClick={() => {
                      void handleTabClick(option.optionKey)
                    }}
                  >
                    {t(option.hintKey, option.hintFallback)}
                  </button>
                )
              })}
            </div>
          ) : (
            <div className="min-w-0 flex-1" />
          )}
          <TextBox
            key={searchBoxKey}
            defaultValue=""
            width={240}
            mode="search"
            showClearButton
            placeholder={t("SEARCH", "Tìm kiếm")}
            valueChangeEvent="keyup input"
            onValueChanged={handleSearchValueChanged}
          />
        </div>
        <div className="relative min-h-0 flex-1">
          <DataGrid
            dataSource={gridDataSource}
            keyExpr="chitDetailId"
            height={gridHeight}
            hoverStateEnabled
            focusedRowEnabled
            showBorders
            columnAutoWidth={false}
            wordWrapEnabled={false}
            selectedRowKeys={selectedRowKeys}
            noDataText={t("NO_DATA", "Không có dữ liệu")}
            onInitialized={(event) => {
              gridRef.current = event.component ?? null
            }}
            onSelectionChanged={handleGridSelectionChanged}
            onRowDblClick={(event) => {
              if (event.data) {
                void applyCandidate(event.data as LinkDetailCandidate)
              }
            }}
          >
            <Selection mode="single" />
            <Scrolling mode="virtual" />
            <Paging enabled pageSize={GRID_PAGE_SIZE} />
            <Column dataField="chitNo" caption={t("CHIT_NO", "Số chứng từ")} width={140} />
            <Column
              dataField="chitYmd"
              caption={t("CHIT_YMD", "Ngày giao dịch")}
              width={110}
              calculateCellValue={(row: LinkDetailCandidate) => formatYmdForDisplay(row.chitYmd)}
            />
            <Column dataField="customerNm" caption={t("CUSTOMER_NM", "Khách hàng")} minWidth={160} />
            <Column dataField="debit" caption={t("DEBIT", "TK Nợ")} width={90} />
            <Column dataField="credit" caption={t("CREDIT", "TK Có")} width={90} />
            <Column
              dataField="amount"
              caption={t("AMOUNT", "Thành tiền")}
              width={120}
              dataType="number"
              alignment="right"
              customizeText={(cell) => formatAmount(cell.value)}
            />
          </DataGrid>
          {loading ? (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center bg-white/50">
              <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600" />
            </div>
          ) : null}
        </div>
      </div>
    ),
    [
      activeOption,
      applyCandidate,
      gridDataSource,
      gridHeight,
      handleGridSelectionChanged,
      handleSearchValueChanged,
      handleTabClick,
      loading,
      options,
      searchBoxKey,
      selectedRowKeys,
      showTabs,
      t,
    ],
  )

  if (options.length === 0) {
    return null
  }

  return (
    <div className="relative inline-flex w-full min-w-[280px] max-w-[420px]">
      <DropDownBox
        value={selectedDetailId}
        opened={opened}
        openOnFieldClick
        deferRendering={false}
        showClearButton={false}
        disabled={disabled}
        dataSource={gridDataSource}
        valueExpr="chitDetailId"
        displayExpr={displayExpr as (item: unknown) => string}
        placeholder={placeholder ?? t("SELECT_LINK_VOUCHER", "Chọn chứng từ liên kết")}
        dropDownOptions={dropDownOptions}
        onOpenedChange={(value) => {
          void handleOpenedChange(Boolean(value))
        }}
        onValueChanged={handleValueChanged}
        contentRender={renderContent}
      />
    </div>
  )
}
