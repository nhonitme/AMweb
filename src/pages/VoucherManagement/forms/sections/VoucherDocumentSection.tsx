import { GroupItem, Item } from "devextreme-react/form"

import {
  createDateRequiredRule,
  createRequiredRule,
  createTrimmedRequiredRule,
  createVoucherDateBoxEditorOptions,
  createVoucherEditorOptions,
} from "../documentFieldConfig"
import type { VoucherTranslate } from "../types"

interface VoucherDocumentSectionProps {
  showCogsCode?: boolean
  amountLabel?: string
  dateLabel?: string
  documentNoLabel?: string
  t: VoucherTranslate
}

export function VoucherDocumentSection({
  showCogsCode = false,
  amountLabel,
  dateLabel,
  documentNoLabel,
  t,
}: VoucherDocumentSectionProps) {
  return (
    <GroupItem
      caption={t("BASIC_INFO", "Basic information")}
      colCount={1}
      colCountByScreen={{ xs: 1, sm: 1, md: 1, lg: 1 }}
    >
      <Item
        dataField="CHIT_TYPE_LABEL"
        editorType="dxTextBox"
        label={{ text: t("CHIT_TYPE", "Voucher type") }}
        editorOptions={{ readOnly: true, stylingMode: "outlined" }}
      />
      <Item
        dataField="CHIT_NO"
        editorType="dxTextBox"
        label={{ text: documentNoLabel ?? t("CHIT_NO", "Document no") }}
        editorOptions={createVoucherEditorOptions({ validationMessageMode: "always" })}
        validationRules={[
          createRequiredRule(t("MSG_MUST_ITEM", "Document no is required")),
          createTrimmedRequiredRule(t("MSG_MUST_ITEM", "Document no is required")),
        ]}
      />
      <Item
        dataField="CHIT_YMD"
        editorType="dxDateBox"
        label={{ text: dateLabel ?? t("CHIT_YMD", "Document date") }}
        editorOptions={createVoucherDateBoxEditorOptions({
          validationMessageMode: "always",
        })}
        validationRules={[
          createRequiredRule(t("MSG_MUST_ITEM", "Document date is required")),
          createDateRequiredRule(t("MSG_MUST_ITEM", "Document date is required")),
        ]}
      />
      <GroupItem
        colCount={showCogsCode ? 2 : 1}
        colCountByScreen={{ xs: 1, sm: 1, md: showCogsCode ? 2 : 1, lg: showCogsCode ? 2 : 1 }}
      >
        <Item
          dataField="AMOUNT"
          editorType="dxNumberBox"
          label={{ text: amountLabel ?? t("AMOUNT", "Amount") }}
          editorOptions={{ stylingMode: "outlined", format: "#,##0.00", readOnly: true }}
        />
        {showCogsCode ? (
          <Item
            dataField="CHIT_CD_COGS"
            editorType="dxTextBox"
            label={{ text: t("CHIT_CD_COGS", "COGS voucher code") }}
            editorOptions={{ stylingMode: "outlined" }}
          />
        ) : null}
      </GroupItem>
    </GroupItem>
  )
}

export default VoucherDocumentSection
