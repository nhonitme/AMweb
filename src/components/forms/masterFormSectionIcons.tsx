import type { GroupCaptionTemplateData } from "devextreme/ui/form"

export function renderMasterFormSectionIcon(icon = "info") {
  return <span className={`master-data-form-section__icon dx-icon dx-icon-${icon}`} aria-hidden="true" />
}

function renderGroupCaption(icon: string) {
  return ({ caption }: GroupCaptionTemplateData) => (
    <>
      {renderMasterFormSectionIcon(icon)}
      <span>{caption}</span>
    </>
  )
}

export const masterFormGroupCaptions = {
  info: renderGroupCaption("info"),
  globe: renderGroupCaption("globe"),
  tags: renderGroupCaption("tags"),
  tel: renderGroupCaption("tel"),
  money: renderGroupCaption("money"),
  overflow: renderGroupCaption("overflow"),
  key: renderGroupCaption("key"),
  lock: renderGroupCaption("lock"),
}
