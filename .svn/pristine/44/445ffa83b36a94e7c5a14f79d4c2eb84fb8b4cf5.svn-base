import { useContext, useMemo } from "react"
import { Form as DxForm } from "devextreme-react/data-grid"
import { GroupItem, Item } from "devextreme-react/form"

import { LanguageContext } from "@/lib/i18nLoader"

interface CompanySignatureFormProps {
  isUpdate: boolean
}

type SignatureEditorType = "dxTextBox" | "dxTextBox" | "dxNumberBox" | "dxCheckBox"

type FormItemConfig = {
  dataField: string
  label: string
  editorType: SignatureEditorType
  editorOptions?: Record<string, unknown>
  colSpan?: number
}

const createOutlinedOptions = (options: Record<string, unknown> = {}): Record<string, unknown> => ({
  stylingMode: "outlined",
  ...options,
})

export default function CompanySignatureForm({ isUpdate }: CompanySignatureFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate?: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback)

  const groups = useMemo(() => {
    const baseItems: FormItemConfig[] = [
      {
        dataField: "SIGN_CODE",
        label: t("SIGN_CODE", "Sign Code"),
        editorType: "dxTextBox",
        editorOptions: createOutlinedOptions({
          readOnly: true,
          placeholder: isUpdate ? "" : t("AUTO_GENERATED", "Automatically generated after save"),
        }),
      },
      {
        dataField: "DISPLAY_LABEL",
        label: t("DISPLAY_LABEL", "Display Label"),
        editorType: "dxTextBox",
        editorOptions: createOutlinedOptions({}),
      },
      {
        dataField: "SIGN_NAME",
        label: t("SIGN_NAME", "Signer Name"),
        editorType: "dxTextBox",
        editorOptions: createOutlinedOptions({}),
      },
      {
        dataField: "SIGN_TITLE",
        label: t("SIGN_TITLE", "Signer Title"),
        editorType: "dxTextBox",
        editorOptions: createOutlinedOptions({}),
      },
      {
        dataField: "SORT_ORDER",
        label: t("SORT_ORDER", "Sort Order"),
        editorType: "dxNumberBox",
        editorOptions: createOutlinedOptions({
          min: 0,
          showSpinButtons: true,
        }),
      },
      {
        dataField: "IS_ACTIVE",
        label: t("IS_ACTIVE", "Active"),
        editorType: "dxCheckBox",
        editorOptions: {
          text: "",
        },
      },
    ]

    const mediaItems: FormItemConfig[] = [
      {
        dataField: "SIGN_IMAGE_URL",
        label: t("SIGN_IMAGE_URL", "Image URL"),
        editorType: "dxTextBox",
        editorOptions: createOutlinedOptions({
          minHeight: isUpdate ? 110 : 96,
          autoResizeEnabled: true,
        }),
        colSpan: 2,
      },
    ]

    return [
      {
        key: "basic",
        caption: t("BASE_INFO", "Basic Information"),
        colCount: 2,
        items: baseItems,
      },
      {
        key: "media",
        caption: t("SIGNATURE_MEDIA", "Signature Media"),
        colCount: 2,
        items: mediaItems,
      },
    ]
  }, [isUpdate, t])

  return (
    <div className="company-signature-form">
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
