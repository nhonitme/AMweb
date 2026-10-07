import { useCallback, useMemo, type ReactElement } from "react"
import Button from "devextreme-react/button"
import DataGrid, { Column, Editing, Paging, Scrolling } from "devextreme-react/data-grid"
import NumberBox from "devextreme-react/number-box"
import type { ColumnEditCellTemplateData, InitializedEvent, RowRemovingEvent } from "devextreme/ui/data_grid"

import VatRateLookupCellEditor from "@/components/lookup/VatRateLookupCellEditor"
import { LookupGridCellEditor, consumeLookupCellOpen } from "@/components/lookup/LookupGridCellDisplay"
import { vatRateLookupStore } from "@/components/lookup/vatRateLookupStore"
import type { EInvoiceMinuteLine, EInvoiceMinuteLineTotals } from "@/types/einvoiceMinute"
import {
  createDefaultMinuteLine,
  patchMinuteLineField,
  renumberMinuteLines,
} from "../einvoiceMinuteModel"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import type { EInvoiceDecimalFormat } from "../einvoiceDecimalSettings"
import {
  getEInvoiceDiscountRateFallbackPrecision,
  getEInvoiceMoneyFallbackPrecision,
  getEInvoiceQuantityFallbackPrecision,
} from "../einvoiceDecimalSettings"

type GridKey = string

type MinuteLineEditCellInfo = ColumnEditCellTemplateData<EInvoiceMinuteLine, GridKey>

function renderMinuteLookupCell(dataField: string) {
  return (cellInfo: MinuteLineEditCellInfo) => (
    <LookupGridCellEditor mode="display" cellInfo={cellInfo} dataField={dataField} />
  )
}

function renderMinuteLookupEditor(children: ReactElement) {
  return <LookupGridCellEditor mode="edit">{children}</LookupGridCellEditor>
}

type TotalField = keyof EInvoiceMinuteLineTotals

type EInvoiceMinuteLineGridSectionProps = {
  title: string
  lines: EInvoiceMinuteLine[]
  totals: EInvoiceMinuteLineTotals
  lineSide: number
  bbanId: number
  readOnly: boolean
  currencyCode: string
  t: (key: string, fallback: string) => string
  getDetailNumberFormat: (
    fieldKey: string,
    fallbackPrecision: number,
    currencyCode?: string | null,
  ) => EInvoiceDecimalFormat
  onChange: (lines: EInvoiceMinuteLine[]) => void
  onTotalsChange: (totals: EInvoiceMinuteLineTotals) => void
}

export default function EInvoiceMinuteLineGridSection({
  title,
  lines,
  totals,
  lineSide,
  bbanId,
  readOnly,
  currencyCode,
  t,
  getDetailNumberFormat,
  onChange,
  onTotalsChange,
}: EInvoiceMinuteLineGridSectionProps) {
  const moneyFallbackPrecision = getEInvoiceMoneyFallbackPrecision(currencyCode)
  const quantityFormat = useMemo(
    () => getDetailNumberFormat("SLUONG", getEInvoiceQuantityFallbackPrecision(), currencyCode),
    [currencyCode, getDetailNumberFormat],
  )
  const unitPriceFormat = useMemo(
    () => getDetailNumberFormat("DGIA", moneyFallbackPrecision, currencyCode),
    [currencyCode, getDetailNumberFormat, moneyFallbackPrecision],
  )
  const discountRateFormat = useMemo(
    () => getDetailNumberFormat("TLCKHAU", getEInvoiceDiscountRateFallbackPrecision(), currencyCode),
    [currencyCode, getDetailNumberFormat],
  )
  const discountAmountFormat = useMemo(
    () => getDetailNumberFormat("STCKHAU", moneyFallbackPrecision, currencyCode),
    [currencyCode, getDetailNumberFormat, moneyFallbackPrecision],
  )
  const amountFormat = useMemo(
    () => getDetailNumberFormat("THTIEN", moneyFallbackPrecision, currencyCode),
    [currencyCode, getDetailNumberFormat, moneyFallbackPrecision],
  )
  const taxAmountFormat = useMemo(
    () => getDetailNumberFormat("TTHUE", moneyFallbackPrecision, currencyCode),
    [currencyCode, getDetailNumberFormat, moneyFallbackPrecision],
  )
  const totalAmountFormat = useMemo(
    () => getDetailNumberFormat("TSAUTHUE", moneyFallbackPrecision, currencyCode),
    [currencyCode, getDetailNumberFormat, moneyFallbackPrecision],
  )

  const activeLines = useMemo(() => lines.filter((line) => line.ISDEL !== 1), [lines])

  const addLine = useCallback(() => {
    const nextLines = [...lines, createDefaultMinuteLine(activeLines.length + 1, lineSide, bbanId)]
    onChange(renumberMinuteLines(nextLines))
  }, [activeLines.length, bbanId, lineSide, lines, onChange])

  const handleCellValueChanged = useCallback(
    (event: { data?: EInvoiceMinuteLine; dataField?: string; value?: unknown }) => {
      const current = event.data
      const field = event.dataField as keyof EInvoiceMinuteLine | undefined
      if (!current || !field) {
        return
      }

      const updated = patchMinuteLineField(current, field, event.value as EInvoiceMinuteLine[keyof EInvoiceMinuteLine])
      const nextLines = lines.map((line) => (line.ROW_KEY === current.ROW_KEY ? updated : line))
      onChange(nextLines)
    },
    [lines, onChange],
  )

  const handleRowRemoving = useCallback(
    (event: RowRemovingEvent<EInvoiceMinuteLine, GridKey>) => {
      const current = event.data
      if (!current) {
        return
      }

      const nextLines = lines.filter((line) => line.ROW_KEY !== current.ROW_KEY)
      onChange(renumberMinuteLines(nextLines))
      event.cancel = true
    },
    [lines, onChange],
  )

  const handleGridInitialized = useCallback((event: InitializedEvent<EInvoiceMinuteLine, GridKey>) => {
    event.component?.option("keyboardNavigation", { editOnKeyPress: true, enterKeyAction: "moveFocus", enterKeyDirection: "row" })
  }, [])

  const updateTotalField = useCallback(
    (field: TotalField, value: number | null) => {
      onTotalsChange({
        ...totals,
        [field]: value,
      })
    },
    [onTotalsChange, totals],
  )

  const renderVatEditor = useCallback(
    (cellInfo: MinuteLineEditCellInfo, autoOpen?: "dropdown" | "popup" | null) => (
      <VatRateLookupCellEditor
        dataSource={vatRateLookupStore}
        value={cellInfo.data?.TSUAT ?? ""}
        rowIndex={cellInfo.row?.rowIndex ?? -1}
        grid={cellInfo.component}
        setValue={(taxRate) => {
          cellInfo.component.cellValue(cellInfo.row.rowIndex, "TSUAT", taxRate)
        }}
        taxRateField="TSUAT"
        taxRateFieldCaption={t("TSUAT", "Tax rate")}
        taxRateNameCaption={t("CODE_NAME", "Name")}
        placeholder={t("VAT_RATE_SELECT", "Select tax rate")}
        popupTitle={t("VAT_RATE_SELECT", "Select tax rate")}
        buttonHint={t("VAT_RATE_LOOKUP", "Open tax rate list")}
        autoOpen={autoOpen}
      />
    ),
    [t],
  )

  return (
    <section className="einvoice-editor__section">
      <div className="einvoice-editor__detail-toolbar">
        <div className="einvoice-editor__section-title einvoice-editor__section-title--inline">{title}</div>
        <Button text={t("ADD_ROW", "Add row")} icon="plus" stylingMode="outlined" disabled={readOnly} onClick={addLine} />
      </div>
      <div className="einvoice-editor__detail-grid">
        <DataGrid<EInvoiceMinuteLine, GridKey>
          dataSource={activeLines}
          keyExpr="ROW_KEY"
          height={220}
          showBorders={true}
          columnAutoWidth={true}
          onInitialized={handleGridInitialized}
          onCellValueChanged={handleCellValueChanged}
          onRowRemoving={handleRowRemoving}
        >
          <Editing mode="cell" allowUpdating={!readOnly} allowDeleting={!readOnly} useIcons={true} confirmDelete={false} />
          <Scrolling mode="virtual" />
          <Paging enabled={false} />
          <Column dataField="STT" caption={t("STT", "No.")} width={60} dataType="number" />
          <Column dataField="TCHAT" caption={t("TCHAT", "Line type")} width={90} dataType="number" />
          <Column dataField="MHHDVU" caption={t("MHHDVU", "Item code")} minWidth={120} />
          <Column dataField="THHDVU" caption={t("THHDVU", "Item name")} minWidth={180} />
          <Column dataField="DVTINH" caption={t("DVTINH", "Unit")} width={90} />
          <Column dataField="SLUONG" caption={t("SLUONG", "Qty")} width={100} dataType="number" format={quantityFormat} editorOptions={createNumberEditorOptions(quantityFormat)} />
          <Column dataField="DGIA" caption={t("DGIA", "Unit price")} width={110} dataType="number" format={unitPriceFormat} editorOptions={createNumberEditorOptions(unitPriceFormat)} />
          <Column dataField="TLCKHAU" caption={t("TLCKHAU", "Disc. %")} width={90} dataType="number" format={discountRateFormat} editorOptions={createNumberEditorOptions(discountRateFormat)} />
          <Column dataField="STCKHAU" caption={t("STCKHAU", "Discount")} width={110} dataType="number" format={discountAmountFormat} editorOptions={createNumberEditorOptions(discountAmountFormat)} />
          <Column dataField="THTIEN" caption={t("THTIEN", "Amount")} width={110} dataType="number" format={amountFormat} editorOptions={createNumberEditorOptions(amountFormat)} />
          <Column
            dataField="TSUAT"
            caption={t("TSUAT", "Tax rate")}
            width={120}
            cssClass="am-grid-lookup-column-cell"
            cellRender={renderMinuteLookupCell("TSUAT")}
            editCellRender={(cellInfo: MinuteLineEditCellInfo) =>
              renderMinuteLookupEditor(renderVatEditor(cellInfo, consumeLookupCellOpen(cellInfo, "TSUAT")))
            }
          />
          <Column
            dataField="TTHUE"
            caption={t("TTHUE", "Tax amount")}
            width={110}
            dataType="number"
            format={taxAmountFormat}
            editorOptions={createNumberEditorOptions(taxAmountFormat)}
            visible={!readOnly}
          />
          <Column dataField="TSAUTHUE" caption={t("TSAUTHUE", "Total")} width={120} dataType="number" format={totalAmountFormat} editorOptions={createNumberEditorOptions(totalAmountFormat)} />
        </DataGrid>
      </div>
      <div className={`einvoice-editor__line-totals ${readOnly ? "einvoice-editor__line-totals--2" : "einvoice-editor__line-totals--4"}`}>
        <div className="einvoice-editor__line-totals-label">{t("BBAN_LINE_TOTAL", "Tổng cộng")}</div>
        <NumberBox
          label={t("THTIEN", "Amount")}
          labelMode="floating"
          value={totals.THTIEN ?? undefined}
          readOnly={readOnly}
          format={amountFormat}
          useMaskBehavior={true}
          onValueChanged={(event) => updateTotalField("THTIEN", typeof event.value === "number" ? event.value : null)}
        />
        {!readOnly ? (
          <NumberBox
            label={t("TTHUE", "Tax amount")}
            labelMode="floating"
            value={totals.TTHUE ?? undefined}
            readOnly={readOnly}
            format={taxAmountFormat}
            useMaskBehavior={true}
            onValueChanged={(event) => updateTotalField("TTHUE", typeof event.value === "number" ? event.value : null)}
          />
        ) : null}
        <NumberBox
          label={t("TSAUTHUE", "Total")}
          labelMode="floating"
          value={totals.TSAUTHUE ?? undefined}
          readOnly={readOnly}
          format={totalAmountFormat}
          useMaskBehavior={true}
          onValueChanged={(event) => updateTotalField("TSAUTHUE", typeof event.value === "number" ? event.value : null)}
        />
      </div>
    </section>
  )
}
