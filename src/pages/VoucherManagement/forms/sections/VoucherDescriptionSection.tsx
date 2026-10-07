import { GroupItem, Item } from "devextreme-react/form"

import { isLangFieldVisible, useCompanyLangRevision } from "@/lib/companyLang"
import { createVoucherEditorOptions } from "../documentFieldConfig"
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
  const companyLangRevision = useCompanyLangRevision()

  return (
    <GroupItem
      key={companyLangRevision}
      caption={t("DESCRIPTION_INFO", "Description")}
      colCount={3}
      colCountByScreen={{ xs: 1, sm: 1, md: 3, lg: 3 }}
    >
      <Item
        dataField="DESCRIPTION_VIET"
        visible={isLangFieldVisible("DESCRIPTION_VIET")}
        colSpan={2}
        editorType="dxTextBox"
        label={{ text: primaryDescriptionLabel ?? t("DESCRIPTION_VIET", "Description (VI)") }}
        editorOptions={createVoucherEditorOptions({
          minHeight: 88,
          autoResizeEnabled: true,
        })}
      />
      <Item
        dataField="DESCRIPTION_ENG"
        visible={isLangFieldVisible("DESCRIPTION_ENG")}
        colSpan={1}
        editorType="dxTextBox"
        label={{ text: t("DESCRIPTION_ENG", "Description (EN)") }}
        editorOptions={createVoucherEditorOptions({
          minHeight: 88,
          autoResizeEnabled: true,
        })}
      />
      <Item
        dataField="DESCRIPTION_KOR"
        visible={isLangFieldVisible("DESCRIPTION_KOR")}
        colSpan={2}
        editorType="dxTextBox"
        label={{ text: t("DESCRIPTION_KOR", "Description (KO)") }}
        editorOptions={createVoucherEditorOptions({
          minHeight: 88,
          autoResizeEnabled: true,
        })}
      />
      {showInternalNote ? (
        <Item
          dataField="NOTE"
          colSpan={1}
          editorType="dxTextBox"
          label={{ text: noteLabel ?? t("NOTE", "Internal Note") }}
          editorOptions={createVoucherEditorOptions()}
        />
      ) : null}
    </GroupItem>
  )
}

export default VoucherDescriptionSection
