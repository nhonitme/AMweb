import Button from "devextreme-react/button"
import CheckBox from "devextreme-react/check-box"
import DataGrid, { Column, ColumnFixing, Editing, RequiredRule, Scrolling } from "devextreme-react/data-grid"

import DeleteRowButton from "@/components/datagrid/DeleteRowButton"
import VoucherSpreadsheetSummaryBar from "@/components/datagrid/VoucherSpreadsheetSummaryBar"
import {
  AM_GRID_READONLY_COLUMN_CELL_CLASS,
  VOUCHER_SPREADSHEET_GRID_CLASS,
  VOUCHER_SPREADSHEET_PAGE_SCROLL_GRID_CLASS,
  normalizeSpreadsheetMultilineText,
  voucherSpreadsheetKeyboardNavigation,
} from "@/components/datagrid/voucherSpreadsheetGrid"
import { consumeLookupCellOpen } from "@/components/lookup/LookupGridCellDisplay"
import { DEFAULT_CURRENCY_CODE } from "@/lib/currency"
import {
  getEInvoiceDiscountRateFallbackPrecision,
  getEInvoiceQuantityFallbackPrecision,
} from "../einvoiceDecimalSettings"
import { fieldRequiredMessage } from "../einvoiceI18n"
import {
  isCommercialDiscountTchat,
  resolveAfterTaxUnitPrice,
  resolveEInvoiceDetailRowKey,
  toDisplayCommercialDiscountAmount,
} from "../einvoiceModel"
import {
  renderLookupCell,
  renderLookupEditor,
} from "./EInvoiceEditorHelpers"
import type {
  EInvoiceDetailCellInfo,
  EInvoiceDetailDisplayCellInfo,
  EInvoiceDetailRow,
  GridKey,
} from "./EInvoiceEditorTypes"

type EInvoiceDetailGridSectionProps = {
  vm: Record<string, any>
}

export default function EInvoiceDetailGridSection({ vm }: EInvoiceDetailGridSectionProps) {
  const {
    t,
    cashRegister = false,
    isReadOnly,
    isWarehouseInternal,
    pxkSyncThucXuatNhap,
    handlePxkSyncThucXuatNhapToggle,
    handleAddDetailRow,
    userEditorSettings,
    openDetailImport,
    softDeletedCount,
    undeleteLastDetailRow,
    detailGridContainerRef,
    visibleDetails,
    detailGridRef,
    handleDetailSaved,
    handleDetailCellClick,
    handleDetailFocusedCellChanged,
    handleDetailKeyDown,
    handleDetailCellPrepared,
    handleDetailEditorPreparing,
    handleDetailToolbarPreparing,
    softDeleteDetailRowByKey,
    renderTchatCell,
    renderTchatEditor,
    detailTchatSetCellValue,
    hasSpecialDetailColumn,
    renderSpecialSummaryCell,
    renderProductEditor,
    getDetailNumberFormat,
    getDetailNumberEditorOptions,
    moneyFallbackPrecision,
    createDetailCalcSetCellValue,
    createDetailThucNhapSetCellValue,
    createDetailAmountSetCellValue,
    withoutTaxRate,
    useMultiTaxRate,
    renderVatEditor,
    createDetailTaxSetCellValue,
    createDetailAfterTaxPriceSetCellValue,
    vndMoneyFallbackPrecision,
    isForeignCurrency,
    summaryItems,
  } = vm

  return (
    <section className="einvoice-editor__section">
      <div className="einvoice-editor__section-title">{t("DETAIL_LINES", "Chi tiết hàng hóa, dịch vụ")}</div>
      <div className="einvoice-editor__detail-toolbar">
        {!isReadOnly ? (
          <>
            <Button
              stylingMode="contained"
              icon="plus"
              text={t("ADD_ROW", "Add row")}
              hint={t("ADD_ROW", "Add row")}
              onMouseDown={(event) => {
                event.preventDefault()
              }}
              onClick={() => {
                void handleAddDetailRow()
              }}
            />
            {userEditorSettings.enableExcelImport ? (
              <Button
                stylingMode="outlined"
                icon="upload"
                text={t("MSG_BTNIMPORTEXCEL", "Import from Excel")}
                hint={t("DETAIL_IMPORT", "Import chi tiết")}
                onClick={openDetailImport}
              />
            ) : null}
            <Button
              stylingMode="outlined"
              text={t("Undelete", "Hoan tac")}
              hint={t("RESTORE_LAST_DELETED_ROW", "Restore the last deleted row")}
              disabled={softDeletedCount === 0}
              onClick={() => {
                void undeleteLastDetailRow()
              }}
            />
            {isWarehouseInternal ? (
              <CheckBox
                text={t("PXK_SYNC_THUC_XUAT_NHAP", "Tự lấy Thực xuất = Thực nhập")}
                value={pxkSyncThucXuatNhap}
                readOnly={isReadOnly}
                onValueChanged={(event) => handlePxkSyncThucXuatNhapToggle(Boolean(event.value))}
              />
            ) : null}
          </>
        ) : null}
      </div>
      <div ref={detailGridContainerRef} className={`einvoice-editor__detail-grid ${VOUCHER_SPREADSHEET_GRID_CLASS} ${cashRegister ? "" : VOUCHER_SPREADSHEET_PAGE_SCROLL_GRID_CLASS}`}>
        <DataGrid<EInvoiceDetailRow, GridKey>
          loadPanel={{ enabled: false }}
          dataSource={visibleDetails}
          keyExpr="ROW_KEY"
          width="100%"
          height={cashRegister ? "100%" : "auto"}
          showBorders={true}
          repaintChangesOnly={true}
          rowAlternationEnabled={true}
          columnAutoWidth={false}
          allowColumnResizing={true}
          wordWrapEnabled={false}
          hoverStateEnabled={true}
          focusedRowEnabled={true}
          autoNavigateToFocusedRow={true}
          paging={{ enabled: false }}
          keyboardNavigation={voucherSpreadsheetKeyboardNavigation}
          onInitialized={(event) => {
            detailGridRef.current = event.component ?? null
          }}
          onSaved={handleDetailSaved}
          onCellClick={handleDetailCellClick}
          onFocusedCellChanged={handleDetailFocusedCellChanged}
          onKeyDown={handleDetailKeyDown}
          onCellPrepared={handleDetailCellPrepared}
          onEditorPreparing={handleDetailEditorPreparing}
          onToolbarPreparing={handleDetailToolbarPreparing}
        >
          <ColumnFixing enabled={true} />
          {cashRegister ? (
            <Scrolling mode="virtual" rowRenderingMode="virtual" columnRenderingMode="virtual" />
          ) : null}
          <Editing
            mode="batch"
            allowAdding={false}
            allowUpdating={!isReadOnly}
            allowDeleting={false}
            confirmDelete={false}
            startEditAction="click"
            selectTextOnEditStart={true}
          />
          {!isReadOnly ? (
            <Column
              name="DETAIL_ACTIONS"
              width={60}
              fixed={true}
              fixedPosition="left"
              visibleIndex={0}
              allowFixing={false}
              allowEditing={false}
              allowReordering={false}
              showInColumnChooser={false}
              cellRender={(cellInfo: EInvoiceDetailDisplayCellInfo) => {
                const rowKey = resolveEInvoiceDetailRowKey(cellInfo.row?.key, cellInfo.data)
                return (
                  <DeleteRowButton
                    hint={t("DELETE", "Delete")}
                    onDelete={() => {
                      if (rowKey) {
                        void softDeleteDetailRowByKey(rowKey)
                      }
                    }}
                  />
                )
              }}
            />
          ) : null}
          <Column dataField="STT" caption={t("STT", "No")} width={70} dataType="number" allowEditing={false} cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS} />
          <Column
            dataField="TCHAT"
            caption={t("TCHAT", "Line type")}
            width={190}
            cssClass="am-grid-lookup-column-cell"
            setCellValue={detailTchatSetCellValue}
            cellRender={renderTchatCell}
            editCellRender={(cellInfo: EInvoiceDetailCellInfo) =>
              renderLookupEditor(renderTchatEditor(cellInfo, consumeLookupCellOpen(cellInfo, "TCHAT")))
            }
          />
          <Column
            name="SPECIAL_SUMMARY"
            visible={hasSpecialDetailColumn}
            caption={t("SPECIAL_SUMMARY", "HHDV dac thu")}
            minWidth={260}
            allowEditing={false}
            cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS}
            cellRender={renderSpecialSummaryCell}
          />
          <Column dataField="PRODUCT_ID" visible={false} showInColumnChooser={false} allowEditing={false} />
          <Column
            dataField="MHHDVU"
            caption={t("MHHDVU", "Item code")}
            width={160}
            cssClass="am-grid-lookup-column-cell"
            cellRender={renderLookupCell("MHHDVU")}
            editCellRender={(cellInfo: EInvoiceDetailCellInfo) =>
              renderLookupEditor(renderProductEditor(cellInfo, consumeLookupCellOpen(cellInfo, "MHHDVU")))
            }
          />
          <Column
            dataField="THHDVU"
            caption={t("THHDVU", "Item name")}
            minWidth={260}
            cssClass="am-grid-multiline-text-cell"
            setCellValue={(newData: EInvoiceDetailRow, value: unknown) => {
              newData.THHDVU = normalizeSpreadsheetMultilineText(value)
            }}
            calculateDisplayValue={(rowData: EInvoiceDetailRow) => normalizeSpreadsheetMultilineText(rowData.THHDVU)}
          >
            <RequiredRule message={fieldRequiredMessage(t, "THHDVU", "Item name")} />
          </Column>
          <Column dataField="DVTINH" caption={t("DVTINH", "Unit")} width={100} />
          <Column
            dataField="SLUONG"
            caption={isWarehouseInternal ? t("SLTHUCXUAT", "Actual export") : t("SLUONG", "Quantity")}
            dataType="number"
            format={getDetailNumberFormat("SLUONG", getEInvoiceQuantityFallbackPrecision())}
            editorOptions={getDetailNumberEditorOptions("SLUONG", getEInvoiceQuantityFallbackPrecision())}
            width={130}
            setCellValue={createDetailCalcSetCellValue("SLUONG")}
          />
          <Column
            dataField="SLTHUCNHAP"
            visible={isWarehouseInternal}
            showInColumnChooser={isWarehouseInternal}
            caption={t("SLTHUCNHAP", "Actual import")}
            dataType="number"
            format={getDetailNumberFormat("SLUONG", getEInvoiceQuantityFallbackPrecision())}
            editorOptions={getDetailNumberEditorOptions("SLUONG", getEInvoiceQuantityFallbackPrecision())}
            width={130}
            setCellValue={createDetailThucNhapSetCellValue}
          />
          <Column dataField="DGIA" caption={t("DGIA", "Unit price")} dataType="number" format={getDetailNumberFormat("DGIA", moneyFallbackPrecision)} editorOptions={getDetailNumberEditorOptions("DGIA", moneyFallbackPrecision)} width={140} setCellValue={createDetailCalcSetCellValue("DGIA")} />
          <Column
            name="AFTER_TAX_UNIT_PRICE"
            caption={t("AFTER_TAX_UNIT_PRICE", "Unit price after tax")}
            dataType="number"
            format={getDetailNumberFormat("DGIA", moneyFallbackPrecision)}
            editorOptions={getDetailNumberEditorOptions("DGIA", moneyFallbackPrecision)}
            width={160}
            visible={userEditorSettings.afterTaxPrice && !withoutTaxRate}
            showInColumnChooser={userEditorSettings.afterTaxPrice}
            allowEditing={!isReadOnly && userEditorSettings.afterTaxPrice}
            calculateCellValue={(rowData: EInvoiceDetailRow) => resolveAfterTaxUnitPrice(rowData)}
            setCellValue={createDetailAfterTaxPriceSetCellValue()}
          />
          <Column dataField="TLCKHAU" visible={userEditorSettings.showDiscountColumns} caption={t("TLCKHAU", "Discount %")} dataType="number" format={getDetailNumberFormat("TLCKHAU", getEInvoiceDiscountRateFallbackPrecision())} editorOptions={getDetailNumberEditorOptions("TLCKHAU", getEInvoiceDiscountRateFallbackPrecision())} width={120} setCellValue={createDetailCalcSetCellValue("TLCKHAU")} />
          <Column dataField="STCKHAU" visible={userEditorSettings.showDiscountColumns} caption={t("STCKHAU", "Discount")} dataType="number" format={getDetailNumberFormat("STCKHAU", moneyFallbackPrecision)} editorOptions={getDetailNumberEditorOptions("STCKHAU", moneyFallbackPrecision)} width={130} setCellValue={createDetailCalcSetCellValue("STCKHAU")} />
          <Column
            dataField="THTIEN"
            caption={t("THTIEN", "Amount")}
            dataType="number"
            format={getDetailNumberFormat("THTIEN", moneyFallbackPrecision)}
            editorOptions={getDetailNumberEditorOptions("THTIEN", moneyFallbackPrecision)}
            width={140}
            allowEditing={!userEditorSettings.autoCalcAmount || userEditorSettings.autoCalcPriceFromBeforeTaxAmount}
            calculateDisplayValue={(rowData: EInvoiceDetailRow) =>
              isCommercialDiscountTchat(rowData.TCHAT)
                ? toDisplayCommercialDiscountAmount(rowData.THTIEN)
                : Number(rowData.THTIEN ?? 0)}
            {...((!userEditorSettings.autoCalcAmount || userEditorSettings.autoCalcPriceFromBeforeTaxAmount)
              ? { setCellValue: createDetailAmountSetCellValue() }
              : {})}
          />
          <Column
            dataField="TSUAT"
            visible={!withoutTaxRate && useMultiTaxRate}
            caption={t("TSUAT", "Tax")}
            width={120}
            cssClass="am-grid-lookup-column-cell"
            setCellValue={createDetailCalcSetCellValue("TSUAT")}
            cellRender={renderLookupCell("TSUAT")}
            editCellRender={(cellInfo: EInvoiceDetailCellInfo) =>
              renderLookupEditor(renderVatEditor(cellInfo, consumeLookupCellOpen(cellInfo, "TSUAT")))
            }
          />
          <Column
            dataField="TTHUE"
            visible={!withoutTaxRate && useMultiTaxRate}
            caption={t("TTHUE", "Tax amount")}
            dataType="number"
            format={getDetailNumberFormat("TTHUE", moneyFallbackPrecision)}
            editorOptions={getDetailNumberEditorOptions("TTHUE", moneyFallbackPrecision)}
            width={140}
            allowEditing={!userEditorSettings.autoCalcTax}
            {...(userEditorSettings.autoCalcTax ? {} : { setCellValue: createDetailTaxSetCellValue("TTHUE") })}
          />
          <Column
            dataField="TSAUTHUE"
            visible={!withoutTaxRate && useMultiTaxRate}
            caption={t("TSAUTHUE", "Amount after tax")}
            dataType="number"
            format={getDetailNumberFormat("TSAUTHUE", moneyFallbackPrecision)}
            editorOptions={getDetailNumberEditorOptions("TSAUTHUE", moneyFallbackPrecision)}
            width={160}
            allowEditing={!userEditorSettings.autoCalcTax || userEditorSettings.autoCalcPriceFromAfterTaxAmount}
            {...((!userEditorSettings.autoCalcTax || userEditorSettings.autoCalcPriceFromAfterTaxAmount)
              ? { setCellValue: createDetailTaxSetCellValue("TSAUTHUE") }
              : {})}
          />
          <Column dataField="DGIA_VND" caption={t("DGIA_VND", "Unit price VND")} dataType="number" format={getDetailNumberFormat("DGIA_VND", vndMoneyFallbackPrecision, DEFAULT_CURRENCY_CODE)} width={150} allowEditing={false} cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS} visible={isForeignCurrency} />
          <Column dataField="STCKHAU_VND" visible={userEditorSettings.showDiscountColumns && isForeignCurrency} caption={t("STCKHAU_VND", "Discount VND")} dataType="number" format={getDetailNumberFormat("STCKHAU_VND", vndMoneyFallbackPrecision, DEFAULT_CURRENCY_CODE)} width={150} allowEditing={false} cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS} />
          <Column dataField="THTIEN_VND" caption={t("THTIEN_VND", "Amount VND")} dataType="number" format={getDetailNumberFormat("THTIEN_VND", vndMoneyFallbackPrecision, DEFAULT_CURRENCY_CODE)} width={150} allowEditing={false} cssClass={AM_GRID_READONLY_COLUMN_CELL_CLASS} visible={isForeignCurrency} />
        </DataGrid>
      </div>
      <VoucherSpreadsheetSummaryBar items={summaryItems} />
    </section>
  )
}
