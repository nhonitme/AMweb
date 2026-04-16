import { useContext, useMemo } from "react"
import { Form as DxForm } from "devextreme-react/data-grid"
import { GroupItem, Item } from "devextreme-react/form"

import { LanguageContext } from "@/lib/i18nLoader"
import { managementInfoFieldGroups } from "../Columns/ManagementInfoColumns"

type FormItemConfig = {
  dataField: string
  label: string
}

export function ManagementInfoForm() {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  const groups = useMemo(() => {
    const createItem = (fieldKey: string): FormItemConfig => ({
      dataField: fieldKey,
      label: t(fieldKey, fieldKey),
    })

    return [
      {
        key: "basic",
        caption: t("BASE_INFO", "Basic Information"),
        colCount: 2,
        items: managementInfoFieldGroups.basic.map((fieldKey) => createItem(fieldKey)),
      },
      {
        key: "descriptions",
        caption: t("DESCRIPTION", "Descriptions"),
        colCount: 2,
        items: managementInfoFieldGroups.descriptions.map((fieldKey) => createItem(fieldKey)),
      },
    ]
  }, [t])

  return (
    <div className="management-info-form">
      <DxForm colCount={1} labelLocation="top" width="100%">
        {groups.map((group) => (
          <GroupItem key={group.key} caption={group.caption} colCount={group.colCount}>
            {group.items.map((item) => (
              <Item
                key={item.dataField}
                dataField={item.dataField}
                label={{ text: item.label }}
                editorType="dxTextBox"
                editorOptions={{ stylingMode: "outlined" }}
              />
            ))}
          </GroupItem>
        ))}
      </DxForm>
    </div>
  )
}
