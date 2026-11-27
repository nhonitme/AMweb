import { useRef } from "react"
import Popup, { ToolbarItem, type PopupRef } from "devextreme-react/popup"
import { MASTER_DATA_POPUP_MAX_WIDTH, MasterDataPopupTitleView } from "@/components/datagrid/MasterDataEditPopup"
import { disableBuiltInPopupEscape, usePopupEscapeLayer } from "@/components/popup/popupEscapeStack"
import { overlayWrapperFromPopupContent } from "@/components/popup/raiseOverlayZIndex"
import { EDITOR_ACTION_ICONS } from "@/components/toolbar/editorActionDefaults"
import type { SysCode } from "@/api/sysCodeService"
import type { UserInfo } from "@/types/userInfo"
import UserInfoForm from "./UserInfoForm"

type UserCreatePopupProps = {
  value: UserInfo | null
  isDirty: boolean
  saving: boolean
  userLevelCodes: SysCode[]
  onChange: (value: UserInfo) => void
  onSave: () => void
  onCancel: () => void
  translate: (key: string, fallback: string) => string
}

export default function UserCreatePopup({
  value,
  isDirty,
  saving,
  userLevelCodes,
  onChange,
  onSave,
  onCancel,
  translate: t,
}: UserCreatePopupProps) {
  const popupRef = useRef<PopupRef>(null)
  const visible = value !== null
  usePopupEscapeLayer(visible, onCancel, () =>
    overlayWrapperFromPopupContent(popupRef.current?.instance().content()),
  )

  return (
    <Popup
      ref={popupRef}
      container="body"
      visible={visible}
      titleRender={() => <MasterDataPopupTitleView title={t("lblAddNew", "Thêm mới")} />}
      elementAttr={{ class: "absolute left-0 top-0 h-0 w-0" }}
      wrapperAttr={{ class: "master-data-edit-popup editor-mode--add" }}
      width={`min(94vw, ${MASTER_DATA_POPUP_MAX_WIDTH}px)`}
      height="auto"
      showCloseButton
      dragEnabled
      hideOnOutsideClick={false}
      onShown={({ component }) => {
        disableBuiltInPopupEscape(component)
        component.content()?.querySelector<HTMLInputElement>('input[name="USERID"]')?.focus()
      }}
      onHiding={(event) => {
        if (visible) {
          event.cancel = true
          onCancel()
        }
      }}
    >
      <ToolbarItem toolbar="bottom" location="after" widget="dxButton" options={{
        icon: EDITOR_ACTION_ICONS.close,
        text: t("CANCEL", "Hủy"),
        stylingMode: "outlined",
        disabled: saving,
        onClick: onCancel,
      }} />
      <ToolbarItem toolbar="bottom" location="after" widget="dxButton" options={{
        icon: EDITOR_ACTION_ICONS.save,
        text: saving ? t("SAVING", "Đang lưu...") : t("dxDataGrid-editingSaveRowChanges", "Lưu"),
        type: "default",
        stylingMode: "contained",
        disabled: saving || !isDirty,
        onClick: onSave,
      }} />
      {value && (
        <UserInfoForm value={value} onChange={onChange} isUpdate={false} disabled={saving} userLevelCodes={userLevelCodes} />
      )}
    </Popup>
  )
}
