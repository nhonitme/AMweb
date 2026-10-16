import { createContext, memo, useCallback, useContext, useEffect, useMemo } from "react"
import DataGrid, { Column, Pager, Paging, Scrolling, Selection, Summary, TotalItem } from "devextreme-react/data-grid"
import type { DataGridTypes } from "devextreme-react/data-grid"
import NumberBox from "devextreme-react/number-box"
import ArrayStore from "devextreme/data/array_store"
import type { OffsetVoucher } from "@/api/debtOffsetApi"
import { getSelectionChanges, toKey, type OffsetAmountField, type OffsetSide, type SelectedVoucher } from "./debtOffsetSelection"
import type { OffsetPaging } from "./debtOffsetViewState"

const formatMoney = "#,##0.##"
const pageSizes = [20, 50, 100]
const loadPanel = { enabled: false }
const voucherLabel = (row: OffsetVoucher) => row.CHIT_ID < 0 ? "Số dư đầu kỳ" : row.CHIT_NO ?? ""
const dateText = ({ value }: { value?: unknown }) => {
  const text = String(value ?? "")
  const digits = text.replace(/[^0-9]/g, "")
  return digits.length < 8 ? text : `${digits.slice(6, 8)}/${digits.slice(4, 6)}/${digits.slice(0, 4)}`
}

type Props = {
  rows: OffsetVoucher[]
  selected: SelectedVoucher[]
  side: OffsetSide
  busy: boolean
  showForeignCurrency: boolean
  paging: OffsetPaging
  onPagingChange: (side: OffsetSide, paging: OffsetPaging) => void
  onSelectionChange: (side: OffsetSide, rows: OffsetVoucher[]) => void
  onAmountChange: (side: OffsetSide, row: OffsetVoucher, field: OffsetAmountField, value: number) => void
  t: (key: string, fallback: string) => string
}

type AmountContextValue = Pick<Props, "busy" | "side" | "onAmountChange"> & {
  selected: Map<string, SelectedVoucher>
}
const AmountContext = createContext<AmountContextValue | null>(null)

const AmountEditor = memo(function AmountEditor({ row, field, value, disabled, side, onAmountChange }: {
  row: OffsetVoucher
  field: OffsetAmountField
  value: number
  disabled: boolean
} & Pick<Props, "side" | "onAmountChange">) {
  const handleChange = useCallback((event: { value?: number | null }) => {
    onAmountChange(side, row, field, Number(event.value ?? 0))
  }, [side, row, field, onAmountChange])
  return (
    <NumberBox width="100%" min={0}
      max={Math.max(0, Number(field === "OFFSET_AMOUNT" ? row.REMAINAMOUNT : row.REMAINAMOUNT_FC) || 0)}
      value={value} format={formatMoney} showSpinButtons={false}
      disabled={disabled} onValueChanged={handleChange} />
  )
})

function AmountCell({ row, field }: { row: OffsetVoucher; field: OffsetAmountField }) {
  const context = useContext(AmountContext)!
  const selected = context.selected.get(toKey(row))
  return <AmountEditor row={row} field={field} value={selected?.[field] ?? 0}
    disabled={context.busy || !selected} side={context.side} onAmountChange={context.onAmountChange} />
}

// Stable templates keep existing NumberBox instances alive when selection changes.
const localAmountCell = (cell: { data: OffsetVoucher }) => <AmountCell row={cell.data} field="OFFSET_AMOUNT" />
const foreignAmountCell = (cell: { data: OffsetVoucher }) => <AmountCell row={cell.data} field="OFFSET_AMOUNT_FC" />

export default memo(function DebtOffsetVoucherGrid({
  rows, selected, side, busy, showForeignCurrency, paging, onPagingChange, onSelectionChange, onAmountChange, t,
}: Props) {
  const gridData = useMemo(() => ({
    store: new ArrayStore({
      key: "ROW_KEY",
      data: rows.map(row => ({ ...row, ROW_KEY: toKey(row), OFFSET_AMOUNT: 0, OFFSET_AMOUNT_FC: 0 })),
    }),
    selected: new Map<string, SelectedVoucher>(),
  }), [rows])
  const dataSource = useMemo(() => ({
    store: gridData.store,
    // Recalculate sorting and totals after a push without replacing the data source.
    reshapeOnPush: true,
    pushAggregationTimeout: 0,
  }), [gridData])
  const selectedByKey = useMemo(() => new Map(selected.map(row => [toKey(row), row])), [selected])
  const selectedKeys = useMemo(() => Array.from(selectedByKey.keys()), [selectedByKey])
  const context = useMemo(() => ({ selected: selectedByKey, side, busy, onAmountChange }),
    [selectedByKey, side, busy, onAmountChange])

  useEffect(() => {
    const changes = getSelectionChanges(gridData.selected, selectedByKey)
    gridData.selected = selectedByKey
    if (changes.length) gridData.store.push(changes)
  }, [gridData, selectedByKey])

  const handleSelection = useCallback((event: DataGridTypes.SelectionChangedEvent<OffsetVoucher, string>) => {
    onSelectionChange(side, event.selectedRowsData)
  }, [side, onSelectionChange])
  const handlePageIndex = useCallback((pageIndex: number) => {
    onPagingChange(side, { ...paging, pageIndex })
  }, [side, paging, onPagingChange])
  const handlePageSize = useCallback((pageSize: number) => {
    onPagingChange(side, { pageIndex: 0, pageSize })
  }, [side, onPagingChange])

  return (
    <AmountContext.Provider value={context}>
      <DataGrid dataSource={dataSource} keyExpr="ROW_KEY" height={310} showBorders rowAlternationEnabled
        repaintChangesOnly loadPanel={loadPanel} showColumnLines allowColumnResizing columnAutoWidth={false}
        selectedRowKeys={selectedKeys} onSelectionChanged={handleSelection} noDataText={t("NO_DATA", "Không có dữ liệu")}>
        <Scrolling mode="standard" showScrollbar="always" />
        <Paging enabled pageIndex={paging.pageIndex} pageSize={paging.pageSize}
          onPageIndexChange={handlePageIndex} onPageSizeChange={handlePageSize} />
        <Pager visible showPageSizeSelector allowedPageSizes={pageSizes}
          showInfo showNavigationButtons infoText={t("PAGE_TEXT", "Page {0} / {1} ({2} rows)")} />
        <Selection mode="multiple" showCheckBoxesMode="always" selectByClick={false} />
        <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER_CODE", "Mã khách hàng")} width={125} />
        <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER", "Đối tượng")} width={180} />
        <Column dataField="CHIT_NO" caption={t("CHIT_NO", "Số chứng từ")} width={125} calculateDisplayValue={voucherLabel} />
        <Column dataField="CHIT_YMD" caption={t("DATE", "Ngày")} width={110} customizeText={dateText} />
        <Column dataField="DESCRIPTION_VIET" caption={t("DESCRIPTION", "Diễn giải")} minWidth={210} />
        <Column dataField="AMOUNT" caption={t("AMOUNT", "Số tiền")} width={150} alignment="right" format={formatMoney} />
        <Column dataField="REMAINAMOUNT" caption={t("REMAINAMOUNT", "Số tiền chưa đối trừ")} width={165} alignment="right" format={formatMoney} />
        <Column dataField="OFFSET_AMOUNT" caption={t("OFFSET_AMOUNT", "Số tiền đối trừ")} width={175} alignment="right" cellRender={localAmountCell} />
        <Column dataField="FC_AMOUNT" caption={t("AMOUNT_FC", "Số tiền ngoại tệ")} width={145} alignment="right" format={formatMoney} visible={showForeignCurrency} />
        <Column dataField="REMAINAMOUNT_FC" caption={t("REMAINAMOUNT_FC", "Chưa đối trừ NT")} width={155} alignment="right" format={formatMoney} visible={showForeignCurrency} />
        <Column dataField="OFFSET_AMOUNT_FC" caption={t("OFFSET_AMOUNT_FC", "Đối trừ NT")} width={155} alignment="right" visible={showForeignCurrency} cellRender={foreignAmountCell} />
        <Summary>
          <TotalItem column="AMOUNT" summaryType="sum" valueFormat={formatMoney} />
          <TotalItem column="REMAINAMOUNT" summaryType="sum" valueFormat={formatMoney} />
          <TotalItem column="OFFSET_AMOUNT" summaryType="sum" valueFormat={formatMoney} />
          {showForeignCurrency && <TotalItem column="OFFSET_AMOUNT_FC" summaryType="sum" valueFormat={formatMoney} />}
        </Summary>
      </DataGrid>
    </AmountContext.Provider>
  )
})
