import { useCallback, useContext, useEffect, useMemo, useRef, useState } from "react"
import Button from "devextreme-react/button"
import Form, { GroupItem, Item } from "devextreme-react/form"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import ScrollView from "devextreme-react/scroll-view"
import Toolbar, { Item as ToolbarItem } from "devextreme-react/toolbar"
import notify from "devextreme/ui/notify"

import { getApiErrorMessage } from "@/api/apiTypes"
import {
  changeMyPassword,
  fetchMyAvatarImageBlob,
  updateMyProfile,
  uploadMyAvatar,
} from "@/api/profileApi"
import { isUserAvatarFtpStoredPath, resolveUserAvatarImageUrl } from "@/api/userInfoApi"
import { useMyProfileInvalidate, useMyProfileQuery } from "@/hooks/queries/adminQueries"
import { createOutlinedDateBoxEditorOptions } from "@/components/forms/devExtremeEditorOptions"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
import { normalizeDate, normalizeDateTime } from "@/lib/dateParser"
import { updateCurrentSession } from "@/lib/login"
import type { ChangeUserPasswordPayload, UserProfile, UserProfileApi } from "@/types/profile"

type PasswordFormState = ChangeUserPasswordPayload

type ProfileFieldEditorType = "dxDateBox" | "dxSelectBox" | "dxTextArea" | "dxTextBox"

type ProfileFieldConfig = {
  key: keyof UserProfile
  label: string
  editorType?: ProfileFieldEditorType
  colSpan?: number
  readOnly?: boolean
}

type ProfileFieldGroup = {
  key: string
  title: string
  items: ProfileFieldConfig[]
}

const emptyProfile: UserProfile = {
  USER_PK_ID: null,
  USER_DETAIL_ID: null,
  COMPANY_CD: "",
  USERID: "",
  USERNM: "",
  USERLV: null,
  EMPLOYEE_CD: "",
  EMPLOYEE_NM: "",
  EMPLOYEE_NM_ENG: "",
  DEPARTMENT_ID: null,
  DEPARTMENT_CD: "",
  POSITION_ID: null,
  POSITION_CD: "",
  BRANCH_ID: null,
  BRANCH_CD: "",
  EMAIL: "",
  MOBILE_NO: "",
  TEL_NO: "",
  ADDRESS: "",
  BIRTHDAY: null,
  GENDER: "",
  AVATAR_URL: "",
  SIGN_IMAGE_URL: "",
  NOTE: "",
  IS_ACTIVE: true,
  ISDEL: false,
  UPDATE_BY: "",
  CREATE_BY: "",
  CREATED_AT: null,
  UPDATED_AT: null,
}

const emptyPasswordForm: PasswordFormState = {
  CURRENT_PASSWORD: "",
  NEW_PASSWORD: "",
  CONFIRM_PASSWORD: "",
}

function normalizeText(value: unknown): string {
  if (value === null || value === undefined) {
    return ""
  }

  return String(value)
}

function normalizeNullableText(value: string): string | null {
  const nextValue = value.trim()
  return nextValue.length > 0 ? nextValue : null
}

function normalizeNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") {
    return null
  }

  const parsedValue = Number(value)
  return Number.isFinite(parsedValue) ? parsedValue : null
}

function normalizeFlag(value: unknown, defaultValue: boolean): boolean {
  if (value === null || value === undefined || value === "") {
    return defaultValue
  }

  const nextValue = String(value).trim().toLowerCase()
  return nextValue === "1" || nextValue === "true" || nextValue === "y"
}

function normalizeProfile(data?: Partial<UserProfileApi>): UserProfile {
  return {
    ...emptyProfile,
    USER_PK_ID: normalizeNumber(data?.USER_PK_ID),
    USER_DETAIL_ID: normalizeNumber(data?.USER_DETAIL_ID),
    COMPANY_CD: normalizeText(data?.COMPANY_CD),
    USERID: normalizeText(data?.USERID),
    USERNM: normalizeText(data?.USERNM),
    USERLV: normalizeNumber(data?.USERLV),
    EMPLOYEE_CD: normalizeText(data?.EMPLOYEE_CD),
    EMPLOYEE_NM: normalizeText(data?.EMPLOYEE_NM),
    EMPLOYEE_NM_ENG: normalizeText(data?.EMPLOYEE_NM_ENG),
    DEPARTMENT_ID: normalizeNumber(data?.DEPARTMENT_ID),
    DEPARTMENT_CD: normalizeText(data?.DEPARTMENT_CD),
    POSITION_ID: normalizeNumber(data?.POSITION_ID),
    POSITION_CD: normalizeText(data?.POSITION_CD),
    BRANCH_ID: normalizeNumber(data?.BRANCH_ID),
    BRANCH_CD: normalizeText(data?.BRANCH_CD),
    EMAIL: normalizeText(data?.EMAIL),
    MOBILE_NO: normalizeText(data?.MOBILE_NO),
    TEL_NO: normalizeText(data?.TEL_NO),
    ADDRESS: normalizeText(data?.ADDRESS),
    BIRTHDAY: normalizeDate(data?.BIRTHDAY),
    GENDER: normalizeText(data?.GENDER),
    AVATAR_URL: normalizeText(data?.AVATAR_URL),
    SIGN_IMAGE_URL: normalizeText(data?.SIGN_IMAGE_URL),
    NOTE: normalizeText(data?.NOTE),
    IS_ACTIVE: normalizeFlag(data?.IS_ACTIVE, true),
    ISDEL: normalizeFlag(data?.ISDEL, false),
    UPDATE_BY: normalizeText(data?.UPDATE_BY),
    CREATE_BY: normalizeText(data?.CREATE_BY),
    CREATED_AT: normalizeDateTime(data?.CREATED_AT),
    UPDATED_AT: normalizeDateTime(data?.UPDATED_AT),
  }
}

function mapProfileToApiPayload(profile: UserProfile): Partial<UserProfileApi> {
  return {
    USERNM: normalizeNullableText(profile.USERNM),
    EMPLOYEE_NM: normalizeNullableText(profile.EMPLOYEE_NM),
    EMAIL: normalizeNullableText(profile.EMAIL),
    MOBILE_NO: normalizeNullableText(profile.MOBILE_NO),
    TEL_NO: normalizeNullableText(profile.TEL_NO),
    ADDRESS: normalizeNullableText(profile.ADDRESS),
    BIRTHDAY: profile.BIRTHDAY,
    GENDER: normalizeNullableText(profile.GENDER),
    AVATAR_URL: normalizeNullableText(profile.AVATAR_URL),
  }
}

function buildInitials(fullName: string, userId: string): string {
  const source = fullName.trim() || userId.trim()
  if (!source) {
    return "U"
  }

  const tokens = source.split(/\s+/).filter(Boolean)
  if (tokens.length === 1) {
    return tokens[0].slice(0, 2).toUpperCase()
  }

  return `${tokens[0][0] ?? ""}${tokens[tokens.length - 1][0] ?? ""}`.toUpperCase()
}

function useMyAvatarSrc(storedPath: string, localPreviewUrl: string): string {
  const [remoteSrc, setRemoteSrc] = useState("")

  useEffect(() => {
    let cancelled = false
    let objectUrl = ""
    const normalized = storedPath.trim()

    if (!normalized || localPreviewUrl) {
      setRemoteSrc("")
      return () => {
        cancelled = true
      }
    }

    if (!isUserAvatarFtpStoredPath(normalized)) {
      setRemoteSrc(resolveUserAvatarImageUrl(normalized))
      return () => {
        cancelled = true
      }
    }

    setRemoteSrc("")
    void fetchMyAvatarImageBlob()
      .then((blob) => {
        objectUrl = URL.createObjectURL(blob)
        if (!cancelled) {
          setRemoteSrc(objectUrl)
        } else {
          URL.revokeObjectURL(objectUrl)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setRemoteSrc("")
        }
      })

    return () => {
      cancelled = true
      if (objectUrl) {
        URL.revokeObjectURL(objectUrl)
      }
    }
  }, [localPreviewUrl, storedPath])

  return localPreviewUrl || remoteSrc
}

export default function ProfilePage() {
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordPopupVisible, setPasswordPopupVisible] = useState(false)
  const [avatarUploading, setAvatarUploading] = useState(false)
  const [localAvatarPreview, setLocalAvatarPreview] = useState("")
  const avatarInputRef = useRef<HTMLInputElement | null>(null)
  const [formData, setFormData] = useState<UserProfile>(emptyProfile)
  const [initialData, setInitialData] = useState<UserProfile>(emptyProfile)
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm)
  const {
    data: profileData,
    isLoading,
    isFetching,
    isError,
    error: loadError,
    refetch: refetchProfile,
  } = useMyProfileQuery()
  const invalidateProfile = useMyProfileInvalidate()
  const loading = isLoading || isFetching

  const { translate } = useContext(LanguageContext) as {
    translate: (key: string, fallback?: string) => string
  }

  const t = useCallback(
    (key: string, fallback: string) => (translate ? translate(key, fallback) : fallback),
    [translate],
  )

  const editableSnapshot = useMemo(() => JSON.stringify(mapProfileToApiPayload(formData)), [formData])
  const initialSnapshot = useMemo(() => JSON.stringify(mapProfileToApiPayload(initialData)), [initialData])
  const isDirty = editableSnapshot !== initialSnapshot
  const displayName = useMemo(
    () => formData.USERNM.trim() || formData.EMPLOYEE_NM.trim() || formData.USERID.trim() || t("USER", "User"),
    [formData.EMPLOYEE_NM, formData.USERID, formData.USERNM, t],
  )
  const secondaryName = useMemo(() => {
    const employeeName = formData.EMPLOYEE_NM.trim()
    const userName = formData.USERNM.trim()
    return employeeName && employeeName !== userName ? employeeName : ""
  }, [formData.EMPLOYEE_NM, formData.USERNM])
  const initials = useMemo(() => buildInitials(displayName, formData.USERID), [displayName, formData.USERID])
  const avatarSrc = useMyAvatarSrc(formData.AVATAR_URL, localAvatarPreview)

  const genderOptions = useMemo(
    () => [
      { value: "M", label: t("MALE", "Nam") },
      { value: "F", label: t("FEMALE", "Nữ") },
      { value: "O", label: t("OTHER", "Khác") },
    ],
    [t],
  )

  const profileGroups = useMemo<ProfileFieldGroup[]>(
    () => [
      {
        key: "identity",
        title: t("PROFILE_SECTION_IDENTITY", "Hồ sơ"),
        items: [
          { key: "USERID", label: t("USERID", "Tên đăng nhập"), readOnly: true },
          { key: "USERNM", label: t("USERNM", "Tên người dùng") },
          { key: "EMPLOYEE_NM", label: t("EMPLOYEE_NM", "Tên nhân viên"), colSpan: 2 },
        ],
      },
      {
        key: "contact",
        title: t("COMPANY_INFO_CONTACT", "Liên hệ"),
        items: [
          { key: "EMAIL", label: t("EMAIL", "Email") },
          { key: "MOBILE_NO", label: t("MOBILE_NO", "Số di động") },
          { key: "TEL_NO", label: t("TEL_NO", "Điện thoại") },
          { key: "ADDRESS", label: t("ADDRESS", "Địa chỉ"), editorType: "dxTextArea", colSpan: 2 },
        ],
      },
      {
        key: "personal",
        title: t("PERSONAL_INFO", "Thông tin cá nhân"),
        items: [
          { key: "BIRTHDAY", label: t("BIRTHDAY", "Ngày sinh"), editorType: "dxDateBox" },
          { key: "GENDER", label: t("GENDER", "Giới tính"), editorType: "dxSelectBox" },
        ],
      },
    ],
    [t],
  )

  const loadData = useCallback(async () => {
    await refetchProfile()
  }, [refetchProfile])

  useEffect(() => {
    if (!profileData) {
      return
    }

    const normalizedProfile = normalizeProfile(profileData)
    setFormData(normalizedProfile)
    setInitialData(normalizedProfile)
  }, [profileData])

  useEffect(() => {
    if (isError && loadError) {
      notify(getApiErrorMessage(loadError, t("LOAD_FAILED", "Không tải được hồ sơ")), "error", 4000)
    }
  }, [isError, loadError, t])

  useEffect(() => {
    return () => {
      if (localAvatarPreview) {
        URL.revokeObjectURL(localAvatarPreview)
      }
    }
  }, [localAvatarPreview])

  const editorOptionsByField = useCallback(
    (field: ProfileFieldConfig): Record<string, unknown> => {
      if (field.key === "GENDER") {
        return {
          stylingMode: "outlined",
          dataSource: genderOptions,
          displayExpr: "label",
          valueExpr: "value",
          showClearButton: true,
          placeholder: t("SELECT_GENDER", "Chọn giới tính"),
        }
      }

      if (field.editorType === "dxDateBox") {
        return createOutlinedDateBoxEditorOptions({
          displayFormat: "yyyy-MM-dd",
          dateSerializationFormat: "yyyy-MM-dd",
          showClearButton: true,
          max: new Date(),
        })
      }

      if (field.editorType === "dxTextArea") {
        return {
          stylingMode: "outlined",
          autoResizeEnabled: true,
          minHeight: 80,
        }
      }

      const defaultOptions: Record<string, unknown> = {
        stylingMode: "outlined",
        readOnly: field.readOnly ?? false,
      }

      if (field.key === "EMAIL") {
        defaultOptions.mode = "email"
      }

      if (field.key === "MOBILE_NO" || field.key === "TEL_NO") {
        defaultOptions.mode = "tel"
      }

      return defaultOptions
    },
    [genderOptions, t],
  )

  const handleFieldDataChanged = useCallback((event: { dataField?: string; value?: unknown }) => {
    const field = event.dataField as keyof UserProfile | undefined
    if (!field) {
      return
    }

    setFormData((current) => {
      if (field === "BIRTHDAY") {
        return { ...current, BIRTHDAY: normalizeDate(event.value) }
      }

      return {
        ...current,
        [field]: normalizeText(event.value),
      }
    })
  }, [])

  const validateProfile = useCallback(() => {
    if (!formData.USERNM.trim()) {
      notify(`${t("USERNM", "Tên người dùng")} ${t("REQUIRED", "bắt buộc")}`, "warning", 3000)
      return false
    }

    if (formData.EMAIL.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.EMAIL.trim())) {
      notify(t("INVALID_EMAIL", "Email không hợp lệ"), "warning", 3000)
      return false
    }

    return true
  }, [formData.EMAIL, formData.USERNM, t])

  const handleCancel = useCallback(() => {
    setFormData(initialData)
    setLocalAvatarPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return ""
    })
  }, [initialData])

  const handleSave = useCallback(async () => {
    if (!validateProfile()) {
      return
    }

    setSaving(true)

    try {
      const response = await updateMyProfile(mapProfileToApiPayload(formData))
      const normalizedProfile = normalizeProfile(response.data)

      setFormData(normalizedProfile)
      setInitialData(normalizedProfile)
      updateCurrentSession({ username: normalizedProfile.USERNM })
      await invalidateProfile()

      notify(response.message || t("MSG_EDIT_SUCCESS", "Cập nhật thành công"), "success", 3000)
    } catch (error) {
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Cập nhật thất bại")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }, [formData, invalidateProfile, t, validateProfile])

  const handleAvatarSelected = useCallback(
    async (fileList: FileList | null) => {
      const file = fileList?.[0]
      if (!file) {
        return
      }

      if (!file.type.startsWith("image/")) {
        notify(t("AVATAR_IMAGE_TYPE_INVALID", "Chỉ chọn file ảnh (png, jpg, ...)"), "warning", 3000)
        return
      }

      if (file.size > 2 * 1024 * 1024) {
        notify(t("AVATAR_IMAGE_TOO_LARGE", "Ảnh vượt quá 2MB"), "warning", 3000)
        return
      }

      const localUrl = URL.createObjectURL(file)
      setLocalAvatarPreview((current) => {
        if (current) {
          URL.revokeObjectURL(current)
        }
        return localUrl
      })
      setAvatarUploading(true)

      try {
        const result = await uploadMyAvatar(file)
        const normalized = normalizeProfile(result.data)
        setFormData((current) => ({ ...current, AVATAR_URL: normalized.AVATAR_URL }))
        setInitialData((current) => ({ ...current, AVATAR_URL: normalized.AVATAR_URL }))
        await invalidateProfile()
        notify(t("AVATAR_IMAGE_UPLOAD_SUCCESS", "Đã cập nhật ảnh đại diện"), "success", 2500)
      } catch (error) {
        setLocalAvatarPreview((current) => {
          if (current) {
            URL.revokeObjectURL(current)
          }
          return ""
        })
        notify(
          getApiErrorMessage(error, t("AVATAR_IMAGE_UPLOAD_FAILED", "Tải ảnh thất bại")),
          "error",
          3500,
        )
      } finally {
        setAvatarUploading(false)
        if (avatarInputRef.current) {
          avatarInputRef.current.value = ""
        }
      }
    },
    [invalidateProfile, t],
  )

  const handleClearAvatar = useCallback(() => {
    setLocalAvatarPreview((current) => {
      if (current) {
        URL.revokeObjectURL(current)
      }
      return ""
    })
    if (!formData.AVATAR_URL.trim()) {
      return
    }
    setFormData((current) => ({ ...current, AVATAR_URL: "" }))
  }, [formData.AVATAR_URL])

  const handlePasswordFieldChange = useCallback((event: { dataField?: string; value?: unknown }) => {
    const field = event.dataField as keyof PasswordFormState | undefined
    if (!field) {
      return
    }

    setPasswordForm((current) => ({
      ...current,
      [field]: normalizeText(event.value),
    }))
  }, [])

  const handlePasswordPopupClose = useCallback(() => {
    if (passwordSaving) {
      return
    }

    setPasswordPopupVisible(false)
    setPasswordForm(emptyPasswordForm)
  }, [passwordSaving])

  const validatePasswordForm = useCallback(() => {
    if (!passwordForm.CURRENT_PASSWORD.trim()) {
      notify(t("CURRENT_PASSWORD_REQUIRED", "Cần nhập mật khẩu hiện tại"), "warning", 3000)
      return false
    }

    if (!passwordForm.NEW_PASSWORD.trim()) {
      notify(t("NEW_PASSWORD_REQUIRED", "Cần nhập mật khẩu mới"), "warning", 3000)
      return false
    }

    if (passwordForm.NEW_PASSWORD.trim().length < 6) {
      notify(t("PASSWORD_MIN_LENGTH", "Mật khẩu mới phải có ít nhất 6 ký tự"), "warning", 3000)
      return false
    }

    if (passwordForm.NEW_PASSWORD !== passwordForm.CONFIRM_PASSWORD) {
      notify(t("PASSWORD_NOT_MATCH", "Xác nhận mật khẩu không khớp"), "warning", 3000)
      return false
    }

    return true
  }, [passwordForm, t])

  const handleChangePassword = useCallback(async () => {
    if (!validatePasswordForm()) {
      return
    }

    setPasswordSaving(true)

    try {
      const response = await changeMyPassword(passwordForm)
      notify(response.message || t("PASSWORD_CHANGED", "Đổi mật khẩu thành công"), "success", 3000)
      setPasswordPopupVisible(false)
      setPasswordForm(emptyPasswordForm)
    } catch (error) {
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Đổi mật khẩu thất bại")), "error", 4000)
    } finally {
      setPasswordSaving(false)
    }
  }, [passwordForm, t, validatePasswordForm])

  const busy = loading || saving || passwordSaving || avatarUploading

  return (
    <DxPage>
      <div className="flex h-full min-h-0 flex-col gap-3">
        <section className="flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex shrink-0 flex-col gap-3 border-b border-slate-200 px-4 py-3 sm:flex-row sm:items-start sm:justify-between sm:px-5">
            <div className="flex min-w-0 flex-1 items-center gap-4">
              <button
                type="button"
                disabled={busy}
                onClick={() => avatarInputRef.current?.click()}
                className="relative flex h-16 w-16 flex-shrink-0 items-center justify-center overflow-hidden rounded-full bg-slate-800 text-lg font-semibold text-white transition hover:ring-2 hover:ring-slate-300 disabled:opacity-70"
                title={t("CHANGE_IMAGE", "Đổi ảnh")}
              >
                {avatarSrc ? (
                  <img src={avatarSrc} alt="" className="h-full w-full object-cover" />
                ) : (
                  initials
                )}
              </button>
              <div className="min-w-0">
                <div className="text-xs font-medium uppercase tracking-wide text-slate-500">
                  {t("PROFILE", "Hồ sơ cá nhân")}
                </div>
                <h1 className="mt-0.5 truncate text-xl font-semibold text-slate-900">{displayName}</h1>
                <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-500">
                  <span className="truncate">{formData.USERID || "-"}</span>
                  {secondaryName ? <span className="truncate">· {secondaryName}</span> : null}
                  <span
                    className={`rounded px-2 py-0.5 text-[11px] font-medium ${
                      formData.IS_ACTIVE
                        ? "bg-emerald-50 text-emerald-700"
                        : "bg-rose-50 text-rose-700"
                    }`}
                  >
                    {formData.IS_ACTIVE ? t("ACTIVE", "Đang hoạt động") : t("INACTIVE", "Ngưng")}
                  </span>
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                    disabled={busy}
                    onClick={() => avatarInputRef.current?.click()}
                  >
                    {avatarSrc ? t("CHANGE_IMAGE", "Đổi ảnh") : t("CHOOSE_IMAGE", "Chọn ảnh")}
                  </button>
                  {avatarSrc || formData.AVATAR_URL.trim() ? (
                    <button
                      type="button"
                      className="rounded border border-rose-200 bg-white px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 disabled:opacity-50"
                      disabled={busy}
                      onClick={handleClearAvatar}
                    >
                      {t("CLEAR", "Xóa ảnh")}
                    </button>
                  ) : null}
                </div>
              </div>
            </div>

            <div className="shrink-0">
              <Toolbar>
                <ToolbarItem location="after">
                  <Button
                    icon="refresh"
                    stylingMode="outlined"
                    text={t("btnRefresh", "Làm mới")}
                    disabled={busy}
                    onClick={() => void loadData()}
                  />
                </ToolbarItem>
                <ToolbarItem location="after">
                  <Button
                    icon="key"
                    stylingMode="outlined"
                    text={t("CHANGE_PASSWORD", "Đổi mật khẩu")}
                    disabled={busy}
                    onClick={() => setPasswordPopupVisible(true)}
                  />
                </ToolbarItem>
                <ToolbarItem location="after">
                  <Button
                    disabled={!isDirty || busy}
                    icon="revert"
                    stylingMode="outlined"
                    text={t("CANCEL", "Hủy")}
                    onClick={handleCancel}
                  />
                </ToolbarItem>
                <ToolbarItem location="after">
                  <Button
                    disabled={!isDirty || busy}
                    icon="save"
                    stylingMode="contained"
                    text={saving ? t("SAVING", "Đang lưu...") : t("dxDataGrid-editingSaveRowChanges", "Lưu")}
                    type="default"
                    onClick={() => void handleSave()}
                  />
                </ToolbarItem>
              </Toolbar>
            </div>
          </div>

          <ScrollView className="min-h-0 flex-1" width="100%" height="100%">
            <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 [&_.dx-form-group-caption]:!mb-3 [&_.dx-form-group-caption]:!border-b [&_.dx-form-group-caption]:!border-slate-200 [&_.dx-form-group-caption]:!pb-2 [&_.dx-form-group-caption]:!text-sm [&_.dx-form-group-caption]:!font-semibold [&_.dx-form-group-caption]:!text-slate-800 [&_.dx-field-item]:!pb-3">
              <Form
                colCount={1}
                formData={formData}
                labelLocation="top"
                readOnly={busy && !passwordPopupVisible}
                onFieldDataChanged={handleFieldDataChanged}
              >
                {profileGroups.map((group) => (
                  <GroupItem key={group.key} caption={group.title} colCount={2}>
                    {group.items.map((field) => (
                      <Item
                        key={field.key}
                        dataField={field.key}
                        colSpan={field.colSpan}
                        editorType={field.editorType ?? "dxTextBox"}
                        editorOptions={editorOptionsByField(field)}
                        label={{ text: field.label }}
                      />
                    ))}
                  </GroupItem>
                ))}
              </Form>
            </div>
          </ScrollView>
        </section>

        <input
          ref={avatarInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => {
            void handleAvatarSelected(event.target.files)
          }}
        />

        <Popup
          visible={passwordPopupVisible}
          title={t("CHANGE_PASSWORD", "Đổi mật khẩu")}
          showTitle={true}
          dragEnabled={false}
          hideOnOutsideClick={!passwordSaving}
          width={480}
          height="auto"
          onHiding={handlePasswordPopupClose}
        >
          <div className="p-2">
            <Form
              colCount={1}
              formData={passwordForm}
              labelLocation="top"
              onFieldDataChanged={handlePasswordFieldChange}
            >
              <GroupItem caption={t("SECURITY", "Bảo mật")} colCount={1}>
                <Item
                  dataField="CURRENT_PASSWORD"
                  editorType="dxTextBox"
                  editorOptions={{ stylingMode: "outlined", mode: "password" }}
                  label={{ text: t("CURRENT_PASSWORD", "Mật khẩu hiện tại") }}
                />
                <Item
                  dataField="NEW_PASSWORD"
                  editorType="dxTextBox"
                  editorOptions={{ stylingMode: "outlined", mode: "password" }}
                  label={{ text: t("NEW_PASSWORD", "Mật khẩu mới") }}
                />
                <Item
                  dataField="CONFIRM_PASSWORD"
                  editorType="dxTextBox"
                  editorOptions={{ stylingMode: "outlined", mode: "password" }}
                  label={{ text: t("CONFIRM_PASSWORD", "Xác nhận mật khẩu") }}
                />
              </GroupItem>
            </Form>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                icon="close"
                stylingMode="outlined"
                text={t("CANCEL", "Hủy")}
                disabled={passwordSaving}
                onClick={handlePasswordPopupClose}
              />
              <Button
                icon="save"
                stylingMode="contained"
                text={passwordSaving ? t("SAVING", "Đang lưu...") : t("CHANGE_PASSWORD", "Đổi mật khẩu")}
                type="default"
                disabled={passwordSaving}
                onClick={() => void handleChangePassword()}
              />
            </div>
          </div>
        </Popup>

        <LoadPanel
          visible={busy}
          shading={true}
          shadingColor="rgba(15, 23, 42, 0.2)"
          showIndicator={true}
          showPane={true}
        />
      </div>
    </DxPage>
  )
}
