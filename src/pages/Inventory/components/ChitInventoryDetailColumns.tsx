import { useContext } from "react"
import { Column } from "devextreme-react/data-grid"

import { createDateTimeBoxEditorOptions } from "@/components/forms/dateBoxEditorOptions"
import { useDecimalColumnFormats } from "@/hooks/useDecimalColumnFormats"
import { createNumberEditorOptions } from "@/lib/numberEditorOptions"
import { pickLocalizedText } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"

function useVoucherColumnTranslate() {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  return (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
}

function createInventoryDateTimeEditorOptions() {
  return createDateTimeBoxEditorOptions({
    inputAttr: { tabIndex: 0 },
  })
}

export function ChitInventoryInputDetailColumns() {
  const t = useVoucherColumnTranslate()
  const { getFormat } = useDecimalColumnFormats()

  return (
    <>
      <Column dataField="ROW_KEY" />
      <Column dataField="INPUT_ID" caption={t("INPUT_ID", "Input ID")} />
      <Column dataField="INVENTORY_ID" caption={t("INVENTORY_ID", "Voucher ID")} />
      <Column dataField="CHITDETAIL_ID" caption={t("CHITDETAIL_ID", "Detail ID")} />
      <Column dataField="INVENTORY_CD" caption={t("SOURCE_CODE", "Source Code")} />
      <Column dataField="PRODUCT_CD" caption={t("lblPRODUCT_CD", "Product Code")} />
      <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM", "Product Name")} calculateCellValue={(row) => pickLocalizedText(row, "PRODUCT_NM")} />
      <Column dataField="STORE_CD" caption={t("STORE_CD", "Store Code")} />
      <Column dataField="STORE_NM_VIET" caption={t("STORE_NM", "Store Name")} calculateCellValue={(row) => pickLocalizedText(row, "STORE_NM")} />
      <Column dataField="UNIT_CD" caption={t("UNIT_CD", "Unit Code")} />
      <Column dataField="UNIT_NM_VIET" caption={t("UNIT_NM", "Unit Name")} />
      <Column dataField="QUANTITY" caption={t("QUANTITY", "Quantity")} dataType="number" format={getFormat("QUANTITY", "#,##0.###")} editorOptions={createNumberEditorOptions(getFormat("QUANTITY", "#,##0.###"))} />
      <Column dataField="UNIT_PRICE_CC" caption={t("UNIT_PRICE_CC", "Unit Price")} dataType="number" format={getFormat("UNIT_PRICE_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_CC", "#,##0.00"))} />
      <Column dataField="AMOUNT_CC" caption={t("AMOUNT_CC", "Amount")} dataType="number" format={getFormat("AMOUNT_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_CC", "#,##0.00"))} allowHiding={false} />
      <Column dataField="FC_TYPE" caption={t("FC_TYPE", "Currency")} />
      <Column dataField="UNIT_PRICE_FC" caption={t("UNIT_PRICE_FC", "Unit Price FC")} dataType="number" format={getFormat("UNIT_PRICE_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_FC", "#,##0.00"))} />
      <Column dataField="EXCHANGE_RATES" caption={t("FC_RATE", "Exchange rate")} dataType="number" format={getFormat("EXCHANGE_RATES", "#,##0.000000")} editorOptions={createNumberEditorOptions(getFormat("EXCHANGE_RATES", "#,##0.000000"))} />
      <Column dataField="AMOUNT_FC" caption={t("AMOUNT_FC", "Amount FC")} dataType="number" format={getFormat("AMOUNT_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_FC", "#,##0.00"))} />
      <Column
        dataField="INVENTORY_YMD"
        caption={t("INVENTORY_YMD", "Inventory Date")}
        dataType="datetime"
        format="dd/MM/yyyy HH:mm:ss"
        editorOptions={createInventoryDateTimeEditorOptions()}
      />
      <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
    </>
  )
}

export function ChitInventoryOutputDetailColumns() {
  const t = useVoucherColumnTranslate()
  const { getFormat } = useDecimalColumnFormats()

  return (
    <>
      <Column dataField="ROW_KEY" />
      <Column dataField="OUTPUT_ID" caption={t("OUTPUT_ID", "Output ID")} />
      <Column dataField="INVENTORY_ID" caption={t("INVENTORY_ID", "Voucher ID")} />
      <Column dataField="CHITDETAIL_ID" caption={t("CHITDETAIL_ID", "Detail ID")} />
      <Column dataField="INVENTORY_CD" caption={t("SOURCE_CODE", "Source Code")} />
      <Column dataField="PRODUCT_CD" caption={t("lblPRODUCT_CD", "Product Code")} />
      <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM", "Product Name")} calculateCellValue={(row) => pickLocalizedText(row, "PRODUCT_NM")} />
      <Column dataField="STORE_CD" caption={t("STORE_CD", "Store Code")} />
      <Column dataField="STORE_NM_VIET" caption={t("STORE_NM", "Store Name")} calculateCellValue={(row) => pickLocalizedText(row, "STORE_NM")} />
      <Column dataField="UNIT_CD" caption={t("UNIT_CD", "Unit Code")} />
      <Column dataField="UNIT_NM_VIET" caption={t("UNIT_NM", "Unit Name")} />
      <Column dataField="QUANTITY" caption={t("QUANTITY", "Quantity")} dataType="number" format={getFormat("QUANTITY", "#,##0.###")} editorOptions={createNumberEditorOptions(getFormat("QUANTITY", "#,##0.###"))} />
      <Column dataField="UNIT_PRICE_CC" caption={t("UNIT_PRICE_CC", "Unit Price")} dataType="number" format={getFormat("UNIT_PRICE_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_CC", "#,##0.00"))} />
      <Column dataField="AMOUNT_CC" caption={t("AMOUNT_CC", "Amount")} dataType="number" format={getFormat("AMOUNT_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_CC", "#,##0.00"))} allowHiding={false} />
      <Column dataField="FC_TYPE" caption={t("FC_TYPE", "Currency")} />
      <Column dataField="UNIT_PRICE_FC" caption={t("UNIT_PRICE_FC", "Unit Price FC")} dataType="number" format={getFormat("UNIT_PRICE_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_FC", "#,##0.00"))} />
      <Column dataField="EXCHANGE_RATES" caption={t("FC_RATE", "Exchange rate")} dataType="number" format={getFormat("EXCHANGE_RATES", "#,##0.000000")} editorOptions={createNumberEditorOptions(getFormat("EXCHANGE_RATES", "#,##0.000000"))} />
      <Column dataField="AMOUNT_FC" caption={t("AMOUNT_FC", "Amount FC")} dataType="number" format={getFormat("AMOUNT_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_FC", "#,##0.00"))} />
      <Column
        dataField="INVENTORY_YMD"
        caption={t("INVENTORY_YMD", "Inventory Date")}
        dataType="datetime"
        format="dd/MM/yyyy HH:mm:ss"
        editorOptions={createInventoryDateTimeEditorOptions()}
      />
      <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
    </>
  )
}

export function ChitInventoryAdjustmentDetailColumns() {
  const t = useVoucherColumnTranslate()
  const { getFormat } = useDecimalColumnFormats()

  return (
    <>
      <Column dataField="ROW_KEY" />
      <Column dataField="OUTPUT_ID" caption={t("OUTPUT_ID", "Output ID")} />
      <Column dataField="INVENTORY_ID" caption={t("INVENTORY_ID", "Voucher ID")} />
      <Column dataField="CHITDETAIL_ID" caption={t("CHITDETAIL_ID", "Detail ID")} />
      <Column dataField="PRODUCT_CD" caption={t("lblPRODUCT_CD", "Product Code")} />
      <Column dataField="PRODUCT_NM_VIET" caption={t("PRODUCT_NM", "Product Name")} calculateCellValue={(row) => pickLocalizedText(row, "PRODUCT_NM")} />
      <Column dataField="STORE_CD" caption={t("FROM_STORE_CD", "From store code")} />
      <Column dataField="STORE_NM_VIET" caption={t("FROM_STORE_NM", "From store name")} calculateCellValue={(row) => pickLocalizedText(row, "STORE_NM")} />
      <Column dataField="TO_STORE_CD" caption={t("TO_STORE_CD", "To store code")} />
      <Column dataField="TO_STORE_NM_VIET" caption={t("TO_STORE_NM", "To store name")} calculateCellValue={(row) => pickLocalizedText(row, "TO_STORE_NM")} />
      <Column dataField="UNIT_CD" caption={t("UNIT_CD", "Unit Code")} />
      <Column dataField="UNIT_NM_VIET" caption={t("UNIT_NM", "Unit Name")} />
      <Column dataField="QUANTITY" caption={t("QUANTITY", "Quantity")} dataType="number" format={getFormat("QUANTITY", "#,##0.###")} editorOptions={createNumberEditorOptions(getFormat("QUANTITY", "#,##0.###"))} />
      <Column dataField="UNIT_PRICE_CC" caption={t("UNIT_PRICE_CC", "Unit Price")} dataType="number" format={getFormat("UNIT_PRICE_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_CC", "#,##0.00"))} />
      <Column dataField="AMOUNT_CC" caption={t("AMOUNT_CC", "Amount")} dataType="number" format={getFormat("AMOUNT_CC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_CC", "#,##0.00"))} allowHiding={false} />
      <Column dataField="FC_TYPE" caption={t("FC_TYPE", "Currency")} />
      <Column dataField="UNIT_PRICE_FC" caption={t("UNIT_PRICE_FC", "Unit Price FC")} dataType="number" format={getFormat("UNIT_PRICE_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("UNIT_PRICE_FC", "#,##0.00"))} />
      <Column dataField="EXCHANGE_RATES" caption={t("FC_RATE", "Exchange rate")} dataType="number" format={getFormat("EXCHANGE_RATES", "#,##0.000000")} editorOptions={createNumberEditorOptions(getFormat("EXCHANGE_RATES", "#,##0.000000"))} />
      <Column dataField="AMOUNT_FC" caption={t("AMOUNT_FC", "Amount FC")} dataType="number" format={getFormat("AMOUNT_FC", "#,##0.00")} editorOptions={createNumberEditorOptions(getFormat("AMOUNT_FC", "#,##0.00"))} />
      <Column
        dataField="INPUT_INVENTORY_YMD"
        caption={t("INPUT_INVENTORY_YMD", "Input inventory date")}
        dataType="datetime"
        format="dd/MM/yyyy HH:mm:ss"
        editorOptions={createInventoryDateTimeEditorOptions()}
      />
      <Column
        dataField="OUTPUT_INVENTORY_YMD"
        caption={t("OUTPUT_INVENTORY_YMD", "Output inventory date")}
        dataType="datetime"
        format="dd/MM/yyyy HH:mm:ss"
        editorOptions={createInventoryDateTimeEditorOptions()}
      />
      <Column dataField="SUMMARY" caption={t("SUMMARY", "Summary")} />
    </>
  )
}
