import { useContext, useMemo } from "react"
import { Form as DxForm } from "devextreme-react/data-grid"
import { GroupItem, Item } from "devextreme-react/form"

import { LanguageContext } from "@/lib/i18nLoader"
import { bankFieldGroups, bankFields } from "../Columns/BankFields"

interface BankFormProps {
  isUpdate: boolean
}

type BankEditorType = "dxTextBox" | "dxTextBox"

type FormItemConfig = {
  dataField: string
  label: string
  editorType?: BankEditorType
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
): { editorType: BankEditorType; editorOptions?: Record<string, unknown> } => {
  if (fieldKey === "REMARK") {
    return {
      editorType: "dxTextBox",
      editorOptions: createTextBoxOptions({
        height: 110,
      }),
    }
  }

  return {
    editorType: "dxTextBox",
    editorOptions: createTextBoxOptions({}),
  }
}

export default function BankForm({ isUpdate }: BankFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  const groups = useMemo(() => {
    const createItem = (fieldKey: string): FormItemConfig => {
      const field = bankFields.find((item) => item.key === fieldKey)
      const caption = t(fieldKey, field?.caption ?? fieldKey)
      const { editorType, editorOptions } = getEditorConfig(fieldKey, isUpdate)

      return {
        dataField: fieldKey,
        label: caption,
        editorType,
        editorOptions,
        colSpan: field?.colSpan,
      }
    }

    return [
      {
        key: "basic",
        caption: t("BASE_INFO", "Basic Information"),
        colCount: 3,
        items: bankFieldGroups.basic.map(createItem),
      },
      {
        key: "account",
        caption: t("BANK_ACCOUNT_INFO", "Thông tin ngân hàng"),
        colCount: 3,
        items: bankFieldGroups.account.map(createItem),
      },
      {
        key: "other",
        caption: t("Other", "Khác"),
        colCount: 2,
        items: bankFieldGroups.other.map(createItem),
      },
    ]
  }, [isUpdate, t])

  return (
    <div className="bank-form">
      <DxForm colCount={1} labelLocation="top" width="100%">
        {groups.map((group) => (
          <GroupItem key={group.key} caption={group.caption} colCount={group.colCount}>
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
