import { useCallback } from "react"
import { Column } from "devextreme-react/data-grid"
import type { ColumnCellTemplateData } from "devextreme/ui/data_grid"

import type { EInvoice } from "@/types/einvoice"

import {
  formatEInvoiceBuyerSummaryText,
  formatEInvoiceDisplayNo,
  truncateEInvoiceErrorMessage,
} from "../einvoiceModel"
import {
  formatEInvoiceDecimalValue,
  getEInvoiceMoneyFallbackPrecision,
  useEInvoiceDecimalResolver,
} from "../einvoiceDecimalSettings"
import { EInvoiceListStatusCell } from "./EInvoiceListStatusCell"
import {
  EInvoiceDocNoCell,
  EInvoicePartyCell,
} from "./einvoiceTableUi"

export type EInvoiceGridCellInfo = ColumnCellTemplateData<EInvoice, number>
export type EInvoiceListGridTranslate = (key: string, fallback: string) => string

function trimGridCellText(value: unknown): string {
  return String(value ?? "").trim()
}

type InvoiceStatusOption = {
  value: number
  text: string
}

type UseEInvoiceListGridRenderersOptions = {
  invoiceStatusOptions?: InvoiceStatusOption[]
}

export function useEInvoiceListGridRenderers(
  t: EInvoiceListGridTranslate,
  _options: UseEInvoiceListGridRenderersOptions = {},
) {
  const decimalResolver = useEInvoiceDecimalResolver("UI")

  const renderInvoiceNoCell = useCallback(
    (cellInfo: EInvoiceGridCellInfo) => {
      const series = [String(cellInfo.data?.KHMSHDON ?? "").trim(), String(cellInfo.data?.KHHDON ?? "").trim()]
        .filter(Boolean)
        .join("/")
      const invoiceNo = String(cellInfo.data?.SHDON ?? "").trim()

      return (
        <EInvoiceDocNoCell
          series={series}
          numberLabel={invoiceNo ? `${t("SHDON", "Số")}: ${invoiceNo}` : t("NO_INVOICE_NO", "Chưa cấp số")}
        />
      )
    },
    [t],
  )

  const renderBuyerSummaryCell = useCallback(
    (cellInfo: EInvoiceGridCellInfo) => {
      const personName = trimGridCellText(cellInfo.data?.NMUA_HVTNMHANG)
      const companyName = trimGridCellText(cellInfo.data?.NMUA_TEN)
      const taxCode = trimGridCellText(cellInfo.data?.NMUA_MST)
      const lookupCode = trimGridCellText(cellInfo.data?.MTRACUU)
      const mccqt = trimGridCellText(cellInfo.data?.MCCQT)
      const errorMessage = trimGridCellText(cellInfo.data?.ERROR_MESSAGE)
      const primaryName = companyName || personName || "—"
      const metaLines = [
        taxCode ? `MST: ${taxCode}` : "",
        lookupCode ? `${t("MTRACUU", "Mã tra cứu")}: ${lookupCode}` : "",
        mccqt ? { text: `MCCQT: ${mccqt}`, codeOk: true } : "",
        companyName && personName ? personName : "",
      ].filter(Boolean)

      return (
        <EInvoicePartyCell
          name={primaryName}
          metaLines={metaLines}
          error={errorMessage ? truncateEInvoiceErrorMessage(errorMessage) : undefined}
        />
      )
    },
    [t],
  )

  const renderHeaderDecimalCell = useCallback(
    (fieldKey: string) => (cellInfo: EInvoiceGridCellInfo) => (
      <span className="einvoice-table__money">
        {formatEInvoiceDecimalValue(
          cellInfo.value,
          decimalResolver,
          "HEADER",
          fieldKey,
          cellInfo.data?.DVTTE,
          getEInvoiceMoneyFallbackPrecision(cellInfo.data?.DVTTE),
        )}
      </span>
    ),
    [decimalResolver],
  )

  const renderSelectStatusCell = useCallback(
    (cellInfo: EInvoiceGridCellInfo) => <EInvoiceListStatusCell data={cellInfo.data} t={t} />,
    [t],
  )

  return {
    renderInvoiceNoCell,
    renderBuyerSummaryCell,
    renderHeaderDecimalCell,
    renderSelectStatusCell,
  }
}

type EInvoiceListGridColumnsProps = {
  t: EInvoiceListGridTranslate
  invoiceStatusOptions?: InvoiceStatusOption[]
}

/** Shared e-invoice list columns for picker grids and list pages. */
export function EInvoiceListGridColumns({ t, invoiceStatusOptions = [] }: EInvoiceListGridColumnsProps) {
  const {
    renderInvoiceNoCell,
    renderBuyerSummaryCell,
    renderHeaderDecimalCell,
    renderSelectStatusCell,
  } = useEInvoiceListGridRenderers(t, { invoiceStatusOptions })

  return (
    <>
      <Column
        name="INVOICE_DISPLAY_NO"
        caption={t("DISPLAY_NO", "Ký hiệu / Số HĐ")}
        width={150}
        fixed={true}
        fixedPosition="left"
        calculateCellValue={(row: EInvoice) => formatEInvoiceDisplayNo(row)}
        cellRender={renderInvoiceNoCell}
      />
      <Column
        dataField="NLAP"
        caption={t("NLAP", "Ngày lập")}
        dataType="date"
        format="dd/MM/yyyy"
        width={100}
        alignment="center"
      />
      <Column
        name="BUYER_SUMMARY"
        caption={t("BUYER_SUMMARY", "Người mua")}
        minWidth={220}
        calculateCellValue={(row: EInvoice) => formatEInvoiceBuyerSummaryText(row)}
        cellRender={renderBuyerSummaryCell}
      />
      <Column
        dataField="TGTCTHUE"
        caption={t("TGTCTHUE", "Tiền trước thuế")}
        dataType="number"
        alignment="right"
        cellRender={renderHeaderDecimalCell("TGTCTHUE")}
        width={120}
      />
      <Column
        dataField="TGTTTHUE"
        caption={t("TGTTTHUE", "Tiền thuế")}
        dataType="number"
        alignment="right"
        cellRender={renderHeaderDecimalCell("TGTTTHUE")}
        width={110}
      />
      <Column
        dataField="TGTTTBSO"
        caption={t("TGTTTBSO", "Tổng thanh toán")}
        dataType="number"
        alignment="right"
        cellRender={renderHeaderDecimalCell("TGTTTBSO")}
        width={125}
      />
      <Column dataField="DVTTE" caption={t("DVTTE", "ĐVT")} width={60} alignment="center" />
      <Column
        name="STATUS_SUMMARY"
        caption={t("STATUS_SUMMARY", "Trạng thái")}
        minWidth={180}
        cellRender={renderSelectStatusCell}
      />
    </>
  )
}
