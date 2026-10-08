import { useContext, useMemo } from "react"
import { Form as DxForm } from "devextreme-react/tree-list"
import { GroupItem, Item } from "devextreme-react/form"

import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import { isDefaultLangField, isLangFieldVisible, useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import { departmentFieldGroups, type DepartmentFieldKey } from "./Columns/DepartmentFields"
import { checkCodeExists } from "@/api/lookupApi"
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation"
import type { ValidationRule } from "devextreme/common"

interface DepartmentInfoFormProps {
  isUpdate: boolean
}

type DepartmentEditorType = "dxTextBox"

type FormItemConfig = {
  dataField: DepartmentFieldKey
  label: string
  editorType?: DepartmentEditorType
  editorOptions?: Record<string, unknown>
  validationRules?: ValidationRule[]
  colSpan?: number
  cssClass?: string
}

const requiredDepartmentFields = new Set<DepartmentFieldKey>(["DEPARTMENT_CD"])

// Flag prefixes for the language-specific name fields, matching the country codes
// already used by the app's own language switcher (see src/utils/language.ts).
const departmentNameFieldFlags: Partial<Record<DepartmentFieldKey, string>> = {
  DEP_NAME_VIET: "\u{1F1FB}\u{1F1F3}",
  DEP_NAME_ENG: "\u{1F1FA}\u{1F1F8}",
  DEP_NAME_KOR: "\u{1F1F0}\u{1F1F7}",
  DEP_NAME_CHINA: "\u{1F1E8}\u{1F1F3}",
}

const getEditorConfig = (): { editorType: DepartmentEditorType; editorOptions?: Record<string, unknown> } => ({
  editorType: "dxTextBox",
  editorOptions: createOutlinedEditorOptions({}),
})

export default function DepartmentInfoForm({ isUpdate }: DepartmentInfoFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const companyLangRevision = useCompanyLangRevision()
  const validation = useMasterFormValidation(t)

  const groups = useMemo(() => {
    const createItem = (fieldKey: DepartmentFieldKey, groupItemCount: number): FormItemConfig => {
      const baseCaption = t(fieldKey, fieldKey)
      const flag = departmentNameFieldFlags[fieldKey]
      const caption = flag ? `${flag} ${baseCaption}` : baseCaption
      const { editorType, editorOptions } = getEditorConfig()

      return {
        dataField: fieldKey,
        label: caption,
        editorType,
        editorOptions,
        validationRules:
          requiredDepartmentFields.has(fieldKey)
            ? validation.code(fieldKey, "DEPARTMENT_ID", (id, value) => checkCodeExists("department", value, id), baseCaption)
            : isDefaultLangField(fieldKey) ? validation.required(fieldKey, baseCaption) : [],
        // When a group has just one field, keep the input at a readable width
        // instead of letting it stretch across the whole (otherwise-empty) row.
        cssClass: groupItemCount === 1 ? "field-narrow" : undefined,
      }
    }

    const basicItems = departmentFieldGroups.basic.map((fieldKey) =>
      createItem(fieldKey, departmentFieldGroups.basic.length),
    )
    const visibleNameFields = departmentFieldGroups.names.filter((fieldKey) => isLangFieldVisible(fieldKey) || isDefaultLangField(fieldKey))
    const namesItems = visibleNameFields.map((fieldKey) => createItem(fieldKey, visibleNameFields.length))

    // Match the group's column count to how many fields it actually has, so a
    // lone field doesn't leave half the row visibly blank.
    const colCountFor = (itemCount: number) => Math.max(1, Math.min(2, itemCount))

    return [
      {
        key: "basic",
        caption: t("BASE_INFO", "Basic Information"),
        colCount: colCountFor(basicItems.length),
        items: basicItems,
        cardVariant: "info" as const,
      },
      {
        key: "names",
        caption: t("DEPARTMENT_NAME_INFO", "Department Names"),
        colCount: colCountFor(namesItems.length),
        items: namesItems,
        cardVariant: "lang" as const,
      },
    ]
  }, [companyLangRevision, t])

  return (
    <div className="department-info-form">
      <DxForm colCount={1} labelLocation="top" width="100%" onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
        {groups.map((group) => (
          <GroupItem
            key={group.key}
            caption={group.caption}
            colCount={group.colCount ?? 2}
            cssClass={`popup-card popup-card--${group.cardVariant}`}
          >
            {group.items.map((item) => (
              <Item
                key={item.dataField}
                dataField={item.dataField}
                label={{ text: item.label }}
                editorType={item.editorType}
                editorOptions={item.editorOptions}
                validationRules={item.validationRules}
                colSpan={item.colSpan}
                cssClass={item.cssClass}
              />
            ))}
          </GroupItem>
        ))}
      </DxForm>
    </div>
  )
}
