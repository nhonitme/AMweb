import { memo, useCallback } from "react"
import DataGrid, { Column, Pager, Paging, Scrolling, Selection, Summary, TotalItem } from "devextreme-react/data-grid"
import type { DataGridTypes } from "devextreme-react/data-grid"
import type { CellPreparedEvent } from "devextreme/ui/data_grid"
import type { OffsetHistory, OffsetKind } from "@/api/debtOffsetApi"
import type { OffsetPaging } from "./debtOffsetViewState"
import "./DebtOffsetSummary.css"
import { BackgroundColor } from "devextreme-react/cjs/chart"

const formatMoney = "#,##0.##"
const dateLabel = (text?: string | null) => {
  const value = String(text ?? "").replace(/[^0-9]/g, "")
  if (value.length < 8) return text ?? ""
  return `${value.slice(6, 8)}/${value.slice(4, 6)}/${value.slice(0, 4)}`
}

// Draw group separators only in the two header rows (band and leaf).
// Keep the regular borders for data rows and the summary footer.
const separatorBands = new Set(["historyCustomerBand", "historySourceBand", "historyDebtBand"])
const separatorFields = new Set(["CUSTOMER_NM_VIET", "DESCRIPTION_VIET_PAY", "DESCRIPTION_VIET_DEBT"])

function prepareHistoryCell(event: CellPreparedEvent<OffsetHistory, number>) {
  if (event.rowType !== "header") return
  const column = event.column
  if (!column || !(separatorBands.has(column.name ?? "") || separatorFields.has(column.dataField ?? ""))) return

  // Inline !important wins over global DevExtreme grid border overrides.
  // The inset stroke remains visible even where borders are collapsed.
  event.cellElement.style.setProperty("border-right", "1px solid #cacbccff", "important")
  // event.cellElement.style.setProperty("border-bottom", "2px solid #dde2e7ff", "important")
  // event.cellElement.style.setProperty("box-shadow", "inset -1px 0 0 #dde2e7ff", "important")
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
              onCellPrepared={prepareHistoryCell}
              noDataText={t("NO_DATA", "Không có dữ liệu")}
              >
              <Scrolling mode="standard" showScrollbar="always" />
              <Paging enabled pageIndex={historyPaging.pageIndex} pageSize={historyPaging.pageSize}
                onPageIndexChange={pageIndex => onPagingChange({ ...historyPaging, pageIndex })}
                onPageSizeChange={pageSize => onPagingChange({ pageIndex: 0, pageSize })} />
              <Pager visible showPageSizeSelector allowedPageSizes={[20, 50, 100]}
                showInfo showNavigationButtons infoText={t("PAGE_TEXT", "Page {0} / {1} ({2} rows)")} />
              <Selection mode="multiple" selectByClick={false} showCheckBoxesMode="always" selectAllMode="page" />
              {/* Grouped headers mirror the two-level layout of the legacy Undo screen. */}
              <Column caption={t("CustomerInformation", "Thông tin khách hàng")} alignment="center" name="historyCustomerBand" cssClass="debt-column-color">
                <Column dataField="CUSTOMER_CD" caption={t("CUSTOMER_CODE", "Mã khách hàng")} width={125} />
                <Column dataField="CUSTOMER_NM_VIET" caption={t("CUSTOMER_NM", "Đối tượng")} minWidth={200} />
              </Column>
              <Column caption={kind === "CLEARING"
                ? t("131Voucher", "Chứng từ phải thu")
                  : t("PaymentVouchers", "Chứng từ thanh toán")} alignment="center" name="historySourceBand" cssClass="debt-column-color">
                <Column dataField="CHIT_NO_PAY" caption={t("CHIT_NO_PAY", "Chứng từ nguồn")} minWidth={150}
                  calculateDisplayValue={(row: OffsetHistory) => row.CHIT_ID_PAY < 0 ? "Số dư đầu kỳ" : row.CHIT_NO_PAY ?? ""} />
                <Column dataField="CHIT_YMD_PAY" caption={t("CHIT_YMD_PAY", "Ngày nguồn")} minWidth={120}
                  customizeText={e => dateLabel(String(e.value ?? ""))} />
                <Column dataField="DESCRIPTION_VIET_PAY" caption={t("DESCRIPTION", "Mô tả 1")} minWidth={220} />
              </Column>
              <Column caption={kind === "CLEARING" || kind === "PAYMENT"
                ? t("331Voucher", "Chứng từ phải trả")
                : t("LiabilitiesVoucher", "Chứng từ công nợ")} alignment="center" name="historyDebtBand" cssClass="debt-column-color">
                <Column dataField="CHIT_NO_DEBT" caption={t("CHIT_NO_DEBT", "Chứng từ công nợ")} minWidth={170} 
                  calculateDisplayValue={(row: OffsetHistory) => row.CHIT_ID_DEBT < 0 ? "Số dư đầu kỳ" : row.CHIT_NO_DEBT ?? ""} />
                <Column dataField="CHIT_YMD_DEBT" caption={t("CHIT_YMD_DEBT", "Ngày công nợ")} minWidth={120}
                  customizeText={e => dateLabel(String(e.value ?? ""))} />
                <Column dataField="DESCRIPTION_VIET_DEBT" caption={t("DESCRIPTION", "Mô tả")} minWidth={220} />
              </Column>
              <Column caption={t("PAYMENT_AMOUNT", "Thanh toán")} alignment="center" cssClass="debt-column-color">
                <Column dataField="PAYAMOUNT" caption={t("PAYAMOUNT", "Tiền VND")} minWidth={150} alignment="right" format={formatMoney} />
                <Column dataField="PAYAMOUNT_FC" caption={t("OFFSET_AMOUNT_FC", "Tiền ngoại tệ")} minWidth={150} alignment="right" format={formatMoney} visible={showForeignCurrency} />
              </Column>
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
