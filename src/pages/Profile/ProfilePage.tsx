import { useCallback, useContext, useEffect, useMemo, useState } from "react"
import Button from "devextreme-react/button"
import Form, { GroupItem, Item } from "devextreme-react/form"
import LoadPanel from "devextreme-react/load-panel"
import Popup from "devextreme-react/popup"
import ScrollView from "devextreme-react/scroll-view"
import Toolbar, { Item as ToolbarItem } from "devextreme-react/toolbar"
import notify from "devextreme/ui/notify"
import { CalendarDays, Mail, MapPin, Phone, ShieldCheck, UserCircle2 } from "lucide-react"

import { changeMyPassword, getMyProfile, updateMyProfile } from "@/api/profileApi"
import DxPage from "@/dx/DxPage"
import { LanguageContext } from "@/lib/i18nLoader"
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

function normalizeDate(value: unknown): string | null {
  if (!value) {
    return null
  }

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value.toISOString().slice(0, 10)
  }

  const nextValue = String(value).trim()
  if (!nextValue) {
    return null
  }

  if (/^\d{4}-\d{2}-\d{2}$/.test(nextValue)) {
    return nextValue
  }

  const parsedDate = new Date(nextValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return nextValue
  }

  return parsedDate.toISOString().slice(0, 10)
}

function padNumber(value: number): string {
  return String(value).padStart(2, "0")
}

function normalizeDateTime(value: unknown): string | null {
  if (!value) {
    return null
  }

  const nextValue = String(value).trim()
  if (!nextValue) {
    return null
  }

  const parsedDate = new Date(nextValue)
  if (Number.isNaN(parsedDate.getTime())) {
    return nextValue
  }

  return [
    `${parsedDate.getFullYear()}-${padNumber(parsedDate.getMonth() + 1)}-${padNumber(parsedDate.getDate())}`,
    `${padNumber(parsedDate.getHours())}:${padNumber(parsedDate.getMinutes())}:${padNumber(parsedDate.getSeconds())}`,
  ].join(" ")
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

function getApiErrorMessage(error: unknown, fallback: string): string {
  if (typeof error === "object" && error !== null) {
    const apiError = error as {
      message?: string
      response?: {
        data?: {
          Message?: string
          message?: string
        }
      }
    }

    return apiError.response?.data?.Message ?? apiError.response?.data?.message ?? apiError.message ?? fallback
  }

  return fallback
}

export default function ProfilePage() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [passwordSaving, setPasswordSaving] = useState(false)
  const [passwordPopupVisible, setPasswordPopupVisible] = useState(false)
  const [avatarLoadFailed, setAvatarLoadFailed] = useState(false)
  const [formData, setFormData] = useState<UserProfile>(emptyProfile)
  const [initialData, setInitialData] = useState<UserProfile>(emptyProfile)
  const [passwordForm, setPasswordForm] = useState<PasswordFormState>(emptyPasswordForm)

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
  const genderOptions = useMemo(
    () => [
      { value: "M", label: t("MALE", "Male") },
      { value: "F", label: t("FEMALE", "Female") },
      { value: "O", label: t("OTHER", "Other") },
    ],
    [t],
  )
  const genderLabel = useMemo(
    () => genderOptions.find((option) => option.value === formData.GENDER)?.label ?? "-",
    [formData.GENDER, genderOptions],
  )
  const phoneDisplay = useMemo(() => {
    const phones = [formData.MOBILE_NO.trim(), formData.TEL_NO.trim()].filter(Boolean)
    return phones.length > 0 ? phones.join(" / ") : "-"
  }, [formData.MOBILE_NO, formData.TEL_NO])

  const profileGroups = useMemo<ProfileFieldGroup[]>(
    () => [
      {
        key: "identity",
        title: t("PROFILE", "Profile"),
        items: [
          { key: "USERID", label: t("USERID", "User ID"), readOnly: true },
          { key: "USERNM", label: t("USERNM", "User name") },
          { key: "EMPLOYEE_NM", label: t("EMPLOYEE_NM", "Employee name") },
          { key: "AVATAR_URL", label: t("AVATAR_URL", "Avatar URL"), colSpan: 2 },
        ],
      },
      {
        key: "contact",
        title: t("COMPANY_INFO_CONTACT", "Contact"),
        items: [
          { key: "EMAIL", label: t("EMAIL", "Email") },
          { key: "MOBILE_NO", label: t("MOBILE_NO", "Mobile no") },
          { key: "TEL_NO", label: t("TEL_NO", "Telephone no") },
          { key: "ADDRESS", label: t("ADDRESS", "Address"), editorType: "dxTextArea", colSpan: 2 },
        ],
      },
      {
        key: "personal",
        title: t("PERSONAL_INFO", "Personal"),
        items: [
          { key: "BIRTHDAY", label: t("BIRTHDAY", "Birthday"), editorType: "dxDateBox" },
          { key: "GENDER", label: t("GENDER", "Gender"), editorType: "dxSelectBox" },
        ],
      },
    ],
    [t],
  )

  const loadData = useCallback(async () => {
    setLoading(true)

    try {
      const profileResponse = await getMyProfile()
      const normalizedProfile = normalizeProfile(profileResponse.data)
      setFormData(normalizedProfile)
      setInitialData(normalizedProfile)
    } catch (error) {
      notify(getApiErrorMessage(error, t("LOAD_FAILED", "Failed to load profile")), "error", 4000)
    } finally {
      setLoading(false)
    }
  }, [t])

  useEffect(() => {
    void loadData()
  }, [loadData])

  useEffect(() => {
    setAvatarLoadFailed(false)
  }, [formData.AVATAR_URL])

  const editorOptionsByField = useCallback(
    (field: ProfileFieldConfig): Record<string, unknown> => {
      if (field.key === "GENDER") {
        return {
          stylingMode: "outlined",
          dataSource: genderOptions,
          displayExpr: "label",
          valueExpr: "value",
          showClearButton: true,
          placeholder: t("SELECT_GENDER", "Select gender"),
        }
      }

      if (field.editorType === "dxDateBox") {
        return {
          stylingMode: "outlined",
          type: "date",
          displayFormat: "yyyy-MM-dd",
          dateSerializationFormat: "yyyy-MM-dd",
          showClearButton: true,
          max: new Date(),
        }
      }

      if (field.editorType === "dxTextArea") {
        return {
          stylingMode: "outlined",
          autoResizeEnabled: true,
          minHeight: 96,
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

      if (field.key === "AVATAR_URL") {
        defaultOptions.mode = "url"
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
      notify(`${t("USERNM", "Full name")} ${t("REQUIRED", "is required")}`, "warning", 3000)
      return false
    }

    if (formData.EMAIL.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.EMAIL.trim())) {
      notify(t("INVALID_EMAIL", "Email is invalid"), "warning", 3000)
      return false
    }

    return true
  }, [formData.EMAIL, formData.USERNM, t])

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

      notify(response.message || t("MSG_EDIT_SUCCESS", "Updated successfully"), "success", 3000)
    } catch (error) {
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Failed to update profile")), "error", 4000)
    } finally {
      setSaving(false)
    }
  }, [formData, t, validateProfile])

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
      notify(t("CURRENT_PASSWORD_REQUIRED", "Current password is required"), "warning", 3000)
      return false
    }

    if (!passwordForm.NEW_PASSWORD.trim()) {
      notify(t("NEW_PASSWORD_REQUIRED", "New password is required"), "warning", 3000)
      return false
    }

    if (passwordForm.NEW_PASSWORD.trim().length < 6) {
      notify(t("PASSWORD_MIN_LENGTH", "New password must be at least 6 characters"), "warning", 3000)
      return false
    }

    if (passwordForm.NEW_PASSWORD !== passwordForm.CONFIRM_PASSWORD) {
      notify(t("PASSWORD_NOT_MATCH", "Confirm password does not match"), "warning", 3000)
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
      notify(response.message || t("PASSWORD_CHANGED", "Password updated successfully"), "success", 3000)
      setPasswordPopupVisible(false)
      setPasswordForm(emptyPasswordForm)
    } catch (error) {
      notify(getApiErrorMessage(error, t("UPDATE_FAILED", "Failed to update password")), "error", 4000)
    } finally {
      setPasswordSaving(false)
    }
  }, [passwordForm, t, validatePasswordForm])

  return (
    <DxPage>
      <div className="flex h-full flex-col gap-4">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <Toolbar>
            <ToolbarItem
              location="before"
              render={() => (
                <div className="px-5 py-4">
                  <div className="text-sm font-medium text-slate-600">{t("PROFILE", "Profile")}</div>
                  <div className="mt-1 text-2xl font-semibold text-slate-900">{displayName}</div>
                  <div className="mt-1 text-sm text-slate-500">{formData.USERID || "-"}</div>
                </div>
              )}
            />
            <ToolbarItem location="after">
              <Button
                icon="refresh"
                stylingMode="outlined"
                text={t("btnRefresh", "Refresh")}
                onClick={() => void loadData()}
              />
            </ToolbarItem>
            <ToolbarItem location="after">
              <Button
                icon="key"
                stylingMode="outlined"
                text={t("CHANGE_PASSWORD", "Change password")}
                onClick={() => setPasswordPopupVisible(true)}
              />
            </ToolbarItem>
            <ToolbarItem location="after">
              <Button
                disabled={!isDirty || saving}
                icon="save"
                stylingMode="contained"
                text={saving ? t("SAVING", "Saving...") : t("dxDataGrid-editingSaveRowChanges", "Save")}
                type="default"
                onClick={() => void handleSave()}
              />
            </ToolbarItem>
          </Toolbar>
        </section>

        <div className="grid min-h-0 flex-1 gap-4 xl:grid-cols-[minmax(0,2fr),360px]">
          <section className="min-h-0 overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <ScrollView width="100%" height="100%">
              <div className="p-5">
                <Form
                  colCount={1}
                  formData={formData}
                  labelLocation="top"
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

          <div className="flex min-h-0 flex-col gap-4">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-start gap-4">
                <div className="flex h-20 w-20 items-center justify-center overflow-hidden rounded-full bg-slate-900 text-2xl font-semibold text-white">
                  {formData.AVATAR_URL.trim() && !avatarLoadFailed ? (
                    <img
                      src={formData.AVATAR_URL}
                      alt={displayName}
                      className="h-full w-full object-cover"
                      onError={() => setAvatarLoadFailed(true)}
                    />
                  ) : (
                    initials
                  )}
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-xl font-semibold text-slate-900">{displayName}</div>
                  {secondaryName && (
                    <div className="mt-1 truncate text-sm text-slate-500">{secondaryName}</div>
                  )}
                  <div className="mt-1 truncate text-sm text-slate-500">{formData.USERID || "-"}</div>
                  <div className="mt-3 flex flex-wrap gap-2">
                    <span className={`rounded-full px-3 py-1 text-xs font-medium ${formData.IS_ACTIVE ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>
                      {formData.IS_ACTIVE ? t("ACTIVE", "Active") : t("INACTIVE", "Inactive")}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-5 grid grid-cols-1 gap-3">
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <Mail size={14} />
                    {t("EMAIL", "Email")}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">{formData.EMAIL || "-"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <Phone size={14} />
                    {t("PHONE", "Phone")}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">{phoneDisplay}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <CalendarDays size={14} />
                    {t("BIRTHDAY", "Birthday")}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">{formData.BIRTHDAY || "-"}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <UserCircle2 size={14} />
                    {t("GENDER", "Gender")}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">{genderLabel}</div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <ShieldCheck size={14} />
                    {t("STATUS", "Status")}
                  </div>
                  <div className="mt-1 truncate text-sm font-semibold text-slate-900">
                    {formData.IS_ACTIVE ? t("ACTIVE", "Active") : t("INACTIVE", "Inactive")}
                  </div>
                </div>
                <div className="rounded-xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.18em] text-slate-500">
                    <MapPin size={14} />
                    {t("ADDRESS", "Address")}
                  </div>
                  <div className="mt-1 line-clamp-3 text-sm font-semibold text-slate-900">{formData.ADDRESS || "-"}</div>
                </div>
              </div>
            </section>
          </div>
        </div>

        <Popup
          visible={passwordPopupVisible}
          title={t("CHANGE_PASSWORD", "Change password")}
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
              <GroupItem caption={t("SECURITY", "Security")} colCount={1}>
                <Item
                  dataField="CURRENT_PASSWORD"
                  editorType="dxTextBox"
                  editorOptions={{ stylingMode: "outlined", mode: "password" }}
                  label={{ text: t("CURRENT_PASSWORD", "Current password") }}
                />
                <Item
                  dataField="NEW_PASSWORD"
                  editorType="dxTextBox"
                  editorOptions={{ stylingMode: "outlined", mode: "password" }}
                  label={{ text: t("NEW_PASSWORD", "New password") }}
                />
                <Item
                  dataField="CONFIRM_PASSWORD"
                  editorType="dxTextBox"
                  editorOptions={{ stylingMode: "outlined", mode: "password" }}
                  label={{ text: t("CONFIRM_PASSWORD", "Confirm password") }}
                />
              </GroupItem>
            </Form>

            <div className="mt-4 flex justify-end gap-2">
              <Button
                stylingMode="outlined"
                text={t("CANCEL", "Cancel")}
                disabled={passwordSaving}
                onClick={handlePasswordPopupClose}
              />
              <Button
                icon="save"
                stylingMode="contained"
                text={passwordSaving ? t("SAVING", "Saving...") : t("CHANGE_PASSWORD", "Change password")}
                type="default"
                disabled={passwordSaving}
                onClick={() => void handleChangePassword()}
              />
            </div>
          </div>
        </Popup>

        <LoadPanel
          visible={loading || saving || passwordSaving}
          shading={true}
          showIndicator={true}
          showPane={true}
        />
      </div>
    </DxPage>
  )
}
