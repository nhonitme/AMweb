import { GroupItem, Item } from "devextreme-react/form"

import type { VoucherTranslate } from "../types"

interface VoucherDocumentSectionProps {
  isUpdate: boolean
  showCogsCode?: boolean
  showVoucherCode?: boolean
  amountLabel?: string
  dateLabel?: string
  documentNoLabel?: string
  t: VoucherTranslate
}

const createRequiredRule = (message: string) => ({
  type: "required" as const,
  message,
})

const createTrimmedRequiredRule = (message: string) => ({
  type: "custom" as const,
  reevaluate: true,
  message,
  validationCallback: (event: { value?: unknown }) => String(event.value ?? "").trim().length > 0,
})

export function VoucherDocumentSection({
  isUpdate,
  showCogsCode = false,
  showVoucherCode = false,
  amountLabel,
  dateLabel,
  documentNoLabel,
  t,
}: VoucherDocumentSectionProps) {
  return (
    <GroupItem
      caption={t("BASIC_INFO", "Thông tin cơ bản")}
      colCount={1}
      colCountByScreen={{ xs: 1, sm: 1, md: 1, lg: 1 }}
    >
      <Item
        dataField="CHIT_TYPE_LABEL"
        editorType="dxTextBox"
        label={{ text: t("CHIT_TYPE", "Loại phiếu") }}
        editorOptions={{ readOnly: true, stylingMode: "outlined" }}
      />
      {showVoucherCode ? (
        <Item
          dataField="CHIT_CD"
          visible={false}
          editorType="dxTextBox"
          label={{ text: t("CHIT_CD", "Mã chứng từ") }}
          editorOptions={{ readOnly: isUpdate, stylingMode: "outlined" }}
        />
      ) : null}
      <Item
        dataField="CHIT_NO"
        editorType="dxTextBox"
        label={{ text: documentNoLabel ?? t("CHIT_NO", "Số chứng từ") }}
        editorOptions={{ stylingMode: "outlined", validationMessageMode: "always" }}
        validationRules={[
          createRequiredRule(t("MSG_MUST_ITEM", "Số chứng từ là bắt buộc")),
          createTrimmedRequiredRule(t("MSG_MUST_ITEM", "Số chứng từ là bắt buộc")),
        ]}
      />
      <Item
        dataField="CHIT_YMD"
        editorType="dxDateBox"
        label={{ text: dateLabel ?? t("CHIT_YMD", "Ngày chứng từ") }}
        editorOptions={{
          stylingMode: "outlined",
          displayFormat: "dd/MM/yyyy",
          type: "date",
          validationMessageMode: "always",
        }}
        validationRules={[
          createRequiredRule(t("MSG_MUST_ITEM", "Ngày chứng từ là bắt buộc")),
          {
            type: "custom",
            reevaluate: true,
            message: t("MSG_MUST_ITEM", "Ngày chứng từ là bắt buộc"),
            validationCallback: (event: { value?: unknown }) => {
              if (event.value instanceof Date) {
                return !Number.isNaN(event.value.getTime())
              }

              return String(event.value ?? "").trim().length > 0
            },
          },
        ]}
      />
      <GroupItem
        colCount={showCogsCode ? 2 : 1}
        colCountByScreen={{ xs: 1, sm: 1, md: showCogsCode ? 2 : 1, lg: showCogsCode ? 2 : 1 }}
      >
        <Item
          dataField="AMOUNT"
          editorType="dxNumberBox"
          label={{ text: amountLabel ?? t("AMOUNT", "Số tiền") }}
          editorOptions={{ stylingMode: "outlined", format: "#,##0.00", readOnly: true }}
        />
        {showCogsCode ? (
          <Item
            dataField="CHIT_CD_COGS"
            editorType="dxTextBox"
            label={{ text: t("CHIT_CD_COGS", "Mã chứng từ giá vốn") }}
            editorOptions={{ stylingMode: "outlined" }}
          />
        ) : null}
      </GroupItem>
    </GroupItem>
  )
}

export default VoucherDocumentSection
