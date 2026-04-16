import { GroupItem, Item } from "devextreme-react/form"

import type { VoucherTranslate } from "../types"

interface VoucherDescriptionSectionProps {
  noteLabel?: string
  primaryDescriptionLabel?: string
  showInternalNote?: boolean
  t: VoucherTranslate
}

export function VoucherDescriptionSection({
  noteLabel,
  primaryDescriptionLabel,
  showInternalNote = true,
  t,
}: VoucherDescriptionSectionProps) {
  return (
    <GroupItem
      caption={t("DESCRIPTION_INFO", "Diễn giải")}
      colCount={3}
      colCountByScreen={{ xs: 1, sm: 1, md: 3, lg: 3 }}
    >
      <Item
        dataField="DESCRIPTION_VIET"
        colSpan={2}
        editorType="dxTextBox"
        label={{ text: primaryDescriptionLabel ?? t("DESCRIPTION_VIET", "Diễn giải tiếng Việt") }}
        editorOptions={{ stylingMode: "outlined", minHeight: 88, autoResizeEnabled: true }}
      />
      <Item
        dataField="DESCRIPTION_ENG"
        colSpan={1}
        editorType="dxTextBox"
        label={{ text: t("DESCRIPTION_ENG", "Diễn giải tiếng Anh") }}
        editorOptions={{ stylingMode: "outlined", minHeight: 88, autoResizeEnabled: true }}
      />
      <Item
        dataField="DESCRIPTION_KOR"
        colSpan={2}
        editorType="dxTextBox"
        label={{ text: t("DESCRIPTION_KOR", "Diễn giải tiếng Hàn") }}
        editorOptions={{ stylingMode: "outlined", minHeight: 88, autoResizeEnabled: true }}
      />
      {showInternalNote ? (
        <Item
          dataField="NOTE"
          colSpan={1}
          editorType="dxTextBox"
          label={{ text: noteLabel ?? t("NOTE", "Ghi chú nội bộ") }}
          editorOptions={{ stylingMode: "outlined", minHeight: 88, autoResizeEnabled: true }}
        />
      ) : null}
    </GroupItem>
  )
}

export default VoucherDescriptionSection
