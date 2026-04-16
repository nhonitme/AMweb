import { GroupItem, Item } from "devextreme-react/form"

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
        editorOptions={{
          stylingMode: "outlined",
          placeholder: partnerPlaceholder,
        }}
      />
      {referenceLabel ? (
        <Item
          dataField="EMAIL_EPAY"
          colSpan={1}
          editorType="dxTextBox"
          label={{ text: referenceLabel }}
          editorOptions={{
            stylingMode: "outlined",
            placeholder: referencePlaceholder,
          }}
        />
      ) : null}
      {dayLabel ? (
        <Item
          dataField="DAY_OF_PAYMENT"
          editorType="dxNumberBox"
          label={{ text: dayLabel }}
          editorOptions={{
            stylingMode: "outlined",
            placeholder: dayPlaceholder,
            min: 1,
            max: 999,
            showSpinButtons: true,
          }}
        />
      ) : null}
      {timeLabel ? (
        <Item
          dataField="TIME_FOR_PAYMENT"
          colSpan={dayLabel ? 2 : 3}
          editorType="dxTextBox"
          label={{ text: timeLabel }}
          editorOptions={{
            stylingMode: "outlined",
            placeholder: timePlaceholder,
          }}
        />
      ) : null}
    </GroupItem>
  )
}

export default VoucherBusinessSection
