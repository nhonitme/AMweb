import { useCallback, useContext, useEffect, useMemo, useRef } from "react"
import Form, { GroupItem, Item } from "devextreme-react/form"
import type { FieldDataChangedEvent } from "devextreme/ui/form"

import { createOutlinedEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import type { SysCode } from "@/api/sysCodeService"
import { createSysCodeSelectBoxEditorOptions } from "@/components/forms/sysCodeSelectBoxOptions"
import { LanguageContext } from "@/lib/i18nLoader"
import type { UserInfo } from "@/types/userInfo"
import { userInfoFields } from "./Columns/UserInfoColumns"
import UserAvatarField from "./UserAvatarField"

interface UserInfoFormProps {
  value: UserInfo
  onChange: (next: UserInfo) => void
  onAvatarUploaded?: (avatarUrl: string) => void
  isUpdate: boolean
  disabled?: boolean
  userLevelCodes?: SysCode[]
}

type UserEditorType = "dxCheckBox" | "dxTextBox" | "dxSelectBox"

type FormItemConfig = {
  dataField: string
  label: string
  editorType?: UserEditorType
  editorOptions?: Record<string, unknown>
  colSpan?: number
}

const getEditorConfig = (
  fieldKey: string,
  isUpdate: boolean,
  userLevelCodes: SysCode[],
  t: (key: string, fallback?: string) => string,
  disabled: boolean,
  onPasswordFocus: () => void,
): { editorType: UserEditorType; editorOptions?: Record<string, unknown> } => {
  if (fieldKey === "USERLV") {
    return {
      editorType: "dxSelectBox",
      editorOptions: {
        ...createSysCodeSelectBoxEditorOptions(
          userLevelCodes,
          t("SELECT_USER_LEVEL", "Chọn quyền người dùng"),
          t,
          "number",
        ),
        disabled,
        readOnly: disabled,
      },
    }
  }

  if (fieldKey === "IS_ACTIVE") {
    return {
      editorType: "dxCheckBox",
      editorOptions: {
        disabled,
        readOnly: disabled,
        text: t("IS_ACTIVE", "Active"),
      },
    }
  }

  if (fieldKey === "PASSWD") {
    return {
      editorType: "dxTextBox",
      editorOptions: createOutlinedEditorOptions({
        mode: "password",
        disabled,
        readOnly: disabled,
        inputAttr: { autocomplete: "new-password" },
        onFocusIn: onPasswordFocus,
        placeholder: isUpdate
          ? t("LEAVE_PASSWORD_BLANK", "Để trống nếu không đổi mật khẩu")
          : t("ENTER_PASSWORD", "Nhập mật khẩu"),
      }),
    }
  }

  if (fieldKey === "USERID") {
    return {
      editorType: "dxTextBox",
      editorOptions: createOutlinedEditorOptions({
        disabled: disabled || isUpdate,
        readOnly: disabled || isUpdate,
      }),
    }
  }

  return {
    editorType: "dxTextBox",
    editorOptions: createOutlinedEditorOptions({
      disabled,
      readOnly: disabled,
    }),
  }
}

export default function UserInfoForm({
  value,
  onChange,
  onAvatarUploaded,
  isUpdate,
  disabled = false,
  userLevelCodes = [],
}: UserInfoFormProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback?: string) => (translate ? translate(key, fallback) : fallback ?? ""),
    [translate],
  )
  const passwordArmedRef = useRef(false)

  useEffect(() => {
    passwordArmedRef.current = false
  }, [value.USER_PK_ID])

  const armPassword = useCallback(() => {
    passwordArmedRef.current = true
  }, [])

  const groups = useMemo(() => {
    const createItem = (fieldKey: string, colSpan?: number): FormItemConfig => {
      const field = userInfoFields.find((item) => item.key === fieldKey)
      const caption = t(fieldKey, field?.caption ?? fieldKey)
      const { editorType, editorOptions } = getEditorConfig(
        fieldKey,
        isUpdate,
        userLevelCodes,
        t,
        disabled,
        armPassword,
      )

      return {
        dataField: fieldKey,
        label: caption,
        editorType,
        editorOptions,
        colSpan,
      }
    }

    return [
      {
        key: "login",
        caption: t("USER_SECTION_LOGIN", "Đăng nhập"),
        colCount: 2,
        items: [createItem("USERID"), createItem("PASSWD")],
      },
      {
        key: "profile",
        caption: t("USER_SECTION_PROFILE", "Thông tin liên hệ"),
        colCount: 2,
        items: [createItem("USERNM"), createItem("EMAIL"), createItem("MOBILE_NO", 2)],
      },
      {
        key: "access",
        caption: t("USER_SECTION_ACCESS", "Quyền truy cập công ty"),
        colCount: 2,
        items: [createItem("USERLV", 2), createItem("IS_ACTIVE")],
      },
    ]
  }, [armPassword, disabled, isUpdate, t, userLevelCodes])

  const handleFieldDataChanged = useCallback(
    (event: FieldDataChangedEvent) => {
      if (disabled || !event.dataField) {
        return
      }

      const dataField = String(event.dataField)
      if (dataField === "PASSWD" && !passwordArmedRef.current) {
        const editor = event.component.getEditor?.("PASSWD")
        if (editor?.option("value")) {
          editor.option("value", "")
        }
        if (value.PASSWD) {
          value.PASSWD = ""
        }
        return
      }

      if ((value as unknown as Record<string, unknown>)[dataField] === event.value) {
        return
      }

      onChange({
        ...value,
        [dataField]: event.value,
      })
    },
    [disabled, onChange, value],
  )

  return (
    <div className="user-info-form mx-auto w-full max-w-3xl space-y-5">
      <section className="rounded-xl border border-slate-200 bg-slate-50/60 px-4 py-3">
        <UserAvatarField
          value={value}
          onChange={onChange}
          onUploaded={onAvatarUploaded}
          disabled={disabled}
          isCreate={!isUpdate}
          t={t}
        />
      </section>

      <div className="[&_.dx-form-group-caption]:!mb-3 [&_.dx-form-group-caption]:!border-b [&_.dx-form-group-caption]:!border-slate-200 [&_.dx-form-group-caption]:!pb-2 [&_.dx-form-group-caption]:!text-sm [&_.dx-form-group-caption]:!font-semibold [&_.dx-form-group-caption]:!text-slate-800 [&_.dx-field-item]:!pb-3">
        <Form
          formData={value}
          colCount={1}
          labelLocation="top"
          width="100%"
          readOnly={disabled}
          onFieldDataChanged={handleFieldDataChanged}
        >
          {groups.map((group) => (
            <GroupItem key={group.key} caption={group.caption} colCount={group.colCount}>
              {group.items.map((item) => (
                <Item
                  key={item.dataField}
                  dataField={item.dataField}
                  label={
                    item.dataField === "IS_ACTIVE"
                      ? { visible: false }
                      : { text: item.label }
                  }
                  editorType={item.editorType}
                  editorOptions={item.editorOptions}
                  colSpan={item.colSpan}
                />
              ))}
            </GroupItem>
          ))}
        </Form>
      </div>
    </div>
  )
}
