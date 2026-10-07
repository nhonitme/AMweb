import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Button from "devextreme-react/button"
import DataGrid, { FilterRow, Paging, Scrolling, Selection } from "devextreme-react/data-grid"
import DateBox from "devextreme-react/date-box"
import LoadPanel from "devextreme-react/load-panel"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent, RowDblClickEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"
import notify from "devextreme/ui/notify"

import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { useEInvoiceListQuery } from "@/hooks/queries/useEInvoiceListQuery"
import { useMasterListLoadError } from "@/hooks/queries/master/masterQueryHelpers"
import useShortcutBindings from "@/hooks/useShortcutBindings"
import { LanguageContext } from "@/lib/i18nLoader"
import { createPopupShortcutWrapperAttr, isPopupShortcutScopeTopMost, usePopupShortcutScopeId } from "@/lib/popupShortcutScope"
import { useSysCodes } from "@/lib/sysCodeContext"
import { createShortcutBindings } from "@/lib/shortcuts/shortcutBindings"
import { SHORTCUT_ACTIONS } from "@/lib/shortcuts/shortcutDefinitions"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import type { EInvoice } from "@/types/einvoice"

import {
  buildEInvoiceAdvancedFilterChips,
  buildEInvoiceCqtStatusOptions,
  buildEInvoiceSignStatusOptions,
  clearEInvoiceAdvancedFilterField,
  cloneEInvoiceAdvancedFilters,
  createEmptyEInvoiceAdvancedFilters,
  EINV_CQT_STATUS_CODE_TYPE,
  EINV_SIGN_STATUS_CODE_TYPE,
  hasEInvoiceAdvancedFilters,
  normalizeEInvoiceAdvancedFilters,
  toEInvoiceSearchFilterParams,
  type EInvoiceAdvancedFilterChip,
  type EInvoiceAdvancedFilters,
} from "../einvoiceAdvancedSearch"
import {
  buildEInvoiceMailStatusOptions,
  buildEInvoiceTchdonOptions,
  buildInvoiceStatusOptions,
  EINV_INVOICE_STATUS_CODE_TYPE,
  EINV_MAIL_STATUS_CODE_TYPE,
  EINV_TCHDON_CODE_TYPE,
  normalizeEInvoiceRows,
} from "../einvoiceModel"
import { formatDateToYmd } from "@/pages/Accounting/accountingDateUtils"
import { EInvoiceActiveFilterChips } from "./EInvoiceActiveFilterChips"
import { EInvoiceAdvancedSearchPanel } from "./EInvoiceAdvancedSearchPanel"
import EInvoiceEditorShell from "./EInvoiceEditorShell"
import { EInvoiceListGridColumns } from "./EInvoiceListGridColumns"
import { EInvoiceTableShell } from "./EInvoiceTableShell"

type GridKey = number

type InvoiceSelectListQuery = {
  fromYmd?: string
  toYmd?: string
  filters: EInvoiceAdvancedFilters
}

function createMonthStartDate(): Date {
  const date = new Date()
  date.setDate(1)
  date.setHours(0, 0, 0, 0)
  return date
}

function createToday(): Date {
  const date = new Date()
  date.setHours(0, 0, 0, 0)
  return date
}

/** DateBox may emit Date or serialized string (dateSerializationFormat); treat both. */
function parseDateBoxValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }

  if (typeof value === "string") {
    const text = value.trim()
    if (!text) {
      return null
    }

    const parsed = new Date(text.includes("T") ? text : `${text}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }

  return null
}

function createInitialListQuery(): InvoiceSelectListQuery {
  return {
    fromYmd: formatDateToYmd(createMonthStartDate()) ?? undefined,
    toYmd: formatDateToYmd(createToday()) ?? undefined,
    filters: createEmptyEInvoiceAdvancedFilters(),
  }
}

type EInvoiceInvoiceSelectPopupProps = {
  visible: boolean
  companyCd: string
  excludeInvoiceId?: number
  isSigned?: number
  /** Exact MST người mua filter (equals). */
  nmuaMst?: string | null
  selectionMode?: "single" | "multiple"
  enableShortcuts?: boolean
  onClose: () => void
  onSelect: (invoices: EInvoice[]) => void
}

export default function EInvoiceInvoiceSelectPopup({
  visible,
  companyCd,
  excludeInvoiceId = 0,
  isSigned,
  nmuaMst = null,
  selectionMode = "single",
  enableShortcuts = false,
  onClose,
  onSelect,
}: EInvoiceInvoiceSelectPopupProps) {
  const gridRef = useRef<dxDataGrid<EInvoice, GridKey> | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(() => createMonthStartDate())
  const [toDate, setToDate] = useState<Date | null>(() => createToday())
  const [listQuery, setListQuery] = useState<InvoiceSelectListQuery>(() => createInitialListQuery())
  const [advancedDraft, setAdvancedDraft] = useState<EInvoiceAdvancedFilters>(() => createEmptyEInvoiceAdvancedFilters())
  const [advancedSearchOpen, setAdvancedSearchOpen] = useState(false)
  const [selectedRows, setSelectedRows] = useState<EInvoice[]>([])

  const { lang, translate } = useContext(LanguageContext) as {
    lang: string
    translate?: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const { getCodesByType } = useSysCodes()
  const invoiceStatusOptions = useMemo(
    () => buildInvoiceStatusOptions(getCodesByType(EINV_INVOICE_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const tchdonOptions = useMemo(
    () => buildEInvoiceTchdonOptions(getCodesByType(EINV_TCHDON_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const cqtStatusOptions = useMemo(
    () => buildEInvoiceCqtStatusOptions(getCodesByType(EINV_CQT_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const signStatusOptions = useMemo(
    () => buildEInvoiceSignStatusOptions(getCodesByType(EINV_SIGN_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )
  const mailStatusOptions = useMemo(
    () => buildEInvoiceMailStatusOptions(getCodesByType(EINV_MAIL_STATUS_CODE_TYPE), t),
    [getCodesByType, t],
  )

  const isSingleSelect = selectionMode === "single"
  const signedFilter = typeof isSigned === "number" && Number.isFinite(isSigned) ? isSigned : null
  const buyerTaxFilter = String(nmuaMst ?? "").trim()

  const listQueryParams = useMemo(() => {
    const filterParams = toEInvoiceSearchFilterParams(listQuery.filters)
    return {
      lang,
      fromYmd: listQuery.fromYmd,
      toYmd: listQuery.toYmd,
      ...filterParams,
      ...(signedFilter !== null ? { isSigned: signedFilter } : {}),
      ...(buyerTaxFilter
        ? {
            nmuaMst: buyerTaxFilter,
            nmuaMstOp: "equals",
          }
        : {}),
    }
  }, [buyerTaxFilter, lang, listQuery, signedFilter])

  const {
    data: invoiceData = [],
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch,
  } = useEInvoiceListQuery(listQueryParams, visible)

  const rows = useMemo(() => {
    let normalized = normalizeEInvoiceRows(invoiceData, companyCd)
    if (signedFilter !== null) {
      normalized = normalized.filter((invoice) => Number(invoice.IS_SIGNED ?? 0) === signedFilter)
    }
    if (buyerTaxFilter) {
      const expected = buyerTaxFilter.replace(/[\s.\-]/g, "").toUpperCase()
      normalized = normalized.filter((invoice) => {
        const actual = String(invoice.NMUA_MST ?? "").trim().replace(/[\s.\-]/g, "").toUpperCase()
        return actual === expected
      })
    }
    if (excludeInvoiceId <= 0) {
      return normalized
    }
    return normalized.filter((invoice) => Number(invoice.INVOICE_ID ?? 0) !== excludeInvoiceId)
  }, [buyerTaxFilter, companyCd, excludeInvoiceId, invoiceData, signedFilter])

  const loading = isLoading || isFetching
  const dateBoxOptions = useMemo(
    () =>
      createDateBoxEditorOptions({
        dateSerializationFormat: "yyyy-MM-dd",
        openOnFieldClick: true,
      }),
    [],
  )

  useMasterListLoadError(isError, loadError, t, "Failed to load e-invoices")

  const validateDateRange = useCallback(() => {
    if (!fromDate || !toDate || fromDate <= toDate) {
      return true
    }

    notify(t("INVALID_DATE_RANGE", "From date must be earlier than or equal to to date"), "warning", 3000)
    return false
  }, [fromDate, t, toDate])

  const applyListQuery = useCallback(
    (nextFilters?: EInvoiceAdvancedFilters) => {
      if (!validateDateRange()) {
        return false
      }

      const nextFromYmd = formatDateToYmd(fromDate)
      const nextToYmd = formatDateToYmd(toDate)
      if (!nextFromYmd || !nextToYmd) {
        notify(t("DATE_RANGE_REQUIRED", "Vui lòng chọn đầy đủ Từ ngày và Đến ngày"), "warning", 3000)
        return false
      }

      const resolvedFilters = normalizeEInvoiceAdvancedFilters(
        nextFilters ? cloneEInvoiceAdvancedFilters(nextFilters) : advancedDraft,
      )
      setAdvancedDraft(cloneEInvoiceAdvancedFilters(resolvedFilters))

      const unchanged =
        listQuery.fromYmd === nextFromYmd
        && listQuery.toYmd === nextToYmd
        && JSON.stringify(listQuery.filters) === JSON.stringify(resolvedFilters)

      if (unchanged) {
        void refetch()
        return true
      }

      setListQuery({
        fromYmd: nextFromYmd,
        toYmd: nextToYmd,
        filters: resolvedFilters,
      })
      return true
    },
    [advancedDraft, fromDate, listQuery, refetch, t, toDate, validateDateRange],
  )

  // Enter / click Search can race DateBox commit (mask). Defer one tick so state is current.
  const scheduleSearch = useCallback(() => {
    window.setTimeout(() => {
      applyListQuery()
    }, 0)
  }, [applyListQuery])

  useEffect(() => {
    if (!visible) {
      setAdvancedSearchOpen(false)
      return
    }

    setSelectedRows([])
    gridRef.current?.clearSelection()
  }, [rows, visible])

  const handleGridInitialized = useCallback((event: InitializedEvent<EInvoice, GridKey>) => {
    gridRef.current = event.component ?? null
  }, [])

  const handleSelectionChanged = useCallback(
    (event: SelectionChangedEvent<EInvoice, GridKey>) => {
      const nextRows = event.selectedRowsData ?? []
      if (isSingleSelect && nextRows.length > 1) {
        const latest = nextRows[nextRows.length - 1]
        gridRef.current?.selectRows([latest.INVOICE_ID], false)
        setSelectedRows([latest])
        return
      }

      setSelectedRows(nextRows)
    },
    [isSingleSelect],
  )

  const handleRowDblClick = useCallback(
    (event: RowDblClickEvent<EInvoice, GridKey>) => {
      if (event.data) {
        onSelect([event.data])
      }
    },
    [onSelect],
  )

  const confirmSelection = useCallback(() => {
    if (selectedRows.length === 0) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn dòng"), "warning", 2500)
      return
    }

    onSelect(isSingleSelect ? [selectedRows[0]] : selectedRows)
  }, [isSingleSelect, onSelect, selectedRows, t])

  const selectionOptions = useMemo(
    () => ({
      mode: isSingleSelect ? ("single" as const) : ("multiple" as const),
      selectAllMode: "allPages" as const,
      showCheckBoxesMode: isSingleSelect ? ("none" as const) : ("always" as const),
    }),
    [isSingleSelect],
  )

  const popupShortcutScopeId = usePopupShortcutScopeId("einvoice-invoice-select-popup")

  const shortcutBindings = useMemo(
    () =>
      createShortcutBindings(
        [SHORTCUT_ACTIONS.SAVE, SHORTCUT_ACTIONS.CLOSE],
        {
          [SHORTCUT_ACTIONS.SAVE]: () => confirmSelection(),
          [SHORTCUT_ACTIONS.CLOSE]: () => onClose(),
        },
        {
          [SHORTCUT_ACTIONS.SAVE]: { enabled: !loading && selectedRows.length > 0, allowInInput: true },
          [SHORTCUT_ACTIONS.CLOSE]: { allowInInput: true },
        },
      ),
    [confirmSelection, loading, onClose, selectedRows.length],
  )

  const shouldHandleShortcutEvent = useCallback(
    () => isPopupShortcutScopeTopMost(popupShortcutScopeId),
    [popupShortcutScopeId],
  )

  useShortcutBindings(shortcutBindings, {
    enabled: visible && enableShortcuts,
    shouldHandleEvent: shouldHandleShortcutEvent,
  })

  const handleAdvancedSearchReset = useCallback(() => {
    const empty = createEmptyEInvoiceAdvancedFilters()
    setAdvancedDraft(empty)
    applyListQuery(empty)
  }, [applyListQuery])

  const handleRemoveFilterChip = useCallback(
    (chipKey: EInvoiceAdvancedFilterChip["key"]) => {
      if (chipKey === "dateRange") {
        return
      }

      const next = clearEInvoiceAdvancedFilterField(listQuery.filters, chipKey)
      setAdvancedDraft(cloneEInvoiceAdvancedFilters(next))
      applyListQuery(next)
    },
    [applyListQuery, listQuery.filters],
  )

  const activeFilterChips = useMemo(() => {
    const invoiceStatusLabel =
      listQuery.filters.invoiceStatus === null
        ? undefined
        : invoiceStatusOptions.find((item) => item.value === listQuery.filters.invoiceStatus)?.text
    const tchdonLabel =
      listQuery.filters.tchdon === null
        ? undefined
        : tchdonOptions.find((item) => item.value === listQuery.filters.tchdon)?.text
    const mailStatusLabel =
      listQuery.filters.mailStatus === null
        ? undefined
        : mailStatusOptions.find((item) => item.value === listQuery.filters.mailStatus)?.text
    const signStatusLabel =
      listQuery.filters.isSigned === null
        ? undefined
        : signStatusOptions.find((item) => item.value === listQuery.filters.isSigned)?.text
    const cqtStatusLabel =
      listQuery.filters.cqtStatus === null
        ? undefined
        : cqtStatusOptions.find((item) => item.value === listQuery.filters.cqtStatus)?.text

    return buildEInvoiceAdvancedFilterChips(listQuery.filters, {
      t,
      invoiceStatusLabel,
      tchdonLabel,
      mailStatusLabel,
      signStatusLabel,
      cqtStatusLabel,
    })
  }, [cqtStatusOptions, invoiceStatusOptions, listQuery.filters, mailStatusOptions, signStatusOptions, t, tchdonOptions])

  const selectionHint =
    selectedRows.length > 0
      ? t("SELECTED_COUNT", "Đã chọn {0}").replace("{0}", String(selectedRows.length))
      : t("SELECT_INVOICE_HINT", "Chọn hóa đơn trong danh sách")

  return (
    <EInvoiceEditorShell
      visible={visible}
      title={t("SELECT_REF_INVOICE", "Chọn hóa đơn gốc")}
      subtitle={selectionHint}
      width="min(1180px, 96vw)"
      height="min(820px, 94vh)"
      loading={loading}
      closeDisabled={loading}
      animation={POPUP_FADE_ANIMATION}
      wrapperAttr={enableShortcuts ? createPopupShortcutWrapperAttr(popupShortcutScopeId) : undefined}
      onClose={onClose}
      onHiding={onClose}
      footer={
        <>
          <Button text={t("CANCEL", "Cancel")} stylingMode="outlined" disabled={loading} onClick={onClose} />
          <Button
            text={t("SELECT", "Select")}
            icon="check"
            type="default"
            stylingMode="contained"
            disabled={loading || selectedRows.length === 0}
            onClick={confirmSelection}
          />
        </>
      }
    >
      <div className="einvoice-editor__field-grid einvoice-editor__field-grid--12">
        <div className="einvoice-editor__field einvoice-editor__col-3">
          <div className="einvoice-editor__field-label">{t("FROM_DATE", "Từ ngày")}</div>
          <DateBox
            value={fromDate}
            {...dateBoxOptions}
            onValueChanged={(event) => setFromDate(parseDateBoxValue(event.value))}
            onEnterKey={scheduleSearch}
          />
        </div>
        <div className="einvoice-editor__field einvoice-editor__col-3">
          <div className="einvoice-editor__field-label">{t("TO_DATE", "Đến ngày")}</div>
          <DateBox
            value={toDate}
            {...dateBoxOptions}
            onValueChanged={(event) => setToDate(parseDateBoxValue(event.value))}
            onEnterKey={scheduleSearch}
          />
        </div>
        <div
          className="einvoice-editor__field einvoice-editor__col-3"
          style={{ display: "flex", alignItems: "flex-end", gap: 8 }}
        >
          <Button
            icon="search"
            text={t("SEARCH", "Search")}
            stylingMode="outlined"
            disabled={loading}
            onClick={scheduleSearch}
          />
          <Button
            icon="filter"
            text={t("ADVANCED_SEARCH", "Nâng cao")}
            stylingMode={advancedSearchOpen ? "contained" : "outlined"}
            type={advancedSearchOpen ? "default" : "normal"}
            disabled={loading}
            onClick={() => setAdvancedSearchOpen((open) => !open)}
          />
        </div>
      </div>

      <EInvoiceAdvancedSearchPanel
        visible={advancedSearchOpen}
        value={advancedDraft}
        invoiceStatusOptions={invoiceStatusOptions}
        tchdonOptions={tchdonOptions}
        cqtStatusOptions={cqtStatusOptions}
        signStatusOptions={signStatusOptions}
        mailStatusOptions={mailStatusOptions}
        t={t}
        onChange={setAdvancedDraft}
        onSearch={scheduleSearch}
        onReset={handleAdvancedSearchReset}
        onCollapse={() => setAdvancedSearchOpen(false)}
      />

      {hasEInvoiceAdvancedFilters(listQuery.filters) ? (
        <EInvoiceActiveFilterChips chips={activeFilterChips} t={t} onRemove={handleRemoveFilterChip} />
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden" style={{ height: "min(520px, 58vh)" }}>
        <EInvoiceTableShell className="h-full">
          <DataGrid<EInvoice, GridKey>
            dataSource={rows}
            keyExpr="INVOICE_ID"
            height="100%"
            showBorders={true}
            columnAutoWidth={true}
            focusedRowEnabled={true}
            wordWrapEnabled={false}
            loadPanel={{ enabled: false }}
            onInitialized={handleGridInitialized}
            onSelectionChanged={handleSelectionChanged}
            onRowDblClick={handleRowDblClick}
          >
            <Selection {...selectionOptions} />
            <FilterRow visible={true} />
            <Scrolling mode="virtual" />
            <Paging enabled={false} />
            <EInvoiceListGridColumns t={t} invoiceStatusOptions={invoiceStatusOptions} />
          </DataGrid>
        </EInvoiceTableShell>

        <LoadPanel
          visible={loading}
          showIndicator={true}
          showPane={true}
          shading={true}
          shadingColor="rgba(15, 23, 42, 0.15)"
        />
      </div>
    </EInvoiceEditorShell>
  )
}
