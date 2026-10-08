import { useContext, useMemo } from "react"
import { Form as DxForm } from "devextreme-react/data-grid"
import { GroupItem, Item } from "devextreme-react/form"

import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import { bankFieldGroups, bankFields } from "../Columns/BankFields"
import { checkCodeExists } from "@/api/lookupApi"
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation"

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

const getEditorConfig = (
  fieldKey: string,
): { editorType: BankEditorType; editorOptions?: Record<string, unknown> } => {
  return {
    editorType: "dxTextBox",
    editorOptions: createOutlinedEditorOptions({}),
  }
}

export default function BankForm({ isUpdate }: BankFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const validation = useMasterFormValidation(t)

  const groups = useMemo(() => {
    const createItem = (fieldKey: string): FormItemConfig => {
      const field = bankFields.find((item) => item.key === fieldKey)
      const caption = t(fieldKey, field?.caption ?? fieldKey)
      const { editorType, editorOptions } = getEditorConfig(fieldKey)

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
      <DxForm colCount={1} labelLocation="top" width="100%" onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
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
                validationRules={item.dataField === "BANK_CD"
                  ? validation.code("BANK_CD", "BANK_ID", (id, value) => checkCodeExists("bank", value, id), item.label)
                  : item.dataField === "BANK_NM" ? validation.required("BANK_NM", item.label) : []}
              />
            ))}
          </GroupItem>
        ))}
      </DxForm>
    </div>
  )
}
