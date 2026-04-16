import { useContext, useMemo } from "react"
import { Form as DxForm } from "devextreme-react/data-grid"
import { GroupItem, Item } from "devextreme-react/form"

import type { SysCode } from "@/api/sysCodeService"
import { createSysCodeSelectBoxEditorOptions } from "@/components/forms/sysCodeSelectBoxOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import { userInfoFieldGroups, userInfoFields } from "./Columns/UserInfoColumns"

interface UserInfoFormProps {
  isUpdate: boolean
  userLevelCodes: SysCode[]
}

type UserEditorType = "dxTextBox" | "dxSelectBox"

type FormItemConfig = {
  dataField: string
  label: string
  editorType?: UserEditorType
  editorOptions?: Record<string, unknown>
}

const createTextBoxOptions = (options: Record<string, unknown> = {}): Record<string, unknown> => ({
  stylingMode: "outlined",
  ...options,
})

const getEditorConfig = (
  fieldKey: string,
  isUpdate: boolean,
  userLevelCodes: SysCode[],
  t: (key: string, fallback?: string) => string,
): { editorType: UserEditorType; editorOptions?: Record<string, unknown> } => {
  if (fieldKey === "USERLV") {
    return {
      editorType: "dxSelectBox",
      editorOptions: createSysCodeSelectBoxEditorOptions(
        userLevelCodes,
        t("SELECT_USER_LEVEL", "Chọn quyền người dùng"),
        t,
      ),
    }
  }

  if (fieldKey === "PASSWD") {
    return {
      editorType: "dxTextBox",
      editorOptions: createTextBoxOptions({
        mode: "password",
        placeholder: isUpdate
          ? t("LEAVE_PASSWORD_BLANK", "Nhập mật khẩu hiện tại hoặc để trống nếu không muốn thay đổi")
          : t("ENTER_PASSWORD", "Nhập mật khẩu"),
      }),
    }
  }

  return {
    editorType: "dxTextBox",
    editorOptions: createTextBoxOptions({}),
  }
}

export default function UserInfoForm({ isUpdate, userLevelCodes }: UserInfoFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback?: string) => (translate ? translate(key, fallback) : fallback ?? "")

  const groups = useMemo(() => {
    const createItem = (fieldKey: string): FormItemConfig => {
      const field = userInfoFields.find((item) => item.key === fieldKey)
      const caption = t(fieldKey, field?.caption ?? fieldKey)
      const { editorType, editorOptions } = getEditorConfig(fieldKey, isUpdate, userLevelCodes, t)

      return {
        dataField: fieldKey,
        label: caption,
        editorType,
        editorOptions,
      }
    }

    return [
      {
        key: "account",
        caption: t("BASE_INFO", "Basic Information"),
        colCount: 2,
        items: userInfoFieldGroups.account.map(createItem),
      },
    ]
  }, [isUpdate, t, userLevelCodes])

  return (
    <div className="user-info-form">
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
              />
            ))}
          </GroupItem>
        ))}
      </DxForm>
    </div>
  )
}
