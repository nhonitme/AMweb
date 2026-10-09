import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useQuery } from "@tanstack/react-query"
import Button from "devextreme-react/button"
import DataGrid, { Column, FilterRow, Paging, Scrolling, Selection } from "devextreme-react/data-grid"
import DateBox from "devextreme-react/date-box"
import LoadPanel from "devextreme-react/load-panel"
import TextBox from "devextreme-react/text-box"
import type dxDataGrid from "devextreme/ui/data_grid"
import type { InitializedEvent, RowDblClickEvent, SelectionChangedEvent } from "devextreme/ui/data_grid"
import type { ShownEvent } from "devextreme/ui/popup"
import notify from "devextreme/ui/notify"

import { createDateBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { createCurrentMonthDateRange } from "@/lib/dateRangeDefaults"
import { disableBuiltInPopupEscape, usePopupEscapeLayer } from "@/components/popup/popupEscapeStack"
import { getApiErrorMessage } from "@/api/apiTypes"
import { EInvoiceDocNoCell, EInvoicePartyCell } from "@/pages/EInvoice/components/einvoiceTableUi"
import EInvoiceEditorShell from "@/pages/EInvoice/components/EInvoiceEditorShell"
import { EInvoiceTableShell } from "@/pages/EInvoice/components/EInvoiceTableShell"
import { formatDateToYmd } from "@/pages/Accounting/accountingDateUtils"
import { POPUP_FADE_ANIMATION } from "@/pages/VoucherManagement/components/chitEditorConstants"
import { pitApi } from "../api"
import type { PitDocument } from "../types"
import PitStatusCell from "./PitStatusCell"

type GridKey = number
type ListQuery = { fromYmd: string; toYmd: string; keyword: string }

function parseDateBoxValue(value: unknown): Date | null {
  if (value instanceof Date) {
    return Number.isNaN(value.getTime()) ? null : value
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = new Date(value.includes("T") ? value : `${value.trim()}T00:00:00`)
    return Number.isNaN(parsed.getTime()) ? null : parsed
  }
  return null
}

type Props = {
  visible: boolean
  excludeDocumentId?: number
  t: (key: string, fallback: string) => string
  onClose: () => void
  onSelect: (row: PitDocument) => void
}

export default function PitCertificateSelectPopup({
  visible,
  excludeDocumentId = 0,
  t,
  onClose,
  onSelect,
}: Props) {
  const gridRef = useRef<dxDataGrid<PitDocument, GridKey> | null>(null)
  const [fromDate, setFromDate] = useState<Date | null>(() => createCurrentMonthDateRange().fromDate)
  const [toDate, setToDate] = useState<Date | null>(() => createCurrentMonthDateRange().toDate)
  const [keywordDraft, setKeywordDraft] = useState("")
  const [listQuery, setListQuery] = useState<ListQuery>(() => ({
    fromYmd: formatDateToYmd(createCurrentMonthDateRange().fromDate) ?? "",
    toYmd: formatDateToYmd(createCurrentMonthDateRange().toDate) ?? "",
    keyword: "",
  }))
  const [selectedRows, setSelectedRows] = useState<PitDocument[]>([])

  const dateBoxOptions = useMemo(
    () => createDateBoxEditorOptions({ dateSerializationFormat: "yyyy-MM-dd", openOnFieldClick: true }),
    [],
  )

  const list = useQuery({
    queryKey: ["pit-certificate-select", listQuery],
    queryFn: async () => {
      const rows = await pitApi.list("certificate", listQuery.fromYmd, listQuery.toYmd, listQuery.keyword)
      return rows.filter(
        (row) => row.IS_SIGNED === 1 && (excludeDocumentId <= 0 || row.DOCUMENT_ID !== excludeDocumentId),
      )
    },
    enabled: visible,
  })

  const rows = list.data ?? []
  const loading = list.isLoading || list.isFetching

  usePopupEscapeLayer(visible, onClose)

  useEffect(() => {
    if (!visible) return
    setSelectedRows([])
    gridRef.current?.clearSelection()
  }, [rows, visible])

  const applySearch = useCallback(() => {
    if (fromDate && toDate && fromDate > toDate) {
      notify(t("INVALID_DATE_RANGE", "Từ ngày phải nhỏ hơn hoặc bằng đến ngày"), "warning", 3000)
      return
    }
    const nextFrom = formatDateToYmd(fromDate)
    const nextTo = formatDateToYmd(toDate)
    if (!nextFrom || !nextTo) {
      notify(t("DATE_RANGE_REQUIRED", "Vui lòng chọn đầy đủ Từ ngày và Đến ngày"), "warning", 3000)
      return
    }
    const next = { fromYmd: nextFrom, toYmd: nextTo, keyword: keywordDraft.trim() }
    if (
      listQuery.fromYmd === next.fromYmd &&
      listQuery.toYmd === next.toYmd &&
      listQuery.keyword === next.keyword
    ) {
      void list.refetch()
      return
    }
    setListQuery(next)
  }, [fromDate, keywordDraft, list, listQuery, t, toDate])

  const confirmSelection = useCallback(() => {
    const row = selectedRows[0]
    if (!row) {
      notify(t("MSG_NO_ROWS_SELECTED", "Chưa chọn chứng từ"), "warning", 2500)
      return
    }
    onSelect(row)
  }, [onSelect, selectedRows, t])

  const handlePopupShown = useCallback((event: ShownEvent) => {
    disableBuiltInPopupEscape(event.component)
  }, [])

  return (
    <EInvoiceEditorShell
      visible={visible}
      title={t("SELECT_REF_CERTIFICATE", "Chọn chứng từ gốc")}
      subtitle={
        selectedRows.length
          ? t("SELECTED_COUNT", "Đã chọn {0}").replace("{0}", String(selectedRows.length))
          : t("SELECT_CERTIFICATE_HINT", "Chọn chứng từ đã ký trong danh sách")
      }
      width="min(1180px, 96vw)"
      height="min(820px, 94vh)"
      loading={loading}
      closeDisabled={loading}
      animation={POPUP_FADE_ANIMATION}
      onClose={onClose}
      onShown={handlePopupShown}
      onHiding={onClose}
      footer={
        <>
          <Button text={t("CANCEL", "Hủy")} stylingMode="outlined" disabled={loading} onClick={onClose} />
          <Button
            text={t("SELECT", "Chọn")}
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
            onEnterKey={applySearch}
          />
        </div>
        <div className="einvoice-editor__field einvoice-editor__col-3">
          <div className="einvoice-editor__field-label">{t("TO_DATE", "Đến ngày")}</div>
          <DateBox
            value={toDate}
            {...dateBoxOptions}
            onValueChanged={(event) => setToDate(parseDateBoxValue(event.value))}
            onEnterKey={applySearch}
          />
        </div>
        <div className="einvoice-editor__field einvoice-editor__col-3">
          <div className="einvoice-editor__field-label">{t("SEARCH", "Tìm kiếm")}</div>
          <TextBox
            value={keywordDraft}
            onValueChanged={(event) => setKeywordDraft(String(event.value ?? ""))}
            onEnterKey={applySearch}
          />
        </div>
        <div className="einvoice-editor__field einvoice-editor__col-3" style={{ display: "flex", alignItems: "flex-end" }}>
          <Button icon="search" text={t("SEARCH", "Tìm")} stylingMode="outlined" disabled={loading} onClick={applySearch} />
        </div>
      </div>

      {list.error ? (
        <div role="alert" className="pit-error">
          {getApiErrorMessage(list.error, "Không tải được danh sách chứng từ")}
        </div>
      ) : null}

      <div className="relative min-h-0 flex-1 overflow-hidden" style={{ height: "min(520px, 58vh)" }}>
        <EInvoiceTableShell className="h-full">
          <DataGrid<PitDocument, GridKey>
            dataSource={rows}
            keyExpr="DOCUMENT_ID"
            height="100%"
            showBorders
            columnAutoWidth
            focusedRowEnabled
            wordWrapEnabled={false}
            loadPanel={{ enabled: false }}
            onInitialized={(event: InitializedEvent<PitDocument, GridKey>) => {
              gridRef.current = event.component ?? null
            }}
            onSelectionChanged={(event: SelectionChangedEvent<PitDocument, GridKey>) => {
              setSelectedRows(event.selectedRowsData ?? [])
            }}
            onRowDblClick={(event: RowDblClickEvent<PitDocument, GridKey>) => {
              if (event.data) onSelect(event.data)
            }}
          >
            <Selection mode="single" showCheckBoxesMode="none" />
            <FilterRow visible />
            <Scrolling mode="virtual" />
            <Paging enabled={false} />
            <Column
              caption={t("PIT_DOC_NO", "Ký hiệu / Số")}
              width={155}
              cellRender={(cell) => (
                <EInvoiceDocNoCell
                  series={cell.data?.SERIES ?? ""}
                  numberLabel={cell.data?.DOC_NO ? String(cell.data.DOC_NO).padStart(8, "0") : "Chưa cấp số"}
                  codeLabel={cell.data?.MGDDTU}
                />
              )}
            />
            <Column dataField="DOC_DATE" caption={t("DOC_DATE", "Ngày lập")} dataType="date" format="dd/MM/yyyy" width={110} />
            <Column
              dataField="DISPLAY_NAME"
              caption={t("INCOME_RECIPIENT", "Người nhận thu nhập")}
              minWidth={260}
              cellRender={(cell) => (
                <EInvoicePartyCell name={cell.data?.DISPLAY_NAME ?? ""} meta={cell.data?.TAX_CD} error={cell.data?.ERROR_MESSAGE} />
              )}
            />
            <Column caption={t("STATUS", "Trạng thái")} minWidth={200} cellRender={(cell) => cell.data ? <PitStatusCell row={cell.data} /> : null} />
          </DataGrid>
        </EInvoiceTableShell>
        <LoadPanel visible={loading} showIndicator showPane shading shadingColor="rgba(15, 23, 42, 0.15)" />
      </div>
    </EInvoiceEditorShell>
  )
}
