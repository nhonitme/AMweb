import { memo, useCallback } from "react"
import DataGrid, { Column, Pager, Paging, Scrolling, Selection, Summary, TotalItem } from "devextreme-react/data-grid"
import type { DataGridTypes } from "devextreme-react/data-grid"
import type { OffsetHistory, OffsetKind } from "@/api/debtOffsetApi"
import type { OffsetPaging } from "./debtOffsetViewState"
import "./DebtOffsetSummary.css"

const formatMoney = "#,##0.##"
const dateLabel = (text?: string | null) => {
  const value = String(text ?? "").replace(/[^0-9]/g, "")
  if (value.length < 8) return text ?? ""
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`
}

type Props = {
  history: OffsetHistory[]
  kind: OffsetKind
  showForeignCurrency: boolean
  historyPaging: OffsetPaging
  initialSelectedRowKeys: number[]
  onSelectionChange: (rows: OffsetHistory[]) => void
  onPagingChange: (paging: OffsetPaging) => void
  t: (key: string, fallback: string) => string
}

/**
 * DevExtreme owns checkbox selection while the grid is mounted.
 * The parent keeps selected rows for batch Undo, but does not feed
 * controlled selectedRowKeys back on every click.
 */
export default memo(function DebtOffsetHistoryGrid({
  history, kind, showForeignCurrency, historyPaging, initialSelectedRowKeys,
  onSelectionChange, onPagingChange, t,
}: Props) {
  const handleSelectionChanged = useCallback((event: DataGridTypes.SelectionChangedEvent<OffsetHistory, number>) => {
    onSelectionChange((event.selectedRowsData ?? []) as OffsetHistory[])
  }, [onSelectionChange])

  return (
              <DataGrid className="debt-offset-history-grid" dataSource={history} height="100%" width="100%" showBorders rowAlternationEnabled
              loadPanel={{ enabled: false }}
              allowColumnResizing columnResizingMode="widget" columnAutoWidth={false} columnMinWidth={110}
              keyExpr={kind === "COLLECT" ? "CHITCOLLECT_ID" : "CHITPAYMENT_ID"}
              defaultSelectedRowKeys={initialSelectedRowKeys}
              onSelectionChanged={handleSelectionChanged}
              noDataText={t("NO_DATA", "Không có dữ liệu")}
              >
              <Scrolling mode="standard" showScrollbar="always" />
              <Paging enabled pageIndex={historyPaging.pageIndex} pageSize={historyPaging.pageSize}
                onPageIndexChange={pageIndex => onPagingChange({ ...historyPaging, pageIndex })}
                onPageSizeChange={pageSize => onPagingChange({ pageIndex: 0, pageSize })} />
              <Pager visible showPageSizeSelector allowedPageSizes={[20, 50, 100]}
                showInfo showNavigationButtons infoText={t("PAGE_TEXT", "Page {0} / {1} ({2} rows)")} />
              <Selection mode="multiple" selectByClick={false} showCheckBoxesMode="always" selectAllMode="page" />
              <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER_CODE", "Mã khách hàng")} width={125} />
              <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER_NM", "Đối tượng")} minWidth={200} />
              <Column dataField="CHIT_NO_PAY" caption={t("CHIT_NO_PAY", "Chứng từ nguồn")} minWidth={150}
                calculateDisplayValue={(row: OffsetHistory) => row.CHIT_ID_PAY < 0 ? "Số dư đầu kỳ" : row.CHIT_NO_PAY ?? ""} />
              <Column dataField="CHIT_YMD_PAY" caption={t("CHIT_YMD_PAY", "Ngày nguồn")} minWidth={120}
                customizeText={e => dateLabel(String(e.value ?? ""))} />
              <Column dataField="DESCRIPTION_VIET_PAY" caption={t("DESCRIPTION", "Mô tả 1")} minWidth={220} />
              <Column dataField="CHIT_NO_DEBT" caption={t("CHIT_NO_DEBT", "Chứng từ công nợ")} minWidth={170}
                calculateDisplayValue={(row: OffsetHistory) => row.CHIT_ID_DEBT < 0 ? "Số dư đầu kỳ" : row.CHIT_NO_DEBT ?? ""} />
              <Column dataField="CHIT_YMD_DEBT" caption={t("CHIT_YMD_DEBT", "Ngày công nợ")} minWidth={120}
                customizeText={e => dateLabel(String(e.value ?? ""))} />
              <Column dataField="DESCRIPTION_VIET_DEBT" caption={t("DESCRIPTION", "Mô tả")} minWidth={220} />
              <Column dataField="PAYAMOUNT" caption={t("PAYAMOUNT", "Tiền VND")} minWidth={150} alignment="right" format={formatMoney} />
              <Column dataField="PAYAMOUNT_FC" caption={t("PAYAMOUNT_FC", "Tiền ngoại tệ")} minWidth={150} alignment="right" format={formatMoney} visible={showForeignCurrency} />
              <Summary>
                <TotalItem column="CHIT_ID_PAY" summaryType="count" showInColumn="DESCRIPTION_VIET_DEBT"
                  alignment="right" customizeText={() => t("lblTOTAL", "Tổng cộng")} />
                <TotalItem column="PAYAMOUNT" summaryType="sum" valueFormat={formatMoney}
                  displayFormat="{0}" alignment="right" />
              </Summary>
              </DataGrid>
  )
}, (previous, next) =>
  // initialSelectedRowKeys is a mount-only input. Parent remounts the grid on Search/Undo.
  previous.history === next.history &&
  previous.kind === next.kind &&
  previous.showForeignCurrency === next.showForeignCurrency &&
  previous.historyPaging === next.historyPaging &&
  previous.onSelectionChange === next.onSelectionChange &&
  previous.onPagingChange === next.onPagingChange &&
  previous.t === next.t
)
