import { useContext, useMemo } from "react"
import { Form as DxForm } from "devextreme-react/data-grid"
import { GroupItem, Item } from "devextreme-react/form"

import { LanguageContext } from "@/lib/i18nLoader"
import { departmentFieldGroups } from "./Columns/DepartmentFields"

interface DepartmentInfoFormProps {
  isUpdate: boolean
}

type DepartmentEditorType = "dxTextBox"

type FormItemConfig = {
  dataField: string
  label: string
  editorType?: DepartmentEditorType
  editorOptions?: Record<string, unknown>
  colSpan?: number
}

const createTextBoxOptions = (options: Record<string, unknown> = {}): Record<string, unknown> => ({
  stylingMode: "outlined",
  ...options,
})

const getEditorConfig = (
  fieldKey: string,
  isUpdate: boolean,
): { editorType: DepartmentEditorType; editorOptions?: Record<string, unknown> } => ({
  editorType: "dxTextBox",
  editorOptions: createTextBoxOptions({}),
})

export default function DepartmentInfoForm({ isUpdate }: DepartmentInfoFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  const groups = useMemo(() => {
    const createItem = (fieldKey: string): FormItemConfig => {
      const caption = t(fieldKey, fieldKey)
      const { editorType, editorOptions } = getEditorConfig(fieldKey, isUpdate)

      return {
        dataField: fieldKey,
        label: caption,
        editorType,
        editorOptions,
      }
    }

    const basicItems = departmentFieldGroups.basic.map((fieldKey) => createItem(fieldKey))
    const namesItems = departmentFieldGroups.names.map((fieldKey) => createItem(fieldKey))

    return [
      {
        key: "basic",
        caption: t("BASE_INFO", "Basic Information"),
        colCount: 2,
        items: basicItems,
      },
      {
        key: "names",
        caption: t("DEPARTMENT_NAME_INFO", "Department Names"),
        colCount: 2,
        items: namesItems,
      },
    ]
  }, [isUpdate, t])

  return (
    <div className="department-info-form">
      <DxForm colCount={1} labelLocation="top" width="100%">
        {groups.map((group) => (
          <GroupItem key={group.key} caption={group.caption} colCount={group.colCount ?? 2}>
            {group.items.map((item) => (
              <Item
                key={item.dataField}
                dataField={item.dataField}
                label={{ text: item.label }}
                editorType={item.editorType}
                editorOptions={item.editorOptions}
                colSpan={item.colSpan}
              />
            ))}
          </GroupItem>
        ))}
      </DxForm>
    </div>
  )
}
