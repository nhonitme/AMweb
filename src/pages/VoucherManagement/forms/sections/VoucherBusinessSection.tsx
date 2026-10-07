import { GroupItem, Item } from "devextreme-react/form"

import { createVoucherEditorOptions } from "../documentFieldConfig"

interface VoucherBusinessSectionProps {
  caption: string
  partnerLabel: string
  partnerPlaceholder?: string
  referenceLabel?: string
  referencePlaceholder?: string
  dayLabel?: string
  dayPlaceholder?: string
  timeLabel?: string
  timePlaceholder?: string
}

export function VoucherBusinessSection({
  caption,
  partnerLabel,
  partnerPlaceholder,
  referenceLabel,
  referencePlaceholder,
  dayLabel,
  dayPlaceholder,
  timeLabel,
  timePlaceholder,
}: VoucherBusinessSectionProps) {
  return (
    <GroupItem
      caption={caption}
      colCount={3}
      colCountByScreen={{ xs: 1, sm: 1, md: 3, lg: 3 }}
    >
      <Item
        dataField="PAYER_INFO"
        colSpan={2}
        editorType="dxTextBox"
        label={{ text: partnerLabel }}
        editorOptions={createVoucherEditorOptions({
          placeholder: partnerPlaceholder,
        })}
      />
      {referenceLabel ? (
        <Item
          dataField="EMAIL_EPAY"
          colSpan={1}
          editorType="dxTextBox"
          label={{ text: referenceLabel }}
          editorOptions={createVoucherEditorOptions({
            placeholder: referencePlaceholder,
          })}
        />
      ) : null}
      {dayLabel ? (
        <Item
          dataField="DAY_OF_PAYMENT"
          editorType="dxNumberBox"
          label={{ text: dayLabel }}
          editorOptions={createVoucherEditorOptions({
            placeholder: dayPlaceholder,
            min: 1,
            max: 999,
            showSpinButtons: true,
          })}
        />
      ) : null}
      {timeLabel ? (
        <Item
          dataField="TIME_FOR_PAYMENT"
          colSpan={dayLabel ? 2 : 3}
          editorType="dxTextBox"
          label={{ text: timeLabel }}
          editorOptions={createVoucherEditorOptions({
            placeholder: timePlaceholder,
          })}
        />
      ) : null}
    </GroupItem>
  )
}

export default VoucherBusinessSection
