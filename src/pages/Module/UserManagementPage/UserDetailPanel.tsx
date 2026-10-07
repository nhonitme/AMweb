import { useContext } from "react"
import Button from "devextreme-react/button"
import Toolbar, { Item as ToolbarItem } from "devextreme-react/toolbar"

import type { SysCode } from "@/api/sysCodeService"
import { LanguageContext } from "@/lib/i18nLoader"
import type { UserInfo } from "@/types/userInfo"
import UserInfoForm from "./UserInfoForm"

export type UserDetailMode = "idle" | "view-edit" | "create"

type UserDetailPanelProps = {
  mode: UserDetailMode
  value: UserInfo | null
  isDirty: boolean
  saving?: boolean
  userLevelCodes?: SysCode[]
  canOpenPermissions?: boolean
  onChange: (next: UserInfo) => void
  onAvatarUploaded?: (avatarUrl: string) => void
  onSave: () => void
  onCancel: () => void
  onOpenPermissions?: () => void
}

export default function UserDetailPanel({
  mode,
  value,
  isDirty,
  saving = false,
  userLevelCodes = [],
  canOpenPermissions = false,
  onChange,
  onAvatarUploaded,
  onSave,
  onCancel,
  onOpenPermissions,
}: UserDetailPanelProps) {
  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = (key: string, fallback?: string) =>
    translate ? translate(key, fallback ?? key) : fallback ?? key

  if (mode === "idle" || !value) {
    return (
      <div className="flex h-full min-h-[240px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-300 bg-white px-6 text-center">
        <div className="mb-2 text-sm font-medium text-slate-700">
          {t("USER_DETAIL_EMPTY_TITLE", "Chưa chọn người dùng")}
        </div>
        <div className="max-w-sm text-sm text-slate-500">
          {t("USER_DETAIL_EMPTY", "Chọn một người dùng bên trái để xem và chỉnh sửa thông tin.")}
        </div>
      </div>
    )
  }

  const isCreate = mode === "create"

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
      <div className="flex flex-shrink-0 justify-end border-b border-slate-200 bg-slate-50/80 px-4 py-3 sm:px-5">
        <Toolbar>
          {!isCreate ? (
            <ToolbarItem location="after">
              <Button
                icon="key"
                stylingMode="outlined"
                text={t("USER_PERMISSION_TITLE", "Phân quyền")}
                disabled={!canOpenPermissions || saving}
                onClick={() => onOpenPermissions?.()}
              />
            </ToolbarItem>
          ) : null}
          <ToolbarItem location="after">
            <Button
              disabled={saving || (!isDirty && !isCreate)}
              icon="revert"
              stylingMode="outlined"
              text={t("CANCEL", "Hủy")}
              onClick={onCancel}
            />
          </ToolbarItem>
          <ToolbarItem location="after">
            <Button
              disabled={saving || !isDirty}
              icon="save"
              stylingMode="contained"
              type="default"
              text={saving ? t("SAVING", "Đang lưu...") : t("dxDataGrid-editingSaveRowChanges", "Lưu")}
              onClick={onSave}
            />
          </ToolbarItem>
        </Toolbar>
      </div>

      <div className="min-h-0 flex-1 overflow-auto px-5 py-5">
        <UserInfoForm
          value={value}
          onChange={onChange}
          onAvatarUploaded={onAvatarUploaded}
          isUpdate={!isCreate}
          disabled={saving}
          userLevelCodes={userLevelCodes}
        />
      </div>
    </div>
  )
}
