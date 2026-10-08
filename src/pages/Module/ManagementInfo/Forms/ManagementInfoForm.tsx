import { useContext, useMemo } from "react"
import { Form as DxForm } from "devextreme-react/data-grid"
import { GroupItem, Item } from "devextreme-react/form"

import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import MasterLookupFormField from "@/components/lookup/MasterLookupFormField"
import { managementLookupStore } from "@/components/lookup/managementLookupStore"
import { renderSharedManagementLookupPage } from "@/components/lookup/sharedMasterLookupPages"
import { filterActiveLangFields, isLangFieldVisible, pickLocalizedText, useCompanyLangRevision } from "@/lib/companyLang"
import { LanguageContext } from "@/lib/i18nLoader"
import type { ManagementInfo } from "@/types/managementInfo"
import { managementInfoFieldGroups } from "../Columns/ManagementInfoColumns"
import { checkCodeExists } from "@/api/lookupApi"
import { useMasterFormValidation } from "@/components/forms/useMasterFormValidation"

type FormItemConfig = {
  dataField: string
  label: string
}

export function ManagementInfoForm() {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)
  const companyLangRevision = useCompanyLangRevision()
  const validation = useMasterFormValidation(t)

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
        items: managementInfoFieldGroups.descriptions
          .filter((fieldKey) => isLangFieldVisible(fieldKey))
          .map((fieldKey) => createItem(fieldKey)),
      },
    ]
  }, [companyLangRevision, t])

  return (
    <div className="management-info-form">
      <DxForm colCount={1} labelLocation="top" width="100%" onInitialized={validation.onInitialized} onFieldDataChanged={validation.onFieldDataChanged}>
        {groups.map((group) => (
          <GroupItem key={group.key} caption={group.caption} colCount={group.colCount}>
            {group.items.map((item) =>
              item.dataField === "MG_CD_ROOT" ? (
                <Item
                  key={item.dataField}
                  dataField={item.dataField}
                  label={{ text: item.label }}
                  render={({ component }) => (
                    <MasterLookupFormField<ManagementInfo>
                      form={component}
                      dataField="MG_CD_ROOT"
                      dataSource={managementLookupStore}
                      valueExpr="MG_CD"
                      getValue={(row) => row.MG_CD}
                      displayExpr={(option) => {
                        if (!option) {
                          return ""
                        }

                        const code = option.MG_CD?.trim() ?? ""
                        const name = pickLocalizedText(option, "MG_DESC")
                        return code && name ? `${code} - ${name}` : code || name
                      }}
                      placeholder={t("lblChoose", "Choose")}
                      popupTitle={t("MG_LIST", "Management")}
                      buttonHint={t("SEARCH", "Open management list")}
                      filterFocusField="MG_CD"
                      searchExpr={filterActiveLangFields([
                        "MG_CD",
                        "MG_DESC_VIET",
                        "MG_DESC_ENG",
                        "MG_DESC_KOR",
                      ])}
                      renderPopupContent={({ closePopup, onPick }) =>
                        renderSharedManagementLookupPage({ closePopup, onPick })
                      }
                    />
                  )}
                />
              ) : (
                <Item
                  key={item.dataField}
                  dataField={item.dataField}
                  label={{ text: item.label }}
                  editorType="dxTextBox"
                  editorOptions={createOutlinedEditorOptions({})}
                  validationRules={item.dataField === "MG_CD"
                    ? validation.code("MG_CD", "MG_ID", (id, value) => checkCodeExists("management", value, id), item.label) : []}
                />
              ),
            )}
          </GroupItem>
        ))}
      </DxForm>
    </div>
  )
}
