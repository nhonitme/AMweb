import { GroupItem, Item } from "devextreme-react/form"

import type { VoucherTranslate } from "../types"

interface VoucherStatusSectionProps {
  paymentStatusLabel?: string
  t: VoucherTranslate
}

export function VoucherStatusSection({
  paymentStatusLabel,
  t,
}: VoucherStatusSectionProps) {
  return (
    <GroupItem
      caption={t("STATUS_INFO", "Trạng thái")}
      colCount={3}
      visible={false}
      colCountByScreen={{ xs: 1, sm: 2, md: 3, lg: 3 }}
    >
      <Item
        dataField="IS_CONFIRMED"
        editorType="dxCheckBox"
        label={{ text: t("IS_CONFIRMED", "Đã xác nhận") }}
      />
      <Item
        dataField="IS_PAYMENT"
        editorType="dxCheckBox"
        label={{ text: paymentStatusLabel ?? t("IS_PAYMENT", "Đã thanh toán") }}
      />
      <Item
        dataField="IS_LOCK"
        editorType="dxCheckBox"
        label={{ text: t("IS_LOCK", "Đã khóa") }}
      />
      <Item
        dataField="ISEXCEL"
        editorType="dxCheckBox"
        label={{ text: t("ISEXCEL", "Đã import Excel") }}
        colSpan={1}
      />
    </GroupItem>
  )
}

export default VoucherStatusSection
